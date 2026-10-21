import Review from '../models/Review.js';
import Tour from '../models/Tour.js';
import Booking from '../models/Booking.js';
import { logActivity } from '../utils/activityLogger.js';
import { validationResult } from 'express-validator';

const VALID_REPORT_REASONS = [
  'Nội dung không phù hợp',
  'Thông tin sai lệch',
  'Spam hoặc quảng cáo',
  'Ngôn ngữ thô tục',
  'Khác'
];

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const REVIEW_ELIGIBILITY_MESSAGES = {
  eligible: 'Bạn có thể đánh giá tour đã hoàn thành.',
  already_reviewed: 'Bạn đã đánh giá tour này.',
  booking_not_confirmed: 'Bạn cần có booking đã được xác nhận để đánh giá tour.',
  trip_not_completed: 'Bạn có thể đánh giá sau khi chuyến đi kết thúc.'
};

export const parseTourDurationDays = (duration) => {
  const match = String(duration || '').match(/(\d+)\s*(?:ngày|day|days)/i);
  const parsedDays = match ? Number.parseInt(match[1], 10) : 1;
  return Number.isFinite(parsedDays) && parsedDays > 0 ? Math.min(parsedDays, 365) : 1;
};

export const calculateTripEndDate = (departureDate, duration) => {
  const tripEndDate = new Date(departureDate);
  if (Number.isNaN(tripEndDate.getTime())) return null;

  tripEndDate.setUTCDate(tripEndDate.getUTCDate() + parseTourDurationDays(duration));
  return tripEndDate;
};

const buildEligibility = (eligible, reason, extra = {}) => ({
  eligible,
  reason,
  message: REVIEW_ELIGIBILITY_MESSAGES[reason],
  ...extra
});

const evaluateReviewEligibility = async (tourId, userId, now = new Date()) => {
  const tour = await Tour.findById(tourId);
  if (!tour) return { tour: null };

  const existingReview = await Review.findOne({ tourId, userId });
  if (existingReview) {
    return {
      tour,
      ...buildEligibility(false, 'already_reviewed', { reviewId: existingReview._id })
    };
  }

  const confirmedBookings = await Booking.find({
    tourId,
    customerId: userId,
    status: 'confirmed'
  }).sort({ departureDate: -1 });

  if (confirmedBookings.length === 0) {
    return { tour, ...buildEligibility(false, 'booking_not_confirmed') };
  }

  const bookingsWithEndDate = confirmedBookings
    .map((booking) => ({
      booking,
      tripEndDate: calculateTripEndDate(booking.departureDate, tour.duration)
    }))
    .filter((item) => item.tripEndDate);
  const completedBooking = bookingsWithEndDate.find((item) => item.tripEndDate <= now);

  if (completedBooking) {
    return {
      tour,
      ...buildEligibility(true, 'eligible', {
        bookingId: completedBooking.booking._id,
        completedAt: completedBooking.tripEndDate
      })
    };
  }

  const nextEligibleDate = bookingsWithEndDate
    .map((item) => item.tripEndDate)
    .sort((first, second) => first - second)[0];

  return {
    tour,
    ...buildEligibility(false, 'trip_not_completed', {
      eligibleAt: nextEligibleDate || null
    })
  };
};

const recalculateTourRating = async (tourId) => {
  const approvedReviews = await Review.find({ tourId, status: 'approved', isDeleted: false }).select('rating');
  const totalReviews = approvedReviews.length;
  const averageRating = totalReviews > 0
    ? Math.round((approvedReviews.reduce((sum, review) => sum + review.rating, 0) / totalReviews) * 10) / 10
    : 0;

  await Tour.findByIdAndUpdate(tourId, { averageRating });
  return { averageRating, totalReviews };
};

export const getReviewEligibility = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: errors.array()[0]?.msg || 'Mã tour không hợp lệ',
      errors: errors.array()
    });
  }

  try {
    const eligibility = await evaluateReviewEligibility(req.params.tourId, req.user._id);
    if (!eligibility.tour) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy tour' });
    }

    const { tour, ...data } = eligibility;
    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Error checking review eligibility:', error);
    return res.status(500).json({
      success: false,
      message: 'Không thể kiểm tra điều kiện đánh giá tour'
    });
  }
};

export const createReview = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: errors.array()[0]?.msg || 'Dữ liệu đánh giá không hợp lệ',
      errors: errors.array()
    });
  }

  try {
    const { tourId } = req.params;
    const eligibility = await evaluateReviewEligibility(tourId, req.user._id);

    if (!eligibility.tour) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy tour' });
    }

    if (!eligibility.eligible) {
      const statusCode = eligibility.reason === 'already_reviewed' ? 409 : 403;
      return res.status(statusCode).json({
        success: false,
        message: eligibility.message,
        reason: eligibility.reason,
        eligibleAt: eligibility.eligibleAt || null
      });
    }

    const review = await Review.create({
      userId: req.user._id,
      tourId,
      rating: req.body.rating,
      comment: req.body.comment.trim(),
      status: 'approved'
    });
    await review.populate('userId', 'username');

    const { averageRating, totalReviews } = await recalculateTourRating(tourId);
    return res.status(201).json({
      success: true,
      message: 'Đánh giá tour thành công.',
      data: review,
      averageRating,
      totalReviews
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({
        success: false,
        message: REVIEW_ELIGIBILITY_MESSAGES.already_reviewed,
        reason: 'already_reviewed'
      });
    }

    console.error('Error creating review:', error);
    return res.status(500).json({
      success: false,
      message: 'Không thể tạo đánh giá tour'
    });
  }
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

    const reviews = await Review.find({ tourId, status: 'approved', isDeleted: false })
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
      limit = 10,
      deleted = 'false'
    } = req.query;

// deleted=true liệt kê các đánh giá đã xóa mềm để nhân viên khôi phục lại được
// (UC-95). Mặc định vẫn là danh sách kiểm duyệt như cũ.
const wantDeleted = deleted === 'true';

const query = { isDeleted: wantDeleted };
      if (!wantDeleted && status && status !== 'all') {
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

export const getReportedReviews = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: errors.array()[0]?.msg || 'Bộ lọc báo cáo không hợp lệ',
      errors: errors.array()
    });
  }

  try {
    const {
      status = 'all',
      search = '',
      page = 1,
      limit = 10
    } = req.query;
    const pageNumber = Math.max(Number(page) || 1, 1);
    const pageSize = Math.min(Math.max(Number(limit) || 10, 1), 50);
    const query = { isReported: true, isDeleted: false };

    if (status !== 'all') {
      query.status = status;
    }

    const normalizedSearch = String(search).trim();
    if (normalizedSearch) {
      const regex = new RegExp(escapeRegex(normalizedSearch), 'i');
      query.$or = [
        { comment: regex },
        { reportReason: regex },
        { reportDetails: regex }
      ];
    }

    const [total, statusSummary] = await Promise.all([
      Review.countDocuments(query),
      Review.aggregate([
        { $match: { isReported: true, isDeleted: false } },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ])
    ]);
    const totalPages = Math.ceil(total / pageSize);
    const currentPage = totalPages > 0 ? Math.min(pageNumber, totalPages) : 1;
    const reviews = await Review.find(query)
      .populate('userId', 'username email')
      .populate('tourId', 'title location departureLocation destinationLocation')
      .populate('reportedBy', 'username email')
      .populate('moderatedBy', 'username email')
      .sort({ reportedAt: -1, createdAt: -1 })
      .skip((currentPage - 1) * pageSize)
      .limit(pageSize);

    const summary = statusSummary.reduce((result, item) => {
      result[item._id] = item.count;
      result.total += item.count;
      return result;
    }, {
      total: 0,
      pending: 0,
      flagged: 0,
      approved: 0,
      rejected: 0
    });

    return res.status(200).json({
      success: true,
      count: reviews.length,
      total,
      totalPages,
      currentPage,
      data: reviews,
      summary
    });
  } catch (error) {
    console.error('Error fetching reported reviews:', error);
    return res.status(500).json({
      success: false,
      message: 'Không thể tải danh sách đánh giá bị báo cáo'
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

      if (review.isDeleted) {
        return res.status(409).json({
          success: false,
          message: 'Đánh giá này đã bị xóa trước đó'
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

      // Xóa mềm: giữ lại bản ghi để UC-95 Restore Review có thể khôi phục,
      // đồng thời đánh giá biến mất khỏi mọi danh sách công khai.
      review.isDeleted = true;
      review.deletedAt = new Date();
      review.deletedBy = req.user._id;
      await review.save();

    const { averageRating, totalReviews } = await recalculateTourRating(tourId);

    if (req.user?.role === 'admin') {
      await logActivity({
        admin: req.user,
        action: 'DELETE_REVIEW',
        targetType: 'Review',
        targetId: id,
        details: `Xóa đánh giá ID "${id}" (giữ lại bản ghi để khôi phục được)`,
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

/**
 * Khôi phục một đánh giá đã bị xóa mềm (UC-95 - Restore Review)
 * @route PATCH /api/reviews/:id/restore
 * @access Private (staff, admin)
 */
export const restoreReview = async (req, res) => {
  try {
    const { id } = req.params;

    const review = await Review.findById(id);
    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy đánh giá'
      });
    }

    if (!review.isDeleted) {
      return res.status(409).json({
        success: false,
        message: 'Đánh giá này chưa bị xóa'
      });
    }

    review.isDeleted = false;
    review.deletedAt = null;
    review.deletedBy = null;
    // Đánh giá được khôi phục quay lại trạng thái chờ duyệt để nhân viên xem lại,
    // thay vì tự động xuất hiện lại trên trang công khai.
    review.status = 'pending';
    await review.save();

    const { averageRating, totalReviews } = await recalculateTourRating(review.tourId);

    const populated = await Review.findById(id)
      .populate('userId', 'username email')
      .populate('tourId', 'title location departureLocation');

    res.status(200).json({
      success: true,
      message: 'Khôi phục đánh giá thành công',
      data: populated,
      averageRating,
      totalReviews
    });
  } catch (error) {
    console.error('Error restoring review:', error);
    res.status(500).json({
      success: false,
      message: 'Không thể khôi phục đánh giá'
    });
  }
};

/**
 * Sửa đánh giá của chính khách hàng (UC-89 - Update Tour Review)
 * @route PUT /api/reviews/:id
 * @access Private (customer)
 */
export const updateReview = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: errors.array()[0]?.msg || 'Dữ liệu đánh giá không hợp lệ',
      errors: errors.array()
    });
  }

  try {
    const { id } = req.params;
    const { rating, comment } = req.body;

    const review = await Review.findById(id);
    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy đánh giá'
      });
    }

    if (review.isDeleted) {
      return res.status(409).json({
        success: false,
        message: 'Đánh giá này đã bị xóa'
      });
    }

    // BR-109 - chỉ tác giả được sửa, việc kiểm duyệt do nhân viên thực hiện riêng
    if (review.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền sửa đánh giá này'
      });
    }

    if (review.status === 'flagged') {
      return res.status(409).json({
        success: false,
        message: 'Đánh giá đang bị báo cáo, không thể sửa cho đến khi nhân viên kiểm duyệt xong'
      });
    }

    review.rating = Number(rating);
    review.comment = comment.trim();
    await review.save();

    const { averageRating, totalReviews } = await recalculateTourRating(review.tourId);

    const populated = await Review.findById(id)
      .populate('userId', 'username email')
      .populate('tourId', 'title location departureLocation');

    res.status(200).json({
      success: true,
      message: 'Cập nhật đánh giá thành công',
      data: populated,
      averageRating,
      totalReviews
    });
  } catch (error) {
    console.error('Error updating review:', error);
    res.status(500).json({
      success: false,
      message: 'Không thể cập nhật đánh giá'
    });
  }
};
