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

  confirmBookingPayment,
  checkInBooking,
  completeBooking,

  exportProviderBookingReport,
  cancelBooking,
  resetNoShowCount,
  updateBookingPassengerInfo
} from '../controllers/bookingController.js';
import { protect, authorize } from '../middleware/auth.js';
import { ACCESS_ROLES } from '../config/accessControl.js';
import {
  createBookingValidation,
  providerBookingListValidation,
  cancelBookingValidation,
  respondBookingValidation,
  markNoShowValidation
,
  confirmBookingPaymentValidation,
  checkInBookingValidation,
  completeBookingValidation,
  updateBookingPassengerInfoValidation
} from '../middleware/validate.js';

const router = express.Router();

// START UC-71 Create Booking
router.post('/:tourId', protect, authorize(...ACCESS_ROLES.CUSTOMER_ONLY), createBookingValidation, createBooking);
// END UC-71 Create Booking
// START UC-75 View Booking History & Detail (getMyBookings)
router.get('/my', protect, authorize(...ACCESS_ROLES.CUSTOMER_ONLY), getMyBookings);
// END UC-75 View Booking History & Detail (getMyBookings)
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

// START UC-85 Confirm Payment & Check-in
// PATCH /api/bookings/provider/:id/payment - provider xác nhận đã thu tiền (confirmed -> paid)
router.patch('/provider/:id/payment', protect, authorize(...ACCESS_ROLES.PROVIDER_ONLY), confirmBookingPaymentValidation, confirmBookingPayment);
// PATCH /api/bookings/provider/:id/check-in - provider điểm danh khách lên xe (paid -> checked_in)
router.patch('/provider/:id/check-in', protect, authorize(...ACCESS_ROLES.PROVIDER_ONLY), checkInBookingValidation, checkInBooking);
// END UC-85 Confirm Payment & Check-in
// START UC-79 Complete Booking
router.patch('/provider/:id/complete', protect, authorize(...ACCESS_ROLES.PROVIDER_ONLY), completeBookingValidation, completeBooking);
// END UC-79 Complete Booking

// START UC-123 Export Provider Booking Report
// GET /api/bookings/provider/report - tải báo cáo đơn đặt tour dạng Excel.
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

// START UC-152 Update Booking Passenger Info
router.patch('/:id/passenger-info', protect, authorize(...ACCESS_ROLES.CUSTOMER_ONLY), updateBookingPassengerInfoValidation, updateBookingPassengerInfo);
// END UC-152 Update Booking Passenger Info

// START UC-75 View Booking History & Detail (getBookingById)
router.get('/:id', protect, authorize(...ACCESS_ROLES.CUSTOMER_ONLY), getBookingById);
// END UC-75 View Booking History & Detail (getBookingById)

export default router;
