import Activity from '../model/activity.js';
import Board from '../model/board.js';
import { getIo } from '../socket/socket.js';

export const getActivitiesByBoard = async (req, res) => {
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

    const activities = await Activity.find({ boardId })
      .sort({ createdAt: -1 })
      .limit(50);

    res.status(200).json({ message: 'Activities fetched successfully', activities });
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
