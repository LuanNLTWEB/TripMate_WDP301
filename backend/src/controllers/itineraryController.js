import { validationResult } from 'express-validator';
import Itinerary from '../models/Itinerary.js';
import User from '../models/User.js';

/**
 * Detect overlapping activities within an itinerary (same date, time overlap).
 * @param {Object} itinerary
 * @returns {Array<{first:{_id,title,startTime,endTime}, second:{_id,title,startTime,endTime}}>}
 */
const detectScheduleConflicts = (itinerary) => {
  const conflicts = [];
  const activities = itinerary.activities || [];
  for (let i = 0; i < activities.length; i++) {
    for (let j = i + 1; j < activities.length; j++) {
      const a = activities[i];
      const b = activities[j];
      const sameDate = new Date(a.date).toDateString() === new Date(b.date).toDateString();
      if (sameDate && a.startTime < b.endTime && b.startTime < a.endTime) {
        conflicts.push({
          first: { _id: a._id, title: a.title, startTime: a.startTime, endTime: a.endTime },
          second: { _id: b._id, title: b.title, startTime: b.startTime, endTime: b.endTime }
        });
      }
    }
  }
  return conflicts;
};

/**
 * Return a plain-object copy of the itinerary with a computed `conflicts` field.
 */
const hydrateItinerary = (itinerary) => {
  const doc = itinerary.toObject ? itinerary.toObject() : itinerary;
  return { ...doc, conflicts: detectScheduleConflicts(doc) };
};

const canView = (itinerary, userId) => (
  String(itinerary.owner?._id || itinerary.owner) === String(userId)
  || itinerary.collaborators.some((c) => String(c.user?._id || c.user) === String(userId))
);

const canEdit = (itinerary, userId) => (
  String(itinerary.owner?._id || itinerary.owner) === String(userId)
  || itinerary.collaborators.some((c) => (
    String(c.user?._id || c.user) === String(userId) && c.permission === 'edit'
  ))
);

/**
 * Create an empty personal itinerary owned by the authenticated customer.
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
    const populated = await Itinerary.findById(itinerary._id)
      .populate('owner', 'username email')
      .populate('collaborators.user', 'username email');
    return res.status(201).json({ success: true, itinerary: hydrateItinerary(populated) });
  } catch (error) {
    console.error('Create itinerary error:', error);
    return res.status(500).json({ success: false, message: 'Unable to create itinerary' });
  }
};

/**
 * List personal itineraries owned by the authenticated customer.
 * @route GET /api/itineraries
 * @access Customer
 */
export const listItineraries = async (req, res) => {
  try {
    const itineraries = await Itinerary.find({ owner: req.user._id })
      .sort({ updatedAt: -1 })
      .populate('owner', 'username email')
      .populate('collaborators.user', 'username email');
    return res.json({ success: true, itineraries: itineraries.map(hydrateItinerary) });
  } catch (error) {
    console.error('List itineraries error:', error);
    return res.status(500).json({ success: false, message: 'Unable to load itineraries' });
  }
};

/**
 * List itineraries shared with the authenticated customer.
 * @route GET /api/itineraries/shared
 * @access Customer
 */
export const listSharedItineraries = async (req, res) => {
  try {
    const itineraries = await Itinerary.find({ 'collaborators.user': req.user._id })
      .sort({ updatedAt: -1 })
      .populate('owner', 'username email')
      .populate('collaborators.user', 'username email');
    return res.json({ success: true, itineraries: itineraries.map(hydrateItinerary) });
  } catch (error) {
    console.error('List shared itineraries error:', error);
    return res.status(500).json({ success: false, message: 'Unable to load shared itineraries' });
  }
};

/**
 * View an owned or shared personal itinerary.
 * @route GET /api/itineraries/:id
 * @access Customer
 */
export const getItinerary = async (req, res) => {
  try {
    const itinerary = await Itinerary.findById(req.params.id)
      .populate('owner', 'username email')
      .populate('collaborators.user', 'username email');
    if (!itinerary || !canView(itinerary, req.user._id)) {
      return res.status(404).json({ success: false, message: 'Itinerary not found' });
    }
    return res.json({ success: true, itinerary: hydrateItinerary(itinerary) });
  } catch (error) {
    console.error('Get itinerary error:', error);
    return res.status(500).json({ success: false, message: 'Unable to load itinerary' });
  }
};

/**
 * Return schedule conflicts for an itinerary.
 * @route GET /api/itineraries/:id/conflicts
 * @access Customer
 */
export const getActivityConflicts = async (req, res) => {
  try {
    const itinerary = await Itinerary.findById(req.params.id);
    if (!itinerary || !canView(itinerary, req.user._id)) {
      return res.status(404).json({ success: false, message: 'Itinerary not found' });
    }
    return res.json({ success: true, conflicts: detectScheduleConflicts(itinerary) });
  } catch (error) {
    console.error('Get itinerary conflicts error:', error);
    return res.status(500).json({ success: false, message: 'Unable to load itinerary conflicts' });
  }
};

/**
 * Update itinerary title, budget, or dates.
 * @route PATCH /api/itineraries/:id
 * @access Customer (owner or edit-collaborator)
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

    const { title, budget, startDate, endDate } = req.body;
    if (title !== undefined) itinerary.title = title;
    if (budget !== undefined) itinerary.budget = budget;
    if (startDate !== undefined) itinerary.startDate = startDate;
    if (endDate !== undefined) itinerary.endDate = endDate;
    await itinerary.save();

    const populated = await Itinerary.findById(itinerary._id)
      .populate('owner', 'username email')
      .populate('collaborators.user', 'username email');
    return res.json({ success: true, itinerary: hydrateItinerary(populated) });
  } catch (error) {
    console.error('Update itinerary error:', error);
    return res.status(500).json({ success: false, message: 'Unable to update itinerary' });
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

    if (req.body.endTime <= req.body.startTime) {
      return res.status(400).json({ success: false, message: 'End time must be after start time' });
    }

    itinerary.activities.push(req.body);
    await itinerary.save();

    const populated = await Itinerary.findById(itinerary._id)
      .populate('owner', 'username email')
      .populate('collaborators.user', 'username email');
    return res.status(201).json({ success: true, itinerary: hydrateItinerary(populated) });
  } catch (error) {
    console.error('Add itinerary activity error:', error);
    return res.status(500).json({ success: false, message: 'Unable to add activity' });
  }
};

/**
 * Share an itinerary by adding a collaborator (owner-only).
 * @route POST /api/itineraries/:id/collaborators
 * @access Customer (owner)
 */
export const addCollaborator = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: errors.array()[0].msg, errors: errors.array() });
  }

  try {
    const itinerary = await Itinerary.findById(req.params.id);
    if (!itinerary || !itinerary.owner.equals(req.user._id)) {
      return res.status(404).json({ success: false, message: 'Itinerary not found' });
    }

    const { email, permission = 'view' } = req.body;
    const targetUser = await User.findOne({ email });
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
    }
    if (itinerary.owner.equals(targetUser._id)) {
      return res.status(400).json({ success: false, message: 'Cannot share with yourself' });
    }
    if (itinerary.collaborators.some((c) => c.user.equals(targetUser._id))) {
      return res.status(400).json({ success: false, message: 'User is already a collaborator' });
    }

    itinerary.collaborators.push({ user: targetUser._id, permission });
    await itinerary.save();

    const populated = await Itinerary.findById(itinerary._id)
      .populate('owner', 'username email')
      .populate('collaborators.user', 'username email');
    return res.json({ success: true, itinerary: hydrateItinerary(populated) });
  } catch (error) {
    console.error('Add collaborator error:', error);
    return res.status(500).json({ success: false, message: 'Unable to share itinerary' });
  }
};

/**
 * Update a collaborator's permission (owner-only).
 * @route PATCH /api/itineraries/:id/collaborators/:collaboratorId
 * @access Customer (owner)
 */
export const updateCollaboratorPermission = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: errors.array()[0].msg, errors: errors.array() });
  }

  try {
    const itinerary = await Itinerary.findById(req.params.id);
    if (!itinerary || !itinerary.owner.equals(req.user._id)) {
      return res.status(404).json({ success: false, message: 'Itinerary not found' });
    }

    const collaborator = itinerary.collaborators.find(
      (c) => String(c.user) === req.params.collaboratorId
    );
    if (!collaborator) {
      return res.status(404).json({ success: false, message: 'Collaborator not found' });
    }

    collaborator.permission = req.body.permission;
    await itinerary.save();

    const populated = await Itinerary.findById(itinerary._id)
      .populate('owner', 'username email')
      .populate('collaborators.user', 'username email');
    return res.json({ success: true, itinerary: hydrateItinerary(populated) });
  } catch (error) {
    console.error('Update collaborator error:', error);
    return res.status(500).json({ success: false, message: 'Unable to update collaborator' });
  }
};

/**
 * Remove a collaborator from an itinerary (owner-only).
 * @route DELETE /api/itineraries/:id/collaborators/:collaboratorId
 * @access Customer (owner)
 */
export const removeCollaborator = async (req, res) => {
  try {
    const itinerary = await Itinerary.findById(req.params.id);
    if (!itinerary || !itinerary.owner.equals(req.user._id)) {
      return res.status(404).json({ success: false, message: 'Itinerary not found' });
    }

    if (!itinerary.collaborators.some((c) => String(c.user) === req.params.collaboratorId)) {
      return res.status(404).json({ success: false, message: 'Collaborator not found' });
    }

    itinerary.collaborators = itinerary.collaborators.filter(
      (c) => String(c.user) !== req.params.collaboratorId
    );
    await itinerary.save();

    const populated = await Itinerary.findById(itinerary._id)
      .populate('owner', 'username email')
      .populate('collaborators.user', 'username email');
    return res.json({ success: true, itinerary: hydrateItinerary(populated) });
  } catch (error) {
    console.error('Remove collaborator error:', error);
    return res.status(500).json({ success: false, message: 'Unable to remove collaborator' });
  }
};
