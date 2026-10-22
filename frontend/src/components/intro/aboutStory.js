export const ABOUT_CHAPTERS = [
  {
    number: '01',
    railLabel: 'Tìm kiếm ý tưởng',
    kicker: 'Mọi chuyến đi đều bắt đầu từ một câu hỏi',
    title: 'BẠN MUỐN ĐI',
    accent: 'ĐÂU TIẾP THEO?',
    description: 'TripMate gom điểm đến, tour và trải nghiệm Việt Nam vào một nơi để ý tưởng đầu tiên không còn nằm mãi trong danh sách dự định.',
    location: 'TripMate · Khám phá Việt Nam',
    coordinates: 'TÌM KIẾM · LỌC · SO SÁNH',
    align: 'left',
    route: '/destinations',
    routeLabel: 'Khám phá điểm đến',
    feature: {
      kind: 'search',
      eyebrow: 'Bắt đầu khám phá',
      title: 'Bạn muốn đi đâu?',
      hint: 'Nhập tên hoặc chọn chủ đề',
      actionLabel: 'Tìm kiếm ngay',
      tags: ['Biển đảo', 'Thiên nhiên', 'Di sản', 'Nghỉ dưỡng']
    }
  },
  {
    number: '02',
    railLabel: 'Chọn điểm đến',
    kicker: 'Từ cả Việt Nam đến nơi hợp với bạn',
    title: 'CHỌN ĐIỂM ĐẾN',
    accent: 'THEO CÁCH CỦA RIÊNG BẠN',
    description: 'Lọc theo khu vực, loại hình và đánh giá; xem thông tin chi tiết rồi lưu lại những nơi bạn muốn quay về.',
    location: 'Điểm đến · Danh thắng',
    coordinates: 'BỘ LỌC · ĐÁNH GIÁ · YÊU THÍCH',
    align: 'left',
    route: '/destinations',
    routeLabel: 'Xem danh sách điểm đến',
    feature: {
      kind: 'destination',
      eyebrow: 'Gợi ý nổi bật',
      title: 'Vịnh Hạ Long',
      meta: 'Quảng Ninh · Di sản thiên nhiên thế giới',
      rating: '4.8',
      reviewCount: 128,
      badge: 'Đã lưu',
      actionLabel: 'Xem điểm đến này'
    }
  },
  {
    number: '03',
    railLabel: 'Khám phá tour',
    kicker: 'Biến cảm hứng thành lựa chọn rõ ràng',
    title: 'CHỌN TOUR',
    accent: 'PHÙ HỢP NHỊP ĐI CỦA BẠN',
    description: 'So sánh hành trình theo thời lượng, giá, số chỗ và đánh giá. Mọi thông tin cần thiết được đặt cạnh nhau trước khi bạn quyết định.',
    location: 'Hà Nội → Hạ Long',
    coordinates: 'THỜI LƯỢNG · GIÁ · SỐ CHỖ',
    align: 'wide',
    route: '/tours',
    routeLabel: 'Tìm tour phù hợp',
    feature: {
      kind: 'tour',
      eyebrow: 'Hành trình được chọn nhiều nhất',
      title: 'Hạ Long giữa miền di sản',
      meta: '2 ngày 1 đêm · Khởi hành hàng tuần',
      price: 'Từ 2.450.000 ₫',
      badge: 'Còn 08 chỗ',
      actionLabel: 'Xem lịch trình tour'
    }
  },
  {
    number: '04',
    railLabel: 'Lên lịch trình',
    kicker: 'Một kế hoạch, nhiều người cùng hoàn thiện',
    title: 'XÂY LỊCH TRÌNH',
    accent: 'TỪNG NGÀY, CÙNG NHAU',
    description: 'Thêm điểm đến, tour và hoạt động theo ngày; kéo thả để sắp xếp, theo dõi chi phí rồi mời bạn đồng hành cùng xem hoặc chỉnh sửa.',
    location: 'Lịch trình cá nhân · Nhóm',
    coordinates: 'KÉO THẢ · NGÂN SÁCH · CỘNG TAC',
    align: 'left',
    route: '/itinerary',
    routeLabel: 'Tạo lịch trình',
    feature: {
      kind: 'itinerary',
      eyebrow: 'Ngày 01 · Hạ Long (Kéo thả sắp xếp)',
      items: [
        { time: '07:30', label: 'Bến Tuần Châu', type: 'Đón đoàn' },
        { time: '09:15', label: 'Khám phá vịnh & Hang Sửng Sốt', type: 'Tham quan' },
        { time: '14:00', label: 'Chèo thuyền Kayak Làng Chài', type: 'Trải nghiệm' }
      ],
      budget: '2.150.000 / 6.000.000 ₫',
      collaborators: [
        { initial: 'P', name: 'Phúc (Trưởng nhóm)' },
        { initial: 'A', name: 'An (Bạn đồng hành)' },
        { initial: 'M', name: 'Mai (Bạn đồng hành)' }
      ],
      actionLabel: 'Mở trang Lịch trình'
    }
  },
  {
    number: '05',
    railLabel: 'Khởi hành trọn vẹn',
    kicker: 'TripMate đi cùng bạn đến cuối hành trình',
    title: 'SẴN SÀNG',
    accent: 'CHO CHUYẾN ĐI CỦA BẠN',
    description: 'Đặt tour, theo dõi trạng thái chuyến đi, lưu điều yêu thích và chia sẻ đánh giá sau khi trở về — một hành trình liền mạch từ dự định đến ký ức.',
    location: 'TripMate · Đồng hành trọn chuyến',
    coordinates: 'ĐẶT CHỖ · QUẢN LÝ · ĐÁNH GIÁ',
    align: 'right',
    final: true,
    feature: {
      kind: 'complete',
      eyebrow: 'Chuyến đi của bạn',
      title: 'Hạ Long · 2N1Đ',
      meta: 'Đặt chỗ đã xác nhận · Mã #TM-8924',
      rating: '★★★★★',
      ratingText: '5/5 sao · Rất hài lòng',
      actionLabel: 'Khám phá thêm điểm đến'
    }
  }
];

export const ABOUT_MOBILE_CHAPTERS = [
  {
    ...ABOUT_CHAPTERS[0],
    number: '01',
    title: 'KHÁM PHÁ',
    accent: 'ĐIỂM ĐẾN PHÙ HỢP',
    description: 'Tìm, lọc và lưu những điểm đến Việt Nam bạn muốn trải nghiệm.',
    background: 'https://res.cloudinary.com/fkjcxcyn/image/upload/v1789823914/tripmate_assets/of6h9l69tbbltwdrzsne.webp'
  },
  {
    ...ABOUT_CHAPTERS[2],
    number: '02',
    title: 'CHỌN TOUR',
    accent: 'MINH BẠCH TRƯỚC KHI ĐẶT',
    description: 'So sánh lịch trình, giá, số chỗ và đánh giá trong một màn hình.',
    background: 'https://res.cloudinary.com/fkjcxcyn/image/upload/v1789823915/tripmate_assets/azeu5jrituyutaiaselh.webp'
  },
  {
    ...ABOUT_CHAPTERS[3],
    number: '03',
    title: 'LÊN KẾ HOẠCH',
    accent: 'VÀ CÙNG NHAU KHỞI HÀNH',
    description: 'Sắp xếp từng ngày, kiểm soát chi phí và cộng tác cùng bạn đồng hành.',
    final: true,
    background: 'https://res.cloudinary.com/fkjcxcyn/image/upload/v1789823918/tripmate_assets/lshwv5kf5oupn6qlqrzl.webp'
  }
];

export const ABOUT_CHAPTER_COUNT = ABOUT_CHAPTERS.length;
