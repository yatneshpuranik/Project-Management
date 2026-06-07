import express from 'express';
import { getPlatformAnalytics } from '../../controller/admin/adminAnalyticsController.js';

const router = express.Router();

router.get('/', getPlatformAnalytics);

export default router;
