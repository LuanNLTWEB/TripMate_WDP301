/**
 * Reporting & Analytics — use case do Toan phụ trách
 *  - UC-102 View Platform Statistics
 */
import User from '../models/User.js';
import Destination from '../models/Destination.js';
import DestinationCategory from '../models/DestinationCategory.js';
import Tour from '../models/Tour.js';
import Itinerary from '../models/Itinerary.js';
import Role from '../models/Role.js';
import Booking from '../models/Booking.js';

/**
 * Build aggregate platform statistics for staff.
 * @route GET /api/stats/platform
 * @access Staff
 */
// START UC-102 View Platform Statistics
/**
 * UC-102 – View Platform Statistics (staff xem số liệu tổng hợp của nền tảng).
 *
 * Phần phức tạp:
 *  - Toàn bộ truy vấn đếm/aggregate chạy song song bằng Promise.all để giảm thời
 *    gian chờ; mỗi truy vấn là một phép đếm độc lập nên không phụ thuộc nhau.
 *  - Các số liệu điểm đến đều lọc isDeleted: { $ne: true } để khớp với danh mục
 *    đang hiển thị (BR-36); riêng tour/itinerary đếm toàn bộ vì phục vụ thống kê.
 *  - Số hoạt động dùng aggregate $unwind + $count vì activities là mảng con,
 *    countDocuments không đếm được phần tử bên trong.
 *  - Ba danh sách "recent" bị giới hạn 5 bản ghi và chỉ select các field cần cho
 *    bảng tổng quan, tránh trả cả document nặng.
 *  - popularCount là truy vấn bổ sung chạy sau Promise.all (phụ thuộc dữ liệu đã
 *    có, không thể gộp vào cùng batch).
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
      DestinationCategory.countDocuments({ isDeleted: { $ne: true } }),
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

// END UC-102 View Platform Statistics

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

// START UC-70 View Provider Revenue Statistics
/**
 * Thống kê doanh thu và báo cáo hoạt động kinh doanh của nhà cung cấp.
 * @route GET /api/stats/provider-revenue
 * @access Provider (tourProvider)
 */
export const getProviderRevenueStats = async (req, res) => {
  try {
    const providerId = req.user._id;

    // 1. Lấy tất cả tour đang hoạt động hoặc đã tạo của provider này
    const providerTours = await Tour.find({
      providerId,
      isDeleted: { $ne: true }
    }).select('_id title price duration availableSeats');

    const providerTourIds = providerTours.map((t) => t._id);

    if (providerTourIds.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          tours: [],
          summary: {
            totalCollectedRevenue: 0,
            totalConfirmedRevenue: 0,
            totalCancelledRevenue: 0,
            totalCompletedBookings: 0,
            totalConfirmedBookings: 0,
            totalCancelledBookings: 0,
            totalPassengersServed: 0
          },
          timeSeries: [],
          revenueByTour: [],
          recentTransactions: []
        }
      });
    }

    // 2. Xử lý bộ lọc thời gian
    const { timeRange = '30_days', tourId, startDate, endDate } = req.query;
    const now = new Date();
    let dateFilter = null;

    if (timeRange === '7_days') {
      const past = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      dateFilter = { $gte: past };
    } else if (timeRange === '30_days') {
      const past = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      dateFilter = { $gte: past };
    } else if (timeRange === 'this_month') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      dateFilter = { $gte: startOfMonth };
    } else if (timeRange === 'this_year') {
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      dateFilter = { $gte: startOfYear };
    } else if (timeRange === 'custom' && (startDate || endDate)) {
      dateFilter = {};
      if (startDate) dateFilter.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        dateFilter.$lte = end;
      }
    }

    // 3. Xây dựng query cho bookings
    let targetTourIds = providerTourIds;
    if (tourId && tourId !== 'all') {
      const matched = providerTourIds.some((id) => String(id) === String(tourId));
      if (!matched) {
        return res.status(403).json({
          success: false,
          message: 'Bạn không có quyền xem thống kê của tour này'
        });
      }
      targetTourIds = [tourId];
    }

    const bookingQuery = {
      tourId: { $in: targetTourIds }
    };

    if (dateFilter) {
      bookingQuery.createdAt = dateFilter;
    }

    // 4. Truy vấn các đơn đặt tour phù hợp
    const bookings = await Booking.find(bookingQuery)
      .populate('tourId', 'title price')
      .populate('customerId', 'username email')
      .sort({ createdAt: -1 });

    // 5. Tính toán các chỉ số KPI
    let totalCollectedRevenue = 0;
    let totalConfirmedRevenue = 0;
    let totalCancelledRevenue = 0;
    let totalCompletedBookings = 0;
    let totalConfirmedBookings = 0;
    let totalCancelledBookings = 0;
    let totalPassengersServed = 0;

    const tourStatsMap = new Map();
    providerTours.forEach((t) => {
      tourStatsMap.set(String(t._id), {
        tourId: t._id,
        title: t.title,
        price: t.price,
        collectedRevenue: 0,
        confirmedRevenue: 0,
        completedBookings: 0,
        passengers: 0
      });
    });

    const timeSeriesMap = new Map();

    bookings.forEach((b) => {
      const price = b.totalPrice || 0;
      const people = b.numberOfPeople || 1;
      const tid = String(b.tourId?._id || b.tourId);
      const isCollected = ['paid', 'checked_in', 'completed'].includes(b.status) || Boolean(b.paidAt);
      const isConfirmed = b.status === 'confirmed';
      const isCancelled = b.status === 'cancelled';

      if (isCollected) {
        totalCollectedRevenue += price;
        totalCompletedBookings += 1;
        totalPassengersServed += people;
      } else if (isConfirmed) {
        totalConfirmedRevenue += price;
        totalConfirmedBookings += 1;
      } else if (isCancelled) {
        totalCancelledRevenue += price;
        totalCancelledBookings += 1;
      }

      if (tourStatsMap.has(tid)) {
        const item = tourStatsMap.get(tid);
        if (isCollected) {
          item.collectedRevenue += price;
          item.completedBookings += 1;
          item.passengers += people;
        } else if (isConfirmed) {
          item.confirmedRevenue += price;
        }
      }

      const dateKey = new Date(b.createdAt).toISOString().split('T')[0];
      if (!timeSeriesMap.has(dateKey)) {
        timeSeriesMap.set(dateKey, { date: dateKey, revenue: 0, bookings: 0 });
      }
      if (isCollected) {
        const point = timeSeriesMap.get(dateKey);
        point.revenue += price;
        point.bookings += 1;
      }
    });

    const timeSeries = Array.from(timeSeriesMap.values())
      .sort((a, b) => a.date.localeCompare(b.date));

    const revenueByTour = Array.from(tourStatsMap.values())
      .filter((item) => item.collectedRevenue > 0 || item.confirmedRevenue > 0 || !tourId || tourId === 'all')
      .sort((a, b) => b.collectedRevenue - a.collectedRevenue);

    const recentTransactions = bookings.slice(0, 20).map((b) => ({
      _id: b._id,
      tourTitle: b.tourId?.title || 'Tour du lịch',
      customerName: b.fullName || b.customerId?.username || 'Khách hàng',
      customerEmail: b.email || b.customerId?.email || '',
      phone: b.phone || '',
      numberOfPeople: b.numberOfPeople,
      totalPrice: b.totalPrice,
      paymentMethod: b.paymentMethod || 'cash',
      status: b.status,
      departureDate: b.departureDate,
      paidAt: b.paidAt,
      createdAt: b.createdAt
    }));

    return res.status(200).json({
      success: true,
      data: {
        tours: providerTours.map((t) => ({ _id: t._id, title: t.title })),
        summary: {
          totalCollectedRevenue,
          totalConfirmedRevenue,
          totalCancelledRevenue,
          totalCompletedBookings,
          totalConfirmedBookings,
          totalCancelledBookings,
          totalPassengersServed
        },
        timeSeries,
        revenueByTour,
        recentTransactions
      }
    });
  } catch (error) {
    console.error('Get provider revenue stats error:', error);
    return res.status(500).json({
      success: false,
      message: 'Không thể tải thống kê doanh thu nhà cung cấp'
    });
  }
};
// END UC-70 View Provider Revenue Statistics

export { getPlatformStats, getAdminDashboardStats };
