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

// START UC-83 Search & Filter Platform Announcements
// GET /api/announcements - tìm kiếm và lọc thông báo chính thức (all, customer, tourProvider)
router.get('/', ...announcementViewAccess, announcementListValidation, getAnnouncements);
// GET /api/announcements/management - staff tìm kiếm và lọc danh sách thông báo quản lý (kèm bản nháp)
router.get('/management', protect, authorize(...ACCESS_ROLES.STAFF_ONLY), managedAnnouncementListValidation, getManagedAnnouncements);
// END UC-83 Search & Filter Platform Announcements

router.post('/', protect, authorize(...ACCESS_ROLES.STAFF_ONLY), createAnnouncementValidation, createAnnouncement);
router.get('/:id', ...announcementViewAccess, announcementIdValidation, getAnnouncementById);
router.put('/:id', protect, authorize(...ACCESS_ROLES.STAFF_ONLY), updateAnnouncementValidation, updateAnnouncement);
router.delete('/:id', protect, authorize(...ACCESS_ROLES.STAFF_ONLY), announcementIdValidation, deleteAnnouncement);

export default router;
