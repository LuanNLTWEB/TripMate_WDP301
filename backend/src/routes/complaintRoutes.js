import express from 'express';
import {
  createComplaint,
  getMyComplaints,
  getComplaints,
  getComplaintById,
  resolveComplaint
} from '../controllers/complaintController.js';
import { protect, authorize } from '../middleware/auth.js';
import { ACCESS_ROLES } from '../config/accessControl.js';
import {
  createComplaintValidation,
  complaintListValidation,
  resolveComplaintValidation,
  complaintIdValidation
} from '../middleware/validate.js';

const router = express.Router();

router.post('/', protect, authorize(...ACCESS_ROLES.CUSTOMER_ONLY), createComplaintValidation, createComplaint);
router.get('/my', protect, authorize(...ACCESS_ROLES.CUSTOMER_ONLY), getMyComplaints);
router.get('/management', protect, authorize(...ACCESS_ROLES.STAFF_ONLY), complaintListValidation, getComplaints);
router.get('/management/:id', protect, authorize(...ACCESS_ROLES.STAFF_ONLY), complaintIdValidation, getComplaintById);
router.patch('/:id/resolve', protect, authorize(...ACCESS_ROLES.STAFF_ONLY), resolveComplaintValidation, resolveComplaint);

export default router;
