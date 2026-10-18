import mongoose from 'mongoose';

/**
 * Lịch khởi hành (Tour Departure)
 * Một bản ghi là một ngày khởi hành cụ thể của một tour, có số chỗ và giá riêng.
 * Tách riêng khỏi lịch trình (Tour.itinerary) vì lịch trình là nội dung chương trình
 * theo ngày, còn lịch khởi hành là các mốc thời gian khởi đi thực tế.
 */
const departureSchema = new mongoose.Schema({
  tourId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tour',
    required: [true, 'Tour ID là bắt buộc'],
    index: true
  },
  providerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Provider ID là bắt buộc'],
    index: true
  },
  departureDate: {
    type: Date,
    required: [true, 'Vui lòng chọn ngày khởi hành']
  },
  availableSeats: {
    type: Number,
    required: [true, 'Vui lòng nhập số chỗ'],
    min: [0, 'Số chỗ không được âm'],
    default: 0
  },
  price: {
    type: Number,
    min: [0, 'Giá khởi hành không được âm'],
    default: null
  },
  status: {
    type: String,
    enum: ['scheduled', 'cancelled'],
    default: 'scheduled',
    index: true
  },
  note: {
    type: String,
    trim: true,
    maxlength: [500, 'Ghi chú không được vượt quá 500 ký tự'],
    default: ''
  }
}, {
  timestamps: true
});

// Một tour chỉ có một lịch khởi hành cho mỗi ngày
departureSchema.index({ tourId: 1, departureDate: 1 });

const Departure = mongoose.model('Departure', departureSchema);

export default Departure;