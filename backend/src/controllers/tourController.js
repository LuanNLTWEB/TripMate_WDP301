/**
 * Tour Management — các use case do Toan phụ trách
 *  - UC-25 View Tour Details
 *  - UC-30 View Favorite Tours
 *  - UC-35 View Approval Status
 *  - UC-45 Update Tour Capacity
 */
import Tour from '../models/Tour.js';
import TourCategory from '../models/TourCategory.js';
import User from '../models/User.js';
import Booking from '../models/Booking.js';
import Departure from '../models/Departure.js';
import TourSubmission from '../models/TourSubmission.js';
import Review from '../models/Review.js';
import { validationResult } from 'express-validator';

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// START UC-24 Duplicate Tour
const DUPLICATE_TITLE_SUFFIX = ' (Bản sao)';
const TOUR_TITLE_MAX_LENGTH = 100;

/**
 * UC-24 – Duplicate Tour: tên tour mới thêm hậu tố "(Bản sao)".
 * Phức tạp: Tour.title bị giới hạn 100 ký tự nên phải cắt phần tên gốc trước khi
 * ghép hậu tố, tránh lỗi validation khi tour gốc có tên dài.
 */
const buildDuplicateTitle = (title) => {
  const baseTitle = String(title || '').trim() || 'Tour';
  const maxBaseLength = TOUR_TITLE_MAX_LENGTH - DUPLICATE_TITLE_SUFFIX.length;
  return `${baseTitle.slice(0, maxBaseLength).trim()}${DUPLICATE_TITLE_SUFFIX}`;
};

/**
 * Bỏ toàn bộ _id của subdocument (kể cả bản ghi lồng bên trong như hoạt động của
 * lịch trình) để Mongoose sinh id mới khi tạo tour. Không dùng chung id giữa hai tour.
 */
const stripSubdocumentIds = (value) => {
  if (Array.isArray(value)) {
    return value.map(stripSubdocumentIds);
  }
  if (value && typeof value === 'object') {
    return Object.entries(value).reduce((result, [key, nestedValue]) => {
      if (key !== '_id') {
        result[key] = stripSubdocumentIds(nestedValue);
      }
      return result;
    }, {});
  }
  return value;
};

/**
 * Sao chép lịch trình khung (Tour.itinerary) sang tour mới.
 * Phức tạp:
 *  - Bỏ các ngày đã xóa mềm: chúng không còn thuộc lịch trình đang hoạt động.
 *  - Deep clone bằng JSON để mảng/bản ghi lồng bên trong không chia sẻ tham chiếu với
 *    document gốc (sửa tour mới không ảnh hưởng tour cũ).
 *  - Xóa _id ở mọi cấp để Mongoose sinh id mới cho từng ngày lịch trình và từng hoạt
 *    động trực thuộc, tuyệt đối không dùng chung id giữa hai tour.
 */
const cloneTourSchedule = (itinerary = []) => (Array.isArray(itinerary) ? itinerary : [])
  .filter((day) => !day.isDeleted)
  .map((day) => {
    const clonedDay = stripSubdocumentIds(JSON.parse(JSON.stringify(day)));
    delete clonedDay.isDeleted;
    delete clonedDay.deletedAt;
    return clonedDay;
  });
// END UC-24 Duplicate Tour

// START UC-30 View Favorite Tours
/**
 * UC-30 – View Favorite Tours (khách xem danh sách tour đã lưu yêu thích).
 *
 * Đọc mảng favoriteTours của user hiện tại và populate sang collection Tour.
 *
 * Phần phức tạp:
 *  - populate kèm `match: { status: 'active' }` nên tour đã bị ngưng/duyệt lại sẽ
 *    tự rơi khỏi kết quả, không cần lọc thêm ở client.
 *  - filter(Boolean) để loại các phần tử null còn sót lại khi tour tham chiếu đã bị xóa.
 *  - Trả cả `favoriteTourIds` (mảng id) để UI tô trạng thái tim ở màn danh sách tour.
 */
export const getFavoriteTours = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate({
      path: 'favoriteTours',
      match: { status: 'active', isDeleted: { $ne: true } }
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

// END UC-30 View Favorite Tours

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
    if (!tour || tour.isDeleted) {
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
    const filters = [{ status: 'active' }, { isDeleted: { $ne: true } }];

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

// START UC-25 View Tour Details
/**
 * UC-25 – View Tour Details (Guest/Customer xem chi tiết một tour).
 *
 * Tìm tour theo id, populate category và provider rồi trả về object thuần.
 *
 * Phần phức tạp:
 *  - Tour chưa ở trạng thái active chỉ staff hoặc provider sở hữu tour được xem;
 *    các trường hợp khác trả 404 (không trả 403) để không lộ sự tồn tại của tour.
 *  - Lịch trình chi tiết (itinerary) bị xóa khỏi response khi người xem không phải
 *    customer hoặc provider sở hữu (BR-90 – provider privacy).
 *  - providerId có thể là ObjectId thô hoặc đã populate, nên phải so sánh cả hai dạng.
 *  - CastError của id sai định dạng được quy về 404 thay vì 500.
 */
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

    if (!tour || tour.isDeleted) {
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
    if (!canViewSchedule) {
      delete responseTour.itinerary;
    } else {
      // UC39 - lịch trình đã xóa mềm không hiển thị trong danh sách đang hoạt động.
      responseTour.itinerary = (responseTour.itinerary || [])
        .filter((item) => !item.isDeleted);
    }

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

// END UC-25 View Tour Details

export const getManagedTours = async (req, res) => {
  try {
    const {
      search,
      status = 'all',
      page = 1,
      limit = 10
    } = req.query;
    const filters = [{ isDeleted: { $ne: true } }];

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
      const pendingSubmissionTourIds = await TourSubmission.distinct('tourId', {
        status: 'pending',
        isDeleted: { $ne: true }
      });
      filters.push({ _id: { $in: pendingSubmissionTourIds } });
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

    if (!tour || tour.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy tour'
      });
    }

    // UC39 - ẩn các ngày lịch trình đã xóa mềm khỏi màn hình quản lý tour.
    tour.itinerary = (tour.itinerary || []).filter((item) => !item.isDeleted);

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

    if (!tour || tour.isDeleted) {
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
    if (status === 'active' && previousStatus === 'pending') {
      const pendingSubmission = await TourSubmission.exists({
        tourId: tour._id,
        status: 'pending',
        isDeleted: { $ne: true }
      });

      if (!pendingSubmission) {
        return res.status(409).json({
          success: false,
          message: 'Tour này chưa có bài gửi duyệt đang chờ xử lý. Hãy gửi bài duyệt tour trước.'
        });
      }
    }

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

/**
 * Khôi phục tour đã bị tạm ngưng (UC Tour Moderation - Restore Tour).
 * @route PATCH /api/tours/:id/restore
 * @access Private (staff)
 */
export const restoreTour = async (req, res) => {
  try {
    const tour = await Tour.findById(req.params.id);

    if (!tour || tour.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy tour'
      });
    }

    if (tour.status !== 'suspended') {
      return res.status(409).json({
        success: false,
        message: 'Chỉ có thể khôi phục tour đang tạm ngưng'
      });
    }

    tour.status = 'active';
    tour.suspensionReason = '';
    tour.suspendedAt = null;
    tour.suspendedBy = null;
    await tour.save();
    await tour.populate([
      { path: 'suspendedBy', select: 'username email' },
      { path: 'rejectedBy', select: 'username email' }
    ]);

    return res.status(200).json({
      success: true,
      message: 'Đã kích hoạt lại tour',
      data: tour
    });
  } catch (error) {
    console.error('Error restoring tour:', error);
    return res.status(500).json({
      success: false,
      message: 'Không thể khôi phục tour'
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

    if (!tour || tour.isDeleted) {
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
      // Tour mới luôn là bản nháp; provider phải gửi yêu cầu duyệt (UC-128) để mở bán.
      status: 'draft',
      providerId: req.user._id
    });

    res.status(201).json({
      success: true,
      message: 'Tạo tour nháp thành công. Hãy gửi duyệt để tour được mở bán.',
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

// START UC-24 Duplicate Tour
/**
 * UC-24 – Duplicate Tour (provider nhân bản tour thuộc sở hữu của mình).
 *
 * @route POST /api/tours/:id/duplicate
 * @access Provider owner
 *
 * Phần phức tạp:
 *  - Kiểm tra quyền sở hữu ở backend (không chỉ ẩn nút ở frontend); tour không tồn tại
 *    hoặc đã xóa mềm trả 404, tour của provider khác trả 403.
 *  - Chỉ sao chép dữ liệu mô tả/cấu hình + lịch trình khung. KHÔNG sao chép dữ liệu
 *    giao dịch: Departure, Booking, Review, Favorite, averageRating, availableSeats
 *    hay lịch sử duyệt — số chỗ và điểm đánh giá của bản sao bắt đầu lại từ 0.
 *  - Tour mới luôn ở trạng thái 'draft' theo đúng quy trình UC-31 Create Tour, không tự
 *    động gửi duyệt/công khai.
 *  - Tour và lịch trình nằm chung một document nên Tour.create là một insert duy nhất:
 *    hoặc tạo đủ tour + schedule, hoặc không tạo gì — không thể sinh dữ liệu nhân bản
 *    dở dang, không cần transaction đa document.
 */
export const duplicateTour = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: errors.array()[0]?.msg || 'Mã tour không hợp lệ',
      errors: errors.array()
    });
  }

  try {
    const sourceTour = await Tour.findById(req.params.id);
    if (!sourceTour || sourceTour.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy tour'
      });
    }

    if (!sourceTour.providerId || !sourceTour.providerId.equals(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền nhân bản tour này'
      });
    }

    const duplicatedTour = await Tour.create({
      title: buildDuplicateTitle(sourceTour.title),
      description: sourceTour.description,
      location: sourceTour.location,
      departureLocation: sourceTour.departureLocation,
      destinationLocation: sourceTour.destinationLocation,
      price: sourceTour.price,
      duration: sourceTour.duration,
      images: [...(sourceTour.images || [])],
      // Không kế thừa sức chứa đang bán của tour gốc: tour nhân bản chưa mở bán chỗ nào,
      // provider phải cấu hình lại số chỗ (UC-45) trước khi gửi duyệt.
      availableSeats: 0,
      // Điểm đánh giá của tour gốc gắn với Review của tour đó, không thuộc bản sao.
      averageRating: 0,
      itinerary: cloneTourSchedule(sourceTour.itinerary),
      includedServices: [...(sourceTour.includedServices || [])],
      excludedServices: [...(sourceTour.excludedServices || [])],
      cancellationPolicy: sourceTour.cancellationPolicy,
      notes: sourceTour.notes,
      categoryId: sourceTour.categoryId?._id || sourceTour.categoryId || null,
      // Tour nháp theo UC-31; không kế thừa trạng thái duyệt hay lý do từ chối của tour gốc.
      status: 'draft',
      providerId: req.user._id
    });

    await duplicatedTour.populate([
      { path: 'categoryId', select: 'name' },
      { path: 'providerId', select: 'username email phone' }
    ]);

    return res.status(201).json({
      success: true,
      message: 'Nhân bản tour thành công',
      data: duplicatedTour
    });
  } catch (error) {
    console.error('Error duplicating tour:', error);
    return res.status(500).json({
      success: false,
      message: 'Không thể nhân bản tour'
    });
  }
};
// END UC-24 Duplicate Tour

// START UC-35 View Approval Status
/**
 * UC-35 – View Approval Status (provider xem trạng thái duyệt tour của mình).
 *
 * Trả danh sách tour thuộc provider đang đăng nhập kèm trạng thái duyệt để UI
 * hiển thị badge "Chờ kiểm duyệt / Cần chỉnh sửa / Bị từ chối / Tạm ngưng".
 *
 * Phần phức tạp:
 *  - Lọc theo status do staff cập nhật, tách khỏi filter tìm kiếm bằng $and để
 *    không ghi đè điều kiện providerId.
 *  - Populate rejectedBy và revisionRequestedBy để hiện người duyệt; các field
 *    rejectionReason/revisionNote đi kèm chính document tour.
 *  - Từ khóa tìm kiếm được escape trước khi đưa vào RegExp để tránh lỗi regex.
 */
export const getProviderTours = async (req, res) => {
  try {
    const {
      search,
      status = 'all',
      page = 1,
      limit = 10
    } = req.query;

    const filters = [{ providerId: req.user._id }, { isDeleted: { $ne: true } }];

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

// END UC-35 View Approval Status

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

    if (!tour || tour.isDeleted) {
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

    // UC39 - ẩn các ngày lịch trình đã xóa mềm khỏi màn hình chi tiết tour của provider.
    tour.itinerary = (tour.itinerary || []).filter((item) => !item.isDeleted);

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
    if (!tour || tour.isDeleted) {
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
    if (!tour || tour.isDeleted) {
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
      // UC39 - bảo toàn các ngày lịch trình đã xóa mềm khi ghi đè toàn bộ itinerary.
      const deletedSchedules = (tour.itinerary || []).filter((item) => item.isDeleted);
      const nextItinerary = Array.isArray(itinerary) ? itinerary : [];
      tour.itinerary = [...nextItinerary, ...deletedSchedules];
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
    if (!tour || tour.isDeleted) {
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

    // UC39 - chỉ tính các ngày đang hoạt động khi đánh số và kiểm tra trùng ngày.
    const currentItinerary = (Array.isArray(tour.itinerary) ? tour.itinerary : [])
      .filter((item) => !item.isDeleted);
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

    const activeItinerary = tour.itinerary.filter((item) => !item.isDeleted);
    const createdItem = activeItinerary.find(
      (item) => item.day === targetDay && item.title === newSchedule.title
    ) || activeItinerary[activeItinerary.length - 1];

    res.status(201).json({
      success: true,
      message: `Đã thêm lịch trình Ngày ${targetDay} thành công`,
      data: createdItem,
      itinerary: tour.itinerary.filter((item) => !item.isDeleted)
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
    if (!tour || tour.isDeleted) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy tour' });
    }

    if (!tour.providerId || !tour.providerId.equals(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền cập nhật lịch trình của tour này'
      });
    }

    const schedule = tour.itinerary.find(
      (item) => String(item._id) === String(req.params.scheduleId) && !item.isDeleted
    );
    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy ngày lịch trình'
      });
    }

    const targetDay = Number(req.body.day);
    const duplicateDay = tour.itinerary.some(
      (item) => !item.isDeleted
        && String(item._id) !== String(schedule._id)
        && item.day === targetDay
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
    if (!tour || tour.isDeleted) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy tour' });
    }

    if (!tour.providerId || !tour.providerId.equals(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền xóa lịch trình của tour này'
      });
    }

    // Tour đang hoạt động (đang hiển thị cho khách): phải tạm ngưng trước khi xóa lịch trình,
    // tránh thay đổi nội dung công khai mà khách đang xem/đã đặt.
    if (tour.status === 'active') {
      return res.status(409).json({
        success: false,
        message: 'Tour đang hoạt động. Vui lòng tạm ngưng tour trước khi xóa lịch trình.'
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

    const schedule = tour.itinerary[scheduleIndex];
    if (schedule.isDeleted) {
      return res.status(409).json({
        success: false,
        message: 'Lịch trình này đã bị xóa trước đó'
      });
    }

    // Không xóa ngày cuối cùng còn hoạt động để tour vẫn có lịch trình tối thiểu.
    const activeSchedules = tour.itinerary.filter((item) => !item.isDeleted);
    if (activeSchedules.length <= 1) {
      return res.status(409).json({
        success: false,
        message: 'Không thể xóa lịch trình cuối cùng của tour. Vui lòng tạo lịch trình mới trước khi xóa ngày này.'
      });
    }

    // Kiểm tra dữ liệu liên quan: không xóa dây chuyền Tour Departure hoặc Booking.
    const [scheduledDepartures, activeBookings] = await Promise.all([
      Departure.countDocuments({ tourId: tour._id, status: 'scheduled' }),
      Booking.countDocuments({ tourId: tour._id, status: { $in: ['pending', 'confirmed'] } })
    ]);

    if (scheduledDepartures > 0 || activeBookings > 0) {
      return res.status(409).json({
        success: false,
        message: 'Không thể xóa lịch trình vì tour đang có lịch khởi hành hoặc đặt tour liên quan. Vui lòng hủy lịch khởi hành và xử lý các đặt tour trước khi xóa.',
        scheduledDepartures,
        activeBookings
      });
    }

    // BR: xóa mềm - giữ nguyên bản ghi ngày lịch trình, chỉ ẩn khỏi danh sách đang hoạt động.
    schedule.isDeleted = true;
    schedule.deletedAt = new Date();
    await tour.save();

    return res.status(200).json({
      success: true,
      message: `Đã xóa lịch trình Ngày ${schedule.day}`,
      scheduleId: schedule._id,
      itinerary: tour.itinerary.filter((item) => !item.isDeleted)
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
 * Xóa mềm tour thuộc nhà cung cấp (UC-34 - Delete Tour).
 * Tour được ẩn khỏi các truy vấn công khai, giữ nguyên booking/đánh giá/lịch trình.
 * @route DELETE /api/tours/:id
 * @access Provider owner
 */
export const deleteTour = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: errors.array()[0]?.msg || 'Mã tour không hợp lệ',
      errors: errors.array()
    });
  }

  try {
    const tour = await Tour.findById(req.params.id);
    if (!tour || tour.isDeleted) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy tour' });
    }

    if (!tour.providerId || !tour.providerId.equals(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền xóa tour này'
      });
    }

    if (tour.status === 'active') {
      return res.status(400).json({
        success: false,
        message: 'Không thể xóa tour đang hoạt động. Vui lòng tạm ngưng tour trước khi xóa.'
      });
    }

    const activeBookings = await Booking.countDocuments({
      tourId: tour._id,
      status: { $in: ['pending', 'confirmed'] }
    });
    if (activeBookings > 0) {
      return res.status(400).json({
        success: false,
        message: 'Không thể xóa tour đã có khách đặt. Tour chỉ được xóa khi không còn đặt tour đang chờ hoặc đã xác nhận.'
      });
    }

    // BR-COM-03 - xóa mềm, giữ nguyên bản ghi nghiệp vụ (booking, đánh giá, lịch trình);
    // BR-COM-04 - tour bị ẩn khỏi các truy vấn công khai.
    tour.isDeleted = true;
    tour.deletedAt = new Date();
    await tour.save();
    await User.updateMany({ favoriteTours: tour._id }, { $pull: { favoriteTours: tour._id } });

    return res.status(200).json({
      success: true,
      message: 'Xóa tour thành công',
      data: { _id: tour._id, isDeleted: tour.isDeleted }
    });
  } catch (error) {
    console.error('Error deleting tour:', error);
    return res.status(500).json({
      success: false,
      message: 'Không thể xóa tour'
    });
  }
};

/**
 * Cập nhật số chỗ của tour thuộc nhà cung cấp.
 * @route PUT /api/tours/:id/capacity
 * @access Provider
 */
// START UC-45 Update Tour Capacity
/**
 * UC-45 – Update Tour Capacity (provider thay đổi tổng số chỗ nhận khách).
 *
 * Phần phức tạp:
 *  - BR-51: aggregate tổng numberOfPeople của các booking 'confirmed' trước khi ghi,
 *    không cho hạ số chỗ xuống dưới số chỗ đã bán.
 *  - Chỉ tính booking 'confirmed' (không tính pending/cancelled) để khớp với
 *    nghiệp vụ giữ chỗ thực tế (BR-50).
 *  - Nếu số chỗ mới trùng số cũ thì trả 200 "không thay đổi" và bỏ qua save,
 *    tránh cập nhật updatedAt vô ích.
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

// END UC-45 Update Tour Capacity

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
      .select('title duration itinerary location departureLocation destinationLocation status providerId isDeleted');
    if (!tour || tour.isDeleted) {
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

    const sortedItinerary = [...(tour.itinerary || [])]
      .filter((item) => !item.isDeleted)
      .sort((a, b) => a.day - b.day);

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


/**
 * Kiểm tra chỗ trống và giá theo lịch khởi hành của tour (UC-27)
 * @route GET /api/tours/:id/availability
 * @access Public / Customer
 */
export const checkTourAvailability = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: errors.array()[0]?.msg || 'Mã tour không hợp lệ',
      errors: errors.array()
    });
  }

  try {
    const tour = await Tour.findById(req.params.id);
    if (!tour || tour.isDeleted || tour.status !== 'active') {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy tour hoặc tour hiện không hoạt động'
      });
    }

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const departures = await Departure.find({
      tourId: tour._id,
      status: 'scheduled',
      departureDate: { $gte: startOfToday }
    }).sort({ departureDate: 1 });

    const confirmedBookings = await Booking.find({
      tourId: tour._id,
      status: 'confirmed'
    }).select('departureDate numberOfPeople status');

    const toDateKey = (value) => {
      const d = new Date(value);
      if (Number.isNaN(d.getTime())) return '';
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const bookedByDate = {};
    confirmedBookings.forEach((booking) => {
      const key = toDateKey(booking.departureDate);
      if (key) {
        bookedByDate[key] = (bookedByDate[key] || 0) + Number(booking.numberOfPeople || 0);
      }
    });

    const tourSeats = Number(tour.availableSeats || 0);

    const departureList = departures.map((dep) => {
      const dateKey = toDateKey(dep.departureDate);
      const bookedSeats = bookedByDate[dateKey] || 0;
      const capacity = Math.min(Number(dep.availableSeats || 0), tourSeats + bookedSeats);
      const remainingSeats = Math.min(Math.max(0, capacity - bookedSeats), tourSeats);
      const price = tour.price;

      return {
        _id: dep._id,
        dateKey,
        departureDate: dep.departureDate,
        capacity,
        bookedSeats,
        remainingSeats,
        isAvailable: remainingSeats > 0,
        price,
        note: dep.note || ''
      };
    });

    let selectedDateAvailability = null;
    const requestedDate = req.query.date ? String(req.query.date).trim() : '';
    if (requestedDate) {
      const reqDateKey = toDateKey(requestedDate);
      if (!reqDateKey) {
        return res.status(400).json({
          success: false,
          message: 'Ngày khởi hành cần kiểm tra không hợp lệ'
        });
      }

      const matchedDeparture = departureList.find((item) => item.dateKey === reqDateKey);
      if (matchedDeparture) {
        selectedDateAvailability = matchedDeparture;
      } else {
        const bookedSeats = bookedByDate[reqDateKey] || 0;
        const remainingSeats = tourSeats;
        const capacity = remainingSeats + bookedSeats;
        selectedDateAvailability = {
          _id: null,
          dateKey: reqDateKey,
          departureDate: new Date(requestedDate),
          capacity,
          bookedSeats,
          remainingSeats,
          isAvailable: remainingSeats > 0,
          price: tour.price,
          note: ''
        };
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Kiểm tra tình trạng chỗ trống thành công',
      data: {
        tourId: tour._id,
        defaultPrice: tour.price,
        tourAvailableSeats: tour.availableSeats,
        departures: departureList,
        selectedDateAvailability
      }
    });
  } catch (error) {
    console.error('Error checking tour availability:', error);
    return res.status(500).json({
      success: false,
      message: 'Không thể kiểm tra tình trạng chỗ trống của tour'
    });
  }
};

// START UC-64 Compare Tours
/**
 * So sánh các tour du lịch (từ 2 đến 4 tour).
 * @route POST /api/tours/compare
 * @access Public (Guest, Customer, Provider, Staff)
 */
export const compareTours = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: errors.array()[0]?.msg || 'Dữ liệu so sánh tour không hợp lệ',
      errors: errors.array()
    });
  }

  try {
    const rawIds = req.body.tourIds || [];
    // Loại bỏ id trùng lặp
    const uniqueIds = Array.from(new Set(rawIds.map((id) => String(id))));

    if (uniqueIds.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng chọn ít nhất 2 tour khác nhau để so sánh'
      });
    }

    if (uniqueIds.length > 4) {
      return res.status(400).json({
        success: false,
        message: 'Chỉ có thể so sánh tối đa 4 tour cùng lúc'
      });
    }

    // Tìm các tour hợp lệ (status: 'active', isDeleted != true)
    const tours = await Tour.find({
      _id: { $in: uniqueIds },
      status: 'active',
      isDeleted: { $ne: true }
    })
      .populate('categoryId', 'name description')
      .populate('providerId', 'username email businessName');

    if (!tours || tours.length < 2) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy đủ ít nhất 2 tour đang hoạt động để thực hiện so sánh'
      });
    }

    const tourIdsFound = tours.map((t) => t._id);
    const [departures, reviewCounts] = await Promise.all([
      Departure.find({
        tourId: { $in: tourIdsFound },
        status: 'scheduled',
        departureDate: { $gte: new Date() }
      }).sort({ departureDate: 1 }),
      Review.aggregate([
        { $match: { tourId: { $in: tourIdsFound }, status: 'approved' } },
        { $group: { _id: '$tourId', count: { $sum: 1 } } }
      ])
    ]);

    const reviewMap = new Map();
    (reviewCounts || []).forEach((r) => reviewMap.set(String(r._id), r.count));

    const departuresMap = new Map();
    (departures || []).forEach((dep) => {
      const tid = String(dep.tourId);
      if (!departuresMap.has(tid)) departuresMap.set(tid, []);
      departuresMap.get(tid).push({
        _id: dep._id,
        departureDate: dep.departureDate,
        availableSeats: dep.availableSeats,
        price: dep.price || null
      });
    });

    // Giữ nguyên thứ tự theo uniqueIds mà client yêu cầu
    const orderedTours = uniqueIds
      .map((id) => tours.find((t) => String(t._id) === id))
      .filter(Boolean)
      .map((tour) => {
        const tid = String(tour._id);
        const tourObj = tour.toObject ? tour.toObject() : tour;
        const upcomingDeps = departuresMap.get(tid) || [];
        const activeItinerary = (tourObj.itinerary || []).filter((item) => !item.isDeleted);

        return {
          _id: tourObj._id,
          title: tourObj.title,
          description: tourObj.description,
          location: tourObj.location,
          departureLocation: tourObj.departureLocation,
          destinationLocation: tourObj.destinationLocation,
          price: tourObj.price,
          duration: tourObj.duration,
          images: tourObj.images || [],
          availableSeats: tourObj.availableSeats,
          includedServices: tourObj.includedServices || [],
          excludedServices: tourObj.excludedServices || [],
          cancellationPolicy: tourObj.cancellationPolicy || '',
          notes: tourObj.notes || '',
          averageRating: tourObj.averageRating || 0,
          reviewCount: reviewMap.get(tid) || 0,
          category: tourObj.categoryId,
          provider: tourObj.providerId ? {
            _id: tourObj.providerId._id,
            username: tourObj.providerId.username,
            businessName: tourObj.providerId.businessName || tourObj.providerId.username
          } : null,
          itinerary: activeItinerary,
          upcomingDepartures: upcomingDeps.slice(0, 5)
        };
      });

    return res.status(200).json({
      success: true,
      count: orderedTours.length,
      data: orderedTours
    });
  } catch (error) {
    console.error('Compare tours error:', error);
    return res.status(500).json({
      success: false,
      message: 'Không thể so sánh tour lúc này'
    });
  }
};
// END UC-64 Compare Tours

