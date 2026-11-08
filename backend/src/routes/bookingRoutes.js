import express from 'express';
import {
  createBooking,
  getBookingById,
  getMyBookings,
  getProviderBookingRequests,
  confirmProviderBooking,
  respondProviderBooking,
  getBookingVoucher,
  markBookingAsNoShow,
  exportProviderBookingReport,
  cancelBooking,
  resetNoShowCount
} from '../controllers/bookingController.js';
import { protect, authorize } from '../middleware/auth.js';
import { ACCESS_ROLES } from '../config/accessControl.js';
import {
  createBookingValidation,
  providerBookingListValidation,
  cancelBookingValidation,
  respondBookingValidation,
  markNoShowValidation
} from '../middleware/validate.js';

const router = express.Router();

router.post('/:tourId', protect, authorize(...ACCESS_ROLES.CUSTOMER_ONLY), createBookingValidation, createBooking);
router.get('/my', protect, authorize(...ACCESS_ROLES.CUSTOMER_ONLY), getMyBookings);
router.get('/provider', protect, authorize(...ACCESS_ROLES.PROVIDER_ONLY), providerBookingListValidation, getProviderBookingRequests);
// PATCH /api/bookings/provider/:id/confirm - provider duyệt request đang pending -> confirmed
router.patch('/provider/:id/confirm', protect, authorize(...ACCESS_ROLES.PROVIDER_ONLY), confirmProviderBooking);
// START UC-78 Respond to Booking (Provider)
// PATCH /api/bookings/provider/:id/respond - duyệt (confirm) hoặc từ chối (reject) request
router.patch('/provider/:id/respond', protect, authorize(...ACCESS_ROLES.PROVIDER_ONLY), respondBookingValidation, respondProviderBooking);
// END UC-78 Respond to Booking (Provider)
// START UC-86 Mark Booking as No-Show (Provider)
// PATCH /api/bookings/provider/:id/no-show - đánh dấu khách vắng mặt không báo trước
router.patch('/provider/:id/no-show', protect, authorize(...ACCESS_ROLES.PROVIDER_ONLY), markNoShowValidation, markBookingAsNoShow);
// END UC-86 Mark Booking as No-Show (Provider)
// START UC-123 Export Provider Booking Report
router.get('/provider/report', protect, authorize(...ACCESS_ROLES.PROVIDER_ONLY), exportProviderBookingReport);
// END UC-123 Export Provider Booking Report
// START UC-82 Download Booking Voucher (Customer)
// GET /api/bookings/:id/voucher - xuất phiếu xác nhận đặt chỗ kèm mã QR
router.get('/:id/voucher', protect, authorize(...ACCESS_ROLES.CUSTOMER_ONLY), getBookingVoucher);
// END UC-82 Download Booking Voucher (Customer)
// START UC-74 Cancel Booking
// PATCH /api/bookings/:id/cancel - tự hủy đơn: chỉ customer, validate lý do rồi mới vào controller.
router.patch('/:id/cancel', protect, authorize(...ACCESS_ROLES.CUSTOMER_ONLY), cancelBookingValidation, cancelBooking);
// END UC-74 Cancel Booking

// START STT 156 Reset No-Show Count (Staff)
// PATCH /api/bookings/users/:userId/reset-no-show - Staff/Admin reset số lần vắng mặt của khách
router.patch('/users/:userId/reset-no-show', protect, authorize('staff', 'admin'), resetNoShowCount);
// END STT 156 Reset No-Show Count (Staff)

router.get('/:id', protect, authorize(...ACCESS_ROLES.CUSTOMER_ONLY), getBookingById);

export default router;
