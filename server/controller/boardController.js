import mongoose from 'mongoose';
import Board from '../model/board.js';
import Task from '../model/task.js';
import { createActivity } from './activityController.js';
import User from '../model/userModel.js';
import { getIo, evictUserFromBoard } from '../socket/socket.js';
import { encryptUserIds, encryptId } from '../utils/idCrypt.js';
import Notification from '../model/notification.js';

// Create Board
export const createBoard = async (req, res) => {
  try {
    const { title, description } = req.body;
    const userId = req.userId;

    if (!title) {
      return res.status(400).json({ message: 'Title is required' });
    }

    const board = new Board({
      title,
      description,
      createdBy: userId,
      members: [userId],
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
    const { title, description } = req.body;
    const userId = req.userId;

    if (!mongoose.Types.ObjectId.isValid(boardId)) {
      return res.status(400).json({ message: 'Invalid board ID format' });
    }

    const board = await Board.findById(boardId);

    if (!board) {
      return res.status(404).json({ message: 'Board not found' });
    }

    // Only creator can edit board details
    if (board.createdBy.toString() !== userId) {
      return res.status(403).json({ message: 'Only board creator can edit' });
    }

    if (title) board.title = title;
    if (description !== undefined) board.description = description;

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
      const io = getIo();
      if (io) {
        io.emit('invitationSent', {
          recipientId: encryptId(memberId),
          notification: encryptUserIds(notification),
        });
      }
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
