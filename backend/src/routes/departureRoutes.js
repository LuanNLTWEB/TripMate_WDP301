import express from 'express';
import { createDeparture, getDeparturesByTour, updateDeparture } from '../controllers/departureController.js';
import { protect, authorize } from '../middleware/auth.js';
import { ACCESS_ROLES } from '../config/accessControl.js';
import {
  createDepartureValidation,
  listDeparturesValidation,
  updateDepartureValidation
} from '../middleware/validate.js';

const router = express.Router();

router.get('/', protect, authorize(...ACCESS_ROLES.PROVIDER_ONLY), listDeparturesValidation, getDeparturesByTour);
// START UC-40 Create Tour Departure
// POST /api/departures - chỉ provider; kiểm tra tour/ngày/số chỗ/giá trước khi tạo.
router.post('/', protect, authorize(...ACCESS_ROLES.PROVIDER_ONLY), createDepartureValidation, createDeparture);
// END UC-40 Create Tour Departure
router.put('/:id', protect, authorize(...ACCESS_ROLES.PROVIDER_ONLY), updateDepartureValidation, updateDeparture);
router.patch('/:id', protect, authorize(...ACCESS_ROLES.PROVIDER_ONLY), updateDepartureValidation, updateDeparture);

export default router;
