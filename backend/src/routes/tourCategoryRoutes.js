import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
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
// @access  Staff, Admin
router.post(
  '/',
  protect,
  authorize('staff', 'admin'),
  createCategoryValidation,
  createCategory
);

// @route   PUT /api/tour-categories/:id
// @desc    Update a tour category
// @access  Staff, Admin
router.put(
  '/:id',
  protect,
  authorize('staff', 'admin'),
  updateCategoryValidation,
  updateCategory
);

// @route   DELETE /api/tour-categories/:id
// @desc    Delete a tour category
// @access  Staff, Admin
router.delete(
  '/:id',
  protect,
  authorize('staff', 'admin'),
  categoryIdValidation,
  deleteCategory
);

export default router;
