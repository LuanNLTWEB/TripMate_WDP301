import express from 'express';
import { createDeparture, getDeparturesByTour } from '../controllers/departureController.js';
import { protect, authorize } from '../middleware/auth.js';
import { createDepartureValidation, listDeparturesValidation } from '../middleware/validate.js';

const router = express.Router();

router.get('/', protect, authorize('tourProvider', 'admin'), listDeparturesValidation, getDeparturesByTour);
router.post('/', protect, authorize('tourProvider', 'admin'), createDepartureValidation, createDeparture);

export default router;