import dns from 'dns';
dns.setServers(['8.8.8.8', '1.1.1.1']);
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import Announcement from './models/Announcement.js';
import User from './models/User.js';

async function seedAnnouncements() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      dbName: process.env.DB_NAME || 'tripmate_WDP301'
    });
    console.log('Connected to MongoDB');

    // Platform announcements are owned by Staff according to UC124-127.
    const creator = await User.findOne({ role: 'staff' });
    if (!creator) {
      console.error('No staff user found to assign createdBy');
      process.exit(1);
    }

    console.log(`Using creator: ${creator.username} (${creator._id})`);

    // Clean up gibberish test announcement if exists
    await Announcement.deleteMany({ title: { $in: ['fawf', 'test', 'gaegfsrgf'] } });

    const announcementsData = [
      {
        title: '[Bảo trì] Lịch nâng cấp máy chủ & tối ưu hệ thống thanh toán ngày 25/10/2026',
        audience: 'all',
        isActive: true,
        createdBy: creator._id,
        content: `Kính gửi Quý khách hàng và các Đối tác nhà cung cấp tour,

Nhằm nâng cao chất lượng dịch vụ, cải thiện tốc độ tải trang và đảm bảo tính bảo mật tối đa cho các giao dịch đặt tour, TripMate sẽ tiến hành bảo trì và nâng cấp hạ tầng máy chủ định kỳ.

• Thời gian dự kiến: 00:00 - 03:00 ngày 25/10/2026 (khoảng 3 tiếng).
• Phạm vi ảnh hưởng: Trong khoảng thời gian này, các tính năng thanh toán trực tuyến và đặt tour mới có thể tạm thời gián đoạn trong ít phút.
• Dữ liệu người dùng: Toàn bộ lịch trình du lịch cá nhân, thông tin đặt chỗ và tài khoản của Quý khách vẫn được lưu trữ tuyệt đối an toàn và có thể truy cập bình thường ngay sau khi hệ thống hoàn tất nâng cấp.

TripMate xin chân thành cảm ơn sự đồng hành và thông cảm của Quý khách!`
      },
      {
        title: 'Cập nhật chính sách bảo vệ quyền lợi du khách & chương trình ưu đãi mùa lễ hội',
        audience: 'customer',
        isActive: true,
        createdBy: creator._id,
        content: `Chào mừng mùa du lịch lễ hội cuối năm, TripMate trân trọng thông báo bản cập nhật chính sách hỗ trợ khách du lịch áp dụng từ hôm nay:

1. Miễn phí hủy tour linh hoạt: Áp dụng hủy tour không mất phí trước 72 giờ đối với tất cả tour có huy hiệu "Đảm bảo bởi TripMate".
2. Ưu đãi tích lũy điểm thưởng: Nhận ngay voucher giảm giá 15% (tối đa 300.000 VNĐ) cho chuyến đi kế tiếp khi hoàn thành đánh giá và chia sẻ trải nghiệm sau chuyến đi.
3. Hỗ trợ khẩn cấp 24/7: Tổng đài hỗ trợ du khách hoạt động liên tục trong suốt thời gian chuyến đi của bạn.

Kính chúc Quý du khách có những chuyến hành trình ngập tràn niềm vui và an toàn cùng gia đình, bạn bè!`
      },
      {
        title: 'Quy chuẩn tiếp nhận booking và cam kết chất lượng dịch vụ (SLA) cho Nhà cung cấp',
        audience: 'tourProvider',
        isActive: true,
        createdBy: creator._id,
        content: `Kính gửi các Nhà cung cấp Tour du lịch trên nền tảng TripMate,

Để cùng xây dựng môi trường kinh doanh du lịch minh bạch, nâng cao tỷ lệ chốt tour và tối ưu trải nghiệm của du khách, Ban quản trị ban hành bộ quy chuẩn tiếp nhận yêu cầu đặt tour mới:

1. Thời gian phản hồi booking: Đề nghị các đối tác tiếp nhận và phản hồi yêu cầu đặt tour trong vòng 2 giờ làm việc.
2. Cập nhật lịch khởi hành & số lượng chỗ: Luôn cập nhật trạng thái còn chỗ chính xác ít nhất 48 giờ trước ngày xuất phát.
3. Tiêu chuẩn hình ảnh & lịch trình: Hình ảnh điểm đến cần rõ nét, thông tin bữa ăn, loại xe đưa đón và hướng dẫn viên cần được mô tả chi tiết, minh bạch.

Các nhà cung cấp đạt chuẩn SLA xuất sắc trong tháng sẽ được ưu tiên xuất hiện tại khu vực "Tour Nổi Bật" trên trang chủ hệ thống.`
      },
      {
        title: 'Ra mắt tính năng Trợ lý AI Du lịch - Tự động thiết kế lịch trình trong 30 giây',
        audience: 'all',
        isActive: true,
        createdBy: creator._id,
        content: `TripMate chính thức phát hành tính năng Trợ lý Du lịch Thông minh được hỗ trợ bởi công nghệ AI thế hệ mới!

Chỉ với vài thao tác đơn giản tại mục "Lịch trình của tôi", hệ thống sẽ hỗ trợ bạn:
• Lên kế hoạch tự động theo từng ngày: Khám phá các điểm đến hot nhất phù hợp với sở thích cá nhân (nghỉ dưỡng, văn hóa, ẩm thực, mạo hiểm).
• Tối ưu cung đường di chuyển: Tiết kiệm tối đa thời gian di chuyển giữa các điểm tham quan.
• Dự toán chi phí chi tiết: Ước lượng chi phí vé tham quan, ăn uống và gợi ý các tour du lịch tương thích.

Trải nghiệm ngay hôm nay để sẵn sàng cho kỳ nghỉ tuyệt vời sắp tới của bạn!`
      }
    ];

    for (const ann of announcementsData) {
      const existing = await Announcement.findOne({ title: ann.title });
      if (existing) {
        await Announcement.findByIdAndUpdate(existing._id, ann);
        console.log(`Updated announcement: ${ann.title}`);
      } else {
        await Announcement.create(ann);
        console.log(`Created announcement: ${ann.title}`);
      }
    }

    const count = await Announcement.countDocuments();
    console.log(`Total announcements in database: ${count}`);
    process.exit(0);
  } catch (error) {
    console.error('Error seeding announcements:', error);
    process.exit(1);
  }
}

seedAnnouncements();
