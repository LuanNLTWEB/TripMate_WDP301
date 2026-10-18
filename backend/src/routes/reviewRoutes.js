import { Router } from 'express';
import {
  getReviewsByTour,
  deleteReview,
  getAllReviewsForModeration,
  moderateReview,
  reportReview
} from '../controllers/reviewController.js';
import { protect, authorize } from '../middleware/auth.js';
import { moderateReviewValidation } from '../middleware/validate.js';

const router = Router();

router.get('/tours/:tourId', getReviewsByTour);
router.get('/moderation', protect, authorize('admin', 'staff'), getAllReviewsForModeration);
router.post('/:id/report', protect, authorize('customer'), reportReview);
router.patch('/:id/moderate', protect, authorize('admin', 'staff'), moderateReviewValidation, moderateReview);
router.delete('/:id', protect, authorize('customer', 'admin', 'staff'), deleteReview);

export default router;
