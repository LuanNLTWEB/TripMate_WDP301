import User from '../models/User.js';
import Destination from '../models/Destination.js';
import DestinationCategory from '../models/DestinationCategory.js';
import Tour from '../models/Tour.js';
import Itinerary from '../models/Itinerary.js';

/**
 * Build aggregate platform statistics for staff/admin.
 * @route GET /api/stats/platform
 * @access Staff, Admin
 */
const getPlatformStats = async (req, res) => {
  try {
    const [totalUsers, usersByRole, totalDestinations, destinationsByStatus, totalCategories,
      totalTours, totalItineraries, activitiesTotal, recentUsers, recentDestinations, recentItineraries] = await Promise.all([
      User.countDocuments(),
      User.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]),
      Destination.countDocuments(),
      Destination.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      DestinationCategory.countDocuments(),
      Tour.countDocuments(),
      Itinerary.countDocuments(),
      Itinerary.aggregate([{ $unwind: '$activities' }, { $count: 'total' }]),
      User.find().sort({ createdAt: -1 }).limit(5).select('username email role createdAt'),
      Destination.find().sort({ createdAt: -1 }).limit(5).select('name location status isPopular averageRating createdAt'),
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
          popularCount: await Destination.countDocuments({ isPopular: true })
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

export { getPlatformStats };