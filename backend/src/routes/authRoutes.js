import { Router } from 'express';
import { register, login, getMe, updateProfile } from '../controllers/authController.js';
import { registerValidation, loginValidation, updateProfileValidation } from '../middleware/validate.js';
import { protect } from '../middleware/auth.js';

const router = Router();

// Public routes
router.post('/register', registerValidation, register);
router.post('/login', loginValidation, login);

// Protected routes
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfileValidation, updateProfile);

export default router;