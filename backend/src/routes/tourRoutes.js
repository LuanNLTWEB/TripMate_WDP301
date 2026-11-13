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
  duplicateTour,
  setTourDetails,
  createTourSchedule,
  updateTourSchedule,
  deleteTourSchedule,
  getTourSchedule,
  updateTourCapacity,
  updateTourPrice,
  updateTourDeparture,
  deleteTour,
  checkTourAvailability,
  compareTours
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
  updateTourDepartureValidation,
  compareToursValidation
} from '../middleware/validate.js';

const router = express.Router();

// START UC-22 Browse & Filter Tours
router.get('/', getAllTours);
// END UC-22 Browse & Filter Tours
// START UC-64 Compare Tours
router.post('/compare', compareToursValidation, compareTours);
// END UC-64 Compare Tours
router.post('/', protect, authorize(...ACCESS_ROLES.PROVIDER_ONLY), createTourValidation, createTour);
router.get('/management', protect, authorize(...ACCESS_ROLES.STAFF_ONLY), getManagedTours);
router.get('/management/:id', protect, authorize(...ACCESS_ROLES.STAFF_ONLY), tourIdValidation, getManagedTourById);
// START UC-32 View My Provider Tours / UC-35 View Approval Status
// GET /api/tours/provider - tour của provider kèm trạng thái duyệt/lý do từ chối.
router.get('/provider', protect, authorize(...ACCESS_ROLES.PROVIDER_ONLY), getProviderTours);
// END UC-32 View My Provider Tours / UC-35 View Approval Status
router.get('/provider/:id', protect, authorize(...ACCESS_ROLES.PROVIDER_ONLY), tourIdValidation, getProviderTourById);
// START UC-24 Duplicate Tour
// POST /api/tours/:id/duplicate - nhân bản tour thuộc sở hữu của provider đang đăng nhập.
router.post('/:id/duplicate', protect, authorize(...ACCESS_ROLES.PROVIDER_ONLY), tourIdValidation, duplicateTour);
// END UC-24 Duplicate Tour
router.put('/:id', protect, authorize(...ACCESS_ROLES.PROVIDER_ONLY), updateProviderTourValidation, updateProviderTour);
router.put('/:id/details', protect, authorize(...ACCESS_ROLES.PROVIDER_ONLY), setTourDetailsValidation, setTourDetails);
// START UC-45 Update Tour Capacity
// PUT /api/tours/:id/capacity - provider đổi tổng số chỗ, không thấp hơn số đã bán.
router.put('/:id/capacity', protect, authorize(...ACCESS_ROLES.PROVIDER_ONLY), updateTourCapacityValidation, updateTourCapacity);
// END UC-45 Update Tour Capacity
// START UC-46 Update Tour Price
router.patch('/:id/price', protect, authorize(...ACCESS_ROLES.PROVIDER_ONLY), updateTourPriceValidation, updateTourPrice);
router.put('/:id/price', protect, authorize(...ACCESS_ROLES.PROVIDER_ONLY), updateTourPriceValidation, updateTourPrice);
// END UC-46 Update Tour Price
router.patch('/:id/departure', protect, authorize(...ACCESS_ROLES.PROVIDER_ONLY), updateTourDepartureValidation, updateTourDeparture);
router.post('/:id/schedule', protect, authorize(...ACCESS_ROLES.PROVIDER_ONLY), createTourScheduleValidation, createTourSchedule);
router.put('/:id/schedule/:scheduleId', protect, authorize(...ACCESS_ROLES.PROVIDER_ONLY), updateTourScheduleValidation, updateTourSchedule);
router.delete('/:id/schedule/:scheduleId', protect, authorize(...ACCESS_ROLES.PROVIDER_ONLY), deleteTourScheduleValidation, deleteTourSchedule);
router.delete('/:id', protect, authorize(...ACCESS_ROLES.PROVIDER_ONLY), tourIdValidation, deleteTour);
// START UC-37 View Tour Schedule
router.get('/:id/schedule', protect, authorize(...ACCESS_ROLES.TOUR_SCHEDULE_VIEW), tourIdValidation, getTourSchedule);
// END UC-37 View Tour Schedule
// START UC-30 View Favorite Tours
// GET /api/tours/favorites - danh sách tour khách đã lưu yêu thích.
router.get('/favorites', protect, authorize(...ACCESS_ROLES.CUSTOMER_ONLY), getFavoriteTours);
// END UC-30 View Favorite Tours
router.post('/:id/favorite', protect, authorize(...ACCESS_ROLES.CUSTOMER_ONLY), tourIdValidation, saveFavoriteTour);
router.delete('/:id/favorite', protect, authorize(...ACCESS_ROLES.CUSTOMER_ONLY), tourIdValidation, removeFavoriteTour);
router.patch('/:id/status', protect, authorize(...ACCESS_ROLES.STAFF_ONLY), updateTourStatusValidation, updateTourStatus);
router.patch('/:id/restore', protect, authorize(...ACCESS_ROLES.STAFF_ONLY), tourIdValidation, restoreTour);
// START UC-99 Request Tour Revision
router.patch('/:id/revision', protect, authorize(...ACCESS_ROLES.STAFF_ONLY), requestRevisionValidation, requestTourRevision);
// END UC-99 Request Tour Revision
// START UC-27 Check Tour Availability
router.get('/:id/availability', optionalAuth, tourIdValidation, checkTourAvailability);
// END UC-27 Check Tour Availability
// START UC-25 View Tour Details
// GET /api/tours/:id - optionalAuth để guest vẫn xem được tour đang active.
router.get('/:id', optionalAuth, tourIdValidation, getTourById);
// END UC-25 View Tour Details

export default router;
