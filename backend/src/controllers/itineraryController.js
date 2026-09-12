import { validationResult } from 'express-validator';
import Itinerary from '../models/Itinerary.js';

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
    const itineraries = await Itinerary.find({ owner: req.user._id }).sort({ updatedAt: -1 });
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
    const itinerary = await Itinerary.findById(req.params.id);
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
