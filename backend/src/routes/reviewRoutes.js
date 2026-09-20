import { Router } from 'express';
import { getReviewsByTour } from '../controllers/reviewController.js';

const router = Router();

router.get('/tours/:tourId', getReviewsByTour);

export default router;
