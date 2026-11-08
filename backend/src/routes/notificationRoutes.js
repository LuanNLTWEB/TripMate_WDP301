import { Router } from 'express';
import {
  getNotifications,
  createNotification
} from '../controllers/notificationController.js';
import { protect, authorize } from '../middleware/auth.js';
import { ACCESS_ROLES } from '../config/accessControl.js';
import {
  notificationListValidation,
  createNotificationValidation
} from '../middleware/validate.js';

const router = Router();

// @route   GET /api/notifications
// @desc    View Notifications List
// @access  Private (Staff, Customer, Provider)
router.get(
  '/',
  protect,
  authorize(...ACCESS_ROLES.NOTIFICATION_VIEW),
  notificationListValidation,
  getNotifications
);

// @route   POST /api/notifications
// @desc    Create Notifications
// @access  Private (Staff only)
router.post(
  '/',
  protect,
  authorize(...ACCESS_ROLES.STAFF_ONLY),
  createNotificationValidation,
  createNotification
);

export default router;
