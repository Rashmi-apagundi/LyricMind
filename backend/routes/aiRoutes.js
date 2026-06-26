import express from 'express';
import {
  getDailyReflection,
  getWeeklyReport,
  getPersonalityProfile,
  getGrowthTrajectory,
  getThoughtsClusters,
  selfReflect
} from '../controllers/aiController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.get('/reflection', protect, getDailyReflection);
router.get('/weekly-report', protect, getWeeklyReport);
router.get('/personality', protect, getPersonalityProfile);
router.get('/trajectory', protect, getGrowthTrajectory);
router.get('/clusters', protect, getThoughtsClusters);
router.post('/self-reflect', protect, selfReflect);

export default router;
