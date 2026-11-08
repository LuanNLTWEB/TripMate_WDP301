/**
 * Booking (Đặt tour) — các use case do Toan phụ trách
 *  - UC-74 Cancel Booking: cancelBooking (BR-88 khung hủy 48 giờ, BR-91 chỉ hủy đơn
 *    của chính mình, BR-57 trả lại số chỗ trống ngay trong cùng thao tác).
 */
import Booking from '../models/Booking.js';
import Tour from '../models/Tour.js';
import User from '../models/User.js';
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

    const customer = await User.findById(req.user._id).select('isBookingRestricted noShowCount');
    if (customer?.isBookingRestricted) {
      return res.status(403).json({
        success: false,
        message: 'Tài khoản của bạn tạm thời bị hạn chế đặt chỗ do ghi nhận vi phạm vắng mặt nhiều lần. Vui lòng liên hệ bộ phận hỗ trợ hoặc gửi khiếu nại giải trình để được mở lại.'
      });
    }

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

    if (status && ['pending', 'confirmed', 'cancelled', 'rejected', 'no_show'].includes(status)) {
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

// Provider duyệt request đặt tour do chính mình sở hữu: pending -> confirmed.
// Chỉ tourProvider sở hữu tour mới được duyệt; trừ chỗ trống của tour ngay khi duyệt
// (BR-57: sức chứa đồng bộ với danh sách đơn), chỗ được cộng lại khi hủy booking đã duyệt.
export const confirmProviderBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy đơn đặt tour'
      });
    }

    const tour = await Tour.findById(booking.tourId);
    if (!tour) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy tour của đơn đặt này'
      });
    }

    if (!tour.providerId || tour.providerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền xác nhận đơn đặt tour này'
      });
    }

    if (booking.status === 'confirmed') {
      return res.status(409).json({
        success: false,
        message: 'Đơn đặt tour này đã được xác nhận trước đó'
      });
    }

    if (booking.status === 'cancelled') {
      return res.status(409).json({
        success: false,
        message: 'Đơn đặt tour này đã bị hủy, không thể xác nhận'
      });
    }

    if (booking.status !== 'pending') {
      return res.status(409).json({
        success: false,
        message: 'Chỉ đơn đặt tour đang chờ xử lý mới được xác nhận'
      });
    }

    if (tour.availableSeats < booking.numberOfPeople) {
      return res.status(400).json({
        success: false,
        message: `Tour chỉ còn ${tour.availableSeats} chỗ trống, không đủ cho ${booking.numberOfPeople} người`
      });
    }

    booking.status = 'confirmed';
    booking.respondedAt = new Date();
    booking.respondedBy = req.user._id;
    await booking.save({ validateBeforeSave: false });

    await Tour.updateOne(
      { _id: tour._id },
      { $set: { availableSeats: Math.max(0, tour.availableSeats - booking.numberOfPeople) } }
    );

    const populated = await Booking.findById(booking._id)
      .populate('tourId', 'title location duration price images departureLocation destinationLocation')
      .populate('customerId', 'username email phone');

    return res.status(200).json({
      success: true,
      message: 'Đã xác nhận đặt tour thành công',
      data: populated
    });
  } catch (error) {
    console.error('Error confirming booking:', error);
    return res.status(500).json({
      success: false,
      message: error?.message || 'Không thể xác nhận đặt tour'
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
    await booking.save({ validateBeforeSave: false });

    // BR-57 - trả lại chỗ trống trong cùng thao tác đánh dấu hủy, để số chỗ
    // của tour không bao giờ lệch với danh sách đơn đặt
    await Tour.updateOne(
      { _id: booking.tourId },
      { $inc: { availableSeats: booking.numberOfPeople } }
    );

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


// START UC-78 Respond to Booking (Provider)
/**
 * UC-78 - Respond to Booking (Provider duyệt hoặc từ chối đặt tour).
 * action: 'confirm' | 'reject'
 * rejectionReason: required when action === 'reject'
 */
export const respondProviderBooking = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: errors.array()[0]?.msg || 'Dữ liệu phản hồi đặt tour không hợp lệ',
      errors: errors.array()
    });
  }

  try {
    const { action, rejectionReason } = req.body;
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đơn đặt tour' });
    }

    const tour = await Tour.findById(booking.tourId);
    if (!tour) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy tour của đơn đặt này' });
    }

    if (!tour.providerId || tour.providerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Bạn không có quyền phản hồi đơn đặt tour này' });
    }

    if (booking.status !== 'pending') {
      return res.status(409).json({
        success: false,
        message: `Đơn đặt tour hiện ở trạng thái "${booking.status}", chỉ đơn đang chờ xử lý (pending) mới được phản hồi`
      });
    }

    if (action === 'confirm') {
      if (tour.availableSeats < booking.numberOfPeople) {
        return res.status(400).json({
          success: false,
          message: `Tour chỉ còn ${tour.availableSeats} chỗ trống, không đủ cho ${booking.numberOfPeople} người`
        });
      }

      booking.status = 'confirmed';
      booking.respondedAt = new Date();
      booking.respondedBy = req.user._id;
      await booking.save({ validateBeforeSave: false });

      await Tour.updateOne(
        { _id: tour._id },
        { $set: { availableSeats: Math.max(0, tour.availableSeats - booking.numberOfPeople) } }
      );

      const populated = await Booking.findById(booking._id)
        .populate('tourId', 'title location duration price images departureLocation destinationLocation')
        .populate('customerId', 'username email phone');

      return res.status(200).json({
        success: true,
        message: 'Đã xác nhận giữ chỗ thành công cho khách hàng',
        data: populated
      });
    }

    if (action === 'reject') {
      booking.status = 'rejected';
      booking.rejectionReason = String(rejectionReason || '').trim();
      booking.respondedAt = new Date();
      booking.respondedBy = req.user._id;
      await booking.save({ validateBeforeSave: false });

      const populated = await Booking.findById(booking._id)
        .populate('tourId', 'title location duration price images departureLocation destinationLocation')
        .populate('customerId', 'username email phone');

      return res.status(200).json({
        success: true,
        message: 'Đã từ chối đơn đặt tour thành công',
        data: populated
      });
    }

    return res.status(400).json({ success: false, message: 'Hành động phản hồi không hợp lệ' });
  } catch (error) {
    console.error('Error responding to booking:', error);
    return res.status(500).json({ success: false, message: error?.message || 'Không thể phản hồi yêu cầu đặt tour' });
  }
};
// END UC-78 Respond to Booking (Provider)

// START UC-82 Download Booking Voucher (Customer)
/**
 * UC-82 - Download Booking Voucher (Xuất phiếu xác nhận đặt chỗ kèm mã QR).
 * Chỉ khả dụng cho khách hàng sở hữu đơn và đơn đã được xác nhận (status === 'confirmed').
 */
export const getBookingVoucher = async (req, res) => {
  try {
    const booking = await Booking.findOne({
      _id: req.params.id,
      customerId: req.user._id
    }).populate({
      path: 'tourId',
      select: 'title location duration price images departureLocation destinationLocation providerId includedServices excludedServices',
      populate: {
        path: 'providerId',
        select: 'username email phone'
      }
    });

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đơn đặt tour' });
    }

    if (booking.status !== 'confirmed') {
      return res.status(400).json({
        success: false,
        message: 'Phiếu xác nhận chỉ khả dụng cho đơn đặt tour đã được xác nhận (Confirmed)'
      });
    }

    const shortCode = `BK-${String(booking._id).slice(-6).toUpperCase()}`;
    const qrData = JSON.stringify({
      bookingId: String(booking._id),
      code: shortCode,
      customer: booking.fullName,
      phone: booking.phone,
      tour: booking.tourId?.title || '',
      departureDate: booking.departureDate,
      guests: booking.numberOfPeople,
      totalPrice: booking.totalPrice,
      status: booking.status,
      issuedAt: new Date().toISOString()
    });

    return res.status(200).json({
      success: true,
      data: {
        booking,
        shortCode,
        qrData,
        issuedAt: new Date()
      }
    });
  } catch (error) {
    console.error('Error getting booking voucher:', error);
    return res.status(500).json({ success: false, message: 'Không thể tạo phiếu xác nhận đặt tour' });
  }
};
// END UC-82 Download Booking Voucher (Customer)

// START UC-86 Mark Booking as No-Show (Provider)
/**
 * UC-86 - Mark Booking as No-Show (Đánh dấu khách vắng mặt không báo trước).
 * - Provider sở hữu tour.
 * - Đơn đang ở trạng thái confirmed.
 * - Ngày khởi hành là hôm nay hoặc trong quá khứ.
 * - Tăng noShowCount của khách hàng, nếu >= 2 tự động đặt isBookingRestricted = true.
 */
export const markBookingAsNoShow = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: errors.array()[0]?.msg || 'Dữ liệu không hợp lệ',
      errors: errors.array()
    });
  }

  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đơn đặt tour' });
    }

    const tour = await Tour.findById(booking.tourId);
    if (!tour || !tour.providerId || tour.providerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Bạn không có quyền quản lý đơn đặt tour này' });
    }

    if (booking.status !== 'confirmed') {
      return res.status(409).json({
        success: false,
        message: 'Chỉ đơn đặt tour đã xác nhận mới có thể ghi nhận vắng mặt'
      });
    }

    const depDate = new Date(booking.departureDate);
    depDate.setHours(23, 59, 59, 999);
    if (new Date() < new Date(booking.departureDate).setHours(0, 0, 0, 0)) {
      return res.status(400).json({
        success: false,
        message: 'Chỉ có thể ghi nhận vắng mặt từ ngày khởi hành trở đi'
      });
    }

    const reason = req.body.noShowReason
      ? String(req.body.noShowReason).trim()
      : 'Khách hàng không có mặt vào ngày khởi hành và không báo hủy trước.';

    booking.status = 'no_show';
    booking.noShowReason = reason;
    booking.noShowMarkedAt = new Date();
    booking.noShowMarkedBy = req.user._id;
    await booking.save({ validateBeforeSave: false });

    let isCustomerRestricted = false;
    let customerNoShowCount = 1;
    const customer = await User.findById(booking.customerId);
    if (customer) {
      customer.noShowCount = (customer.noShowCount || 0) + 1;
      customerNoShowCount = customer.noShowCount;
      if (customer.noShowCount >= 2) {
        customer.isBookingRestricted = true;
        customer.bookingRestrictedAt = new Date();
        isCustomerRestricted = true;
      }
      await customer.save({ validateBeforeSave: false });
    }

    const populated = await Booking.findById(booking._id)
      .populate('tourId', 'title location duration price images departureLocation destinationLocation')
      .populate('customerId', 'username email phone');

    return res.status(200).json({
      success: true,
      message: `Đã ghi nhận khách vắng mặt cho đơn đặt tour thành công.${isCustomerRestricted ? ' Tài khoản khách đã đạt ngưỡng vi phạm (2 lần) và bị tạm hạn chế đặt chỗ.' : ''}`,
      data: populated,
      customerNoShowCount,
      isCustomerRestricted
    });
  } catch (error) {
    console.error('Error marking booking as no-show:', error);
    return res.status(500).json({ success: false, message: error?.message || 'Không thể ghi nhận vắng mặt cho đơn đặt tour' });
  }
};
// END UC-86 Mark Booking as No-Show (Provider)

// START STT 156 / UC-156 Reset No-Show Count (Staff)
/**
 * STT 156: Reset No-Show Count (Staff)
 * Nhân viên Staff / Quản trị viên Admin gỡ bỏ điểm phạt vắng mặt (noShowCount)
 * và mở lại quyền đặt tour (isBookingRestricted = false) cho khách hàng khi
 * khách hàng khiếu nại no-show oan hoặc có giải trình hợp lệ.
 */
export const resetNoShowCount = async (req, res) => {
  try {
    const { userId } = req.params;
    const { reason = '' } = req.body;

    const customer = await User.findById(userId);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
    }

    const previousNoShowCount = customer.noShowCount || 0;
    const wasRestricted = Boolean(customer.isBookingRestricted);

    customer.noShowCount = 0;
    customer.isBookingRestricted = false;
    customer.bookingRestrictedAt = null;
    await customer.save({ validateBeforeSave: false });

    return res.status(200).json({
      success: true,
      message: 'Đã đặt lại số lần vắng mặt của khách hàng về 0 và khôi phục quyền đặt tour thành công.',
      data: {
        userId: customer._id,
        username: customer.username,
        email: customer.email,
        previousNoShowCount,
        currentNoShowCount: 0,
        wasRestricted,
        isBookingRestricted: false,
        reason: reason.trim() || 'Nhân viên hỗ trợ xem xét và gỡ vi phạm'
      }
    });
  } catch (error) {
    console.error('Error resetting no-show count:', error);
    return res.status(500).json({ success: false, message: error?.message || 'Không thể đặt lại số lần vắng mặt' });
  }
};
// END STT 156 / UC-156 Reset No-Show Count (Staff)
