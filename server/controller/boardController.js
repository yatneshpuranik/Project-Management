import mongoose from 'mongoose';
import Board from '../model/board.js';
import Task from '../model/task.js';
import { createActivity } from './activityController.js';
import User from '../model/userModel.js';
import { getIo, evictUserFromBoard, emitToUser } from '../socket/socket.js';
import { encryptUserIds, encryptId } from '../utils/idCrypt.js';
import Notification from '../model/notification.js';

// Create Board
export const createBoard = async (req, res) => {
  try {
    const { title, description, visibility, channels } = req.body;
    const userId = req.userId;

    const user = await User.findById(userId);
    if (!user || (user.role !== 'OWNER' && user.role !== 'ADMIN')) {
      return res.status(403).json({ message: 'Forbidden: Only users with role OWNER or ADMIN can create workspaces' });
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

    res.status(201).json({
      message: 'Board created successfully',
      board: encryptUserIds(board),
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
      .populate('createdBy', 'name email avatar')
      .populate('members', 'name email avatar')
      .sort({ createdAt: -1 });

    res.status(200).json({
      message: 'Boards fetched successfully',
      boards: boards.map(b => encryptUserIds(b)),
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
      .populate('createdBy', 'name email avatar')
      .populate('members', 'name email avatar');

    if (!board) {
      return res.status(404).json({ message: 'Board not found' });
    }

    // Check if user is member
    const isMember =
      board.createdBy._id.toString() === userId ||
      board.members.some((member) => member._id.toString() === userId);

    if (!isMember) {
      return res.status(403).json({ message: 'Unauthorized access' });
    }

    res.status(200).json({
      message: 'Board fetched successfully',
      board: encryptUserIds(board),
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching board', error: error.message });
  }
};

// Update Board
export const updateBoard = async (req, res) => {
  try {
    const { boardId } = req.params;
    const { title, description, visibility, channels } = req.body;
    const userId = req.userId;

    if (!mongoose.Types.ObjectId.isValid(boardId)) {
      return res.status(400).json({ message: 'Invalid board ID format' });
    }

    const board = await Board.findById(boardId);

    if (!board) {
      return res.status(404).json({ message: 'Board not found' });
    }

    // Only creator or platform admin can edit board details
    const isCreator = board.createdBy.toString() === userId;
    const isAdmin = req.user?.role === 'ADMIN';
    if (!isCreator && !isAdmin) {
      return res.status(403).json({ message: 'Only board creator or admin can edit' });
    }

    if (title) board.title = title;
    if (description !== undefined) board.description = description;
    if (visibility) board.visibility = visibility;
    if (channels) board.channels = channels;

    await board.save();
    await board.populate(['createdBy', 'members']);

    res.status(200).json({
      message: 'Board updated successfully',
      board: encryptUserIds(board),
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

    if (board.createdBy.toString() !== userId) {
      return res.status(403).json({ message: 'Only board creator can delete' });
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

    if (board.createdBy.toString() !== userId) {
      return res.status(403).json({ message: 'Only board creator can add members' });
    }

    if (board.createdBy.toString() === memberId) {
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

    if (board.createdBy.toString() !== userId) {
      return res.status(403).json({ message: 'Only board creator can remove members' });
    }

    if (board.createdBy.toString() === memberId) {
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
    const { q } = req.query;
    const userId = req.userId;

    const query = {};
    if (q && q.trim()) {
      query.title = { $regex: q.trim(), $options: 'i' };
    }

    const boards = await Board.find(query)
      .populate('createdBy', 'name email avatar')
      .limit(30);

    const safeBoards = boards.map(board => {
      const isCreator = board.createdBy._id.toString() === userId;
      const isMember = board.members.some(m => m.toString() === userId);
      const isPending = board.requests?.some(r => r.toString() === userId);

      let joinStatus = 'none';
      if (isCreator || isMember) {
        joinStatus = 'member';
      } else if (isPending) {
        joinStatus = 'pending';
      }

      return {
        _id: encryptId(board._id),
        title: board.title,
        description: board.description,
        createdBy: encryptUserIds(board.createdBy),
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

    const board = await Board.findById(boardId);
    if (!board) {
      return res.status(404).json({ message: 'Workspace not found' });
    }

    if (board.visibility !== 'public') {
      return res.status(400).json({ message: 'Cannot join private workspace directly. Request access instead.' });
    }

    const isMember = board.createdBy.toString() === userId || board.members.some(m => m.toString() === userId);
    if (isMember) {
      return res.status(400).json({ message: 'You are already a member of this workspace' });
    }

    board.members.push(userId);
    await board.save();
    await board.populate(['createdBy', 'members']);

    const user = await User.findById(userId);
    const userName = user ? user.name : 'A user';

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

    const board = await Board.findById(boardId);
    if (!board) {
      return res.status(404).json({ message: 'Workspace not found' });
    }

    if (board.visibility === 'public') {
      return res.status(400).json({ message: 'Workspace is public, join directly' });
    }

    const isMember = board.createdBy.toString() === userId || board.members.some(m => m.toString() === userId);
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

    const board = await Board.findById(boardId);
    if (!board) {
      return res.status(404).json({ message: 'Workspace not found' });
    }

    if (board.createdBy.toString() !== currentUserId) {
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

    const board = await Board.findById(boardId);
    if (!board) {
      return res.status(404).json({ message: 'Workspace not found' });
    }

    if (board.createdBy.toString() !== currentUserId) {
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
