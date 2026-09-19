import mongoose from 'mongoose';

const tourCategorySchema = new mongoose.Schema({
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

const TourCategory = mongoose.model('TourCategory', tourCategorySchema);

export default TourCategory;
