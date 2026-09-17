import { Router } from 'express';
import { protect, authorize } from '../middleware/auth.js';
import {
  addCollaborator,
  addDestination,
  addActivity,
  createItinerary,
  getActivityConflicts,
  getItinerary,
  listItineraries,
  listSharedItineraries,
  updateCollaboratorPermission,
  updateItinerary
} from '../controllers/itineraryController.js';
import {
  activityValidation,
  addCollaboratorValidation,
  itineraryDestinationValidation,
  itineraryIdValidation,
  itineraryValidation,
  updateCollaboratorPermissionValidation,
  updateItineraryValidation
} from '../middleware/validate.js';

const router = Router();
const customerAccess = [protect, authorize('customer')];

router.post('/', ...customerAccess, itineraryValidation, createItinerary);
router.get('/', ...customerAccess, listItineraries);
router.get('/shared', ...customerAccess, listSharedItineraries);
router.get('/:id/conflicts', ...customerAccess, itineraryIdValidation, getActivityConflicts);
router.get('/:id', ...customerAccess, itineraryIdValidation, getItinerary);
router.patch('/:id', ...customerAccess, updateItineraryValidation, updateItinerary);
router.post('/:id/activities', ...customerAccess, activityValidation, addActivity);
router.post('/:id/destinations', ...customerAccess, itineraryDestinationValidation, addDestination);
router.post('/:id/collaborators', ...customerAccess, addCollaboratorValidation, addCollaborator);
router.patch('/:id/collaborators/:collaboratorId', ...customerAccess, updateCollaboratorPermissionValidation, updateCollaboratorPermission);

export default router;