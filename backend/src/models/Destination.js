import mongoose from 'mongoose';

const destinationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Destination name is required'],
    trim: true,
    maxlength: [100, 'Destination name cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Destination description is required']
  },
  location: {
    type: String,
    required: [true, 'Destination location is required'],
    trim: true
  },
  images: {
    type: [String],
    validate: [v => v.length > 0, 'At least one image is required']
  },
  averageRating: {
    type: Number,
    default: 0,
    min: [0, 'Rating must be at least 0'],
    max: [5, 'Rating cannot exceed 5']
  },
  isPopular: {
    type: Boolean,
    default: false
  },
  // START UC-121 Update Destination Status
  // Chỉ staff đổi được giá trị này qua PATCH /api/destinations/:id/status;
  // điểm đến inactive sẽ bị ẩn khỏi phía public (BR-32/BR-35).
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active',
    index: true
  },
  // END UC-121 Update Destination Status
  isDeleted: {
    type: Boolean,
    default: false,
    index: true
  },
  deletedAt: {
    type: Date,
    default: null
  },
  categoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DestinationCategory',
    default: null
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

const Destination = mongoose.model('Destination', destinationSchema);

export default Destination;
