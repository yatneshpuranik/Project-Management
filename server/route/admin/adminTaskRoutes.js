import express from 'express';
import {
  getTasks,
  reassignTask,
  deleteTask,
  restoreTask
} from '../../controller/admin/adminTaskController.js';

const router = express.Router();

router.get('/', getTasks);
router.put('/:taskId/reassign', reassignTask);
router.delete('/:taskId', deleteTask);
router.put('/:taskId/restore', restoreTask);

export default router;
