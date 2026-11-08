import { Router } from 'express';
import {
  getNotifications,
  getManagedNotifications,
  createNotification,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  updateNotification,
  deleteNotification
} from '../controllers/notificationController.js';
import { protect, authorize } from '../middleware/auth.js';
import { ACCESS_ROLES } from '../config/accessControl.js';
import {
  notificationListValidation,
  managedNotificationListValidation,
  createNotificationValidation,
  markNotificationReadValidation,
  updateNotificationValidation,
  deleteNotificationValidation
} from '../middleware/validate.js';

const router = Router();

// @route   GET /api/notifications
// @desc    View Personal Notifications List (Inbox)
// @access  Private (Staff, Customer, Provider)
router.get(
  '/',
  protect,
  authorize(...ACCESS_ROLES.NOTIFICATION_VIEW),
  notificationListValidation,
  getNotifications
);

// @route   GET /api/notifications/management
// @desc    View Managed Notifications List (Sent by Staff)
// @access  Private (Staff only)
router.get(
  '/management',
  protect,
  authorize(...ACCESS_ROLES.STAFF_ONLY),
  managedNotificationListValidation,
  getManagedNotifications
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

// @route   PATCH /api/notifications/read-all
// @desc    Mark All Notifications as Read
// @access  Private (Staff, Customer, Provider)
router.patch(
  '/read-all',
  protect,
  authorize(...ACCESS_ROLES.NOTIFICATION_VIEW),
  markAllNotificationsAsRead
);

// @route   PATCH /api/notifications/:id/read
// @desc    Mark Notification as Read
// @access  Private (Staff, Customer, Provider)
router.patch(
  '/:id/read',
  protect,
  authorize(...ACCESS_ROLES.NOTIFICATION_VIEW),
  markNotificationReadValidation,
  markNotificationAsRead
);

// @route   PUT /api/notifications/:id
// @desc    Update Notifications
// @access  Private (Staff only)
router.put(
  '/:id',
  protect,
  authorize(...ACCESS_ROLES.STAFF_ONLY),
  updateNotificationValidation,
  updateNotification
);

// @route   DELETE /api/notifications/:id
// @desc    Delete Notifications
// @access  Private (Staff only)
router.delete(
  '/:id',
  protect,
  authorize(...ACCESS_ROLES.STAFF_ONLY),
  deleteNotificationValidation,
  deleteNotification
);

export default router;
