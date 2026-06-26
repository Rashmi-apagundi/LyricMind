import express from 'express';
import { createJournalEntry, getJournalHistory } from '../controllers/journalController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.route('/')
  .post(protect, createJournalEntry)
  .get(protect, getJournalHistory);

export default router;
