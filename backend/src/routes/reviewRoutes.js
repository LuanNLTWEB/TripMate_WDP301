import { Router } from 'express';
import {
  getReviewsByTour,
  getProviderReviewsByTour,
  deleteReview,
  getAllReviewsForModeration,
  getReportedReviews,
  getReviewEligibility,
  createReview,
  moderateReview,
  hideReview,
  reportReview,
  restoreReview,
  updateReview,
  voteHelpfulReview,
  replyReview,
  updateReviewReply,
  deleteReviewReply
} from '../controllers/reviewController.js';
import { protect, authorize } from '../middleware/auth.js';
import { ACCESS_ROLES } from '../config/accessControl.js';
import {
  moderateReviewValidation,
  reportedReviewListValidation,
  reviewEligibilityValidation,
  createReviewValidation,
  updateReviewValidation,
  restoreReviewValidation,
  hideReviewValidation,
  voteHelpfulValidation,
  replyReviewValidation,
  deleteReplyReviewValidation
} from '../middleware/validate.js';

const router = Router();

router.get('/tours/:tourId/eligibility', protect, authorize(...ACCESS_ROLES.CUSTOMER_ONLY), reviewEligibilityValidation, getReviewEligibility);
router.post('/tours/:tourId', protect, authorize(...ACCESS_ROLES.CUSTOMER_ONLY), createReviewValidation, createReview);
router.get('/tours/:tourId', protect, authorize(...ACCESS_ROLES.CUSTOMER_ONLY), getReviewsByTour);
// START Reply to Tour Review
router.get('/provider/tours/:tourId', protect, authorize(...ACCESS_ROLES.PROVIDER_ONLY), reviewEligibilityValidation, getProviderReviewsByTour);
router.post('/:id/reply', protect, authorize(...ACCESS_ROLES.PROVIDER_ONLY), replyReviewValidation, replyReview);
router.put('/:id/reply', protect, authorize(...ACCESS_ROLES.PROVIDER_ONLY), replyReviewValidation, updateReviewReply);
router.delete('/:id/reply', protect, authorize(...ACCESS_ROLES.PROVIDER_ONLY), deleteReplyReviewValidation, deleteReviewReply);
// END Reply to Tour Review
router.get('/moderation', protect, authorize(...ACCESS_ROLES.STAFF_ONLY), getAllReviewsForModeration);
router.get('/reported', protect, authorize(...ACCESS_ROLES.STAFF_ONLY), reportedReviewListValidation, getReportedReviews);
// START UC-91 Report Inappropriate Review
router.post('/:id/report', protect, authorize(...ACCESS_ROLES.CUSTOMER_ONLY), reportReview);
// END UC-91 Report Inappropriate Review
router.post('/:id/vote-helpful', protect, authorize(...ACCESS_ROLES.CUSTOMER_ONLY), voteHelpfulValidation, voteHelpfulReview);
router.patch('/:id/moderate', protect, authorize(...ACCESS_ROLES.STAFF_ONLY), moderateReviewValidation, moderateReview);
router.patch('/:id/hide', protect, authorize(...ACCESS_ROLES.STAFF_ONLY), hideReviewValidation, hideReview);
// START UC-95 Restore Review
// PATCH /api/reviews/:id/restore - chỉ staff được khôi phục đánh giá đã xóa mềm.
router.patch('/:id/restore', protect, authorize(...ACCESS_ROLES.STAFF_ONLY), restoreReviewValidation, restoreReview);
// END UC-95 Restore Review
// START UC-89 Update Tour Review
// PUT /api/reviews/:id - chỉ customer (tác giả) sửa đánh giá của mình.
router.put('/:id', protect, authorize(...ACCESS_ROLES.CUSTOMER_ONLY), updateReviewValidation, updateReview);
// END UC-89 Update Tour Review
router.delete('/:id', protect, authorize(...ACCESS_ROLES.CUSTOMER_ONLY), deleteReview);

export default router;
