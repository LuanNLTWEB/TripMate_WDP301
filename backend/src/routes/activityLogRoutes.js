import { Router } from 'express';
import { protect, authorize } from '../middleware/auth.js';
import { getActivityLogs } from '../controllers/activityLogController.js';

const router = Router();

router.use(protect, authorize('admin'));
router.get('/', getActivityLogs);

export default router;
