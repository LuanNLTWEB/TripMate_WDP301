import { Router } from 'express';
import {
  getReviewsByTour,
  deleteReview,
  getAllReviewsForModeration,
  getReportedReviews,
  getReviewEligibility,
  createReview,
  moderateReview,
  hideReview,
  reportReview,
  restoreReview,
  updateReview
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
  hideReviewValidation
} from '../middleware/validate.js';

const router = Router();

router.get('/tours/:tourId/eligibility', protect, authorize(...ACCESS_ROLES.CUSTOMER_ONLY), reviewEligibilityValidation, getReviewEligibility);
router.post('/tours/:tourId', protect, authorize(...ACCESS_ROLES.CUSTOMER_ONLY), createReviewValidation, createReview);
router.get('/tours/:tourId', protect, authorize(...ACCESS_ROLES.CUSTOMER_ONLY), getReviewsByTour);
router.get('/moderation', protect, authorize(...ACCESS_ROLES.STAFF_ONLY), getAllReviewsForModeration);
router.get('/reported', protect, authorize(...ACCESS_ROLES.STAFF_ONLY), reportedReviewListValidation, getReportedReviews);
router.post('/:id/report', protect, authorize(...ACCESS_ROLES.CUSTOMER_ONLY), reportReview);
router.patch('/:id/moderate', protect, authorize(...ACCESS_ROLES.STAFF_ONLY), moderateReviewValidation, moderateReview);
router.patch('/:id/hide', protect, authorize(...ACCESS_ROLES.STAFF_ONLY), hideReviewValidation, hideReview);
router.patch('/:id/restore', protect, authorize(...ACCESS_ROLES.STAFF_ONLY), restoreReviewValidation, restoreReview);
router.put('/:id', protect, authorize(...ACCESS_ROLES.CUSTOMER_ONLY), updateReviewValidation, updateReview);
router.delete('/:id', protect, authorize(...ACCESS_ROLES.CUSTOMER_ONLY), deleteReview);

export default router;
