import Review from '../models/Review.js';
import Tour from '../models/Tour.js';

export const getReviewsByTour = async (req, res) => {
  try {
    const { tourId } = req.params;

    const tour = await Tour.findById(tourId);
    if (!tour) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy tour' });
    }

    const reviews = await Review.find({ tourId, status: { $ne: 'rejected' } })
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

export const getAllReviewsForModeration = async (req, res) => {
  try {
    const {
      status = 'all',
      search,
      page = 1,
      limit = 10
    } = req.query;

    const query = {};
    if (status && status !== 'all') {
      query.status = status;
    }

    if (search) {
      const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      query.comment = regex;
    }

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 50);
    const skip = (pageNum - 1) * limitNum;

    const total = await Review.countDocuments(query);
    const reviews = await Review.find(query)
      .populate('userId', 'username email')
      .populate('tourId', 'title location departureLocation')
      .populate('moderatedBy', 'username email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    res.status(200).json({
      success: true,
      count: reviews.length,
      total,
      totalPages: Math.ceil(total / limitNum),
      currentPage: pageNum,
      data: reviews
    });
  } catch (error) {
    console.error('Error fetching reviews for moderation:', error);
    res.status(500).json({
      success: false,
      message: 'Không thể tải danh sách đánh giá kiểm duyệt'
    });
  }
};

export const moderateReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, moderationReason } = req.body;

    if (!['approved', 'rejected', 'flagged', 'pending'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Trạng thái kiểm duyệt không hợp lệ'
      });
    }

    const review = await Review.findById(id);
    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy đánh giá'
      });
    }

    review.status = status;
    review.moderatedBy = req.user._id;
    review.moderationReason = typeof moderationReason === 'string' ? moderationReason.trim() : review.moderationReason;
    await review.save();

    // Recalculate average rating for approved/non-rejected reviews
    const tourId = review.tourId;
    const activeReviews = await Review.find({ tourId, status: { $ne: 'rejected' } });
    const totalReviews = activeReviews.length;
    const averageRating = totalReviews > 0
      ? Math.round((activeReviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews) * 10) / 10
      : 0;

    await Tour.findByIdAndUpdate(tourId, { averageRating });

    const populated = await Review.findById(id)
      .populate('userId', 'username email')
      .populate('tourId', 'title location departureLocation')
      .populate('moderatedBy', 'username email');

    res.status(200).json({
      success: true,
      message: 'Kiểm duyệt đánh giá thành công',
      data: populated,
      averageRating
    });
  } catch (error) {
    console.error('Error moderating review:', error);
    res.status(500).json({
      success: false,
      message: 'Không thể kiểm duyệt đánh giá'
    });
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
    const isManager = req.user.role === 'admin' || req.user.role === 'staff';
    if (!isOwner && !isManager) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền xóa đánh giá này'
      });
    }

    const tourId = review.tourId;
    await review.deleteOne();

    const remainingReviews = await Review.find({ tourId, status: { $ne: 'rejected' } });
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
