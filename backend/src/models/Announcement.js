import mongoose from 'mongoose';

const announcementSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Tiêu đề thông báo là bắt buộc'],
    trim: true,
    maxlength: [150, 'Tiêu đề thông báo không được vượt quá 150 ký tự']
  },
  content: {
    type: String,
    required: [true, 'Nội dung thông báo là bắt buộc'],
    trim: true,
    maxlength: [5000, 'Nội dung thông báo không được vượt quá 5000 ký tự']
  },
  audience: {
    type: String,
    enum: ['all', 'customer', 'tourProvider'],
    default: 'all',
    index: true
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
}, { timestamps: true });

announcementSchema.index({ isActive: 1, audience: 1, createdAt: -1 });
announcementSchema.index({ title: 'text', content: 'text' });

const Announcement = mongoose.model('Announcement', announcementSchema);

export default Announcement;
