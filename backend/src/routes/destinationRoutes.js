import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import {
	createDestination,
	getAllDestinations,
	getDestinationById,
	updateDestination,
	updateDestinationStatus,
	getFavoriteDestinations,
	toggleFavorite
} from '../controllers/destinationController.js';
import {
	createDestinationValidation,
	updateDestinationValidation,
	updateDestinationStatusValidation
} from '../middleware/validate.js';

const router = express.Router();

// @route   GET /api/destinations/favorites
// @desc    Get favorite destinations of current user
// @access  Private (Customer)
router.get('/favorites', protect, authorize('customer'), getFavoriteDestinations);

// @route   POST /api/destinations/:id/favorite
// @desc    Toggle save/unsave a destination
// @access  Private (Customer)
router.post('/:id/favorite', protect, authorize('customer'), toggleFavorite);

// @route   GET /api/destinations
// @desc    Get all destinations
// @access  Public
router.get('/', getAllDestinations);

router.post(
	'/',
	protect,
	authorize('staff', 'admin'),
	createDestinationValidation,
	createDestination
);

router.patch(
	'/:id/status',
	protect,
	authorize('staff', 'admin'),
	updateDestinationStatusValidation,
	updateDestinationStatus
);

router.put(
	'/:id',
	protect,
	authorize('staff', 'admin'),
	updateDestinationValidation,
	updateDestination
);

// @route   GET /api/destinations/:id
// @desc    Get single destination
// @access  Public
router.get('/:id', getDestinationById);

export default router;
