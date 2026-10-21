import { Router } from 'express';
import { protect, authorize } from '../middleware/auth.js';
import { ACCESS_ROLES } from '../config/accessControl.js';
import {
  addActivity,
  calculateTripBudget,
  addDestination,
  addTour,
  createItinerary,
  deleteItinerary,
  duplicateItinerary,
  getActivityConflicts,
  getItinerary,
  listItineraries,
  listSharedItineraries,
  reorderActivities,
  removeDestination,
  removeTour,
  removeActivity,
  updateActivity,
  updateItinerary,
  shareItinerary,
  removeCollaborator,
  leaveItinerary,
  transferOwnership,
  addComment,
  deleteComment
} from '../controllers/itineraryController.js';
import {
  changeCollaboratorRole,
  inviteCollaborator,
  listCollaborators,
  listReceivedInvitations,
  respondToInvitation,
  deleteSentInvitation
} from '../controllers/invitationController.js';
import {
  activityValidation,
  itineraryDestinationValidation,
  itineraryIdValidation,
  itineraryTourValidation,
  itineraryValidation,
  updateItineraryValidation,
  removeDestinationValidation,
  removeTourFromItineraryValidation,
  reorderActivitiesValidation,
  removeActivityFromItineraryValidation,
  updateActivityValidation,
  shareItineraryValidation,
  removeCollaboratorValidation,
  inviteCollaboratorValidation,
  deleteInvitationValidation,
  respondInvitationValidation,
  changeCollaboratorRoleValidation,
  transferOwnershipValidation,
  addCommentValidation,
  deleteCommentValidation
} from '../middleware/validate.js';

const router = Router();
const customerAccess = [protect, authorize(...ACCESS_ROLES.CUSTOMER_ONLY)];

router.post('/', ...customerAccess, itineraryValidation, createItinerary);
router.get('/', ...customerAccess, listItineraries);
router.get('/shared', ...customerAccess, listSharedItineraries);
router.get('/invitations', ...customerAccess, listReceivedInvitations);
router.post('/invitations/:notificationId/respond', ...customerAccess, respondInvitationValidation, respondToInvitation);
router.get('/:id/conflicts', ...customerAccess, itineraryIdValidation, getActivityConflicts);
router.get('/:id/budget', ...customerAccess, itineraryIdValidation, calculateTripBudget);
router.get('/:id', ...customerAccess, itineraryIdValidation, getItinerary);
router.put('/:id', ...customerAccess, updateItineraryValidation, updateItinerary);
router.post('/:id/duplicate', ...customerAccess, itineraryIdValidation, duplicateItinerary);
router.delete('/:id', ...customerAccess, itineraryIdValidation, deleteItinerary);
router.post('/:id/share', ...customerAccess, shareItineraryValidation, shareItinerary);
router.put('/:id/owner', ...customerAccess, transferOwnershipValidation, transferOwnership);
router.post('/:id/invitations', ...customerAccess, inviteCollaboratorValidation, inviteCollaborator);
router.delete('/:id/invitations/:notificationId', ...customerAccess, deleteInvitationValidation, deleteSentInvitation);
router.get('/:id/collaborators', ...customerAccess, itineraryIdValidation, listCollaborators);
router.delete('/:id/collaborators/:userId', ...customerAccess, removeCollaboratorValidation, removeCollaborator);
router.delete('/:id/leave', ...customerAccess, itineraryIdValidation, leaveItinerary);
router.put('/:id/collaborators/:userId', ...customerAccess, changeCollaboratorRoleValidation, changeCollaboratorRole);
router.post('/:id/activities', ...customerAccess, activityValidation, addActivity);
router.put('/:id/activities/reorder', ...customerAccess, reorderActivitiesValidation, reorderActivities);
router.put('/:id/activities/:activityId', ...customerAccess, updateActivityValidation, updateActivity);
router.delete('/:id/activities/:activityId', ...customerAccess, removeActivityFromItineraryValidation, removeActivity);
router.post('/:id/destinations', ...customerAccess, itineraryDestinationValidation, addDestination);
router.delete('/:id/destinations/:destinationId', ...customerAccess, removeDestinationValidation, removeDestination);
router.post('/:id/tours', ...customerAccess, itineraryTourValidation, addTour);
router.delete('/:id/tours/:tourId', ...customerAccess, removeTourFromItineraryValidation, removeTour);
router.post('/:id/comments', ...customerAccess, addCommentValidation, addComment);
router.delete('/:id/comments/:commentId', ...customerAccess, deleteCommentValidation, deleteComment);

export default router;
