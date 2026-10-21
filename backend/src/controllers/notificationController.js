import { validationResult } from 'express-validator';
import Notification from '../models/Notification.js';
import User from '../models/User.js';
import { logActivity } from '../utils/activityLogger.js';

/**
 * @desc    View Notifications List
 * @route   GET /api/notifications
 * @access  Private (Staff, Customer, Provider)
 */
export const getNotifications = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: errors.array()[0].msg,
      errors: errors.array()
    });
  }

  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 100);
    const skip = (page - 1) * limit;

    const filter = { recipient: req.user._id };

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
      Notification.countDocuments({ recipient: req.user._id, isRead: false }),
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
 * @desc    Create Notifications
 * @route   POST /api/notifications
 * @access  Private (Staff only)
 */
export const createNotification = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: errors.array()[0].msg,
      errors: errors.array()
    });
  }

  try {
    const { title, message, targetType, targetEmail } = req.body;

    let targetUsers = [];

    if (targetType === 'all') {
      targetUsers = await User.find({
        role: { $in: ['customer', 'tourProvider', 'staff'] },
        isDeleted: { $ne: true },
        isActive: { $ne: false }
      }).select('_id');
    } else if (targetType === 'customer') {
      targetUsers = await User.find({
        role: 'customer',
        isDeleted: { $ne: true },
        isActive: { $ne: false }
      }).select('_id');
    } else if (targetType === 'tourProvider') {
      targetUsers = await User.find({
        role: 'tourProvider',
        isDeleted: { $ne: true },
        isActive: { $ne: false }
      }).select('_id');
    } else if (targetType === 'staff') {
      targetUsers = await User.find({
        role: 'staff',
        isDeleted: { $ne: true },
        isActive: { $ne: false }
      }).select('_id');
    } else if (targetType === 'specific_user') {
      const normalizedEmail = String(targetEmail).trim().toLowerCase();
      const user = await User.findOne({
        email: normalizedEmail,
        isDeleted: { $ne: true },
        isActive: { $ne: false }
      }).select('_id');

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy người dùng với email này hoặc tài khoản đã bị vô hiệu hóa'
        });
      }
      targetUsers = [user];
    }

    if (targetUsers.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Không tìm thấy người nhận phù hợp với lựa chọn'
      });
    }

    const notificationDocs = targetUsers.map((user) => ({
      recipient: user._id,
      sender: req.user._id,
      title: title.trim(),
      message: message.trim(),
      notificationType: 'system',
      isRead: false,
      status: 'sent'
    }));

    await Notification.insertMany(notificationDocs);

    const targetDescription = targetType === 'specific_user' ? targetEmail : targetType;
    await logActivity({
      admin: req.user,
      action: 'CREATE_NOTIFICATION',
      targetType: 'Notification',
      details: `Nhân viên gửi thông báo "${title.trim()}" tới ${targetDescription} (${notificationDocs.length} người nhận)`,
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
