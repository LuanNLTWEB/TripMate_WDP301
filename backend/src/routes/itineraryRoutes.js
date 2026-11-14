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
  removePackingItem,
  updatePackingItemStatus
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
  updatePackingItemStatusValidation,
  checkTimeConflictValidation
} from '../middleware/validate.js';

const router = Router();
const customerAccess = [protect, authorize(...ACCESS_ROLES.CUSTOMER_ONLY)];

// UC-47 Create Personal Itinerary
router.post('/', ...customerAccess, itineraryValidation, createItinerary);
// UC-48 View Personal Itinerary (Personal)
// GET /api/itineraries - danh sách lịch trình (personal).
router.get('/', ...customerAccess, listItineraries);
router.get('/shared', ...customerAccess, listSharedItineraries);
router.get('/invitations', ...customerAccess, listReceivedInvitations);
// UC-133 Respond to Itinerary Invitation
router.post('/invitations/:notificationId/respond', ...customerAccess, respondInvitationValidation, respondToInvitation);
// UC-53 Add Activity to Itinerary - Check Conflict
// GET /api/itineraries/:id/conflicts - danh sách cặp hoạt động trùng giờ (BR-62).
router.get('/:id/conflicts', ...customerAccess, itineraryIdValidation, getActivityConflicts);
// UC-58 Check Time Conflict
// POST /api/itineraries/:id/conflicts/check - kiểm tra trùng giờ cho khung giờ dự kiến và gợi ý giờ trống.
router.post('/:id/conflicts/check', ...customerAccess, checkTimeConflictValidation, checkTimeConflict);
// UC-59 Calculate Trip Budget
router.get('/:id/budget', ...customerAccess, itineraryIdValidation, calculateTripBudget);
// UC-48 View Personal Itinerary (Shared)
// GET /api/itineraries/:id - xem chi tiết một lịch trình (shared).
router.get('/:id', ...customerAccess, itineraryIdValidation, getItinerary);
router.put('/:id', ...customerAccess, updateItineraryValidation, updateItinerary);
// UC-62 Duplicate Itinerary / Save Shared Itinerary to My Account (BR-73)
router.post('/:id/duplicate', ...customerAccess, duplicateItineraryValidation, duplicateItinerary);
// UC-50 Delete Itinerary
router.delete('/:id', ...customerAccess, itineraryIdValidation, deleteItinerary);
router.post('/:id/share', ...customerAccess, shareItineraryValidation, shareItinerary);
// UC-120 Transfer Itinerary Ownership
// PUT /api/itineraries/:id/owner - owner chuyển quyền cho một collaborator (BR-72).
router.put('/:id/owner', ...customerAccess, transferOwnershipValidation, transferOwnership);
// UC-132 Invite Collaborator
router.post('/:id/invitations', ...customerAccess, inviteCollaboratorValidation, inviteCollaborator);
// UC-84 Cancel Sent Itinerary Invitation
router.delete('/:id/invitations/:notificationId', ...customerAccess, deleteInvitationValidation, deleteSentInvitation);
// UC-134 View Collaborator List
router.get('/:id/collaborators', ...customerAccess, itineraryIdValidation, listCollaborators);
router.delete('/:id/collaborators/:userId', ...customerAccess, removeCollaboratorValidation, removeCollaborator);
// UC-137 Leave Itinerary
// DELETE /api/itineraries/:id/leave - collaborator tự rời lịch trình được chia sẻ.
router.delete('/:id/leave', ...customerAccess, itineraryIdValidation, leaveItinerary);
// UC-135 Change Collaborator Role
router.put('/:id/collaborators/:userId', ...customerAccess, changeCollaboratorRoleValidation, changeCollaboratorRole);
// UC-53 Add Activity to Itinerary
// POST /api/itineraries/:id/activities - thêm hoạt động, validate ngày/giờ/chi phí.
router.post('/:id/activities', ...customerAccess, activityValidation, addActivity);
// UC-57 Reorder Activities
router.put('/:id/activities/reorder', ...customerAccess, reorderActivitiesValidation, reorderActivities);
router.put('/:id/activities/:activityId', ...customerAccess, updateActivityValidation, updateActivity);
router.delete('/:id/activities/:activityId', ...customerAccess, removeActivityFromItineraryValidation, removeActivity);
router.post('/:id/destinations', ...customerAccess, itineraryDestinationValidation, addDestination);
// UC-52 Remove Destination from Itinerary
router.delete('/:id/destinations/:destinationId', ...customerAccess, removeDestinationValidation, removeDestination);
// UC-55 Add Tour to Itinerary
router.post('/:id/tours', ...customerAccess, itineraryTourValidation, addTour);
router.delete('/:id/tours/:tourId', ...customerAccess, removeTourFromItineraryValidation, removeTour);
router.post('/:id/comments', ...customerAccess, addCommentValidation, addComment);
// UC-158 Delete Itinerary Comment
router.delete('/:id/comments/:commentId', ...customerAccess, deleteCommentValidation, deleteComment);
// UC-147 Add Packing Item
router.post('/:id/packing-items', ...customerAccess, addPackingItemValidation, addPackingItem);
// UC-149 Update Packing Item
router.put('/:id/packing-items/:itemId', ...customerAccess, updatePackingItemValidation, updatePackingItem);
// UC-150 Remove Packing Item
router.delete('/:id/packing-items/:itemId', ...customerAccess, removePackingItemValidation, removePackingItem);
// UC-151 Mark Item as Packed
// PATCH /api/itineraries/:id/packing-items/:itemId/status - đánh dấu/bỏ đánh dấu vật dụng
// (mọi thành viên, kể cả collaborator quyền 'view', được tick tiến độ của chính mình theo BR-95).
router.patch('/:id/packing-items/:itemId/status', ...customerAccess, updatePackingItemStatusValidation, updatePackingItemStatus);

export default router;
