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
    maxlength: [500, 'Notification message cannot exceed 500 characters']
  },
  notificationType: {
    type: String,
    required: true,
    default: 'itinerary_invite',
    maxlength: [20, 'Notification type cannot exceed 20 characters']
  },
  isRead: {
    type: Boolean,
    default: false,
    index: true
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
    enum: ['pending', 'accepted', 'declined'],
    default: 'pending'
  }
}, { timestamps: true });

notificationSchema.index({ recipient: 1, notificationType: 1, status: 1 });

const Notification = mongoose.model('Notification', notificationSchema);

export default Notification;
