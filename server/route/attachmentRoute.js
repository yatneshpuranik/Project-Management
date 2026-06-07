import express from 'express';
import upload from '../configFiles/multer.js';
import {
  uploadAttachment,
  getTaskAttachments,
  downloadAttachment,
} from '../controller/attachmentController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticateToken);

router.post('/task/:taskId/upload', upload.single('file'), uploadAttachment);
router.get('/task/:taskId', getTaskAttachments);
router.get('/:attachmentId/download', downloadAttachment);

export default router;
