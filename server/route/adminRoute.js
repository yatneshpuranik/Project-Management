import express from 'express';
import {
  getGlobalStats,
  getUsers,
  getUserDetails,
  updateUserRole,
  toggleUserBlock,
  forceLogoutUser,
  resetUserAccess,
  deleteUser,
  getWorkspaces,
  getWorkspaceDetails,
  toggleWorkspaceArchive,
  transferWorkspaceOwnership,
  forceAddWorkspaceMember,
  forceRemoveWorkspaceMember,
  deleteWorkspace,
  getTasks,
  reassignTask,
  deleteTask,
  restoreTask,
  getAuditLogs,
  getSecuritySummary,
  getSystemHealth,
  verifyAdmin
} from '../controller/adminController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Enforce token validation and verify admin role
router.use(authenticateToken);
router.use(verifyAdmin);

router.get('/stats', getGlobalStats);
router.get('/users', getUsers);
router.get('/users/:userId', getUserDetails);
router.put('/users/:userId/role', updateUserRole);
router.put('/users/:userId/block', toggleUserBlock);
router.post('/users/:userId/logout', forceLogoutUser);
router.post('/users/:userId/reset', resetUserAccess);
router.delete('/users/:userId', deleteUser);

router.get('/workspaces', getWorkspaces);
router.get('/workspaces/:boardId', getWorkspaceDetails);
router.put('/workspaces/:boardId/archive', toggleWorkspaceArchive);
router.post('/workspaces/:boardId/transfer-ownership', transferWorkspaceOwnership);
router.post('/workspaces/:boardId/members/add', forceAddWorkspaceMember);
router.post('/workspaces/:boardId/members/remove', forceRemoveWorkspaceMember);
router.delete('/workspaces/:boardId', deleteWorkspace);

router.get('/tasks', getTasks);
router.put('/tasks/:taskId/reassign', reassignTask);
router.delete('/tasks/:taskId', deleteTask);
router.put('/tasks/:taskId/restore', restoreTask);

router.get('/audit-logs', getAuditLogs);
router.get('/security/summary', getSecuritySummary);
router.get('/system-health', getSystemHealth);

export default router;
