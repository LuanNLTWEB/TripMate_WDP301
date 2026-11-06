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
  restoreTour,
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
  updateTourDeparture,
  deleteTour
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
// START UC-35 View Approval Status
// GET /api/tours/provider - tour của provider kèm trạng thái duyệt/lý do từ chối.
router.get('/provider', protect, authorize(...ACCESS_ROLES.PROVIDER_ONLY), getProviderTours);
// END UC-35 View Approval Status
router.get('/provider/:id', protect, authorize(...ACCESS_ROLES.PROVIDER_ONLY), tourIdValidation, getProviderTourById);
router.put('/:id', protect, authorize(...ACCESS_ROLES.PROVIDER_ONLY), updateProviderTourValidation, updateProviderTour);
router.put('/:id/details', protect, authorize(...ACCESS_ROLES.PROVIDER_ONLY), setTourDetailsValidation, setTourDetails);
// START UC-45 Update Tour Capacity
// PUT /api/tours/:id/capacity - provider đổi tổng số chỗ, không thấp hơn số đã bán.
router.put('/:id/capacity', protect, authorize(...ACCESS_ROLES.PROVIDER_ONLY), updateTourCapacityValidation, updateTourCapacity);
// END UC-45 Update Tour Capacity
router.patch('/:id/price', protect, authorize(...ACCESS_ROLES.PROVIDER_ONLY), updateTourPriceValidation, updateTourPrice);
router.put('/:id/price', protect, authorize(...ACCESS_ROLES.PROVIDER_ONLY), updateTourPriceValidation, updateTourPrice);
router.patch('/:id/departure', protect, authorize(...ACCESS_ROLES.PROVIDER_ONLY), updateTourDepartureValidation, updateTourDeparture);
router.post('/:id/schedule', protect, authorize(...ACCESS_ROLES.PROVIDER_ONLY), createTourScheduleValidation, createTourSchedule);
router.put('/:id/schedule/:scheduleId', protect, authorize(...ACCESS_ROLES.PROVIDER_ONLY), updateTourScheduleValidation, updateTourSchedule);
router.delete('/:id/schedule/:scheduleId', protect, authorize(...ACCESS_ROLES.PROVIDER_ONLY), deleteTourScheduleValidation, deleteTourSchedule);
router.delete('/:id', protect, authorize(...ACCESS_ROLES.PROVIDER_ONLY), tourIdValidation, deleteTour);
router.get('/:id/schedule', protect, authorize(...ACCESS_ROLES.TOUR_SCHEDULE_VIEW), tourIdValidation, getTourSchedule);
// START UC-30 View Favorite Tours
// GET /api/tours/favorites - danh sách tour khách đã lưu yêu thích.
router.get('/favorites', protect, authorize(...ACCESS_ROLES.CUSTOMER_ONLY), getFavoriteTours);
// END UC-30 View Favorite Tours
router.post('/:id/favorite', protect, authorize(...ACCESS_ROLES.CUSTOMER_ONLY), tourIdValidation, saveFavoriteTour);
router.delete('/:id/favorite', protect, authorize(...ACCESS_ROLES.CUSTOMER_ONLY), tourIdValidation, removeFavoriteTour);
router.patch('/:id/status', protect, authorize(...ACCESS_ROLES.STAFF_ONLY), updateTourStatusValidation, updateTourStatus);
router.patch('/:id/restore', protect, authorize(...ACCESS_ROLES.STAFF_ONLY), tourIdValidation, restoreTour);
router.patch('/:id/revision', protect, authorize(...ACCESS_ROLES.STAFF_ONLY), requestRevisionValidation, requestTourRevision);
// START UC-25 View Tour Details
// GET /api/tours/:id - optionalAuth để guest vẫn xem được tour đang active.
router.get('/:id', optionalAuth, tourIdValidation, getTourById);
// END UC-25 View Tour Details

export default router;
