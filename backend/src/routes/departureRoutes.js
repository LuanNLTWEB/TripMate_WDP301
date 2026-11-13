import express from 'express';
import {
  createDeparture,
  getDeparturesByTour,
  updateDeparture,
  exportPassengerManifest,
  cancelDeparture
} from '../controllers/departureController.js';
import { protect, authorize } from '../middleware/auth.js';
import { ACCESS_ROLES } from '../config/accessControl.js';
import {
  createDepartureValidation,
  listDeparturesValidation,
  updateDepartureValidation,
  departureIdValidation,
  cancelDepartureValidation
} from '../middleware/validate.js';

const router = express.Router();

router.get('/', protect, authorize(...ACCESS_ROLES.PROVIDER_ONLY), listDeparturesValidation, getDeparturesByTour);
// START UC-40 Create Tour Departure
// POST /api/departures - chỉ provider; kiểm tra tour/ngày/số chỗ/giá trước khi tạo.
router.post('/', protect, authorize(...ACCESS_ROLES.PROVIDER_ONLY), createDepartureValidation, createDeparture);
// END UC-40 Create Tour Departure
// START UC-122 Export Passenger Manifest
router.get('/:id/manifest', protect, authorize(...ACCESS_ROLES.PROVIDER_ONLY), departureIdValidation, exportPassengerManifest);
// END UC-122 Export Passenger Manifest
// START UC-42 Update Tour Departure
router.put('/:id', protect, authorize(...ACCESS_ROLES.PROVIDER_ONLY), updateDepartureValidation, updateDeparture);
router.patch('/:id', protect, authorize(...ACCESS_ROLES.PROVIDER_ONLY), updateDepartureValidation, updateDeparture);
// END UC-42 Update Tour Departure
// START UC-43 Cancel Tour Departure
// PATCH /api/departures/:id/cancel - chỉ provider sở hữu tour; kiểm tra SLA 72h và hoàn tiền 100% tự động theo BR-54.
router.patch('/:id/cancel', protect, authorize(...ACCESS_ROLES.PROVIDER_ONLY), cancelDepartureValidation, cancelDeparture);
// END UC-43 Cancel Tour Departure

export default router;
