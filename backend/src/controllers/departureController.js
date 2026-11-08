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

    const tour = await Tour.findById(departure.tourId).select('title');

    const startOfDay = new Date(departure.departureDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);

    const bookings = await Booking.find({
      tourId: departure.tourId,
      status: 'confirmed',
      departureDate: { $gte: startOfDay, $lt: endOfDay }
    }).sort({ fullName: 1 });

    const totalPassengers = bookings.reduce((sum, booking) => sum + booking.numberOfPeople, 0);
    const departureDateText = startOfDay.toLocaleDateString('vi-VN');

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Danh sách đoàn');

    worksheet.addRow(['Tour:', tour?.title || '']);
    worksheet.addRow(['Ngày khởi hành:', departureDateText]);
    worksheet.addRow([]);
    worksheet.addRow(['STT', 'Họ tên', 'Số điện thoại', 'Email', 'Số vé', 'Ghi chú']);

    bookings.forEach((booking, index) => {
      worksheet.addRow([
        index + 1,
        booking.fullName,
        booking.phone,
        booking.email,
        booking.numberOfPeople,
        booking.note || ''
      ]);
    });

    worksheet.addRow([]);
    worksheet.addRow(['Tổng số khách:', totalPassengers]);

    const fileDate = startOfDay.toISOString().slice(0, 10);
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="danh-sach-doan-${fileDate}.xlsx"`
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
