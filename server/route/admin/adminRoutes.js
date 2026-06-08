import express from 'express';
import {
  getGlobalStats,
  getAuditLogs,
  getSecuritySummary,
  getSystemHealth,
  getAllPermissions,
  updatePermission
} from '../../controller/admin/adminController.js';
import { verifyAdmin } from '../../middleware/admin/adminMiddleware.js';
import { authenticateToken } from '../../middleware/auth.js';

import adminUserRoutes from './adminUserRoutes.js';
import adminWorkspaceRoutes from './adminWorkspaceRoutes.js';
import adminTaskRoutes from './adminTaskRoutes.js';
import adminAnalyticsRoutes from './adminAnalyticsRoutes.js';

const router = express.Router();

// Enforce auth token and admin checks
router.use(authenticateToken);
router.use(verifyAdmin);

// Core endpoints
router.get('/stats', getGlobalStats);
router.get('/audit-logs', getAuditLogs);
router.get('/security/summary', getSecuritySummary);
router.get('/system-health', getSystemHealth);
router.get('/permissions', getAllPermissions);
router.put('/permissions/:role', updatePermission);

// Sub-routers
router.use('/users', adminUserRoutes);
router.use('/workspaces', adminWorkspaceRoutes);
router.use('/tasks', adminTaskRoutes);
router.use('/analytics', adminAnalyticsRoutes);

export default router;
