import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const otpSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    index: true
  },
  otp: {
    type: String,
    required: true
  },
  purpose: {
    type: String,
    enum: ['reset_password', 'verify_email'],
    default: 'reset_password'
  },
  failedAttempts: {
    type: Number,
    default: 0
  },
  lastSentAt: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expires: 0 }
  }
}, {
  timestamps: true
});

// Compare plain OTP with hashed OTP
otpSchema.methods.compareOtp = async function(candidateOtp) {
  return await bcrypt.compare(String(candidateOtp), this.otp);
};

const Otp = mongoose.model('Otp', otpSchema);

export default Otp;
