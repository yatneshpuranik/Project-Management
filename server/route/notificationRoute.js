import express from 'express';
import { getNotifications, respondToInvitation } from '../controller/notificationController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticateToken);

router.get('/', getNotifications);
router.post('/:notificationId/respond', respondToInvitation);

export default router;
