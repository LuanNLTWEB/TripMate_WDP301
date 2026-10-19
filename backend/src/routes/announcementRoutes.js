import express from 'express';
import {
  createAnnouncement,
  getAnnouncementById,
  getAnnouncements,
  getManagedAnnouncements
} from '../controllers/announcementController.js';
import { protect, authorize } from '../middleware/auth.js';
import {
  announcementIdValidation,
  announcementListValidation,
  createAnnouncementValidation,
  managedAnnouncementListValidation
} from '../middleware/validate.js';

const router = express.Router();
const announcementViewAccess = [protect, authorize('staff', 'customer', 'tourProvider')];

router.get('/', ...announcementViewAccess, announcementListValidation, getAnnouncements);
router.get('/management', protect, authorize('staff'), managedAnnouncementListValidation, getManagedAnnouncements);
router.post('/', protect, authorize('staff'), createAnnouncementValidation, createAnnouncement);
router.get('/:id', ...announcementViewAccess, announcementIdValidation, getAnnouncementById);

export default router;
