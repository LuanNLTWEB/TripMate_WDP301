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
  }
}, {
  timestamps: true
});

const Destination = mongoose.model('Destination', destinationSchema);

export default Destination;
