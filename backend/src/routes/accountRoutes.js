import { Router } from 'express';
import { protect, authorize } from '../middleware/auth.js';
import { accountValidation, updateAccountRoleValidation } from '../middleware/validate.js';
import { createAccount, deleteAccount, getAccount, getAccounts, setAccountStatus, updateAccount } from '../controllers/accountController.js';

const router = Router();

router.use(protect, authorize('admin'));
router.get('/', getAccounts);
router.post('/', accountValidation, createAccount);
router.get('/:id', getAccount);
router.put('/:id', updateAccountRoleValidation, updateAccount);
router.patch('/:id/status', setAccountStatus);
router.delete('/:id', deleteAccount);

export default router;
