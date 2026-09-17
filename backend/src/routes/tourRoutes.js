import express from 'express';
import {
  getAllTours,
  getFavoriteTours,
  getTourById,
  removeFavoriteTour,
  saveFavoriteTour
} from '../controllers/tourController.js';
import { protect, authorize } from '../middleware/auth.js';
import { tourIdValidation } from '../middleware/validate.js';

const router = express.Router();

// Public routes for guests
router.get('/', getAllTours);
router.get('/favorites', protect, authorize('customer'), getFavoriteTours);
router.post('/:id/favorite', protect, authorize('customer'), tourIdValidation, saveFavoriteTour);
router.delete('/:id/favorite', protect, authorize('customer'), tourIdValidation, removeFavoriteTour);
router.get('/:id', getTourById);

export default router;
