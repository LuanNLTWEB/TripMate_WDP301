import { validationResult } from 'express-validator';
import Tour from '../models/Tour.js';
import Departure from '../models/Departure.js';

const LEAD_TIME_MS = 24 * 60 * 60 * 1000;

/**
 * Tạo lịch khởi hành mới cho một tour (UC-40)
 * @route POST /api/departures
 * @access Private (tourProvider, admin)
 */
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
    if (!tour) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy tour'
      });
    }

    const isOwner = tour.providerId && tour.providerId.equals(req.user._id);
    if (!isOwner && req.user.role !== 'admin') {
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

/**
 * Lấy danh sách lịch khởi hành của một tour
 * @route GET /api/departures?tourId=:tourId
 * @access Private (tourProvider, admin)
 */
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
    if (!tour) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy tour'
      });
    }

    const isOwner = tour.providerId && tour.providerId.equals(req.user._id);
    if (!isOwner && req.user.role !== 'admin') {
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

/**
 * Cập nhật lịch khởi hành của tour (UC-42)
 * @route PUT/PATCH /api/departures/:id
 * @access Private (tourProvider, admin)
 */
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
    if (!isOwner && req.user.role !== 'admin') {
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
