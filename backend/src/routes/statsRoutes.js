import { Router } from 'express';
import { protect, authorize } from '../middleware/auth.js';
import { getPlatformStats } from '../controllers/statsController.js';

const router = Router();

/**
 * Platform statistics for the staff dashboard.
 */
router.get('/platform', protect, authorize('staff', 'admin'), getPlatformStats);

export default router;