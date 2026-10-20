import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  tourId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tour',
    required: [true, 'Tour ID is required']
  },
  rating: {
    type: Number,
    required: [true, 'Rating is required'],
    min: [1, 'Rating must be at least 1'],
    max: [5, 'Rating cannot exceed 5']
  },
  comment: {
    type: String,
    trim: true,
    maxlength: [1000, 'Comment cannot exceed 1000 characters'],
    default: ''
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'flagged'],
    default: 'approved'
  },
  moderatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  moderationReason: {
    type: String,
    trim: true,
    maxlength: [500, 'Moderation reason cannot exceed 500 characters'],
    default: ''
  },
  isReported: {
    type: Boolean,
    default: false
  },
  reportReason: {
    type: String,
    trim: true,
    default: ''
  },
  reportDetails: {
    type: String,
    trim: true,
    maxlength: [500, 'Report details cannot exceed 500 characters'],
    default: ''
  },
  reportedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  reportedAt: {
    type: Date,
    default: null
  },
  // Xóa mềm (UC-95 Restore Review): giữ lại bản ghi để nhân viên có thể
  // khôi phục lại và để việc xóa luôn có dấu vết kiểm toán.
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

// Giữ nguyên ràng buộc 1 đánh giá / 1 tour / 1 khách, kể cả khi đánh giá đã bị
// xóa mềm, để khách không thể xóa rồi viết lại để lách quy tắc này.
reviewSchema.index({ tourId: 1, userId: 1 }, { unique: true });

const Review = mongoose.model('Review', reviewSchema);

export default Review;
