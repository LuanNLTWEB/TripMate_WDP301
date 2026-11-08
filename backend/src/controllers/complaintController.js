import { validationResult } from 'express-validator';
import Complaint from '../models/Complaint.js';
import Booking from '../models/Booking.js';

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const badRequest = (res, errors) => res.status(400).json({
  success: false,
  message: errors.array()[0]?.msg || 'Dữ liệu khiếu nại không hợp lệ',
  errors: errors.array()
});

const complaintPopulate = [
  { path: 'customerId', select: 'username email phone' },
  { path: 'providerId', select: 'username email phone' },
  { path: 'resolvedBy', select: 'username email' },
  { path: 'tourId', select: 'title departureLocation destinationLocation' },
  { path: 'bookingId', select: 'fullName phone email departureDate numberOfPeople totalPrice status createdAt' }
];

export const createComplaint = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return badRequest(res, errors);

  try {
    const booking = await Booking.findOne({
      _id: req.body.bookingId,
      customerId: req.user._id
    }).populate('tourId', 'title providerId');

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đơn đặt tour của bạn' });
    }
    if (booking.status !== 'confirmed') {
      return res.status(409).json({
        success: false,
        message: 'Chỉ có thể khiếu nại đơn đặt tour đã được xác nhận'
      });
    }

    const existing = await Complaint.findOne({
      bookingId: booking._id,
      customerId: req.user._id,
      status: { $in: ['open', 'in_review'] }
    });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'Đơn đặt tour này đã có khiếu nại đang được xử lý'
      });
    }

    const complaint = await Complaint.create({
      customerId: req.user._id,
      bookingId: booking._id,
      tourId: booking.tourId._id,
      providerId: booking.tourId.providerId,
      category: req.body.category,
      description: req.body.description.trim()
    });
    await complaint.populate(complaintPopulate);

    return res.status(201).json({
      success: true,
      message: 'Đã gửi khiếu nại. Nhân viên sẽ kiểm tra và phản hồi.',
      data: complaint
    });
  } catch (error) {
    console.error('Error creating complaint:', error);
    return res.status(500).json({ success: false, message: 'Không thể gửi khiếu nại' });
  }
};

export const getMyComplaints = async (req, res) => {
  try {
    const complaints = await Complaint.find({ customerId: req.user._id })
      .populate(complaintPopulate)
      .sort({ createdAt: -1 });
    return res.json({ success: true, count: complaints.length, data: complaints });
  } catch (error) {
    console.error('Error fetching customer complaints:', error);
    return res.status(500).json({ success: false, message: 'Không thể tải danh sách khiếu nại' });
  }
};

export const getComplaints = async (req, res) => {
  try {
    const { search = '', status = 'all', page = 1, limit = 10 } = req.query;
    const filters = {};
    if (status !== 'all') filters.status = status;
    const normalizedSearch = String(search).trim();
    if (normalizedSearch) {
      const regex = new RegExp(escapeRegex(normalizedSearch), 'i');
      const matchingBookings = await Booking.find({
        $or: [{ fullName: regex }, { email: regex }, { phone: regex }]
      }).select('_id');
      filters.$or = [
        { description: regex },
        { bookingId: { $in: matchingBookings.map((booking) => booking._id) } }
      ];
    }

    const pageNumber = Math.max(Number.parseInt(page, 10) || 1, 1);
    const pageSize = Math.min(Math.max(Number.parseInt(limit, 10) || 10, 1), 50);
    const [total, complaints] = await Promise.all([
      Complaint.countDocuments(filters),
      Complaint.find(filters)
        .populate(complaintPopulate)
        .sort({ createdAt: -1 })
        .skip((pageNumber - 1) * pageSize)
        .limit(pageSize)
    ]);

    return res.json({
      success: true,
      total,
      totalPages: Math.ceil(total / pageSize) || 1,
      currentPage: pageNumber,
      data: complaints
    });
  } catch (error) {
    console.error('Error fetching complaints:', error);
    return res.status(500).json({ success: false, message: 'Không thể tải danh sách khiếu nại' });
  }
};

export const getComplaintById = async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id).populate(complaintPopulate);
    if (!complaint) return res.status(404).json({ success: false, message: 'Không tìm thấy khiếu nại' });
    return res.json({ success: true, data: complaint });
  } catch (error) {
    console.error('Error fetching complaint:', error);
    return res.status(500).json({ success: false, message: 'Không thể tải thông tin khiếu nại' });
  }
};

export const resolveComplaint = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return badRequest(res, errors);

  try {
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) return res.status(404).json({ success: false, message: 'Không tìm thấy khiếu nại' });
    if (!['open', 'in_review'].includes(complaint.status)) {
      return res.status(409).json({ success: false, message: 'Khiếu nại này đã được xử lý' });
    }

    complaint.status = req.body.status;
    complaint.resolutionNote = req.body.resolutionNote.trim();
    complaint.resolvedBy = req.user._id;
    complaint.resolvedAt = new Date();
    await complaint.save();
    await complaint.populate(complaintPopulate);

    return res.json({
      success: true,
      message: req.body.status === 'resolved' ? 'Đã giải quyết khiếu nại' : 'Đã từ chối khiếu nại',
      data: complaint
    });
  } catch (error) {
    console.error('Error resolving complaint:', error);
    return res.status(500).json({ success: false, message: 'Không thể cập nhật khiếu nại' });
  }
};
