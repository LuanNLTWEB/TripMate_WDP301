import mongoose from 'mongoose';

const destinationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Destination name is required'],
    trim: true,
    maxlength: [120, 'Destination name cannot exceed 120 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },
  category: {
    type: String,
    required: [true, 'Destination category is required'],
    trim: true,
    maxlength: [80, 'Destination category cannot exceed 80 characters']
  },
  location: {
    address: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    country: { type: String, required: true, trim: true }
  },
  images: [{
    type: String,
    trim: true
  }],
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

destinationSchema.index({ name: 1, 'location.city': 1 }, { unique: true });

autoTrimImages(destinationSchema);

/**
 * Remove empty image values before a destination is persisted.
 * @param {mongoose.Schema} schema - Destination schema instance
 */
function autoTrimImages(schema) {
  schema.pre('validate', function(next) {
    if (Array.isArray(this.images)) {
      this.images = this.images.filter(Boolean);
    }
    next();
  });
}

const Destination = mongoose.model('Destination', destinationSchema);

export default Destination;
