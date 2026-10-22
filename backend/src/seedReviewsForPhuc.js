import dns from 'dns';
dns.setServers(['8.8.8.8', '1.1.1.1']);
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

dotenv.config();

import User from './models/User.js';
import Tour from './models/Tour.js';
import Booking from './models/Booking.js';
import Review from './models/Review.js';

const TOURS = {
  DANANG: '6aabf7337c74af84cd1a2a1d', // Tour Đà Nẵng - Bà Nà Hills - Cầu Vàng - Phố Cổ Hội An (3 ngày 2 đêm)
  SAPA: '6abf210b81afb7a621afb1a4',   // Khám phá Fansipan Sapa 3N2Đ - Chạm tay vào Mây (3 ngày 2 đêm)
  PHUQUOC: '6abf210b81afb7a621afb1a5',// Nghỉ dưỡng Đảo Ngọc Phú Quốc 4N3Đ (4 ngày 3 đêm)
  BERLIN: '6ad55a435d612356c6e8c889', // Berlin Hotel (3 ngay 2 dem)
  DEMO: '6ad6e1bc1a5308cb68609eb8'   // Demo Tour - Da hoan thanh (3 ngày 2 đêm)
};

const recalculateRating = async (tourId) => {
  const reviews = await Review.find({ tourId, status: 'approved', isDeleted: false });
  const totalReviews = reviews.length;
  const averageRating = totalReviews > 0
    ? Math.round((reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews) * 10) / 10
    : 0;

  await Tour.findByIdAndUpdate(tourId, { averageRating });
  return { averageRating, totalReviews };
};

async function seedDataForPhuc() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      dbName: process.env.DB_NAME || 'tripmate_WDP301'
    });
    console.log('Connected to MongoDB successfully.');

    // 1. Setup User account phuclh
    let userPhuc = await User.findOne({ email: 'phuclhce191132@gmail.com' });
    if (!userPhuc) {
      console.log('User phuclhce191132@gmail.com not found, creating new account...');
      userPhuc = await User.create({
        username: 'phuclh',
        email: 'phuclhce191132@gmail.com',
        password: 'Phuc123@',
        phone: '0847395252',
        role: 'customer',
        isActive: true,
        isDeleted: false
      });
    } else {
      console.log(`Found user phuclh (${userPhuc._id}). Updating username and password...`);
      userPhuc.username = 'phuclh';
      userPhuc.password = 'Phuc123@';
      userPhuc.role = 'customer';
      userPhuc.isActive = true;
      userPhuc.isDeleted = false;
      userPhuc.phone = userPhuc.phone || '0847395252';
      await userPhuc.save();
    }
    console.log(`User phuclh ready: email=${userPhuc.email}, username=${userPhuc.username}, id=${userPhuc._id}`);

    // Update u2 lamphuc3112@gmail.com password just in case
    const u2 = await User.findOne({ email: 'lamphuc3112@gmail.com' });
    if (u2) {
      u2.password = 'Phuc123@';
      await u2.save();
      console.log(`Updated secondary account lamphuc3112@gmail.com password to Phuc123@`);
    }

    // 2. Clean old test bookings and reviews of phuclh for the test tours
    const tourIds = Object.values(TOURS);
    await Booking.deleteMany({ customerId: userPhuc._id, tourId: { $in: tourIds } });
    await Review.deleteMany({ userId: userPhuc._id, tourId: { $in: tourIds } });
    console.log('Cleared existing bookings & reviews for user phuclh on test tours.');

    // 3. Create Bookings in the database
    // --- Booking 1: Tour Đà Nẵng (ĐÃ HOÀN THÀNH - CHƯA ĐÁNH GIÁ -> SẴN SÀNG ĐỂ TẠO REVIEW MỚI) ---
    const booking1 = await Booking.create({
      tourId: TOURS.DANANG,
      customerId: userPhuc._id,
      fullName: 'Lê Hoàng Phúc',
      phone: '0847395252',
      email: 'phuclhce191132@gmail.com',
      address: 'Cần Thơ, Việt Nam',
      numberOfPeople: 2,
      departureDate: new Date('2026-10-05T00:00:00.000Z'),
      note: 'Yêu cầu phòng tầng cao hướng biển và thực đơn không cay.',
      totalPrice: 6980000,
      status: 'confirmed'
    });
    console.log(`[Created] Booking 1 (Đà Nẵng - Completed, ready to review): ${booking1._id}`);

    // --- Booking 2: Tour Fansipan Sapa (ĐÃ HOÀN THÀNH - ĐÃ ĐÁNH GIÁ -> ĐỂ TEST XEM, SỬA VÀ XÓA REVIEW UC-90) ---
    const booking2 = await Booking.create({
      tourId: TOURS.SAPA,
      customerId: userPhuc._id,
      fullName: 'Lê Hoàng Phúc',
      phone: '0847395252',
      email: 'phuclhce191132@gmail.com',
      address: 'Cần Thơ, Việt Nam',
      numberOfPeople: 1,
      departureDate: new Date('2026-09-20T00:00:00.000Z'),
      note: 'Đoàn có hỗ trợ đặt vé cáp treo Fansipan sáng sớm.',
      totalPrice: 4200000,
      status: 'confirmed'
    });
    console.log(`[Created] Booking 2 (Sapa - Completed with existing review): ${booking2._id}`);

    // Create Review for Booking 2 by phuclh
    const reviewPhuc = await Review.create({
      userId: userPhuc._id,
      tourId: TOURS.SAPA,
      rating: 5,
      comment: 'Chuyến đi Sapa Fansipan vô cùng tuyệt vời! Thời tiết săn mây đẹp như mơ, hướng dẫn viên nhiệt tình, chu đáo và am hiểu tường tận văn hóa bản địa. Khách sạn view thung lũng Mường Hoa rất sạch sẽ, đồ ăn ngon miệng. Rất đáng tiền!',
      status: 'approved',
      isDeleted: false,
      isReported: false
    });
    console.log(`[Created] Review by phuclh for Sapa tour (for edit/delete testing): ${reviewPhuc._id}`);

    // --- Booking 3: Tour Phú Quốc (CHƯA ĐI - NGÀY KHỞI HÀNH TRONG TƯƠNG LAI -> TEST KHÔNG ĐỦ ĐIỀU KIỆN ĐÁNH GIÁ VÌ CHƯA HOÀN THÀNH) ---
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 15);
    const booking3 = await Booking.create({
      tourId: TOURS.PHUQUOC,
      customerId: userPhuc._id,
      fullName: 'Lê Hoàng Phúc',
      phone: '0847395252',
      email: 'phuclhce191132@gmail.com',
      address: 'Cần Thơ, Việt Nam',
      numberOfPeople: 2,
      departureDate: futureDate,
      note: 'Chuyến đi nghỉ dưỡng gia đình, cần hỗ trợ xe đón tại sân bay.',
      totalPrice: 13000000,
      status: 'confirmed'
    });
    console.log(`[Created] Booking 3 (Phú Quốc - Confirmed in future, trip not completed): ${booking3._id}`);

    // --- Booking 4: Tour Berlin Hotel (CHỜ XÁC NHẬN -> TEST KHÔNG ĐỦ ĐIỀU KIỆN ĐÁNH GIÁ VÌ CHƯA CONFIRMED) ---
    const booking4 = await Booking.create({
      tourId: TOURS.BERLIN,
      customerId: userPhuc._id,
      fullName: 'Lê Hoàng Phúc',
      phone: '0847395252',
      email: 'phuclhce191132@gmail.com',
      address: 'Cần Thơ, Việt Nam',
      numberOfPeople: 1,
      departureDate: new Date('2026-11-20T00:00:00.000Z'),
      note: 'Đang chờ khách sạn xác nhận giữ phòng đơn.',
      totalPrice: 13500000,
      status: 'pending'
    });
    console.log(`[Created] Booking 4 (Berlin - Pending, booking not confirmed): ${booking4._id}`);

    // --- Booking 5: Tour Demo (ĐÃ HỦY -> TEST DANH SÁCH ĐƠN HỦY VÀ KHÔNG ĐỦ ĐIỀU KIỆN) ---
    const booking5 = await Booking.create({
      tourId: TOURS.DEMO,
      customerId: userPhuc._id,
      fullName: 'Lê Hoàng Phúc',
      phone: '0847395252',
      email: 'phuclhce191132@gmail.com',
      address: 'Cần Thơ, Việt Nam',
      numberOfPeople: 2,
      departureDate: new Date('2026-10-15T00:00:00.000Z'),
      note: 'Đã hủy do có việc gia đình đột xuất.',
      totalPrice: 5000000,
      status: 'cancelled',
      cancelReason: 'Thay đổi kế hoạch cá nhân đột xuất.',
      cancelledAt: new Date('2026-10-10T00:00:00.000Z')
    });
    console.log(`[Created] Booking 5 (Demo - Cancelled): ${booking5._id}`);

    // 4. Ensure other users have reviews on these tours (so phuclh can test UC-91 Report Review)
    const otherUser = await User.findOne({ email: 'cus1@gmail.com' }) || await User.findOne({ role: 'customer', _id: { $ne: userPhuc._id } });
    if (otherUser) {
      const existingOtherReview = await Review.findOne({ tourId: TOURS.DANANG, userId: otherUser._id });
      if (!existingOtherReview) {
        await Review.create({
          userId: otherUser._id,
          tourId: TOURS.DANANG,
          rating: 5,
          comment: 'Dịch vụ tour Đà Nẵng rất chu đáo, xe đưa đón chuẩn giờ, hướng dẫn viên chụp hình cực đẹp!',
          status: 'approved',
          isDeleted: false,
          isReported: false
        });
        console.log(`[Created] Sample review from ${otherUser.username} on Đà Nẵng tour (for reporting test)`);
      }
    }

    // 5. Recalculate average ratings for all affected tours
    for (const [key, tId] of Object.entries(TOURS)) {
      const stats = await recalculateRating(tId);
      console.log(`Recalculated Tour ${key} (${tId}): averageRating=${stats.averageRating}, totalReviews=${stats.totalReviews}`);
    }

    console.log('\n=============================================');
    console.log('SUCCESS! ALL TEST DATA SEEDED INTO DATABASE.');
    console.log('Account login:');
    console.log('  Email: phuclhce191132@gmail.com');
    console.log('  Password: Phuc123@');
    console.log('  Username: phuclh');
    console.log('=============================================\n');

    process.exit(0);
  } catch (err) {
    console.error('Error seeding data:', err);
    process.exit(1);
  }
}

seedDataForPhuc();
