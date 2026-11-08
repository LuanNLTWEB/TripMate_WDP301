import express from 'express';
import {
  createBooking,
  getBookingById,
  getMyBookings,
  getProviderBookingRequests,
  confirmProviderBooking,
  confirmBookingPayment,
  checkInBooking,
  exportProviderBookingReport,
  cancelBooking
} from '../controllers/bookingController.js';
import { protect, authorize } from '../middleware/auth.js';
import { ACCESS_ROLES } from '../config/accessControl.js';
import {
  createBookingValidation,
  providerBookingListValidation,
  cancelBookingValidation,
  confirmBookingPaymentValidation,
  checkInBookingValidation
} from '../middleware/validate.js';

const router = express.Router();

router.post('/:tourId', protect, authorize(...ACCESS_ROLES.CUSTOMER_ONLY), createBookingValidation, createBooking);
router.get('/my', protect, authorize(...ACCESS_ROLES.CUSTOMER_ONLY), getMyBookings);
router.get('/provider', protect, authorize(...ACCESS_ROLES.PROVIDER_ONLY), providerBookingListValidation, getProviderBookingRequests);
// PATCH /api/bookings/provider/:id/confirm - provider duyệt request đang pending -> confirmed
router.patch('/provider/:id/confirm', protect, authorize(...ACCESS_ROLES.PROVIDER_ONLY), confirmProviderBooking);
// START UC-85 Confirm Payment & Check-in
// PATCH /api/bookings/provider/:id/payment - provider xác nhận đã thu tiền (confirmed -> paid)
router.patch('/provider/:id/payment', protect, authorize(...ACCESS_ROLES.PROVIDER_ONLY), confirmBookingPaymentValidation, confirmBookingPayment);
// PATCH /api/bookings/provider/:id/check-in - provider điểm danh khách lên xe (paid -> checked_in)
router.patch('/provider/:id/check-in', protect, authorize(...ACCESS_ROLES.PROVIDER_ONLY), checkInBookingValidation, checkInBooking);
// END UC-85 Confirm Payment & Check-in
// START UC-123 Export Provider Booking Report
router.get('/provider/report', protect, authorize(...ACCESS_ROLES.PROVIDER_ONLY), exportProviderBookingReport);
// END UC-123 Export Provider Booking Report
// START UC-74 Cancel Booking
// PATCH /api/bookings/:id/cancel - tự hủy đơn: chỉ customer, validate lý do rồi mới vào controller.
router.patch('/:id/cancel', protect, authorize(...ACCESS_ROLES.CUSTOMER_ONLY), cancelBookingValidation, cancelBooking);
// END UC-74 Cancel Booking
router.get('/:id', protect, authorize(...ACCESS_ROLES.CUSTOMER_ONLY), getBookingById);

export default router;
