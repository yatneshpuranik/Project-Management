import User from '../../model/userModel.js';
import Board from '../../model/board.js';
import fs from 'fs';
import path from 'path';
import Task from '../../model/task.js';
import Activity from '../../model/activity.js';
import Notification from '../../model/notification.js';
import { encryptUserIds, encryptId } from '../../utils/idCrypt.js';
import mongoose from 'mongoose';
import { getIo, emitToUser } from '../../socket/socket.js';
import { logAdminAction } from './adminController.js';
import { sendOwnershipTransferEmail, sendOwnershipRevokedEmail } from '../../utils/emailService.js';

// Get All Workspaces
export const getWorkspaces = async (req, res) => {
  try {
    const { search } = req.query;
    let query = {};
    if (search) {
      query = { title: { $regex: search, $options: 'i' } };
    }
    const boards = await Board.find(query)
      .populate('createdBy', 'name email avatar')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      workspaces: boards.map(b => encryptUserIds(b))
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching workspaces', error: error.message });
  }
};

// Get Workspace Details
export const getWorkspaceDetails = async (req, res) => {
  try {
    const { boardId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(boardId)) {
      return res.status(400).json({ message: 'Invalid board ID format' });
    }

    const board = await Board.findById(boardId)
      .populate('createdBy', 'name email avatar role')
      .populate('members', 'name email avatar role');

    if (!board) {
      return res.status(404).json({ message: 'Workspace not found' });
    }

    // Fetch workspace activities and tasks
    const tasks = await Task.find({ boardId }).populate('assignedTo', 'name email avatar');
    const activities = await Activity.find({ boardId }).sort({ createdAt: -1 }).limit(30);

    res.status(200).json({
      success: true,
      workspace: encryptUserIds(board),
      tasks: tasks.map(t => encryptUserIds(t)),
      activities: activities.map(a => encryptUserIds(a))
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching workspace details', error: error.message });
  }
};

// Toggle Workspace Archive
export const toggleWorkspaceArchive = async (req, res) => {
  try {
    const { boardId } = req.params;
    const { isArchived } = req.body;

    if (!mongoose.Types.ObjectId.isValid(boardId)) {
      return res.status(400).json({ message: 'Invalid board ID format' });
    }

    const board = await Board.findById(boardId);
    if (!board) {
      return res.status(404).json({ message: 'Workspace not found' });
    }

    board.isArchived = isArchived;
    await board.save();

    const actionName = isArchived ? 'Workspace Archived' : 'Workspace Restored';
    await logAdminAction(req, actionName, board._id, board.title, `Archive state set to ${isArchived}`);

    res.status(200).json({ success: true, message: `Workspace archive state set to ${isArchived}`, board: encryptUserIds(board) });
  } catch (error) {
    res.status(500).json({ message: 'Error archiving workspace', error: error.message });
  }
};

// Transfer Workspace Ownership
export const transferWorkspaceOwnership = async (req, res) => {
  try {
    const { boardId } = req.params;
    const { newOwnerId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(boardId)) {
      return res.status(400).json({ message: 'Invalid board ID format' });
    }
    if (!mongoose.Types.ObjectId.isValid(newOwnerId)) {
      return res.status(400).json({ message: 'Invalid new owner ID format' });
    }

    const board = await Board.findById(boardId);
    if (!board) {
      return res.status(404).json({ message: 'Workspace not found' });
    }

    const newOwner = await User.findById(newOwnerId);
    if (!newOwner) {
      return res.status(404).json({ message: 'New owner user not found' });
    }

    const oldOwnerId = board.createdBy;
    board.createdBy = newOwnerId;

    if (!board.members.includes(newOwnerId)) {
      board.members.push(newOwnerId);
    }
    if (!board.members.includes(oldOwnerId)) {
      board.members.push(oldOwnerId);
    }

    await board.save();

    const oldOwner = await User.findById(oldOwnerId);
    if (oldOwner) {
      await sendOwnershipTransferEmail(
        oldOwner.email,
        oldOwner.name,
        newOwner.email,
        newOwner.name,
        board.title,
        new Date().toISOString()
      );
      await sendOwnershipRevokedEmail(
        oldOwner.email,
        oldOwner.name,
        board.title,
        'Ownership transferred by Administrator',
        newOwner.name
      );
    }

    await logAdminAction(req, 'Ownership Transfer', board._id, board.title, `Ownership transferred from ${oldOwnerId} to ${newOwnerId}`);

    const notifNew = new Notification({
      recipient: newOwnerId,
      sender: req.userId,
      senderName: req.userName || 'Admin',
      type: 'ownership_transfer',
      status: 'unread',
      boardId: board._id,
      boardTitle: board.title,
      message: `You have been transferred ownership of workspace: "${board.title}" by the administrator.`,
    });
    await notifNew.save();

    try {
      emitToUser(newOwnerId, 'invitationSent', {
        recipientId: encryptId(newOwnerId),
        notification: encryptUserIds(notifNew)
      });
      emitToUser(oldOwnerId, 'ownership-transferred', { boardId: encryptId(board._id), newOwnerId: encryptId(newOwnerId) });
      getIo()?.to(`board-${board._id}`).emit('board-updated', { board: encryptUserIds(board) });
    } catch (e) {}

    res.status(200).json({ success: true, message: 'Workspace ownership transferred successfully', board: encryptUserIds(board) });
  } catch (error) {
    res.status(500).json({ message: 'Error transferring ownership', error: error.message });
  }
};

// Force Add Workspace Member
export const forceAddWorkspaceMember = async (req, res) => {
  try {
    const { boardId } = req.params;
    const { userId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(boardId)) {
      return res.status(400).json({ message: 'Invalid board ID format' });
    }
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Invalid user ID format' });
    }

    const board = await Board.findById(boardId);
    if (!board) {
      return res.status(404).json({ message: 'Workspace not found' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (board.members.includes(userId)) {
      return res.status(400).json({ message: 'User is already a member of this workspace' });
    }

    board.members.push(userId);
    await board.save();

    await logAdminAction(req, 'Admin Member Added', board._id, board.title, `Forcefully added ${user.name}`);

    const notif = new Notification({
      recipient: userId,
      sender: req.userId,
      senderName: req.userName || 'Admin',
      type: 'board_invite',
      status: 'accepted',
      boardId: board._id,
      boardTitle: board.title,
      message: `You have been forcefully added to workspace: "${board.title}" by the administrator.`,
    });
    await notif.save();

    try {
      emitToUser(userId, 'invitationSent', {
        recipientId: encryptId(userId),
        notification: encryptUserIds(notif)
      });
      emitToUser(userId, 'memberAdded', { boardId: encryptId(board._id) });
      getIo()?.to(`board-${board._id}`).emit('board-updated', { board: encryptUserIds(board) });
    } catch (e) {}

    res.status(200).json({ success: true, message: 'Member added forcefully', board: encryptUserIds(board) });
  } catch (error) {
    res.status(500).json({ message: 'Error adding workspace member', error: error.message });
  }
};

// Force Remove Workspace Member
export const forceRemoveWorkspaceMember = async (req, res) => {
  try {
    const { boardId } = req.params;
    const { userId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(boardId)) {
      return res.status(400).json({ message: 'Invalid board ID format' });
    }
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Invalid user ID format' });
    }

    const board = await Board.findById(boardId);
    if (!board) {
      return res.status(404).json({ message: 'Workspace not found' });
    }

    if (board.createdBy.toString() === userId) {
      return res.status(400).json({ message: 'Cannot remove the workspace owner/creator' });
    }

    board.members = board.members.filter(m => m.toString() !== userId);
    await board.save();

    await Task.updateMany(
      { boardId, assignedTo: userId },
      { $unset: { assignedTo: 1, assignedBy: 1 } }
    );
    await Task.updateMany(
      { boardId, collaborators: userId },
      { $pull: { collaborators: userId } }
    );

    const user = await User.findById(userId);
    await logAdminAction(req, 'Admin Member Removed', board._id, board.title, `Forcefully removed ${user?.name || userId}`);

    try {
      emitToUser(userId, 'memberRemoved', { boardId: encryptId(board._id) });
      getIo()?.to(`board-${board._id}`).emit('board-updated', { board: encryptUserIds(board) });
    } catch (e) {}

    res.status(200).json({ success: true, message: 'Member removed forcefully', board: encryptUserIds(board) });
  } catch (error) {
    res.status(500).json({ message: 'Error removing workspace member', error: error.message });
  }
};

// Delete Workspace
export const deleteWorkspace = async (req, res) => {
  try {
    const { boardId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(boardId)) {
      return res.status(400).json({ message: 'Invalid board ID format' });
    }

    const board = await Board.findById(boardId);
    if (!board) {
      return res.status(404).json({ message: 'Workspace not found' });
    }

    await logAdminAction(req, 'Workspace Deleted', board._id, board.title, `Workspace ${board.title} deleted permanently`);

    // 1. Fetch all task IDs of this board
    let taskIds = [];
    try {
      const tasks = await Task.find({ boardId }).select('_id');
      taskIds = tasks.map((t) => t._id);
    } catch (e) {
      console.error('Error fetching task IDs for cascade delete:', e);
    }

    // 2. Delete task chat messages
    if (taskIds.length > 0) {
      try {
        const TaskChatMessage = mongoose.model('TaskChatMessage');
        if (TaskChatMessage) {
          await TaskChatMessage.deleteMany({ taskId: { $in: taskIds } });
        }
      } catch (e) {
        console.error('Error cascade deleting task chat messages:', e);
      }
    }

    // 3. Delete attachments (files from disk and database documents)
    try {
      const Attachment = mongoose.model('Attachment');
      if (Attachment) {
        const attachments = await Attachment.find({ boardId });
        for (const att of attachments) {
          if (att.url) {
            const filename = path.basename(att.url);
            const filePath = path.join(process.cwd(), 'uploads', filename);
            if (fs.existsSync(filePath)) {
              fs.unlinkSync(filePath);
            }
          }
        }
        await Attachment.deleteMany({ boardId });
      }
    } catch (e) {
      console.error('Error cascade deleting attachments:', e);
    }

    // 4. Delete board chat messages
    try {
      const BoardChatMessage = mongoose.model('BoardChatMessage');
      if (BoardChatMessage) {
        await BoardChatMessage.deleteMany({ boardId });
      }
    } catch (e) {
      console.error('Error cascade deleting board chat messages:', e);
    }

    // 5. Delete activities
    try {
      const Activity = mongoose.model('Activity');
      if (Activity) {
        await Activity.deleteMany({ boardId });
      }
    } catch (e) {
      console.error('Error cascade deleting activities:', e);
    }

    // 6. Delete notifications related to the board
    try {
      const Notification = mongoose.model('Notification');
      if (Notification) {
        await Notification.deleteMany({ boardId });
      }
    } catch (e) {
      console.error('Error cascade deleting notifications:', e);
    }

    // 7. Delete all tasks in this board
    await Task.deleteMany({ boardId: new mongoose.Types.ObjectId(boardId) });

    await Board.findByIdAndDelete(boardId);

    try {
      getIo()?.to(`board-${boardId}`).emit('board-deleted', { boardId: encryptId(boardId) });
    } catch (e) {}

    res.status(200).json({ success: true, message: 'Workspace deleted permanently' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting workspace', error: error.message });
  }
};
