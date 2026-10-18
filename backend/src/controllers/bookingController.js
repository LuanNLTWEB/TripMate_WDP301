import Booking from '../models/Booking.js';
import Tour from '../models/Tour.js';
import { validationResult } from 'express-validator';

// Nhận thông tin đặt tour từ customer, kiểm tra tour còn chỗ, tính tổng tiền rồi tạo booking
export const createBooking = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: errors.array()[0]?.msg || 'Dữ liệu đặt tour không hợp lệ',
      errors: errors.array()
    });
  }

  try {
    const { fullName, phone, email, address, numberOfPeople, departureDate, note } = req.body;
    const tourId = req.params.tourId;

    const tour = await Tour.findOne({ _id: tourId, status: 'active' });
    if (!tour) {
      return res.status(404).json({
        success: false,
        message: 'Tour không tồn tại hoặc hiện không nhận đặt'
      });
    }

    if (tour.availableSeats < numberOfPeople) {
      return res.status(400).json({
        success: false,
        message: `Tour hiện chỉ còn ${tour.availableSeats} chỗ trống, không đủ cho ${numberOfPeople} người`
      });
    }

    const totalPrice = tour.price * numberOfPeople;

    const booking = await Booking.create({
      tourId: tour._id,
      customerId: req.user._id,
      fullName,
      phone,
      email,
      address: address || '',
      numberOfPeople,
      departureDate,
      note: note || '',
      totalPrice,
      status: 'pending'
    });

    await booking.populate([
      { path: 'tourId', select: 'title location duration price images' },
      { path: 'customerId', select: 'username email phone' }
    ]);

    res.status(201).json({
      success: true,
      message: 'Đặt tour thành công! Chúng tôi sẽ liên hệ xác nhận với bạn sớm nhất.',
      data: booking
    });
  } catch (error) {
    console.error('Error creating booking:', error);
    res.status(500).json({
      success: false,
      message: 'Không thể đặt tour. Vui lòng thử lại.'
    });
  }
};

// Lấy toàn bộ danh sách booking của customer đang đăng nhập, sắp xếp mới nhất trước
export const getMyBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ customerId: req.user._id })
      .populate('tourId', 'title location duration price images departureLocation destinationLocation')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: bookings.length,
      data: bookings
    });
  } catch (error) {
    console.error('Error fetching my bookings:', error);
    res.status(500).json({
      success: false,
      message: 'Không thể tải danh sách đặt tour'
    });
  }
};
