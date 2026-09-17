import { validationResult } from 'express-validator';
import Itinerary from '../models/Itinerary.js';
import Destination from '../models/Destination.js';

const destinationFields = 'name location images status';

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
 * Return a plain-object itinerary with a computed `conflicts` field.
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
    return res.status(201).json({ success: true, itinerary });
  } catch (error) {
    console.error('Create itinerary error:', error);
    return res.status(500).json({ success: false, message: 'Unable to create itinerary' });
  }
};

const findAllPopulated = (filter) => Itinerary.find(filter)
  .populate('destinations', destinationFields)
  .populate('owner', 'username email')
  .populate('collaborators.user', 'username email');

const findByIdPopulated = (id) => Itinerary.findById(id)
  .populate('destinations', destinationFields)
  .populate('owner', 'username email')
  .populate('collaborators.user', 'username email');

/**
 * List personal itineraries owned by the authenticated customer.
 * @route GET /api/itineraries
 * @access Customer
 */
export const listItineraries = async (req, res) => {
  try {
    const itineraries = await findAllPopulated({ owner: req.user._id }).sort({ updatedAt: -1 });
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
    const itineraries = await findAllPopulated({ 'collaborators.user': req.user._id }).sort({ updatedAt: -1 });
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
    const itinerary = await findByIdPopulated(req.params.id);
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
 * Return detected schedule conflicts for an itinerary.
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

    const populated = await findByIdPopulated(itinerary._id);
    return res.status(201).json({ success: true, itinerary: hydrateItinerary(populated) });
  } catch (error) {
    console.error('Add itinerary activity error:', error);
    return res.status(500).json({ success: false, message: 'Unable to add activity' });
  }
};

/**
 * Add an active destination to an owned or edit-enabled shared itinerary.
 * @route POST /api/itineraries/:id/destinations
 * @access Customer
 */
export const addDestination = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: errors.array()[0].msg, errors: errors.array() });
  }

  try {
    const itinerary = await Itinerary.findById(req.params.id);
    if (!itinerary || !canEdit(itinerary, req.user._id)) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy lịch trình có thể chỉnh sửa' });
    }

    const destination = await Destination.findOne({
      _id: req.body.destinationId,
      status: { $ne: 'inactive' }
    });
    if (!destination) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy điểm đến đang hoạt động' });
    }

    const alreadyAdded = itinerary.destinations.some(
      (destinationId) => destinationId.equals(destination._id)
    );
    if (alreadyAdded) {
      return res.status(400).json({ success: false, message: 'Điểm đến đã có trong lịch trình' });
    }

    itinerary.destinations.push(destination._id);
    await itinerary.save();

    const populated = await findByIdPopulated(itinerary._id);
    return res.status(201).json({
      success: true,
      message: 'Đã thêm điểm đến vào lịch trình',
      itinerary: hydrateItinerary(populated)
    });
  } catch (error) {
    console.error('Add itinerary destination error:', error);
    return res.status(500).json({ success: false, message: 'Không thể thêm điểm đến vào lịch trình' });
  }
};