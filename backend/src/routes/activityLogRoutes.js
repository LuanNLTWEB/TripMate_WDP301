import { Router } from 'express';
import { protect, authorize } from '../middleware/auth.js';
import { ACCESS_ROLES } from '../config/accessControl.js';
import { getActivityLogs } from '../controllers/activityLogController.js';

const router = Router();

router.use(protect, authorize(...ACCESS_ROLES.ADMIN_ONLY));
router.get('/', getActivityLogs);

export default router;
