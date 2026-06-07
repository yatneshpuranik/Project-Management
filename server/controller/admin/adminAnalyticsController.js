import User from '../../model/userModel.js';
import Board from '../../model/board.js';
import Task from '../../model/task.js';
import mongoose from 'mongoose';

// Get platform wide charts and detailed analytics
export const getPlatformAnalytics = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalAdmins = await User.countDocuments({ role: 'ADMIN' });
    const totalPlatformUsers = await User.countDocuments({ role: 'USER' });
    const activeUsers = await User.countDocuments({
      presenceStatus: { $in: ['Online', 'Away', 'Busy'] }
    });
    const blockedUsers = await User.countDocuments({ isBlocked: true });

    const totalWorkspaces = await Board.countDocuments();
    const archivedWorkspaces = await Board.countDocuments({ isArchived: true });
    const activeWorkspaces = await Board.countDocuments({ isArchived: { $ne: true } });

    const totalTasks = await Task.countDocuments();
    const completedTasks = await Task.countDocuments({ status: 'Done' });
    const pendingTasks = await Task.countDocuments({ status: { $ne: 'Done' } });

    // Task status breakdown
    const taskBreakdown = {
      todo: await Task.countDocuments({ status: 'Todo' }),
      inProgress: await Task.countDocuments({ status: 'In Progress' }),
      review: await Task.countDocuments({ status: 'Review' }),
      done: completedTasks
    };

    // Trends (past 7 days)
    const registrationTrend = [];
    const workspaceTrend = [];
    const taskCompletionTrend = [];
    
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const nextDay = new Date(date);
      nextDay.setDate(date.getDate() + 1);

      const dayLabel = date.toLocaleDateString('en-US', { month: 'short', day: '2-digit' });

      // User signups
      const signupCount = await User.countDocuments({
        createdAt: { $gte: date, $lt: nextDay }
      });
      registrationTrend.push({ dayLabel, count: signupCount });

      // Workspace creations
      const boardCount = await Board.countDocuments({
        createdAt: { $gte: date, $lt: nextDay }
      });
      workspaceTrend.push({ dayLabel, count: boardCount });

      // Task completions
      const completionCount = await Task.countDocuments({
        status: 'Done',
        updatedAt: { $gte: date, $lt: nextDay }
      });
      taskCompletionTrend.push({ dayLabel, count: completionCount });
    }

    res.status(200).json({
      success: true,
      analytics: {
        users: {
          total: totalUsers,
          admins: totalAdmins,
          platformUsers: totalPlatformUsers,
          active: activeUsers,
          blocked: blockedUsers,
          trend: registrationTrend
        },
        workspaces: {
          total: totalWorkspaces,
          active: activeWorkspaces,
          archived: archivedWorkspaces,
          trend: workspaceTrend
        },
        tasks: {
          total: totalTasks,
          completed: completedTasks,
          pending: pendingTasks,
          breakdown: taskBreakdown,
          trend: taskCompletionTrend
        }
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching platform analytics', error: error.message });
  }
};
