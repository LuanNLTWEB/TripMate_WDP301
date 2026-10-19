import express from 'express';
import { createBooking, getMyBookings, getBookingById } from '../controllers/bookingController.js';
import { protect, authorize } from '../middleware/auth.js';
import { createBookingValidation } from '../middleware/validate.js';

const router = express.Router();

router.post('/:tourId', protect, authorize('customer'), createBookingValidation, createBooking);
router.get('/my', protect, authorize('customer'), getMyBookings);
router.get('/:id', protect, authorize('customer'), getBookingById);

export default router;

