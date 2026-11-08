import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  title: {
    type: String,
    required: [true, 'Notification title is required'],
    trim: true,
    maxlength: [150, 'Notification title cannot exceed 150 characters']
  },
  message: {
    type: String,
    required: [true, 'Notification message is required'],
    trim: true,
    maxlength: [500, 'Notification message cannot exceed 500 characters']
  },
  notificationType: {
    type: String,
    required: true,
    default: 'system',
    maxlength: [30, 'Notification type cannot exceed 30 characters']
  },
  isRead: {
    type: Boolean,
    default: false,
    index: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  itinerary: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Itinerary',
    index: true
  },
  invitedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  permission: {
    type: String,
    enum: ['view', 'edit']
  },
  status: {
    type: String,
    default: 'sent'
  },
  targetType: {
    type: String,
    enum: ['all', 'customer', 'tourProvider', 'staff', 'specific_user'],
    default: 'all'
  },
  targetEmail: {
    type: String,
    trim: true
  },
  batchId: {
    type: mongoose.Schema.Types.ObjectId,
    index: true
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
}, { timestamps: true });

notificationSchema.index({ recipient: 1, notificationType: 1, status: 1 });
notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ notificationType: 1, createdAt: -1 });
notificationSchema.index({ isDeleted: 1, createdAt: -1 });

const Notification = mongoose.model('Notification', notificationSchema);

export default Notification;
