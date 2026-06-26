import express from 'express';
import { createMemory, getMemories, toggleMemoryFavorite, queryMemories } from '../controllers/memoryController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Put specific routes before parameter routes (like /:id) to avoid routes getting hijacked!
router.get('/search', protect, queryMemories);

router.route('/')
  .post(protect, createMemory)
  .get(protect, getMemories);

router.patch('/:id/favorite', protect, toggleMemoryFavorite);

export default router;
