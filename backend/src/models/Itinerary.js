import mongoose from 'mongoose';

const activitySchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Activity title is required'],
    trim: true,
    maxlength: [160, 'Activity title cannot exceed 160 characters']
  },
  date: {
    type: Date,
    required: [true, 'Activity date is required']
  },
  startTime: {
    type: String,
    required: [true, 'Activity start time is required'],
    match: [/^([01]\d|2[0-3]):[0-5]\d$/, 'Activity start time must use HH:mm format']
  },
  endTime: {
    type: String,
    required: [true, 'Activity end time is required'],
    match: [/^([01]\d|2[0-3]):[0-5]\d$/, 'Activity end time must use HH:mm format']
  },
  location: {
    type: String,
    trim: true,
    maxlength: [200, 'Activity location cannot exceed 200 characters']
  },
  estimatedCost: {
    type: Number,
    min: [0, 'Estimated cost cannot be negative'],
    default: 0
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [1000, 'Activity notes cannot exceed 1000 characters']
  }
}, { _id: true });

const collaboratorSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  permission: {
    type: String,
    enum: ['view', 'edit'],
    required: true
  }
}, { _id: false });

const itinerarySchema = new mongoose.Schema({
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  title: {
    type: String,
    required: [true, 'Itinerary title is required'],
    trim: true,
    maxlength: [120, 'Itinerary title cannot exceed 120 characters']
  },
  startDate: Date,
  endDate: Date,
  budget: {
    type: Number,
    min: [0, 'Budget cannot be negative'],
    default: 0
  },
  activities: [activitySchema],
  collaborators: [collaboratorSchema]
}, { timestamps: true });

const Itinerary = mongoose.model('Itinerary', itinerarySchema);

export default Itinerary;
