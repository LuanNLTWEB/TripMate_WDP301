import ActivityLog from '../models/ActivityLog.js';

export const logActivity = async ({
  admin,
  action,
  targetType,
  targetId = null,
  details,
  req = null
}) => {
  try {
    if (!admin) return;

    let ipAddress = '';
    if (req) {
      const forwarded = req.headers['x-forwarded-for'];
      ipAddress = forwarded
        ? (Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0].trim())
        : (req.socket?.remoteAddress || req.ip || '');
    }

    await ActivityLog.create({
      adminId: admin._id || admin.id,
      adminUsername: admin.username,
      adminEmail: admin.email,
      action,
      targetType,
      targetId: targetId ? String(targetId) : undefined,
      details,
      ipAddress: ipAddress || undefined
    });
  } catch (error) {
    console.error('Lỗi khi ghi nhật ký hoạt động:', error);
  }
};
