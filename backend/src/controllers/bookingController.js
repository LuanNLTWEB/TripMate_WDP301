/**
 * Booking (Đặt tour) — các use case do Toan phụ trách
 *  - UC-74 Cancel Booking: cancelBooking (BR-88 khung hủy 48 giờ, BR-91 chỉ hủy đơn
 *    của chính mình, BR-57 trả lại số chỗ trống ngay trong cùng thao tác).
 */
import Booking from '../models/Booking.js';
import Tour from '../models/Tour.js';
import { validationResult } from 'express-validator';

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const escapeCsvValue = (value) => {
  const text = value === null || value === undefined ? '' : String(value);
  return `"${text.replace(/"/g, '""')}"`;
};

const formatCsvDate = (value) => (value ? new Date(value).toISOString() : '');

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

    const tour = await Tour.findOne({ _id: tourId, status: 'active', isDeleted: { $ne: true } });
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
    const { status } = req.query;
    const filter = { customerId: req.user._id };

    if (status && ['pending', 'confirmed', 'cancelled'].includes(status)) {
      filter.status = status;
    }

    const bookings = await Booking.find(filter)
      .populate({
        path: 'tourId',
        select: 'title location duration price images departureLocation destinationLocation providerId',
        populate: {
          path: 'providerId',
          select: 'username email phone'
        }
      })
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

// Provider chỉ được xem booking của các tour do chính mình sở hữu.
export const getProviderBookingRequests = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: errors.array()[0]?.msg || 'Bộ lọc booking không hợp lệ',
      errors: errors.array()
    });
  }

  try {
    const {
      search = '',
      status = 'all',
      page = 1,
      limit = 10
    } = req.query;
    const pageNumber = Math.max(Number(page) || 1, 1);
    const pageSize = Math.min(Math.max(Number(limit) || 10, 1), 50);

    const providerTours = await Tour.find({ providerId: req.user._id })
      .select('_id title departureLocation destinationLocation location')
      .lean();
    const providerTourIds = providerTours.map((tour) => tour._id);

    if (providerTourIds.length === 0) {
      return res.status(200).json({
        success: true,
        count: 0,
        total: 0,
        totalPages: 0,
        currentPage: 1,
        data: [],
        summary: {
          total: 0,
          pending: 0,
          confirmed: 0,
          cancelled: 0,
          confirmedRevenue: 0,
          totalGuests: 0
        }
      });
    }

    const bookingQuery = { tourId: { $in: providerTourIds } };
    if (status !== 'all') {
      bookingQuery.status = status;
    }

    const normalizedSearch = String(search).trim();
    if (normalizedSearch) {
      const searchRegex = new RegExp(escapeRegex(normalizedSearch), 'i');
      const matchedTourIds = providerTours
        .filter((tour) => [
          tour.title,
          tour.departureLocation,
          tour.destinationLocation,
          tour.location
        ].some((value) => value && searchRegex.test(value)))
        .map((tour) => tour._id);

      bookingQuery.$or = [
        { fullName: searchRegex },
        { email: searchRegex },
        { phone: searchRegex },
        ...(matchedTourIds.length > 0 ? [{ tourId: { $in: matchedTourIds } }] : [])
      ];
    }

    const summaryMatch = { tourId: { $in: providerTourIds } };
    const [total, groupedSummary] = await Promise.all([
      Booking.countDocuments(bookingQuery),
      Booking.aggregate([
        { $match: summaryMatch },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            guests: { $sum: '$numberOfPeople' },
            totalAmount: { $sum: '$totalPrice' }
          }
        }
      ])
    ]);
    const totalPages = Math.ceil(total / pageSize);
    const currentPage = totalPages > 0 ? Math.min(pageNumber, totalPages) : 1;
    const bookings = await Booking.find(bookingQuery)
      .populate('tourId', 'title location duration price images departureLocation destinationLocation')
      .populate('customerId', 'username email phone')
      .sort({ createdAt: -1 })
      .skip((currentPage - 1) * pageSize)
      .limit(pageSize);

    const summary = groupedSummary.reduce((result, item) => {
      result[item._id] = item.count;
      result.total += item.count;
      result.totalGuests += item.guests;
      if (item._id === 'confirmed') {
        result.confirmedRevenue = item.totalAmount;
      }
      return result;
    }, {
      total: 0,
      pending: 0,
      confirmed: 0,
      cancelled: 0,
      confirmedRevenue: 0,
      totalGuests: 0
    });

    return res.status(200).json({
      success: true,
      count: bookings.length,
      total,
      totalPages,
      currentPage,
      data: bookings,
      summary
    });
  } catch (error) {
    console.error('Error fetching provider booking requests:', error);
    return res.status(500).json({
      success: false,
      message: 'Không thể tải yêu cầu đặt tour'
    });
  }
};

// START UC-123 Export Provider Booking Report
/**
 * UC-123 - Export Provider Booking Report.
 *
 * Exports all bookings for the authenticated provider's tours. Date filters use
 * booking creation time so the report describes orders received in the period.
 */
export const exportProviderBookingReport = async (req, res) => {
  const { from, to } = req.query;
  const query = {};

  if (from && !/^\d{4}-\d{2}-\d{2}$/.test(from)) {
    return res.status(400).json({ success: false, message: 'Ngày bắt đầu không hợp lệ' });
  }
  if (to && !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
    return res.status(400).json({ success: false, message: 'Ngày kết thúc không hợp lệ' });
  }
  if (from && to && from > to) {
    return res.status(400).json({ success: false, message: 'Ngày bắt đầu phải trước ngày kết thúc' });
  }

  if (from || to) {
    query.createdAt = {};
    if (from) query.createdAt.$gte = new Date(`${from}T00:00:00.000Z`);
    if (to) query.createdAt.$lt = new Date(`${to}T00:00:00.000Z`);
    if (to) query.createdAt.$lt.setUTCDate(query.createdAt.$lt.getUTCDate() + 1);
  }

  try {
    const providerTours = await Tour.find({ providerId: req.user._id })
      .select('_id')
      .lean();
    query.tourId = { $in: providerTours.map((tour) => tour._id) };

    const bookings = await Booking.find(query)
      .populate('tourId', 'title departureLocation destinationLocation')
      .sort({ createdAt: -1 })
      .lean();

    const header = [
      'Booking ID', 'Tour', 'Customer', 'Phone', 'Email', 'Departure Date',
      'Guests', 'Total Price', 'Status', 'Created At', 'Note'
    ];
    const rows = bookings.map((booking) => [
      booking._id,
      booking.tourId?.title || 'Tour không còn khả dụng',
      booking.fullName,
      booking.phone,
      booking.email,
      formatCsvDate(booking.departureDate),
      booking.numberOfPeople,
      booking.totalPrice,
      booking.status,
      formatCsvDate(booking.createdAt),
      booking.note
    ]);
    const csv = `\uFEFF${[header, ...rows]
      .map((row) => row.map(escapeCsvValue).join(','))
      .join('\r\n')}\r\n`;

    res.set({
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="tripmate-provider-booking-report.csv"'
    });
    return res.send(csv);
  } catch (error) {
    console.error('Error exporting provider booking report:', error);
    return res.status(500).json({
      success: false,
      message: 'Không thể xuất báo cáo đặt tour'
    });
  }
};
// END UC-123 Export Provider Booking Report

// Lấy thông tin chi tiết một đơn đặt tour cụ thể của customer (chỉ view của chính mình)
export const getBookingById = async (req, res) => {
  try {
    const booking = await Booking.findOne({
      _id: req.params.id,
      customerId: req.user._id
    }).populate({
      path: 'tourId',
      select: 'title location duration price images departureLocation destinationLocation providerId description includedServices excludedServices',
      populate: {
        path: 'providerId',
        select: 'username email phone'
      }
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy đơn đặt tour'
      });
    }

    res.status(200).json({
      success: true,
      data: booking
    });
} catch (error) {
      console.error('Error fetching booking detail:', error);
      res.status(500).json({
        success: false,
        message: 'Không thể tải thông tin chi tiết đơn đặt tour'
      });
    }
  };

// BR-88 - khung thời gian miễn phí: chỉ được tự hủy khi còn tối thiểu 48 giờ
// trước ngày khởi hành. Không tính hoàn tiền ở đây vì hệ thống chưa có module
// thanh toán; thao tác này chỉ trả lại chỗ trống và ghi nhận lý do.
const FREE_CANCEL_WINDOW_MS = 48 * 60 * 60 * 1000;

// START UC-74 Cancel Booking
/**
 * UC-74 – Cancel Booking (khách hàng tự hủy đơn đặt tour của mình).
 *
 * Luồng: kiểm tra dữ liệu đầu vào -> tìm booking -> chặn hủy đơn của người khác
 * -> chặn hủy lần hai -> kiểm tra còn đủ 48 giờ trước ngày khởi hành -> đánh dấu
 * cancelled, lưu lý do/thời điểm hủy -> trả lại số chỗ cho tour.
 *
 * Phần phức tạp:
 *  - FREE_CANCEL_WINDOW_MS (BR-88): so sánh hiệu số giữa departureDate và hiện tại
 *    theo mili-giây thay vì theo ngày, để mốc 48 giờ chính xác đến giờ/phút.
 *  - Trả lại chỗ (BR-57): cộng numberOfPeople vào availableSeats của tour ngay sau
 *    khi lưu booking, nhờ vậy sức chứa của tour không bị lệch với danh sách đơn.
 *  - Không tính hoàn tiền ở đây: hệ thống chưa có module thanh toán tách riêng,
 *    totalPrice chỉ được đọc lại từ booking để đối soát sau này.
 */
export const cancelBooking = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: errors.array()[0]?.msg || 'Dữ liệu hủy đặt tour không hợp lệ',
      errors: errors.array()
    });
  }

  try {
    const { id } = req.params;
    const { reason } = req.body;

    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy đơn đặt tour'
      });
    }

    // BR-91 - khách chỉ được hủy đơn của chính mình
    if (booking.customerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền hủy đơn đặt tour này'
      });
    }

    if (booking.status === 'cancelled') {
      return res.status(409).json({
        success: false,
        message: 'Đơn đặt tour này đã được hủy trước đó'
      });
    }

    const hoursToDeparture =
      (new Date(booking.departureDate).getTime() - Date.now()) / (60 * 60 * 1000);

    if (hoursToDeparture * 60 * 60 * 1000 < FREE_CANCEL_WINDOW_MS) {
      return res.status(409).json({
        success: false,
        message: 'Chỉ có thể tự hủy khi còn ít nhất 48 giờ trước ngày khởi hành. Vui lòng liên hệ nhà cung cấp để được hỗ trợ.',
        hoursToDeparture: Math.max(0, Math.floor(hoursToDeparture))
      });
    }

    booking.status = 'cancelled';
    booking.cancelReason = reason.trim();
    booking.cancelledAt = new Date();
    await booking.save();

    // BR-57 - trả lại chỗ trống trong cùng thao tác đánh dấu hủy, để số chỗ
    // của tour không bao giờ lệch với danh sách đơn đặt
    const tour = await Tour.findById(booking.tourId);
    if (tour) {
      tour.availableSeats = tour.availableSeats + booking.numberOfPeople;
      await tour.save();
    }

    const populated = await Booking.findById(id)
      .populate('tourId', 'title location duration price images departureLocation destinationLocation');

    res.status(200).json({
      success: true,
      message: 'Hủy đặt tour thành công',
      data: populated,
      releasedSeats: booking.numberOfPeople
    });
  } catch (error) {
    console.error('Error cancelling booking:', error);
    res.status(500).json({
      success: false,
      message: 'Không thể hủy đặt tour'
    });
  }
};
// END UC-74 Cancel Booking
