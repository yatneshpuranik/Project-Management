import User from '../model/userModel.js';
import Board from '../model/board.js';
import Task from '../model/task.js';
import { encryptUserIds, encryptId } from '../utils/idCrypt.js';

// Middleware to ensure user is admin
export const verifyAdmin = (req, res, next) => {
  if (req.user?.role !== 'ADMIN' && req.user?.email !== 'yatnesh@admin.com') {
    return res.status(403).json({ message: 'Forbidden: Admin access required' });
  }
  next();
};

// Get Global Platform Stats
export const getGlobalStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalWorkspaces = await Board.countDocuments();
    const totalTasks = await Task.countDocuments();
    
    // Active users: status Online/Away/Busy
    const activeUsers = await User.countDocuments({
      presenceStatus: { $in: ['Online', 'Away', 'Busy'] }
    });
    
    const blockedUsers = await User.countDocuments({ isBlocked: true });

    // Platform growth (registrations in the last 7 days)
    const growthData = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      date.setHours(0, 0, 0, 0);
      
      const nextDay = new Date(date);
      nextDay.setDate(date.getDate() + 1);

      const count = await User.countDocuments({
        createdAt: { $gte: date, $lt: nextDay }
      });

      const dayLabel = date.toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
      growthData.push({ dayLabel, count });
    }

    res.status(200).json({
      success: true,
      stats: {
        totalUsers,
        totalWorkspaces,
        totalTasks,
        activeUsers,
        blockedUsers,
        growth: growthData
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching global stats', error: error.message });
  }
};

// Get All Users
export const getUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      users: users.map(u => encryptUserIds(u))
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching users', error: error.message });
  }
};

// Delete User
export const deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.email === 'yatnesh@admin.com') {
      return res.status(400).json({ message: 'Cannot delete primary admin account' });
    }

    // Remove user from board memberships
    await Board.updateMany(
      { members: userId },
      { $pull: { members: userId } }
    );

    // Unassign tasks
    await Task.updateMany(
      { assignedTo: userId },
      { $unset: { assignedTo: 1, assignedBy: 1 } }
    );

    // Remove from task collaborators
    await Task.updateMany(
      { collaborators: userId },
      { $pull: { collaborators: userId } }
    );

    await User.findByIdAndDelete(userId);

    res.status(200).json({ success: true, message: 'User deleted permanently' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting user', error: error.message });
  }
};

// Get All Workspaces
export const getWorkspaces = async (req, res) => {
  try {
    const boards = await Board.find()
      .populate('createdBy', 'name email avatar')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      workspaces: boards.map(b => encryptUserIds(b))
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching workspaces', error: error.message });
  }
};

// Delete Workspace
export const deleteWorkspace = async (req, res) => {
  try {
    const { boardId } = req.params;
    const board = await Board.findById(boardId);
    if (!board) {
      return res.status(404).json({ message: 'Workspace not found' });
    }

    // Delete tasks
    await Task.deleteMany({ boardId });

    // Delete board
    await Board.findByIdAndDelete(boardId);

    res.status(200).json({ success: true, message: 'Workspace deleted permanently' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting workspace', error: error.message });
  }
};
