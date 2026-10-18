import Destination from '../models/Destination.js';
import User from '../models/User.js';
import Itinerary from '../models/Itinerary.js';
import { validationResult } from 'express-validator';
import mongoose from 'mongoose';
import { logActivity } from '../utils/activityLogger.js';

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const DESTINATION_STATUS_VALUES = ['active', 'inactive'];

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

    await logActivity({
      admin: req.user,
      action: 'CREATE_DESTINATION',
      targetType: 'Destination',
      targetId: destination._id,
      details: `Tạo điểm đến "${destination.name}" với trạng thái "${destination.status}"`,
      req
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
    const destination = await Destination.findOne({
      _id: req.params.id,
      isDeleted: { $ne: true }
    });
    if (!destination) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy điểm đến' });
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

    await logActivity({
      admin: req.user,
      action: 'UPDATE_DESTINATION',
      targetType: 'Destination',
      targetId: destination._id,
      details: `Cập nhật thông tin điểm đến "${destination.name}"`,
      req
    });

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
    if (!DESTINATION_STATUS_VALUES.includes(req.body.status)) {
      return res.status(400).json({
        success: false,
        message: 'Trạng thái phải là active hoặc inactive'
      });
    }

    const existingDestination = await Destination.findOne({
      _id: req.params.id,
      isDeleted: { $ne: true }
    });

    if (!existingDestination) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy điểm đến' });
    }

    const previousStatus = existingDestination.status;

    const destination = await Destination.findOneAndUpdate(
      { _id: req.params.id, isDeleted: { $ne: true } },
      { status: req.body.status },
      { new: true, runValidators: true }
    );

    if (!destination) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy điểm đến' });
    }

    await logActivity({
      admin: req.user,
      action: 'UPDATE_DESTINATION_STATUS',
      targetType: 'Destination',
      targetId: destination._id,
      details: `Cập nhật trạng thái điểm đến "${destination.name}" từ "${previousStatus}" sang "${destination.status}"`,
      req
    });

    return res.json({
      success: true,
      message: 'Cập nhật trạng thái thành công',
      data: destination
    });
  } catch (error) {
    console.error('Error updating destination status:', error);

    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Mã điểm đến không hợp lệ'
      });
    }

    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Trạng thái phải là active hoặc inactive'
      });
    }

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
    const {
      isPopular,
      search,
      categoryId,
      minRating,
      sort = 'newest',
      page = 1,
      limit = 10
    } = req.query;
    const query = { isDeleted: { $ne: true }, status: 'active' };
    
    if (isPopular === 'true') {
      query.isPopular = true;
    }

    if (search) {
      const safeSearch = escapeRegex(search);
      query.$or = [
        { name: { $regex: safeSearch, $options: 'i' } },
        { location: { $regex: safeSearch, $options: 'i' } }
      ];
    }

    if (categoryId) {
      if (!mongoose.Types.ObjectId.isValid(categoryId)) {
        return res.status(400).json({ success: false, message: 'Danh mục điểm đến không hợp lệ' });
      }
      query.categoryId = categoryId;
    }

    const parsedMinRating = Number(minRating);
    if (minRating !== undefined && minRating !== '' && Number.isFinite(parsedMinRating)) {
      query.averageRating = { $gte: Math.min(Math.max(parsedMinRating, 0), 5) };
    }

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 100);
    const startIndex = (pageNum - 1) * limitNum;
    const sortOptions = {
      newest: { createdAt: -1 },
      rating: { averageRating: -1 },
      nameAsc: { name: 1 }
    };

    const total = await Destination.countDocuments(query);
    const destinations = await Destination.find(query)
      .sort(sortOptions[sort] || sortOptions.newest)
      .skip(startIndex)
      .limit(limitNum)
      .populate('categoryId', 'name');
    
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
      message: 'Không thể tải danh sách điểm đến'
    });
  }
};

/**
 * List every non-deleted destination for Staff moderation, including inactive ones.
 * Mirrors BR-25: staff and admin can see all destinations regardless of status.
 * @route GET /api/destinations/management
 * @access Staff, Admin
 */
export const getManagedDestinations = async (req, res) => {
  try {
    const {
      search,
      categoryId,
      status,
      sort = 'newest',
      page = 1,
      limit = 10
    } = req.query;

    const query = { isDeleted: { $ne: true } };

    if (status) {
      if (!DESTINATION_STATUS_VALUES.includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Trạng thái phải là active hoặc inactive'
        });
      }
      query.status = status;
    }

    if (search) {
      const safeSearch = escapeRegex(search);
      query.$or = [
        { name: { $regex: safeSearch, $options: 'i' } },
        { location: { $regex: safeSearch, $options: 'i' } }
      ];
    }

    if (categoryId) {
      if (!mongoose.Types.ObjectId.isValid(categoryId)) {
        return res.status(400).json({ success: false, message: 'Danh mục điểm đến không hợp lệ' });
      }
      query.categoryId = categoryId;
    }

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 100);
    const startIndex = (pageNum - 1) * limitNum;
    const sortOptions = {
      newest: { createdAt: -1 },
      nameAsc: { name: 1 }
    };

    const total = await Destination.countDocuments(query);
    const destinations = await Destination.find(query)
      .sort(sortOptions[sort] || sortOptions.newest)
      .skip(startIndex)
      .limit(limitNum)
      .populate('categoryId', 'name');

    res.status(200).json({
      success: true,
      count: destinations.length,
      total,
      totalPages: Math.ceil(total / limitNum),
      currentPage: pageNum,
      data: destinations
    });
  } catch (error) {
    console.error('Error fetching managed destinations:', error);
    res.status(500).json({
      success: false,
      message: 'Không thể tải danh sách điểm đến'
    });
  }
};

// @desc    Get single destination
// @route   GET /api/destinations/:id
// @access  Public (Guest)
export const getDestinationById = async (req, res) => {
  try {
    const destination = await Destination.findOne({
      _id: req.params.id,
      isDeleted: { $ne: true },
      status: 'active'
    }).populate('categoryId');

    if (!destination) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy điểm đến'
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
        message: 'Không tìm thấy điểm đến'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Không thể tải thông tin điểm đến'
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
      return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
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
      const destination = await Destination.findOne({
        _id: destinationId,
        status: 'active',
        isDeleted: { $ne: true }
      });
      if (!destination) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy điểm đến đang hoạt động'
        });
      }

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

/**
 * Remove a destination from the current customer's favorites.
 * This endpoint is idempotent so repeated requests never add the item back.
 * @route DELETE /api/destinations/:id/favorite
 * @access Private (Customer)
 */
export const removeFavoriteDestination = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: errors.array()[0].msg,
      errors: errors.array()
    });
  }

  try {
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $pull: { favoriteDestinations: req.params.id } },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
    }

    return res.status(200).json({
      success: true,
      message: 'Đã bỏ lưu điểm đến yêu thích',
      destinationId: req.params.id,
      isFavorite: false
    });
  } catch (error) {
    console.error('Error removing favorite destination:', error);
    return res.status(500).json({ success: false, message: 'Không thể bỏ lưu điểm đến yêu thích' });
  }
};

// @desc    Get favorite destinations of current user
// @route   GET /api/destinations/favorites
// @access  Private (Customer)
export const getFavoriteDestinations = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate({
      path: 'favoriteDestinations',
      match: { isDeleted: { $ne: true }, status: 'active' }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy người dùng'
      });
    }

    const favoriteDestinations = (user.favoriteDestinations || []).filter(Boolean);

    res.status(200).json({
      success: true,
      count: favoriteDestinations.length,
      data: favoriteDestinations
    });
  } catch (error) {
    console.error('Error fetching favorite destinations:', error);
    res.status(500).json({
      success: false,
      message: 'Không thể tải danh sách yêu thích'
    });
  }
};

export const deleteDestination = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: errors.array()[0].msg,
      errors: errors.array()
    });
  }

  try {
    const destination = await Destination.findOneAndUpdate(
      { _id: req.params.id, isDeleted: { $ne: true } },
      {
        isDeleted: true,
        deletedAt: new Date(),
        status: 'inactive',
        isPopular: false
      },
      { new: true, runValidators: true }
    );

    if (!destination) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy điểm đến'
      });
    }

    await Promise.all([
      User.updateMany(
        { favoriteDestinations: destination._id },
        { $pull: { favoriteDestinations: destination._id } }
      ),
      Itinerary.updateMany(
        { destinations: destination._id },
        { $pull: { destinations: destination._id } }
      )
    ]);

    await logActivity({
      admin: req.user,
      action: 'DELETE_DESTINATION',
      targetType: 'Destination',
      targetId: destination._id,
      details: `Xóa điểm đến "${destination.name}" và thu hồi trạng thái khỏi danh mục`,
      req
    });

    return res.json({
      success: true,
      message: 'Đã xóa điểm đến',
      destinationId: destination._id
    });
  } catch (error) {
    console.error('Error deleting destination:', error);
    return res.status(500).json({
      success: false,
      message: 'Không thể xóa điểm đến'
    });
  }
};
