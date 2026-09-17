import { Router } from 'express';
import { protect, authorize } from '../middleware/auth.js';
import {
  addDestination,
  addActivity,
  createItinerary,
  getActivityConflicts,
  getItinerary,
  listItineraries,
  listSharedItineraries,
  removeDestination
} from '../controllers/itineraryController.js';
import {
  activityValidation,
  itineraryDestinationValidation,
  itineraryIdValidation,
  itineraryValidation,
  removeDestinationValidation
} from '../middleware/validate.js';

const router = Router();
const customerAccess = [protect, authorize('customer')];

router.post('/', ...customerAccess, itineraryValidation, createItinerary);
router.get('/', ...customerAccess, listItineraries);
router.get('/shared', ...customerAccess, listSharedItineraries);
router.get('/:id/conflicts', ...customerAccess, itineraryIdValidation, getActivityConflicts);
router.get('/:id', ...customerAccess, itineraryIdValidation, getItinerary);
router.post('/:id/activities', ...customerAccess, activityValidation, addActivity);
router.post('/:id/destinations', ...customerAccess, itineraryDestinationValidation, addDestination);
router.delete('/:id/destinations/:destinationId', ...customerAccess, removeDestinationValidation, removeDestination);

export default router;