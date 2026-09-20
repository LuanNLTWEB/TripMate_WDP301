import Review from '../models/Review.js';
import Tour from '../models/Tour.js';

export const getReviewsByTour = async (req, res) => {
  try {
    const { tourId } = req.params;

    const tour = await Tour.findById(tourId);
    if (!tour) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy tour' });
    }

    const reviews = await Review.find({ tourId })
      .populate('userId', 'username')
      .sort({ createdAt: -1 });

    const totalReviews = reviews.length;
    const averageRating = totalReviews > 0
      ? Math.round((reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews) * 10) / 10
      : 0;

    res.status(200).json({
      success: true,
      reviews,
      averageRating,
      totalReviews
    });
  } catch (error) {
    console.error('Error fetching reviews:', error);
    res.status(500).json({ success: false, message: 'Không thể tải danh sách đánh giá' });
  }
};
