import User from '../model/userModel.js';
import Board from '../model/board.js';
import Task from '../model/task.js';
import AuditLog from '../model/auditLog.js';
import Activity from '../model/activity.js';
import Notification from '../model/notification.js';
import { encryptUserIds, encryptId } from '../utils/idCrypt.js';
import mongoose from 'mongoose';
import { getIo, emitToUser } from '../socket/socket.js';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';

// Helper to log admin actions
export const logAdminAction = async (req, action, targetId, targetName, details) => {
  try {
    const actorId = req.userId;
    const actorName = req.userName || 'Admin';
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '';
    const log = new AuditLog({
      action,
      actorId,
      actorName,
      targetId: mongoose.Types.ObjectId.isValid(targetId) ? targetId : undefined,
      targetName,
      details,
      ipAddress
    });
    await log.save();
  } catch (err) {
    console.error('Failed to log admin action:', err);
  }
};

// Middleware to ensure user is admin
export const verifyAdmin = (req, res, next) => {
  if (req.user?.role !== 'ADMIN' && req.user?.role !== 'SUPER_ADMIN' && req.user?.email !== 'yatnesh@admin.com') {
    return res.status(403).json({ message: 'Forbidden: Admin access required' });
  }
  next();
};

// Middleware to ensure user is SUPER_ADMIN
export const verifySuperAdmin = (req, res, next) => {
  if (req.user?.role !== 'SUPER_ADMIN' && req.user?.email !== 'yatnesh@admin.com') {
    return res.status(403).json({ message: 'Forbidden: Super Admin access required' });
  }
  next();
};

// Get Global Stats
export const getGlobalStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalWorkspaces = await Board.countDocuments();
    const totalTasks = await Task.countDocuments();
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
    const { search } = req.query;
    let query = {};
    if (search) {
      query = {
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } }
        ]
      };
    }
    const users = await User.find(query).select('-password').sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      users: users.map(u => encryptUserIds(u))
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching users', error: error.message });
  }
};

// Get User Details
export const getUserDetails = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Invalid user ID format' });
    }

    const user = await User.findById(userId).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Workspaces
    const workspaces = await Board.find({
      $or: [{ createdBy: userId }, { members: userId }]
    }).populate('createdBy', 'name email');

    // Tasks
    const tasks = await Task.find({ assignedTo: userId }).populate('boardId', 'title');

    // Recent activities
    const activities = await Activity.find({ userId }).sort({ createdAt: -1 }).limit(20);

    res.status(200).json({
      success: true,
      user: encryptUserIds(user),
      workspaces: workspaces.map(w => encryptUserIds(w)),
      tasks: tasks.map(t => encryptUserIds(t)),
      activities: activities.map(a => encryptUserIds(a))
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching user details', error: error.message });
  }
};

// Update User Role
export const updateUserRole = async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Invalid user ID format' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Protect SUPER_ADMIN
    if (user.role === 'SUPER_ADMIN' || user.email === 'yatnesh@admin.com') {
      return res.status(400).json({ message: 'Cannot demote or change the role of the primary Super Admin' });
    }

    // Enforce role modification authorization: only SUPER_ADMIN can create/demote ADMIN roles
    if (role === 'ADMIN' || user.role === 'ADMIN') {
      if (req.user?.role !== 'SUPER_ADMIN' && req.user?.email !== 'yatnesh@admin.com') {
        return res.status(403).json({ message: 'Only Super Admin can manage other Admin accounts' });
      }
    }

    const oldRole = user.role;
    user.role = role;
    await user.save();

    await logAdminAction(req, 'Role Changed', user._id, user.name, `Role changed from ${oldRole} to ${role}`);

    // Create notification
    const notif = new Notification({
      recipient: user._id,
      sender: req.userId,
      senderName: req.userName || 'Admin',
      type: 'role_change',
      status: 'unread',
      message: `Your system role has been changed from ${oldRole} to ${role} by the administrator.`,
    });
    await notif.save();
    try {
      emitToUser(user._id, 'invitationSent', {
        recipientId: encryptId(user._id),
        notification: encryptUserIds(notif)
      });
    } catch (e) {}

    res.status(200).json({ success: true, message: `User role updated successfully to ${role}`, user: encryptUserIds(user) });
  } catch (error) {
    res.status(500).json({ message: 'Error updating user role', error: error.message });
  }
};

// Toggle User Block/Suspend
export const toggleUserBlock = async (req, res) => {
  try {
    const { userId } = req.params;
    const { isBlocked, reason } = req.body;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Invalid user ID format' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Protect SUPER_ADMIN
    if (user.role === 'SUPER_ADMIN' || user.email === 'yatnesh@admin.com') {
      return res.status(400).json({ message: 'Cannot block the primary Super Admin account' });
    }

    user.isBlocked = isBlocked;
    user.reason = isBlocked ? (reason || 'Blocked by administrator') : undefined;
    user.blockedAt = isBlocked ? new Date() : undefined;
    await user.save();

    const actionName = isBlocked ? 'User Blocked' : 'User Unblocked';
    await logAdminAction(req, actionName, user._id, user.name, user.reason || '');

    // Force disconnect if blocking
    if (isBlocked) {
      try {
        emitToUser(user._id, 'force-logout', { message: 'Your account has been blocked by the admin.' });
      } catch (e) {}
    }

    res.status(200).json({ success: true, message: `User block status set to ${isBlocked}`, user: encryptUserIds(user) });
  } catch (error) {
    res.status(500).json({ message: 'Error toggling user block status', error: error.message });
  }
};

// Force Logout User
export const forceLogoutUser = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Invalid user ID format' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Protect SUPER_ADMIN
    if (user.role === 'SUPER_ADMIN' || user.email === 'yatnesh@admin.com') {
      if (req.user?.email !== 'yatnesh@admin.com') {
        return res.status(400).json({ message: 'Cannot force logout the primary Super Admin' });
      }
    }

    user.presenceStatus = 'Offline';
    await user.save();

    await logAdminAction(req, 'Force Logout', user._id, user.name, 'Forcefully disconnected user');

    try {
      emitToUser(user._id, 'force-logout', { message: 'You have been logged out by the administrator.' });
    } catch (e) {}

    res.status(200).json({ success: true, message: 'User forced to logout successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error forcing logout', error: error.message });
  }
};

// Reset User Access (Password Reset)
export const resetUserAccess = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Invalid user ID format' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Protect SUPER_ADMIN
    if (user.role === 'SUPER_ADMIN' || user.email === 'yatnesh@admin.com') {
      return res.status(400).json({ message: 'Cannot reset access for the primary Super Admin' });
    }

    const tempPassword = 'UserReset123!';
    const hashedPassword = await bcrypt.hash(tempPassword, 10);
    user.password = hashedPassword;
    await user.save();

    await logAdminAction(req, 'Reset Access', user._id, user.name, 'Password reset to temporary password');

    res.status(200).json({
      success: true,
      message: 'User access has been reset successfully. Temporary password is "UserReset123!"',
      tempPassword
    });
  } catch (error) {
    res.status(500).json({ message: 'Error resetting access', error: error.message });
  }
};

// Delete User
export const deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Invalid user ID format' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Protect SUPER_ADMIN
    if (user.role === 'SUPER_ADMIN' || user.email === 'yatnesh@admin.com') {
      return res.status(400).json({ message: 'Cannot delete the primary Super Admin account' });
    }

    await logAdminAction(req, 'User Deleted', user._id, user.name, `User ${user.email} deleted permanently`);

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
    const { search } = req.query;
    let query = {};
    if (search) {
      query = { title: { $regex: search, $options: 'i' } };
    }
    const boards = await Board.find(query)
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

// Get Workspace Details
export const getWorkspaceDetails = async (req, res) => {
  try {
    const { boardId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(boardId)) {
      return res.status(400).json({ message: 'Invalid board ID format' });
    }

    const board = await Board.findById(boardId)
      .populate('createdBy', 'name email avatar role')
      .populate('members', 'name email avatar role');

    if (!board) {
      return res.status(404).json({ message: 'Workspace not found' });
    }

    // Tasks in this workspace
    const tasks = await Task.find({ boardId }).populate('assignedTo', 'name email');

    // Recent activity log
    const activities = await Activity.find({ boardId }).sort({ createdAt: -1 }).limit(30);

    res.status(200).json({
      success: true,
      workspace: encryptUserIds(board),
      tasks: tasks.map(t => encryptUserIds(t)),
      activities: activities.map(a => encryptUserIds(a))
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching workspace details', error: error.message });
  }
};

// Toggle Workspace Archive
export const toggleWorkspaceArchive = async (req, res) => {
  try {
    const { boardId } = req.params;
    const { isArchived } = req.body;

    if (!mongoose.Types.ObjectId.isValid(boardId)) {
      return res.status(400).json({ message: 'Invalid board ID format' });
    }

    const board = await Board.findById(boardId);
    if (!board) {
      return res.status(404).json({ message: 'Workspace not found' });
    }

    board.isArchived = isArchived;
    await board.save();

    const actionName = isArchived ? 'Workspace Archived' : 'Workspace Restored';
    await logAdminAction(req, actionName, board._id, board.title, `Archive state set to ${isArchived}`);

    res.status(200).json({ success: true, message: `Workspace archive state set to ${isArchived}`, board: encryptUserIds(board) });
  } catch (error) {
    res.status(500).json({ message: 'Error archiving workspace', error: error.message });
  }
};

// Transfer Workspace Ownership
export const transferWorkspaceOwnership = async (req, res) => {
  try {
    const { boardId } = req.params;
    const { newOwnerId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(boardId)) {
      return res.status(400).json({ message: 'Invalid board ID format' });
    }
    if (!mongoose.Types.ObjectId.isValid(newOwnerId)) {
      return res.status(400).json({ message: 'Invalid new owner ID format' });
    }

    const board = await Board.findById(boardId);
    if (!board) {
      return res.status(404).json({ message: 'Workspace not found' });
    }

    const newOwner = await User.findById(newOwnerId);
    if (!newOwner) {
      return res.status(404).json({ message: 'New owner user not found' });
    }

    const oldOwnerId = board.createdBy;
    board.createdBy = newOwnerId;

    // Ensure new owner is in members array
    if (!board.members.includes(newOwnerId)) {
      board.members.push(newOwnerId);
    }
    // Ensure old owner remains in members array
    if (!board.members.includes(oldOwnerId)) {
      board.members.push(oldOwnerId);
    }

    await board.save();

    await logAdminAction(req, 'Ownership Transfer', board._id, board.title, `Ownership transferred from ${oldOwnerId} to ${newOwnerId}`);

    // Create notifications for both users
    const notifNew = new Notification({
      recipient: newOwnerId,
      sender: req.userId,
      senderName: req.userName || 'Admin',
      type: 'ownership_transfer',
      status: 'unread',
      boardId: board._id,
      boardTitle: board.title,
      message: `You have been transferred ownership of workspace: "${board.title}" by the administrator.`,
    });
    await notifNew.save();

    try {
      emitToUser(newOwnerId, 'invitationSent', {
        recipientId: encryptId(newOwnerId),
        notification: encryptUserIds(notifNew)
      });
      emitToUser(oldOwnerId, 'ownership-transferred', { boardId: encryptId(board._id), newOwnerId: encryptId(newOwnerId) });
      getIo()?.to(`board-${board._id}`).emit('board-updated', { board: encryptUserIds(board) });
    } catch (e) {}

    res.status(200).json({ success: true, message: 'Workspace ownership transferred successfully', board: encryptUserIds(board) });
  } catch (error) {
    res.status(500).json({ message: 'Error transferring ownership', error: error.message });
  }
};

// Force Add Workspace Member
export const forceAddWorkspaceMember = async (req, res) => {
  try {
    const { boardId } = req.params;
    const { userId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(boardId)) {
      return res.status(400).json({ message: 'Invalid board ID format' });
    }
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Invalid user ID format' });
    }

    const board = await Board.findById(boardId);
    if (!board) {
      return res.status(404).json({ message: 'Workspace not found' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (board.members.includes(userId)) {
      return res.status(400).json({ message: 'User is already a member of this workspace' });
    }

    board.members.push(userId);
    await board.save();

    await logAdminAction(req, 'Admin Member Added', board._id, board.title, `Forcefully added ${user.name}`);

    const notif = new Notification({
      recipient: userId,
      sender: req.userId,
      senderName: req.userName || 'Admin',
      type: 'board_invite',
      status: 'accepted',
      boardId: board._id,
      boardTitle: board.title,
      message: `You have been forcefully added to workspace: "${board.title}" by the administrator.`,
    });
    await notif.save();

    try {
      emitToUser(userId, 'invitationSent', {
        recipientId: encryptId(userId),
        notification: encryptUserIds(notif)
      });
      emitToUser(userId, 'memberAdded', { boardId: encryptId(board._id) });
      getIo()?.to(`board-${board._id}`).emit('board-updated', { board: encryptUserIds(board) });
    } catch (e) {}

    res.status(200).json({ success: true, message: 'Member added forcefully', board: encryptUserIds(board) });
  } catch (error) {
    res.status(500).json({ message: 'Error adding workspace member', error: error.message });
  }
};

// Force Remove Workspace Member
export const forceRemoveWorkspaceMember = async (req, res) => {
  try {
    const { boardId } = req.params;
    const { userId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(boardId)) {
      return res.status(400).json({ message: 'Invalid board ID format' });
    }
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Invalid user ID format' });
    }

    const board = await Board.findById(boardId);
    if (!board) {
      return res.status(404).json({ message: 'Workspace not found' });
    }

    if (board.createdBy.toString() === userId) {
      return res.status(400).json({ message: 'Cannot remove the workspace owner/creator' });
    }

    board.members = board.members.filter(m => m.toString() !== userId);
    await board.save();

    // Pull tasks assignments and collaborators in this workspace
    await Task.updateMany(
      { boardId, assignedTo: userId },
      { $unset: { assignedTo: 1, assignedBy: 1 } }
    );
    await Task.updateMany(
      { boardId, collaborators: userId },
      { $pull: { collaborators: userId } }
    );

    const user = await User.findById(userId);
    await logAdminAction(req, 'Admin Member Removed', board._id, board.title, `Forcefully removed ${user?.name || userId}`);

    try {
      emitToUser(userId, 'memberRemoved', { boardId: encryptId(board._id) });
      getIo()?.to(`board-${board._id}`).emit('board-updated', { board: encryptUserIds(board) });
    } catch (e) {}

    res.status(200).json({ success: true, message: 'Member removed forcefully', board: encryptUserIds(board) });
  } catch (error) {
    res.status(500).json({ message: 'Error removing workspace member', error: error.message });
  }
};

// Delete Workspace
export const deleteWorkspace = async (req, res) => {
  try {
    const { boardId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(boardId)) {
      return res.status(400).json({ message: 'Invalid board ID format' });
    }

    const board = await Board.findById(boardId);
    if (!board) {
      return res.status(404).json({ message: 'Workspace not found' });
    }

    await logAdminAction(req, 'Workspace Deleted', board._id, board.title, `Workspace ${board.title} deleted permanently`);

    // Delete tasks
    await Task.deleteMany({ boardId });

    // Delete board
    await Board.findByIdAndDelete(boardId);

    try {
      getIo()?.to(`board-${boardId}`).emit('board-deleted', { boardId: encryptId(boardId) });
    } catch (e) {}

    res.status(200).json({ success: true, message: 'Workspace deleted permanently' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting workspace', error: error.message });
  }
};

// Get All Tasks
export const getTasks = async (req, res) => {
  try {
    const { search } = req.query;
    let query = {};
    if (search) {
      query = {
        $or: [
          { title: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } }
        ]
      };
    }
    const tasks = await Task.find(query)
      .populate('boardId', 'title')
      .populate('assignedTo', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      tasks: tasks.map(t => encryptUserIds(t))
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching tasks', error: error.message });
  }
};

// Reassign Task
export const reassignTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { userId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(taskId)) {
      return res.status(400).json({ message: 'Invalid task ID format' });
    }

    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    let user = null;
    if (userId) {
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ message: 'Invalid user ID format' });
      }
      user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ message: 'Assignee user not found' });
      }
    }

    const previousAssignee = task.assignedTo;
    task.assignedTo = userId || undefined;
    task.assignedBy = userId ? req.userId : undefined;
    await task.save();

    await logAdminAction(req, 'Task Reassigned', task._id, task.title, `Reassigned task from ${previousAssignee || 'Unassigned'} to ${userId || 'Unassigned'}`);

    if (userId && previousAssignee?.toString() !== userId) {
      const notif = new Notification({
        recipient: userId,
        sender: req.userId,
        senderName: req.userName || 'Admin',
        type: 'task_assign',
        status: 'unread',
        boardId: task.boardId,
        taskId: task._id,
        taskTitle: task.title,
        message: `You have been assigned to task: "${task.title}" by the administrator.`,
      });
      await notif.save();
      try {
        emitToUser(userId, 'invitationSent', {
          recipientId: encryptId(userId),
          notification: encryptUserIds(notif)
        });
        emitToUser(userId, 'taskAssigned', { taskId: encryptId(task._id) });
      } catch (e) {}
    }

    try {
      getIo()?.to(`board-${task.boardId}`).emit('task-updated', { task: encryptUserIds(task) });
    } catch (e) {}

    res.status(200).json({ success: true, message: 'Task reassigned successfully', task: encryptUserIds(task) });
  } catch (error) {
    res.status(500).json({ message: 'Error reassigning task', error: error.message });
  }
};

// Delete Task (Soft-delete)
export const deleteTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(taskId)) {
      return res.status(400).json({ message: 'Invalid task ID format' });
    }

    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    task.isDeleted = true;
    await task.save();

    await logAdminAction(req, 'Deleted Task', task._id, task.title, 'Task soft-deleted');

    try {
      getIo()?.to(`board-${task.boardId}`).emit('task-deleted', { taskId: encryptId(taskId) });
    } catch (e) {}

    res.status(200).json({ success: true, message: 'Task soft-deleted successfully', task: encryptUserIds(task) });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting task', error: error.message });
  }
};

// Restore Task
export const restoreTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(taskId)) {
      return res.status(400).json({ message: 'Invalid task ID format' });
    }

    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    task.isDeleted = false;
    await task.save();

    await logAdminAction(req, 'Recent Admin Actions', task._id, task.title, 'Task restored from trash');

    try {
      getIo()?.to(`board-${task.boardId}`).emit('task-created', { task: encryptUserIds(task) });
    } catch (e) {}

    res.status(200).json({ success: true, message: 'Task restored successfully', task: encryptUserIds(task) });
  } catch (error) {
    res.status(500).json({ message: 'Error restoring task', error: error.message });
  }
};

// Get Audit Logs
export const getAuditLogs = async (req, res) => {
  try {
    const logs = await AuditLog.find().sort({ createdAt: -1 }).limit(100);
    res.status(200).json({ success: true, auditLogs: logs.map(l => encryptUserIds(l)) });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching audit logs', error: error.message });
  }
};

// Get Security Summary
export const getSecuritySummary = async (req, res) => {
  try {
    const blockedUsersCount = await User.countDocuments({ isBlocked: true });
    
    // Failed logins
    const failedLoginsCount = await AuditLog.countDocuments({ action: 'Failed Login' });

    // Role changes
    const roleChangesCount = await AuditLog.countDocuments({ action: 'Role Changed' });

    // Ownership transfers
    const ownershipTransfersCount = await AuditLog.countDocuments({ action: 'Ownership Transfer' });

    // Deleted workspaces
    const deletedWorkspacesCount = await AuditLog.countDocuments({ action: 'Workspace Deleted' });

    // Deleted tasks
    const deletedTasksCount = await AuditLog.countDocuments({ action: 'Deleted Task' });

    // Recent admin actions (last 50 actions from admin)
    const recentAdminActions = await AuditLog.find({
      action: { $nin: ['Failed Login'] }
    }).sort({ createdAt: -1 }).limit(50);

    res.status(200).json({
      success: true,
      summary: {
        blockedUsersCount,
        failedLoginsCount,
        roleChangesCount,
        ownershipTransfersCount,
        deletedWorkspacesCount,
        deletedTasksCount
      },
      recentAdminActions: recentAdminActions.map(l => encryptUserIds(l))
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching security summary', error: error.message });
  }
};

// Get System Health
export const getSystemHealth = async (req, res) => {
  try {
    const dbStatus = mongoose.connection.readyState === 1 ? 'Healthy' : 'Disconnected';
    const socketReady = getIo() ? 'Healthy' : 'Not Ready';
    const socketConnections = getIo()?.engine.clientsCount || 0;
    const memory = process.memoryUsage();
    const cpu = process.cpuUsage();
    const serverUptime = process.uptime();

    // Storage usage: directory size of 'uploads'
    let uploadsSize = 0;
    const uploadsPath = path.join(process.cwd(), 'uploads');
    if (fs.existsSync(uploadsPath)) {
      const getDirSize = (dirPath) => {
        let size = 0;
        const files = fs.readdirSync(dirPath);
        for (const file of files) {
          const filePath = path.join(dirPath, file);
          const stats = fs.statSync(filePath);
          if (stats.isDirectory()) {
            size += getDirSize(filePath);
          } else {
            size += stats.size;
          }
        }
        return size;
      };
      try {
        uploadsSize = getDirSize(uploadsPath);
      } catch (err) {}
    }

    res.status(200).json({
      success: true,
      health: {
        database: dbStatus,
        socketStatus: socketReady,
        activeSocketConnections: socketConnections,
        apiStatus: 'Healthy',
        memoryUsage: {
          rss: `${Math.round(memory.rss / 1024 / 1024 * 100) / 100} MB`,
          heapTotal: `${Math.round(memory.heapTotal / 1024 / 1024 * 100) / 100} MB`,
          heapUsed: `${Math.round(memory.heapUsed / 1024 / 1024 * 100) / 100} MB`
        },
        cpuUsage: {
          user: `${Math.round(cpu.user / 1000) / 1000}s`,
          system: `${Math.round(cpu.system / 1000) / 1000}s`
        },
        storageUsage: `${Math.round(uploadsSize / 1024 / 1024 * 100) / 100} MB`,
        uptime: `${Math.round(serverUptime)} seconds`
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching system health', error: error.message });
  }
};
