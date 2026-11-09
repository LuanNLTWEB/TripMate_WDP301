import { validationResult } from 'express-validator';
import ExcelJS from 'exceljs';
import Tour from '../models/Tour.js';
import Departure from '../models/Departure.js';
import Booking from '../models/Booking.js';
import Notification from '../models/Notification.js';

const LEAD_TIME_MS = 24 * 60 * 60 * 1000;

export const createDeparture = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: errors.array()[0]?.msg || 'Dữ liệu lịch khởi hành không hợp lệ',
      errors: errors.array()
    });
  }

  try {
    const tour = await Tour.findById(req.body.tourId);
    if (!tour || tour.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy tour'
      });
    }

    const isOwner = tour.providerId && tour.providerId.equals(req.user._id);
    if (!isOwner) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền tạo lịch khởi hành cho tour này'
      });
    }

    const departureDate = new Date(req.body.departureDate);

    if (departureDate.getTime() - Date.now() < LEAD_TIME_MS) {
      return res.status(400).json({
        success: false,
        message: 'Ngày khởi hành phải cách thời điểm hiện tại ít nhất 24 giờ'
      });
    }

    const startOfDay = new Date(departureDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);

    const existing = await Departure.findOne({
      tourId: tour._id,
      status: 'scheduled',
      departureDate: { $gte: startOfDay, $lt: endOfDay }
    });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'Tour này đã có lịch khởi hành trong ngày đã chọn'
      });
    }

    const priceRaw = req.body.price;
    const price = (priceRaw === undefined || priceRaw === null || priceRaw === '')
      ? null
      : Number(priceRaw);

    const departure = await Departure.create({
      tourId: tour._id,
      providerId: tour.providerId,
      departureDate,
      availableSeats: Number(req.body.availableSeats),
      price,
      note: req.body.note || ''
    });

    return res.status(201).json({
      success: true,
      message: 'Tạo lịch khởi hành thành công',
      data: departure
    });
  } catch (error) {
    console.error('Error creating departure:', error);
    return res.status(500).json({
      success: false,
      message: 'Không thể tạo lịch khởi hành'
    });
  }
};

export const getDeparturesByTour = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: errors.array()[0]?.msg || 'Tham số không hợp lệ',
      errors: errors.array()
    });
  }

  try {
    const tour = await Tour.findById(req.query.tourId);
    if (!tour || tour.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy tour'
      });
    }

    const isOwner = tour.providerId && tour.providerId.equals(req.user._id);
    if (!isOwner) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền xem lịch khởi hành của tour này'
      });
    }

    const departures = await Departure.find({ tourId: tour._id }).sort({ departureDate: 1 });

    return res.status(200).json({
      success: true,
      message: 'Lấy danh sách lịch khởi hành thành công',
      count: departures.length,
      data: departures
    });
  } catch (error) {
    console.error('Error fetching departures:', error);
    return res.status(500).json({
      success: false,
      message: 'Không thể tải danh sách lịch khởi hành'
    });
  }
};

export const updateDeparture = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: errors.array()[0]?.msg || 'Dữ liệu lịch khởi hành không hợp lệ',
      errors: errors.array()
    });
  }

  try {
    const departure = await Departure.findById(req.params.id);
    if (!departure) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy lịch khởi hành'
      });
    }

    const isOwner = departure.providerId && departure.providerId.equals(req.user._id);
    if (!isOwner) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền cập nhật lịch khởi hành này'
      });
    }

    if (req.body.departureDate) {
      const newDate = new Date(req.body.departureDate);
      if (newDate.getTime() - Date.now() < LEAD_TIME_MS) {
        return res.status(400).json({
          success: false,
          message: 'Ngày khởi hành phải cách thời điểm hiện tại ít nhất 24 giờ'
        });
      }

      const startOfDay = new Date(newDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(startOfDay);
      endOfDay.setDate(endOfDay.getDate() + 1);

      const existing = await Departure.findOne({
        _id: { $ne: departure._id },
        tourId: departure.tourId,
        status: 'scheduled',
        departureDate: { $gte: startOfDay, $lt: endOfDay }
      });
      if (existing) {
        return res.status(409).json({
          success: false,
          message: 'Tour này đã có lịch khởi hành trong ngày đã chọn'
        });
      }

      departure.departureDate = newDate;
    }

    if (req.body.availableSeats !== undefined) {
      departure.availableSeats = Number(req.body.availableSeats);
    }

    if (req.body.price !== undefined) {
      const priceRaw = req.body.price;
      departure.price = (priceRaw === null || priceRaw === '' || isNaN(priceRaw)) ? null : Number(priceRaw);
    }

    if (req.body.note !== undefined) {
      departure.note = req.body.note ? req.body.note.trim() : '';
    }

    if (req.body.status !== undefined) {
      departure.status = req.body.status;
    }

    await departure.save();

    return res.status(200).json({
      success: true,
      message: 'Cập nhật lịch khởi hành thành công',
      data: departure
    });
  } catch (error) {
    console.error('Error updating departure:', error);
    return res.status(500).json({
      success: false,
      message: 'Không thể cập nhật lịch khởi hành'
    });
  }
};

/**
 * Xuất danh sách đoàn khách của một lịch khởi hành ra file Excel (.xlsx)
 * để hướng dẫn viên điểm danh. Chỉ lấy các đơn đã xác nhận trong đúng ngày khởi hành.
 * @route GET /api/departures/:id/manifest
 * @access Private (tourProvider)
 */
export const exportPassengerManifest = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: errors.array()[0]?.msg || 'Mã lịch khởi hành không hợp lệ',
      errors: errors.array()
    });
  }

  try {
    const departure = await Departure.findById(req.params.id);
    if (!departure) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy lịch khởi hành'
      });
    }

    const isOwner = departure.providerId && departure.providerId.equals(req.user._id);
    if (!isOwner) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền xuất danh sách đoàn của lịch khởi hành này'
      });
    }

    const tour = await Tour.findById(departure.tourId)
      .populate('categoryId', 'name')
      .select('title categoryId duration location departureLocation destinationLocation');

    const startOfDay = new Date(departure.departureDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);

    // Tính ngày về dự kiến dựa trên thời lượng tour (ví dụ: "3 ngày 2 đêm" -> +2 ngày)
    const durationMatch = tour?.duration?.match(/(\d+)\s*(?:ngày|day)/i);
    const durationDays = durationMatch ? parseInt(durationMatch[1], 10) : 1;
    const returnDate = new Date(startOfDay.getTime() + Math.max(0, durationDays - 1) * 24 * 60 * 60 * 1000);

    const departureDateText = startOfDay.toLocaleDateString('vi-VN');
    const returnDateText = returnDate.toLocaleDateString('vi-VN');

    // Lấy các đơn đặt chỗ hợp lệ tham gia chuyến khởi hành (confirmed, paid, checked_in, completed)
    const bookings = await Booking.find({
      tourId: departure.tourId,
      status: { $in: ['confirmed', 'paid', 'checked_in', 'completed'] },
      departureDate: { $gte: startOfDay, $lt: endOfDay }
    }).sort({ fullName: 1, createdAt: 1 });

    const totalPassengers = bookings.reduce((sum, b) => sum + (b.numberOfPeople || 0), 0);
    const totalRevenue = bookings.reduce((sum, b) => sum + (b.totalPrice || 0), 0);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'TripMate Platform';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet('Quản lý khách hàng du lịch', {
      views: [{ showGridLines: true }]
    });

    // 1. Cấu hình độ rộng các cột
    worksheet.columns = [
      { key: 'stt', width: 7 },
      { key: 'bookingCode', width: 16 },
      { key: 'fullName', width: 26 },
      { key: 'phone', width: 16 },
      { key: 'email', width: 28 },
      { key: 'tourCategory', width: 22 },
      { key: 'departureDate', width: 15 },
      { key: 'returnDate', width: 15 },
      { key: 'numberOfPeople', width: 15 },
      { key: 'totalPrice', width: 20 },
      { key: 'status', width: 20 },
      { key: 'healthNote', width: 38 }
    ];

    // 2. Brand Name / Logo
    worksheet.mergeCells('B2:E2');
    const brandCell = worksheet.getCell('B2');
    brandCell.value = 'TRIPMATE TRAVEL - SLIM CRM';
    brandCell.font = { name: 'Segoe UI', size: 13, bold: true, color: { argb: 'FFE65100' } };
    brandCell.alignment = { vertical: 'middle', horizontal: 'left' };

    // 3. Tiêu đề chính
    worksheet.mergeCells('A3:L3');
    const titleCell = worksheet.getCell('A3');
    titleCell.value = 'MẪU QUẢN LÝ KHÁCH HÀNG DU LỊCH BẰNG EXCEL';
    titleCell.font = { name: 'Segoe UI', size: 16, bold: true, color: { argb: 'FF1F4E79' } };
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
    worksheet.getRow(3).height = 30;

    // 4. Tiêu đề phụ / Mô tả mẫu
    worksheet.mergeCells('A4:L4');
    const subtitleCell = worksheet.getCell('A4');
    subtitleCell.value = 'Bảng ghi nhận đầy đủ thông tin của từng khách hàng tham gia tour: Tên, Số điện thoại, Email, Loại tour đăng ký, Ngày đi – Ngày về, Ghi chú sức khỏe...';
    subtitleCell.font = { name: 'Segoe UI', size: 10, italic: true, color: { argb: 'FF555555' } };
    subtitleCell.alignment = { vertical: 'middle', horizontal: 'center' };

    // 5. Khung tóm tắt thông tin chuyến đi (Rows 6 - 8)
    const infoBorder = {
      top: { style: 'thin', color: { argb: 'FFB0BEC5' } },
      left: { style: 'thin', color: { argb: 'FFB0BEC5' } },
      bottom: { style: 'thin', color: { argb: 'FFB0BEC5' } },
      right: { style: 'thin', color: { argb: 'FFB0BEC5' } }
    };
    const infoFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F4F8' } };

    worksheet.mergeCells('A6:F6');
    worksheet.getCell('A6').value = `Tour: ${tour?.title || 'Tour du lịch'}`;
    worksheet.getCell('A6').font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FF1A237E' } };

    worksheet.mergeCells('G6:L6');
    worksheet.getCell('G6').value = `Loại tour: ${tour?.categoryId?.name || 'Tour Du Lịch Trọn Gói'}`;
    worksheet.getCell('G6').font = { name: 'Segoe UI', size: 10, bold: true };

    worksheet.mergeCells('A7:F7');
    const route = tour?.departureLocation
      ? `${tour.departureLocation} → ${tour.destinationLocation || tour.location}`
      : (tour?.destinationLocation || tour?.location || 'Việt Nam');
    worksheet.getCell('A7').value = `Lộ trình: ${route}`;
    worksheet.getCell('A7').font = { name: 'Segoe UI', size: 10 };

    worksheet.mergeCells('G7:L7');
    worksheet.getCell('G7').value = `Thời gian: ${departureDateText} - ${returnDateText} (${tour?.duration || 'Theo lịch trình'})`;
    worksheet.getCell('G7').font = { name: 'Segoe UI', size: 10 };

    worksheet.mergeCells('A8:F8');
    const providerContact = req.user.phone ? ` (Hotline: ${req.user.phone})` : '';
    worksheet.getCell('A8').value = `Nhà cung cấp / HDV: ${req.user.username || 'TripMate Partner'}${providerContact}`;
    worksheet.getCell('A8').font = { name: 'Segoe UI', size: 10 };

    worksheet.mergeCells('G8:L8');
    worksheet.getCell('G8').value = `Tổng số khách: ${totalPassengers} khách (${bookings.length} đơn đặt chỗ)`;
    worksheet.getCell('G8').font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF2E7D32' } };

    for (let r = 6; r <= 8; r++) {
      const row = worksheet.getRow(r);
      row.height = 20;
      for (let c = 1; c <= 12; c++) {
        const cell = row.getCell(c);
        cell.fill = infoFill;
        cell.border = infoBorder;
      }
    }

    // 6. Header của bảng (Row 10)
    const headerRow = worksheet.getRow(10);
    headerRow.height = 28;
    const headers = [
      'STT',
      'Mã đơn',
      'Họ và tên khách hàng',
      'Số điện thoại',
      'Email',
      'Loại tour đăng ký',
      'Ngày đi',
      'Ngày về',
      'Số lượng vé',
      'Tổng tiền',
      'Trạng thái',
      'Ghi chú sức khỏe & Yêu cầu'
    ];

    headers.forEach((h, idx) => {
      const cell = headerRow.getCell(idx + 1);
      cell.value = h;
      cell.font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E79' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      cell.border = {
        top: { style: 'medium', color: { argb: 'FF0D3A63' } },
        left: { style: 'thin', color: { argb: 'FF336699' } },
        bottom: { style: 'medium', color: { argb: 'FF0D3A63' } },
        right: { style: 'thin', color: { argb: 'FF336699' } }
      };
    });

    worksheet.autoFilter = 'A10:L10';

    // 7. Render danh sách khách hàng
    const thinBorder = {
      top: { style: 'thin', color: { argb: 'FFE0E0E0' } },
      left: { style: 'thin', color: { argb: 'FFE0E0E0' } },
      bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } },
      right: { style: 'thin', color: { argb: 'FFE0E0E0' } }
    };

    const getStatusText = (status) => {
      switch (status) {
        case 'paid': return 'Đã thanh toán';
        case 'checked_in': return 'Đã điểm danh';
        case 'completed': return 'Đã hoàn thành';
        case 'confirmed': return 'Đã xác nhận';
        case 'pending': return 'Chờ xác nhận';
        default: return status || 'Đã xác nhận';
      }
    };

    bookings.forEach((booking, index) => {
      const rowIdx = 11 + index;
      const row = worksheet.getRow(rowIdx);
      row.height = 24;
      const isEven = index % 2 === 1;
      const rowFill = isEven ? { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9FAFB' } } : null;

      const bookingCode = `BK-${booking._id.toString().slice(-6).toUpperCase()}`;
      const statusText = getStatusText(booking.status);
      const noteText = booking.note || 'Bình thường, không có ghi chú đặc biệt';

      row.values = [
        index + 1,
        bookingCode,
        booking.fullName,
        booking.phone,
        booking.email,
        tour?.categoryId?.name || 'Tour Du Lịch Trọn Gói',
        departureDateText,
        returnDateText,
        booking.numberOfPeople,
        booking.totalPrice || 0,
        statusText,
        noteText
      ];

      for (let c = 1; c <= 12; c++) {
        const cell = row.getCell(c);
        cell.font = { name: 'Segoe UI', size: 10 };
        cell.border = thinBorder;
        if (rowFill) cell.fill = rowFill;

        if ([1, 2, 4, 6, 7, 8, 9, 11].includes(c)) {
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
        } else if (c === 10) {
          cell.alignment = { vertical: 'middle', horizontal: 'right' };
          cell.numFmt = '#,##0 "đ"';
        } else {
          cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: c === 12 };
        }
      }

      // Tô màu nhấn mạnh trạng thái
      const statusCell = row.getCell(11);
      if (booking.status === 'checked_in') {
        statusCell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF15803D' } };
      } else if (booking.status === 'paid') {
        statusCell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF1D4ED8' } };
      } else if (booking.status === 'completed') {
        statusCell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF475569' } };
      }
    });

    // 8. Dòng tổng cộng (Summary Row)
    const totalRowIdx = 11 + Math.max(bookings.length, 1);
    const totalRow = worksheet.getRow(totalRowIdx);
    totalRow.height = 26;

    worksheet.mergeCells(`A${totalRowIdx}:H${totalRowIdx}`);
    const labelCell = totalRow.getCell(1);
    labelCell.value = 'TỔNG CỘNG / TOTAL';
    labelCell.font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FF1F4E79' } };
    labelCell.alignment = { vertical: 'middle', horizontal: 'right' };

    const totalPaxCell = totalRow.getCell(9);
    totalPaxCell.value = totalPassengers;
    totalPaxCell.font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FF1F4E79' } };
    totalPaxCell.alignment = { vertical: 'middle', horizontal: 'center' };

    const totalRevCell = totalRow.getCell(10);
    totalRevCell.value = totalRevenue;
    totalRevCell.font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FFB91C1C' } };
    totalRevCell.alignment = { vertical: 'middle', horizontal: 'right' };
    totalRevCell.numFmt = '#,##0 "đ"';

    worksheet.mergeCells(`K${totalRowIdx}:L${totalRowIdx}`);
    const summaryCountCell = totalRow.getCell(11);
    summaryCountCell.value = `${bookings.length} đơn đặt chỗ`;
    summaryCountCell.font = { name: 'Segoe UI', size: 10, italic: true };
    summaryCountCell.alignment = { vertical: 'middle', horizontal: 'center' };

    for (let c = 1; c <= 12; c++) {
      const cell = totalRow.getCell(c);
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF64748B' } },
        bottom: { style: 'double', color: { argb: 'FF1F4E79' } },
        left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
      };
    }

    // 9. Ghi chú thời gian & Phần ký tên
    const footerRowIdx = totalRowIdx + 2;
    worksheet.getCell(`A${footerRowIdx}`).value = `* Bảng danh sách hành khách được xuất tự động từ hệ thống TripMate vào lúc: ${new Date().toLocaleString('vi-VN')}`;
    worksheet.getCell(`A${footerRowIdx}`).font = { name: 'Segoe UI', size: 9, italic: true, color: { argb: 'FF64748B' } };

    const sigRowIdx = footerRowIdx + 2;
    worksheet.mergeCells(`B${sigRowIdx}:E${sigRowIdx}`);
    worksheet.getCell(`B${sigRowIdx}`).value = 'NGƯỜI LẬP BẢNG';
    worksheet.getCell(`B${sigRowIdx}`).font = { name: 'Segoe UI', size: 10, bold: true };
    worksheet.getCell(`B${sigRowIdx}`).alignment = { horizontal: 'center' };

    worksheet.mergeCells(`H${sigRowIdx}:L${sigRowIdx}`);
    worksheet.getCell(`H${sigRowIdx}`).value = 'ĐẠI DIỆN ĐƠN VỊ TỔ CHỨC / HƯỚNG DẪN VIÊN';
    worksheet.getCell(`H${sigRowIdx}`).font = { name: 'Segoe UI', size: 10, bold: true };
    worksheet.getCell(`H${sigRowIdx}`).alignment = { horizontal: 'center' };

    worksheet.mergeCells(`B${sigRowIdx + 1}:E${sigRowIdx + 1}`);
    worksheet.getCell(`B${sigRowIdx + 1}`).value = '(Ký và ghi rõ họ tên)';
    worksheet.getCell(`B${sigRowIdx + 1}`).font = { name: 'Segoe UI', size: 9, italic: true, color: { argb: 'FF888888' } };
    worksheet.getCell(`B${sigRowIdx + 1}`).alignment = { horizontal: 'center' };

    worksheet.mergeCells(`H${sigRowIdx + 1}:L${sigRowIdx + 1}`);
    worksheet.getCell(`H${sigRowIdx + 1}`).value = '(Ký, đóng dấu hoặc xác nhận)';
    worksheet.getCell(`H${sigRowIdx + 1}`).font = { name: 'Segoe UI', size: 9, italic: true, color: { argb: 'FF888888' } };
    worksheet.getCell(`H${sigRowIdx + 1}`).alignment = { horizontal: 'center' };

    const fileDate = startOfDay.toISOString().slice(0, 10);
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="quan-ly-khach-hang-tour-${fileDate}.xlsx"`
    });

    await workbook.xlsx.write(res);
    return res.end();
  } catch (error) {
    console.error('Error exporting passenger manifest:', error);
    return res.status(500).json({
      success: false,
      message: 'Không thể xuất danh sách đoàn khách'
    });
  }
};

// START UC-43 Cancel Tour Departure
/**
 * Hủy đợt khởi hành (Tour Departure) và xử lý hoàn tiền 100% tự động cho khách (BR-54).
 * Nghiệp vụ & Ràng buộc:
 *  - Quyền hạn: Chỉ provider sở hữu tour mới được hủy.
 *  - Trạng thái: Lịch khởi hành không được ở trạng thái 'cancelled' từ trước.
 *  - Không được hủy lịch khởi hành đã diễn ra trong quá khứ.
 *  - SLA (BR-54): Chỉ được phép hủy trước thời điểm khởi hành ít nhất 72 giờ (72h).
 *  - Cascade: Tự động chuyển toàn bộ đơn đặt tour liên quan sang trạng thái 'cancelled',
 *    ghi nhận lý do hủy và gửi thông báo hoàn tiền 100% tới các khách hàng bị ảnh hưởng.
 * @route PATCH /api/departures/:id/cancel
 * @access Private (tourProvider)
 */
const CANCELLATION_DEADLINE_MS = 72 * 60 * 60 * 1000;

export const cancelDeparture = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: errors.array()[0]?.msg || 'Dữ liệu hủy lịch khởi hành không hợp lệ',
      errors: errors.array()
    });
  }

  try {
    const departure = await Departure.findById(req.params.id);
    if (!departure) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy lịch khởi hành'
      });
    }

    const isOwner = departure.providerId && departure.providerId.equals(req.user._id);
    if (!isOwner) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền hủy lịch khởi hành này'
      });
    }

    if (departure.status === 'cancelled') {
      return res.status(409).json({
        success: false,
        message: 'Lịch khởi hành này đã bị hủy trước đó'
      });
    }

    const now = Date.now();
    const departureTime = new Date(departure.departureDate).getTime();

    if (departureTime < now) {
      return res.status(400).json({
        success: false,
        message: 'Không thể hủy lịch khởi hành đã diễn ra trong quá khứ'
      });
    }

    const diffMs = departureTime - now;
    if (diffMs < CANCELLATION_DEADLINE_MS) {
      const hoursRemaining = Math.max(0, Math.floor(diffMs / (60 * 60 * 1000)));
      return res.status(409).json({
        success: false,
        message: 'Theo quy định của hệ thống, chỉ có thể hủy lịch khởi hành trước ít nhất 72 giờ. Vui lòng liên hệ ban quản trị để được hỗ trợ.',
        hoursRemaining
      });
    }

    const reason = req.body.reason ? req.body.reason.trim() : '';
    departure.status = 'cancelled';
    departure.cancelReason = reason || 'Nhà cung cấp hủy đợt khởi hành';
    departure.cancelledAt = new Date();
    await departure.save();

    const tour = await Tour.findById(departure.tourId).select('title');

    const startOfDay = new Date(departure.departureDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);

    const activeBookings = await Booking.find({
      tourId: departure.tourId,
      status: { $in: ['pending', 'confirmed', 'paid'] },
      departureDate: { $gte: startOfDay, $lt: endOfDay }
    });

    const departureDateText = startOfDay.toLocaleDateString('vi-VN');
    const bookingCancelReason = reason
      ? `Đợt khởi hành bị hủy bởi nhà cung cấp. Lý do: ${reason} (Được hoàn tiền 100%)`
      : 'Đợt khởi hành bị hủy bởi nhà cung cấp (Được hoàn tiền 100%)';

    for (const booking of activeBookings) {
      booking.status = 'cancelled';
      booking.cancelReason = bookingCancelReason;
      booking.cancelledAt = new Date();
      await booking.save();

      try {
        await Notification.create({
          recipient: booking.customerId,
          title: 'Thông báo hủy đợt khởi hành tour',
          message: `Đợt khởi hành ngày ${departureDateText} của tour "${tour?.title || 'Tour'}" đã bị hủy. Đơn đặt tour của bạn đã được hủy và bạn đủ điều kiện nhận hoàn lại 100% chi phí.${reason ? ` Lý do: ${reason}` : ''}`,
          notificationType: 'departure_cancellation',
          sender: req.user._id,
          status: 'sent',
          isRead: false
        });
      } catch (notifErr) {
        console.error('Lỗi khi tạo thông báo cho khách hàng khi hủy lịch khởi hành:', notifErr);
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Hủy lịch khởi hành thành công. Toàn bộ đơn đặt liên quan đã được hủy và khách hàng đã được thông báo hoàn tiền 100%.',
      data: {
        departure,
        affectedBookingsCount: activeBookings.length
      }
    });
  } catch (error) {
    console.error('Error cancelling departure:', error);
    return res.status(500).json({
      success: false,
      message: 'Không thể hủy lịch khởi hành'
    });
  }
};
// END UC-43 Cancel Tour Departure
