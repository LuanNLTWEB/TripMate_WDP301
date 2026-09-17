import DestinationCategory from '../models/DestinationCategory.js';
import Destination from '../models/Destination.js';
import { validationResult } from 'express-validator';

/**
 * Get all destination categories.
 * @route GET /api/destination-categories
 * @access Public
 */
export const getAllCategories = async (req, res) => {
  try {
    const categories = await DestinationCategory.find().sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: categories.length,
      data: categories
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching categories'
    });
  }
};

/**
 * Create a new destination category.
 * @route POST /api/destination-categories
 * @access Staff, Admin
 */
export const createCategory = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: errors.array()[0].msg,
      errors: errors.array()
    });
  }

  try {
    const existing = await DestinationCategory.findOne({ name: req.body.name });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Danh mục đã tồn tại'
      });
    }

    const category = await DestinationCategory.create({
      name: req.body.name,
      description: req.body.description || ''
    });

    return res.status(201).json({
      success: true,
      message: 'Tạo danh mục thành công',
      data: category
    });
  } catch (error) {
    console.error('Error creating category:', error);
    return res.status(500).json({
      success: false,
      message: 'Không thể tạo danh mục'
    });
  }
};

/**
 * Update a destination category.
 * @route PUT /api/destination-categories/:id
 * @access Staff, Admin
 */
export const updateCategory = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: errors.array()[0].msg,
      errors: errors.array()
    });
  }

  try {
    const category = await DestinationCategory.findById(req.params.id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy danh mục'
      });
    }

    const duplicate = await DestinationCategory.findOne({
      name: req.body.name,
      _id: { $ne: req.params.id }
    });
    if (duplicate) {
      return res.status(400).json({
        success: false,
        message: 'Tên danh mục đã tồn tại'
      });
    }

    category.name = req.body.name;
    category.description = req.body.description ?? category.description;
    await category.save();

    return res.status(200).json({
      success: true,
      message: 'Cập nhật danh mục thành công',
      data: category
    });
  } catch (error) {
    console.error('Error updating category:', error);
    return res.status(500).json({
      success: false,
      message: 'Không thể cập nhật danh mục'
    });
  }
};

/**
 * Delete a destination category.
 * @route DELETE /api/destination-categories/:id
 * @access Staff, Admin
 */
export const deleteCategory = async (req, res) => {
  try {
    const category = await DestinationCategory.findById(req.params.id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy danh mục'
      });
    }

    const destinationCount = await Destination.countDocuments({
      categoryId: req.params.id,
      isDeleted: { $ne: true }
    });
    if (destinationCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Không thể xóa danh mục đang được sử dụng bởi điểm đến'
      });
    }

    await DestinationCategory.findByIdAndDelete(req.params.id);

    return res.status(200).json({
      success: true,
      message: 'Xóa danh mục thành công',
      data: {}
    });
  } catch (error) {
    console.error('Error deleting category:', error);
    return res.status(500).json({
      success: false,
      message: 'Không thể xóa danh mục'
    });
  }
};
