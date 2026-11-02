import { Router } from 'express';
import { protect, authorize } from '../middleware/auth.js';
import { ACCESS_ROLES } from '../config/accessControl.js';
import { getPlatformStats, getAdminDashboardStats } from '../controllers/statsController.js';

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

/**
 * System dashboard statistics for admin.
 * @route GET /api/stats/admin
 * @access Admin
 */
router.get(
  '/admin',
  protect,
  authorize(...ACCESS_ROLES.ADMIN_ONLY),
  getAdminDashboardStats
);

export default router;
