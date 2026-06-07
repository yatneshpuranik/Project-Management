import mongoose from 'mongoose';
import Notification from '../model/notification.js';
import Board from '../model/board.js';
import Task from '../model/task.js';
import User from '../model/userModel.js';
import { createActivity } from './activityController.js';
import { encryptUserIds, encryptId } from '../utils/idCrypt.js';
import { getIo } from '../socket/socket.js';

// Get notifications for current user
export const getNotifications = async (req, res) => {
  try {
    const userId = req.userId;

    const notifications = await Notification.find({ recipient: userId })
      .populate('sender', 'name email avatar')
      .sort({ createdAt: -1 });

    res.status(200).json({
      message: 'Notifications fetched successfully',
      notifications: notifications.map((n) => encryptUserIds(n)),
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching notifications', error: error.message });
  }
};

// Respond to board or task invitation
export const respondToInvitation = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const { action } = req.body; // 'accept' or 'reject'
    const userId = req.userId;

    if (!['accept', 'reject'].includes(action)) {
      return res.status(400).json({ message: 'Invalid action' });
    }

    const notification = await Notification.findById(notificationId);
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    if (notification.recipient.toString() !== userId) {
      return res.status(403).json({ message: 'Unauthorized response' });
    }

    if (notification.status !== 'pending') {
      return res.status(400).json({ message: 'Invitation already responded to' });
    }

    notification.status = action === 'accept' ? 'accepted' : 'rejected';
    await notification.save();

    const user = await User.findById(userId);
    const userName = user ? user.name : 'A member';

    if (notification.type === 'board_invite') {
      const board = await Board.findById(notification.boardId);
      if (!board) {
        return res.status(404).json({ message: 'Board not found' });
      }

      if (action === 'accept') {
        if (!board.members.includes(userId)) {
          board.members.push(userId);
          await board.save();
        }

        await createActivity({
          boardId: board._id,
          userId,
          userName,
          type: 'Invitation Accepted',
          message: `${userName} accepted invitation to join workspace "${board.title}"`,
        });
      } else {
        await createActivity({
          boardId: board._id,
          userId,
          userName,
          type: 'Invitation Rejected',
          message: `${userName} declined invitation to join workspace "${board.title}"`,
        });
      }

      // Socket update to board room
      try {
        const io = getIo();
        if (io) {
          const eventName = action === 'accept' ? 'invitationAccepted' : 'invitationRejected';
          io.to(`board-${board._id.toString()}`).emit(eventName, {
            boardId: encryptId(board._id),
            notification: encryptUserIds(notification),
          });
        }
      } catch (err) {
        console.error('Socket notification response emit error:', err);
      }

    } else if (notification.type === 'task_invite' || notification.type === 'task_assign') {
      const task = await Task.findById(notification.taskId);
      if (!task) {
        return res.status(404).json({ message: 'Task not found' });
      }

      const board = await Board.findById(task.boardId);
      if (!board) {
        return res.status(404).json({ message: 'Board not found' });
      }

      if (action === 'accept') {
        if (!board.members.some((member) => member.toString() === userId) && board.createdBy.toString() !== userId) {
          board.members.push(userId);
          await board.save();
        }

        if (!task.collaborators.includes(userId)) {
          task.collaborators.push(userId);
          await task.save();
        }

        await createActivity({
          boardId: task.boardId,
          taskId: task._id,
          userId,
          userName,
          type: 'Task Updated',
          message: `${userName} joined task "${task.title}"`,
        });
      }

      try {
        const io = getIo();
        if (io) {
          const eventName = action === 'accept' ? 'invitationAccepted' : 'invitationRejected';
          io.to(`board-${task.boardId.toString()}`).emit(eventName, {
            boardId: encryptId(task.boardId),
            taskId: encryptId(task._id),
            notification: encryptUserIds(notification),
          });
        }
      } catch (err) {
        console.error('Socket task invitation response emit error:', err);
      }
    }

    res.status(200).json({
      message: `Invitation successfully ${action}ed`,
      notification: encryptUserIds(notification),
    });
  } catch (error) {
    res.status(500).json({ message: 'Error responding to invitation', error: error.message });
  }
};
