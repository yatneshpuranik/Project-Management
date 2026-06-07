import mongoose from 'mongoose';
import Task from '../model/task.js';
import Board from '../model/board.js';
import Notification from '../model/notification.js';
import TaskChatMessage from '../model/taskChatMessage.js';
import User from '../model/userModel.js';
import { createActivity } from './activityController.js';
import { getIo, emitToUser } from '../socket/socket.js';
import { encryptUserIds, encryptId } from '../utils/idCrypt.js';

const isBoardMember = (board, userId) =>
  board && (board.createdBy.toString() === userId || board.members.some((member) => member.toString() === userId));

const ensureTaskBoardMembership = async (task, userId) => {
  if (!task) return false;
  const board = await Board.findById(task.boardId);
  return board && isBoardMember(board, userId);
};

// Create Task
export const createTask = async (req, res) => {
  try {
    const { title, description, priority, dueDate, deadline, openContribution, status, assignedTo, boardId } = req.body;
    const userId = req.userId;

    if (!title || !boardId) {
      return res.status(400).json({ message: 'Title and Board ID are required' });
    }

    const board = await Board.findById(boardId);
    if (!board) {
      return res.status(404).json({ message: 'Board not found' });
    }

    const isOwner = board.createdBy.toString() === userId;
    const isMember = isOwner || board.members.some((member) => member.toString() === userId);
    if (!isMember) {
      return res.status(403).json({ message: 'Only board members can create tasks' });
    }

    if (assignedTo) {
      const assigneeId = assignedTo.toString();
      const isValidAssignee =
        board.createdBy.toString() === assigneeId ||
        board.members.some((member) => member.toString() === assigneeId);
      if (!isValidAssignee) {
        return res.status(400).json({ message: 'Assigned user must be a board member' });
      }
      if (!isOwner && assigneeId !== userId) {
        return res.status(403).json({ message: 'Only the board owner can assign tasks to other members' });
      }
    }

    const position = await Task.countDocuments({ boardId, status: status || 'Todo' });

    // Sync dueDate and deadline
    const finalDeadline = deadline || dueDate || undefined;

    const task = new Task({
      title,
      description,
      priority: priority || 'Low',
      dueDate: finalDeadline,
      deadline: finalDeadline,
      assignedTo: assignedTo || undefined,
      assignedBy: assignedTo ? userId : undefined,
      createdBy: userId,
      openContribution: openContribution || false,
      boardId,
      position,
    });

    await task.save();
    await task.populate(['assignedTo', 'createdBy']);

    // Create Activity
    await createActivity({
      boardId,
      taskId: task._id,
      userId,
      userName: req.userName || 'Owner',
      type: 'Task Created',
      message: `${req.userName || 'Owner'} created task: "${title}"`,
    });

    // Realtime notification if assignedTo is provided
    if (assignedTo && assignedTo.toString() !== userId) {
      const notification = new Notification({
        recipient: assignedTo,
        sender: userId,
        senderName: req.userName || 'Owner',
        type: 'task_assign',
        status: 'unread',
        boardId,
        boardTitle: board.title,
        taskId: task._id,
        taskTitle: task.title,
        message: `${req.userName || 'Owner'} assigned you to task: "${title}"`,
      });
      await notification.save();

      try {
        const io = getIo();
        if (io) {
          io.emit('taskAssigned', {
            recipientId: encryptId(assignedTo),
            notification: encryptUserIds(notification),
          });
        }
        emitToUser(assignedTo, 'taskAssigned', {
          taskId: encryptId(task._id),
          taskTitle: task.title,
          assignedBy: req.userName || 'Owner',
          deadline: finalDeadline,
          notification: encryptUserIds(notification),
        });
      } catch (err) {
        console.error('Socket assignment emit error:', err);
      }
    }

    res.status(201).json({
      message: 'Task created successfully',
      task: encryptUserIds(task),
    });
  } catch (error) {
    res.status(500).json({ message: 'Error creating task', error: error.message });
  }
};

// Get Tasks by Board
export const getTasksByBoard = async (req, res) => {
  try {
    const { boardId } = req.params;
    const userId = req.userId;

    const board = await Board.findById(boardId);
    if (!board) {
      return res.status(404).json({ message: 'Board not found' });
    }

    const isMember =
      board.createdBy.toString() === userId ||
      board.members.some((member) => member.toString() === userId);

    if (!isMember) {
      return res.status(403).json({ message: 'Unauthorized access' });
    }

    const tasks = await Task.find({ boardId })
      .populate('assignedTo', 'name email avatar')
      .populate('createdBy', 'name email avatar')
      .populate('collaborators', 'name email avatar')
      .sort({ position: 1 });

    res.status(200).json({
      message: 'Tasks fetched successfully',
      tasks: tasks.map((t) => encryptUserIds(t)),
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching tasks', error: error.message });
  }
};

// Get Task by ID
export const getTaskById = async (req, res) => {
  try {
    const { taskId } = req.params;
    const userId = req.userId;

    const task = await Task.findById(taskId)
      .populate('assignedTo', 'name email avatar')
      .populate('createdBy', 'name email avatar')
      .populate('collaborators', 'name email avatar');

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const board = await Board.findById(task.boardId);
    const isMember =
      board.createdBy.toString() === userId ||
      board.members.some((member) => member.toString() === userId);

    if (!isMember) {
      return res.status(403).json({ message: 'Unauthorized access' });
    }

    res.status(200).json({
      message: 'Task fetched successfully',
      task: encryptUserIds(task),
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching task', error: error.message });
  }
};

// Update Task
export const updateTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    const userId = req.userId;
    const updates = req.body;

    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const board = await Board.findById(task.boardId);
    const isOwner = board.createdBy.toString() === userId;
    const isMember = isOwner || board.members.some((member) => member.toString() === userId);

    if (!isMember) {
      return res.status(403).json({ message: 'Unauthorized access' });
    }

    const originalAssignee = task.assignedTo ? task.assignedTo.toString() : '';
    let newAssignee = updates.assignedTo !== undefined ? updates.assignedTo : originalAssignee;
    if (newAssignee === null || newAssignee === undefined) {
      newAssignee = '';
    } else {
      newAssignee = newAssignee.toString();
    }

    // Check if assignedTo is being changed
    const isAssigneeChanged = newAssignee !== originalAssignee;

    // Check if deadline/dueDate is being changed
    const originalDueDate = task.dueDate ? new Date(task.dueDate).getTime() : 0;
    const originalDeadline = task.deadline ? new Date(task.deadline).getTime() : 0;

    let isDeadlineChanged = false;
    if (updates.deadline !== undefined) {
      const newDeadline = updates.deadline ? new Date(updates.deadline).getTime() : 0;
      isDeadlineChanged = newDeadline !== originalDeadline;
    } else if (updates.dueDate !== undefined) {
      const newDueDate = updates.dueDate ? new Date(updates.dueDate).getTime() : 0;
      isDeadlineChanged = newDueDate !== originalDueDate;
    }

    // Check if openContribution is being changed
    const isContributionChanged = updates.openContribution !== undefined && updates.openContribution !== task.openContribution;

    // Enforce owner role check
    if ((isAssigneeChanged || isDeadlineChanged || isContributionChanged) && !isOwner) {
      return res.status(403).json({ message: 'Only the workspace owner can assign tasks, edit deadlines, or modify contributor mode' });
    }

    // Handle assignment/unassignment events
    if (isAssigneeChanged) {
      if (newAssignee === '') {
        task.assignedTo = undefined;
        task.assignedBy = undefined;

        if (originalAssignee) {
          try {
            emitToUser(originalAssignee, 'taskUnassigned', {
              taskId: encryptId(task._id),
              taskTitle: task.title,
              message: 'Task assignment removed',
            });
          } catch (err) {
            console.error('Socket taskUnassigned emit error:', err);
          }
        }
      } else {
        task.assignedTo = newAssignee;
        task.assignedBy = userId;

        // If reassigned from another member, notify previous member they are unassigned
        if (originalAssignee) {
          try {
            emitToUser(originalAssignee, 'taskUnassigned', {
              taskId: encryptId(task._id),
              taskTitle: task.title,
              message: 'Task assignment removed',
            });
          } catch (err) {
            console.error('Socket taskUnassigned emit error:', err);
          }
        }

        // Notify new assignee
        if (newAssignee !== userId) {
          const notification = new Notification({
            recipient: newAssignee,
            sender: userId,
            senderName: req.userName || 'Owner',
            type: 'task_assign',
            status: 'unread',
            boardId: task.boardId,
            boardTitle: board.title,
            taskId: task._id,
            taskTitle: task.title,
            message: `${req.userName || 'Owner'} assigned you to task: "${task.title}"`,
          });
          await notification.save();

          try {
            const io = getIo();
            if (io) {
              io.emit('taskAssigned', {
                recipientId: encryptId(newAssignee),
                notification: encryptUserIds(notification),
              });
            }
            emitToUser(newAssignee, 'taskAssigned', {
              taskId: encryptId(task._id),
              taskTitle: task.title,
              assignedBy: req.userName || 'Owner',
              deadline: updates.deadline || updates.dueDate || task.deadline || task.dueDate,
              notification: encryptUserIds(notification),
            });
          } catch (err) {
            console.error('Socket assignment updated emit error:', err);
          }
        }
      }
    }

    // Sync deadline and dueDate
    if (updates.deadline !== undefined) {
      task.deadline = updates.deadline || undefined;
      task.dueDate = updates.deadline || undefined;
    } else if (updates.dueDate !== undefined) {
      task.dueDate = updates.dueDate || undefined;
      task.deadline = updates.dueDate || undefined;
    }

    // Update remaining allowed fields
    const allowedFields = ['title', 'description', 'priority', 'status', 'progress', 'openContribution'];
    allowedFields.forEach((field) => {
      if (updates[field] !== undefined) {
        task[field] = updates[field];
      }
    });

    await task.save();
    await task.populate(['assignedTo', 'createdBy', 'collaborators']);

    // Create Activity
    await createActivity({
      boardId: task.boardId,
      taskId: task._id,
      userId,
      userName: req.userName || 'Owner',
      type: 'Task Updated',
      message: `${req.userName || 'Owner'} updated task: "${task.title}"`,
    });

    res.status(200).json({
      message: 'Task updated successfully',
      task: encryptUserIds(task),
    });
  } catch (error) {
    res.status(500).json({ message: 'Error updating task', error: error.message });
  }
};

// Move Task (change status & position)
export const moveTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { status, position } = req.body;
    const userId = req.userId;

    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const board = await Board.findById(task.boardId);
    const isMember =
      board.createdBy.toString() === userId ||
      board.members.some((member) => member.toString() === userId);

    if (!isMember) {
      return res.status(403).json({ message: 'Unauthorized access' });
    }

    const oldStatus = task.status;
    task.status = status;
    if (position !== undefined) {
      task.position = position;
    }

    await task.save();
    await task.populate(['assignedTo', 'createdBy']);

    // Create Activity
    await createActivity({
      boardId: task.boardId,
      taskId: task._id,
      userId,
      userName: req.userName || 'Owner',
      type: 'Task Moved',
      message: `${req.userName || 'Owner'} moved task "${task.title}" from ${oldStatus} to ${status}`,
    });

    res.status(200).json({
      message: 'Task moved successfully',
      task: encryptUserIds(task),
    });
  } catch (error) {
    res.status(500).json({ message: 'Error moving task', error: error.message });
  }
};

// Delete Task
export const deleteTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    const userId = req.userId;

    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const board = await Board.findById(task.boardId);
    // Permission Check: Only Board Owner can delete task
    const isOwner = board.createdBy.toString() === userId;
    if (!isOwner) {
      return res.status(403).json({ message: 'Only the board owner can delete tasks' });
    }

    await Task.findByIdAndDelete(taskId);

    // Create Activity
    await createActivity({
      boardId: task.boardId,
      userId,
      userName: req.userName || 'Owner',
      type: 'Task Deleted',
      message: `${req.userName || 'Owner'} deleted task: "${task.title}"`,
    });

    const io = getIo();
    if (io) {
      io.to(`board-${task.boardId}`).emit('task-deleted', { taskId: task._id });
    }

    res.status(200).json({
      message: 'Task deleted successfully',
    });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting task', error: error.message });
  }
};

// Invite / Assign collaborator to task
export const inviteToTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { memberId } = req.body;
    const userId = req.userId;

    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const board = await Board.findById(task.boardId);
    const isOwner = board.createdBy.toString() === userId;
    if (!isOwner) {
      return res.status(403).json({ message: 'Only the board owner can invite task collaborators' });
    }

    if (task.collaborators.includes(memberId)) {
      return res.status(400).json({ message: 'User is already a task collaborator' });
    }

    const invitee = await User.findById(memberId);
    if (!invitee) {
      return res.status(404).json({ message: 'User to invite not found' });
    }

    const notification = new Notification({
      recipient: memberId,
      sender: userId,
      senderName: req.userName || 'Owner',
      type: 'task_invite',
      status: 'pending',
      boardId: board._id,
      boardTitle: board.title,
      taskId: task._id,
      taskTitle: task.title,
      message: `${req.userName || 'Owner'} invited you to collaborate on task: "${task.title}"`,
    });

    await notification.save();

    await createActivity({
      boardId: board._id,
      taskId: task._id,
      userId,
      userName: req.userName || 'Owner',
      type: 'Task Invitation Sent',
      message: `${req.userName || 'Owner'} invited ${invitee.name || 'a teammate'} to collaborate on task "${task.title}"`,
    });

    try {
      const io = getIo();
      if (io) {
        io.emit('invitationSent', {
          recipientId: encryptId(memberId),
          notification: encryptUserIds(notification),
        });
      }
    } catch (err) {
      console.error('Socket task invite emit error:', err);
    }

    res.status(200).json({
      message: 'Invitation to collaborate sent successfully',
      notification: encryptUserIds(notification),
    });
  } catch (error) {
    res.status(500).json({ message: 'Error sending task invitation', error: error.message });
  }
};

// COMMENTS MANAGEMENT

// Get comments for task
export const getComments = async (req, res) => {
  try {
    const { taskId } = req.params;
    const task = await Task.findById(taskId).populate('comments.userId', 'name email avatar');
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }
    const board = await Board.findById(task.boardId);
    if (!isBoardMember(board, req.userId)) {
      return res.status(403).json({ message: 'Unauthorized access' });
    }
    res.status(200).json({
      message: 'Comments fetched successfully',
      comments: encryptUserIds(task.comments),
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching comments', error: error.message });
  }
};

// Add comment
export const addComment = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { text } = req.body;
    const userId = req.userId;

    if (!text || !text.trim()) {
      return res.status(400).json({ message: 'Comment text is required' });
    }

    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }
    const board = await Board.findById(task.boardId);
    if (!isBoardMember(board, userId)) {
      return res.status(403).json({ message: 'Unauthorized access' });
    }

    const newComment = {
      userId,
      userName: req.userName || 'Member',
      text: text.trim(),
      createdAt: new Date(),
    };

    task.comments.push(newComment);
    await task.save();

    // Populate user
    const savedTask = await Task.findById(taskId).populate('comments.userId', 'name email avatar');
    const comment = savedTask.comments[savedTask.comments.length - 1];

    await createActivity({
      boardId: task.boardId,
      taskId: task._id,
      userId,
      userName: req.userName || 'Member',
      type: 'Comment Added',
      message: `${req.userName || 'Member'} commented on task "${task.title}": "${text.trim()}"`,
    });

    res.status(201).json({
      message: 'Comment added successfully',
      comment: encryptUserIds(comment),
    });
  } catch (error) {
    res.status(500).json({ message: 'Error adding comment', error: error.message });
  }
};

// Update comment
export const updateComment = async (req, res) => {
  try {
    const { taskId, commentId } = req.params;
    const { text } = req.body;
    const userId = req.userId;

    if (!text || !text.trim()) {
      return res.status(400).json({ message: 'Comment text is required' });
    }

    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }
    const board = await Board.findById(task.boardId);
    if (!isBoardMember(board, userId)) {
      return res.status(403).json({ message: 'Unauthorized access' });
    }

    const comment = task.comments.id(commentId);
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    if (comment.userId.toString() !== userId) {
      return res.status(403).json({ message: 'Only comment creator can update comments' });
    }

    comment.text = text.trim();
    await task.save();

    res.status(200).json({
      message: 'Comment updated successfully',
      comment: encryptUserIds(comment),
    });
  } catch (error) {
    res.status(500).json({ message: 'Error updating comment', error: error.message });
  }
};

// Delete comment
export const deleteComment = async (req, res) => {
  try {
    const { taskId, commentId } = req.params;
    const userId = req.userId;

    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }
    const boardRecord = await Board.findById(task.boardId);
    if (!isBoardMember(boardRecord, userId)) {
      return res.status(403).json({ message: 'Unauthorized access' });
    }

    const comment = task.comments.id(commentId);
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    // Allow deletion if requester is comment owner OR board owner
    const isCommentOwner = comment.userId.toString() === userId;
    const isBoardOwner = boardRecord.createdBy.toString() === userId;

    if (!isCommentOwner && !isBoardOwner) {
      return res.status(403).json({ message: 'Unauthorized comment deletion' });
    }

    comment.deleteOne();
    await task.save();

    res.status(200).json({
      message: 'Comment deleted successfully',
    });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting comment', error: error.message });
  }
};

// GROUP CHAT MESSAGES MANAGEMENT

// Get Task Chat messages
export const getChatMessages = async (req, res) => {
  try {
    const { taskId } = req.params;
    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }
    const board = await Board.findById(task.boardId);
    if (!isBoardMember(board, req.userId)) {
      return res.status(403).json({ message: 'Unauthorized access' });
    }

    const messages = await TaskChatMessage.find({ taskId })
      .populate('senderId', 'name email avatar')
      .sort({ createdAt: 1 });

    res.status(200).json({
      message: 'Chat messages fetched successfully',
      messages: messages.map((m) => encryptUserIds(m)),
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching chat messages', error: error.message });
  }
};

// Add Task Chat message
export const addChatMessage = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { message } = req.body;
    const userId = req.userId;

    if (!message || !message.trim()) {
      return res.status(400).json({ message: 'Message content is required' });
    }

    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const board = await Board.findById(task.boardId);
    if (!isBoardMember(board, userId)) {
      return res.status(403).json({ message: 'Unauthorized access' });
    }

    const chatMsg = new TaskChatMessage({
      taskId,
      senderId: userId,
      message: message.trim(),
    });

    await chatMsg.save();
    await chatMsg.populate('senderId', 'name email avatar');

    // Emit realtime socket event
    try {
      const io = getIo();
      if (io) {
        const encTaskId = encryptId(taskId);
        const encBoardId = encryptId(task.boardId);
        const encryptedMsg = encryptUserIds(chatMsg);

        // Emit to active task chat participants
        io.to(`task-${taskId}`).emit('chatMessageSent', {
          taskId: encTaskId,
          message: encryptedMsg,
        });

        // Emit to active board members for unread counter
        io.to(`board-${task.boardId}`).emit('boardChatMessageSent', {
          taskId: encTaskId,
          message: encryptedMsg,
        });
      }
    } catch (err) {
      console.error('Socket chatMessageSent emit error:', err);
    }

    res.status(201).json({
      message: 'Chat message sent successfully',
      messageObj: encryptUserIds(chatMsg),
    });
  } catch (error) {
    res.status(500).json({ message: 'Error sending chat message', error: error.message });
  }
};

// Update Task Chat message
export const updateChatMessage = async (req, res) => {
  try {
    const { taskId, messageId } = req.params;
    const { message } = req.body;
    const userId = req.userId;

    if (!message || !message.trim()) {
      return res.status(400).json({ message: 'Message content is required' });
    }

    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }
    const board = await Board.findById(task.boardId);
    if (!isBoardMember(board, userId)) {
      return res.status(403).json({ message: 'Unauthorized access' });
    }

    const chatMsg = await TaskChatMessage.findById(messageId);
    if (!chatMsg) {
      return res.status(404).json({ message: 'Message not found' });
    }

    if (chatMsg.senderId.toString() !== userId) {
      return res.status(403).json({ message: 'Only the message author can edit this message' });
    }

    chatMsg.message = message.trim();
    await chatMsg.save();
    await chatMsg.populate('senderId', 'name email avatar');

    // Emit socket event
    try {
      const io = getIo();
      if (io) {
        const encTaskId = encryptId(taskId);
        const encryptedMsg = encryptUserIds(chatMsg);
        io.to(`task-${taskId}`).emit('chatMessageEdited', {
          taskId: encTaskId,
          message: encryptedMsg,
        });
      }
    } catch (err) {
      console.error('Socket chatMessageEdited emit error:', err);
    }

    res.status(200).json({
      message: 'Message edited successfully',
      messageObj: encryptUserIds(chatMsg),
    });
  } catch (error) {
    res.status(500).json({ message: 'Error editing message', error: error.message });
  }
};

// Delete Task Chat message
export const deleteChatMessage = async (req, res) => {
  try {
    const { taskId, messageId } = req.params;
    const userId = req.userId;

    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }
    const board = await Board.findById(task.boardId);
    if (!isBoardMember(board, userId)) {
      return res.status(403).json({ message: 'Unauthorized access' });
    }

    const chatMsg = await TaskChatMessage.findById(messageId);
    if (!chatMsg) {
      return res.status(404).json({ message: 'Message not found' });
    }

    // Message author OR board owner can delete chat message
    const isAuthor = chatMsg.senderId.toString() === userId;
    const isBoardOwner = board.createdBy.toString() === userId;

    if (!isAuthor && !isBoardOwner) {
      return res.status(403).json({ message: 'Unauthorized message deletion' });
    }

    await TaskChatMessage.findByIdAndDelete(messageId);

    // Emit socket event
    try {
      const io = getIo();
      if (io) {
        const encTaskId = encryptId(taskId);
        const encMessageId = encryptId(messageId);
        io.to(`task-${taskId}`).emit('chatMessageDeleted', {
          taskId: encTaskId,
          messageId: encMessageId,
        });
      }
    } catch (err) {
      console.error('Socket chatMessageDeleted emit error:', err);
    }

    res.status(200).json({
      message: 'Message deleted successfully',
    });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting message', error: error.message });
  }
};

// Join Task (Open Contributor Mode)
export const joinTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    const userId = req.userId;

    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const board = await Board.findById(task.boardId);
    if (!board) {
      return res.status(404).json({ message: 'Board not found' });
    }

    const isMember =
      board.createdBy.toString() === userId ||
      board.members.some((member) => member.toString() === userId);

    if (!isMember) {
      return res.status(403).json({ message: 'Only workspace members can join tasks' });
    }

    if (!task.openContribution) {
      return res.status(400).json({ message: 'Open contribution is not enabled for this task' });
    }

    // Add user as a collaborator if not already added
    const userObjId = new mongoose.Types.ObjectId(userId);
    if (task.collaborators.some((c) => c.toString() === userId)) {
      return res.status(400).json({ message: 'You are already a collaborator' });
    }

    task.collaborators.push(userObjId);
    await task.save();
    await task.populate(['assignedTo', 'createdBy', 'collaborators']);

    // Create Activity
    await createActivity({
      boardId: task.boardId,
      taskId: task._id,
      userId,
      userName: req.userName || 'Member',
      type: 'Task Joined',
      message: `${req.userName || 'Member'} joined task "${task.title}" as a collaborator`,
    });

    // Emit socket event to board room to sync
    try {
      const io = getIo();
      if (io) {
        io.to(`board-${task.boardId}`).emit('task-updated', { task: encryptUserIds(task) });
      }
    } catch (err) {
      console.error('Socket joinTask emit error:', err);
    }

    res.status(200).json({
      message: 'Joined task successfully',
      task: encryptUserIds(task),
    });
  } catch (error) {
    res.status(500).json({ message: 'Error joining task', error: error.message });
  }
};

// Leave Task (Open Contributor Mode)
export const leaveTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    const userId = req.userId;

    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    if (!task.collaborators.some((c) => c.toString() === userId)) {
      return res.status(400).json({ message: 'You are not a collaborator on this task' });
    }

    task.collaborators = task.collaborators.filter((c) => c.toString() !== userId);
    await task.save();
    await task.populate(['assignedTo', 'createdBy', 'collaborators']);

    // Create Activity
    await createActivity({
      boardId: task.boardId,
      taskId: task._id,
      userId,
      userName: req.userName || 'Member',
      type: 'Task Left',
      message: `${req.userName || 'Member'} left task "${task.title}"`,
    });

    // Emit socket event to board room to sync
    try {
      const io = getIo();
      if (io) {
        io.to(`board-${task.boardId}`).emit('task-updated', { task: encryptUserIds(task) });
      }
    } catch (err) {
      console.error('Socket leaveTask emit error:', err);
    }

    res.status(200).json({
      message: 'Left task successfully',
      task: encryptUserIds(task),
    });
  } catch (error) {
    res.status(500).json({ message: 'Error leaving task', error: error.message });
  }
};
