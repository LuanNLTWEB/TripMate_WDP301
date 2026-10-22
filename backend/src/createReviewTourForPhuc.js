import dns from 'dns';
dns.setServers(['8.8.8.8', '1.1.1.1']);
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import User from './models/User.js';
import Tour from './models/Tour.js';
import Booking from './models/Booking.js';
import Review from './models/Review.js';

async function createReviewTourForPhuc() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      dbName: process.env.DB_NAME || 'tripmate_WDP301'
    });
    console.log('Connected to MongoDB successfully.');

    // 1. Get User Phuclh
    const userPhuc = await User.findOne({ email: 'phuclhce191132@gmail.com' });
    if (!userPhuc) {
      console.error('User phuclhce191132@gmail.com not found!');
      process.exit(1);
    }
    console.log(`Target customer: ${userPhuc.username} (${userPhuc.email}) - ID: ${userPhuc._id}`);

    // 2. Get a valid Tour Provider
    let provider = await User.findOne({ role: 'tourProvider' });
    if (!provider) {
      provider = userPhuc; // fallback
    }
    console.log(`Tour provider: ${provider.username} (${provider.email}) - ID: ${provider._id}`);

    // 3. Find or Create the Tour dedicated for Review Testing
    const tourTitle = 'Tour Miền Tây - Khám Phá Chợ Nổi Cái Răng & Vườn Trái Cây Cần Thơ';
    let tour = await Tour.findOne({ title: tourTitle });

    if (!tour) {
      tour = await Tour.create({
        title: tourTitle,
        description: 'Trải nghiệm văn hóa sông nước miền Tây độc đáo với chợ nổi Cái Răng tấp nập lúc bình minh, thưởng thức hủ tiếu nóng hổi ngay trên ghe, tham quan lò hủ tiếu truyền thống và thưởng thức trái cây miệt vườn tươi ngon tại Cần Thơ.',
        location: 'Cần Thơ',
        departureLocation: 'Bến Ninh Kiều, Ninh Kiều, Cần Thơ',
        destinationLocation: 'Chợ Nổi Cái Răng - Cồn Sơn, Cần Thơ',
        price: 1850000,
        duration: '2 ngày 1 đêm',
        availableSeats: 25,
        images: [
          'https://res.cloudinary.com/demo/image/upload/v1689240000/tripmate/cantho_floating_market.jpg',
          'https://res.cloudinary.com/demo/image/upload/cld-sample-2.jpg'
        ],
        itinerary: [
          {
            day: 1,
            title: 'Bến Ninh Kiều – Du Thuyền Sông Hậu – Check-in Khách Sạn',
            description: 'Đón đoàn tại Bến Ninh Kiều, di chuyển về khách sạn nhận phòng nghỉ ngơi. Chiều tham quan Nhà Cổ Bình Thủy và thưởng thức bữa tối ẩm thực Tây Đô trên du thuyền sông Hậu ngắm cầu Cần Thơ lung linh về đêm.',
            meals: ['Trưa', 'Tối']
          },
          {
            day: 2,
            title: 'Bình Minh Chợ Nổi Cái Răng – Lò Hủ Tiếu – Vườn Trái Cây Mỹ Khánh',
            description: '05:30 sáng thuyền đưa đoàn xuôi dòng sông Hậu khám phá Chợ Nổi Cái Răng – di sản văn hóa phi vật thể quốc gia. Thưởng thức bữa sáng bún nước lèo/hủ tiếu trên sông. Ghé thăm lò hủ tiếu gia truyền và tự tay làm bánh tráng. Trưa tham quan vườn trái cây trĩu quả trước khi kết thúc chuyến đi.',
            meals: ['Sáng', 'Trưa']
          }
        ],
        includedServices: [
          'Khách sạn 4 sao trung tâm TP. Cần Thơ (2 khách/phòng)',
          'Tàu thuyền tham quan chợ nổi Cái Răng & áo phao an toàn đầy đủ',
          'Tất cả các bữa ăn theo chương trình đặc sản miền Tây',
          'Vé tham quan tất cả các điểm trong lịch trình',
          'Hướng dẫn viên địa phương nhiệt tình, chu đáo suốt tuyến',
          'Bảo hiểm du lịch nội địa mức bồi thường 50.000.000 VNĐ'
        ],
        excludedServices: [
          'Chi phí mua sắm quà lưu niệm cá nhân ngoài chương trình',
          'Tiền tip cho hướng dẫn viên và tài xế thuyền'
        ],
        cancellationPolicy: 'Miễn phí hủy trước 48 giờ so với giờ khởi hành.',
        status: 'active',
        providerId: provider._id,
        averageRating: 0
      });
      console.log(`Created new tour: ${tour.title} (ID: ${tour._id})`);
    } else {
      tour.status = 'active';
      tour.providerId = provider._id;
      await tour.save();
      console.log(`Updated existing tour: ${tour.title} (ID: ${tour._id})`);
    }

    // 4. Clear any existing review by Phuclh for this tour (so they can review afresh!)
    const deletedReviews = await Review.deleteMany({ tourId: tour._id, userId: userPhuc._id });
    console.log(`Cleared previous reviews by phuclh on this tour: ${deletedReviews.deletedCount} removed.`);

    // 5. Clear old bookings for this tour by Phuclh and create a fresh COMPLETED CONFIRMED BOOKING
    await Booking.deleteMany({ tourId: tour._id, customerId: userPhuc._id });

    // Set departureDate to 8 days ago (e.g. 2026-10-12)
    // Duration: 2 ngày 1 đêm -> tripEndDate = 2026-10-14, which is <= now (2026-10-21)
    // => ELIGIBLE FOR REVIEW!
    const departureDate = new Date('2026-10-12T00:00:00.000Z');
    const booking = await Booking.create({
      tourId: tour._id,
      customerId: userPhuc._id,
      fullName: 'Lê Hoàng Phúc',
      phone: '0847395252',
      email: 'phuclhce191132@gmail.com',
      address: 'Ninh Kiều, Cần Thơ',
      numberOfPeople: 2,
      departureDate: departureDate,
      totalPrice: tour.price * 2,
      status: 'confirmed',
      note: 'Chuyến đi trải nghiệm thực tế cùng bạn bè.'
    });

    console.log(`Created COMPLETED Booking: ID ${booking._id}`);
    console.log(`  Departure Date: ${departureDate.toLocaleDateString('vi-VN')}`);
    console.log(`  Completed Date: 14/10/2026 (ĐÃ HOÀN THÀNH)`);
    console.log(`  Status: confirmed`);

    // 6. Recalculate tour average rating
    const approvedReviews = await Review.find({ tourId: tour._id, status: 'approved', isDeleted: false });
    const totalReviews = approvedReviews.length;
    const averageRating = totalReviews > 0
      ? Math.round((approvedReviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews) * 10) / 10
      : 0;
    await Tour.findByIdAndUpdate(tour._id, { averageRating });

    console.log('\n======================================================');
    console.log('TOUR SẴN SÀNG CHO ACC PHUCLH ĐÁNH GIÁ:');
    console.log(`Tour Name: ${tour.title}`);
    console.log(`Tour ID:   ${tour._id}`);
    console.log(`Tour URL:  http://localhost:5173/tours/${tour._id}`);
    console.log('Customer:  phuclhce191132@gmail.com (phuclh)');
    console.log('Condition: Đã hoàn thành chuyến đi, CHƯA đánh giá.');
    console.log('======================================================\n');

    process.exit(0);
  } catch (error) {
    console.error('Error creating tour:', error);
    process.exit(1);
  }
}

createReviewTourForPhuc();
