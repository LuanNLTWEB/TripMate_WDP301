import { Router } from 'express';
import {
  getReviewsByTour,
  deleteReview,
  getAllReviewsForModeration,
  moderateReview
} from '../controllers/reviewController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = Router();

router.get('/tours/:tourId', getReviewsByTour);
router.get('/moderation', protect, authorize('admin', 'staff'), getAllReviewsForModeration);
router.patch('/:id/moderate', protect, authorize('admin', 'staff'), moderateReview);
router.delete('/:id', protect, authorize('customer', 'admin', 'staff'), deleteReview);

export default router;
