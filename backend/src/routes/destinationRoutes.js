import express from 'express';
import { protect, authorize, optionalAuth } from '../middleware/auth.js';
import { ACCESS_ROLES } from '../config/accessControl.js';
import {
	createDestination,
	deleteDestination,
  getAllDestinations,
  getDestinationById,
  getManagedDestinations,
  updateDestination,
  updateDestinationStatus,
	getFavoriteDestinations,
	toggleFavorite,
	removeFavoriteDestination
} from '../controllers/destinationController.js';
import {
	createDestinationValidation,
	destinationIdValidation,
	updateDestinationValidation,
	updateDestinationStatusValidation
} from '../middleware/validate.js';

const router = express.Router();

// @route   GET /api/destinations/favorites
// @desc    Get favorite destinations of current user
// @access  Private (Customer)
router.get('/favorites', protect, authorize(...ACCESS_ROLES.CUSTOMER_ONLY), getFavoriteDestinations);

// @route   POST /api/destinations/:id/favorite
// @desc    Toggle save/unsave a destination
// @access  Private (Customer)
router.post(
	'/:id/favorite',
	protect,
	authorize(...ACCESS_ROLES.CUSTOMER_ONLY),
	destinationIdValidation,
	toggleFavorite
);

router.delete(
	'/:id/favorite',
	protect,
	authorize(...ACCESS_ROLES.CUSTOMER_ONLY),
	destinationIdValidation,
	removeFavoriteDestination
);

// @route   GET /api/destinations/management
// @desc    List all destinations for staff moderation, including inactive ones
// @access  Private (Staff)
router.get('/management', protect, authorize(...ACCESS_ROLES.STAFF_ONLY), getManagedDestinations);

// @route   GET /api/destinations/management/:id
// @desc    Get single destination for staff moderation
// @access  Private (Staff)
router.get(
	'/management/:id',
	protect,
	authorize(...ACCESS_ROLES.STAFF_ONLY),
	destinationIdValidation,
	getDestinationById
);

// @route   GET /api/destinations
// @desc    Get all active destinations
// @access  Public
router.get('/', getAllDestinations);

router.post(
	'/',
	protect,
	authorize(...ACCESS_ROLES.STAFF_ONLY),
	createDestinationValidation,
	createDestination
);

router.patch(
	'/:id/status',
	protect,
	authorize(...ACCESS_ROLES.STAFF_ONLY),
	updateDestinationStatusValidation,
	updateDestinationStatus
);

router.put(
	'/:id',
	protect,
	authorize(...ACCESS_ROLES.STAFF_ONLY),
	updateDestinationValidation,
	updateDestination
);

router.delete(
	'/:id',
	protect,
	authorize(...ACCESS_ROLES.STAFF_ONLY),
	destinationIdValidation,
	deleteDestination
);

// @route   GET /api/destinations/:id
// @desc    Get single destination
// @access  Public
router.get('/:id', optionalAuth, destinationIdValidation, getDestinationById);

export default router;
