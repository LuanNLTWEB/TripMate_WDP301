import { validationResult } from 'express-validator';
import Itinerary from '../models/Itinerary.js';
import Notification from '../models/Notification.js';
import User from '../models/User.js';

const INVITE_TYPE = 'itinerary_invite';

/**
 * Invite a registered user to collaborate on an owned itinerary (owner only).
 * Creates a pending invitation stored in the notifications collection.
 * @route POST /api/itineraries/:id/invitations
 * @access Customer (owner only)
 */
export const inviteCollaborator = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: errors.array()[0].msg, errors: errors.array() });
  }

  try {
    const { email, permission } = req.body;
    const itinerary = await Itinerary.findById(req.params.id);

    if (!itinerary) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy lịch trình' });
    }

    if (String(itinerary.owner) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Bạn không có quyền mời cộng tác lịch trình này' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const targetUser = await User.findOne({ email: normalizedEmail, isDeleted: { $ne: true } });

    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng với email này' });
    }

    if (String(targetUser._id) === String(req.user._id)) {
      return res.status(400).json({ success: false, message: 'Không thể tự mời chính mình' });
    }

    const isCollaborator = (itinerary.collaborators || []).some(
      (c) => String(c.user?._id || c.user) === String(targetUser._id)
    );
    if (isCollaborator) {
      return res.status(409).json({ success: false, message: 'Người dùng đã là cộng tác viên của lịch trình này' });
    }

    const title = 'Lời mời cộng tác lịch trình';
    const inviterName = req.user.username || req.user.email;
    const message = `${inviterName} đã mời bạn cộng tác lịch trình "${itinerary.title}" với quyền ${permission === 'edit' ? 'chỉnh sửa' : 'chỉ xem'}.`;

    const existingInvite = await Notification.findOne({
      itinerary: itinerary._id,
      recipient: targetUser._id,
      notificationType: INVITE_TYPE,
      status: 'pending'
    });

    let invitation = existingInvite;

    if (existingInvite) {
      existingInvite.permission = permission;
      existingInvite.title = title;
      existingInvite.message = message;
      existingInvite.isRead = false;
      invitation = await existingInvite.save();
    } else {
      invitation = await Notification.create({
        recipient: targetUser._id,
        title,
        message,
        notificationType: INVITE_TYPE,
        itinerary: itinerary._id,
        invitedBy: req.user._id,
        permission,
        status: 'pending'
      });
    }

    return res.status(existingInvite ? 200 : 201).json({
      success: true,
      message: existingInvite
        ? `Đã gửi lại lời mời cộng tác cho ${targetUser.username || targetUser.email}`
        : `Đã gửi lời mời cộng tác tới ${targetUser.username || targetUser.email}`,
      invitation
    });
  } catch (error) {
    console.error('Invite collaborator error:', error);
    return res.status(500).json({ success: false, message: 'Không thể gửi lời mời cộng tác' });
  }
};

/**
 * List invitations sent for a specific itinerary (owner only).
 * @route GET /api/itineraries/:id/invitations
 * @access Customer (owner only)
 */
export const listItineraryInvitations = async (req, res) => {
  try {
    const itinerary = await Itinerary.findById(req.params.id);

    if (!itinerary) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy lịch trình' });
    }

    if (String(itinerary.owner) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Bạn không có quyền xem lời mời của lịch trình này' });
    }

    const invitations = await Notification.find({
      itinerary: itinerary._id,
      notificationType: INVITE_TYPE
    })
      .populate('recipient', 'username email')
      .populate('invitedBy', 'username email')
      .sort({ createdAt: -1 });

    return res.json({ success: true, invitations });
  } catch (error) {
    console.error('List itinerary invitations error:', error);
    return res.status(500).json({ success: false, message: 'Không thể tải danh sách lời mời' });
  }
};

/**
 * List invitations received by the authenticated customer.
 * @route GET /api/itineraries/invitations
 * @access Customer
 */
export const listReceivedInvitations = async (req, res) => {
  try {
    const filter = {
      recipient: req.user._id,
      notificationType: INVITE_TYPE
    };

    if (req.query.status && ['pending', 'accepted', 'declined'].includes(req.query.status)) {
      filter.status = req.query.status;
    }

    const invitations = await Notification.find(filter)
      .populate('itinerary', 'title startDate endDate')
      .populate('invitedBy', 'username email')
      .sort({ createdAt: -1 })
      .limit(50);

    return res.json({ success: true, invitations });
  } catch (error) {
    console.error('List received invitations error:', error);
    return res.status(500).json({ success: false, message: 'Không thể tải lời mời nhận được' });
  }
};

/**
 * Accept or decline a received itinerary invitation (recipient only).
 * Accepting adds the recipient into the itinerary collaborators with joinedAt.
 * @route POST /api/itineraries/invitations/:notificationId/respond
 * @access Customer (recipient only)
 */
export const respondToInvitation = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: errors.array()[0].msg, errors: errors.array() });
  }

  try {
    const { action } = req.body;

    const invitation = await Notification.findOne({
      _id: req.params.notificationId,
      recipient: req.user._id,
      notificationType: INVITE_TYPE
    });

    if (!invitation) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy lời mời' });
    }

    if (invitation.status !== 'pending') {
      return res.status(409).json({ success: false, message: 'Lời mời này đã được xử lý trước đó' });
    }

    if (action === 'decline') {
      invitation.status = 'declined';
      invitation.isRead = true;
      await invitation.save();

      return res.json({
        success: true,
        message: 'Đã từ chối lời mời cộng tác',
        invitation
      });
    }

    const itinerary = await Itinerary.findById(invitation.itinerary);

    if (!itinerary) {
      return res.status(404).json({ success: false, message: 'Lịch trình trong lời mời không còn tồn tại' });
    }

    if (String(itinerary.owner) === String(req.user._id)) {
      return res.status(409).json({ success: false, message: 'Bạn là chủ sở hữu lịch trình này' });
    }

    if (!itinerary.collaborators) {
      itinerary.collaborators = [];
    }

    const alreadyCollaborator = itinerary.collaborators.some(
      (c) => String(c.user?._id || c.user) === String(req.user._id)
    );

    if (!alreadyCollaborator) {
      itinerary.collaborators.push({
        user: req.user._id,
        permission: invitation.permission || 'view',
        joinedAt: new Date()
      });
      await itinerary.save();
    }

    invitation.status = 'accepted';
    invitation.isRead = true;
    await invitation.save();

    return res.json({
      success: true,
      message: `Đã chấp nhận lời mời cộng tác lịch trình "${itinerary.title}"`,
      invitation
    });
  } catch (error) {
    console.error('Respond invitation error:', error);
    return res.status(500).json({ success: false, message: 'Không thể xử lý lời mời' });
  }
};
