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
  },
  joinedAt: {
    type: Date,
    default: Date.now
  }
}, { _id: false });

const commentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: [true, 'Nội dung bình luận không được để trống'],
    trim: true,
    maxlength: [500, 'Nội dung bình luận không được vượt quá 500 ký tự']
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, { _id: true });

const packingItemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Packing item name is required'],
    trim: true,
    maxlength: [160, 'Packing item name cannot exceed 160 characters']
  },
  isPacked: {
    type: Boolean,
    default: false
  },
  // UC-151 – trạng thái "đã chuẩn bị" theo từng thành viên.
  // Mỗi user tick thì thêm _id vào mảng này; isPacked phía trên chỉ còn là
  // cờ tổng hợp/legacy để tương thích dữ liệu cũ.
  packedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }]
}, { _id: true });

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
  destinations: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Destination'
  }],
  tours: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tour'
  }],
  // START UC-53 Add Activity to Itinerary
  // Mảng hoạt động của lịch trình; mỗi phần tử có date + startTime/endTime dạng
  // "HH:mm" để detectScheduleConflicts so trùng giờ trong cùng một ngày (BR-62).
  activities: [activitySchema],
  // END UC-53 Add Activity to Itinerary
  packingItems: [packingItemSchema],
  // START UC-120 Transfer Itinerary Ownership
  // Danh sách cộng tác viên (user + permission view/edit). Chuyển quyền sở hữu
  // hoán đổi owner cũ thành collaborator 'edit' và bỏ người nhận khỏi mảng này (BR-72).
  collaborators: [collaboratorSchema],
  // END UC-120 Transfer Itinerary Ownership
  comments: [commentSchema]
}, { timestamps: true });

const Itinerary = mongoose.model('Itinerary', itinerarySchema);

export default Itinerary;
