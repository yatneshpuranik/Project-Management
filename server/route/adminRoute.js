import express from 'express';
import { getGlobalStats, getUsers, deleteUser, getWorkspaces, deleteWorkspace, verifyAdmin } from '../controller/adminController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Enforce token validation and verify admin role
router.use(authenticateToken);
router.use(verifyAdmin);

router.get('/stats', getGlobalStats);
router.get('/users', getUsers);
router.delete('/users/:userId', deleteUser);
router.get('/workspaces', getWorkspaces);
router.delete('/workspaces/:boardId', deleteWorkspace);

export default router;
