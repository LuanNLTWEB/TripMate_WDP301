import mongoose from 'mongoose';

// Danh mục loại khiếu nại dùng chung cho schema và validation.
// Value giữ cố định (snake_case) để frontend/backend không lệch nhau.
export const COMPLAINT_TYPE_VALUES = Object.freeze([
  'tour_service',
  'tour_guide',
  'accommodation',
  'transportation',
  'payment',
  'booking_information',
  'other'
]);

// UC-66 – Submit Booking Complaint.
// Mỗi khiếu nại luôn gắn với đúng một booking và đúng khách hàng đã đặt booking đó.
// Các trạng thái sau 'pending' được khai báo sẵn để các UC xử lý khiếu nại
const complaintSchema = new mongoose.Schema({
  booking: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    required: [true, 'Booking là bắt buộc'],
    index: true
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Khách hàng là bắt buộc'],
    index: true
  },
  complaintType: {
    type: String,
    enum: {
      values: COMPLAINT_TYPE_VALUES,
      message: 'Loại khiếu nại không hợp lệ'
    },
    required: [true, 'Vui lòng chọn loại khiếu nại']
  },
  description: {
    type: String,
    required: [true, 'Vui lòng nhập nội dung khiếu nại'],
    trim: true,
    minlength: [20, 'Nội dung khiếu nại phải có ít nhất 20 ký tự'],
    maxlength: [2000, 'Nội dung khiếu nại không được vượt quá 2000 ký tự']
  },
  evidenceImages: {
    type: [String],
    default: []
  },
  status: {
    type: String,
    enum: ['pending', 'in_review', 'resolved', 'rejected', 'cancelled'],
    default: 'pending',
    index: true
  }
}, {
  timestamps: true
});

// Chặn việc bấm gửi nhiều lần tạo ra hai khiếu nại đang chờ xử lý cho cùng
// một booking của cùng một khách hàng. Khi khiếu nại cũ đã resolved/rejected/
// cancelled, khách vẫn có thể gửi khiếu nại mới.
complaintSchema.index(
  { booking: 1, customer: 1 },
  {
    unique: true,
    partialFilterExpression: { status: { $in: ['pending', 'in_review'] } }
  }
);

complaintSchema.index({ customer: 1, createdAt: -1 });
complaintSchema.index({ status: 1, createdAt: -1 });

const Complaint = mongoose.model('Complaint', complaintSchema);

export default Complaint;
