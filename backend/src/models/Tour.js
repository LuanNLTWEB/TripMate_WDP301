import mongoose from 'mongoose';

const tourSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Tour title is required'],
    trim: true,
    maxlength: [100, 'Tour title cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Tour description is required']
  },
  location: {
    type: String,
    required: [true, 'Tour location is required'],
    trim: true
  },
  price: {
    type: Number,
    required: [true, 'Tour price is required'],
    min: [0, 'Price must be positive']
  },
  duration: {
    type: String,
    required: [true, 'Tour duration is required (e.g., 3 days 2 nights)'],
    trim: true
  },
  images: {
    type: [String],
    default: []
  },
  availableSeats: {
    type: Number,
    default: 0,
    min: [0, 'Available seats cannot be negative']
  },
  averageRating: {
    type: Number,
    default: 0,
    min: [0, 'Rating must be at least 0'],
    max: [5, 'Rating cannot exceed 5']
  }
}, {
  timestamps: true
});

const Tour = mongoose.model('Tour', tourSchema);

export default Tour;
