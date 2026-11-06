import User from '../models/User.js';
import Destination from '../models/Destination.js';
import DestinationCategory from '../models/DestinationCategory.js';
import Tour from '../models/Tour.js';
import Itinerary from '../models/Itinerary.js';
import Role from '../models/Role.js';

/**
 * Build aggregate platform statistics for staff.
 * @route GET /api/stats/platform
 * @access Staff
 */
const getPlatformStats = async (req, res) => {
  try {
    const [totalUsers, usersByRole, totalDestinations, destinationsByStatus, totalCategories,
      totalTours, totalItineraries, activitiesTotal, recentUsers, recentDestinations, recentItineraries] = await Promise.all([
      User.countDocuments(),
      User.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]),
      Destination.countDocuments({ isDeleted: { $ne: true } }),
      Destination.aggregate([
        { $match: { isDeleted: { $ne: true } } },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      DestinationCategory.countDocuments(),
      Tour.countDocuments({ isDeleted: { $ne: true } }),
      Itinerary.countDocuments(),
      Itinerary.aggregate([{ $unwind: '$activities' }, { $count: 'total' }]),
      User.find().sort({ createdAt: -1 }).limit(5).select('username email role createdAt'),
      Destination.find({ isDeleted: { $ne: true } }).sort({ createdAt: -1 }).limit(5).select('name location status isPopular averageRating createdAt'),
      Itinerary.find().sort({ updatedAt: -1 }).limit(5).populate('owner', 'username email').select('title owner startDate endDate budget updatedAt')
    ]);

    return res.json({
      success: true,
      stats: {
        users: {
          total: totalUsers,
          byRole: usersByRole
        },
        destinations: {
          total: totalDestinations,
          byStatus: destinationsByStatus,
          popularCount: await Destination.countDocuments({
            isPopular: true,
            isDeleted: { $ne: true }
          })
        },
        categories: totalCategories,
        tours: {
          total: totalTours
        },
        itineraries: {
          total: totalItineraries,
          activitiesTotal: activitiesTotal[0]?.total || 0
        },
        recent: {
          users: recentUsers,
          destinations: recentDestinations,
          itineraries: recentItineraries
        }
      }
    });
  } catch (error) {
    console.error('Get platform stats error:', error);
    return res.status(500).json({ success: false, message: 'Không thể tải thống kê' });
  }
};

const DEFAULT_ROLE_LABELS = {
  admin: 'Quản trị viên',
  staff: 'Nhân viên',
  tourProvider: 'Tour Provider',
  customer: 'Khách hàng'
};

const DEFAULT_ROLE_BADGE_CLASSES = {
  admin: 'bg-warning text-dark',
  staff: 'bg-info text-dark',
  tourProvider: 'bg-primary',
  customer: 'bg-secondary'
};

/**
 * Build system dashboard statistics for Admin.
 * @route GET /api/stats/admin
 * @access Admin
 */
const getAdminDashboardStats = async (req, res) => {
  try {
    const rawMonths = parseInt(req.query.months, 10);
    const monthsCount = Number.isInteger(rawMonths) && rawMonths >= 3 && rawMonths <= 24 ? rawMonths : 12;

    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth() - (monthsCount - 1), 1, 0, 0, 0, 0);

    const [
      totalAccounts,
      activeAccounts,
      disabledAccounts,
      rolesFromDb,
      userRoleAgg,
      monthlyAgg,
      recentUsers
    ] = await Promise.all([
      User.countDocuments({ isDeleted: { $ne: true } }),
      User.countDocuments({ isDeleted: { $ne: true }, isActive: { $ne: false } }),
      User.countDocuments({ isDeleted: { $ne: true }, isActive: false }),
      Role.find().lean(),
      User.aggregate([
        { $match: { isDeleted: { $ne: true } } },
        { $group: { _id: '$role', count: { $sum: 1 } } }
      ]),
      User.aggregate([
        { $match: { isDeleted: { $ne: true }, createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' }
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } }
      ]),
      User.find({ isDeleted: { $ne: true } })
        .sort({ createdAt: -1 })
        .limit(5)
        .select('username email role isActive createdAt')
        .lean()
    ]);

    // Build role ObjectId map
    const roleIdMap = new Map();
    rolesFromDb.forEach((r) => {
      roleIdMap.set(String(r._id), r.name);
    });

    // Group counts by resolved canonical role name
    const canonicalCounts = new Map();
    ['customer', 'staff', 'tourProvider', 'admin'].forEach((roleKey) => {
      canonicalCounts.set(roleKey, 0);
    });
    rolesFromDb.forEach((r) => {
      if (!canonicalCounts.has(r.name)) {
        canonicalCounts.set(r.name, 0);
      }
    });

    userRoleAgg.forEach((item) => {
      let rawRole = item._id ? String(item._id) : 'customer';
      if (rawRole === 'user') rawRole = 'customer';
      const resolved = roleIdMap.get(rawRole) || rawRole;
      canonicalCounts.set(resolved, (canonicalCounts.get(resolved) || 0) + item.count);
    });

    const rolesBreakdown = Array.from(canonicalCounts.entries()).map(([key, count]) => {
      const percentage = totalAccounts > 0 ? Number(((count / totalAccounts) * 100).toFixed(1)) : 0;
      return {
        key,
        name: key,
        label: DEFAULT_ROLE_LABELS[key] || key,
        badgeClass: DEFAULT_ROLE_BADGE_CLASSES[key] || 'bg-dark',
        count,
        percentage
      };
    }).sort((a, b) => b.count - a.count);

    // Build monthly registration series
    const monthMap = new Map();
    monthlyAgg.forEach((item) => {
      const key = `${item._id.year}-${String(item._id.month).padStart(2, '0')}`;
      monthMap.set(key, item.count);
    });

    const monthlyRegistrations = [];
    for (let i = 0; i < monthsCount; i += 1) {
      const d = new Date(startDate.getFullYear(), startDate.getMonth() + i, 1);
      const year = d.getFullYear();
      const month = d.getMonth() + 1;
      const key = `${year}-${String(month).padStart(2, '0')}`;
      const count = monthMap.get(key) || 0;
      monthlyRegistrations.push({
        year,
        month,
        key,
        label: `T${String(month).padStart(2, '0')}/${String(year).slice(-2)}`,
        fullLabel: `Tháng ${String(month).padStart(2, '0')}/${year}`,
        count,
        growth: 0
      });
    }

    // Calculate growth compared to previous month
    for (let i = 0; i < monthlyRegistrations.length; i += 1) {
      if (i === 0) {
        monthlyRegistrations[i].growth = 0;
      } else {
        const prev = monthlyRegistrations[i - 1].count;
        const curr = monthlyRegistrations[i].count;
        if (prev === 0 && curr === 0) {
          monthlyRegistrations[i].growth = 0;
        } else if (prev === 0) {
          monthlyRegistrations[i].growth = 100;
        } else {
          monthlyRegistrations[i].growth = Number((((curr - prev) / prev) * 100).toFixed(1));
        }
      }
    }

    const totalInPeriod = monthlyRegistrations.reduce((acc, m) => acc + m.count, 0);
    const currentMonthData = monthlyRegistrations[monthlyRegistrations.length - 1];
    const previousMonthData = monthlyRegistrations[monthlyRegistrations.length - 2] || { count: 0 };

    return res.json({
      success: true,
      stats: {
        summary: {
          totalAccounts,
          activeAccounts,
          disabledAccounts,
          activePercentage: totalAccounts > 0 ? Number(((activeAccounts / totalAccounts) * 100).toFixed(1)) : 0,
          disabledPercentage: totalAccounts > 0 ? Number(((disabledAccounts / totalAccounts) * 100).toFixed(1)) : 0
        },
        roles: rolesBreakdown,
        monthlyRegistrations,
        trend: {
          monthsCount,
          totalInPeriod,
          currentMonthCount: currentMonthData?.count || 0,
          previousMonthCount: previousMonthData?.count || 0,
          growthRate: currentMonthData?.growth || 0
        },
        recentAccounts: recentUsers.map((u) => ({
          id: u._id,
          username: u.username,
          email: u.email,
          role: u.role === 'user' ? 'customer' : roleIdMap.get(String(u.role)) || u.role,
          isActive: u.isActive !== false,
          createdAt: u.createdAt
        }))
      }
    });
  } catch (error) {
    console.error('Get admin dashboard stats error:', error);
    return res.status(500).json({ success: false, message: 'Không thể tải thống kê quản trị' });
  }
};

export { getPlatformStats, getAdminDashboardStats };
