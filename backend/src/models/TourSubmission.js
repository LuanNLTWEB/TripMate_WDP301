import mongoose from 'mongoose';

// START UC-128 Create Tour Submission
/**
 * TourSubmission – yêu cầu xin duyệt để xuất bản một tour đang ở trạng thái nháp.
 *
 * Luồng nghiệp vụ (module Tour Submission & Approval):
 *  - Provider tạo tour (Tour.status = 'draft') và chỉnh sửa nội dung thoải mái,
 *    khách hàng chưa nhìn thấy tour nháp.
 *  - Khi muốn mở bán, provider tạo một TourSubmission trỏ tới tour đó; tour chuyển
 *    sang 'pending' và staff thấy trong hàng đợi kiểm duyệt.
 *  - Staff duyệt → tour chuyển 'active' (khách hàng mới thấy). Từ chối/yêu cầu chỉnh
 *    sửa → tour về 'rejected'/'needs_revision' để provider sửa rồi gửi lại.
 *  - Bài gửi bị xóa → tour quay về 'draft'.
 *
 * Phần phức tạp:
 *  - Nội dung tour KHÔNG snapshot trong submission; submission chỉ là yêu cầu duyệt
 *    trỏ tới `tourId`, nên dữ liệu duy nhất nằm ở collection Tour (tránh lệch dữ liệu).
 *  - `isDeleted` là xóa mềm để giữ dấu vết; mọi query lọc `isDeleted: { $ne: true }`.
 *  - Index (tourId, status) phục vụ việc chặn gửi trùng một tour đang chờ duyệt.
 */
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

const TourSubmission = mongoose.model('TourSubmission', tourSubmissionSchema);

export default TourSubmission;
// END UC-128 Create Tour Submission
