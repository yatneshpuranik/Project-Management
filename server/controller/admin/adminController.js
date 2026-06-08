import User from '../../model/userModel.js';
import Board from '../../model/board.js';
import Task from '../../model/task.js';
import AuditLog from '../../model/auditLog.js';
import Permission from '../../model/permission.js';
import { encryptUserIds } from '../../utils/idCrypt.js';
import mongoose from 'mongoose';
import { getIo } from '../../socket/socket.js';
import fs from 'fs';
import path from 'path';

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
    const failedLoginsCount = await AuditLog.countDocuments({ action: 'Failed Login' });
    const roleChangesCount = await AuditLog.countDocuments({ action: 'Role Changed' });
    const ownershipTransfersCount = await AuditLog.countDocuments({ action: 'Ownership Transfer' });
    const deletedWorkspacesCount = await AuditLog.countDocuments({ action: 'Workspace Deleted' });
    const deletedTasksCount = await AuditLog.countDocuments({ action: 'Deleted Task' });

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

// Get all permissions
export const getAllPermissions = async (req, res) => {
  try {
    const permissions = await Permission.find();
    res.status(200).json({ success: true, permissions });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching permissions', error: error.message });
  }
};

// Update permission for a role
export const updatePermission = async (req, res) => {
  try {
    const { role } = req.params;
    const updates = req.body;
    
    const permission = await Permission.findOneAndUpdate({ role }, updates, { returnDocument: 'after' });
    if (!permission) {
      return res.status(404).json({ success: false, message: 'Role not found' });
    }

    await logAdminAction(req, 'Permissions Changed', undefined, role, `Updated permissions for role: ${role}`);

    // Notify users of permission changes
    try {
      const io = getIo();
      if (io) {
        io.emit('permissions-changed', { role, permissions: permission });
      }
    } catch (socketErr) {}

    res.status(200).json({ success: true, message: `Permissions for ${role} updated successfully`, permission });
  } catch (error) {
    res.status(500).json({ message: 'Error updating permissions', error: error.message });
  }
};
