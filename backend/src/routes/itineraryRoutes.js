import { Router } from 'express';
import { protect, authorize } from '../middleware/auth.js';
import {
  createItinerary,
  listItineraries,
  getItinerary,
  addActivity,
  updateItinerary,
  listSharedItineraries,
  addCollaborator,
  updateCollaboratorPermission,
  removeCollaborator
} from '../controllers/itineraryController.js';
import {
  activityValidation,
  itineraryIdValidation,
  itineraryValidation,
  addCollaboratorValidation,
  updateCollaboratorValidation,
  removeCollaboratorValidation
} from '../middleware/validate.js';

const router = Router();
const customerAccess = [protect, authorize('user', 'customer')];

router.post('/', ...customerAccess, itineraryValidation, createItinerary);
router.get('/', ...customerAccess, listItineraries);
router.get('/shared', ...customerAccess, listSharedItineraries);
router.get('/:id', ...customerAccess, itineraryIdValidation, getItinerary);
router.patch('/:id', ...customerAccess, itineraryIdValidation, itineraryValidation, updateItinerary);
router.post('/:id/activities', ...customerAccess, activityValidation, addActivity);
router.post('/:id/collaborators', ...customerAccess, addCollaboratorValidation, addCollaborator);
router.patch(
  '/:id/collaborators/:collaboratorId',
  ...customerAccess,
  updateCollaboratorValidation,
  updateCollaboratorPermission
);
router.delete(
  '/:id/collaborators/:collaboratorId',
  ...customerAccess,
  removeCollaboratorValidation,
  removeCollaborator
);

export default router;
