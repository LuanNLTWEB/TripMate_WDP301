import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import { ACCESS_ROLES } from '../config/accessControl.js';
import { upload, cloudinary } from '../config/cloudinary.js';
import {
  createComplaintValidation,
  complaintListValidation,
  complaintIdValidation,
  resolveComplaintValidation,
  updateComplaintValidation
} from '../middleware/validate.js';
import {
  createComplaint,
  getMyComplaints,
  getComplaints,
  getComplaintById,
  resolveComplaint,
  updateComplaint
} from '../controllers/complaintController.js';

const router = express.Router();

// UC-66 – ảnh minh chứng khiếu nại.
// Dùng lại đúng `upload` (CloudinaryStorage) đang dùng cho các UC khác;
// Cloudinary đã giới hạn định dạng JPG/JPEG/PNG/WEBP, còn dung lượng 10MB
// được kiểm tra thêm sau khi upload.
const MAX_EVIDENCE_SIZE = 10 * 1024 * 1024; // 10 MB mỗi ảnh
const ALLOWED_EVIDENCE_FORMATS = ['jpg', 'jpeg', 'png', 'webp'];

// Bọc multer để trả lỗi upload bằng JSON tiếng Việt theo đúng convention API,
// thay vì để lỗi rơi vào global handler và trả 500 chung chung.
const uploadEvidence = (req, res, next) => {
  upload.single('image')(req, res, (error) => {
    if (error) {
      console.error('Error uploading complaint evidence:', error);
      return res.status(400).json({
        success: false,
        message: 'Không thể tải ảnh minh chứng lên. Chỉ chấp nhận ảnh JPG, JPEG, PNG hoặc WEBP tối đa 10MB.'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng chọn một file ảnh minh chứng.'
      });
    }

    // `upload` không cấu hình limits nên ta kiểm tra sau khi lên Cloudinary.
    // Nếu không hợp lệ thì xóa ảnh vừa tạo để tránh file mồ côi.
    const format = String(req.file.format || '').toLowerCase();
    const isOversize = Number(req.file.size) > MAX_EVIDENCE_SIZE;
    const isInvalidFormat = format && !ALLOWED_EVIDENCE_FORMATS.includes(format);

    if (isOversize || isInvalidFormat) {
      if (req.file.filename) {
        cloudinary.uploader.destroy(req.file.filename).catch(() => null);
      }

      return res.status(400).json({
        success: false,
        message: isOversize
          ? 'Mỗi ảnh minh chứng không được vượt quá 10MB.'
          : 'Chỉ chấp nhận ảnh định dạng JPG, JPEG, PNG hoặc WEBP.'
      });
    }

    return next();
  });
};

// Upload một ảnh minh chứng, trả về URL Cloudinary để frontend gửi kèm khi tạo khiếu nại.
router.post(
  '/evidence',
  protect,
  authorize(...ACCESS_ROLES.CUSTOMER_ONLY),
  uploadEvidence,
  (req, res) => {
    res.status(200).json({
      success: true,
      message: 'Tải ảnh minh chứng lên thành công',
      url: req.file.path
    });
  }
);

// START UC-66 Submit Booking Complaint
// Tạo khiếu nại bằng JSON (ảnh đã được upload trước qua /evidence).
router.post('/', protect, authorize(...ACCESS_ROLES.CUSTOMER_ONLY), createComplaintValidation, createComplaint);
// END UC-66 Submit Booking Complaint

// UC-66 – customer xem khiếu nại của mình; UC-81/153/154 – staff tra cứu/xử lý.
router.get('/my', protect, authorize(...ACCESS_ROLES.CUSTOMER_ONLY), getMyComplaints);
router.get('/management', protect, authorize(...ACCESS_ROLES.STAFF_ONLY), complaintListValidation, getComplaints);
router.get('/management/:id', protect, authorize(...ACCESS_ROLES.STAFF_ONLY), complaintIdValidation, getComplaintById);
router.patch('/:id/resolve', protect, authorize(...ACCESS_ROLES.STAFF_ONLY), resolveComplaintValidation, resolveComplaint);


// START STT 68 Update Booking Complaint (Customer)
// PATCH /api/complaints/:id - chỉnh sửa khiếu nại của mình khi đang ở trạng thái 'open'
router.patch('/:id', protect, authorize(...ACCESS_ROLES.CUSTOMER_ONLY), updateComplaintValidation, updateComplaint);
// END STT 68 Update Booking Complaint (Customer)

export default router;
