import ActivityLog from '../models/ActivityLog.js';

export const getActivityLogs = async (req, res) => {
  try {
    const {
      search,
      action,
      targetType,
      page = 1,
      limit = 15
    } = req.query;

    const query = {};

    if (action && action !== 'all') {
      query.action = action;
    }

    if (targetType && targetType !== 'all') {
      query.targetType = targetType;
    }

    if (search && search.trim()) {
      const regex = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      query.$or = [
        { adminUsername: regex },
        { adminEmail: regex },
        { details: regex }
      ];
    }

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 15, 1), 100);
    const skip = (pageNum - 1) * limitNum;

    const total = await ActivityLog.countDocuments(query);
    const logs = await ActivityLog.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    res.json({
      success: true,
      logs: logs.map((log) => ({
        id: log._id,
        adminId: log.adminId,
        adminUsername: log.adminUsername,
        adminEmail: log.adminEmail,
        action: log.action,
        targetType: log.targetType,
        targetId: log.targetId,
        details: log.details,
        ipAddress: log.ipAddress,
        createdAt: log.createdAt
      })),
      pagination: {
        total,
        totalPages: Math.ceil(total / limitNum) || 1,
        page: pageNum,
        limit: limitNum
      }
    });
  } catch (error) {
    console.error('Get activity logs error:', error);
    res.status(500).json({
      success: false,
      message: 'Không thể tải nhật ký hoạt động'
    });
  }
};
