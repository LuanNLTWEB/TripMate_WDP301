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

export const deleteReview = async (req, res) => {
  try {
    const { id } = req.params;

    const review = await Review.findById(id);
    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy đánh giá'
      });
    }

    const isOwner = review.userId.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền xóa đánh giá này'
      });
    }

    const tourId = review.tourId;
    await review.deleteOne();

    const remainingReviews = await Review.find({ tourId });
    const totalReviews = remainingReviews.length;
    const averageRating = totalReviews > 0
      ? Math.round((remainingReviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews) * 10) / 10
      : 0;

    await Tour.findByIdAndUpdate(tourId, { averageRating });

    res.status(200).json({
      success: true,
      message: 'Đã xóa đánh giá thành công',
      reviewId: id,
      averageRating,
      totalReviews
    });
  } catch (error) {
    console.error('Error deleting review:', error);
    res.status(500).json({
      success: false,
      message: 'Không thể xóa đánh giá'
    });
  }
};
