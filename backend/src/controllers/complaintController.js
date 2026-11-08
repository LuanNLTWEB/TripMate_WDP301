import { validationResult } from 'express-validator';
import Complaint from '../models/Complaint.js';
import Booking from '../models/Booking.js';

// UC-66 – Submit Booking Complaint (Customer).
// Chỉ tạo khiếu nại; không xử lý/duyệt, không thay đổi booking gốc.
// Ảnh minh chứng đã được upload trước qua POST /api/complaints/evidence,
// controller chỉ nhận mảng URL trong body.

const ACTIVE_COMPLAINT_STATUSES = ['pending', 'in_review'];

const respondValidationErrors = (req, res) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) return false;

  res.status(400).json({
    success: false,
    message: errors.array()[0]?.msg || 'Dữ liệu khiếu nại không hợp lệ',
    errors: errors.array()
  });
  return true;
};

export const createComplaint = async (req, res) => {
  if (respondValidationErrors(req, res)) return;

  const { bookingId, complaintType, description, evidenceImages = [] } = req.body;

  try {
    const booking = await Booking.findById(bookingId).populate(
      'tourId',
      'title images departureLocation destinationLocation duration'
    );

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy đơn đặt tour cần khiếu nại'
      });
    }

    // Không tin customerId từ client: so sánh với khách hàng trong JWT.
    if (booking.customerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền gửi khiếu nại cho đơn đặt tour này'
      });
    }

    // Tránh bấm gửi nhiều lần tạo ra nhiều khiếu nại trùng.
    const activeComplaint = await Complaint.findOne({
      booking: booking._id,
      customer: req.user._id,
      status: { $in: ACTIVE_COMPLAINT_STATUSES }
    }).select('_id');

    if (activeComplaint) {
      return res.status(409).json({
        success: false,
        message: 'Bạn đã gửi khiếu nại cho đơn đặt tour này và đang chờ xử lý'
      });
    }

    const complaint = await Complaint.create({
      booking: booking._id,
      customer: req.user._id,
      complaintType,
      description: description.trim(),
      evidenceImages,
      status: 'pending'
    });

    const populated = await Complaint.findById(complaint._id)
      .populate({
        path: 'booking',
        select: 'fullName phone email departureDate numberOfPeople status totalPrice tourId',
        populate: {
          path: 'tourId',
          select: 'title images departureLocation destinationLocation duration'
        }
      })
      .populate('customer', 'username email phone');

    return res.status(201).json({
      success: true,
      message: 'Gửi khiếu nại thành công. Chúng tôi sẽ phản hồi trong thời gian sớm nhất.',
      data: populated
    });
  } catch (error) {
    console.error('Error creating complaint:', error);

    // Unique partial index bắt được trường hợp hai request đồng thời.
    if (error?.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'Bạn đã gửi khiếu nại cho đơn đặt tour này và đang chờ xử lý'
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Không thể gửi khiếu nại. Vui lòng thử lại sau.'
    });
  }
};
