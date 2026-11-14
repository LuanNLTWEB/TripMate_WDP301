import mongoose from 'mongoose';
import Booking from '../models/Booking.js';
import Tour from '../models/Tour.js';
import User from '../models/User.js';
import Departure from '../models/Departure.js';
import Notification from '../models/Notification.js';
import { validationResult } from 'express-validator';
import ExcelJS from 'exceljs';

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// Giới hạn tốc độ đặt tour trong bộ nhớ (tối đa 5 lần/phút mỗi người dùng)
const _bookingRateLimitStore = new Map();
const checkBookingRateLimit = (req, res) => {
  const key = req.user?._id?.toString() || req.ip || 'unknown';
  const now = Date.now();
  const windowMs = 60 * 1000;
  const max = 5;

  let data = _bookingRateLimitStore.get(key);
  if (!data || now - data.windowStart > windowMs) {
    data = { windowStart: now, count: 0 };
    _bookingRateLimitStore.set(key, data);
  }

  data.count++;
  if (data.count > max) {
    res.status(429).json({
      success: false,
      message: 'Quá nhiều yêu cầu đặt tour. Vui lòng thử lại sau 1 phút.',
      retryAfter: Math.ceil((windowMs - (now - data.windowStart)) / 1000)
    });
    return false;
  }
  return true;
};

// START UC-71 Create Booking
// Nhận thông tin đặt tour từ customer theo lịch khởi hành, kiểm tra chỗ trống, tính tổng tiền rồi tạo booking
export const createBooking = async (req, res) => {
  // Giới hạn tốc độ đặt tour của người dùng
  if (!checkBookingRateLimit(req, res)) return;

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: errors.array()[0]?.msg || 'Dữ liệu đặt tour không hợp lệ',
      errors: errors.array()
    });
  }

  try {
    const { fullName, phone, email, address, numberOfPeople, departureDate, departureId, note } = req.body;
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

    // 1. Tìm lịch khởi hành (Departure) theo departureId hoặc departureDate
    let departure = null;
    if (departureId) {
      departure = await Departure.findOne({ _id: departureId, tourId: tour._id });
      // Kiểm tra ngày khởi hành trong tương lai (ngăn chặn bypass qua departureId)
      if (departure) {
        const depDateCheck = new Date(departure.departureDate);
        if (depDateCheck.getTime() < Date.now()) {
          return res.status(400).json({
            success: false,
            message: 'Khong the dat tour cho lich khoi hanh trong qua khu hoac da xuat phat.'
          });
        }
      }
    }

    if (!departure && departureDate) {
      const selected = new Date(departureDate);
      if (!Number.isNaN(selected.getTime())) {
        const startOfDay = new Date(selected);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(startOfDay);
        endOfDay.setDate(endOfDay.getDate() + 1);

        departure = await Departure.findOne({
          tourId: tour._id,
          departureDate: { $gte: startOfDay, $lt: endOfDay }
        });
      }
    }

    // 2. Nghiệp vụ: Tour phải có lịch khởi hành mở bán
    if (!departure) {
      return res.status(400).json({
        success: false,
        message: 'Tour chưa có lịch khởi hành cho ngày đã chọn. Vui lòng chọn một ngày trong lịch khởi hành có sẵn của tour.'
      });
    }

    // 3. Nghiệp vụ: Lịch khởi hành phải ở trạng thái hoạt động (scheduled)
    if (departure.status !== 'scheduled') {
      return res.status(400).json({
        success: false,
        message: 'Lịch khởi hành này đã bị hủy, vui lòng chọn một lịch khởi hành khác.'
      });
    }

    // 4. Nghiệp vụ: Ngày khởi hành phải trong tương lai
    const depDate = new Date(departure.departureDate);
    if (depDate.getTime() < Date.now()) {
      return res.status(400).json({
        success: false,
        message: 'Không thể đặt tour cho lịch khởi hành trong quá khứ hoặc đã xuất phát.'
      });
    }

    // 5. Nghiệp vụ: Kiểm tra số chỗ trống còn lại của lịch khởi hành
    const startOfDay = new Date(depDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);

    const confirmedBookings = await Booking.find({
      $or: [
        { departureId: departure._id },
        { tourId: tour._id, departureDate: { $gte: startOfDay, $lt: endOfDay } }
      ],
      status: { $in: ['pending', 'confirmed', 'paid', 'checked_in', 'completed', 'no_show'] }
    });

    const bookedSeats = confirmedBookings.reduce((sum, b) => sum + (Number(b.numberOfPeople) || 0), 0);
    const departureRemaining = Math.max(0, Number(departure.availableSeats || 0) - bookedSeats);

    // Tính tourRemaining động từ TẤT CẢ booking của tất cả các đợt khởi hành
    const allTourBookings = await Booking.find({
      tourId: tour._id,
      status: { $in: ['pending', 'confirmed', 'paid', 'checked_in', 'completed', 'no_show'] }
    });
    const totalBookedSeats = allTourBookings.reduce((sum, b) => sum + (Number(b.numberOfPeople) || 0), 0);
    const tourRemaining = Math.max(0, Number(tour.availableSeats || 0) - totalBookedSeats);

    const remainingSeats = Math.min(departureRemaining, tourRemaining);

    if (remainingSeats < Number(numberOfPeople)) {
      return res.status(400).json({
        success: false,
        message: `Lịch khởi hành ngày ${startOfDay.toLocaleDateString('vi-VN')} chỉ còn ${remainingSeats} chỗ trống, không đủ cho ${numberOfPeople} người.`
      });
    }

    // 6. Tính tổng tiền: Ưu tiên đơn giá của lịch khởi hành (nếu có giá ưu đãi/điều chỉnh)
    const unitPrice = (departure.price !== null && departure.price !== undefined && Number(departure.price) > 0)
      ? Number(departure.price)
      : Number(tour.price);

    const totalPrice = unitPrice * Number(numberOfPeople);

    // 7. Tạo đơn đặt tour liên kết với lịch khởi hành (với giao dịch để đảm bảo toàn vẹn)
    const session = await mongoose.startSession();
    let booking;
    try {
      await session.withTransaction(async () => {
        const created = await Booking.create([{
          tourId: tour._id,
          customerId: req.user._id,
          departureId: departure._id,
          fullName,
          phone,
          email,
          address: address || '',
          numberOfPeople: Number(numberOfPeople),
          departureDate: departure.departureDate,
          note: note || '',
          totalPrice,
          status: 'pending'
        }], { session });

        booking = created[0];

        // Lưu ý: tour.availableSeats KHÔNG bị trừ ở đây.
        // Số chỗ còn lại được tính động từ các booking.
        // Điều này ngăn chặn race condition và đảm bảo hủy booking khôi phục lại số chỗ.
      });
    } finally {
      await session.endSession();
    }

    await booking.populate([
      { path: 'tourId', select: 'title location duration price images' },
      { path: 'customerId', select: 'username email phone' },
      { path: 'departureId', select: 'departureDate availableSeats price status' }
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
// END UC-71 Create Booking

// START UC-75 View Booking History & Detail (getMyBookings)
// Lấy toàn bộ danh sách booking của customer đang đăng nhập, sắp xếp mới nhất trước
export const getMyBookings = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = { customerId: req.user._id };

    if (status && ['pending', 'confirmed', 'paid', 'checked_in', 'completed', 'cancelled', 'rejected', 'no_show'].includes(status)) {
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
      .populate('departureId', 'departureDate availableSeats price status note')
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
// END UC-75 View Booking History & Detail (getMyBookings)

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
          paid: 0,
          checked_in: 0,
          completed: 0,
          cancelled: 0,
          confirmedRevenue: 0,
          collectedRevenue: 0,
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
      // Tiền đã thực thu nằm ở các đơn đã thanh toán / đã điểm danh.
      if (item._id === 'paid' || item._id === 'checked_in' || item._id === 'completed') {
        result.collectedRevenue += item.totalAmount;
      }
      return result;
    }, {
      total: 0,
      pending: 0,
      confirmed: 0,
      paid: 0,
      checked_in: 0,
      completed: 0,
      cancelled: 0,
      confirmedRevenue: 0,
      collectedRevenue: 0,
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

    // Chỗ đã được giữ và trừ vào tour.availableSeats ngay khi tạo đơn pending trong createBooking.
    booking.status = 'confirmed';
    booking.respondedAt = new Date();
    booking.respondedBy = req.user._id;
    await booking.save({ validateBeforeSave: false });


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

// START UC-85 Confirm Payment & Check-in
/**
 * UC-85 Confirm Payment & Check-in.
 *
 * Hệ thống không có cổng thanh toán: tại điểm đón, khách trả tiền mặt hoặc chuyển
 * khoản trực tiếp cho nhà xe, provider chỉ ghi nhận lại kết quả.
 *  - confirmed -> paid: xác nhận đã thu tiền (cash | bank_transfer).
 *  - paid -> checked_in: điểm danh khách đã lên xe.
 * Chỉ provider sở hữu tour của đơn mới được thao tác trên đơn đó.
 */
const loadProviderBooking = async (bookingId, providerId) => {
  const booking = await Booking.findById(bookingId);
  if (!booking) return { statusCode: 404, message: 'Không tìm thấy đơn đặt tour' };

  const tour = await Tour.findById(booking.tourId);
  if (!tour) return { statusCode: 404, message: 'Không tìm thấy tour của đơn đặt này' };

  if (!tour.providerId || tour.providerId.toString() !== providerId.toString()) {
    return { statusCode: 403, message: 'Bạn không có quyền cập nhật đơn đặt tour này' };
  }

  return { booking };
};

// Trả một đơn đặt tour về cho client theo cấu trúc phản hồi chung của provider.
const respondWithBooking = async (res, booking, message, extra = {}) => {
  const populated = await Booking.findById(booking._id)
    .populate('tourId', 'title location duration price images departureLocation destinationLocation')
    .populate('customerId', 'username email phone');

  return res.status(200).json({
    success: true,
    message,
    data: populated,
    ...extra
  });
};

// Provider xác nhận đã thu tiền tại điểm đón: confirmed -> paid.
export const confirmBookingPayment = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: errors.array()[0]?.msg || 'Dữ liệu xác nhận thanh toán không hợp lệ',
      errors: errors.array()
    });
  }

  try {
    const { booking, statusCode, message } = await loadProviderBooking(req.params.id, req.user._id);
    if (!booking) {
      return res.status(statusCode).json({ success: false, message });
    }

    if (booking.status === 'cancelled') {
      return res.status(409).json({
        success: false,
        message: 'Đơn đặt tour này đã bị hủy, không thể xác nhận thanh toán'
      });
    }

    if (booking.status === 'pending') {
      return res.status(409).json({
        success: false,
        message: 'Đơn đặt tour chưa được xác nhận, không thể thu tiền'
      });
    }

    if (booking.status === 'paid' || booking.status === 'checked_in') {
      return res.status(409).json({
        success: false,
        message: 'Đơn đặt tour này đã được xác nhận thu tiền trước đó'
      });
    }

    if (booking.status !== 'confirmed') {
      return res.status(409).json({
        success: false,
        message: 'Chỉ đơn đặt tour đã xác nhận mới được ghi nhận thanh toán'
      });
    }

    booking.status = 'paid';
    booking.paymentMethod = req.body?.paymentMethod || 'cash';
    booking.paidAt = new Date();
    await booking.save();

    return respondWithBooking(res, booking, 'Đã xác nhận thu tiền cho đơn đặt tour', {
      paymentMethod: booking.paymentMethod
    });
  } catch (error) {
    console.error('Error confirming booking payment:', error);
    return res.status(500).json({
      success: false,
      message: 'Không thể xác nhận thanh toán'
    });
  }
};

// Provider điểm danh khách đã lên xe: paid -> checked_in.
export const checkInBooking = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: errors.array()[0]?.msg || 'Mã đơn đặt tour không hợp lệ',
      errors: errors.array()
    });
  }

  try {
    const { booking, statusCode, message } = await loadProviderBooking(req.params.id, req.user._id);
    if (!booking) {
      return res.status(statusCode).json({ success: false, message });
    }

    if (booking.status === 'cancelled') {
      return res.status(409).json({
        success: false,
        message: 'Đơn đặt tour này đã bị hủy, không thể điểm danh'
      });
    }

    if (booking.status === 'checked_in') {
      return res.status(409).json({
        success: false,
        message: 'Khách của đơn này đã được điểm danh trước đó'
      });
    }

    if (booking.status !== 'paid') {
      return res.status(409).json({
        success: false,
        message: 'Chỉ điểm danh được đơn đặt tour đã xác nhận thu tiền'
      });
    }

    booking.status = 'checked_in';
    booking.checkedInAt = new Date();
    await booking.save();

    return respondWithBooking(
      res,
      booking,
      `Đã điểm danh ${booking.numberOfPeople} khách lên xe`
    );
  } catch (error) {
    console.error('Error checking in booking:', error);
    return res.status(500).json({
      success: false,
      message: 'Không thể điểm danh đơn đặt tour'
    });
  }
};
// END UC-85 Confirm Payment & Check-in

// START UC-79 Complete Booking
export const completeBooking = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: errors.array()[0]?.msg || 'Mã đơn đặt tour không hợp lệ',
      errors: errors.array()
    });
  }

  try {
    const { booking, statusCode, message } = await loadProviderBooking(req.params.id, req.user._id);
    if (!booking) {
      return res.status(statusCode).json({ success: false, message });
    }

    if (booking.status === 'completed') {
      return res.status(409).json({
        success: false,
        message: 'Đơn đặt tour này đã được đánh dấu hoàn thành trước đó'
      });
    }

    if (booking.status === 'cancelled') {
      return res.status(409).json({
        success: false,
        message: 'Đơn đặt tour này đã bị hủy, không thể đánh dấu hoàn thành'
      });
    }

    if (!['paid', 'checked_in'].includes(booking.status)) {
      return res.status(409).json({
        success: false,
        message: 'Chỉ đơn đặt tour đã thanh toán hoặc đã điểm danh mới được đánh dấu hoàn thành'
      });
    }

    booking.status = 'completed';
    booking.completedAt = new Date();
    await booking.save();

    return respondWithBooking(
      res,
      booking,
      'Đã đánh dấu hoàn thành chuyến đi thành công'
    );
  } catch (error) {
    console.error('Error completing booking:', error);
    return res.status(500).json({
      success: false,
      message: 'Không thể đánh dấu hoàn thành chuyến đi'
    });
  }
};
// END UC-79 Complete Booking

// START UC-123 Export Provider Booking Report
/**
 * UC-123 - Export Provider Booking Report.
 *
 * Xuất danh sách đơn đặt tour của nhà cung cấp ra file Excel (.xlsx) chuyên nghiệp,
 * đồng bộ định dạng bảng biểu, màu sắc thương hiệu và thống kê tổng kết tương tự
 * mẫu Quản lý khách hàng du lịch (Passenger Manifest).
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
    if (to) {
      const endDate = new Date(`${to}T00:00:00.000Z`);
      endDate.setUTCDate(endDate.getUTCDate() + 1);
      query.createdAt.$lt = endDate;
    }
  }

  try {
    const providerTours = await Tour.find({ providerId: req.user?._id })
      .select('_id title')
      .lean();
    query.tourId = { $in: (providerTours || []).map((tour) => tour._id) };

    const bookings = await Booking.find(query)
      .populate('tourId', 'title departureLocation destinationLocation')
      .sort({ createdAt: -1 })
      .lean();

    const totalPassengers = bookings.reduce((sum, b) => sum + (b.numberOfPeople || 0), 0);
    const totalRevenue = bookings.reduce((sum, b) => sum + (b.totalPrice || 0), 0);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'TripMate Platform';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet('Báo cáo đơn đặt tour', {
      views: [{ showGridLines: true }]
    });

    // 1. Cấu hình độ rộng các cột (12 cột)
    worksheet.columns = [
      { key: 'stt', width: 7 },
      { key: 'bookingCode', width: 16 },
      { key: 'tourTitle', width: 34 },
      { key: 'fullName', width: 26 },
      { key: 'phone', width: 16 },
      { key: 'email', width: 28 },
      { key: 'departureDate', width: 16 },
      { key: 'numberOfPeople', width: 14 },
      { key: 'totalPrice', width: 20 },
      { key: 'status', width: 20 },
      { key: 'createdAt', width: 16 },
      { key: 'note', width: 38 }
    ];

    // 2. Tên thương hiệu / Logo
    worksheet.mergeCells('B2:E2');
    const brandCell = worksheet.getCell('B2');
    brandCell.value = 'TRIPMATE TRAVEL - SLIM CRM';
    brandCell.font = { name: 'Segoe UI', size: 13, bold: true, color: { argb: 'FFE65100' } };
    brandCell.alignment = { vertical: 'middle', horizontal: 'left' };

    // 3. Tiêu đề chính
    worksheet.mergeCells('A3:L3');
    const titleCell = worksheet.getCell('A3');
    titleCell.value = 'BÁO CÁO CHI TIẾT ĐƠN ĐẶT TOUR';
    titleCell.font = { name: 'Segoe UI', size: 16, bold: true, color: { argb: 'FF1F4E79' } };
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
    worksheet.getRow(3).height = 30;

    // 4. Tiêu đề phụ / Mô tả mẫu
    worksheet.mergeCells('A4:L4');
    const subtitleCell = worksheet.getCell('A4');
    subtitleCell.value = 'Bảng thống kê toàn bộ đơn đặt tour theo nhà cung cấp: Mã đơn, Khách hàng, Tour đăng ký, Số lượng vé, Doanh thu và Trạng thái xử lý.';
    subtitleCell.font = { name: 'Segoe UI', size: 10, italic: true, color: { argb: 'FF555555' } };
    subtitleCell.alignment = { vertical: 'middle', horizontal: 'center' };

    // 5. Khung tóm tắt thông tin báo cáo (Rows 6 - 8)
    const infoBorder = {
      top: { style: 'thin', color: { argb: 'FFB0BEC5' } },
      left: { style: 'thin', color: { argb: 'FFB0BEC5' } },
      bottom: { style: 'thin', color: { argb: 'FFB0BEC5' } },
      right: { style: 'thin', color: { argb: 'FFB0BEC5' } }
    };
    const infoFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F4F8' } };

    worksheet.mergeCells('A6:F6');
    const providerName = req.user?.businessName || req.user?.username || 'TripMate Partner';
    worksheet.getCell('A6').value = `Nhà cung cấp: ${providerName}`;
    worksheet.getCell('A6').font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FF1A237E' } };

    worksheet.mergeCells('G6:L6');
    let periodText = 'Toàn bộ thời gian';
    if (from && to) {
      periodText = `Từ ${new Date(from).toLocaleDateString('vi-VN')} đến ${new Date(to).toLocaleDateString('vi-VN')}`;
    } else if (from) {
      periodText = `Từ ngày ${new Date(from).toLocaleDateString('vi-VN')}`;
    } else if (to) {
      periodText = `Đến ngày ${new Date(to).toLocaleDateString('vi-VN')}`;
    }
    worksheet.getCell('G6').value = `Khoảng thời gian: ${periodText}`;
    worksheet.getCell('G6').font = { name: 'Segoe UI', size: 10, bold: true };

    worksheet.mergeCells('A7:F7');
    const providerContact = req.user?.phone ? ` - Hotline: ${req.user.phone}` : '';
    worksheet.getCell('A7').value = `Liên hệ: ${req.user?.email || 'N/A'}${providerContact}`;
    worksheet.getCell('A7').font = { name: 'Segoe UI', size: 10 };

    worksheet.mergeCells('G7:L7');
    worksheet.getCell('G7').value = `Thời gian xuất: ${new Date().toLocaleString('vi-VN')}`;
    worksheet.getCell('G7').font = { name: 'Segoe UI', size: 10 };

    worksheet.mergeCells('A8:F8');
    worksheet.getCell('A8').value = `Số tour sở hữu: ${(providerTours || []).length} tour`;
    worksheet.getCell('A8').font = { name: 'Segoe UI', size: 10 };

    worksheet.mergeCells('G8:L8');
    worksheet.getCell('G8').value = `Tổng số đơn: ${bookings.length} đơn | Tổng vé: ${totalPassengers} vé`;
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
      'Tên tour',
      'Họ và tên khách hàng',
      'Số điện thoại',
      'Email',
      'Ngày khởi hành',
      'Số lượng vé',
      'Tổng tiền',
      'Trạng thái',
      'Ngày đặt',
      'Ghi chú'
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

    // 7. Render danh sách đơn đặt tour
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
        case 'cancelled': return 'Đã hủy';
        case 'rejected': return 'Đã từ chối';
        case 'no_show': return 'Vắng mặt (No-show)';
        default: return status || 'N/A';
      }
    };

    if (bookings.length === 0) {
      const emptyRow = worksheet.getRow(11);
      emptyRow.height = 24;
      worksheet.mergeCells('A11:L11');
      const emptyCell = emptyRow.getCell(1);
      emptyCell.value = 'Không có dữ liệu đơn đặt tour nào trong khoảng thời gian này';
      emptyCell.font = { name: 'Segoe UI', size: 10, italic: true, color: { argb: 'FF888888' } };
      emptyCell.alignment = { vertical: 'middle', horizontal: 'center' };
      for (let c = 1; c <= 12; c++) {
        emptyRow.getCell(c).border = thinBorder;
      }
    } else {
      bookings.forEach((booking, index) => {
        const rowIdx = 11 + index;
        const row = worksheet.getRow(rowIdx);
        row.height = 24;
        const isEven = index % 2 === 1;
        const rowFill = isEven ? { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9FAFB' } } : null;

        const bookingCode = `BK-${booking._id ? booking._id.toString().slice(-6).toUpperCase() : 'UNKNOWN'}`;
        const statusText = getStatusText(booking.status);
        const departureDateText = booking.departureDate ? new Date(booking.departureDate).toLocaleDateString('vi-VN') : 'N/A';
        const createdAtText = booking.createdAt ? new Date(booking.createdAt).toLocaleDateString('vi-VN') : 'N/A';
        const noteText = booking.note || 'Không có ghi chú';

        row.values = [
          index + 1,
          bookingCode,
          booking.tourId?.title || 'Tour không còn khả dụng',
          booking.fullName || 'N/A',
          booking.phone || 'N/A',
          booking.email || 'N/A',
          departureDateText,
          booking.numberOfPeople || 0,
          booking.totalPrice || 0,
          statusText,
          createdAtText,
          noteText
        ];

        for (let c = 1; c <= 12; c++) {
          const cell = row.getCell(c);
          cell.font = { name: 'Segoe UI', size: 10 };
          cell.border = thinBorder;
          if (rowFill) cell.fill = rowFill;

          if ([1, 2, 5, 7, 8, 10, 11].includes(c)) {
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
          } else if (c === 9) {
            cell.alignment = { vertical: 'middle', horizontal: 'right' };
            cell.numFmt = '#,##0 "đ"';
          } else {
            cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: c === 12 };
          }
        }

        // Tô màu nhấn mạnh trạng thái
        const statusCell = row.getCell(10);
        if (['completed', 'paid'].includes(booking.status)) {
          statusCell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF15803D' } };
        } else if (['confirmed', 'checked_in'].includes(booking.status)) {
          statusCell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF1D4ED8' } };
        } else if (booking.status === 'pending') {
          statusCell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FFD97706' } };
        } else if (['cancelled', 'rejected', 'no_show'].includes(booking.status)) {
          statusCell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FFDC2626' } };
        }
      });
    }

    // 8. Dòng tổng cộng (Summary Row)
    const totalRowIdx = 11 + Math.max(bookings.length, 1);
    const totalRow = worksheet.getRow(totalRowIdx);
    totalRow.height = 26;

    worksheet.mergeCells(`A${totalRowIdx}:G${totalRowIdx}`);
    const labelCell = totalRow.getCell(1);
    labelCell.value = 'TỔNG CỘNG / TOTAL';
    labelCell.font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FF1F4E79' } };
    labelCell.alignment = { vertical: 'middle', horizontal: 'right' };

    const totalPaxCell = totalRow.getCell(8);
    totalPaxCell.value = totalPassengers;
    totalPaxCell.font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FF1F4E79' } };
    totalPaxCell.alignment = { vertical: 'middle', horizontal: 'center' };

    const totalRevCell = totalRow.getCell(9);
    totalRevCell.value = totalRevenue;
    totalRevCell.font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FFB91C1C' } };
    totalRevCell.alignment = { vertical: 'middle', horizontal: 'right' };
    totalRevCell.numFmt = '#,##0 "đ"';

    worksheet.mergeCells(`J${totalRowIdx}:L${totalRowIdx}`);
    const summaryCountCell = totalRow.getCell(10);
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
    worksheet.getCell(`A${footerRowIdx}`).value = `* Báo cáo đơn đặt tour được xuất tự động từ hệ thống TripMate vào lúc: ${new Date().toLocaleString('vi-VN')}`;
    worksheet.getCell(`A${footerRowIdx}`).font = { name: 'Segoe UI', size: 9, italic: true, color: { argb: 'FF64748B' } };

    const sigRowIdx = footerRowIdx + 2;
    worksheet.mergeCells(`B${sigRowIdx}:E${sigRowIdx}`);
    worksheet.getCell(`B${sigRowIdx}`).value = 'NGƯỜI LẬP BẢNG';
    worksheet.getCell(`B${sigRowIdx}`).font = { name: 'Segoe UI', size: 10, bold: true };
    worksheet.getCell(`B${sigRowIdx}`).alignment = { horizontal: 'center' };

    worksheet.mergeCells(`H${sigRowIdx}:L${sigRowIdx}`);
    worksheet.getCell(`H${sigRowIdx}`).value = 'ĐẠI DIỆN ĐƠN VỊ TỔ CHỨC / NHÀ CUNG CẤP';
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

    const fileDate = new Date().toISOString().slice(0, 10);
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="tripmate-provider-booking-report-${fileDate}.xlsx"`
    });

    await workbook.xlsx.write(res);
    return res.end();
  } catch (error) {
    console.error('Error exporting provider booking report:', error);
    return res.status(500).json({
      success: false,
      message: 'Không thể xuất báo cáo đặt tour'
    });
  }
};
// END UC-123 Export Provider Booking Report

// START UC-75 View Booking History & Detail (getBookingById)
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
    }).populate('departureId', 'departureDate availableSeats price status note');

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
// END UC-75 View Booking History & Detail (getBookingById)

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

    // Đơn đã bị từ chối (provider reject) không còn hiệu lực, không được hủy thêm
    // (và tránh việc trả chỗ hai lần: reject đã trả chỗ, cancel lại trả chỗ).
    if (booking.status === 'rejected') {
      return res.status(409).json({
        success: false,
        message: 'Đơn đặt tour này đã bị từ chối, không thể hủy'
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

    // Số chỗ còn lại được tính động từ các booking, không cần cập nhật tour.availableSeats.
    const populated = await Booking.findById(id)
      .populate('tourId', 'title location duration price images departureLocation destinationLocation')
      .populate('customerId', 'username email phone');

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
      // Chỗ đã được giữ và trừ vào tour.availableSeats ngay khi tạo đơn pending trong createBooking.
      booking.status = 'confirmed';
      booking.respondedAt = new Date();
      booking.respondedBy = req.user._id;
      await booking.save({ validateBeforeSave: false });


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

      // Số chỗ còn lại được tính động từ các booking, không cần cập nhật tour.availableSeats.
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
    return res.status(500).json({ success: false, message: error?.message || 'Không thể phản hồi đơn đặt tour' });
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
export const markBookingNoShow = markBookingAsNoShow;

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

// START UC-152 Update Booking Passenger Info
/**
 * Customer updates contact/passenger information for an active booking.
 * Allowed when status is pending, confirmed, or paid (before check-in, completion, or cancellation).
 * @route PATCH /api/bookings/:id/passenger-info
 * @access Customer
 */
export const updateBookingPassengerInfo = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: errors.array()[0]?.msg || 'Dữ liệu thông tin hành khách không hợp lệ',
      errors: errors.array()
    });
  }

  try {
    const { id } = req.params;
    const { fullName, phone, email, address, note } = req.body;

    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy đơn đặt tour'
      });
    }

    if (booking.customerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền chỉnh sửa đơn đặt tour này'
      });
    }

    const nonEditableStatuses = ['checked_in', 'completed', 'cancelled'];
    if (nonEditableStatuses.includes(booking.status)) {
      return res.status(409).json({
        success: false,
        message: 'Không thể cập nhật thông tin hành khách khi đơn đã điểm danh, hoàn thành hoặc đã hủy'
      });
    }

    const MAX_PASSENGER_UPDATES = 3;
    if ((booking.passengerUpdateCount || 0) >= MAX_PASSENGER_UPDATES) {
      return res.status(409).json({
        success: false,
        message: `Bạn đã đạt giới hạn tối đa ${MAX_PASSENGER_UPDATES} lần chỉnh sửa thông tin hành khách cho đơn này`
      });
    }

    booking.fullName = fullName.trim();
    booking.phone = phone.trim();
    booking.email = email.trim().toLowerCase();
    if (address !== undefined) {
      booking.address = address.trim();
    }
    if (note !== undefined) {
      booking.note = note.trim();
    }

    booking.passengerUpdateCount = (booking.passengerUpdateCount || 0) + 1;
    await booking.save();

    const populated = await Booking.findById(id)
      .populate('tourId', 'title location duration price images departureLocation destinationLocation');

    return res.status(200).json({
      success: true,
      message: `Cập nhật thông tin hành khách thành công (${booking.passengerUpdateCount}/${MAX_PASSENGER_UPDATES})`,
      data: populated
    });
  } catch (error) {
    console.error('Error updating booking passenger info:', error);
    return res.status(500).json({
      success: false,
      message: 'Không thể cập nhật thông tin hành khách'
    });
  }
};
// END UC-152 Update Booking Passenger Info
