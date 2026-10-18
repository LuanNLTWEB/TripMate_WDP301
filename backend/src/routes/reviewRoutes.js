import { Router } from 'express';
import {
  getReviewsByTour,
  deleteReview,
  getAllReviewsForModeration,
  getReportedReviews,
  moderateReview,
  reportReview
} from '../controllers/reviewController.js';
import { protect, authorize } from '../middleware/auth.js';
import {
  moderateReviewValidation,
  reportedReviewListValidation
} from '../middleware/validate.js';

const router = Router();

router.get('/tours/:tourId', getReviewsByTour);
router.get('/moderation', protect, authorize('admin', 'staff'), getAllReviewsForModeration);
router.get('/reported', protect, authorize('admin', 'staff'), reportedReviewListValidation, getReportedReviews);
router.post('/:id/report', protect, authorize('customer'), reportReview);
router.patch('/:id/moderate', protect, authorize('admin', 'staff'), moderateReviewValidation, moderateReview);
router.delete('/:id', protect, authorize('customer', 'admin', 'staff'), deleteReview);

export default router;
