import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import { ACCESS_ROLES } from '../config/accessControl.js';
import {
  getAllCategories,
  createCategory,
  updateCategory,
  deleteCategory
} from '../controllers/tourCategoryController.js';
import {
  createCategoryValidation,
  updateCategoryValidation,
  categoryIdValidation
} from '../middleware/validate.js';

const router = express.Router();

// @route   GET /api/tour-categories
// @desc    Get all tour categories
// @access  Public
router.get('/', getAllCategories);

// @route   POST /api/tour-categories
// @desc    Create a tour category
// @access  Staff
router.post(
  '/',
  protect,
  authorize(...ACCESS_ROLES.STAFF_ONLY),
  createCategoryValidation,
  createCategory
);

// @route   PUT /api/tour-categories/:id
// @desc    Update a tour category
// @access  Staff
router.put(
  '/:id',
  protect,
  authorize(...ACCESS_ROLES.STAFF_ONLY),
  updateCategoryValidation,
  updateCategory
);

// @route   DELETE /api/tour-categories/:id
// @desc    Delete a tour category
// @access  Staff
router.delete(
  '/:id',
  protect,
  authorize(...ACCESS_ROLES.STAFF_ONLY),
  categoryIdValidation,
  deleteCategory
);

export default router;
