import { Router } from 'express';
import { protect, authorize } from '../middleware/auth.js';
import { ACCESS_ROLES } from '../config/accessControl.js';
import { getPlatformStats } from '../controllers/statsController.js';

const router = Router();

/**
 * Platform statistics for staff.
 * @route GET /api/stats/platform
 * @access Staff
 */
router.get(
  '/platform',
  protect,
  authorize(...ACCESS_ROLES.STAFF_ONLY),
  getPlatformStats
);

export default router;
