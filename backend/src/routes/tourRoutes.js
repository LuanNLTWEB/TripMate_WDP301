import express from 'express';
import {
  createTour,
  getAllTours,
  getFavoriteTours,
  getManagedTourById,
  getManagedTours,
  getTourById,
  removeFavoriteTour,
  saveFavoriteTour,
  updateTourStatus,
  requestTourRevision,
  getProviderTours,
  getProviderTourById,
  updateProviderTour,
  setTourDetails,
  createTourSchedule,
  updateTourSchedule,
  deleteTourSchedule,
  getTourSchedule,
  updateTourCapacity,
  updateTourPrice,
  updateTourDeparture
} from '../controllers/tourController.js';
import { protect, authorize, optionalAuth } from '../middleware/auth.js';
import {
  tourIdValidation,
  updateTourStatusValidation,
  requestRevisionValidation,
  createTourValidation,
  updateProviderTourValidation,
  setTourDetailsValidation,
  createTourScheduleValidation,
  updateTourScheduleValidation,
  deleteTourScheduleValidation,
  updateTourCapacityValidation,
  updateTourPriceValidation,
  updateTourDepartureValidation
} from '../middleware/validate.js';

const router = express.Router();

router.get('/', getAllTours);
router.post('/', protect, authorize('tourProvider'), createTourValidation, createTour);
router.get('/management', protect, authorize('staff', 'admin'), getManagedTours);
router.get('/management/:id', protect, authorize('staff', 'admin'), tourIdValidation, getManagedTourById);
router.get('/provider', protect, authorize('tourProvider'), getProviderTours);
router.get('/provider/:id', protect, authorize('tourProvider'), tourIdValidation, getProviderTourById);
router.put('/:id', protect, authorize('tourProvider'), updateProviderTourValidation, updateProviderTour);
router.put('/:id/details', protect, authorize('tourProvider'), setTourDetailsValidation, setTourDetails);
router.put('/:id/capacity', protect, authorize('tourProvider', 'admin'), updateTourCapacityValidation, updateTourCapacity);
router.patch('/:id/price', protect, authorize('tourProvider', 'admin'), updateTourPriceValidation, updateTourPrice);
router.put('/:id/price', protect, authorize('tourProvider', 'admin'), updateTourPriceValidation, updateTourPrice);
router.patch('/:id/departure', protect, authorize('tourProvider', 'admin'), updateTourDepartureValidation, updateTourDeparture);
router.post('/:id/schedule', protect, authorize('tourProvider'), createTourScheduleValidation, createTourSchedule);
router.put('/:id/schedule/:scheduleId', protect, authorize('tourProvider'), updateTourScheduleValidation, updateTourSchedule);
router.delete('/:id/schedule/:scheduleId', protect, authorize('tourProvider'), deleteTourScheduleValidation, deleteTourSchedule);
router.get('/:id/schedule', optionalAuth, tourIdValidation, getTourSchedule);

router.get('/favorites', protect, authorize('customer'), getFavoriteTours);
router.post('/:id/favorite', protect, authorize('customer'), tourIdValidation, saveFavoriteTour);
router.delete('/:id/favorite', protect, authorize('customer'), tourIdValidation, removeFavoriteTour);
router.patch('/:id/status', protect, authorize('staff', 'admin'), updateTourStatusValidation, updateTourStatus);
router.patch('/:id/revision', protect, authorize('staff', 'admin'), requestRevisionValidation, requestTourRevision);
router.get('/:id', optionalAuth, tourIdValidation, getTourById);

export default router;
