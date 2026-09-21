import { Router } from 'express';
import { protect, authorize } from '../middleware/auth.js';
import { createRole, deleteRole, getRoles, updateRole } from '../controllers/roleController.js';

const router = Router();

router.use(protect, authorize('admin'));
router.get('/', getRoles);
router.post('/', createRole);
router.put('/:id', updateRole);
router.delete('/:id', deleteRole);

export default router;
