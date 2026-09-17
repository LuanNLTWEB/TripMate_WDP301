import { validationResult } from 'express-validator';
import Itinerary from '../models/Itinerary.js';
import Destination from '../models/Destination.js';

const destinationFields = 'name location images status';

const canView = (itinerary, userId) => (
  itinerary.owner.equals(userId) || itinerary.collaborators.some((collaborator) => collaborator.user.equals(userId))
);

const canEdit = (itinerary, userId) => (
  itinerary.owner.equals(userId) || itinerary.collaborators.some((collaborator) => (
    collaborator.user.equals(userId) && collaborator.permission === 'edit'
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

/**
 * List personal itineraries owned by the authenticated customer.
 * @route GET /api/itineraries
 * @access Customer
 */
export const listItineraries = async (req, res) => {
  try {
    const itineraries = await Itinerary.find({ owner: req.user._id })
      .populate('destinations', destinationFields)
      .sort({ updatedAt: -1 });
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
    const itinerary = await Itinerary.findById(req.params.id)
      .populate('destinations', destinationFields);
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

    if (req.body.endTime <= req.body.startTime) {
      return res.status(400).json({ success: false, message: 'End time must be after start time' });
    }

    itinerary.activities.push(req.body);
    await itinerary.save();
    await itinerary.populate('destinations', destinationFields);
    return res.status(201).json({ success: true, itinerary });
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
    await itinerary.populate('destinations', destinationFields);

    return res.status(201).json({
      success: true,
      message: 'Đã thêm điểm đến vào lịch trình',
      itinerary
    });
  } catch (error) {
    console.error('Add itinerary destination error:', error);
    return res.status(500).json({ success: false, message: 'Không thể thêm điểm đến vào lịch trình' });
  }
};
