import mongoose from 'mongoose';

const activityLogSchema = new mongoose.Schema({
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  adminUsername: {
    type: String,
    required: true,
    trim: true
  },
  adminEmail: {
    type: String,
    trim: true
  },
  action: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  targetType: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  targetId: {
    type: String,
    trim: true
  },
  details: {
    type: String,
    required: true,
    trim: true
  },
  ipAddress: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

activityLogSchema.index({ createdAt: -1 });

const ActivityLog = mongoose.model('ActivityLog', activityLogSchema);

export default ActivityLog;
