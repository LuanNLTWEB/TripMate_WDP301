import { Router } from 'express';
import { protect, authorize } from '../middleware/auth.js';
import {
  listDestinations,
  createDestination,
  updateDestinationStatus
} from '../controllers/destinationController.js';
import {
  createDestinationValidation,
  updateDestinationStatusValidation
} from '../middleware/validate.js';

const router = Router();

router.get('/', listDestinations);

/**
 * Destination administration routes for the SV3 destination slice.
 */
router.post(
  '/',
  protect,
  authorize('staff', 'admin'),
  createDestinationValidation,
  createDestination
);

router.patch(
  '/:id/status',
  protect,
  authorize('staff', 'admin'),
  updateDestinationStatusValidation,
  updateDestinationStatus
);

export default router;
