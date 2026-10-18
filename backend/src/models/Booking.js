import mongoose from 'mongoose';

const bookingSchema = new mongoose.Schema({
  tourId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tour',
    required: [true, 'Tour ID là bắt buộc']
  },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Customer ID là bắt buộc']
  },
  fullName: {
    type: String,
    required: [true, 'Vui lòng nhập họ và tên'],
    trim: true,
    maxlength: [100, 'Họ và tên không được vượt quá 100 ký tự']
  },
  phone: {
    type: String,
    required: [true, 'Vui lòng nhập số điện thoại'],
    trim: true,
    match: [/^(0)[35789][0-9]{8}$/, 'Số điện thoại không hợp lệ']
  },
  email: {
    type: String,
    required: [true, 'Vui lòng nhập email'],
    trim: true,
    lowercase: true,
    match: [/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.(com|vn|edu|edu\.vn)$/i, 'Email không hợp lệ']
  },
  address: {
    type: String,
    trim: true,
    maxlength: [200, 'Địa chỉ không được vượt quá 200 ký tự'],
    default: ''
  },
  numberOfPeople: {
    type: Number,
    required: [true, 'Vui lòng nhập số lượng người'],
    min: [1, 'Số lượng người phải ít nhất là 1'],
    max: [100, 'Số lượng người không được vượt quá 100']
  },
  departureDate: {
    type: Date,
    required: [true, 'Vui lòng chọn ngày khởi hành']
  },
  note: {
    type: String,
    trim: true,
    maxlength: [500, 'Ghi chú không được vượt quá 500 ký tự'],
    default: ''
  },
  totalPrice: {
    type: Number,
    required: true,
    min: [0, 'Tổng tiền không được âm']
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'cancelled'],
    default: 'pending'
  }
}, {
  timestamps: true
});

bookingSchema.index({ tourId: 1, status: 1, createdAt: -1 });
bookingSchema.index({ customerId: 1, createdAt: -1 });

const Booking = mongoose.model('Booking', bookingSchema);

export default Booking;
