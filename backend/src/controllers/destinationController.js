import Destination from '../models/Destination.js';
import { validationResult } from 'express-validator';

/**
 * Create a destination in the Staff catalogue.
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
      name: req.body.name,
      description: req.body.description,
      location: req.body.location,
      images: req.body.images,
      isPopular: req.body.isPopular === true || req.body.isPopular === 'true',
      createdBy: req.user._id
    });

    return res.status(201).json({
      success: true,
      message: 'Tạo điểm đến thành công',
      data: destination
    });
  } catch (error) {
    console.error('Error creating destination:', error);
    return res.status(500).json({
      success: false,
      message: 'Không thể tạo điểm đến'
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
      return res.status(404).json({ success: false, message: 'Destination not found' });
    }

    return res.json({
      success: true,
      message: 'Cập nhật trạng thái thành công',
      data: destination
    });
  } catch (error) {
    console.error('Error updating destination status:', error);
    return res.status(500).json({
      success: false,
      message: 'Không thể cập nhật trạng thái điểm đến'
    });
  }
};

// @desc    Get all destinations
// @route   GET /api/destinations
// @access  Public (Guest)
export const getAllDestinations = async (req, res) => {
  try {
    const { isPopular, search, page = 1, limit = 10 } = req.query;
    let query = {};
    
    if (isPopular === 'true') {
      query.isPopular = true;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } }
      ];
    }

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const startIndex = (pageNum - 1) * limitNum;

    const total = await Destination.countDocuments(query);
    const destinations = await Destination.find(query)
      .sort({ createdAt: -1 })
      .skip(startIndex)
      .limit(limitNum);
    
    res.status(200).json({
      success: true,
      count: destinations.length,
      total,
      totalPages: Math.ceil(total / limitNum),
      currentPage: pageNum,
      data: destinations
    });
  } catch (error) {
    console.error('Error fetching destinations:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching destinations'
    });
  }
};

// @desc    Get single destination
// @route   GET /api/destinations/:id
// @access  Public (Guest)
export const getDestinationById = async (req, res) => {
  try {
    const destination = await Destination.findById(req.params.id);

    if (!destination) {
      return res.status(404).json({
        success: false,
        message: 'Destination not found'
      });
    }

    res.status(200).json({
      success: true,
      data: destination
    });
  } catch (error) {
    console.error('Error fetching destination by ID:', error);
    
    // Check if the error is a cast error (invalid ID format)
    if (error.name === 'CastError') {
       return res.status(404).json({
        success: false,
        message: 'Destination not found'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error while fetching destination'
    });
  }
};
