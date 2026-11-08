import { Router } from 'express';
import { protect, authorize } from '../middleware/auth.js';
import { ACCESS_ROLES } from '../config/accessControl.js';
import {
  getPlatformStats,
  getAdminDashboardStats,
  getProviderRevenueStats
} from '../controllers/statsController.js';

const router = Router();

// START UC-70 View Provider Revenue Statistics
/**
 * Provider revenue and booking performance statistics.
 * @route GET /api/stats/provider-revenue
 * @access Provider (tourProvider)
 */
router.get(
  '/provider-revenue',
  protect,
  authorize(...ACCESS_ROLES.PROVIDER_ONLY),
  getProviderRevenueStats
);
// END UC-70 View Provider Revenue Statistics

// START UC-102 View Platform Statistics
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
// END UC-102 View Platform Statistics

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
