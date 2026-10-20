import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import { ACCESS_ROLES } from '../config/accessControl.js';
import { upload } from '../config/cloudinary.js';

const router = express.Router();

router.post('/', protect, authorize(...ACCESS_ROLES.CONTENT_UPLOAD), upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'Vui lòng chọn một file ảnh.' });
  }

  res.status(200).json({
    success: true,
    message: 'Tải ảnh lên thành công',
    url: req.file.path,
  });
});

export default router;
