import Task from '../model/task.js';
import Board from '../model/board.js';

export const getBoardAnalytics = async (req, res) => {
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

    const allTasks = await Task.find({ boardId }).populate('assignedTo', 'name');
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
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching analytics', error: error.message });
  }
};
