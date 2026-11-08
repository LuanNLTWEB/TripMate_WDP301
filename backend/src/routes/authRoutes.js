import { Router } from 'express';
import {
  register,
  login,
  getMe,
  updateProfile,
  changePassword,
  forgotPassword,
  verifyOtp,
  resendOtp,
  resetPassword
} from '../controllers/authController.js';
import {
  registerValidation,
  loginValidation,
  updateProfileValidation,
  changePasswordValidation,
  forgotPasswordValidation,
  verifyOtpValidation,
  resendOtpValidation,
  resetPasswordValidation
} from '../middleware/validate.js';
import { protect, authorize } from '../middleware/auth.js';
import { ACCESS_ROLES } from '../config/accessControl.js';

const router = Router();

// Public routes
router.post('/register', registerValidation, register);
router.post('/login', loginValidation, login);
router.post('/forgot-password', forgotPasswordValidation, forgotPassword);
router.post('/verify-otp', verifyOtpValidation, verifyOtp);
router.post('/resend-otp', resendOtpValidation, resendOtp);
router.post('/reset-password', resetPasswordValidation, resetPassword);

// Protected routes
router.get('/me', protect, getMe);
router.put('/profile', protect, authorize(...ACCESS_ROLES.CUSTOMER_ONLY), updateProfileValidation, updateProfile);
router.put('/change-password', protect, authorize(...ACCESS_ROLES.CUSTOMER_ONLY), changePasswordValidation, changePassword);

export default router;
