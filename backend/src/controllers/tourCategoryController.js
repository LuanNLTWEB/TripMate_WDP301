import TourCategory from '../models/TourCategory.js';
import Tour from '../models/Tour.js';
import { validationResult } from 'express-validator';

/**
 * Get all tour categories.
 * @route GET /api/tour-categories
 * @access Public
 */
export const getAllCategories = async (req, res) => {
  try {
    const categories = await TourCategory.find().sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: categories.length,
      data: categories
    });
  } catch (error) {
    console.error('Error fetching tour categories:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching tour categories'
    });
  }
};

/**
 * Create a new tour category.
 * @route POST /api/tour-categories
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
    const existing = await TourCategory.findOne({ name: req.body.name.trim() });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Danh mục tour đã tồn tại'
      });
    }

    const category = await TourCategory.create({
      name: req.body.name.trim(),
      description: req.body.description ? req.body.description.trim() : ''
    });

    return res.status(201).json({
      success: true,
      message: 'Tạo danh mục tour thành công',
      data: category
    });
  } catch (error) {
    console.error('Error creating tour category:', error);
    return res.status(500).json({
      success: false,
      message: 'Không thể tạo danh mục tour'
    });
  }
};

/**
 * Update a tour category.
 * @route PUT /api/tour-categories/:id
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
    const category = await TourCategory.findById(req.params.id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy danh mục tour'
      });
    }

    const duplicate = await TourCategory.findOne({
      name: req.body.name.trim(),
      _id: { $ne: req.params.id }
    });
    if (duplicate) {
      return res.status(400).json({
        success: false,
        message: 'Tên danh mục tour đã tồn tại'
      });
    }

    category.name = req.body.name.trim();
    category.description = req.body.description !== undefined ? req.body.description.trim() : category.description;
    await category.save();

    return res.status(200).json({
      success: true,
      message: 'Cập nhật danh mục tour thành công',
      data: category
    });
  } catch (error) {
    console.error('Error updating tour category:', error);
    return res.status(500).json({
      success: false,
      message: 'Không thể cập nhật danh mục tour'
    });
  }
};

/**
 * Delete a tour category.
 * @route DELETE /api/tour-categories/:id
 * @access Staff, Admin
 */
export const deleteCategory = async (req, res) => {
  try {
    const category = await TourCategory.findById(req.params.id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy danh mục tour'
      });
    }

    const tourCount = await Tour.countDocuments({
      categoryId: req.params.id
    });
    if (tourCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Không thể xóa danh mục đang được sử dụng bởi tour'
      });
    }

    await TourCategory.findByIdAndDelete(req.params.id);

    return res.status(200).json({
      success: true,
      message: 'Xóa danh mục tour thành công',
      data: {}
    });
  } catch (error) {
    console.error('Error deleting tour category:', error);
    return res.status(500).json({
      success: false,
      message: 'Không thể xóa danh mục tour'
    });
  }
};
