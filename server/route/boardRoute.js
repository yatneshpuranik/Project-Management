import express from 'express';
import {
  createBoard,
  getBoards,
  getBoardById,
  updateBoard,
  deleteBoard,
  addMember,
  removeMember,
} from '../controller/boardController.js';
import {
  getBoardChatMessages,
  addBoardChatMessage,
  updateBoardChatMessage,
  deleteBoardChatMessage,
  markChatAsRead,
} from '../controller/chatController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Protect all routes
router.use(authenticateToken);

// Board Routes
router.post('/', createBoard);
router.get('/', getBoards);
router.get('/:boardId', getBoardById);
router.put('/:boardId', updateBoard);
router.delete('/:boardId', deleteBoard);

// Member Routes
router.post('/:boardId/members', addMember);
router.delete('/:boardId/members/:memberId', removeMember);

// Workspace Chat Routes
router.get('/:boardId/chat', getBoardChatMessages);
router.post('/:boardId/chat', addBoardChatMessage);
router.post('/:boardId/chat/read', markChatAsRead);
router.put('/:boardId/chat/:messageId', updateBoardChatMessage);
router.delete('/:boardId/chat/:messageId', deleteBoardChatMessage);

export default router;
