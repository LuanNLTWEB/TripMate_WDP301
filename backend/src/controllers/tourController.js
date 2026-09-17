import Tour from '../models/Tour.js';
import User from '../models/User.js';
import { validationResult } from 'express-validator';

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const getFavoriteTours = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate({
      path: 'favoriteTours',
      match: { status: { $ne: 'suspended' } }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy người dùng'
      });
    }

    const favoriteTours = (user.favoriteTours || []).filter(Boolean);

    res.status(200).json({
      success: true,
      count: favoriteTours.length,
      favoriteTourIds: favoriteTours.map((tour) => tour._id),
      data: favoriteTours
    });
  } catch (error) {
    console.error('Error fetching favorite tours:', error);
    res.status(500).json({
      success: false,
      message: 'Không thể tải danh sách tour yêu thích'
    });
  }
};

export const removeFavoriteTour = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: errors.array()[0]?.msg || 'Mã tour không hợp lệ',
      errors: errors.array()
    });
  }

  try {
    await User.findByIdAndUpdate(req.user._id, {
      $pull: { favoriteTours: req.params.id }
    });

    res.status(200).json({
      success: true,
      message: 'Đã bỏ lưu tour yêu thích',
      tourId: req.params.id,
      isFavorite: false
    });
  } catch (error) {
    console.error('Error removing favorite tour:', error);
    res.status(500).json({
      success: false,
      message: 'Không thể bỏ lưu tour yêu thích'
    });
  }
};

export const saveFavoriteTour = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: errors.array()[0]?.msg || 'Mã tour không hợp lệ',
      errors: errors.array()
    });
  }

  try {
    const tour = await Tour.findOne({
      _id: req.params.id,
      status: { $ne: 'suspended' }
    });
    if (!tour) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy tour'
      });
    }

    const alreadyFavorite = (req.user.favoriteTours || [])
      .some((tourId) => tourId.equals(tour._id));

    if (!alreadyFavorite) {
      await User.findByIdAndUpdate(req.user._id, {
        $addToSet: { favoriteTours: tour._id }
      });
    }

    res.status(200).json({
      success: true,
      message: alreadyFavorite ? 'Tour đã có trong danh sách yêu thích' : 'Đã lưu tour yêu thích',
      tourId: tour._id,
      isFavorite: true
    });
  } catch (error) {
    console.error('Error saving favorite tour:', error);
    res.status(500).json({
      success: false,
      message: 'Không thể lưu tour yêu thích'
    });
  }
};

export const getAllTours = async (req, res) => {
  try {
    const {
      search,
      departure,
      destination,
      maxPrice,
      minSeats,
      sort = 'newest',
      page = 1,
      limit = 10
    } = req.query;
    const filters = [{ status: { $ne: 'suspended' } }];

    if (search) {
      const safeSearch = escapeRegex(search);
      filters.push({ $or: [
        { title: { $regex: safeSearch, $options: 'i' } },
        { location: { $regex: safeSearch, $options: 'i' } },
        { departureLocation: { $regex: safeSearch, $options: 'i' } },
        { destinationLocation: { $regex: safeSearch, $options: 'i' } }
      ] });
    }

    if (departure) {
      const cleanDeparture = departure.replace(/^(Thành phố|Tỉnh)\s+/i, '').trim();
      filters.push({
        $or: [
          { departureLocation: { $regex: escapeRegex(departure), $options: 'i' } },
          { departureLocation: { $regex: escapeRegex(cleanDeparture), $options: 'i' } }
        ]
      });
    }

    if (destination) {
      const safeDestination = escapeRegex(destination);
      filters.push({ $or: [
        { destinationLocation: { $regex: safeDestination, $options: 'i' } },
        { location: { $regex: safeDestination, $options: 'i' } }
      ] });
    }

    const parsedMaxPrice = Number(maxPrice);
    if (maxPrice !== undefined && maxPrice !== '' && Number.isFinite(parsedMaxPrice) && parsedMaxPrice >= 0) {
      filters.push({ price: { $lte: parsedMaxPrice } });
    }

    const parsedMinSeats = Number(minSeats);
    if (minSeats !== undefined && minSeats !== '' && Number.isInteger(parsedMinSeats) && parsedMinSeats >= 0) {
      filters.push({ availableSeats: { $gte: parsedMinSeats } });
    }

    const query = filters.length > 0 ? { $and: filters } : {};
    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 100);
    const startIndex = (pageNum - 1) * limitNum;
    const sortOptions = {
      newest: { createdAt: -1 },
      priceAsc: { price: 1 },
      priceDesc: { price: -1 },
      rating: { averageRating: -1 }
    };

    const total = await Tour.countDocuments(query);
    const tours = await Tour.find(query)
      .sort(sortOptions[sort] || sortOptions.newest)
      .skip(startIndex)
      .limit(limitNum);
    
    res.status(200).json({
      success: true,
      count: tours.length,
      total,
      totalPages: Math.ceil(total / limitNum),
      currentPage: pageNum,
      data: tours
    });
  } catch (error) {
    console.error('Error fetching tours:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching tours'
    });
  }
};

export const getTourById = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: errors.array()[0]?.msg || 'Mã tour không hợp lệ',
      errors: errors.array()
    });
  }

  try {
    const tour = await Tour.findOne({
      _id: req.params.id,
      status: { $ne: 'suspended' }
    });

    if (!tour) {
      return res.status(404).json({
        success: false,
        message: 'Tour not found'
      });
    }

    res.status(200).json({
      success: true,
      data: tour
    });
  } catch (error) {
    console.error('Error fetching tour by ID:', error);
    
    if (error.name === 'CastError') {
       return res.status(404).json({
        success: false,
        message: 'Tour not found'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error while fetching tour'
    });
  }
};

export const getManagedTours = async (req, res) => {
  try {
    const {
      search,
      status = 'all',
      page = 1,
      limit = 10
    } = req.query;
    const filters = [];

    if (search) {
      const safeSearch = escapeRegex(search);
      filters.push({
        $or: [
          { title: { $regex: safeSearch, $options: 'i' } },
          { location: { $regex: safeSearch, $options: 'i' } },
          { departureLocation: { $regex: safeSearch, $options: 'i' } },
          { destinationLocation: { $regex: safeSearch, $options: 'i' } }
        ]
      });
    }

    if (status === 'suspended') {
      filters.push({ status: 'suspended' });
    } else if (status === 'active') {
      filters.push({ status: { $ne: 'suspended' } });
    }

    const query = filters.length > 0 ? { $and: filters } : {};
    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 100);
    const startIndex = (pageNum - 1) * limitNum;
    const [total, tours] = await Promise.all([
      Tour.countDocuments(query),
      Tour.find(query)
        .populate('suspendedBy', 'username email')
        .sort({ createdAt: -1 })
        .skip(startIndex)
        .limit(limitNum)
    ]);

    res.status(200).json({
      success: true,
      count: tours.length,
      total,
      totalPages: Math.ceil(total / limitNum),
      currentPage: pageNum,
      data: tours
    });
  } catch (error) {
    console.error('Error fetching managed tours:', error);
    res.status(500).json({
      success: false,
      message: 'Không thể tải danh sách tour quản lý'
    });
  }
};

export const updateTourStatus = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: errors.array()[0]?.msg || 'Dữ liệu tạm ngưng tour không hợp lệ',
      errors: errors.array()
    });
  }

  try {
    const { status, reason = '' } = req.body;
    const tour = await Tour.findById(req.params.id);

    if (!tour) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy tour'
      });
    }

    if (tour.status === status) {
      return res.status(200).json({
        success: true,
        message: status === 'suspended' ? 'Tour đã ở trạng thái tạm ngưng' : 'Tour đang hoạt động',
        data: tour
      });
    }

    tour.status = status;
    if (status === 'suspended') {
      tour.suspensionReason = reason.trim();
      tour.suspendedAt = new Date();
      tour.suspendedBy = req.user._id;
    } else {
      tour.suspensionReason = '';
      tour.suspendedAt = null;
      tour.suspendedBy = null;
    }

    await tour.save();
    await tour.populate('suspendedBy', 'username email');

    res.status(200).json({
      success: true,
      message: status === 'suspended' ? 'Đã tạm ngưng tour' : 'Đã kích hoạt lại tour',
      data: tour
    });
  } catch (error) {
    console.error('Error updating tour status:', error);
    res.status(500).json({
      success: false,
      message: 'Không thể cập nhật trạng thái tour'
    });
  }
};
