import mongoose from 'mongoose';

const destinationCategorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Category name is required'],
    unique: true,
    trim: true,
    maxlength: [100, 'Category name cannot exceed 100 characters']
  },
  description: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

const DestinationCategory = mongoose.model('DestinationCategory', destinationCategorySchema);

export default DestinationCategory;
