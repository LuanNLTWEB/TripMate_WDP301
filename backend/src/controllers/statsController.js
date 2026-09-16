import User from '../models/User.js';
import Destination from '../models/Destination.js';
import Itinerary from '../models/Itinerary.js';

/**
 * Aggregate platform data for the staff statistics dashboard.
 * @route GET /api/stats/platform
 * @access Staff, Admin
 */
export const getPlatformStats = async (req, res) => {
  try {
    const [
      totalUsers,
      usersByRole,
      totalDestinations,
      destinationsByStatus,
      totalItineraries,
      itinerariesWithActivities,
      activityCount,
      recentUsers,
      recentDestinations,
      recentItineraries
    ] = await Promise.all([
      User.countDocuments({}),
      User.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]),
      Destination.countDocuments({}),
      Destination.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      Itinerary.countDocuments({}),
      Itinerary.countDocuments({ 'activities.0': { $exists: true } }),
      Itinerary.aggregate([
        { $unwind: '$activities' },
        { $count: 'total' }
      ]),
      User.find({}).sort({ createdAt: -1 }).limit(5).select('username email role createdAt'),
      Destination.find({}).sort({ createdAt: -1 }).limit(5).select('name category status createdAt'),
      Itinerary.find({})
        .sort({ updatedAt: -1 })
        .limit(5)
        .select('title owner updatedAt')
        .populate('owner', 'username')
    ]);

    return res.json({
      success: true,
      stats: {
        users: {
          total: totalUsers,
          byRole: Object.fromEntries(usersByRole.map((entry) => [entry._id, entry.count]))
        },
        destinations: {
          total: totalDestinations,
          byStatus: Object.fromEntries(destinationsByStatus.map((entry) => [entry._id, entry.count]))
        },
        itineraries: {
          total: totalItineraries,
          withActivities: itinerariesWithActivities,
          activities: activityCount[0]?.total || 0
        },
        recent: {
          users: recentUsers,
          destinations: recentDestinations,
          itineraries: recentItineraries
        }
      }
    });
  } catch (error) {
    console.error('Platform statistics error:', error);
    return res.status(500).json({ success: false, message: 'Unable to load platform statistics' });
  }
};