import { validationResult } from 'express-validator';
import Destination from '../models/Destination.js';

/**
 * Return active destinations for public catalogue browsing.
 * @route GET /api/destinations
 * @access Public
 */
export const listDestinations = async (req, res) => {
  try {
    const filter = { status: 'active' };

    if (req.query.category) {
      filter.category = req.query.category;
    }

    if (req.query.search) {
      filter.$or = [
        { name: { $regex: req.query.search, $options: 'i' } },
        { 'location.city': { $regex: req.query.search, $options: 'i' } }
      ];
    }

    const destinations = await Destination.find(filter)
      .sort({ createdAt: -1 })
      .lean();

    return res.json({ success: true, destinations });
  } catch (error) {
    console.error('List destinations error:', error);
    return res.status(500).json({
      success: false,
      message: 'Unable to load destinations'
    });
  }
};

/**
 * Create a destination for the destination catalogue.
 * @route POST /api/destinations
 * @access Staff, Admin
 */
export const createDestination = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: errors.array()[0].msg,
      errors: errors.array()
    });
  }

  try {
    const destination = await Destination.create({
      ...req.body,
      createdBy: req.user._id
    });

    return res.status(201).json({
      success: true,
      message: 'Destination created successfully',
      destination
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'A destination with this name already exists in the city'
      });
    }

    console.error('Create destination error:', error);
    return res.status(500).json({
      success: false,
      message: 'Unable to create destination'
    });
  }
};

/**
 * Activate or deactivate a destination in the catalogue.
 * @route PATCH /api/destinations/:id/status
 * @access Staff, Admin
 */
export const updateDestinationStatus = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: errors.array()[0].msg,
      errors: errors.array()
    });
  }

  try {
    const destination = await Destination.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status },
      { new: true, runValidators: true }
    );

    if (!destination) {
      return res.status(404).json({
        success: false,
        message: 'Destination not found'
      });
    }

    return res.json({
      success: true,
      message: 'Destination status updated successfully',
      destination
    });
  } catch (error) {
    console.error('Update destination status error:', error);
    return res.status(500).json({
      success: false,
      message: 'Unable to update destination status'
    });
  }
};
