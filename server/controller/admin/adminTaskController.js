import User from '../../model/userModel.js';
import Board from '../../model/board.js';
import Task from '../../model/task.js';
import Notification from '../../model/notification.js';
import { encryptUserIds, encryptId } from '../../utils/idCrypt.js';
import mongoose from 'mongoose';
import { getIo, emitToUser } from '../../socket/socket.js';
import { logAdminAction } from './adminController.js';

// Get All Tasks
export const getTasks = async (req, res) => {
  try {
    const { search } = req.query;
    let query = {};
    if (search) {
      query = {
        $or: [
          { title: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } }
        ]
      };
    }
    const tasks = await Task.find(query)
      .populate('boardId', 'title')
      .populate('assignedTo', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      tasks: tasks.map(t => encryptUserIds(t))
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching tasks', error: error.message });
  }
};

// Reassign Task
export const reassignTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { userId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(taskId)) {
      return res.status(400).json({ message: 'Invalid task ID format' });
    }

    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    let user = null;
    if (userId) {
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ message: 'Invalid user ID format' });
      }
      user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ message: 'Assignee user not found' });
      }
    }

    const previousAssignee = task.assignedTo;
    task.assignedTo = userId || undefined;
    task.assignedBy = userId ? req.userId : undefined;
    await task.save();

    await logAdminAction(req, 'Task Reassigned', task._id, task.title, `Reassigned task from ${previousAssignee || 'Unassigned'} to ${userId || 'Unassigned'}`);

    if (userId && previousAssignee?.toString() !== userId) {
      const notif = new Notification({
        recipient: userId,
        sender: req.userId,
        senderName: req.userName || 'Admin',
        type: 'task_assign',
        status: 'unread',
        boardId: task.boardId,
        taskId: task._id,
        taskTitle: task.title,
        message: `You have been assigned to task: "${task.title}" by the administrator.`,
      });
      await notif.save();
      try {
        emitToUser(userId, 'invitationSent', {
          recipientId: encryptId(userId),
          notification: encryptUserIds(notif)
        });
        emitToUser(userId, 'taskAssigned', { taskId: encryptId(task._id) });
      } catch (e) {}
    }

    try {
      getIo()?.to(`board-${task.boardId}`).emit('task-updated', { task: encryptUserIds(task) });
    } catch (e) {}

    res.status(200).json({ success: true, message: 'Task reassigned successfully', task: encryptUserIds(task) });
  } catch (error) {
    res.status(500).json({ message: 'Error reassigning task', error: error.message });
  }
};

// Delete Task (Soft-delete)
export const deleteTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(taskId)) {
      return res.status(400).json({ message: 'Invalid task ID format' });
    }

    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    task.isDeleted = true;
    await task.save();

    await logAdminAction(req, 'Deleted Task', task._id, task.title, 'Task soft-deleted');

    try {
      getIo()?.to(`board-${task.boardId}`).emit('task-deleted', { taskId: encryptId(taskId) });
    } catch (e) {}

    res.status(200).json({ success: true, message: 'Task soft-deleted successfully', task: encryptUserIds(task) });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting task', error: error.message });
  }
};

// Restore Task
export const restoreTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(taskId)) {
      return res.status(400).json({ message: 'Invalid task ID format' });
    }

    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    task.isDeleted = false;
    await task.save();

    await logAdminAction(req, 'Recent Admin Actions', task._id, task.title, 'Task restored from trash');

    try {
      getIo()?.to(`board-${task.boardId}`).emit('task-created', { task: encryptUserIds(task) });
    } catch (e) {}

    res.status(200).json({ success: true, message: 'Task restored successfully', task: encryptUserIds(task) });
  } catch (error) {
    res.status(500).json({ message: 'Error restoring task', error: error.message });
  }
};
