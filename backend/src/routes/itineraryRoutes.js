import { Router } from 'express';
import { protect, authorize } from '../middleware/auth.js';
import {
  addActivity,
  createItinerary,
  getItinerary,
  listItineraries
} from '../controllers/itineraryController.js';
import {
  activityValidation,
  itineraryIdValidation,
  itineraryValidation
} from '../middleware/validate.js';

const router = Router();
const customerAccess = [protect, authorize('customer')];

router.post('/', ...customerAccess, itineraryValidation, createItinerary);
router.get('/', ...customerAccess, listItineraries);
router.get('/:id', ...customerAccess, itineraryIdValidation, getItinerary);
router.post('/:id/activities', ...customerAccess, activityValidation, addActivity);

export default router;
