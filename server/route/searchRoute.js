import express from 'express';
import { globalSearch } from '../controller/searchController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.get('/global', authenticateToken, globalSearch);

export default router;
