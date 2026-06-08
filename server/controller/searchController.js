import User from '../model/userModel.js';
import Board from '../model/board.js';
import Task from '../model/task.js';
import { encryptUserIds, encryptId } from '../utils/idCrypt.js';

export const globalSearch = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || !q.trim()) {
      return res.status(200).json({
        success: true,
        users: [],
        workspaces: [],
        tasks: [],
        channels: []
      });
    }

    const queryStr = q.trim();
    const queryRegex = { $regex: queryStr, $options: 'i' };
    const requesterId = req.userId;
    let isAdmin = req.user?.role === 'ADMIN';
    if (!isAdmin && requesterId) {
      const user = await User.findById(requesterId);
      isAdmin = user?.role === 'ADMIN';
    }

    // 1. Search Users
    const userCond = {
      $or: [
        { name: queryRegex },
        { email: queryRegex }
      ],
      isBlocked: { $ne: true }
    };
    if (!isAdmin) {
      userCond.role = { $ne: 'ADMIN' };
    }
    const users = await User.find(userCond).select('name email avatar role').limit(10);

    // 2. Search Workspaces
    const boardCond = {
      title: queryRegex
    };
    if (!isAdmin) {
      boardCond.$or = [
        { createdBy: requesterId },
        { members: requesterId },
        { visibility: 'public' }
      ];
    }
    const boards = await Board.find(boardCond).populate('createdBy', 'name').limit(10);

    // 3. Search Tasks
    const taskCond = {
      title: queryRegex,
      isDeleted: { $ne: true }
    };
    if (!isAdmin) {
      // Find workspaces requester has access to
      const allowedBoards = await Board.find({
        $or: [
          { createdBy: requesterId },
          { members: requesterId },
          { visibility: 'public' }
        ]
      }).select('_id');
      const allowedBoardIds = allowedBoards.map(b => b._id);
      taskCond.boardId = { $in: allowedBoardIds };
    }
    const tasks = await Task.find(taskCond).populate('boardId', 'title').limit(10);

    // 4. Search Channels
    const channelCond = {
      channels: queryRegex
    };
    if (!isAdmin) {
      channelCond.$or = [
        { createdBy: requesterId },
        { members: requesterId },
        { visibility: 'public' }
      ];
    }
    const channelBoards = await Board.find(channelCond).select('title channels').limit(10);
    const matchedChannels = [];
    channelBoards.forEach(board => {
      board.channels.forEach(ch => {
        if (ch.toLowerCase().includes(queryStr.toLowerCase())) {
          matchedChannels.push({
            channelName: ch,
            boardId: board._id,
            workspaceTitle: board.title
          });
        }
      });
    });

    res.status(200).json({
      success: true,
      users: users.map(u => encryptUserIds(u)),
      workspaces: boards.map(w => encryptUserIds(w)),
      tasks: tasks.map(t => encryptUserIds(t)),
      channels: matchedChannels.map(ch => ({
        channelName: ch.channelName,
        boardId: encryptId(ch.boardId.toString()),
        workspaceTitle: ch.workspaceTitle
      }))
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Global search failed', error: error.message });
  }
};
