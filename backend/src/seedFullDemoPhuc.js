import dns from 'dns';
dns.setServers(['8.8.8.8', '1.1.1.1']);
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

dotenv.config();

import User from './models/User.js';
import Tour from './models/Tour.js';
import TourCategory from './models/TourCategory.js';
import Destination from './models/Destination.js';
import DestinationCategory from './models/DestinationCategory.js';
import Departure from './models/Departure.js';
import Booking from './models/Booking.js';
import Review from './models/Review.js';
import Announcement from './models/Announcement.js';
import Itinerary from './models/Itinerary.js';

async function seedFullDemo() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      dbName: process.env.DB_NAME || 'tripmate_WDP301'
    });
    console.log('Connected to MongoDB successfully.');

    // =========================================================================
    // 1. SETUP ACCOUNTS (Customer A, Customer B, Staff, Provider)
    // Note: Do NOT pre-hash with bcrypt because UserSchema has a pre('save') hook
    // that hashes this.password automatically when modified.
    // =========================================================================
    console.log('\n--- 1. SETTING UP ACCOUNTS ---');

    // 1.1 Customer A (Primary account: phuclh)
    let customerA = await User.findOne({ email: 'phuclhce191132@gmail.com' });
    if (!customerA) {
      customerA = await User.create({
        username: 'phuclh',
        email: 'phuclhce191132@gmail.com',
        password: 'Phuc123@',
        phone: '0847395252',
        role: 'customer',
        isActive: true,
        isDeleted: false
      });
    } else {
      customerA.username = 'phuclh';
      customerA.password = 'Phuc123@';
      customerA.role = 'customer';
      customerA.isActive = true;
      customerA.isDeleted = false;
      customerA.phone = customerA.phone || '0847395252';
      await customerA.save();
    }
    console.log(`[Account] Customer A: phuclhce191132@gmail.com / Phuc123@ (_id: ${customerA._id})`);

    // 1.2 Customer B (Secondary account: phuc3112 for sharing test)
    let customerB = await User.findOne({ email: 'lamphuc3112@gmail.com' });
    if (!customerB) {
      customerB = await User.create({
        username: 'phuc3112',
        email: 'lamphuc3112@gmail.com',
        password: 'Phuc123@',
        phone: '0987654321',
        role: 'customer',
        isActive: true,
        isDeleted: false
      });
    } else {
      customerB.username = 'phuc3112';
      customerB.password = 'Phuc123@';
      customerB.role = 'customer';
      customerB.isActive = true;
      customerB.isDeleted = false;
      customerB.phone = customerB.phone || '0987654321';
      await customerB.save();
    }
    console.log(`[Account] Customer B: lamphuc3112@gmail.com / Phuc123@ (_id: ${customerB._id})`);

    // 1.3 Staff (ayano) - preserves default password 123456
    let staffUser = await User.findOne({ email: 'ayano123@gmail.com' });
    if (!staffUser) {
      staffUser = await User.create({
        username: 'ayano',
        email: 'ayano123@gmail.com',
        password: '123456',
        phone: '0912345678',
        role: 'staff',
        isActive: true,
        isDeleted: false
      });
    } else {
      staffUser.password = '123456';
      staffUser.role = 'staff';
      staffUser.isActive = true;
      staffUser.isDeleted = false;
      await staffUser.save();
    }
    console.log(`[Account] Staff: ayano123@gmail.com / 123456 (_id: ${staffUser._id})`);

    // 1.4 Provider (provider) - preserves default password 123456
    let providerUser = await User.findOne({ email: 'provider123@gmail.com' });
    if (!providerUser) {
      providerUser = await User.create({
        username: 'provider',
        email: 'provider123@gmail.com',
        password: '123456',
        phone: '0933456789',
        role: 'tourProvider',
        isActive: true,
        isDeleted: false
      });
    } else {
      providerUser.password = '123456';
      providerUser.role = 'tourProvider';
      providerUser.isActive = true;
      providerUser.isDeleted = false;
      await providerUser.save();
    }
    console.log(`[Account] Provider: provider123@gmail.com / 123456 (_id: ${providerUser._id})`);

    // =========================================================================
    // 2. FLOW 1: STAFF ANNOUNCEMENTS (UC 124, 125, 126, 83, 127)
    // =========================================================================
    console.log('\n--- 2. FLOW 1 DATA: PLATFORM ANNOUNCEMENTS ---');
    // Ensure draft announcement exists for UC-125 (update & publish)
    let draftAnn = await Announcement.findOne({ title: '[Bản nháp] Nâng cấp hệ thống định vị & chỉ đường Tour' });
    if (!draftAnn) {
      draftAnn = await Announcement.create({
        title: '[Bản nháp] Nâng cấp hệ thống định vị & chỉ đường Tour',
        content: 'Bản nháp thông báo tính năng định vị thời gian thực cho du khách tham gia các tour trọn gói.',
        audience: 'customer',
        isActive: false,
        createdBy: staffUser._id
      });
      console.log(`[Created Draft Announcement] ${draftAnn.title} (ID: ${draftAnn._id})`);
    } else {
      draftAnn.isActive = false;
      await draftAnn.save();
      console.log(`[Ready Draft Announcement] ${draftAnn.title} (ID: ${draftAnn._id})`);
    }

    // Ensure announcement for deletion exists (UC-127)
    let deleteAnn = await Announcement.findOne({ title: '[Thông báo thử nghiệm] Hướng dẫn thanh toán mẫu cần xóa' });
    if (!deleteAnn) {
      deleteAnn = await Announcement.create({
        title: '[Thông báo thử nghiệm] Hướng dẫn thanh toán mẫu cần xóa',
        content: 'Thông báo tạo ra để nhân viên thử nghiệm thao tác xóa vĩnh viễn trên trang quản lý.',
        audience: 'all',
        isActive: true,
        createdBy: staffUser._id
      });
      console.log(`[Created Deletable Announcement] ${deleteAnn.title} (ID: ${deleteAnn._id})`);
    }

    // =========================================================================
    // 3. FLOW 2: PROVIDER TOURS, DEPARTURES, BOOKINGS, REVENUE (UC 33, 38, 43, 76, 12, 70)
    // =========================================================================
    console.log('\n--- 3. FLOW 2 DATA: PROVIDER TOURS & BOOKINGS ---');
    // 3.1 Get or create a Category
    let category = await TourCategory.findOne({ isDeleted: false });
    if (!category) {
      category = await TourCategory.create({
        name: 'Du lịch Khám phá',
        description: 'Các tour khám phá thiên nhiên và văn hóa đặc sắc'
      });
    }

    // 3.2 Ensure Provider has an ACTIVE tour with full Schedule (for UC-33 & UC-38)
    let providerTour = await Tour.findOne({ providerId: providerUser._id, status: 'active', isDeleted: false });
    if (!providerTour) {
      providerTour = await Tour.create({
        title: 'Tour Miền Tây - Khám Phá Chợ Nổi Cái Răng & Vườn Trái Cây Cần Thơ',
        description: 'Trải nghiệm văn hóa chợ nổi sông nước miền Tây độc đáo, thưởng thức trái cây miệt vườn tươi ngon và ẩm thực dân dã Nam Bộ.',
        location: 'Cần Thơ',
        departureLocation: 'Bến Ninh Kiều, Cần Thơ',
        destinationLocation: 'Chợ Nổi Cái Răng - Cồn Sơn, Cần Thơ',
        price: 1850000,
        duration: '2 ngày 1 đêm',
        availableSeats: 25,
        status: 'active',
        providerId: providerUser._id,
        categoryId: category._id,
        images: ['https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80'],
        itinerary: [
          {
            day: 1,
            title: 'Khám phá Bến Ninh Kiều & Chợ Đêm Cần Thơ',
            description: 'Đón khách tại bến Ninh Kiều, nhận phòng khách sạn, du ngoạn du thuyền ngắm hoàng hôn trên sông Hậu và thưởng thức bữa tối.',
            meals: ['Trưa', 'Tối']
          },
          {
            day: 2,
            title: 'Chợ Nổi Cái Răng - Lò Hủ Tiếu - Làng Du Lịch Cồn Sơn',
            description: 'Xuất phát sớm đi thuyền tham quan Chợ nổi Cái Răng, ăn sáng trên ghe, ghé lò hủ tiếu truyền thống và thưởng thức cá lóc bay Cồn Sơn.',
            meals: ['Sáng', 'Trưa']
          }
        ]
      });
      console.log(`[Created Provider Tour] ${providerTour.title} (ID: ${providerTour._id})`);
    } else {
      providerTour.availableSeats = 25;
      providerTour.itinerary = [
        {
          day: 1,
          title: 'Khám phá Bến Ninh Kiều & Chợ Đêm Cần Thơ',
          description: 'Đón khách tại bến Ninh Kiều, nhận phòng khách sạn, du ngoạn du thuyền ngắm hoàng hôn trên sông Hậu và thưởng thức bữa tối.',
          meals: ['Trưa', 'Tối']
        },
        {
          day: 2,
          title: 'Chợ Nổi Cái Răng - Lò Hủ Tiếu - Làng Du Lịch Cồn Sơn',
          description: 'Xuất phát sớm đi thuyền tham quan Chợ nổi Cái Răng, ăn sáng trên ghe, ghé lò hủ tiếu truyền thống và thưởng thức cá lóc bay Cồn Sơn.',
          meals: ['Sáng', 'Trưa']
        }
      ];
      await providerTour.save();
      console.log(`[Updated Provider Tour] ${providerTour.title} (ID: ${providerTour._id})`);
    }

    // 3.3 Ensure Departures for UC-43 Cancel Departure
    // Clean old test departures for this tour
    await Departure.deleteMany({ tourId: providerTour._id });

    // Departure 1: >= 72h in future (5 days from now) -> CAN BE CANCELLED SUCCESSFULLY
    const futureDateFar = new Date();
    futureDateFar.setDate(futureDateFar.getDate() + 5);
    futureDateFar.setHours(8, 0, 0, 0);

    const departureEligible = await Departure.create({
      tourId: providerTour._id,
      providerId: providerUser._id,
      departureDate: futureDateFar,
      availableSeats: 20,
      price: 1850000,
      status: 'scheduled',
      note: 'Đợt khởi hành hợp lệ để test UC-43 hủy trước >= 72h'
    });
    console.log(`[Created Departure Eligible] ID: ${departureEligible._id} on ${futureDateFar.toISOString().split('T')[0]} (Cách 5 ngày)`);

    // Departure 2: < 72h in future (24 hours from now) -> BLOCKED WITH 409
    const futureDateNear = new Date();
    futureDateNear.setDate(futureDateNear.getDate() + 1);
    futureDateNear.setHours(8, 0, 0, 0);

    const departureBlocked = await Departure.create({
      tourId: providerTour._id,
      providerId: providerUser._id,
      departureDate: futureDateNear,
      availableSeats: 20,
      price: 1850000,
      status: 'scheduled',
      note: 'Đợt khởi hành sát giờ (< 72h) để test UC-43 bị chặn 409'
    });
    console.log(`[Created Departure Blocked] ID: ${departureBlocked._id} on ${futureDateNear.toISOString().split('T')[0]} (Cách 24h)`);

    // 3.4 Seed Bookings for this Provider's tour (for UC-76, UC-12 & UC-70 Revenue)
    // Clean old provider bookings
    await Booking.deleteMany({ tourId: providerTour._id, customerId: { $ne: customerA._id } });

    // Link a confirmed booking of Customer A to the eligible departure (so cancel departure cascades to cancel booking!)
    const bookingOnEligibleDeparture = await Booking.create({
      tourId: providerTour._id,
      customerId: customerA._id,
      fullName: 'Lê Hoàng Phúc',
      phone: '0847395252',
      email: 'phuclhce191132@gmail.com',
      address: 'Cần Thơ',
      numberOfPeople: 2,
      departureDate: futureDateFar,
      totalPrice: 3700000,
      status: 'confirmed',
      note: 'Đơn đặt tour test hủy theo đợt khởi hành UC-43'
    });
    console.log(`[Created Booking Cascade] ID: ${bookingOnEligibleDeparture._id} on Departure 5 days`);

    // Seed diverse bookings for Provider Revenue & Filter testing
    const sampleCustomerEmails = ['cus1@gmail.com', 'mai@gmail.com', 'kuma@gmail.com', 'skibidi@gmail.com'];
    const sampleStatuses = [
      { status: 'paid', monthOffset: 1, people: 4, price: 7400000 },
      { status: 'paid', monthOffset: 2, people: 2, price: 3700000 },
      { status: 'completed', monthOffset: 3, people: 3, price: 5550000 },
      { status: 'completed', monthOffset: 4, people: 5, price: 9250000 },
      { status: 'checked_in', monthOffset: 0, people: 2, price: 3700000 },
      { status: 'pending', monthOffset: 0, people: 2, price: 3700000 },
      { status: 'cancelled', monthOffset: 2, people: 2, price: 3700000, cancelReason: 'Khách đổi lịch' }
    ];

    for (let i = 0; i < sampleStatuses.length; i++) {
      const item = sampleStatuses[i];
      const d = new Date();
      d.setMonth(d.getMonth() - item.monthOffset);
      await Booking.create({
        tourId: providerTour._id,
        customerId: customerB._id,
        fullName: `Khách Hàng ${i + 1}`,
        phone: `090123456${i}`,
        email: `guest${i + 1}@example.com`,
        address: 'Hồ Chí Minh',
        numberOfPeople: item.people,
        departureDate: d,
        totalPrice: item.price,
        status: item.status,
        cancelReason: item.cancelReason || '',
        paidAt: item.status === 'paid' || item.status === 'completed' || item.status === 'checked_in' ? d : null
      });
    }
    console.log(`[Created] ${sampleStatuses.length} sample bookings for Provider Revenue Stats (UC-70) & Requests (UC-76/12)`);

    // =========================================================================
    // 4. FLOW 3: CUSTOMER EXPLORE, BOOKINGS, REVIEWS (UC 28, 64, 15, 152, 87)
    // =========================================================================
    console.log('\n--- 4. FLOW 3 DATA: CUSTOMER TOURS, REVIEWS & PASSENGER INFO ---');
    // 4.1 Ensure at least 3 active tours for UC-64 Compare Tours
    const sapaTour = await Tour.findOne({ title: /Fansipan Sapa/i });
    if (sapaTour) {
      sapaTour.status = 'active';
      sapaTour.isDeleted = false;
      await sapaTour.save();
    }
    const danangTour = await Tour.findOne({ title: /Đà Nẵng/i });
    if (danangTour) {
      danangTour.status = 'active';
      danangTour.isDeleted = false;
      await danangTour.save();
    }
    console.log('Ensured active tours for comparison (UC-64): Miền Tây, Sapa, Đà Nẵng');

    // 4.2 Destination for UC-15 (Remove Favorite Destination) & UC-20 (Delete Destination Cascade)
    let destNinhKieu = await Destination.findOne({ name: 'Bến Ninh Kiều - Cần Thơ' });
    if (!destNinhKieu) {
      destNinhKieu = await Destination.create({
        name: 'Bến Ninh Kiều - Cần Thơ',
        description: 'Biểu tượng du lịch sông nước Cần Thơ, lung linh về đêm bên cầu tình yêu và bến du thuyền.',
        location: 'Ninh Kiều, Cần Thơ',
        images: ['https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80'],
        status: 'active',
        isPopular: true
      });
    }

    let destTestDelete = await Destination.findOne({ name: 'Điểm Đến Thử Nghiệm Xóa (Sa Pa)' });
    if (!destTestDelete) {
      destTestDelete = await Destination.create({
        name: 'Điểm Đến Thử Nghiệm Xóa (Sa Pa)',
        description: 'Điểm đến mẫu để Staff thực hiện UC-20 Delete Destination kiểm tra cascade gỡ khỏi Favorite và Itinerary.',
        location: 'Sa Pa, Lào Cai',
        images: ['https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80'],
        status: 'active',
        isPopular: false
      });
    } else {
      destTestDelete.isDeleted = false;
      destTestDelete.status = 'active';
      await destTestDelete.save();
    }

    // Add destinations to Customer A favorites
    customerA.favoriteDestinations = [destNinhKieu._id, destTestDelete._id];
    await customerA.save();
    console.log(`[Favorite Destinations] Set ${customerA.favoriteDestinations.length} destinations for customer phuclh`);

    // 4.3 Bookings for Customer A:
    // Booking A1: UC-152 Passenger info update allowed (count = 0)
    const bookingUpdateAllowed = await Booking.create({
      tourId: providerTour._id,
      customerId: customerA._id,
      fullName: 'Lê Hoàng Phúc',
      phone: '0847395252',
      email: 'phuclhce191132@gmail.com',
      address: 'Số 123 đường 30/4, Ninh Kiều, Cần Thơ',
      numberOfPeople: 2,
      departureDate: new Date('2026-11-25T00:00:00.000Z'),
      totalPrice: 3700000,
      status: 'confirmed',
      passengerUpdateCount: 0,
      note: 'Đơn test sửa hành khách hợp lệ (0/3 lần) UC-152'
    });
    console.log(`[Created Booking UC-152 Valid] ID: ${bookingUpdateAllowed._id} (passengerUpdateCount: 0)`);

    // Booking A2: UC-152 Passenger info update blocked (count = 3)
    const bookingUpdateBlocked = await Booking.create({
      tourId: providerTour._id,
      customerId: customerA._id,
      fullName: 'Lê Hoàng Phúc',
      phone: '0847395252',
      email: 'phuclhce191132@gmail.com',
      address: 'Số 123 đường 30/4, Ninh Kiều, Cần Thơ',
      numberOfPeople: 1,
      departureDate: new Date('2026-11-28T00:00:00.000Z'),
      totalPrice: 1850000,
      status: 'confirmed',
      passengerUpdateCount: 3,
      note: 'Đơn test đã đạt giới hạn sửa hành khách (3/3 lần) UC-152'
    });
    console.log(`[Created Booking UC-152 Blocked] ID: ${bookingUpdateBlocked._id} (passengerUpdateCount: 3)`);

    // Booking A3: UC-87 Tour Đà Nẵng: Completed in past, NOT reviewed yet -> READY TO CREATE REVIEW!
    if (danangTour) {
      await Booking.deleteMany({ customerId: customerA._id, tourId: danangTour._id });
      await Review.deleteMany({ userId: customerA._id, tourId: danangTour._id });

      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 10);

      const bookingReadyToReview = await Booking.create({
        tourId: danangTour._id,
        customerId: customerA._id,
        fullName: 'Lê Hoàng Phúc',
        phone: '0847395252',
        email: 'phuclhce191132@gmail.com',
        address: 'Cần Thơ',
        numberOfPeople: 2,
        departureDate: pastDate,
        totalPrice: 6980000,
        status: 'confirmed',
        note: 'Đơn đã đi xong sẵn sàng tạo đánh giá mới (UC-87)'
      });
      console.log(`[Created Booking UC-87 Reviewable] Tour Đà Nẵng (ID: ${bookingReadyToReview._id})`);
    }

    // Booking A4: UC-87 Tour Sa Pa: Completed with EXISTING REVIEW by phuclh
    if (sapaTour) {
      await Booking.deleteMany({ customerId: customerA._id, tourId: sapaTour._id });
      await Review.deleteMany({ userId: customerA._id, tourId: sapaTour._id });

      const pastDateSapa = new Date();
      pastDateSapa.setDate(pastDateSapa.getDate() - 20);

      await Booking.create({
        tourId: sapaTour._id,
        customerId: customerA._id,
        fullName: 'Lê Hoàng Phúc',
        phone: '0847395252',
        email: 'phuclhce191132@gmail.com',
        address: 'Cần Thơ',
        numberOfPeople: 1,
        departureDate: pastDateSapa,
        totalPrice: 4200000,
        status: 'confirmed'
      });

      await Review.create({
        userId: customerA._id,
        tourId: sapaTour._id,
        rating: 5,
        comment: 'Chuyến đi Sa Pa rất tuyệt vời! Hướng dẫn viên chu đáo, cảnh săn mây Fansipan tuyệt đẹp.',
        status: 'approved',
        isDeleted: false,
        isReported: false
      });
      console.log(`[Created Booking & Review UC-87 Already Reviewed] Tour Sa Pa`);
    }

    // =========================================================================
    // 5. FLOW 4: ITINERARY PLANNING & SHARING (UC 51, 56, 147, 63, 60, 23)
    // =========================================================================
    console.log('\n--- 5. FLOW 4 DATA: PERSONAL ITINERARY & SHARING ---');
    // Clean old itineraries for customer A
    await Itinerary.deleteMany({ owner: customerA._id });

    const sharedItinerary = await Itinerary.create({
      owner: customerA._id,
      title: 'Hành trình khám phá Cần Thơ & Miền Tây sông nước (4N3Đ)',
      startDate: new Date('2026-11-20'),
      endDate: new Date('2026-11-23'),
      budget: 5000000,
      destinations: [destNinhKieu._id, destTestDelete._id],
      tours: [providerTour._id],
      activities: [
        {
          title: 'Du thuyền ngắm hoàng hôn Bến Ninh Kiều',
          date: new Date('2026-11-20'),
          startTime: '17:00',
          endTime: '19:00',
          location: 'Bến Ninh Kiều, Cần Thơ',
          estimatedCost: 200000,
          notes: 'Ăn tối trên du thuyền Cần Thơ'
        },
        {
          title: 'Đi thuyền khám phá Chợ Nổi Cái Răng',
          date: new Date('2026-11-21'),
          startTime: '05:30',
          endTime: '08:30',
          location: 'Chợ nổi Cái Răng, Cần Thơ',
          estimatedCost: 150000,
          notes: 'Thưởng thức hủ tiếu và cà phê bồng bềnh trên sông'
        }
      ],
      packingItems: [
        { name: 'Áo khoác gió chống nắng', isPacked: false, packedBy: [] },
        { name: 'Sạc dự phòng 20.000mAh', isPacked: true, packedBy: [customerA._id] },
        { name: 'Thuốc chống say sóng', isPacked: false, packedBy: [] }
      ],
      collaborators: [
        {
          user: customerB._id,
          permission: 'edit',
          joinedAt: new Date()
        }
      ]
    });
    console.log(`[Created Itinerary] "${sharedItinerary.title}" (ID: ${sharedItinerary._id})`);
    console.log(`  - Gắn Tour: ${providerTour.title} (Sẵn sàng test UC-56 xóa tour)`);
    console.log(`  - Gắn Hành lý: 3 vật dụng (Sẵn sàng test UC-147 thêm vật dụng)`);
    console.log(`  - Chia sẻ với: lamphuc3112@gmail.com (quyền edit) -> Sẵn sàng test UC-23 Lưu về tài khoản`);

    // =========================================================================
    // 6. FLOW 5: STAFF MODERATION & SUSPENSION (UC 92, 93, 100, 20)
    // =========================================================================
    console.log('\n--- 6. FLOW 5 DATA: STAFF MODERATION & SUSPENSION ---');
    // 6.1 Reported Review for UC-92 & UC-93
    // Delete old reported test reviews
    await Review.deleteMany({ comment: /quảng cáo bán thuốc đông y/i });
    if (sapaTour) {
      const reportedReview = await Review.create({
        userId: customerB._id,
        tourId: sapaTour._id,
        rating: 1,
        comment: 'Tour quá tệ, hướng dẫn viên dẫn đi quảng cáo bán thuốc đông y giả tại bản Cát Cát liên hệ sđt 0999999999 để nhận quà!',
        status: 'pending',
        isReported: true,
        reportReason: 'Spam hoặc thông tin sai lệch lừa đảo',
        reportDetails: 'Đánh giá chứa nội dung spam số điện thoại quảng cáo trái phép cần kiểm duyệt gỡ bỏ.',
        reportedBy: customerA._id,
        isDeleted: false
      });
      console.log(`[Created Reported Review] ID: ${reportedReview._id} on Tour Sa Pa (Sẵn sàng test UC-92 & UC-93)`);
    }

    // 6.2 Tour for UC-100 Suspend Tour
    let suspendTestTour = await Tour.findOne({ title: 'Tour Khám Phá Tràng An - Bái Đính Ninh Bình (1 Ngày)' });
    if (!suspendTestTour) {
      suspendTestTour = await Tour.create({
        title: 'Tour Khám Phá Tràng An - Bái Đính Ninh Bình (1 Ngày)',
        description: 'Chiêm ngưỡng danh thắng Tràng An di sản thế giới và quần thể chùa Bái Đính lớn nhất Đông Nam Á.',
        location: 'Ninh Bình',
        departureLocation: 'Hà Nội',
        destinationLocation: 'Tràng An, Ninh Bình',
        price: 950000,
        duration: '1 ngày',
        availableSeats: 30,
        status: 'active',
        providerId: providerUser._id,
        categoryId: category._id,
        images: ['https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80'],
        itinerary: [
          { day: 1, title: 'Hà Nội - Bái Đính - Tràng An', description: 'Khởi hành từ Hà Nội, viếng chùa Bái Đính, đi thuyền Tràng An', meals: ['Trưa'] }
        ]
      });
      console.log(`[Created Active Tour for Suspension] "${suspendTestTour.title}" (ID: ${suspendTestTour._id})`);
    } else {
      suspendTestTour.status = 'active';
      suspendTestTour.suspensionReason = '';
      suspendTestTour.suspendedAt = null;
      suspendTestTour.suspendedBy = null;
      await suspendTestTour.save();
      console.log(`[Reset Active Tour for Suspension] "${suspendTestTour.title}" (ID: ${suspendTestTour._id})`);
    }

    console.log('\n=============================================================');
    console.log('✅ ALL TEST DATA SEEDED SUCCESSFULLY FOR 26 USE CASES!');
    console.log('=============================================================\n');

    process.exit(0);
  } catch (err) {
    console.error('Error seeding data:', err);
    process.exit(1);
  }
}

seedFullDemo();

