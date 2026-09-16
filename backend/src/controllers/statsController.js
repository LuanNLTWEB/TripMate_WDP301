import User from '../models/User.js';
import Destination from '../models/Destination.js';
import Itinerary from '../models/Itinerary.js';

/**
 * Return aggregated platform statistics for the staff dashboard.
 * @route GET /api/stats/platform
 * @access Staff, Admin
 */
export const getPlatformStats = async (_req, res) => {
  try {
    const [
      totalUsers,
      totalDestinations,
      totalItineraries,
      usersByRole,
      destinationsByStatus,
      popularDestinations
    ] = await Promise.all([
      User.countDocuments({ isDeleted: { $ne: true } }),
      Destination.countDocuments(),
      Itinerary.countDocuments(),
      User.aggregate([
        { $match: { isDeleted: { $ne: true } } },
        { $group: { _id: '$role', count: { $sum: 1 } } },
        { $sort: { _id: 1 } }
      ]),
      Destination.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
        { $sort: { _id: 1 } }
      ]),
      Destination.countDocuments({ isPopular: true })
    ]);

    const totalActivities = await Itinerary.aggregate([
      { $unwind: '$activities' },
      { $count: 'total' }
    ]);

    const recentUsers = await User.find({ isDeleted: { $ne: true } })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('username email role isActive createdAt');

    const recentDestinations = await Destination.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('name location status createdAt');

    const recentItineraries = await Itinerary.find()
      .sort({ updatedAt: -1 })
      .limit(5)
      .select('title owner createdAt updatedAt')
      .populate('owner', 'username email');

    return res.json({
      success: true,
      stats: {
        users: {
          total: totalUsers,
          byRole: usersByRole.reduce((acc, { _id, count }) => {
            acc[_id] = count;
            return acc;
          }, {})
        },
        destinations: {
          total: totalDestinations,
          popular: popularDestinations,
          byStatus: destinationsByStatus.reduce((acc, { _id, count }) => {
            acc[_id] = count;
            return acc;
          }, {})
        },
        itineraries: {
          total: totalItineraries,
          totalActivities: totalActivities[0]?.total || 0
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
    return res.status(500).json({ success: false, message: 'Unable to load platform statistics' });
  }
};
