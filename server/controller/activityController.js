import Activity from '../model/activity.js';
import Board from '../model/board.js';
import Task from '../model/task.js';
import { getIo } from '../socket/socket.js';
import mongoose from 'mongoose';

const isBoardMember = (board, userId) =>
  board && (board.createdBy.toString() === userId || board.members.some((member) => member.toString() === userId));

export const getActivitiesByBoard = async (req, res) => {
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

    if (!isBoardMember(board, userId)) {
      return res.status(403).json({ message: 'Unauthorized access' });
    }

    const activities = await Activity.find({ boardId })
      .sort({ createdAt: -1 })
      .limit(50);

    res.status(200).json({ message: 'Activities fetched successfully', activities });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching activities', error: error.message });
  }
};

export const getActivitiesByTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    const userId = req.userId;

    if (!mongoose.Types.ObjectId.isValid(taskId)) {
      return res.status(400).json({ message: 'Invalid task ID format' });
    }

    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const board = await Board.findById(task.boardId);
    if (!isBoardMember(board, userId)) {
      return res.status(403).json({ message: 'Unauthorized access' });
    }

    const activities = await Activity.find({ taskId })
      .sort({ createdAt: -1 })
      .limit(50);

    res.status(200).json({ message: 'Task activities fetched successfully', activities });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching activities', error: error.message });
  }
};

export const createActivity = async ({ boardId, taskId, userId, userName, type, message, meta }) => {
  const activity = await Activity.create({
    boardId,
    taskId,
    userId,
    userName,
    type,
    message,
    meta,
  });

  try {
    const io = getIo();
    if (io) {
      const room = `board-${boardId}`;
      io.to(room).emit('activity-created', { activity });
    }
  } catch (err) {
    console.error('Error broadcasting activity:', err);
  }

  return activity;
};
