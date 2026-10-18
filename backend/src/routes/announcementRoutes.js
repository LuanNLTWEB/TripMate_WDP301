import express from 'express';
import { optionalAuth, protect, authorize } from '../middleware/auth.js';
import {
  createAnnouncement,
  deleteAnnouncement,
  getAnnouncements,
  getManagedAnnouncements,
  updateAnnouncement
} from '../controllers/announcementController.js';
import {
  announcementIdValidation,
  createAnnouncementValidation,
  updateAnnouncementValidation
} from '../middleware/validate.js';

const router = express.Router();

router.get('/', optionalAuth, getAnnouncements);
router.get('/management', protect, authorize('staff', 'admin'), getManagedAnnouncements);
router.post('/', protect, authorize('staff', 'admin'), createAnnouncementValidation, createAnnouncement);
router.put('/:id', protect, authorize('staff', 'admin'), updateAnnouncementValidation, updateAnnouncement);
router.delete('/:id', protect, authorize('staff', 'admin'), announcementIdValidation, deleteAnnouncement);

export default router;
