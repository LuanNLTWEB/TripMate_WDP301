import { Router } from 'express';
import { protect, authorize } from '../middleware/auth.js';
import {
  addActivity,
  addDestination,
  addTour,
  createItinerary,
  deleteItinerary,
  getActivityConflicts,
  getItinerary,
  listItineraries,
  listSharedItineraries,
  removeDestination,
  removeTour
} from '../controllers/itineraryController.js';
import {
  activityValidation,
  itineraryDestinationValidation,
  itineraryIdValidation,
  itineraryTourValidation,
  itineraryValidation,
  removeDestinationValidation,
  removeTourFromItineraryValidation
} from '../middleware/validate.js';

const router = Router();
const customerAccess = [protect, authorize('customer')];

router.post('/', ...customerAccess, itineraryValidation, createItinerary);
router.get('/', ...customerAccess, listItineraries);
router.get('/shared', ...customerAccess, listSharedItineraries);
router.get('/:id/conflicts', ...customerAccess, itineraryIdValidation, getActivityConflicts);
router.get('/:id', ...customerAccess, itineraryIdValidation, getItinerary);
router.delete('/:id', ...customerAccess, itineraryIdValidation, deleteItinerary);
router.post('/:id/activities', ...customerAccess, activityValidation, addActivity);
router.post('/:id/destinations', ...customerAccess, itineraryDestinationValidation, addDestination);
router.delete('/:id/destinations/:destinationId', ...customerAccess, removeDestinationValidation, removeDestination);
router.post('/:id/tours', ...customerAccess, itineraryTourValidation, addTour);
router.delete('/:id/tours/:tourId', ...customerAccess, removeTourFromItineraryValidation, removeTour);

export default router;