import mongoose from 'mongoose';

// START UC-128 Create Tour Submission
const tourSubmissionSchema = new mongoose.Schema({
  tourId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tour',
    required: [true, 'Bài gửi phải gắn với một tour cụ thể'],
    index: true
  },
  providerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Bài gửi phải thuộc về một nhà cung cấp'],
    index: true
  },
  // Ghi chú provider gửi kèm cho staff (không bắt buộc).
  providerNote: {
    type: String,
    trim: true,
    default: '',
    maxlength: [500, 'Ghi chú không được vượt quá 500 ký tự']
  },
  status: {
    type: String,
    enum: ['pending', 'needs_revision', 'approved', 'rejected'],
    default: 'pending',
    index: true
  },
  // Lý do từ chối / yêu cầu chỉnh sửa do staff nhập.
  reviewNote: {
    type: String,
    trim: true,
    default: '',
    maxlength: [1000, 'Nội dung phản hồi không được vượt quá 1000 ký tự']
  },
  reviewedAt: {
    type: Date,
    default: null
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  isDeleted: {
    type: Boolean,
    default: false,
    index: true
  },
  deletedAt: {
    type: Date,
    default: null
  },
  deletedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
}, {
  timestamps: true
});

tourSubmissionSchema.index({ tourId: 1, status: 1 });
tourSubmissionSchema.index({ providerId: 1, status: 1 });

// Model Mongoose dùng cho module bài gửi duyệt tour.
const TourSubmission = mongoose.model('TourSubmission', tourSubmissionSchema);

export default TourSubmission;
// END UC-128 Create Tour Submission
