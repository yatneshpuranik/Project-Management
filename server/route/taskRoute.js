import express from 'express';
import {
  createTask,
  getTasksByBoard,
  getTaskById,
  updateTask,
  moveTask,
  deleteTask,
  addComment,
  getComments,
  deleteComment,
  updateComment,
  inviteToTask,
  joinTask,
  leaveTask,
  getChatMessages,
  addChatMessage,
  updateChatMessage,
  deleteChatMessage,
  addTaskChecklistItem,
  updateTaskChecklistItem,
  deleteTaskChecklistItem,
  claimTask,
  releaseTask,
  takeOwnership,
} from '../controller/taskController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Protect all routes
router.use(authenticateToken);

// Task Routes
router.post('/', createTask);
router.get('/board/:boardId', getTasksByBoard);
router.get('/:taskId', getTaskById);
router.put('/:taskId', updateTask);
router.patch('/:taskId/move', moveTask);
router.delete('/:taskId', deleteTask);
router.post('/:taskId/invite', inviteToTask);
router.post('/:taskId/join', joinTask);
router.post('/:taskId/leave', leaveTask);
router.post('/:taskId/claim', claimTask);
router.post('/:taskId/release', releaseTask);
router.post('/:taskId/take-ownership', takeOwnership);

// Checklist Routes
router.post('/:taskId/checklist', addTaskChecklistItem);
router.put('/:taskId/checklist/:itemId', updateTaskChecklistItem);
router.delete('/:taskId/checklist/:itemId', deleteTaskChecklistItem);

// Comment Routes
router.get('/:taskId/comments', getComments);
router.post('/:taskId/comments', addComment);
router.put('/:taskId/comments/:commentId', updateComment);
router.delete('/:taskId/comments/:commentId', deleteComment);

// Chat Message Routes
router.get('/:taskId/messages', getChatMessages);
router.post('/:taskId/messages', addChatMessage);
router.put('/:taskId/messages/:messageId', updateChatMessage);
router.delete('/:taskId/messages/:messageId', deleteChatMessage);

export default router;
