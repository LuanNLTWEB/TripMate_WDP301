import mongoose from 'mongoose';

// Danh mục loại khiếu nại dùng chung cho schema và validation.
// Value giữ cố định (snake_case) để frontend/backend không lệch nhau.
export const COMPLAINT_CATEGORY_VALUES = Object.freeze([
  'quality_mismatch',
  'incorrect_cash_charge',
  'wrongful_no_show',
  'other'
]);

const complaintSchema = new mongoose.Schema({
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  bookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    required: true,
    index: true
  },
  tourId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tour',
    required: true,
    index: true
  },
  providerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  category: {
    type: String,
    enum: {
      values: COMPLAINT_CATEGORY_VALUES,
      message: 'Loại khiếu nại không hợp lệ'
    },
    required: true
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 2000
  },
  // UC-66 – ảnh minh chứng (URL Cloudinary) đính kèm khiếu nại, tối đa 5 ảnh.
  evidenceImages: {
    type: [String],
    validate: {
      validator: (images) => Array.isArray(images) && images.length <= 5,
      message: 'Chỉ được gửi tối đa 5 ảnh minh chứng'
    },
    default: []
  },
  status: {
    type: String,
    enum: ['open', 'in_review', 'resolved', 'rejected'],
    default: 'open',
    index: true
  },
  resolutionNote: {
    type: String,
    trim: true,
    maxlength: 2000,
    default: ''
  },
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  resolvedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

complaintSchema.index({ customerId: 1, createdAt: -1 });
complaintSchema.index({ status: 1, createdAt: -1 });

// Chặn bấm gửi nhiều lần tạo ra hai khiếu nại đang xử lý cho cùng một booking
// của cùng một khách hàng. Khi khiếu nại cũ đã resolved/rejected, khách vẫn có
// thể gửi khiếu nại mới.
complaintSchema.index(
  { bookingId: 1, customerId: 1 },
  {
    unique: true,
    partialFilterExpression: { status: { $in: ['open', 'in_review'] } }
  }
);

const Complaint = mongoose.model('Complaint', complaintSchema);

export default Complaint;
