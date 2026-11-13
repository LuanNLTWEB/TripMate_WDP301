import { Router } from 'express';
import { protect, authorize } from '../middleware/auth.js';
import { ACCESS_ROLES } from '../config/accessControl.js';
import { accountValidation, updateAccountValidation } from '../middleware/validate.js';
import { createAccount, deleteAccount, getAccount, getAccounts, setAccountStatus, updateAccount } from '../controllers/accountController.js';

const router = Router();

router.use(protect, authorize(...ACCESS_ROLES.ADMIN_ONLY));
router.get('/', getAccounts);
router.post('/', accountValidation, createAccount);
router.get('/:id', getAccount);
router.put('/:id', updateAccountValidation, updateAccount);
router.patch('/:id/status', setAccountStatus);
router.delete('/:id', deleteAccount);

export default router;
