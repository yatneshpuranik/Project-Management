import Board from '../model/board.js';
import BoardChatMessage from '../model/boardChatMessage.js';
import { getIo } from '../socket/socket.js';
import { encryptUserIds, encryptId } from '../utils/idCrypt.js';
import mongoose from 'mongoose';

const isBoardMember = (board, userId) =>
  board && (board.createdBy.toString() === userId || board.members.some((member) => member.toString() === userId));

export const getBoardChatMessages = async (req, res) => {
  try {
    const { boardId } = req.params;
    const channel = req.query.channel || 'General';
    const userId = req.userId;

    if (!mongoose.Types.ObjectId.isValid(boardId)) {
      return res.status(400).json({ message: 'Invalid board ID format' });
    }

    const board = await Board.findById(boardId);
    if (!board) {
      return res.status(404).json({ message: 'Board not found' });
    }
    if (!isBoardMember(board, userId)) {
      return res.status(403).json({ message: 'Unauthorized access' });
    }

    const messages = await BoardChatMessage.find({ boardId, channel })
      .sort({ createdAt: 1 });

    const updates = [];
    messages.forEach((message) => {
      if (!message.readBy.includes(req.userName)) {
        message.readBy.push(req.userName);
        updates.push(message.save());
      }
    });
    await Promise.all(updates);

    res.status(200).json({
      message: 'Chat messages fetched successfully',
      messages: messages.map((message) => encryptUserIds(message)),
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching workspace chat messages', error: error.message });
  }
};

export const addBoardChatMessage = async (req, res) => {
  try {
    const { boardId } = req.params;
    const { channel, content } = req.body;
    const userId = req.userId;

    if (!mongoose.Types.ObjectId.isValid(boardId)) {
      return res.status(400).json({ message: 'Invalid board ID format' });
    }

    if (!content || !content.trim()) {
      return res.status(400).json({ message: 'Message content is required' });
    }

    const board = await Board.findById(boardId);
    if (!board) {
      return res.status(404).json({ message: 'Board not found' });
    }
    if (!isBoardMember(board, userId)) {
      return res.status(403).json({ message: 'Unauthorized access' });
    }

    const message = await BoardChatMessage.create({
      boardId,
      channel: channel || 'General',
      senderId: userId,
      senderName: req.userName || 'Unknown',
      content: content.trim(),
      readBy: [req.userName || 'Unknown'],
    });

    const io = getIo();
    if (io) {
      io.to(`board-${boardId}`).emit('workspaceMessageSent', {
        boardId: encryptId(boardId),
        message: encryptUserIds(message),
      });
    }

    res.status(201).json({
      message: 'Chat message created successfully',
      messageData: encryptUserIds(message),
    });
  } catch (error) {
    res.status(500).json({ message: 'Error sending workspace chat message', error: error.message });
  }
};

export const updateBoardChatMessage = async (req, res) => {
  try {
    const { boardId, messageId } = req.params;
    const { content } = req.body;
    const userId = req.userId;

    if (!mongoose.Types.ObjectId.isValid(boardId)) {
      return res.status(400).json({ message: 'Invalid board ID format' });
    }
    if (!mongoose.Types.ObjectId.isValid(messageId)) {
      return res.status(400).json({ message: 'Invalid message ID format' });
    }

    if (!content || !content.trim()) {
      return res.status(400).json({ message: 'Message content is required' });
    }

    const board = await Board.findById(boardId);
    if (!board) {
      return res.status(404).json({ message: 'Board not found' });
    }
    if (!isBoardMember(board, userId)) {
      return res.status(403).json({ message: 'Unauthorized access' });
    }

    const message = await BoardChatMessage.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: 'Chat message not found' });
    }
    if (message.senderId.toString() !== userId) {
      return res.status(403).json({ message: 'You can only edit your own messages' });
    }

    message.content = content.trim();
    message.editedAt = new Date();
    await message.save();

    const io = getIo();
    if (io) {
      io.to(`board-${boardId}`).emit('workspaceMessageEdited', {
        boardId: encryptId(boardId),
        message: encryptUserIds(message),
      });
    }

    res.status(200).json({
      message: 'Chat message updated successfully',
      messageData: encryptUserIds(message),
    });
  } catch (error) {
    res.status(500).json({ message: 'Error editing workspace chat message', error: error.message });
  }
};

export const deleteBoardChatMessage = async (req, res) => {
  try {
    const { boardId, messageId } = req.params;
    const userId = req.userId;

    if (!mongoose.Types.ObjectId.isValid(boardId)) {
      return res.status(400).json({ message: 'Invalid board ID format' });
    }
    if (!mongoose.Types.ObjectId.isValid(messageId)) {
      return res.status(400).json({ message: 'Invalid message ID format' });
    }

    const board = await Board.findById(boardId);
    if (!board) {
      return res.status(404).json({ message: 'Board not found' });
    }
    if (!isBoardMember(board, userId)) {
      return res.status(403).json({ message: 'Unauthorized access' });
    }

    const message = await BoardChatMessage.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: 'Chat message not found' });
    }
    if (message.senderId.toString() !== userId) {
      return res.status(403).json({ message: 'You can only delete your own messages' });
    }

    await message.deleteOne();

    const io = getIo();
    if (io) {
      io.to(`board-${boardId}`).emit('workspaceMessageDeleted', {
        boardId: encryptId(boardId),
        messageId: encryptId(messageId),
      });
    }

    res.status(200).json({
      message: 'Chat message deleted successfully',
    });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting workspace chat message', error: error.message });
  }
};

export const markChatAsRead = async (req, res) => {
  try {
    const { boardId } = req.params;
    const { channel } = req.body;
    const userId = req.userId;
    const userName = req.userName || 'Unknown';

    if (!mongoose.Types.ObjectId.isValid(boardId)) {
      return res.status(400).json({ message: 'Invalid board ID format' });
    }

    const board = await Board.findById(boardId);
    if (!board) {
      return res.status(404).json({ message: 'Board not found' });
    }
    if (!isBoardMember(board, userId)) {
      return res.status(403).json({ message: 'Unauthorized access' });
    }

    await BoardChatMessage.updateMany(
      { boardId, channel: channel || 'General', readBy: { $ne: userName } },
      { $addToSet: { readBy: userName } }
    );

    const io = getIo();
    if (io) {
      io.to(`board-chat-${boardId}`).emit('workspaceMessagesRead', {
        boardId: encryptId(boardId),
        userName,
      });
    }

    res.status(200).json({ message: 'Messages marked as read' });
  } catch (error) {
    res.status(500).json({ message: 'Error marking chat as read', error: error.message });
  }
};
