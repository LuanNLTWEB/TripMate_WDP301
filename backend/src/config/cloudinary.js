import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import multer from 'multer';
import dotenv from 'dotenv';

dotenv.config();

// Cấu hình Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Cấu hình Storage cho Multer
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'tripmate_uploads', // Tên thư mục lưu ảnh trên Cloudinary
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'], // Các định dạng cho phép
  },
});

const upload = multer({ storage: storage });

export { upload, cloudinary };
