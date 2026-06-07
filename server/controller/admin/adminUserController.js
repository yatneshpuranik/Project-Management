import User from '../../model/userModel.js';
import Board from '../../model/board.js';
import Task from '../../model/task.js';
import Activity from '../../model/activity.js';
import Notification from '../../model/notification.js';
import { encryptUserIds, encryptId } from '../../utils/idCrypt.js';
import mongoose from 'mongoose';
import { emitToUser } from '../../socket/socket.js';
import bcrypt from 'bcryptjs';
import { logAdminAction } from './adminController.js';

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

    // Protect the primary Admin
    if (user.email === 'yatnesh@admin.com') {
      return res.status(400).json({ message: 'Cannot demote or change the role of the primary Admin' });
    }

    // Ensure role is valid
    if (role !== 'ADMIN' && role !== 'USER') {
      return res.status(400).json({ message: 'Invalid role' });
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

    // Protect primary Admin
    if (user.email === 'yatnesh@admin.com') {
      return res.status(400).json({ message: 'Cannot block the primary Admin account' });
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

    // Protect primary Admin
    if (user.email === 'yatnesh@admin.com') {
      if (req.user?.email !== 'yatnesh@admin.com') {
        return res.status(400).json({ message: 'Cannot force logout the primary Admin' });
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

    // Protect primary Admin
    if (user.email === 'yatnesh@admin.com') {
      return res.status(400).json({ message: 'Cannot reset access for the primary Admin' });
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

    // Protect primary Admin
    if (user.email === 'yatnesh@admin.com') {
      return res.status(400).json({ message: 'Cannot delete the primary Admin account' });
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
