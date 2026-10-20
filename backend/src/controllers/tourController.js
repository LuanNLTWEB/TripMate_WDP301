import Tour from '../models/Tour.js';
import TourCategory from '../models/TourCategory.js';
import User from '../models/User.js';
import Booking from '../models/Booking.js';
import Departure from '../models/Departure.js';
import { validationResult } from 'express-validator';

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const getFavoriteTours = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate({
      path: 'favoriteTours',
      match: { status: 'active' }
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
      status: 'active'
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
    const filters = [{ status: 'active' }];

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
      filters.push({
        $or: [
          { destinationLocation: { $regex: safeDestination, $options: 'i' } },
          { location: { $regex: safeDestination, $options: 'i' } }
        ]
      });
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
      .select('-itinerary')
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
    const tour = await Tour.findById(req.params.id)
      .populate('categoryId', 'name')
      .populate('providerId', 'username email phone');

    if (!tour) {
      return res.status(404).json({
        success: false,
        message: 'Tour not found'
      });
    }

    // Nếu tour chưa active, chỉ staff hoặc nhà cung cấp sở hữu tour được xem.
    if (tour.status !== 'active') {
      const isPrivileged = req.user && (
        req.user.role === 'staff' ||
        (req.user.role === 'tourProvider' && tour.providerId && (
          (tour.providerId._id && tour.providerId._id.equals(req.user._id)) ||
          tour.providerId.equals?.(req.user._id)
        ))
      );

      if (!isPrivileged) {
        return res.status(404).json({
          success: false,
          message: 'Tour not found'
        });
      }
    }

    const providerId = tour.providerId?._id || tour.providerId;
    const isOwner = req.user?.role === 'tourProvider'
      && providerId
      && String(providerId) === String(req.user._id);
    const canViewSchedule = req.user?.role === 'customer' || isOwner;
    const responseTour = tour.toObject();
    if (!canViewSchedule) delete responseTour.itinerary;

    res.status(200).json({
      success: true,
      data: responseTour
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
      filters.push({ status: 'active' });
    } else if (status === 'pending') {
      filters.push({ status: 'pending' });
    } else if (status === 'needs_revision') {
      filters.push({ status: 'needs_revision' });
    } else if (status === 'rejected') {
      filters.push({ status: 'rejected' });
    } else {
      // 'all' — không hiện pending, chỉ hiện active/suspended/needs_revision/rejected
      filters.push({ status: { $in: ['active', 'suspended', 'needs_revision', 'rejected'] } });
    }

    const query = filters.length > 0 ? { $and: filters } : {};
    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 100);
    const startIndex = (pageNum - 1) * limitNum;
    const [total, tours] = await Promise.all([
      Tour.countDocuments(query),
      Tour.find(query)
        .populate('suspendedBy', 'username email')
        .populate('rejectedBy', 'username email')
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

export const getManagedTourById = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: errors.array()[0]?.msg || 'Mã tour không hợp lệ',
      errors: errors.array()
    });
  }

  try {
    const tour = await Tour.findById(req.params.id)
      .populate('categoryId', 'name')
      .populate('suspendedBy', 'username email')
      .populate('revisionRequestedBy', 'username email')
      .populate('rejectedBy', 'username email');

    if (!tour) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy tour'
      });
    }

    res.status(200).json({
      success: true,
      data: tour
    });
  } catch (error) {
    console.error('Error fetching managed tour by ID:', error);

    if (error.name === 'CastError') {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy tour'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Không thể tải thông tin tour'
    });
  }
};

export const updateTourStatus = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: errors.array()[0]?.msg || 'Dữ liệu cập nhật trạng thái tour không hợp lệ',
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
        message: status === 'suspended'
          ? 'Tour đã ở trạng thái tạm ngưng'
          : status === 'rejected'
            ? 'Tour đã bị từ chối'
            : 'Tour đang hoạt động',
        data: tour
      });
    }

    const previousStatus = tour.status;
    tour.status = status;
    if (status === 'suspended') {
      tour.suspensionReason = reason.trim();
      tour.suspendedAt = new Date();
      tour.suspendedBy = req.user._id;
    } else if (status === 'rejected') {
      tour.rejectionReason = reason.trim();
      tour.rejectedAt = new Date();
      tour.rejectedBy = req.user._id;
    } else {
      tour.suspensionReason = '';
      tour.suspendedAt = null;
      tour.suspendedBy = null;
      tour.rejectionReason = '';
      tour.rejectedAt = null;
      tour.rejectedBy = null;
      tour.revisionNote = '';
      tour.revisionRequestedAt = null;
      tour.revisionRequestedBy = null;
    }

    await tour.save();
    await tour.populate([
      { path: 'suspendedBy', select: 'username email' },
      { path: 'rejectedBy', select: 'username email' }
    ]);

    let message = 'Đã cập nhật trạng thái tour';
    if (status === 'suspended') {
      message = 'Đã tạm ngưng tour';
    } else if (status === 'rejected') {
      message = 'Đã từ chối duyệt tour';
    } else if (status === 'active') {
      message = (previousStatus === 'pending' || previousStatus === 'needs_revision')
        ? 'Đã phê duyệt tour thành công'
        : 'Đã kích hoạt lại tour';
    }

    res.status(200).json({
      success: true,
      message,
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

export const requestTourRevision = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: errors.array()[0]?.msg || 'Dữ liệu không hợp lệ',
      errors: errors.array()
    });
  }

  try {
    const tour = await Tour.findById(req.params.id);

    if (!tour) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy tour'
      });
    }

    if (tour.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Chỉ có thể yêu cầu chỉnh sửa tour đang ở trạng thái chờ duyệt'
      });
    }

    tour.status = 'needs_revision';
    tour.revisionNote = req.body.note.trim();
    tour.revisionRequestedAt = new Date();
    tour.revisionRequestedBy = req.user._id;

    await tour.save();
    await tour.populate('revisionRequestedBy', 'username email');

    res.status(200).json({
      success: true,
      message: 'Đã gửi yêu cầu chỉnh sửa tour',
      data: tour
    });
  } catch (error) {
    console.error('Error requesting tour revision:', error);
    res.status(500).json({
      success: false,
      message: 'Không thể gửi yêu cầu chỉnh sửa'
    });
  }
};

export const createTour = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: errors.array()[0]?.msg || 'Dữ liệu tour không hợp lệ',
      errors: errors.array()
    });
  }

  try {
    const {
      title,
      description,
      location,
      departureLocation,
      destinationLocation,
      price,
      duration,
      availableSeats = 0,
      categoryId = null,
      images = []
    } = req.body;

    const tour = await Tour.create({
      title,
      description,
      location,
      departureLocation,
      destinationLocation,
      price: Number(price),
      duration,
      availableSeats: Number(availableSeats) || 0,
      categoryId: categoryId || null,
      images: Array.isArray(images) ? images : [],
      status: 'pending',
      providerId: req.user._id
    });

    res.status(201).json({
      success: true,
      message: 'Tạo tour thành công. Tour đang chờ nhân viên kiểm duyệt.',
      data: tour
    });
  } catch (error) {
    console.error('Error creating tour:', error);
    res.status(500).json({
      success: false,
      message: 'Không thể tạo tour mới'
    });
  }
};

export const getProviderTours = async (req, res) => {
  try {
    const {
      search,
      status = 'all',
      page = 1,
      limit = 10
    } = req.query;

    const filters = [{ providerId: req.user._id }];

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

    if (status && status !== 'all') {
      filters.push({ status });
    }

    const query = filters.length > 0 ? { $and: filters } : {};
    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 100);
    const startIndex = (pageNum - 1) * limitNum;

    const [total, tours] = await Promise.all([
      Tour.countDocuments(query),
      Tour.find(query)
        .populate('categoryId', 'name')
        .populate('rejectedBy', 'username email')
        .populate('revisionRequestedBy', 'username email')
        .sort({ createdAt: -1 })
        .skip(startIndex)
        .limit(limitNum)
    ]);

    res.status(200).json({
      success: true,
      count: tours.length,
      total,
      totalPages: Math.ceil(total / limitNum) || 1,
      currentPage: pageNum,
      data: tours
    });
  } catch (error) {
    console.error('Error fetching provider tours:', error);
    res.status(500).json({
      success: false,
      message: 'Không thể tải danh sách tour của nhà cung cấp'
    });
  }
};

export const getProviderTourById = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: errors.array()[0]?.msg || 'Mã tour không hợp lệ',
      errors: errors.array()
    });
  }

  try {
    const tour = await Tour.findById(req.params.id)
      .populate('categoryId', 'name')
      .populate('providerId', 'username email phone');

    if (!tour) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy tour'
      });
    }

    if (!tour.providerId || !tour.providerId._id.equals(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền truy cập tour này'
      });
    }

    res.status(200).json({
      success: true,
      data: tour
    });
  } catch (error) {
    console.error('Error fetching provider tour by ID:', error);
    res.status(500).json({
      success: false,
      message: 'Không thể tải thông tin tour'
    });
  }
};

export const updateProviderTour = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: errors.array()[0]?.msg || 'Dữ liệu cập nhật tour không hợp lệ',
      errors: errors.array()
    });
  }

  try {
    const tour = await Tour.findById(req.params.id);
    if (!tour) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy tour' });
    }

    if (!tour.providerId || !tour.providerId.equals(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền cập nhật tour này'
      });
    }

    const categoryId = req.body.categoryId || null;
    if (categoryId) {
      const categoryExists = await TourCategory.findById(categoryId).select('_id').lean();
      if (!categoryExists) {
        return res.status(400).json({
          success: false,
          message: 'Danh mục tour không tồn tại'
        });
      }
    }

    const normalized = {
      title: req.body.title.trim(),
      description: req.body.description.trim(),
      location: req.body.location.trim(),
      departureLocation: req.body.departureLocation.trim(),
      destinationLocation: req.body.destinationLocation.trim(),
      duration: req.body.duration.trim(),
      price: Number(req.body.price),
      availableSeats: Number(req.body.availableSeats),
      categoryId,
      images: [...new Set(req.body.images.map((image) => image.trim()))]
    };
    const currentCategoryId = String(tour.categoryId?._id || tour.categoryId || '');
    const nextCategoryId = String(categoryId || '');
    const hasChanges = [
      'title',
      'description',
      'location',
      'departureLocation',
      'destinationLocation',
      'duration'
    ].some((field) => String(tour[field] || '') !== normalized[field])
      || Number(tour.price) !== normalized.price
      || Number(tour.availableSeats) !== normalized.availableSeats
      || currentCategoryId !== nextCategoryId
      || JSON.stringify(tour.images || []) !== JSON.stringify(normalized.images);

    if (!hasChanges) {
      await tour.populate('categoryId', 'name');
      return res.status(200).json({
        success: true,
        message: 'Thông tin tour không có thay đổi.',
        requiresReview: false,
        data: tour
      });
    }

    const requestedSeats = normalized.availableSeats;
    const [confirmedSeatsResult] = await Booking.aggregate([
      { $match: { tourId: tour._id, status: 'confirmed' } },
      { $group: { _id: null, seats: { $sum: '$numberOfPeople' } } }
    ]);
    const confirmedSeats = confirmedSeatsResult?.seats || 0;
    if (requestedSeats < confirmedSeats) {
      return res.status(409).json({
        success: false,
        message: `Số chỗ không được thấp hơn ${confirmedSeats} chỗ đã được xác nhận đặt tour`,
        confirmedSeats
      });
    }

    const previousStatus = tour.status;

    Object.assign(tour, normalized);

    const shouldResubmit = ['active', 'needs_revision', 'rejected'].includes(previousStatus);
    if (shouldResubmit) {
      tour.status = 'pending';
      tour.revisionNote = '';
      tour.revisionRequestedAt = null;
      tour.revisionRequestedBy = null;
      tour.rejectionReason = '';
      tour.rejectedAt = null;
      tour.rejectedBy = null;
    }

    await tour.save();
    await tour.populate('categoryId', 'name');

    return res.status(200).json({
      success: true,
      message: shouldResubmit
        ? 'Cập nhật tour thành công. Tour đã được gửi lại để kiểm duyệt.'
        : 'Cập nhật thông tin tour thành công.',
      requiresReview: shouldResubmit,
      confirmedSeats,
      data: tour
    });
  } catch (error) {
    console.error('Error updating provider tour:', error);
    return res.status(500).json({
      success: false,
      message: 'Không thể cập nhật thông tin tour'
    });
  }
};

export const setTourDetails = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: errors.array()[0]?.msg || 'Dữ liệu chi tiết tour không hợp lệ',
      errors: errors.array()
    });
  }

  try {
    const tour = await Tour.findById(req.params.id);
    if (!tour) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy tour'
      });
    }

    if (!tour.providerId || !tour.providerId.equals(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền thiết lập chi tiết cho tour này'
      });
    }

    const {
      itinerary,
      includedServices,
      excludedServices,
      cancellationPolicy,
      notes
    } = req.body;

    if (itinerary !== undefined) {
      tour.itinerary = Array.isArray(itinerary) ? itinerary : [];
    }
    if (includedServices !== undefined) {
      tour.includedServices = Array.isArray(includedServices)
        ? includedServices.map((s) => String(s).trim()).filter(Boolean)
        : [];
    }
    if (excludedServices !== undefined) {
      tour.excludedServices = Array.isArray(excludedServices)
        ? excludedServices.map((s) => String(s).trim()).filter(Boolean)
        : [];
    }
    if (cancellationPolicy !== undefined) {
      tour.cancellationPolicy = String(cancellationPolicy || '').trim();
    }
    if (notes !== undefined) {
      tour.notes = String(notes || '').trim();
    }

    await tour.save();
    await tour.populate([
      { path: 'categoryId', select: 'name' },
      { path: 'providerId', select: 'username email phone' }
    ]);

    res.status(200).json({
      success: true,
      message: 'Thiết lập chi tiết tour thành công',
      data: tour
    });
  } catch (error) {
    console.error('Error setting tour details:', error);
    res.status(500).json({
      success: false,
      message: 'Không thể thiết lập chi tiết tour'
    });
  }
};

/**
 * Create a new schedule day item for a tour (Provider or Admin)
 * @route POST /api/tours/:id/schedule
 * @access Provider, Admin
 */
export const createTourSchedule = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: errors.array()[0]?.msg || 'Dữ liệu lịch trình tour không hợp lệ',
      errors: errors.array()
    });
  }

  try {
    const tour = await Tour.findById(req.params.id);
    if (!tour) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy tour'
      });
    }

    if (!tour.providerId || !tour.providerId.equals(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền quản lý lịch trình của tour này'
      });
    }

    const { title, description, day, meals } = req.body;

    const currentItinerary = Array.isArray(tour.itinerary) ? tour.itinerary : [];
    const targetDay = (day !== undefined && day !== null && day !== '')
      ? Number(day)
      : (currentItinerary.length > 0 ? Math.max(...currentItinerary.map((i) => i.day || 0)) + 1 : 1);

    if (currentItinerary.some((item) => item.day === targetDay)) {
      return res.status(409).json({
        success: false,
        message: `Lịch trình Ngày ${targetDay} đã tồn tại`
      });
    }

    const cleanMeals = Array.isArray(meals)
      ? meals.map((m) => String(m).trim()).filter(Boolean)
      : [];

    const newSchedule = {
      day: targetDay,
      title: String(title).trim(),
      description: String(description).trim(),
      meals: cleanMeals
    };

    tour.itinerary.push(newSchedule);
    tour.itinerary.sort((a, b) => a.day - b.day);

    await tour.save();

    const createdItem = tour.itinerary.find(
      (item) => item.day === targetDay && item.title === newSchedule.title
    ) || tour.itinerary[tour.itinerary.length - 1];

    res.status(201).json({
      success: true,
      message: `Đã thêm lịch trình Ngày ${targetDay} thành công`,
      data: createdItem,
      itinerary: tour.itinerary
    });
  } catch (error) {
    console.error('Error creating tour schedule:', error);
    res.status(500).json({
      success: false,
      message: 'Không thể tạo lịch trình tour'
    });
  }
};

/**
 * Update one schedule day of a provider-owned tour.
 * @route PUT /api/tours/:id/schedule/:scheduleId
 * @access Provider owner
 */
export const updateTourSchedule = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: errors.array()[0]?.msg || 'Dữ liệu lịch trình tour không hợp lệ',
      errors: errors.array()
    });
  }

  try {
    const tour = await Tour.findById(req.params.id);
    if (!tour) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy tour' });
    }

    if (!tour.providerId || !tour.providerId.equals(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền cập nhật lịch trình của tour này'
      });
    }

    const schedule = tour.itinerary.find(
      (item) => String(item._id) === String(req.params.scheduleId)
    );
    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy ngày lịch trình'
      });
    }

    const targetDay = Number(req.body.day);
    const duplicateDay = tour.itinerary.some(
      (item) => String(item._id) !== String(schedule._id) && item.day === targetDay
    );
    if (duplicateDay) {
      return res.status(409).json({
        success: false,
        message: `Lịch trình Ngày ${targetDay} đã tồn tại`
      });
    }

    schedule.day = targetDay;
    schedule.title = req.body.title.trim();
    schedule.description = req.body.description.trim();
    schedule.meals = Array.isArray(req.body.meals)
      ? [...new Set(req.body.meals.map((meal) => String(meal).trim()).filter(Boolean))]
      : [];
    tour.itinerary.sort((first, second) => first.day - second.day);
    await tour.save();

    return res.status(200).json({
      success: true,
      message: `Đã cập nhật lịch trình Ngày ${targetDay}`,
      data: schedule,
      itinerary: tour.itinerary
    });
  } catch (error) {
    console.error('Error updating tour schedule:', error);
    return res.status(500).json({
      success: false,
      message: 'Không thể cập nhật lịch trình tour'
    });
  }
};

/**
 * Delete one schedule day of a provider-owned tour.
 * @route DELETE /api/tours/:id/schedule/:scheduleId
 * @access Provider owner
 */
export const deleteTourSchedule = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: errors.array()[0]?.msg || 'Mã lịch trình không hợp lệ',
      errors: errors.array()
    });
  }

  try {
    const tour = await Tour.findById(req.params.id);
    if (!tour) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy tour' });
    }

    if (!tour.providerId || !tour.providerId.equals(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền xóa lịch trình của tour này'
      });
    }

    const scheduleIndex = tour.itinerary.findIndex(
      (item) => String(item._id) === String(req.params.scheduleId)
    );
    if (scheduleIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy ngày lịch trình'
      });
    }

    const [removedSchedule] = tour.itinerary.splice(scheduleIndex, 1);
    await tour.save();

    return res.status(200).json({
      success: true,
      message: `Đã xóa lịch trình Ngày ${removedSchedule.day}`,
      scheduleId: req.params.scheduleId,
      itinerary: tour.itinerary
    });
  } catch (error) {
    console.error('Error deleting tour schedule:', error);
    return res.status(500).json({
      success: false,
      message: 'Không thể xóa lịch trình tour'
    });
  }
};

/**
 * Cập nhật số chỗ của tour thuộc nhà cung cấp.
 * @route PUT /api/tours/:id/capacity
 * @access Provider
 */
export const updateTourCapacity = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: errors.array()[0]?.msg || 'Dữ liệu số chỗ không hợp lệ',
      errors: errors.array()
    });
  }

  try {
    const tour = await Tour.findById(req.params.id);
    if (!tour) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy tour'
      });
    }

    const isOwner = tour.providerId && tour.providerId.equals(req.user._id);
    if (!isOwner) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền cập nhật số chỗ của tour này'
      });
    }

    const requestedSeats = Number(req.body.availableSeats);

    // Số chỗ đã bị cam kết trong các booking đã xác nhận
    const [confirmedAgg] = await Booking.aggregate([
      { $match: { tourId: tour._id, status: 'confirmed' } },
      { $group: { _id: null, seats: { $sum: '$numberOfPeople' } } }
    ]);
    const confirmedSeats = confirmedAgg?.seats || 0;

    if (requestedSeats < confirmedSeats) {
      return res.status(409).json({
        success: false,
        message: `Số chỗ không được thấp hơn ${confirmedSeats} chỗ đã được xác nhận đặt tour`,
        confirmedSeats
      });
    }

    if (requestedSeats === tour.availableSeats) {
      return res.status(200).json({
        success: true,
        message: 'Số chỗ không thay đổi',
        data: {
          _id: tour._id,
          availableSeats: tour.availableSeats,
          confirmedSeats
        }
      });
    }

    tour.availableSeats = requestedSeats;
    await tour.save();

    res.status(200).json({
      success: true,
      message: 'Cập nhật số chỗ thành công',
      data: {
        _id: tour._id,
        availableSeats: tour.availableSeats,
        confirmedSeats
      }
    });
  } catch (error) {
    console.error('Error updating tour capacity:', error);
    res.status(500).json({
      success: false,
      message: 'Không thể cập nhật số chỗ tour'
    });
  }
};

/**
 * Update the owning provider's tour price.
 * @route PUT /api/tours/:id/price
 * @access Private (tourProvider)
 */
export const updateTourPrice = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: errors.array()[0]?.msg || 'Giá tour không hợp lệ',
      errors: errors.array()
    });
  }

  try {
    const tour = await Tour.findById(req.params.id);
    if (!tour) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy tour'
      });
    }

    const isOwner = tour.providerId && tour.providerId.equals(req.user._id);
    if (!isOwner) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền cập nhật giá của tour này'
      });
    }

    const newPrice = Number(req.body.price);
    if (isNaN(newPrice) || newPrice <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Giá tour mới phải là số hợp lệ lớn hơn 0'
      });
    }

    tour.price = newPrice;
    await tour.save();

    res.status(200).json({
      success: true,
      message: 'Cập nhật giá tour thành công',
      data: {
        _id: tour._id,
        price: tour.price
      }
    });
  } catch (error) {
    console.error('Error updating tour price:', error);
    res.status(500).json({
      success: false,
      message: 'Không thể cập nhật giá tour'
    });
  }
};

/**
 * Get tour schedule (itinerary)
 * @route GET /api/tours/:id/schedule
 * @access Customer for active tours; owning provider for own tours
 */
export const getTourSchedule = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: errors.array()[0]?.msg || 'Mã tour không hợp lệ',
      errors: errors.array()
    });
  }

  try {
    const tour = await Tour.findById(req.params.id)
      .select('title duration itinerary location departureLocation destinationLocation status providerId');
    if (!tour) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy lịch trình tour'
      });
    }

    const isOwner = req.user.role === 'tourProvider'
      && tour.providerId
      && String(tour.providerId) === String(req.user._id);

    if (req.user.role === 'tourProvider' && !isOwner) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy lịch trình tour'
      });
    }

    if (tour.status !== 'active' && !isOwner) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy lịch trình tour'
        });
    }

    const sortedItinerary = [...(tour.itinerary || [])].sort((a, b) => a.day - b.day);

    res.status(200).json({
      success: true,
      data: sortedItinerary,
      tour: {
        _id: tour._id,
        title: tour.title,
        duration: tour.duration,
        departureLocation: tour.departureLocation,
        destinationLocation: tour.destinationLocation || tour.location
      }
    });
  } catch (error) {
    console.error('Error fetching tour schedule:', error);
    res.status(500).json({
      success: false,
      message: 'Không tìm thấy lịch trình tour'
    });
  }
};

/**
 * Cập nhật điểm & thông tin khởi hành của tour (UC-42 - Update Tour Departure)
 * @route PATCH /api/tours/:id/departure
 * @access Private (tourProvider)
 */
export const updateTourDeparture = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: errors.array()[0]?.msg || 'Thông tin khởi hành không hợp lệ',
      errors: errors.array()
    });
  }

  try {
    const tour = await Tour.findById(req.params.id);
    if (!tour) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy tour'
      });
    }

    const isOwner = tour.providerId && tour.providerId.equals(req.user._id);
    if (!isOwner) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền cập nhật thông tin khởi hành của tour này'
      });
    }

    const { departureLocation, destinationLocation, departureDate, note } = req.body;

    const dest = destinationLocation !== undefined ? destinationLocation.trim() : tour.destinationLocation;
    if (departureLocation && dest && departureLocation.trim().toLowerCase() === dest.toLowerCase()) {
      return res.status(400).json({
        success: false,
        message: 'Điểm khởi hành không được trùng với điểm đến'
      });
    }

    if (departureLocation) {
      tour.departureLocation = departureLocation.trim();
    }
    if (destinationLocation !== undefined) {
      tour.destinationLocation = destinationLocation.trim();
    }

    let createdDeparture = null;
    if (departureDate) {
      const depDate = new Date(departureDate);
      const LEAD_TIME_MS = 24 * 60 * 60 * 1000;
      if (depDate.getTime() - Date.now() < LEAD_TIME_MS) {
        return res.status(400).json({
          success: false,
          message: 'Ngày khởi hành phải cách thời điểm hiện tại ít nhất 24 giờ'
        });
      }


      const startOfDay = new Date(depDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(startOfDay);
      endOfDay.setDate(endOfDay.getDate() + 1);

      const existing = await Departure.findOne({
        tourId: tour._id,
        status: 'scheduled',
        departureDate: { $gte: startOfDay, $lt: endOfDay }
      });

      if (!existing) {
        createdDeparture = await Departure.create({
          tourId: tour._id,
          providerId: tour.providerId,
          departureDate: depDate,
          availableSeats: tour.availableSeats || 0,
          price: tour.price || null,
          note: note ? note.trim() : ''
        });
      }
    }

    await tour.save();

    return res.status(200).json({
      success: true,
      message: 'Cập nhật thông tin khởi hành thành công',
      data: tour,
      departure: createdDeparture
    });
  } catch (error) {
    console.error('Error updating tour departure:', error);
    return res.status(500).json({
      success: false,
      message: 'Không thể cập nhật thông tin khởi hành'
    });
  }
};
