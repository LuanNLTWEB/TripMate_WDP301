import Tour from '../models/Tour.js';
import User from '../models/User.js';
import { validationResult } from 'express-validator';

// @desc    Get the current customer's favorite tours
// @route   GET /api/tours/favorites
// @access  Private (Customer)
export const getFavoriteTours = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('favoriteTours');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy người dùng'
      });
    }

    const favoriteTours = (user.favoriteTours || []).filter(Boolean);

    res.status(200).json({
      success: true,
      count: favoriteTours.length,
      favoriteTourIds: favoriteTours.map((tour) => tour._id),
      data: favoriteTours
    });
  } catch (error) {
    console.error('Error fetching favorite tours:', error);
    res.status(500).json({
      success: false,
      message: 'Không thể tải danh sách tour yêu thích'
    });
  }
};

// @desc    Remove a tour from the current customer's favorites
// @route   DELETE /api/tours/:id/favorite
// @access  Private (Customer)
export const removeFavoriteTour = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: errors.array()[0]?.msg || 'Mã tour không hợp lệ',
      errors: errors.array()
    });
  }

  try {
    await User.findByIdAndUpdate(req.user._id, {
      $pull: { favoriteTours: req.params.id }
    });

    res.status(200).json({
      success: true,
      message: 'Đã bỏ lưu tour yêu thích',
      tourId: req.params.id,
      isFavorite: false
    });
  } catch (error) {
    console.error('Error removing favorite tour:', error);
    res.status(500).json({
      success: false,
      message: 'Không thể bỏ lưu tour yêu thích'
    });
  }
};

// @desc    Save a tour to the current customer's favorites
// @route   POST /api/tours/:id/favorite
// @access  Private (Customer)
export const saveFavoriteTour = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: errors.array()[0]?.msg || 'Mã tour không hợp lệ',
      errors: errors.array()
    });
  }

  try {
    const tour = await Tour.findById(req.params.id);
    if (!tour) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy tour'
      });
    }

    const alreadyFavorite = (req.user.favoriteTours || [])
      .some((tourId) => tourId.equals(tour._id));

    if (!alreadyFavorite) {
      await User.findByIdAndUpdate(req.user._id, {
        $addToSet: { favoriteTours: tour._id }
      });
    }

    res.status(200).json({
      success: true,
      message: alreadyFavorite ? 'Tour đã có trong danh sách yêu thích' : 'Đã lưu tour yêu thích',
      tourId: tour._id,
      isFavorite: true
    });
  } catch (error) {
    console.error('Error saving favorite tour:', error);
    res.status(500).json({
      success: false,
      message: 'Không thể lưu tour yêu thích'
    });
  }
};

// @desc    Get all tours
// @route   GET /api/tours
// @access  Public (Guest)
export const getAllTours = async (req, res) => {
  try {
    const { search, page = 1, limit = 10 } = req.query;
    let query = {};
    
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } }
      ];
    }

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const startIndex = (pageNum - 1) * limitNum;

    const total = await Tour.countDocuments(query);
    const tours = await Tour.find(query)
      .sort({ createdAt: -1 })
      .skip(startIndex)
      .limit(limitNum);
    
    res.status(200).json({
      success: true,
      count: tours.length,
      total,
      totalPages: Math.ceil(total / limitNum),
      currentPage: pageNum,
      data: tours
    });
  } catch (error) {
    console.error('Error fetching tours:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching tours'
    });
  }
};

// @desc    Get single tour
// @route   GET /api/tours/:id
// @access  Public (Guest)
export const getTourById = async (req, res) => {
  try {
    const tour = await Tour.findById(req.params.id);

    if (!tour) {
      return res.status(404).json({
        success: false,
        message: 'Tour not found'
      });
    }

    res.status(200).json({
      success: true,
      data: tour
    });
  } catch (error) {
    console.error('Error fetching tour by ID:', error);
    
    // Check if the error is a cast error (invalid ID format)
    if (error.name === 'CastError') {
       return res.status(404).json({
        success: false,
        message: 'Tour not found'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error while fetching tour'
    });
  }
};
