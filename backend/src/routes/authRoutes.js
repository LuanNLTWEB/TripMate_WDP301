import { Router } from 'express';
import { register, login, getMe, updateProfile, changePassword } from '../controllers/authController.js';
import { registerValidation, loginValidation, updateProfileValidation, changePasswordValidation } from '../middleware/validate.js';
import { protect } from '../middleware/auth.js';

const router = Router();

// Public routes
router.post('/register', registerValidation, register);
router.post('/login', loginValidation, login);

// Protected routes
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfileValidation, updateProfile);
router.put('/change-password', protect, changePasswordValidation, changePassword);

export default router;