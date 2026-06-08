import mongoose from 'mongoose';
import Board from '../model/board.js';
import Task from '../model/task.js';
import { createActivity } from './activityController.js';
import User from '../model/userModel.js';
import { getIo, evictUserFromBoard, emitToUser } from '../socket/socket.js';
import { encryptUserIds, encryptId } from '../utils/idCrypt.js';
import { checkPermission } from '../utils/permissions.js';
import Notification from '../model/notification.js';
import AuditLog from '../model/auditLog.js';

const sanitizeBoard = (board, userRole) => {
  if (!board) return board;
  const b = encryptUserIds(board);
  if (userRole !== 'ADMIN') {
    if (b.createdBy && b.createdBy.role === 'ADMIN') {
      b.createdBy.email = undefined;
    }
    if (b.members) {
      b.members.forEach(m => {
        if (m && m.role === 'ADMIN') {
          m.email = undefined;
        }
      });
    }
  }
  return b;
};

// Create Board
export const createBoard = async (req, res) => {
  try {
    const { title, description, visibility, channels } = req.body;
    const userId = req.userId;

    const user = await User.findById(userId);
    if (!user || (user.role !== 'USER' && user.role !== 'ADMIN')) {
      return res.status(403).json({ message: 'Forbidden: Only users with role USER or ADMIN can create workspaces' });
    }

    if (!title) {
      return res.status(400).json({ message: 'Title is required' });
    }

    const board = new Board({
      title,
      description,
      createdBy: userId,
      members: [userId],
      visibility: visibility || 'private',
      channels: channels || ['general', 'development', 'testing', 'announcements'],
    });

    await board.save();
    await board.populate(['createdBy', 'members']);

    // Log Workspace Created
    await AuditLog.create({
      action: 'Workspace Created',
      actorId: userId,
      actorName: user.name,
      targetId: board._id,
      targetName: board.title,
      details: `Workspace created by ${user.name} (${user.email})`,
      ipAddress: req.ip || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || ''
    }).catch(e => {});

    res.status(201).json({
      message: 'Board created successfully',
      board: sanitizeBoard(board, req.user?.role),
    });
  } catch (error) {
    res.status(500).json({ message: 'Error creating board', error: error.message });
  }
};

// Get All Boards
export const getBoards = async (req, res) => {
  try {
    const userId = req.userId;

    const boards = await Board.find({
      $or: [{ createdBy: userId }, { members: userId }],
    })
      .populate('createdBy', 'name email avatar role presenceStatus lastActive')
      .populate('members', 'name email avatar role presenceStatus lastActive')
      .sort({ createdAt: -1 });

    res.status(200).json({
      message: 'Boards fetched successfully',
      boards: boards.map(b => sanitizeBoard(b, req.user?.role)),
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching boards', error: error.message });
  }
};

// Get Board by ID
export const getBoardById = async (req, res) => {
  try {
    const { boardId } = req.params;
    const userId = req.userId;

    if (!mongoose.Types.ObjectId.isValid(boardId)) {
      return res.status(400).json({ message: 'Invalid board ID format' });
    }

    const board = await Board.findById(boardId)
      .populate('createdBy', 'name email avatar role presenceStatus lastActive')
      .populate('members', 'name email avatar role presenceStatus lastActive');

    if (!board) {
      return res.status(404).json({ message: 'Board not found' });
    }

    // Check if user is member
    const isMember =
      (board.createdBy?._id || board.createdBy || '').toString() === userId ||
      board.members.some((member) => (member?._id || member || '').toString() === userId);

    if (!isMember) {
      return res.status(403).json({ message: 'Unauthorized access' });
    }

    res.status(200).json({
      message: 'Board fetched successfully',
      board: sanitizeBoard(board, req.user?.role),
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching board', error: error.message });
  }
};

export const updateBoard = async (req, res) => {
  try {
    const { boardId } = req.params;
    const { title, description, visibility, channels, createdBy, isArchived } = req.body;
    const userId = req.userId;

    if (!mongoose.Types.ObjectId.isValid(boardId)) {
      return res.status(400).json({ message: 'Invalid board ID format' });
    }

    const board = await Board.findById(boardId);

    if (!board) {
      return res.status(404).json({ message: 'Board not found' });
    }

    const isCreator = (board.createdBy?._id || board.createdBy || '').toString() === userId;
    const isAdmin = req.user?.role === 'ADMIN';

    // Handle Ownership Transfer
    if (createdBy && createdBy !== board.createdBy.toString()) {
      const hasTransferPerm = await checkPermission(userId, boardId, 'canTransferOwnership');
      if (!hasTransferPerm) {
        return res.status(403).json({ message: 'Only authorized roles can transfer workspace ownership' });
      }

      if (!mongoose.Types.ObjectId.isValid(createdBy)) {
        return res.status(400).json({ message: 'Invalid new owner ID format' });
      }
      const newOwner = await User.findById(createdBy);
      if (!newOwner) {
        return res.status(404).json({ message: 'New owner user not found' });
      }

      const oldOwnerId = board.createdBy.toString();
      board.createdBy = createdBy;

      // Ensure both are members
      if (!board.members.some((m) => m.toString() === createdBy)) {
        board.members.push(createdBy);
      }
      if (!board.members.some((m) => m.toString() === oldOwnerId)) {
        board.members.push(oldOwnerId);
      }

      // Log/Create Activity
      await createActivity({
        boardId: board._id,
        userId,
        userName: req.userName || 'Owner',
        type: 'ownership_transfer',
        message: `${req.userName || 'Owner'} transferred workspace ownership to ${newOwner.name}`,
      });

      // Notification
      const notifNew = new Notification({
        recipient: createdBy,
        sender: userId,
        senderName: req.userName || 'Owner',
        type: 'ownership_transfer',
        status: 'unread',
        boardId: board._id,
        boardTitle: board.title,
        message: `${req.userName || 'Owner'} has transferred ownership of workspace: "${board.title}" to you.`,
      });
      await notifNew.save();

      try {
        emitToUser(createdBy, 'invitationSent', {
          recipientId: encryptId(createdBy),
          notification: encryptUserIds(notifNew),
        });
        emitToUser(oldOwnerId, 'ownership-transferred', {
          boardId: encryptId(board._id),
          newOwnerId: encryptId(createdBy),
        });
      } catch (e) {}
    }

    // Handle Channel modification
    if (channels !== undefined) {
      const hasChannelPerm = await checkPermission(userId, boardId, 'canManageChannels');
      if (!hasChannelPerm) {
        return res.status(403).json({ message: 'Only authorized roles can manage workspace channels' });
      }
      board.channels = channels;
    }

    // Handle Archive modification
    if (isArchived !== undefined && isArchived !== board.isArchived) {
      const hasArchivePerm = await checkPermission(userId, boardId, 'canArchiveWorkspace');
      if (!hasArchivePerm) {
        return res.status(403).json({ message: 'Only authorized roles can archive this workspace' });
      }
      board.isArchived = isArchived;

      // Log activity
      await createActivity({
        boardId: board._id,
        userId,
        userName: req.userName || 'Owner',
        type: isArchived ? 'Workspace Archived' : 'Workspace Restored',
        message: `${req.userName || 'Owner'} has ${isArchived ? 'archived' : 'restored'} the workspace: "${board.title}"`,
      });

      // Notify members
      const allMembers = [board.createdBy, ...board.members].map(m => m.toString());
      const uniqueMembers = Array.from(new Set(allMembers)).filter(mId => mId !== userId);
      for (const memberId of uniqueMembers) {
        const notif = new Notification({
          recipient: memberId,
          sender: userId,
          senderName: req.userName || 'Owner',
          type: 'workspace_archived',
          status: 'unread',
          boardId: board._id,
          boardTitle: board.title,
          message: `${req.userName || 'Owner'} has ${isArchived ? 'archived' : 'restored'} the workspace: "${board.title}"`
        });
        await notif.save();
        try {
          emitToUser(memberId, 'invitationSent', {
            recipientId: encryptId(memberId),
            notification: encryptUserIds(notif)
          });
        } catch (err) {}
      }
    }

    // Edit general workspace settings
    if (title || description !== undefined || visibility) {
      if (!isCreator && !isAdmin) {
        return res.status(403).json({ message: 'Only board creator or admin can edit general workspace settings' });
      }
      if (title) board.title = title;
      if (description !== undefined) board.description = description;
      if (visibility) board.visibility = visibility;
    }

    await board.save();
    await board.populate(['createdBy', 'members']);

    res.status(200).json({
      message: 'Board updated successfully',
      board: sanitizeBoard(board, req.user?.role),
    });
  } catch (error) {
    res.status(500).json({ message: 'Error updating board', error: error.message });
  }
};

// Delete Board
export const deleteBoard = async (req, res) => {
  try {
    const { boardId } = req.params;
    const userId = req.userId;

    if (!mongoose.Types.ObjectId.isValid(boardId)) {
      return res.status(400).json({ message: 'Invalid board ID format' });
    }

    const board = await Board.findById(boardId);

    if (!board) {
      return res.status(404).json({ message: 'Board not found' });
    }

    const hasDeletePerm = await checkPermission(userId, boardId, 'canDeleteWorkspace');
    if (!hasDeletePerm) {
      return res.status(403).json({ message: 'Only authorized roles can delete this workspace' });
    }

    // Log Workspace Deleted
    await AuditLog.create({
      action: 'Workspace Deleted',
      actorId: userId,
      actorName: req.userName || 'Owner',
      targetId: board._id,
      targetName: board.title,
      details: `Workspace deleted by owner: ${board.title}`,
      ipAddress: req.ip || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || ''
    }).catch(e => {});

    // Notify members about workspace deletion
    const allMembers = [board.createdBy, ...board.members].map(m => m.toString());
    const uniqueMembers = Array.from(new Set(allMembers)).filter(mId => mId !== userId);
    for (const memberId of uniqueMembers) {
      const notif = new Notification({
        recipient: memberId,
        sender: userId,
        senderName: req.userName || 'Owner',
        type: 'workspace_deleted',
        status: 'unread',
        message: `The workspace "${board.title}" was deleted by the owner.`
      });
      await notif.save();
      try {
        emitToUser(memberId, 'invitationSent', {
          recipientId: encryptId(memberId),
          notification: encryptUserIds(notif)
        });
      } catch (err) {}
    }

    // Delete all tasks in this board
    await Task.deleteMany({ boardId });

    await Board.findByIdAndDelete(boardId);

    res.status(200).json({
      message: 'Board deleted successfully',
    });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting board', error: error.message });
  }
};

// Add Member to Board
export const addMember = async (req, res) => {
  try {
    const { boardId } = req.params;
    const { memberId } = req.body;
    const userId = req.userId;

    if (!mongoose.Types.ObjectId.isValid(boardId)) {
      return res.status(400).json({ message: 'Invalid board ID format' });
    }
    if (!mongoose.Types.ObjectId.isValid(memberId)) {
      return res.status(400).json({ message: 'Invalid member ID format' });
    }

    const board = await Board.findById(boardId);

    if (!board) {
      return res.status(404).json({ message: 'Board not found' });
    }

    const hasInvitePerm = await checkPermission(userId, boardId, 'canInvite');
    if (!hasInvitePerm) {
      return res.status(403).json({ message: 'Only authorized roles can invite members to this workspace' });
    }

    if ((board.createdBy?._id || board.createdBy || '').toString() === memberId) {
      return res.status(400).json({ message: 'Owner cannot be invited again' });
    }

    const memberUser = await User.findById(memberId);
    if (!memberUser) {
      return res.status(404).json({ message: 'User to invite not found' });
    }

    if (memberUser.isBlocked) {
      return res.status(400).json({ message: 'Cannot invite a blocked user' });
    }

    if (board.members.some((member) => member.toString() === memberId)) {
      return res.status(400).json({ message: 'User already a member' });
    }

    const existingInvite = await Notification.findOne({
      recipient: memberId,
      boardId,
      type: 'board_invite',
      status: 'pending',
    });

    if (existingInvite) {
      return res.status(400).json({ message: 'A pending invitation already exists for this user' });
    }

    const notification = new Notification({
      recipient: memberId,
      sender: userId,
      senderName: req.userName || 'Owner',
      type: 'board_invite',
      status: 'pending',
      boardId,
      message: `${req.userName || 'Owner'} invited you to join workspace: "${board.title}"`,
    });

    await notification.save();

    // Log Invite Sent
    await AuditLog.create({
      action: 'Invite Sent',
      actorId: userId,
      actorName: req.userName || 'Owner',
      targetId: board._id,
      targetName: board.title,
      details: `Invitation sent to ${memberUser.name} (${memberUser.email})`,
      ipAddress: req.ip || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || ''
    }).catch(e => {});

    await createActivity({
      boardId,
      userId,
      userName: req.userName || 'Owner',
      type: 'Invitation Sent',
      message: `${req.userName || 'Owner'} invited a new member to join workspace "${board.title}"`,
      meta: { memberId },
    });

    try {
      emitToUser(memberId, 'invitationSent', {
        recipientId: encryptId(memberId),
        notification: encryptUserIds(notification),
      });
    } catch (err) {
      console.error('Realtime board invitation emit error:', err);
    }

    res.status(200).json({
      message: 'Invitation sent successfully',
      notification: encryptUserIds(notification),
    });
  } catch (error) {
    res.status(500).json({ message: 'Error adding member', error: error.message });
  }
};

// Remove Member from Board
export const removeMember = async (req, res) => {
  try {
    const { boardId, memberId } = req.params;
    const userId = req.userId;

    if (!mongoose.Types.ObjectId.isValid(boardId)) {
      return res.status(400).json({ message: 'Invalid board ID format' });
    }
    if (!mongoose.Types.ObjectId.isValid(memberId)) {
      return res.status(400).json({ message: 'Invalid member ID format' });
    }

    const board = await Board.findById(boardId);

    if (!board) {
      return res.status(404).json({ message: 'Board not found' });
    }

    const hasRemovePerm = await checkPermission(userId, boardId, 'canRemoveMember');
    if (!hasRemovePerm) {
      return res.status(403).json({ message: 'Only authorized roles can remove members from this workspace' });
    }

    if ((board.createdBy?._id || board.createdBy || '').toString() === memberId) {
      return res.status(400).json({ message: 'Owner cannot be removed from the board' });
    }

    const removedUser = await User.findById(memberId);
    if (!removedUser || !board.members.some((member) => member.toString() === memberId)) {
      return res.status(404).json({ message: 'Member not found on this board' });
    }

    const removedName = removedUser.name || 'A member';

    board.members = board.members.filter(
      (member) => member.toString() !== memberId
    );

    await board.save();

    // Clean up task assignments and collaborators for the removed member in this board
    await Task.updateMany(
      { boardId, assignedTo: memberId },
      { $unset: { assignedTo: 1 } }
    );
    await Task.updateMany(
      { boardId },
      { $pull: { collaborators: memberId } }
    );

    // Clean up notifications for the removed member in this board
    try {
      const Notification = mongoose.model('Notification');
      if (Notification) {
        await Notification.deleteMany({ boardId, recipient: memberId });
      }
    } catch (e) {
      console.error('Error cleaning up notifications:', e);
    }

    // Notify the evicted member
    try {
      const Notification = mongoose.model('Notification');
      const removeNotif = new Notification({
        recipient: memberId,
        sender: userId,
        senderName: req.userName || 'Owner',
        type: 'member_removed',
        status: 'unread',
        boardId: board._id,
        boardTitle: board.title,
        message: `You were removed from workspace "${board.title}" by the owner`,
      });
      await removeNotif.save();
      emitToUser(memberId, 'invitationSent', {
        recipientId: encryptId(memberId),
        notification: encryptUserIds(removeNotif),
      });
    } catch (e) {
      console.error('Error creating member removed notification:', e);
    }

    await board.populate(['createdBy', 'members']);

    await createActivity({
      boardId,
      userId,
      userName: req.userName || 'Owner',
      type: 'Member Removed',
      message: `${removedName} was removed from workspace by ${req.userName || 'Owner'}`,
    });

    try {
      evictUserFromBoard(boardId, memberId);
      const io = getIo();
      if (io) {
        io.to(`board-${board._id.toString()}`).emit('memberRemoved', {
          boardId: encryptId(board._id),
          memberId: encryptId(memberId),
        });
      }
    } catch (err) {
      console.error('Realtime member eviction error:', err);
    }

    res.status(200).json({
      message: 'Member removed successfully',
      board: encryptUserIds(board),
    });
  } catch (error) {
    res.status(500).json({ message: 'Error removing member', error: error.message });
  }
};

// Search / Browse Workspaces
export const searchWorkspaces = async (req, res) => {
  try {
    const { q, filter } = req.query;
    const userId = req.userId;
    const isPlatformAdmin = req.user?.role === 'ADMIN';

    const query = {};
    if (q && q.trim()) {
      query.title = { $regex: q.trim(), $options: 'i' };
    }

    if (!isPlatformAdmin) {
      if (filter === 'public') {
        query.visibility = 'public';
      } else if (filter === 'private') {
        query.visibility = 'private';
        query.$or = [
          { createdBy: userId },
          { members: userId }
        ];
      } else if (filter === 'joined') {
        query.members = userId;
        query.createdBy = { $ne: userId };
      } else if (filter === 'owned') {
        query.createdBy = userId;
      } else {
        // General discovery: show all public workspaces, and private ones ONLY if user is owner or member
        query.$or = [
          { visibility: 'public' },
          {
            visibility: 'private',
            $or: [
              { createdBy: userId },
              { members: userId }
            ]
          }
        ];
      }
    } else {
      // Admin sees everything, but respect requested filters
      if (filter === 'public') {
        query.visibility = 'public';
      } else if (filter === 'private') {
        query.visibility = 'private';
      } else if (filter === 'joined') {
        query.members = userId;
        query.createdBy = { $ne: userId };
      } else if (filter === 'owned') {
        query.createdBy = userId;
      }
    }

    const boards = await Board.find(query)
      .populate('createdBy', 'name email avatar role')
      .limit(30);

    const safeBoards = boards.map(board => {
      const isCreator = (board.createdBy?._id || board.createdBy || '').toString() === userId;
      const isMember = board.members.some(m => (m?._id || m || '').toString() === userId);
      const isPending = board.requests?.some(r => r.toString() === userId);

      let joinStatus = 'none';
      if (isCreator || isMember) {
        joinStatus = 'member';
      } else if (isPending) {
        joinStatus = 'pending';
      }

      const creatorEnc = encryptUserIds(board.createdBy);
      if (req.user?.role !== 'ADMIN' && board.createdBy && board.createdBy.role === 'ADMIN') {
        if (creatorEnc) creatorEnc.email = undefined;
      }

      return {
        _id: encryptId(board._id),
        title: board.title,
        description: board.description,
        createdBy: creatorEnc,
        membersCount: board.members.length,
        visibility: board.visibility || 'private',
        joinStatus,
      };
    });

    res.status(200).json({
      success: true,
      workspaces: safeBoards
    });
  } catch (error) {
    res.status(500).json({ message: 'Error searching workspaces', error: error.message });
  }
};

// Join Public Workspace
export const joinPublicWorkspace = async (req, res) => {
  try {
    const { boardId } = req.params;
    const userId = req.userId;

    if (!mongoose.Types.ObjectId.isValid(boardId)) {
      return res.status(400).json({ message: 'Invalid board ID format' });
    }

    const board = await Board.findById(boardId);
    if (!board) {
      return res.status(404).json({ message: 'Workspace not found' });
    }

    if (board.visibility !== 'public') {
      return res.status(400).json({ message: 'Cannot join private workspace directly. Request access instead.' });
    }

    const isMember = (board.createdBy?._id || board.createdBy || '').toString() === userId || board.members.some(m => m.toString() === userId);
    if (isMember) {
      return res.status(400).json({ message: 'You are already a member of this workspace' });
    }

    board.members.push(userId);
    await board.save();
    await board.populate(['createdBy', 'members']);

    const user = await User.findById(userId);
    const userName = user ? user.name : 'A user';

    // Notify board owner
    if (board.createdBy && board.createdBy.toString() !== userId) {
      const joinNotif = new Notification({
        recipient: board.createdBy,
        sender: userId,
        senderName: userName,
        type: 'member_joined',
        status: 'unread',
        boardId: board._id,
        boardTitle: board.title,
        message: `${userName} joined your public workspace "${board.title}"`,
      });
      await joinNotif.save();
      try {
        emitToUser(board.createdBy.toString(), 'invitationSent', {
          recipientId: encryptId(board.createdBy),
          notification: encryptUserIds(joinNotif),
        });
      } catch (e) {}
    }

    await createActivity({
      boardId: board._id,
      userId,
      userName,
      type: 'Member Joined',
      message: `${userName} joined the public workspace "${board.title}"`,
    });

    // Notify other workspace users
    try {
      const io = getIo();
      if (io) {
        io.to(`board-${board._id.toString()}`).emit('memberAdded', {
          boardId: encryptId(board._id),
          member: encryptUserIds(user),
          board: encryptUserIds(board),
        });
      }
    } catch (err) {
      console.error('Socket emit failed for public join:', err);
    }

    res.status(200).json({
      message: 'Joined workspace successfully',
      board: encryptUserIds(board)
    });
  } catch (error) {
    res.status(500).json({ message: 'Error joining workspace', error: error.message });
  }
};

// Request Access to Private Workspace
export const requestAccess = async (req, res) => {
  try {
    const { boardId } = req.params;
    const userId = req.userId;

    if (!mongoose.Types.ObjectId.isValid(boardId)) {
      return res.status(400).json({ message: 'Invalid board ID format' });
    }

    const board = await Board.findById(boardId);
    if (!board) {
      return res.status(404).json({ message: 'Workspace not found' });
    }

    if (board.visibility === 'public') {
      return res.status(400).json({ message: 'Workspace is public, join directly' });
    }

    const isMember = (board.createdBy?._id || board.createdBy || '').toString() === userId || board.members.some(m => m.toString() === userId);
    if (isMember) {
      return res.status(400).json({ message: 'You are already a member of this workspace' });
    }

    if (!board.requests) {
      board.requests = [];
    }

    if (board.requests.some(r => r.toString() === userId)) {
      return res.status(400).json({ message: 'Access request is already pending' });
    }

    board.requests.push(userId);
    await board.save();

    const user = await User.findById(userId);
    const userName = user ? user.name : 'A user';

    // Create a notification for the board owner
    const notification = new Notification({
      recipient: board.createdBy,
      sender: userId,
      senderName: userName,
      type: 'board_invite', // Reuse board_invite type or handle in notification responses
      status: 'pending',
      boardId: board._id,
      boardTitle: board.title,
      message: `${userName} requested access to your private workspace: "${board.title}"`,
    });
    await notification.save();

    // Emit live to the workspace owner
    try {
      emitToUser(board.createdBy, 'invitationSent', {
        recipientId: encryptId(board.createdBy),
        notification: encryptUserIds(notification)
      });
    } catch (err) {
      console.error('Realtime emit failed for access request:', err);
    }

    res.status(200).json({
      message: 'Access request sent successfully',
      joinStatus: 'pending'
    });
  } catch (error) {
    res.status(500).json({ message: 'Error requesting access', error: error.message });
  }
};

// Accept Access Request
export const acceptAccessRequest = async (req, res) => {
  try {
    const { boardId, userId } = req.params;
    const currentUserId = req.userId;

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

    if ((board.createdBy?._id || board.createdBy || '').toString() !== currentUserId) {
      return res.status(403).json({ message: 'Only workspace owner can accept requests' });
    }

    if (!board.requests || !board.requests.some(r => r.toString() === userId)) {
      return res.status(404).json({ message: 'Request from this user not found' });
    }

    // Remove from requests, add to members
    board.requests = board.requests.filter(r => r.toString() !== userId);
    if (!board.members.some(m => m.toString() === userId)) {
      board.members.push(userId);
    }
    await board.save();
    await board.populate(['createdBy', 'members']);

    const user = await User.findById(userId);
    const userName = user ? user.name : 'A member';

    await createActivity({
      boardId: board._id,
      userId,
      userName,
      type: 'Invitation Accepted',
      message: `${userName} was added to workspace "${board.title}" via access request approval`,
    });

    // Notify requester of approval
    const notification = new Notification({
      recipient: userId,
      sender: currentUserId,
      senderName: req.userName || 'Owner',
      type: 'board_invite',
      status: 'accepted',
      boardId: board._id,
      boardTitle: board.title,
      message: `Your request to join workspace "${board.title}" was approved!`,
    });
    await notification.save();

    try {
      // Notify target user
      emitToUser(userId, 'memberAdded', {
        boardId: encryptId(board._id),
        member: encryptUserIds(user),
        board: encryptUserIds(board),
        notification: encryptUserIds(notification)
      });
      // Also send notification count update
      emitToUser(userId, 'invitationSent', {
        recipientId: encryptId(userId),
        notification: encryptUserIds(notification)
      });

      // Notify other board members
      const io = getIo();
      if (io) {
        io.to(`board-${board._id.toString()}`).emit('memberAdded', {
          boardId: encryptId(board._id),
          member: encryptUserIds(user),
          board: encryptUserIds(board),
        });
      }
    } catch (err) {
      console.error('Socket emit failed for accept access request:', err);
    }

    res.status(200).json({
      message: 'Access request accepted',
      board: encryptUserIds(board)
    });
  } catch (error) {
    res.status(500).json({ message: 'Error accepting access request', error: error.message });
  }
};

// Reject Access Request
export const rejectAccessRequest = async (req, res) => {
  try {
    const { boardId, userId } = req.params;
    const currentUserId = req.userId;

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

    if ((board.createdBy?._id || board.createdBy || '').toString() !== currentUserId) {
      return res.status(403).json({ message: 'Only workspace owner can reject requests' });
    }

    if (!board.requests || !board.requests.some(r => r.toString() === userId)) {
      return res.status(404).json({ message: 'Request from this user not found' });
    }

    // Remove from requests
    board.requests = board.requests.filter(r => r.toString() !== userId);
    await board.save();

    // Notify requester of rejection
    const notification = new Notification({
      recipient: userId,
      sender: currentUserId,
      senderName: req.userName || 'Owner',
      type: 'board_invite',
      status: 'rejected',
      boardId: board._id,
      boardTitle: board.title,
      message: `Your request to join workspace "${board.title}" was declined.`,
    });
    await notification.save();

    try {
      emitToUser(userId, 'invitationSent', {
        recipientId: encryptId(userId),
        notification: encryptUserIds(notification)
      });
    } catch (err) {
      console.error('Socket emit failed for reject access request:', err);
    }

    res.status(200).json({
      message: 'Access request rejected'
    });
  } catch (error) {
    res.status(500).json({ message: 'Error rejecting access request', error: error.message });
  }
};

// Leave Board / Workspace
export const leaveBoard = async (req, res) => {
  try {
    const { boardId } = req.params;
    const userId = req.userId;

    if (!mongoose.Types.ObjectId.isValid(boardId)) {
      return res.status(400).json({ message: 'Invalid board ID format' });
    }

    const board = await Board.findById(boardId);
    if (!board) {
      return res.status(404).json({ message: 'Workspace not found' });
    }

    const isOwner = (board.createdBy?._id || board.createdBy || '').toString() === userId;
    if (isOwner) {
      return res.status(400).json({ message: 'Owner cannot leave workspace until ownership is transferred.' });
    }

    const isMember = board.members.some((m) => m.toString() === userId);
    if (!isMember) {
      return res.status(400).json({ message: 'You are not a member of this workspace' });
    }

    // Remove user from members array
    board.members = board.members.filter((m) => m.toString() !== userId);
    await board.save();

    // Clean up task assignments and collaborators for the leaving user in this board
    await Task.updateMany(
      { boardId, assignedTo: userId },
      { $unset: { assignedTo: 1, assignedBy: 1 } }
    );
    await Task.updateMany(
      { boardId },
      { $pull: { collaborators: userId } }
    );

    // Clean up notifications for the leaving member in this board
    try {
      await Notification.deleteMany({ boardId, recipient: userId });
    } catch (e) {
      // Ignore
    }

    const userRecord = await User.findById(userId);
    const userName = userRecord ? userRecord.name : 'A member';

    await createActivity({
      boardId,
      userId,
      userName,
      type: 'Member Left',
      message: `${userName} has left the workspace.`,
    });

    try {
      evictUserFromBoard(boardId, userId);
      const io = getIo();
      if (io) {
        io.to(`board-${board._id.toString()}`).emit('memberRemoved', {
          boardId: encryptId(board._id),
          memberId: encryptId(userId),
        });
      }
    } catch (err) {
      // Ignore
    }

    res.status(200).json({
      message: 'Successfully left the workspace',
    });
  } catch (error) {
    res.status(500).json({ message: 'Error leaving workspace', error: error.message });
  }
};
