import Review from '../models/Review.js';
import Tour from '../models/Tour.js';
import { logActivity } from '../utils/activityLogger.js';
import { validationResult } from 'express-validator';

const VALID_REPORT_REASONS = [
  'Nội dung không phù hợp',
  'Thông tin sai lệch',
  'Spam hoặc quảng cáo',
  'Ngôn ngữ thô tục',
  'Khác'
];

const recalculateTourRating = async (tourId) => {
  const approvedReviews = await Review.find({ tourId, status: 'approved' }).select('rating');
  const totalReviews = approvedReviews.length;
  const averageRating = totalReviews > 0
    ? Math.round((approvedReviews.reduce((sum, review) => sum + review.rating, 0) / totalReviews) * 10) / 10
    : 0;

  await Tour.findByIdAndUpdate(tourId, { averageRating });
  return { averageRating, totalReviews };
};

export const reportReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason, details } = req.body;

    if (!reason || !VALID_REPORT_REASONS.includes(reason)) {
      return res.status(400).json({ success: false, message: 'Lý do báo cáo không hợp lệ' });
    }

    const review = await Review.findById(id);
    if (!review) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đánh giá' });
    }

    if (review.isReported) {
      return res.status(400).json({ success: false, message: 'Đánh giá này đã được báo cáo trước đó' });
    }

    review.isReported = true;
    review.reportReason = reason;
    review.reportDetails = details ? details.trim() : '';
    review.reportedBy = req.user._id;
    review.reportedAt = new Date();
    review.status = 'flagged';
    await review.save();
    const ratingSummary = await recalculateTourRating(review.tourId);

    res.status(200).json({
      success: true,
      message: 'Báo cáo vi phạm đã ghi nhận',
      ...ratingSummary
    });
  } catch (error) {
    console.error('Error reporting review:', error);
    res.status(500).json({ success: false, message: 'Không thể gửi báo cáo vi phạm' });
  }
};

export const getReviewsByTour = async (req, res) => {
  try {
    const { tourId } = req.params;

    const tour = await Tour.findById(tourId);
    if (!tour) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy tour' });
    }

    const reviews = await Review.find({ tourId, status: 'approved' })
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
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: errors.array()[0].msg,
      errors: errors.array()
    });
  }

  try {
    const { id } = req.params;
    const { status, moderationReason } = req.body;

    const review = await Review.findById(id);
    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy đánh giá'
      });
    }

    review.status = status;
    review.moderatedBy = req.user._id;
    review.moderationReason = ['rejected', 'flagged'].includes(status)
      ? moderationReason.trim()
      : '';
    await review.save();

    const { averageRating, totalReviews } = await recalculateTourRating(review.tourId);

    const populated = await Review.findById(id)
      .populate('userId', 'username email')
      .populate('tourId', 'title location departureLocation')
      .populate('moderatedBy', 'username email');

    if (req.user?.role === 'admin') {
      await logActivity({
        admin: req.user,
        action: 'MODERATE_REVIEW',
        targetType: 'Review',
        targetId: review._id,
        details: `Kiểm duyệt đánh giá thành trạng thái "${status}"${moderationReason ? ` (Lý do: ${moderationReason})` : ''}`,
        req
      });
    }

    res.status(200).json({
      success: true,
      message: 'Kiểm duyệt đánh giá thành công',
      data: populated,
      averageRating,
      totalReviews
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

    const { averageRating, totalReviews } = await recalculateTourRating(tourId);

    if (req.user?.role === 'admin') {
      await logActivity({
        admin: req.user,
        action: 'DELETE_REVIEW',
        targetType: 'Review',
        targetId: id,
        details: `Xóa vĩnh viễn đánh giá ID "${id}"`,
        req
      });
    }

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
