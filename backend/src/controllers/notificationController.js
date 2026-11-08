import mongoose from 'mongoose';
import { validationResult } from 'express-validator';
import Notification from '../models/Notification.js';
import User from '../models/User.js';
import { logActivity } from '../utils/activityLogger.js';

const ACTIVE_NOTIFICATION_FILTER = { isDeleted: { $ne: true } };

const sendValidationError = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({
      success: false,
      message: errors.array()[0].msg,
      errors: errors.array()
    });
    return true;
  }
  return false;
};

/**
 * @desc    View Personal Notifications List (Inbox)
 * @route   GET /api/notifications
 * @access  Private (Staff, Customer, Provider)
 */
export const getNotifications = async (req, res) => {
  if (sendValidationError(req, res)) return;

  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 100);
    const skip = (page - 1) * limit;

    const filter = {
      recipient: req.user._id,
      ...ACTIVE_NOTIFICATION_FILTER
    };

    if (req.query.status === 'unread') {
      filter.isRead = false;
    } else if (req.query.status === 'read') {
      filter.isRead = true;
    }

    if (req.query.type && req.query.type !== 'all') {
      filter.notificationType = req.query.type;
    }

    const [total, unreadCount, notifications] = await Promise.all([
      Notification.countDocuments(filter),
      Notification.countDocuments({
        recipient: req.user._id,
        isRead: false,
        ...ACTIVE_NOTIFICATION_FILTER
      }),
      Notification.find(filter)
        .populate('sender', 'username email role')
        .populate('invitedBy', 'username email')
        .populate('itinerary', 'title destination')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    res.json({
      success: true,
      notifications,
      total,
      totalPages,
      currentPage: page,
      limit,
      unreadCount
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Không thể tải danh sách thông báo'
    });
  }
};

/**
 * @desc    View Managed Notifications List (Sent by Staff)
 * @route   GET /api/notifications/management
 * @access  Private (Staff only)
 */
export const getManagedNotifications = async (req, res) => {
  if (sendValidationError(req, res)) return;

  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 100);
    const skip = (page - 1) * limit;

    // Only system notifications created by Staff (excludes itinerary_invite, tour_submission, etc.)
    const matchFilter = {
      notificationType: 'system',
      ...ACTIVE_NOTIFICATION_FILTER
    };

    if (req.query.targetType) {
      matchFilter.targetType = req.query.targetType;
    }

    if (req.query.search && req.query.search.trim()) {
      const searchRegex = new RegExp(req.query.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      matchFilter.$or = [
        { title: searchRegex },
        { message: searchRegex },
        { targetEmail: searchRegex }
      ];
    }

    const pipeline = [
      { $match: matchFilter },
      {
        $group: {
          _id: {
            $ifNull: [
              '$batchId',
              {
                $concat: [
                  { $ifNull: ['$title', ''] },
                  '__GROUP__',
                  { $ifNull: ['$message', ''] },
                  '__GROUP__',
                  { $toString: { $ifNull: ['$sender', ''] } },
                  '__GROUP__',
                  { $dateToString: { format: '%Y-%m-%d %H:%M:%S', date: '$createdAt' } }
                ]
              }
            ]
          },
          docId: { $first: '$_id' },
          title: { $first: '$title' },
          message: { $first: '$message' },
          notificationType: { $first: '$notificationType' },
          targetType: { $first: '$targetType' },
          targetEmail: { $first: '$targetEmail' },
          sender: { $first: '$sender' },
          recipient: { $first: '$recipient' },
          recipientCount: { $sum: 1 },
          createdAt: { $first: '$createdAt' },
          updatedAt: { $first: '$updatedAt' }
        }
      },
      { $sort: { createdAt: -1 } }
    ];

    const [totalResults, paginatedResults] = await Promise.all([
      Notification.aggregate([...pipeline, { $count: 'total' }]),
      Notification.aggregate([
        ...pipeline,
        { $skip: skip },
        { $limit: limit },
        {
          $lookup: {
            from: 'users',
            localField: 'sender',
            foreignField: '_id',
            as: 'sender'
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: 'recipient',
            foreignField: '_id',
            as: 'recipient'
          }
        },
        {
          $unwind: {
            path: '$sender',
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $unwind: {
            path: '$recipient',
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $project: {
            _id: '$docId',
            batchId: '$_id',
            title: 1,
            message: 1,
            notificationType: 1,
            targetType: { $ifNull: ['$targetType', 'all'] },
            targetEmail: 1,
            recipientCount: 1,
            createdAt: 1,
            updatedAt: 1,
            sender: {
              _id: '$sender._id',
              username: '$sender.username',
              email: '$sender.email',
              role: '$sender.role'
            },
            recipient: {
              _id: '$recipient._id',
              username: '$recipient.username',
              email: '$recipient.email',
              role: '$recipient.role'
            }
          }
        }
      ])
    ]);

    const total = totalResults[0]?.total || 0;
    const totalPages = Math.ceil(total / limit) || 1;

    res.json({
      success: true,
      notifications: paginatedResults,
      total,
      totalPages,
      currentPage: page,
      limit
    });
  } catch (error) {
    console.error('Get managed notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Không thể tải danh sách thông báo quản lý'
    });
  }
};

/**
 * @desc    Create Notifications
 * @route   POST /api/notifications
 * @access  Private (Staff only)
 */
export const createNotification = async (req, res) => {
  if (sendValidationError(req, res)) return;

  try {
    const { title, message, targetType, targetEmail } = req.body;
    const baseUserFilter = {
      isDeleted: { $ne: true },
      isActive: { $ne: false }
    };

    let targetUsers = [];
    if (targetType === 'specific_user') {
      const normalizedEmail = String(targetEmail).trim().toLowerCase();
      const user = await User.findOne({
        ...baseUserFilter,
        email: normalizedEmail
      }).select('_id');

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy người dùng với email này hoặc tài khoản đã bị vô hiệu hóa'
        });
      }
      targetUsers = [user];
    } else {
      const roleFilter = targetType === 'all'
        ? { $in: ['customer', 'tourProvider', 'staff'] }
        : targetType;

      targetUsers = await User.find({
        ...baseUserFilter,
        role: roleFilter
      }).select('_id');
    }

    if (targetUsers.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Không tìm thấy người nhận phù hợp với lựa chọn'
      });
    }

    const batchId = new mongoose.Types.ObjectId();
    const trimmedTitle = title.trim();
    const trimmedMessage = message.trim();
    const normalizedTargetEmail = targetType === 'specific_user'
      ? String(targetEmail).trim().toLowerCase()
      : undefined;

    const notificationDocs = targetUsers.map((user) => ({
      recipient: user._id,
      sender: req.user._id,
      title: trimmedTitle,
      message: trimmedMessage,
      notificationType: 'system',
      targetType: targetType || 'all',
      targetEmail: normalizedTargetEmail,
      batchId,
      isRead: false,
      status: 'sent'
    }));

    await Notification.insertMany(notificationDocs);

    const targetDescription = targetType === 'specific_user' ? normalizedTargetEmail : targetType;
    await logActivity({
      admin: req.user,
      action: 'CREATE_NOTIFICATION',
      targetType: 'Notification',
      details: `Nhân viên gửi thông báo "${trimmedTitle}" tới ${targetDescription} (${notificationDocs.length} người nhận)`,
      req
    });

    res.status(201).json({
      success: true,
      message: `Đã gửi thông báo thành công đến ${notificationDocs.length} người dùng`,
      count: notificationDocs.length
    });
  } catch (error) {
    console.error('Create notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Không thể tạo thông báo'
    });
  }
};

/**
 * @desc    Mark Notification as Read
 * @route   PATCH /api/notifications/:id/read
 * @access  Private (Staff, Customer, Provider)
 */
export const markNotificationAsRead = async (req, res) => {
  if (sendValidationError(req, res)) return;

  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      recipient: req.user._id,
      ...ACTIVE_NOTIFICATION_FILTER
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy thông báo hoặc bạn không có quyền thao tác'
      });
    }

    if (!notification.isRead) {
      notification.isRead = true;
      await notification.save();
    }

    res.json({
      success: true,
      message: 'Đã đánh dấu thông báo là đã đọc',
      notification
    });
  } catch (error) {
    console.error('Mark notification as read error:', error);
    res.status(500).json({
      success: false,
      message: 'Không thể đánh dấu thông báo là đã đọc'
    });
  }
};

/**
 * @desc    Mark All Notifications as Read
 * @route   PATCH /api/notifications/read-all
 * @access  Private (Staff, Customer, Provider)
 */
export const markAllNotificationsAsRead = async (req, res) => {
  try {
    const result = await Notification.updateMany(
      {
        recipient: req.user._id,
        isRead: false,
        ...ACTIVE_NOTIFICATION_FILTER
      },
      { $set: { isRead: true } }
    );

    res.json({
      success: true,
      message: 'Đã đánh dấu tất cả thông báo là đã đọc',
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    console.error('Mark all notifications as read error:', error);
    res.status(500).json({
      success: false,
      message: 'Không thể đánh dấu tất cả thông báo là đã đọc'
    });
  }
};

/**
 * @desc    Update Notifications
 * @route   PUT /api/notifications/:id
 * @access  Private (Staff only)
 */
export const updateNotification = async (req, res) => {
  if (sendValidationError(req, res)) return;

  try {
    const { title, message } = req.body;
    const notification = await Notification.findById(req.params.id);

    if (!notification || notification.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy thông báo'
      });
    }

    if (notification.notificationType && notification.notificationType !== 'system') {
      return res.status(400).json({
        success: false,
        message: 'Chỉ có thể cập nhật thông báo hệ thống do nhân viên phát hành'
      });
    }

    const trimmedTitle = title.trim();
    const trimmedMessage = message.trim();

    if (notification.batchId) {
      await Notification.updateMany(
        { batchId: notification.batchId, ...ACTIVE_NOTIFICATION_FILTER },
        { $set: { title: trimmedTitle, message: trimmedMessage } }
      );
      notification.title = trimmedTitle;
      notification.message = trimmedMessage;
    } else {
      notification.title = trimmedTitle;
      notification.message = trimmedMessage;
      await notification.save();
    }

    await logActivity({
      admin: req.user,
      action: 'UPDATE_NOTIFICATION',
      targetType: 'Notification',
      targetId: notification._id,
      details: `Nhân viên cập nhật thông báo "${notification.title}"`,
      req
    });

    res.json({
      success: true,
      message: 'Cập nhật thông báo thành công',
      notification
    });
  } catch (error) {
    console.error('Update notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Không thể cập nhật thông báo'
    });
  }
};

/**
 * @desc    Delete Notifications (Soft delete)
 * @route   DELETE /api/notifications/:id
 * @access  Private (Staff only)
 */
export const deleteNotification = async (req, res) => {
  if (sendValidationError(req, res)) return;

  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification || notification.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy thông báo'
      });
    }

    if (notification.notificationType && notification.notificationType !== 'system') {
      return res.status(400).json({
        success: false,
        message: 'Chỉ có thể xóa thông báo hệ thống do nhân viên phát hành'
      });
    }

    const title = notification.title;
    const now = new Date();

    if (notification.batchId) {
      await Notification.updateMany(
        { batchId: notification.batchId, ...ACTIVE_NOTIFICATION_FILTER },
        {
          $set: {
            isDeleted: true,
            deletedAt: now,
            deletedBy: req.user._id
          }
        }
      );
    } else {
      notification.isDeleted = true;
      notification.deletedAt = now;
      notification.deletedBy = req.user._id;
      await notification.save();
    }

    await logActivity({
      admin: req.user,
      action: 'DELETE_NOTIFICATION',
      targetType: 'Notification',
      targetId: req.params.id,
      details: `Nhân viên xóa thông báo "${title}"`,
      req
    });

    res.json({
      success: true,
      message: 'Đã xóa thông báo thành công'
    });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Không thể xóa thông báo'
    });
  }
};
