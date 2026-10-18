import express from 'express';
import { createBooking, getMyBookings, getProviderBookingRequests, handlePaymentFailure, retryPayment } from '../controllers/bookingController.js';
import { protect, authorize } from '../middleware/auth.js';
import { bookingIdValidation, createBookingValidation, paymentFailureValidation } from '../middleware/validate.js';

const router = express.Router();

router.post('/:tourId', protect, authorize('customer'), createBookingValidation, createBooking);
router.get('/provider', protect, authorize('tourProvider'), getProviderBookingRequests);
router.get('/my', protect, authorize('customer'), getMyBookings);
router.post('/:id/payment-failure', protect, authorize('customer'), paymentFailureValidation, handlePaymentFailure);
router.post('/:id/payment-retry', protect, authorize('customer'), bookingIdValidation, retryPayment);

export default router;
