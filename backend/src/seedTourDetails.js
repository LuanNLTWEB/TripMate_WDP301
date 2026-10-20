import dns from 'dns';
dns.setServers(['8.8.8.8', '1.1.1.1']);
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();
import Tour from './models/Tour.js';

async function seedData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // 1. Tour Phú Quốc 4N3Đ
    const t1 = await Tour.findByIdAndUpdate('6abf210b81afb7a621afb1a5', {
      status: 'active',
      itinerary: [
        {
          day: 1,
          title: 'TP.HCM / Hà Nội – Phú Quốc – Grand World "Thành phố không ngủ"',
          description: 'Xe và hướng dẫn viên đón đoàn tại sân bay Phú Quốc đưa về resort/khách sạn nhận phòng nghỉ ngơi. Buổi chiều, đoàn khởi hành đi Grand World – chiêm ngưỡng kiến trúc kênh đào Venice thu nhỏ, tham quan Bảo tàng Gấu Teddy và thưởng thức show diễn thực cảnh Tinh hoa Việt Nam đặc sắc.',
          meals: ['Trưa', 'Tối']
        },
        {
          day: 2,
          title: 'Tour Canô 4 Đảo – Cáp treo Hòn Thơm & Lặn ngắm san hô tự nhiên',
          description: 'Quý khách lên canô cao tốc khám phá các hòn đảo đẹp nhất phía Nam: Hòn Móng Tay, Hòn Gầm Ghì, Hòn Mây Rút. Trải nghiệm lặn ngắm san hô tự nhiên với đầy đủ trang thiết bị an toàn, quay phim chụp hình SUP và flycam miễn phí. Chiều trải nghiệm cáp treo 3 dây vượt biển dài nhất thế giới sang Hòn Thơm và vui chơi tại công viên nước Aquatopia.',
          meals: ['Sáng', 'Trưa', 'Tối']
        },
        {
          day: 3,
          title: 'Khám phá Vinpearl Safari bán hoang dã – Check-in hoàng hôn Sunset Sanato',
          description: 'Đoàn tham quan Vườn thú bán hoang dã Vinpearl Safari lớn nhất Việt Nam bằng xe bus chuyên dụng. Buổi chiều trải nghiệm khu vui chơi giải trí hoặc tự do tắm biển bãi Sao. Cuối chiều, thưởng thức đồ uống mát lạnh và ngắm hoàng hôn rực rỡ tại Sunset Sanato Beach Club với các công trình nghệ thuật độc đáo bên bờ biển.',
          meals: ['Sáng', 'Trưa', 'Tối']
        },
        {
          day: 4,
          title: 'Chợ Dương Đông – Vườn tiêu Suối Đá & Nhà thùng Nước mắm – Tiễn sân bay',
          description: 'Đoàn dùng điểm tâm sáng buffet tại khách sạn, tự do tắm biển và làm thủ tục trả phòng. Xe đưa đoàn tham quan cơ sở nuôi cấy Ngọc Trai cao cấp, vườn tiêu Suối Đá xanh tốt, nhà thùng nước mắm truyền thống lâu đời và mua sắm hải sản khô tại chợ Dương Đông. Xe đưa đoàn ra sân bay Phú Quốc, kết thúc chuyến tham quan trọn vẹn.',
          meals: ['Sáng', 'Trưa']
        }
      ],
      includedServices: [
        'Vé máy bay khứ hồi (bao gồm 7kg hành lý xách tay + 20kg hành lý ký gửi)',
        'Khách sạn tiêu chuẩn 4-5 sao gần biển (2 khách/phòng, trường hợp lẻ ngủ ghép phòng 3)',
        'Xe du lịch đời mới máy lạnh cao cấp đưa đón tham quan suốt tuyến theo lịch trình',
        'Vé tham quan trọn gói: Cáp treo Hòn Thơm, Vinpearl Safari, Grand World',
        'Canô cao tốc tham quan 4 đảo và lặn ngắm san hô trang bị kính lặn, áo phao',
        'Các bữa ăn tiêu chuẩn theo chương trình (3 bữa sáng buffet + 7 bữa chính đặc sản đảo)',
        'Hướng dẫn viên chuyên nghiệp, nhiệt tình, am hiểu văn hóa địa phương đồng hành suốt tour',
        'Bảo hiểm du lịch nội địa mức bồi thường tối đa 100.000.000đ/vụ',
        'Nước suối tinh khiết 2 chai 500ml/khách/ngày và khăn lạnh du lịch'
      ],
      excludedServices: [
        'Thuế giá trị gia tăng (VAT 8% - 10%) nếu quý khách yêu cầu xuất hóa đơn đỏ',
        'Chi phí cá nhân ngoài chương trình (giặt ủi, điện thoại, minibar, đồ uống gọi thêm)',
        'Vé vui chơi VinWonders (quý khách có thể đăng ký vé combo ưu đãi cùng HDV)',
        'Tiền tip bồi dưỡng cho tài xế và hướng dẫn viên (khuyến nghị 50.000đ/ngày/khách)',
        'Phụ thu phòng đơn đối với khách đi một mình hoặc yêu cầu phòng riêng'
      ],
      cancellationPolicy: `• Hủy tour trước 15 ngày so với ngày khởi hành: Miễn phí hoàn 100% chi phí tour.
• Hủy tour từ 8 đến 14 ngày trước ngày khởi hành: Phí hủy là 30% tổng chi phí tour.
• Hủy tour từ 3 đến 7 ngày trước ngày khởi hành: Phí hủy là 70% tổng chi phí tour.
• Hủy tour trong vòng 48 giờ trước giờ khởi hành: Phí hủy là 100% giá trị tour.
• Trường hợp bất khả kháng do thiên tai, dịch bệnh hoặc hoãn/hủy chuyến bay từ hãng hàng không: Hai bên cùng phối hợp hỗ trợ đổi ngày khởi hành linh hoạt mà không mất phí dịch vụ.`,
      notes: `• Quý khách vui lòng mang theo Căn cước công dân hoặc Hộ chiếu bản gốc còn hạn sử dụng khi làm thủ tục check-in sân bay và khách sạn.
• Trẻ em dưới 14 tuổi chưa có CCCD phải đi cùng cha mẹ hoặc người giám hộ hợp pháp kèm theo bản sao trích lục Giấy khai sinh.
• Quý khách nên chuẩn bị trang phục gọn nhẹ, giày thể thao hoặc quai hậu thoải mái, đồ bơi, kem chống nắng và mũ rộng vành.
• Quý khách có tiền sử bệnh tim mạch, huyết áp hoặc phụ nữ mang thai vui lòng thông báo trước để được hỗ trợ tốt nhất.
• Thứ tự các điểm tham quan có thể thay đổi linh hoạt tùy theo điều kiện thời tiết thực tế nhưng vẫn đảm bảo đủ các điểm trong chương trình.`
    }, { new: true });

    console.log('Updated Phu Quoc:', t1?.title, 'Itinerary days:', t1?.itinerary?.length);

    // 2. Tour Sapa 3N2Đ
    const t2 = await Tour.findByIdAndUpdate('6abf210b81afb7a621afb1a4', {
      status: 'active',
      itinerary: [
        {
          day: 1,
          title: 'Hà Nội – Sapa – Bản Cát Cát mộng mơ',
          description: 'Xe giường nằm cao cấp đón khách tại phố cổ Hà Nội khởi hành đi Sapa theo đường cao tốc Nội Bài - Lào Cai. Đến Sapa ăn trưa và nhận phòng khách sạn. Buổi chiều bách bộ tham quan Bản Cát Cát của người H’Mông, ngắm nhìn ruộng bậc thang và thác Tiên Sa thơ mộng.',
          meals: ['Trưa', 'Tối']
        },
        {
          day: 2,
          title: 'Chinh phục Đỉnh Fansipan – Nóc nhà Đông Dương – Núi Hàm Rồng',
          description: 'Sáng đoàn đi cáp treo Sun World Fansipan Legend vượt mây lên đỉnh 3.143m ngắm toàn cảnh dãy Hoàng Liên Sơn hùng vĩ. Chiều tham quan khu du lịch Núi Hàm Rồng, vườn lan Châu Âu và Cổng Trời. Tối tự do khám phá Chợ Tình Sapa và thưởng thức ẩm thực đồ nướng.',
          meals: ['Sáng', 'Trưa', 'Tối']
        },
        {
          day: 3,
          title: 'Đèo Ô Quy Hồ – Cầu kính Rồng Mây – Sapa – Hà Nội',
          description: 'Sáng xe đưa đoàn chinh phục một trong tứ đại đỉnh đèo miền Bắc - Ô Quy Hồ, check-in Cầu kính Rồng Mây ngắm thung lũng mây bồng bềnh. Sau đó về thị trấn mua sắm đặc sản măng khô, nấm hương, hạt dẻ trước khi lên xe về lại Hà Nội.',
          meals: ['Sáng', 'Trưa']
        }
      ],
      includedServices: [
        'Xe ô tô giường nằm Cabin cao cấp khứ hồi Hà Nội – Sapa – Hà Nội',
        'Khách sạn 3-4 sao trung tâm thị trấn Sapa (2 khách/phòng)',
        'Các bữa ăn theo tiêu chuẩn (2 bữa sáng buffet + 5 bữa chính đặc sản Tây Bắc)',
        'Vé thắng cảnh các điểm: Bản Cát Cát, Núi Hàm Rồng, Cổng Trời',
        'Hướng dẫn viên bản địa am hiểu phong tục tập quán đồng hành',
        'Bảo hiểm du lịch nội địa mức tối đa 50.000.000đ/người'
      ],
      excludedServices: [
        'Vé cáp treo Fansipan khứ hồi và tàu hỏa leo núi Mường Hoa',
        'Vé trải nghiệm Cầu Kính Rồng Mây',
        'Chi phí cá nhân ngoài chương trình, đồ uống trong bữa ăn',
        'Tiền bồi dưỡng (tip) cho tài xế và HDV'
      ],
      cancellationPolicy: `• Hủy trước 7 ngày: Miễn phí 100%
• Hủy từ 3-6 ngày: Phí 50% tổng tour
• Hủy trong 48 giờ: Phí 100%`,
      notes: `• Khí hậu Sapa se lạnh quanh năm, quý khách nên mang theo áo khoác ấm, khăn choàng và giày thể thao chống trơn trượt.`
    }, { new: true });

    console.log('Updated Sapa:', t2?.title, 'Itinerary days:', t2?.itinerary?.length);

    // 3. Tour Đà Nẵng
    const t3 = await Tour.findByIdAndUpdate('6aabf7337c74af84cd1a2a1d', {
      status: 'active',
      itinerary: [
        {
          day: 1,
          title: 'Đà Nẵng – Bán đảo Sơn Trà – Biển Mỹ Khê – Phố Cổ Hội An',
          description: 'Đón khách tại sân bay Đà Nẵng, viếng chùa Linh Ứng Bãi Bụt trên bán đảo Sơn Trà ngắm tượng Phật Bà 67m. Chiều khởi hành đi Phố Cổ Hội An – bách bộ ngắm Chùa Cầu, nhà cổ Tấn Ký, hội quán Phúc Kiến và thả đèn hoa đăng trên sông Hoài.',
          meals: ['Trưa', 'Tối']
        },
        {
          day: 2,
          title: 'Khu du lịch Sun World Bà Nà Hills – Check-in Cầu Vàng bàn tay khổng lồ',
          description: 'Trải nghiệm tuyến cáp treo đạt nhiều kỷ lục thế giới lên đỉnh Bà Nà. Check-in siêu phẩm Cầu Vàng nổi tiếng toàn cầu, làng Pháp cổ kính, hầm rượu Debay và khu vui chơi Fantasy Park. Chiều về lại thành phố tắm biển Mỹ Khê.',
          meals: ['Sáng', 'Trưa', 'Tối']
        },
        {
          day: 3,
          title: 'Danh thắng Ngũ Hành Sơn – Làng đá Non Nước – Tiễn sân bay Đà Nẵng',
          description: 'Tham quan cụm núi Ngũ Hành Sơn huyền bí, khám phá động Huyền Không, chùa Tam Thai và mua quà lưu niệm tại Làng đá mỹ nghệ Non Nước. Xe tiễn quý khách ra sân bay Đà Nẵng.',
          meals: ['Sáng', 'Trưa']
        }
      ],
      includedServices: [
        'Xe du lịch chất lượng cao đưa đón suốt tuyến',
        'Khách sạn 4 sao ven biển Mỹ Khê (2 người/phòng)',
        'Vé cáp treo Bà Nà Hills + vé buffet trưa cao cấp trên đỉnh Bà Nà',
        'Vé tham quan Ngũ Hành Sơn, vé tham quan Phố Cổ Hội An',
        'Các bữa ăn theo lịch trình với đặc sản miền Trung (Bánh tráng thịt heo, Mì Quảng, Cơm gà Hội An)',
        'Hướng dẫn viên nhiệt tình vui vẻ phục vụ suốt tuyến',
        'Bảo hiểm du lịch tối đa 100.000.000đ/người'
      ],
      excludedServices: [
        'Vé máy bay đến và đi từ Đà Nẵng',
        'Vé bảo tàng sáp trên Bà Nà Hills',
        'Chi phí cá nhân và thuế VAT 10%'
      ],
      cancellationPolicy: `• Hủy trước 7 ngày: Miễn phí hoàn tiền 100%
• Hủy từ 3-6 ngày: Thu phí 50%
• Hủy trong 48 giờ: Thu phí 100%`,
      notes: `• Mang theo CMND/CCCD gốc.
• Mang theo nón, kính râm, đồ bơi và kem chống nắng.`
    }, { new: true });

    console.log('Updated Da Nang:', t3?.title, 'Itinerary days:', t3?.itinerary?.length);

    console.log('ALL TOURS SEEDED SUCCESSFULLY!');
    process.exit(0);
  } catch (err) {
    console.error('Seed error:', err);
    process.exit(1);
  }
}

seedData();
