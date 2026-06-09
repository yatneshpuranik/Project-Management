import express from 'express';
import { getNotifications, respondToInvitation, markNotificationAsRead, deleteNotification, deleteAllNotifications } from '../controller/notificationController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticateToken);

router.get('/', getNotifications);
router.post('/:notificationId/respond', respondToInvitation);
router.post('/:notificationId/read', markNotificationAsRead);
router.delete('/:notificationId', deleteNotification);
router.delete('/', deleteAllNotifications);

export default router;
