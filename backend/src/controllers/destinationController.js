import Destination from '../models/Destination.js';
import User from '../models/User.js';
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
      categoryId: req.body.categoryId || null,
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
 * Update a destination.
 * @route PUT /api/destinations/:id
 * @access Staff, Admin
 */
export const updateDestination = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: errors.array()[0].msg,
      errors: errors.array()
    });
  }

  try {
    const destination = await Destination.findById(req.params.id);
    if (!destination) {
      return res.status(404).json({ success: false, message: 'Destination not found' });
    }

    destination.name = req.body.name ?? destination.name;
    destination.description = req.body.description ?? destination.description;
    destination.location = req.body.location ?? destination.location;
    destination.images = req.body.images ?? destination.images;
    destination.categoryId = req.body.categoryId !== undefined ? (req.body.categoryId || null) : destination.categoryId;
    destination.isPopular = req.body.isPopular !== undefined
      ? (req.body.isPopular === true || req.body.isPopular === 'true')
      : destination.isPopular;

    await destination.save();

    return res.status(200).json({
      success: true,
      message: 'Cập nhật điểm đến thành công',
      data: destination
    });
  } catch (error) {
    console.error('Error updating destination:', error);
    return res.status(500).json({
      success: false,
      message: 'Không thể cập nhật điểm đến'
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
    const destination = await Destination.findById(req.params.id).populate('categoryId');

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

/**
 * Toggle save/unsave a destination for the current customer.
 * @route POST /api/destinations/:id/favorite
 * @access Private (Customer)
 */
export const toggleFavorite = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const destinationId = req.params.id;
    const alreadySaved = user.favoriteDestinations.some(
      (fav) => fav.toString() === destinationId
    );

    if (alreadySaved) {
      // Unsave
      user.favoriteDestinations = user.favoriteDestinations.filter(
        (fav) => fav.toString() !== destinationId
      );
    } else {
      // Save
      user.favoriteDestinations.push(destinationId);
    }

    await user.save();

    return res.json({
      success: true,
      isFavorite: !alreadySaved,
      message: alreadySaved ? 'Đã bỏ yêu thích' : 'Đã lưu yêu thích'
    });
  } catch (error) {
    console.error('Error toggling favorite:', error);
    return res.status(500).json({ success: false, message: 'Không thể cập nhật yêu thích' });
  }
};

// @desc    Get favorite destinations of current user
// @route   GET /api/destinations/favorites
// @access  Private (Customer)
export const getFavoriteDestinations = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('favoriteDestinations');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      count: user.favoriteDestinations.length,
      data: user.favoriteDestinations
    });
  } catch (error) {
    console.error('Error fetching favorite destinations:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching favorite destinations'
    });
  }
};
