import express from 'express';
import {
  createBooking,
  getBookingById,
  getMyBookings,
  getProviderBookingRequests,
  cancelBooking
} from '../controllers/bookingController.js';
import { protect, authorize } from '../middleware/auth.js';
import { ACCESS_ROLES } from '../config/accessControl.js';
import {
  createBookingValidation,
  providerBookingListValidation,
  cancelBookingValidation
} from '../middleware/validate.js';

const router = express.Router();

router.post('/:tourId', protect, authorize(...ACCESS_ROLES.CUSTOMER_ONLY), createBookingValidation, createBooking);
router.get('/my', protect, authorize(...ACCESS_ROLES.CUSTOMER_ONLY), getMyBookings);
router.get('/provider', protect, authorize(...ACCESS_ROLES.PROVIDER_ONLY), providerBookingListValidation, getProviderBookingRequests);
// START UC-74 Cancel Booking
// PATCH /api/bookings/:id/cancel - tự hủy đơn: chỉ customer, validate lý do rồi mới vào controller.
router.patch('/:id/cancel', protect, authorize(...ACCESS_ROLES.CUSTOMER_ONLY), cancelBookingValidation, cancelBooking);
// END UC-74 Cancel Booking
router.get('/:id', protect, authorize(...ACCESS_ROLES.CUSTOMER_ONLY), getBookingById);

export default router;
