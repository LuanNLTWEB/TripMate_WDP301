import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });
import connectDB from './config/db.js';
import mongoose from 'mongoose';
import User from './models/User.js';
import Tour from './models/Tour.js';
import Booking from './models/Booking.js';
import Complaint from './models/Complaint.js';
import Itinerary from './models/Itinerary.js';

async function seedData() {
  await connectDB();
  console.log('--- ĐANG TẠO DỮ LIỆU TEST CHO CÁC TÍNH NĂNG CỦA BAOLG ---');

  // 1. Tạo hoặc cập nhật Provider
  let provider = await User.findOne({ email: 'provider@test.com' });
  if (!provider) {
    provider = new User({
      username: 'provider_test',
      email: 'provider@test.com',
      password: '123456',
      phone: '0912345678',
      role: 'tourProvider',
      isActive: true
    });
    await provider.save();
    console.log('✓ Đã tạo tài khoản Provider:', provider.email);
  } else {
    provider.role = 'tourProvider';
    provider.isActive = true;
    provider.isDeleted = false;
    provider.phone = provider.phone || '0912345678';
    provider.password = '123456';
    await provider.save();
    console.log('✓ Đã cập nhật tài khoản Provider:', provider.email);
  }

  // 2. Tạo hoặc cập nhật Customer
  let customer = await User.findOne({ email: 'customer@test.com' });
  if (!customer) {
    customer = new User({
      username: 'customer_test',
      email: 'customer@test.com',
      password: '123456',
      phone: '0987654321',
      role: 'customer',
      isActive: true,
      noShowCount: 0,
      isBookingRestricted: false
    });
    await customer.save();
    console.log('✓ Đã tạo tài khoản Customer:', customer.email);
  } else {
    customer.role = 'customer';
    customer.isActive = true;
    customer.isDeleted = false;
    customer.phone = customer.phone || '0987654321';
    customer.password = '123456';
    customer.noShowCount = 0;
    customer.isBookingRestricted = false;
    await customer.save();
    console.log('✓ Đã cập nhật tài khoản Customer:', customer.email);
  }

  // 3. Đảm bảo Provider có ít nhất một Tour hợp lệ
  let tour = await Tour.findOne({ providerId: provider._id });
  if (!tour) {
    tour = await Tour.create({
      providerId: provider._id,
      title: 'Tour Khám Phá Vịnh Hạ Long 3N2Đ Cao Cấp',
      description: 'Trải nghiệm du thuyền 5 sao vịnh Hạ Long, chèo kayak hang Luồn, tham quan động Thiên Cung.',
      location: 'Quảng Ninh',
      departureLocation: 'Hà Nội',
      destinationLocation: 'Hạ Long',
      duration: '3 ngày 2 đêm',
      price: 3500000,
      maxGroupSize: 30,
      availableSeats: 25,
      isApproved: true,
      status: 'active',
      images: [
        'https://images.unsplash.com/photo-1528127269322-539801943592?w=800',
        'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800'
      ]
    });
    console.log('✓ Đã tạo Tour mới cho Provider:', tour.title);
  } else {
    console.log('✓ Sử dụng Tour có sẵn của Provider:', tour.title);
  }

  // 4. Xóa các booking cũ của customer customer@test.com
  await Booking.deleteMany({
    customerId: customer._id
  });

  // TẠO CÁC BOOKINGS MẪU:
  // Đơn 1: PENDING (Chờ duyệt)
  const booking1 = await Booking.create({
    tourId: tour._id,
    customerId: customer._id,
    fullName: 'Nguyễn Văn An',
    phone: '0987654321',
    email: 'customer@test.com',
    numberOfPeople: 2,
    departureDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 ngày tới
    totalPrice: 7000000,
    status: 'pending',
    note: 'Yêu cầu phòng tầng cao hướng biển'
  });
  console.log('✓ Đã tạo Đơn 1 (Chờ xác nhận):', booking1.fullName);

  // Đơn 2: PENDING (Chờ duyệt / từ chối)
  const booking2 = await Booking.create({
    tourId: tour._id,
    customerId: customer._id,
    fullName: 'Trần Thị Bích',
    phone: '0987654321',
    email: 'customer@test.com',
    numberOfPeople: 1,
    departureDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10 ngày tới
    totalPrice: 3500000,
    status: 'pending',
    note: 'Cần dịch vụ đưa đón tại khách sạn'
  });
  console.log('✓ Đã tạo Đơn 2 (Chờ xác nhận):', booking2.fullName);

  // Đơn 3: CONFIRMED (Đã xác nhận - xem vé Voucher)
  const booking3 = await Booking.create({
    tourId: tour._id,
    customerId: customer._id,
    fullName: 'Hoàng Minh Đức',
    phone: '0987654321',
    email: 'customer@test.com',
    numberOfPeople: 3,
    departureDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 ngày tới
    totalPrice: 10500000,
    status: 'confirmed',
    note: 'Đoàn có 1 người ăn chay và 1 trẻ em'
  });
  console.log('✓ Đã tạo Đơn 3 (Đã xác nhận):', booking3.fullName);

  // Đơn 4: CONFIRMED quá hạn (Để Provider kiểm tra báo No-Show)
  const pastDate = new Date();
  pastDate.setDate(pastDate.getDate() - 3); // 3 ngày trước
  const booking4 = await Booking.create({
    tourId: tour._id,
    customerId: customer._id,
    fullName: 'Lê Văn Cường',
    phone: '0987654321',
    email: 'customer@test.com',
    numberOfPeople: 1,
    departureDate: pastDate,
    totalPrice: 3500000,
    status: 'confirmed',
    note: 'Hẹn đón tại điểm tập trung trung tâm thành phố'
  });
  console.log('✓ Đã tạo Đơn 4 (Đã qua ngày khởi hành):', booking4.fullName);

  // Đơn 5: Đơn đã hoàn thành có khiếu nại (để kiểm tra sửa khiếu nại)
  const complaintDate = new Date();
  complaintDate.setDate(complaintDate.getDate() - 10);
  const booking5 = await Booking.create({
    tourId: tour._id,
    customerId: customer._id,
    fullName: 'Phạm Thu Hà',
    phone: '0987654321',
    email: 'customer@test.com',
    numberOfPeople: 2,
    departureDate: complaintDate,
    totalPrice: 7000000,
    status: 'completed',
    note: 'Chuyến đi gia đình 2 người'
  });

  // Đơn 6: VẮNG MẶT (Đã ghi nhận vắng mặt sẵn để Provider lọc thấy ngay)
  const noShowDate = new Date();
  noShowDate.setDate(noShowDate.getDate() - 5);
  const booking6 = await Booking.create({
    tourId: tour._id,
    customerId: customer._id,
    fullName: 'Đỗ Hoàng Long',
    phone: '0987654321',
    email: 'customer@test.com',
    numberOfPeople: 1,
    departureDate: noShowDate,
    totalPrice: 3500000,
    status: 'no_show',
    noShowReason: 'Khách không có mặt tại điểm đón và không liên lạc được.',
    noShowMarkedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
    noShowMarkedBy: provider._id,
    note: 'Yêu cầu đón tại sảnh khách sạn'
  });
  console.log('✓ Đã tạo Đơn 6 (Đã vắng mặt sẵn):', booking6.fullName);

  // Xóa complaint cũ liên quan nếu có
  await Complaint.deleteMany({ customerId: customer._id });

  const complaint = await Complaint.create({
    customerId: customer._id,
    bookingId: booking5._id,
    tourId: tour._id,
    providerId: provider._id,
    category: 'quality_mismatch',
    description: 'Chất lượng phòng khách sạn không giống quảng cáo ban đầu, thiếu tiện ích hồ bơi và buffet sáng như đã thỏa thuận.',
    evidenceImages: [
      'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800',
      'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800'
    ],
    status: 'open'
  });
  console.log('✓ Đã tạo Khiếu nại mở:', complaint._id);

  // 5. Tạo Lịch trình có xung đột giờ
  await Itinerary.deleteMany({ owner: customer._id });
  const itineraryDate = new Date();
  itineraryDate.setDate(itineraryDate.getDate() + 5);

  const itinerary = await Itinerary.create({
    owner: customer._id,
    title: 'Lịch trình Đà Lạt Mộng Mơ 3N2Đ',
    startDate: itineraryDate,
    endDate: new Date(itineraryDate.getTime() + 2 * 24 * 60 * 60 * 1000),
    budget: 5000000,
    activities: [
      {
        title: 'Tham quan Vườn hoa Thành Phố',
        date: itineraryDate,
        startTime: '08:00',
        endTime: '10:30',
        location: 'Đường Trần Quốc Toản, Đà Lạt',
        estimatedCost: 100000,
        notes: 'Chụp hình check-in buổi sáng'
      },
      {
        title: 'Đi cáp treo Đồi Robin - Thiền Viện',
        date: itineraryDate,
        startTime: '10:00',
        endTime: '11:45',
        location: 'Đồi Robin, Đà Lạt',
        estimatedCost: 150000,
        notes: 'Ngắm toàn cảnh Đà Lạt từ trên cao'
      },
      {
        title: 'Ăn trưa lẩu gà lá é Tao Ngộ',
        date: itineraryDate,
        startTime: '12:00',
        endTime: '13:30',
        location: 'Đường 3/4, Đà Lạt',
        estimatedCost: 200000,
        notes: 'Ăn trưa'
      }
    ]
  });
  console.log('✓ Đã tạo Lịch trình:', itinerary.title);

  console.log('\n=============================================');
  console.log('🎉 TẤT CẢ DỮ LIỆU TEST ĐÃ ĐƯỢC TẠO THÀNH CÔNG!');
  console.log('=============================================');
  process.exit(0);
}

seedData().catch((err) => {
  console.error('Lỗi khi seed data:', err);
  process.exit(1);
});
