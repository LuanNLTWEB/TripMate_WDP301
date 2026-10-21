import User from '../models/User.js';
import { validationResult } from 'express-validator';
import generateToken from '../utils/generateToken.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Otp from '../models/Otp.js';
import sendEmail from '../utils/sendEmail.js';

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
export const register = async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array()[0]?.msg || 'Dữ liệu không hợp lệ',
        errors: errors.array()
      });
    }

    const { username, email, password, phone, dateOfBirth, gender } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: existingUser.email === email 
          ? 'Email đã được đăng ký' 
          : 'Tên người dùng đã được sử dụng'
      });
    }

    // Create user
    const user = await User.create({
      username,
      email,
      password,
      phone,
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
      gender
    });

    // Generate token
    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      message: 'Đăng ký tài khoản thành công',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        phone: user.phone,
        dateOfBirth: user.dateOfBirth,
        gender: user.gender,
        role: user.role,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi máy chủ trong quá trình đăng ký'
    });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
export const login = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array()[0]?.msg || 'Dữ liệu không hợp lệ',
        errors: errors.array()
      });
    }

    const { email, password } = req.body;

    // Find user with password
    const user = await User.findOne({ email }).select('+password');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Email hoặc mật khẩu không chính xác'
      });
    }

    if (user.isDeleted) {
      return res.status(403).json({
        success: false,
        message: 'Tài khoản của bạn đã bị xóa khỏi hệ thống'
      });
    }

    if (user.isActive === false) {
      return res.status(403).json({
        success: false,
        message: 'Tài khoản của bạn đã bị vô hiệu hóa'
      });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Email hoặc mật khẩu không chính xác'
      });
    }

    // Generate token
    const token = generateToken(user._id);

    res.json({
      success: true,
      message: 'Đăng nhập thành công',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        phone: user.phone,
        dateOfBirth: user.dateOfBirth,
        gender: user.gender,
        role: user.role,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi máy chủ trong quá trình đăng nhập'
    });
  }
};

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    res.json({
      success: true,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        phone: user.phone,
        dateOfBirth: user.dateOfBirth,
        gender: user.gender,
        role: user.role,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi máy chủ'
    });
  }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
export const updateProfile = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array()[0]?.msg || 'Dữ liệu không hợp lệ',
        errors: errors.array()
      });
    }

    const { username, phone, dateOfBirth, gender } = req.body;
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy người dùng'
      });
    }

    // Check if new username is already taken by someone else
    if (username && username !== user.username) {
      const existingUser = await User.findOne({ username });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Tên người dùng đã được sử dụng'
        });
      }
      user.username = username;
    }

    if (phone !== undefined) {
      user.phone = phone || undefined;
    }

    if (dateOfBirth !== undefined) {
      user.dateOfBirth = dateOfBirth ? new Date(dateOfBirth) : undefined;
    }

    if (gender !== undefined) {
      user.gender = gender;
    }

    await user.save();

    res.json({
      success: true,
      message: 'Cập nhật thông tin thành công',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        phone: user.phone,
        dateOfBirth: user.dateOfBirth,
        gender: user.gender,
        role: user.role,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi máy chủ trong quá trình cập nhật thông tin'
    });
  }
};

// @desc    Change user password
// @route   PUT /api/auth/change-password
// @access  Private
export const changePassword = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array()[0]?.msg || 'Dữ liệu không hợp lệ',
        errors: errors.array()
      });
    }

    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user.id).select('+password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy người dùng'
      });
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Mật khẩu hiện tại không chính xác'
      });
    }

    if (currentPassword === newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Mật khẩu mới không được trùng với mật khẩu hiện tại'
      });
    }

    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Đổi mật khẩu thành công'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi máy chủ trong quá trình đổi mật khẩu'
    });
  }
};


// @desc    Request password recovery OTP
// @route   POST /api/auth/forgot-password
// @access  Public
export const forgotPassword = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array()[0]?.msg || 'Dữ liệu không hợp lệ',
        errors: errors.array()
      });
    }

    const { email } = req.body;
    const normalizedEmail = email.trim().toLowerCase();

    const user = await User.findOne({ email: normalizedEmail, isDeleted: { $ne: true } });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy tài khoản liên kết với email này'
      });
    }

    if (user.isActive === false) {
      return res.status(403).json({
        success: false,
        message: 'Tài khoản của bạn đã bị vô hiệu hóa. Vui lòng liên hệ quản trị viên'
      });
    }

    // BR-10: Check cooldown 60s between OTP requests
    const existingOtp = await Otp.findOne({ email: normalizedEmail, purpose: 'reset_password' });
    if (existingOtp && existingOtp.lastSentAt) {
      const elapsedMs = Date.now() - new Date(existingOtp.lastSentAt).getTime();
      const cooldownMs = 60 * 1000;
      if (elapsedMs < cooldownMs) {
        const remainingSeconds = Math.ceil((cooldownMs - elapsedMs) / 1000);
        return res.status(429).json({
          success: false,
          message: `Vui lòng đợi ${remainingSeconds} giây trước khi yêu cầu gửi lại mã OTP`,
          remainingSeconds
        });
      }
    }

    // Generate 6-digit cryptographically secure OTP
    const rawOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const salt = await bcrypt.genSalt(10);
    const hashedOtp = await bcrypt.hash(rawOtp, salt);

    // BR-09: 10 minutes expiry, 0 initial failed attempts
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    if (existingOtp) {
      existingOtp.otp = hashedOtp;
      existingOtp.failedAttempts = 0;
      existingOtp.lastSentAt = new Date();
      existingOtp.expiresAt = expiresAt;
      await existingOtp.save();
    } else {
      await Otp.create({
        email: normalizedEmail,
        otp: hashedOtp,
        purpose: 'reset_password',
        failedAttempts: 0,
        lastSentAt: new Date(),
        expiresAt
      });
    }

    // Send email with OTP
    const emailSubject = 'TripMate - Mã xác thực đặt lại mật khẩu';
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #0d6efd; margin-bottom: 16px;">TripMate - Khôi phục mật khẩu</h2>
        <p>Xin chào <strong>${user.username}</strong>,</p>
        <p>Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản TripMate của bạn.</p>
        <p>Mã OTP xác thực của bạn là:</p>
        <div style="background-color: #f1f5f9; padding: 16px; border-radius: 6px; text-align: center; margin: 24px 0;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #0f172a;">${rawOtp}</span>
        </div>
        <p style="color: #64748b; font-size: 14px;">
          • Mã OTP này có hiệu lực trong <strong>10 phút</strong> (tối đa 3 lần nhập sai).<br/>
          • Nếu bạn không yêu cầu đặt lại mật khẩu, xin vui lòng bỏ qua email này hoặc liên hệ hỗ trợ.
        </p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
        <p style="color: #94a3b8; font-size: 12px; text-align: center;">TripMate Travel Platform © 2026</p>
      </div>
    `;

    await sendEmail({
      to: normalizedEmail,
      subject: emailSubject,
      text: `Mã xác thực OTP đặt lại mật khẩu của bạn là: ${rawOtp}. Mã có hiệu lực trong 10 phút.`,
      html: emailHtml
    });

    res.json({
      success: true,
      message: 'Mã xác thực OTP đã được gửi đến email của bạn',
      email: normalizedEmail,
      cooldown: 60
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi máy chủ trong quá trình gửi yêu cầu khôi phục mật khẩu'
    });
  }
};

// @desc    Verify OTP for password reset
// @route   POST /api/auth/verify-otp
// @access  Public
export const verifyOtp = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array()[0]?.msg || 'Dữ liệu không hợp lệ',
        errors: errors.array()
      });
    }

    const { email, otp } = req.body;
    const normalizedEmail = email.trim().toLowerCase();

    const otpRecord = await Otp.findOne({ email: normalizedEmail, purpose: 'reset_password' });

    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        message: 'Không tìm thấy yêu cầu xác thực OTP hoặc mã đã hết hạn. Vui lòng yêu cầu mã mới'
      });
    }

    // Check if expired
    if (new Date() > new Date(otpRecord.expiresAt)) {
      await Otp.findByIdAndDelete(otpRecord._id);
      return res.status(400).json({
        success: false,
        message: 'Mã OTP đã hết hạn (quá 10 phút). Vui lòng yêu cầu mã mới'
      });
    }

    // Compare OTP
    const isMatch = await otpRecord.compareOtp(otp);

    if (!isMatch) {
      otpRecord.failedAttempts += 1;

      // BR-09: Max 3 failed attempts
      if (otpRecord.failedAttempts >= 3) {
        await Otp.findByIdAndDelete(otpRecord._id);
        return res.status(400).json({
          success: false,
          maxAttemptsReached: true,
          message: 'Bạn đã nhập sai mã OTP quá 3 lần. Mã OTP đã bị hủy để bảo mật, vui lòng yêu cầu mã mới'
        });
      }

      await otpRecord.save();
      const remainingAttempts = 3 - otpRecord.failedAttempts;
      return res.status(400).json({
        success: false,
        remainingAttempts,
        message: `Mã OTP không chính xác. Bạn còn ${remainingAttempts} lần thử`
      });
    }

    // OTP is valid! Delete it so it cannot be reused
    await Otp.findByIdAndDelete(otpRecord._id);

    // Issue short-lived resetToken (15 minutes)
    const resetToken = jwt.sign(
      { email: normalizedEmail, purpose: 'reset_password' },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );

    res.json({
      success: true,
      message: 'Xác thực mã OTP thành công',
      resetToken
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi máy chủ trong quá trình xác thực OTP'
    });
  }
};

// @desc    Resend OTP
// @route   POST /api/auth/resend-otp
// @access  Public
export const resendOtp = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array()[0]?.msg || 'Dữ liệu không hợp lệ',
        errors: errors.array()
      });
    }

    const { email } = req.body;
    const normalizedEmail = email.trim().toLowerCase();

    const user = await User.findOne({ email: normalizedEmail, isDeleted: { $ne: true } });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy tài khoản liên kết với email này'
      });
    }

    // BR-10: Cooldown 60s check
    const existingOtp = await Otp.findOne({ email: normalizedEmail, purpose: 'reset_password' });
    if (existingOtp && existingOtp.lastSentAt) {
      const elapsedMs = Date.now() - new Date(existingOtp.lastSentAt).getTime();
      const cooldownMs = 60 * 1000;
      if (elapsedMs < cooldownMs) {
        const remainingSeconds = Math.ceil((cooldownMs - elapsedMs) / 1000);
        return res.status(429).json({
          success: false,
          message: `Vui lòng đợi ${remainingSeconds} giây trước khi gửi lại mã`,
          remainingSeconds
        });
      }
    }

    // Generate new OTP
    const rawOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const salt = await bcrypt.genSalt(10);
    const hashedOtp = await bcrypt.hash(rawOtp, salt);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    if (existingOtp) {
      existingOtp.otp = hashedOtp;
      existingOtp.failedAttempts = 0;
      existingOtp.lastSentAt = new Date();
      existingOtp.expiresAt = expiresAt;
      await existingOtp.save();
    } else {
      await Otp.create({
        email: normalizedEmail,
        otp: hashedOtp,
        purpose: 'reset_password',
        failedAttempts: 0,
        lastSentAt: new Date(),
        expiresAt
      });
    }

    await sendEmail({
      to: normalizedEmail,
      subject: 'TripMate - Gửi lại mã xác thực đặt lại mật khẩu',
      text: `Mã xác thực OTP mới của bạn là: ${rawOtp}. Mã có hiệu lực trong 10 phút.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h2 style="color: #0d6efd; margin-bottom: 16px;">TripMate - Mã OTP mới</h2>
          <p>Xin chào <strong>${user.username}</strong>,</p>
          <p>Bạn đã yêu cầu gửi lại mã xác thực OTP để đặt lại mật khẩu.</p>
          <div style="background-color: #f1f5f9; padding: 16px; border-radius: 6px; text-align: center; margin: 24px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #0f172a;">${rawOtp}</span>
          </div>
          <p style="color: #64748b; font-size: 14px;">Mã có hiệu lực trong 10 phút (tối đa 3 lần thử).</p>
        </div>
      `
    });

    res.json({
      success: true,
      message: 'Mã OTP mới đã được gửi đến email của bạn',
      cooldown: 60
    });
  } catch (error) {
    console.error('Resend OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi máy chủ trong quá trình gửi lại mã OTP'
    });
  }
};

// @desc    Reset password using resetToken
// @route   POST /api/auth/reset-password
// @access  Public
export const resetPassword = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array()[0]?.msg || 'Dữ liệu không hợp lệ',
        errors: errors.array()
      });
    }

    const { resetToken, newPassword } = req.body;

    let decoded;
    try {
      decoded = jwt.verify(resetToken, process.env.JWT_SECRET);
    } catch (jwtError) {
      return res.status(400).json({
        success: false,
        message: 'Phiên đặt lại mật khẩu đã hết hạn hoặc không hợp lệ. Vui lòng thực hiện lại từ đầu'
      });
    }

    if (decoded.purpose !== 'reset_password' || !decoded.email) {
      return res.status(400).json({
        success: false,
        message: 'Mã xác thực không hợp lệ'
      });
    }

    const user = await User.findOne({ email: decoded.email, isDeleted: { $ne: true } }).select('+password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy tài khoản người dùng'
      });
    }

    if (user.isActive === false) {
      return res.status(403).json({
        success: false,
        message: 'Tài khoản của bạn đã bị vô hiệu hóa'
      });
    }

    // Set new password (pre('save') will hash it)
    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Đặt lại mật khẩu thành công. Vui lòng đăng nhập bằng mật khẩu mới'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi máy chủ trong quá trình đặt lại mật khẩu'
    });
  }
};
