import { validationResult } from 'express-validator';
import Itinerary from '../models/Itinerary.js';
import User from '../models/User.js';

const populateItinerary = (query) => (
  query
    .populate('owner', 'username email')
    .populate('collaborators.user', 'username email')
);

const canEdit = (itinerary, userId) => {
  if (itinerary.owner.equals(userId)) return true;
  return itinerary.collaborators.some((collaborator) => (
    collaborator.user.equals(userId) && collaborator.permission === 'edit'
  ));
};

const canView = (itinerary, userId) => (
  itinerary.owner.equals(userId) || itinerary.collaborators.some((collaborator) => (
    collaborator.user.equals(userId)
  ))
);

/**
 * Create an empty personal itinerary so subsequent SV3 activity operations
 * remain independent from tour, booking, and payment modules.
 * @route POST /api/itineraries
 * @access Customer
 */
export const createItinerary = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: errors.array()[0].msg, errors: errors.array() });
  }

  try {
    const itinerary = await Itinerary.create({ ...req.body, owner: req.user._id });
    return res.status(201).json({ success: true, itinerary });
  } catch (error) {
    console.error('Create itinerary error:', error);
    return res.status(500).json({ success: false, message: 'Unable to create itinerary' });
  }
};

/**
 * Return the authenticated customer's own itineraries.
 * @route GET /api/itineraries
 * @access Customer
 */
export const listItineraries = async (req, res) => {
  try {
    const itineraries = await populateItinerary(
      Itinerary.find({ owner: req.user._id }).sort({ updatedAt: -1 })
    );
    return res.json({ success: true, itineraries });
  } catch (error) {
    console.error('List itineraries error:', error);
    return res.status(500).json({ success: false, message: 'Unable to load itineraries' });
  }
};

/**
 * View an owned or shared personal itinerary.
 * @route GET /api/itineraries/:id
 * @access Customer
 */
export const getItinerary = async (req, res) => {
  try {
    const itinerary = await populateItinerary(Itinerary.findById(req.params.id));
    if (!itinerary || !canView(itinerary, req.user._id)) {
      return res.status(404).json({ success: false, message: 'Itinerary not found' });
    }
    return res.json({ success: true, itinerary });
  } catch (error) {
    console.error('Get itinerary error:', error);
    return res.status(500).json({ success: false, message: 'Unable to load itinerary' });
  }
};

/**
 * Add an activity to an owned or edit-enabled shared itinerary.
 * @route POST /api/itineraries/:id/activities
 * @access Customer
 */
export const addActivity = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: errors.array()[0].msg, errors: errors.array() });
  }

  try {
    const itinerary = await Itinerary.findById(req.params.id);
    if (!itinerary || !canEdit(itinerary, req.user._id)) {
      return res.status(404).json({ success: false, message: 'Editable itinerary not found' });
    }

    itinerary.activities.push(req.body);
    await itinerary.save();
    return res.status(201).json({ success: true, itinerary });
  } catch (error) {
    console.error('Add itinerary activity error:', error);
    return res.status(500).json({ success: false, message: 'Unable to add activity' });
  }
};

/**
 * Update the editable fields of a personal itinerary.
 * @route PATCH /api/itineraries/:id
 * @access Customer
 */
export const updateItinerary = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: errors.array()[0].msg, errors: errors.array() });
  }

  try {
    const itinerary = await Itinerary.findById(req.params.id);
    if (!itinerary || !canEdit(itinerary, req.user._id)) {
      return res.status(404).json({ success: false, message: 'Editable itinerary not found' });
    }

    ['title', 'startDate', 'endDate', 'budget'].forEach((field) => {
      if (req.body[field] !== undefined) itinerary[field] = req.body[field];
    });
    await itinerary.save();
    return res.json({ success: true, itinerary });
  } catch (error) {
    console.error('Update itinerary error:', error);
    return res.status(500).json({ success: false, message: 'Unable to update itinerary' });
  }
};

const isOwner = (itinerary, userId) => itinerary.owner.equals(userId);

/**
 * Return itineraries shared with the authenticated customer.
 * @route GET /api/itineraries/shared
 * @access Customer
 */
export const listSharedItineraries = async (req, res) => {
  try {
    const itineraries = await populateItinerary(
      Itinerary.find({ collaborators: { $elemMatch: { user: req.user._id } } })
        .sort({ updatedAt: -1 })
    );
    return res.json({ success: true, itineraries });
  } catch (error) {
    console.error('List shared itineraries error:', error);
    return res.status(500).json({ success: false, message: 'Unable to load shared itineraries' });
  }
};

/**
 * Share an itinerary with another customer via their email address.
 * @route POST /api/itineraries/:id/collaborators
 * @access Customer (owner only)
 */
export const addCollaborator = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: errors.array()[0].msg, errors: errors.array() });
  }

  try {
    const itinerary = await Itinerary.findById(req.params.id);
    if (!itinerary) {
      return res.status(404).json({ success: false, message: 'Itinerary not found' });
    }
    if (!isOwner(itinerary, req.user._id)) {
      return res.status(403).json({ success: false, message: 'Only the owner can share this itinerary' });
    }

    const { email, permission } = req.body;
    const collaborator = await User.findOne({ email });
    if (!collaborator) {
      return res.status(404).json({ success: false, message: 'No account uses this email' });
    }
    if (collaborator._id.equals(req.user._id)) {
      return res.status(400).json({ success: false, message: 'You cannot share an itinerary with yourself' });
    }
    if (itinerary.collaborators.some((entry) => entry.user.equals(collaborator._id))) {
      return res.status(400).json({ success: false, message: 'This user is already a collaborator' });
    }

    itinerary.collaborators.push({ user: collaborator._id, permission });
    await itinerary.save();

    const updated = await populateItinerary(Itinerary.findById(itinerary._id));
    return res.status(201).json({
      success: true,
      message: 'Itinerary shared successfully',
      itinerary: updated
    });
  } catch (error) {
    console.error('Add collaborator error:', error);
    return res.status(500).json({ success: false, message: 'Unable to share itinerary' });
  }
};

/**
 * Change the view/edit permission of an itinerary collaborator.
 * @route PATCH /api/itineraries/:id/collaborators/:collaboratorId
 * @access Customer (owner only)
 */
export const updateCollaboratorPermission = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: errors.array()[0].msg, errors: errors.array() });
  }

  try {
    const itinerary = await Itinerary.findById(req.params.id);
    if (!itinerary) {
      return res.status(404).json({ success: false, message: 'Itinerary not found' });
    }
    if (!isOwner(itinerary, req.user._id)) {
      return res.status(403).json({ success: false, message: 'Only the owner can manage collaborators' });
    }

    const collaborator = itinerary.collaborators.find((entry) => entry.user.equals(req.params.collaboratorId));
    if (!collaborator) {
      return res.status(404).json({ success: false, message: 'Collaborator not found' });
    }

    collaborator.permission = req.body.permission;
    await itinerary.save();

    const updated = await populateItinerary(Itinerary.findById(itinerary._id));
    return res.json({
      success: true,
      message: 'Collaborator permission updated successfully',
      itinerary: updated
    });
  } catch (error) {
    console.error('Update collaborator permission error:', error);
    return res.status(500).json({ success: false, message: 'Unable to update collaborator permission' });
  }
};

/**
 * Remove a collaborator from a shared personal itinerary.
 * @route DELETE /api/itineraries/:id/collaborators/:collaboratorId
 * @access Customer (owner only)
 */
export const removeCollaborator = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: errors.array()[0].msg, errors: errors.array() });
  }

  try {
    const itinerary = await Itinerary.findById(req.params.id);
    if (!itinerary) {
      return res.status(404).json({ success: false, message: 'Itinerary not found' });
    }
    if (!isOwner(itinerary, req.user._id)) {
      return res.status(403).json({ success: false, message: 'Only the owner can manage collaborators' });
    }

    const collaborator = itinerary.collaborators.find((entry) => entry.user.equals(req.params.collaboratorId));
    if (!collaborator) {
      return res.status(404).json({ success: false, message: 'Collaborator not found' });
    }

    itinerary.collaborators = itinerary.collaborators.filter(
      (entry) => !entry.user.equals(req.params.collaboratorId)
    );
    await itinerary.save();

    const updated = await populateItinerary(Itinerary.findById(itinerary._id));
    return res.json({
      success: true,
      message: 'Collaborator removed successfully',
      itinerary: updated
    });
  } catch (error) {
    console.error('Remove collaborator error:', error);
    return res.status(500).json({ success: false, message: 'Unable to remove collaborator' });
  }
};
