import express from 'express';
import { getActivitiesByBoard, getActivitiesByTask } from '../controller/activityController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticateToken);

router.get('/board/:boardId', getActivitiesByBoard);
router.get('/task/:taskId', getActivitiesByTask);

export default router;
