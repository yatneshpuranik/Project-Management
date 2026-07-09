import mongoose from 'mongoose';
import Notification from '../model/notification.js';
import Board from '../model/board.js';
import Task from '../model/task.js';
import User from '../model/userModel.js';
import AuditLog from '../model/auditLog.js';
import { createActivity } from './activityController.js';
import { encryptUserIds, encryptId } from '../utils/idCrypt.js';
import { getIo, emitToUser } from '../socket/socket.js';
import { sendInvitationStatusEmail } from '../utils/emailService.js';

// Get notifications for current user
export const getNotifications = async (req, res) => {
  try {
    const userId = req.userId;

    const notifications = await Notification.find({ recipient: userId })
      .populate('sender', 'name email avatar role')
      .sort({ createdAt: -1 });

    const safeNotifications = notifications.map((n) => {
      const encrypted = encryptUserIds(n);
      if (req.user?.role !== 'ADMIN') {
        if (encrypted.sender && encrypted.sender.role === 'ADMIN') {
          encrypted.sender.email = undefined;
        }
      }
      return encrypted;
    });

    res.status(200).json({
      message: 'Notifications fetched successfully',
      notifications: safeNotifications,
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

    if (!mongoose.Types.ObjectId.isValid(notificationId)) {
      return res.status(400).json({ message: 'Invalid notification ID format' });
    }

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

      // Check if recipient is the board creator -> this means this is an access request!
      const isAccessRequest = (board.createdBy?._id || board.createdBy || '').toString() === userId;
      // targetUserId is the user to add to the board (if access request, add the sender of request; else add the current user/invitee)
      const targetUserId = isAccessRequest ? notification.sender : userId;
      const targetUser = await User.findById(targetUserId);
      const targetUserName = targetUser ? targetUser.name : 'A member';

      if (action === 'accept') {
        if (!board.members.some(m => m.toString() === targetUserId.toString())) {
          board.members.push(targetUserId);
        }
        // Also remove from requests array if it was an access request
        if (board.requests) {
          board.requests = board.requests.filter(r => r.toString() !== targetUserId.toString());
        }
        await board.save();
        await board.populate(['createdBy', 'members']);

        await AuditLog.create({
          action: isAccessRequest ? 'Access Request Approved' : 'Invite Accepted',
          actorId: userId,
          actorName: userName,
          targetId: board._id,
          targetName: board.title,
          details: isAccessRequest 
            ? `${userName} approved access request for ${targetUserName} to join workspace "${board.title}"`
            : `${userName} accepted invitation to join workspace "${board.title}"`,
          ipAddress: req.ip || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || ''
        }).catch(e => {});

        await createActivity({
          boardId: board._id,
          userId: targetUserId,
          userName: targetUserName,
          type: 'Invitation Accepted',
          message: isAccessRequest
            ? `${targetUserName} was added to workspace "${board.title}" via access request approval`
            : `${userName} accepted invitation to join workspace "${board.title}"`,
        });

        // If it was an access request, create approval notification for requester
        let approvalNotification = null;
        if (isAccessRequest) {
          approvalNotification = new Notification({
            recipient: targetUserId,
            sender: userId, // owner
            senderName: userName,
            type: 'board_invite',
            status: 'accepted',
            boardId: board._id,
            boardTitle: board.title,
            message: `Your request to join workspace "${board.title}" was approved!`,
          });
          await approvalNotification.save();
        } else {
          // Notify board owner that their invite was accepted
          approvalNotification = new Notification({
            recipient: board.createdBy,
            sender: userId, // invited member
            senderName: userName,
            type: 'board_invite',
            status: 'accepted',
            boardId: board._id,
            boardTitle: board.title,
            message: `${userName} accepted your invitation to join workspace: "${board.title}"`,
          });
          await approvalNotification.save();

          const ownerUser = await User.findById(board.createdBy);
          if (ownerUser && targetUser) {
            await sendInvitationStatusEmail('accepted', ownerUser.email, ownerUser.name, targetUser.email, targetUser.name, board.title);
          }
        }

        
        try {
          const io = getIo();
          const encryptedUser = encryptUserIds(targetUser);
          const encryptedBoard = encryptUserIds(board);
          
          if (io) {
            // Emit to board room
            io.to(`board-${board._id.toString()}`).emit('memberAdded', {
              boardId: encryptId(board._id),
              member: encryptedUser,
              board: encryptedBoard,
            });
          }
          
          // Emit to user who was added
          emitToUser(targetUserId, 'memberAdded', {
            boardId: encryptId(board._id),
            member: encryptedUser,
            board: encryptedBoard,
            notification: (approvalNotification && isAccessRequest) ? encryptUserIds(approvalNotification) : undefined
          });

          // Also emit new notification to the owner / recipient's inbox
          if (approvalNotification) {
            const recipientId = approvalNotification.recipient.toString();
            emitToUser(recipientId, 'invitationSent', {
              recipientId: encryptId(recipientId),
              notification: encryptUserIds(approvalNotification),
            });
          }

          // Emit to board creator (owner)
          if (!isAccessRequest) {
            emitToUser(board.createdBy, 'memberAdded', {
              boardId: encryptId(board._id),
              member: encryptedUser,
              board: encryptedBoard,
            });
          }
        } catch (err) {
          console.error('Socket memberAdded emit error:', err);
        }

      } else {
        // Reject Invitation / Request
        if (isAccessRequest) {
          // Remove from requests
          if (board.requests) {
            board.requests = board.requests.filter(r => r.toString() !== targetUserId.toString());
            await board.save();
          }
        }

        await AuditLog.create({
          action: isAccessRequest ? 'Access Request Rejected' : 'Invite Rejected',
          actorId: userId,
          actorName: userName,
          targetId: board._id,
          targetName: board.title,
          details: isAccessRequest
            ? `${userName} declined access request from ${targetUserName} to join workspace "${board.title}"`
            : `${userName} rejected invitation to join workspace "${board.title}"`,
          ipAddress: req.ip || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || ''
        }).catch(e => {});

        await createActivity({
          boardId: board._id,
          userId: targetUserId,
          userName: targetUserName,
          type: 'Invitation Rejected',
          message: isAccessRequest
            ? `${userName} declined access request from ${targetUserName} to join workspace "${board.title}"`
            : `${userName} declined invitation to join workspace "${board.title}"`,
        });

        // Create notification for the requester/sender
        const rejectionNotification = new Notification({
          recipient: notification.sender, // The requester
          sender: userId, // Rejecter
          senderName: userName,
          type: 'board_invite',
          status: 'rejected',
          boardId: board._id,
          boardTitle: board.title,
          message: isAccessRequest
            ? `Your request to join workspace "${board.title}" was declined.`
            : `${userName} rejected your invitation to join workspace: "${board.title}"`,
        });
        await rejectionNotification.save();

        if (!isAccessRequest) {
          const ownerUser = await User.findById(notification.sender);
          if (ownerUser && targetUser) {
            await sendInvitationStatusEmail('rejected', ownerUser.email, ownerUser.name, targetUser.email, targetUser.name, board.title);
          }
        }

        // Socket events for invitation/request rejected
        try {
          emitToUser(notification.sender, 'memberInviteRejected', {
            boardId: encryptId(board._id),
            inviteeId: encryptId(notification.sender),
            inviteeName: targetUserName,
            notification: encryptUserIds(rejectionNotification),
          });

          // Send notification to inbox in real-time
          emitToUser(notification.sender, 'invitationSent', {
            recipientId: encryptId(notification.sender),
            notification: encryptUserIds(rejectionNotification),
          });
        } catch (err) {
          console.error('Socket rejection notification emit error:', err);
        }
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

// Mark notification as read
export const markNotificationAsRead = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.userId;

    if (!mongoose.Types.ObjectId.isValid(notificationId)) {
      return res.status(400).json({ message: 'Invalid notification ID format' });
    }

    const notification = await Notification.findById(notificationId);
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    if (notification.recipient.toString() !== userId) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    notification.status = 'read';
    await notification.save();

    res.status(200).json({
      message: 'Notification marked as read',
      notification: encryptUserIds(notification),
    });
  } catch (error) {
    res.status(500).json({ message: 'Error marking notification as read', error: error.message });
  }
};

// Delete a notification
export const deleteNotification = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.userId;

    if (!mongoose.Types.ObjectId.isValid(notificationId)) {
      return res.status(400).json({ message: 'Invalid notification ID format' });
    }

    const notification = await Notification.findById(notificationId);
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    if (notification.recipient.toString() !== userId) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    await Notification.findByIdAndDelete(notificationId);

    res.status(200).json({ message: 'Notification deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting notification', error: error.message });
  }
};

// Delete all notifications for current user
export const deleteAllNotifications = async (req, res) => {
  try {
    const userId = req.userId;
    await Notification.deleteMany({ recipient: userId });
    res.status(200).json({ message: 'All notifications deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting all notifications', error: error.message });
  }
};
