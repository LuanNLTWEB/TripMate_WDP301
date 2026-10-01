import { Router } from 'express';
import { getReviewsByTour, deleteReview } from '../controllers/reviewController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = Router();

router.get('/tours/:tourId', getReviewsByTour);
router.delete('/:id', protect, authorize('customer', 'admin'), deleteReview);

export default router;
