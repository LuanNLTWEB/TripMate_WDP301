import express from 'express';
import { createDeparture, getDeparturesByTour, updateDeparture } from '../controllers/departureController.js';
import { protect, authorize } from '../middleware/auth.js';
import {
  createDepartureValidation,
  listDeparturesValidation,
  updateDepartureValidation
} from '../middleware/validate.js';

const router = express.Router();

router.get('/', protect, authorize('tourProvider', 'admin'), listDeparturesValidation, getDeparturesByTour);
router.post('/', protect, authorize('tourProvider', 'admin'), createDepartureValidation, createDeparture);
router.put('/:id', protect, authorize('tourProvider', 'admin'), updateDepartureValidation, updateDeparture);
router.patch('/:id', protect, authorize('tourProvider', 'admin'), updateDepartureValidation, updateDeparture);

export default router;