import DestinationCategory from '../models/DestinationCategory.js';
import Destination from '../models/Destination.js';
import { validationResult } from 'express-validator';
import { logActivity } from '../utils/activityLogger.js';

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// So khớp tên danh mục không phân biệt hoa/thường và bỏ khoảng trắng đầu/cuối.
const buildCategoryNameQuery = (name, excludeId = null) => {
  const query = {
    name: new RegExp(`^${escapeRegex(String(name || '').trim())}$`, 'i')
  };
  if (excludeId) query._id = { $ne: excludeId };
  return query;
};

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

// START UC-116 Create Destination Category
/**
 * Create a new destination category.
 * @route POST /api/destination-categories
 * @access Staff
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
    const name = String(req.body.name || '').trim();
    const existing = await DestinationCategory.findOne(buildCategoryNameQuery(name));
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Danh mục đã tồn tại'
      });
    }

    const category = await DestinationCategory.create({
      name,
      description: req.body.description || ''
    });

    await logActivity({
      admin: req.user,
      action: 'CREATE_DESTINATION_CATEGORY',
      targetType: 'DestinationCategory',
      targetId: category._id,
      details: `Tạo danh mục điểm đến "${category.name}"`,
      req
    });

    return res.status(201).json({
      success: true,
      message: 'Tạo danh mục thành công',
      data: category
    });
  } catch (error) {
    // Hai request đồng thời có thể cùng vượt qua bước kiểm tra trùng,
    // request đến sau vi phạm unique index và nhận E11000.
    if (error?.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Danh mục đã tồn tại'
      });
    }

    console.error('Error creating category:', error);
    return res.status(500).json({
      success: false,
      message: 'Không thể tạo danh mục'
    });
  }
};
// END UC-116 Create Destination Category

// START UC-117 Update Destination Category
/**
 * Update a destination category.
 * @route PUT /api/destination-categories/:id
 * @access Staff
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

    const duplicate = await DestinationCategory.findOne(
      buildCategoryNameQuery(req.body.name, req.params.id)
    );
    if (duplicate) {
      return res.status(400).json({
        success: false,
        message: 'Tên danh mục đã tồn tại'
      });
    }

    category.name = String(req.body.name || '').trim();
    category.description = req.body.description ?? category.description;
    await category.save();

    await logActivity({
      admin: req.user,
      action: 'UPDATE_DESTINATION_CATEGORY',
      targetType: 'DestinationCategory',
      targetId: category._id,
      details: `Cập nhật danh mục điểm đến "${category.name}"`,
      req
    });

    return res.status(200).json({
      success: true,
      message: 'Cập nhật danh mục thành công',
      data: category
    });
  } catch (error) {
    // Trùng tên do hai request đồng thời hoặc unique index của MongoDB.
    if (error?.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Tên danh mục đã tồn tại'
      });
    }

    console.error('Error updating category:', error);
    return res.status(500).json({
      success: false,
      message: 'Không thể cập nhật danh mục'
    });
  }
};
// END UC-117 Update Destination Category

/**
 * Delete a destination category.
 * @route DELETE /api/destination-categories/:id
 * @access Staff
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
