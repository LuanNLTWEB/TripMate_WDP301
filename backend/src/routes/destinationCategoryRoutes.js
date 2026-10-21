import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import { ACCESS_ROLES } from '../config/accessControl.js';
import {
  getAllCategories,
  createCategory,
  updateCategory,
  deleteCategory
} from '../controllers/destinationCategoryController.js';
import {
  createCategoryValidation,
  updateCategoryValidation,
  categoryIdValidation
} from '../middleware/validate.js';

const router = express.Router();

// @route   GET /api/destination-categories
// @desc    Get all destination categories
// @access  Public
router.get('/', getAllCategories);

// @route   POST /api/destination-categories
// @desc    Create a destination category
// @access  Staff
router.post(
  '/',
  protect,
  authorize(...ACCESS_ROLES.STAFF_ONLY),
  createCategoryValidation,
  createCategory
);

// @route   PUT /api/destination-categories/:id
// @desc    Update a destination category
// @access  Staff
router.put(
  '/:id',
  protect,
  authorize(...ACCESS_ROLES.STAFF_ONLY),
  updateCategoryValidation,
  updateCategory
);

// @route   DELETE /api/destination-categories/:id
// @desc    Delete a destination category
// @access  Staff
router.delete(
  '/:id',
  protect,
  authorize(...ACCESS_ROLES.STAFF_ONLY),
  categoryIdValidation,
  deleteCategory
);

export default router;
