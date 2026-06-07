import Task from '../model/task.js';
import Board from '../model/board.js';
import User from '../model/userModel.js';
import Activity from '../model/activity.js';
import { encryptUserIds, encryptId } from '../utils/idCrypt.js';
import mongoose from 'mongoose';

export const getBoardAnalytics = async (req, res) => {
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

    const isMember =
      board.createdBy.toString() === userId ||
      board.members.some((member) => member.toString() === userId);

    if (!isMember) {
      return res.status(403).json({ message: 'Unauthorized access' });
    }

    const allTasks = await Task.find({ boardId }).populate('assignedTo', 'name email avatar');
    const totalTasks = allTasks.length;
    const completedTasks = allTasks.filter((task) => task.status === 'Done').length;
    const pendingTasks = allTasks.filter((task) => task.status !== 'Done').length;

    const tasksByPriority = allTasks.reduce((acc, task) => {
      acc[task.priority] = (acc[task.priority] || 0) + 1;
      return acc;
    }, {});

    const tasksByMember = allTasks.reduce((acc, task) => {
      const member = task.assignedTo?.name || 'Unassigned';
      acc[member] = (acc[member] || 0) + 1;
      return acc;
    }, {});

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const completedThisWeek = allTasks.filter(
      (task) => task.status === 'Done' && task.updatedAt >= oneWeekAgo
    ).length;

    const completionRate = totalTasks === 0 ? 0 : Number(((completedTasks / totalTasks) * 100).toFixed(1));
    const boardProductivityScore = totalTasks === 0 ? 0 : Number((completionRate * 0.8 + (completedThisWeek / totalTasks) * 20).toFixed(1));

    // VELOCITY: completed tasks per week
    const startDate = board.createdAt || (allTasks.length > 0 ? allTasks.reduce((min, t) => t.createdAt < min ? t.createdAt : min, allTasks[0].createdAt) : new Date());
    const msDiff = Date.now() - new Date(startDate).getTime();
    const totalWeeks = Math.max(1, Math.ceil(msDiff / (7 * 24 * 60 * 60 * 1000)));
    const velocity = Number((completedTasks / totalWeeks).toFixed(1));

    // CYCLE TIME: average completion duration (updatedAt - createdAt for Done status)
    let totalCycleTimeMs = 0;
    let completedWithTime = 0;
    allTasks.filter((task) => task.status === 'Done').forEach(task => {
      const duration = new Date(task.updatedAt).getTime() - new Date(task.createdAt).getTime();
      if (duration >= 0) {
        totalCycleTimeMs += duration;
        completedWithTime++;
      }
    });
    const cycleTime = completedWithTime === 0 ? 0 : Number((totalCycleTimeMs / (completedWithTime * 24 * 60 * 60 * 1000)).toFixed(1));

    // ACTIVE BACKLOG: remaining incomplete tasks
    const activeBacklog = pendingTasks;

    // BURN DOWN: derive from task progress history (last 7 days incomplete tasks)
    const burnDownData = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      date.setHours(23, 59, 59, 999);

      const remainingAtDay = allTasks.filter(task => {
        const createdBefore = new Date(task.createdAt) <= date;
        const notCompletedYet = task.status !== 'Done' || new Date(task.updatedAt) > date;
        return createdBefore && notCompletedYet;
      }).length;

      const dayLabel = date.toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
      burnDownData.push({
        dayLabel,
        remaining: remainingAtDay,
      });
    }

    const initialRemaining = burnDownData[0]?.remaining || 0;
    const burnDown = burnDownData.map((d, index) => {
      const guideline = Number(Math.max(0, initialRemaining - (index * (initialRemaining / 6))).toFixed(1));
      return {
        ...d,
        guideline,
      };
    });

    // WORKLOAD DISTRIBUTION: derive from assigned tasks by priority
    const assignedTasks = allTasks.filter(task => task.assignedTo);
    const totalAssigned = assignedTasks.length;
    const highPriorityCount = assignedTasks.filter(t => t.priority === 'High').length;
    const mediumPriorityCount = assignedTasks.filter(t => t.priority === 'Medium').length;
    const lowPriorityCount = assignedTasks.filter(t => t.priority === 'Low').length;

    const workloadDistribution = {
      high: {
        count: highPriorityCount,
        percentage: totalAssigned === 0 ? 0 : Number(((highPriorityCount / totalAssigned) * 100).toFixed(1)),
      },
      medium: {
        count: mediumPriorityCount,
        percentage: totalAssigned === 0 ? 0 : Number(((mediumPriorityCount / totalAssigned) * 100).toFixed(1)),
      },
      low: {
        count: lowPriorityCount,
        percentage: totalAssigned === 0 ? 0 : Number(((lowPriorityCount / totalAssigned) * 100).toFixed(1)),
      },
      totalAssigned,
    };

    // MEMBER ANALYTICS
    const memberIds = [board.createdBy.toString(), ...board.members.map(m => m.toString())];
    let users = await User.find({ _id: { $in: memberIds } }).select('name email role avatar presenceStatus lastActive');
    if (req.user?.role !== 'ADMIN') {
      users = users.filter((u) => u.role !== 'ADMIN');
    }

    const memberAnalytics = users.map(user => {
      const uId = user._id.toString();
      const userTasks = allTasks.filter(t => t.assignedTo?._id.toString() === uId);
      const userAssignedCount = userTasks.length;
      const userCompletedCount = userTasks.filter(t => t.status === 'Done').length;
      const userCompletionRate = userAssignedCount === 0 ? 0 : Number(((userCompletedCount / userAssignedCount) * 100).toFixed(1));

      // Calculate member cycle time
      let userCycleTimeMs = 0;
      let userCompletedWithTime = 0;
      userTasks.filter(t => t.status === 'Done').forEach(task => {
        const duration = new Date(task.updatedAt).getTime() - new Date(task.createdAt).getTime();
        if (duration >= 0) {
          userCycleTimeMs += duration;
          userCompletedWithTime++;
        }
      });
      const avgCompletionTime = userCompletedWithTime === 0 ? 0 : Number((userCycleTimeMs / (userCompletedWithTime * 24 * 60 * 60 * 1000)).toFixed(1));

      const isWorking = userTasks.some(t => t.status === 'In Progress');

      return {
        _id: encryptId(user._id),
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        presenceStatus: user.presenceStatus || 'Offline',
        lastActive: user.lastActive,
        tasksAssigned: userAssignedCount,
        tasksCompleted: userCompletedCount,
        completionRate: userCompletionRate,
        averageCompletionTime: avgCompletionTime,
        status: isWorking ? 'Working' : 'Idle',
        currentTask: isWorking ? userTasks.find(t => t.status === 'In Progress').title : null,
      };
    });

    // OWNER DASHBOARD DATA
    const recentActivities = await Activity.find({ boardId })
      .sort({ createdAt: -1 })
      .limit(10);

    const deadlines = allTasks
      .filter(t => t.dueDate && t.status !== 'Done')
      .map(t => ({
        _id: encryptId(t._id),
        title: t.title,
        status: t.status,
        progress: t.progress || 0,
        dueDate: t.dueDate,
        assignee: t.assignedTo ? t.assignedTo.name : 'Unassigned',
      }))
      .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
      .slice(0, 10);

    res.status(200).json({
      message: 'Analytics fetched successfully',
      analytics: {
        totalTasks,
        completedTasks,
        pendingTasks,
        tasksByPriority,
        tasksByMember,
        completedThisWeek,
        completionRate,
        boardProductivityScore,
        velocity,
        cycleTime,
        activeBacklog,
        burnDown,
        workloadDistribution,
        memberAnalytics: memberAnalytics,
        ownerDashboard: {
          recentActivities: recentActivities,
          deadlines: deadlines,
        }
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching analytics', error: error.message });
  }
};
