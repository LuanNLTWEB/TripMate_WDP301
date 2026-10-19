import express from 'express';
import {
  createBooking,
  getBookingById,
  getMyBookings,
  getProviderBookingRequests
} from '../controllers/bookingController.js';
import { protect, authorize } from '../middleware/auth.js';
import {
  createBookingValidation,
  providerBookingListValidation
} from '../middleware/validate.js';

const router = express.Router();

router.post('/:tourId', protect, authorize('customer'), createBookingValidation, createBooking);
router.get('/my', protect, authorize('customer'), getMyBookings);
router.get('/provider', protect, authorize('tourProvider'), providerBookingListValidation, getProviderBookingRequests);
router.get('/:id', protect, authorize('customer'), getBookingById);

export default router;
