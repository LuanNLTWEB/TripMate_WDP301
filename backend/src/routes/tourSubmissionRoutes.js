import express from 'express';
import {
  createTourSubmission,
  getTourSubmissionById,
  getTourSubmissions,
  updateTourSubmission,
  deleteTourSubmission
} from '../controllers/tourSubmissionController.js';
import { protect, authorize } from '../middleware/auth.js';
import { ACCESS_ROLES } from '../config/accessControl.js';
import {
  createTourSubmissionValidation,
  updateTourSubmissionValidation,
  tourSubmissionListValidation,
  tourSubmissionIdValidation
} from '../middleware/validate.js';

const router = express.Router();

// START UC-128 Create Tour Submission
// POST /api/tour-submissions - provider gửi một bài duyệt tour mới.
router.post('/', protect, authorize(...ACCESS_ROLES.PROVIDER_ONLY), createTourSubmissionValidation, createTourSubmission);
// END UC-128 Create Tour Submission

// START UC-130 View Tour Submission List
// GET /api/tour-submissions - staff xem tất cả, provider chỉ thấy bài của mình.
router.get('/', protect, authorize(...ACCESS_ROLES.SUBMISSION_VIEW), tourSubmissionListValidation, getTourSubmissions);
// END UC-130 View Tour Submission List

router.get('/:id', protect, authorize(...ACCESS_ROLES.SUBMISSION_VIEW), tourSubmissionIdValidation, getTourSubmissionById);

// START UC-129 Update Tour Submission
// PUT /api/tour-submissions/:id - provider sửa nội dung, staff đổi trạng thái duyệt.
router.put('/:id', protect, authorize(...ACCESS_ROLES.SUBMISSION_VIEW), updateTourSubmissionValidation, updateTourSubmission);
// END UC-129 Update Tour Submission

// START UC-131 Delete Tour Submission
// DELETE /api/tour-submissions/:id - provider xóa mềm bài gửi chưa được duyệt.
router.delete('/:id', protect, authorize(...ACCESS_ROLES.PROVIDER_ONLY), tourSubmissionIdValidation, deleteTourSubmission);
// END UC-131 Delete Tour Submission

export default router;
