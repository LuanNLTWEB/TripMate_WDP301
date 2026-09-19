import express from 'express';
import {
  getAllTours,
  getFavoriteTours,
  getManagedTourById,
  getManagedTours,
  getTourById,
  removeFavoriteTour,
  saveFavoriteTour,
  updateTourStatus
} from '../controllers/tourController.js';
import { protect, authorize } from '../middleware/auth.js';
import { tourIdValidation, updateTourStatusValidation } from '../middleware/validate.js';

const router = express.Router();

router.get('/', getAllTours);
router.get('/management', protect, authorize('staff', 'admin'), getManagedTours);
router.get('/management/:id', protect, authorize('staff', 'admin'), tourIdValidation, getManagedTourById);
router.get('/favorites', protect, authorize('customer'), getFavoriteTours);
router.post('/:id/favorite', protect, authorize('customer'), tourIdValidation, saveFavoriteTour);
router.delete('/:id/favorite', protect, authorize('customer'), tourIdValidation, removeFavoriteTour);
router.patch('/:id/status', protect, authorize('staff', 'admin'), updateTourStatusValidation, updateTourStatus);
router.get('/:id', tourIdValidation, getTourById);

export default router;
