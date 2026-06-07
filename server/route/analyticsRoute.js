import express from 'express';
import { getBoardAnalytics } from '../controller/analyticsController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticateToken);

router.get('/board/:boardId', getBoardAnalytics);

export default router;
