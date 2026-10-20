import express from 'express';
import {
  createAnnouncement,
  deleteAnnouncement,
  getAnnouncementById,
  getAnnouncements,
  getManagedAnnouncements,
  updateAnnouncement
} from '../controllers/announcementController.js';
import { protect, authorize } from '../middleware/auth.js';
import { ACCESS_ROLES } from '../config/accessControl.js';
import {
  announcementIdValidation,
  announcementListValidation,
  createAnnouncementValidation,
  managedAnnouncementListValidation,
  updateAnnouncementValidation
} from '../middleware/validate.js';

const router = express.Router();
const announcementViewAccess = [protect, authorize(...ACCESS_ROLES.ANNOUNCEMENT_VIEW)];

router.get('/', ...announcementViewAccess, announcementListValidation, getAnnouncements);
router.get('/management', protect, authorize(...ACCESS_ROLES.STAFF_ONLY), managedAnnouncementListValidation, getManagedAnnouncements);
router.post('/', protect, authorize(...ACCESS_ROLES.STAFF_ONLY), createAnnouncementValidation, createAnnouncement);
router.get('/:id', ...announcementViewAccess, announcementIdValidation, getAnnouncementById);
router.put('/:id', protect, authorize(...ACCESS_ROLES.STAFF_ONLY), updateAnnouncementValidation, updateAnnouncement);
router.delete('/:id', protect, authorize(...ACCESS_ROLES.STAFF_ONLY), announcementIdValidation, deleteAnnouncement);

export default router;
