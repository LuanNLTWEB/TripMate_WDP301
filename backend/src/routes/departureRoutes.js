import express from 'express';
import { createDeparture, getDeparturesByTour } from '../controllers/departureController.js';
import { protect, authorize } from '../middleware/auth.js';
import { ACCESS_ROLES } from '../config/accessControl.js';
import { createDepartureValidation, listDeparturesValidation } from '../middleware/validate.js';

const router = express.Router();

router.get('/', protect, authorize(...ACCESS_ROLES.PROVIDER_ONLY), listDeparturesValidation, getDeparturesByTour);
router.post('/', protect, authorize(...ACCESS_ROLES.PROVIDER_ONLY), createDepartureValidation, createDeparture);

export default router;
