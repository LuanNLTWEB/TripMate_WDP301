import { Router } from 'express';
import { register, login, getMe, updateProfile, changePassword } from '../controllers/authController.js';
import { registerValidation, loginValidation, updateProfileValidation, changePasswordValidation } from '../middleware/validate.js';
import { protect, authorize } from '../middleware/auth.js';
import { ACCESS_ROLES } from '../config/accessControl.js';

const router = Router();

// Public routes
router.post('/register', registerValidation, register);
router.post('/login', loginValidation, login);

// Protected routes
router.get('/me', protect, getMe);
router.put('/profile', protect, authorize(...ACCESS_ROLES.CUSTOMER_ONLY), updateProfileValidation, updateProfile);
router.put('/change-password', protect, authorize(...ACCESS_ROLES.CUSTOMER_ONLY), changePasswordValidation, changePassword);

export default router;
