import express from 'express';
import { getActivitiesByBoard } from '../controller/activityController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticateToken);

router.get('/board/:boardId', getActivitiesByBoard);

export default router;
