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
  checkTimeConflict,
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
  deleteComment,
  addPackingItem,
  updatePackingItem,
  removePackingItem
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
  duplicateItineraryValidation,
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
  deleteCommentValidation,
  addPackingItemValidation,
  updatePackingItemValidation,
  removePackingItemValidation,
  checkTimeConflictValidation
} from '../middleware/validate.js';

const router = Router();
const customerAccess = [protect, authorize(...ACCESS_ROLES.CUSTOMER_ONLY)];

router.post('/', ...customerAccess, itineraryValidation, createItinerary);
// START UC-48 View Personal Itinerary
// GET /api/itineraries - danh sách lịch trình thuộc sở hữu của khách đang đăng nhập.
router.get('/', ...customerAccess, listItineraries);
// END UC-48 View Personal Itinerary
router.get('/shared', ...customerAccess, listSharedItineraries);
router.get('/invitations', ...customerAccess, listReceivedInvitations);
router.post('/invitations/:notificationId/respond', ...customerAccess, respondInvitationValidation, respondToInvitation);
// START UC-53 Add Activity to Itinerary
// GET /api/itineraries/:id/conflicts - danh sách cặp hoạt động trùng giờ (BR-62).
router.get('/:id/conflicts', ...customerAccess, itineraryIdValidation, getActivityConflicts);
// END UC-53 Add Activity to Itinerary
// START UC-58 Check Time Conflict
// POST /api/itineraries/:id/conflicts/check - kiểm tra trùng giờ cho khung giờ dự kiến và gợi ý giờ trống.
router.post('/:id/conflicts/check', ...customerAccess, checkTimeConflictValidation, checkTimeConflict);
// END UC-58 Check Time Conflict
router.get('/:id/budget', ...customerAccess, itineraryIdValidation, calculateTripBudget);
// START UC-48 View Personal Itinerary
// GET /api/itineraries/:id - owner hoặc collaborator được xem chi tiết.
router.get('/:id', ...customerAccess, itineraryIdValidation, getItinerary);
// END UC-48 View Personal Itinerary
router.put('/:id', ...customerAccess, updateItineraryValidation, updateItinerary);
// START UC-62 Duplicate Itinerary / Save Shared Itinerary to My Account (BR-73)
router.post('/:id/duplicate', ...customerAccess, duplicateItineraryValidation, duplicateItinerary);
// END UC-62 Duplicate Itinerary / Save Shared Itinerary to My Account
router.delete('/:id', ...customerAccess, itineraryIdValidation, deleteItinerary);
router.post('/:id/share', ...customerAccess, shareItineraryValidation, shareItinerary);
// START UC-120 Transfer Itinerary Ownership
// PUT /api/itineraries/:id/owner - owner chuyển quyền cho một collaborator (BR-72).
router.put('/:id/owner', ...customerAccess, transferOwnershipValidation, transferOwnership);
// END UC-120 Transfer Itinerary Ownership
router.post('/:id/invitations', ...customerAccess, inviteCollaboratorValidation, inviteCollaborator);
router.delete('/:id/invitations/:notificationId', ...customerAccess, deleteInvitationValidation, deleteSentInvitation);
router.get('/:id/collaborators', ...customerAccess, itineraryIdValidation, listCollaborators);
router.delete('/:id/collaborators/:userId', ...customerAccess, removeCollaboratorValidation, removeCollaborator);
// START UC-137 Leave Itinerary
// DELETE /api/itineraries/:id/leave - collaborator tự rời lịch trình được chia sẻ.
router.delete('/:id/leave', ...customerAccess, itineraryIdValidation, leaveItinerary);
// END UC-137 Leave Itinerary
router.put('/:id/collaborators/:userId', ...customerAccess, changeCollaboratorRoleValidation, changeCollaboratorRole);
// START UC-53 Add Activity to Itinerary
// POST /api/itineraries/:id/activities - thêm hoạt động, validate ngày/giờ/chi phí.
router.post('/:id/activities', ...customerAccess, activityValidation, addActivity);
// END UC-53 Add Activity to Itinerary
router.put('/:id/activities/reorder', ...customerAccess, reorderActivitiesValidation, reorderActivities);
router.put('/:id/activities/:activityId', ...customerAccess, updateActivityValidation, updateActivity);
router.delete('/:id/activities/:activityId', ...customerAccess, removeActivityFromItineraryValidation, removeActivity);
router.post('/:id/destinations', ...customerAccess, itineraryDestinationValidation, addDestination);
router.delete('/:id/destinations/:destinationId', ...customerAccess, removeDestinationValidation, removeDestination);
router.post('/:id/tours', ...customerAccess, itineraryTourValidation, addTour);
router.delete('/:id/tours/:tourId', ...customerAccess, removeTourFromItineraryValidation, removeTour);
router.post('/:id/comments', ...customerAccess, addCommentValidation, addComment);
router.delete('/:id/comments/:commentId', ...customerAccess, deleteCommentValidation, deleteComment);
// START UC-147 Add Packing Item
router.post('/:id/packing-items', ...customerAccess, addPackingItemValidation, addPackingItem);
// END UC-147 Add Packing Item
router.put('/:id/packing-items/:itemId', ...customerAccess, updatePackingItemValidation, updatePackingItem);
router.delete('/:id/packing-items/:itemId', ...customerAccess, removePackingItemValidation, removePackingItem);

export default router;
