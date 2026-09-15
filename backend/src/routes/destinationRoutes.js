import express from 'express';
import { getAllDestinations, getDestinationById } from '../controllers/destinationController.js';

const router = express.Router();

// @route   GET /api/destinations
// @desc    Get all destinations
// @access  Public
router.get('/', getAllDestinations);

// @route   GET /api/destinations/:id
// @desc    Get single destination
// @access  Public
router.get('/:id', getDestinationById);

export default router;
