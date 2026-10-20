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
import { ACCESS_ROLES } from '../config/accessControl.js';
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
router.post('/', protect, authorize(...ACCESS_ROLES.PROVIDER_ONLY), createTourValidation, createTour);
router.get('/management', protect, authorize(...ACCESS_ROLES.STAFF_ONLY), getManagedTours);
router.get('/management/:id', protect, authorize(...ACCESS_ROLES.STAFF_ONLY), tourIdValidation, getManagedTourById);
router.get('/provider', protect, authorize(...ACCESS_ROLES.PROVIDER_ONLY), getProviderTours);
router.get('/provider/:id', protect, authorize(...ACCESS_ROLES.PROVIDER_ONLY), tourIdValidation, getProviderTourById);
router.put('/:id', protect, authorize(...ACCESS_ROLES.PROVIDER_ONLY), updateProviderTourValidation, updateProviderTour);
router.put('/:id/details', protect, authorize(...ACCESS_ROLES.PROVIDER_ONLY), setTourDetailsValidation, setTourDetails);
router.put('/:id/capacity', protect, authorize(...ACCESS_ROLES.PROVIDER_ONLY), updateTourCapacityValidation, updateTourCapacity);
router.patch('/:id/price', protect, authorize(...ACCESS_ROLES.PROVIDER_ONLY), updateTourPriceValidation, updateTourPrice);
router.put('/:id/price', protect, authorize(...ACCESS_ROLES.PROVIDER_ONLY), updateTourPriceValidation, updateTourPrice);
router.patch('/:id/departure', protect, authorize(...ACCESS_ROLES.PROVIDER_ONLY), updateTourDepartureValidation, updateTourDeparture);
router.post('/:id/schedule', protect, authorize(...ACCESS_ROLES.PROVIDER_ONLY), createTourScheduleValidation, createTourSchedule);
router.put('/:id/schedule/:scheduleId', protect, authorize(...ACCESS_ROLES.PROVIDER_ONLY), updateTourScheduleValidation, updateTourSchedule);
router.delete('/:id/schedule/:scheduleId', protect, authorize(...ACCESS_ROLES.PROVIDER_ONLY), deleteTourScheduleValidation, deleteTourSchedule);
router.get('/:id/schedule', protect, authorize(...ACCESS_ROLES.TOUR_SCHEDULE_VIEW), tourIdValidation, getTourSchedule);
router.get('/favorites', protect, authorize(...ACCESS_ROLES.CUSTOMER_ONLY), getFavoriteTours);
router.post('/:id/favorite', protect, authorize(...ACCESS_ROLES.CUSTOMER_ONLY), tourIdValidation, saveFavoriteTour);
router.delete('/:id/favorite', protect, authorize(...ACCESS_ROLES.CUSTOMER_ONLY), tourIdValidation, removeFavoriteTour);
router.patch('/:id/status', protect, authorize(...ACCESS_ROLES.STAFF_ONLY), updateTourStatusValidation, updateTourStatus);
router.patch('/:id/revision', protect, authorize(...ACCESS_ROLES.STAFF_ONLY), requestRevisionValidation, requestTourRevision);
router.get('/:id', optionalAuth, tourIdValidation, getTourById);

export default router;
