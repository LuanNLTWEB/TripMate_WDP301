import { Router } from 'express';
import {
  getReviewsByTour,
  deleteReview,
  getAllReviewsForModeration,
  getReportedReviews,
  getReviewEligibility,
  createReview,
  moderateReview,
  reportReview,
  restoreReview,
  updateReview
} from '../controllers/reviewController.js';
import { protect, authorize } from '../middleware/auth.js';
import {
  moderateReviewValidation,
  reportedReviewListValidation,
  reviewEligibilityValidation,
  createReviewValidation,
  updateReviewValidation,
  restoreReviewValidation
} from '../middleware/validate.js';

const router = Router();

router.get('/tours/:tourId/eligibility', protect, authorize('customer'), reviewEligibilityValidation, getReviewEligibility);
router.post('/tours/:tourId', protect, authorize('customer'), createReviewValidation, createReview);
router.get('/tours/:tourId', getReviewsByTour);
router.get('/moderation', protect, authorize('admin', 'staff'), getAllReviewsForModeration);
router.get('/reported', protect, authorize('admin', 'staff'), reportedReviewListValidation, getReportedReviews);
router.post('/:id/report', protect, authorize('customer'), reportReview);
router.patch('/:id/moderate', protect, authorize('admin', 'staff'), moderateReviewValidation, moderateReview);
router.patch('/:id/restore', protect, authorize('staff'), restoreReviewValidation, restoreReview);
router.put('/:id', protect, authorize('customer'), updateReviewValidation, updateReview);
router.delete('/:id', protect, authorize('customer', 'admin', 'staff'), deleteReview);

export default router;