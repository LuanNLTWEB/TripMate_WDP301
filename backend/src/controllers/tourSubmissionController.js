import { validationResult } from 'express-validator';
import TourSubmission from '../models/TourSubmission.js';
import Tour from '../models/Tour.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import { repairOrphanPendingTourSubmissions } from '../utils/tourSubmissionSync.js';

// Tour được phép gửi duyệt: tour nháp hoặc tour vừa bị trả lại để sửa.
const SUBMITTABLE_TOUR_STATUSES = ['draft', 'needs_revision', 'rejected'];

const STAFF_REVIEW_STATUSES = ['approved', 'rejected', 'needs_revision'];

const PROVIDER_EDITABLE_STATUSES = ['pending', 'needs_revision', 'rejected'];

// Tour phải còn ít nhất 1 chỗ trống mới được gửi duyệt/duyệt mở bán. Nếu không, tour
// vẫn hiện cho khách nhưng createBooking chặn mọi đơn (availableSeats < numberOfPeople).
const MIN_TOUR_SEATS = 1;

const SEATS_NOT_READY_SUBMIT_MESSAGE = 'Tour chưa có chỗ trống. Vui lòng cập nhật số chỗ trước khi gửi duyệt.';

const SEATS_NOT_READY_APPROVE_MESSAGE = 'Tour chưa có chỗ trống. Vui lòng yêu cầu nhà cung cấp cập nhật số chỗ trước khi duyệt.';

// availableSeats có thể thiếu ở dữ liệu cũ: coi như 0 chỗ để không mở bán tour không đặt được.
const hasSellableSeats = (tour) => Number(tour?.availableSeats || 0) >= MIN_TOUR_SEATS;

// Dữ liệu tour cần cho danh sách/màn duyệt, tránh trả cả document tour nặng.
const TOUR_POPULATE = {
  path: 'tourId',
  select: 'title description images price duration departureLocation destinationLocation availableSeats status categoryId',
  populate: { path: 'categoryId', select: 'name' }
};

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const badRequest = (res, errors) => res.status(400).json({
  success: false,
  message: errors.array()[0]?.msg || 'Dữ liệu bài gửi không hợp lệ',
  errors: errors.array()
});

/**
 * Gửi thông báo cho toàn bộ staff đang hoạt động.
 * Lỗi thông báo không được làm hỏng nghiệp vụ chính nên chỉ log lại.
 */
const notifyStaff = async ({ title, message, sender }) => {
  try {
    const staffUsers = await User.find({
      role: 'staff',
      isDeleted: { $ne: true },
      isActive: { $ne: false }
    }).select('_id');

    if (staffUsers.length === 0) return;

    await Notification.insertMany(staffUsers.map((staff) => ({
      recipient: staff._id,
      title,
      message,
      notificationType: 'tour_submission',
      sender
    })));
  } catch (error) {
    console.error('Notify staff about tour submission failed:', error);
  }
};

const notifyProvider = async ({ providerId, title, message, sender }) => {
  try {
    await Notification.create({
      recipient: providerId,
      title,
      message,
      notificationType: 'tour_submission_result',
      sender
    });
  } catch (error) {
    console.error('Notify provider about tour submission result failed:', error);
  }
};

/**
 * Xóa các dấu vết duyệt cũ trên tour (lý do từ chối, yêu cầu chỉnh sửa, tạm ngưng).
 * Dùng khi tour được duyệt để tour sạch trạng thái trước khi mở bán.
 */
const clearTourReviewFlags = (tour) => {
  tour.suspensionReason = '';
  tour.suspendedAt = null;
  tour.suspendedBy = null;
  tour.rejectionReason = '';
  tour.rejectedAt = null;
  tour.rejectedBy = null;
  tour.revisionNote = '';
  tour.revisionRequestedAt = null;
  tour.revisionRequestedBy = null;
};

// START UC-128 Create Tour Submission
/**
 * UC-128 – Create Tour Submission (provider gửi yêu cầu xuất bản một tour nháp).
 *
 * Tour do provider tạo ra nằm ở trạng thái 'draft' và chưa hiển thị cho khách.
 * Endpoint này tạo một TourSubmission 'pending' trỏ tới tour và đẩy tour sang
 * 'pending' để staff thấy trong hàng đợi kiểm duyệt.
 *
 * Phần phức tạp:
 *  - Chỉ nhận tour thuộc sở hữu của provider và đang ở trạng thái được phép gửi
 *    ('draft'/'needs_revision'/'rejected'); tour đang active/pending bị chặn 409.
 *  - Chặn gửi trùng: một tour chỉ có tối đa một bài 'pending' tại một thời điểm.
 *  - Tour chưa có chỗ trống (availableSeats < 1, ví dụ tour vừa nhân bản ở UC-24) bị
 *    chặn 409: mở bán tour 0 chỗ chỉ khiến khách thấy tour mà không đặt được.
 *  - Đổi tour.status và tạo submission không nằm trong transaction (Mongo standalone),
 *    nên nếu bước lưu tour lỗi thì submission vừa tạo được xóa bù để tránh trạng thái lửng.
 */
export const createTourSubmission = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return badRequest(res, errors);
  }

  try {
    const { tourId, providerNote = '' } = req.body;

    const tour = await Tour.findById(tourId);
    if (!tour) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy tour cần gửi duyệt'
      });
    }

    if (!tour.providerId || String(tour.providerId) !== String(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền gửi duyệt tour này'
      });
    }

    if (!SUBMITTABLE_TOUR_STATUSES.includes(tour.status)) {
      return res.status(409).json({
        success: false,
        message: tour.status === 'pending'
          ? 'Tour này đang chờ duyệt, vui lòng chờ phản hồi từ nhân viên'
          : 'Chỉ có thể gửi duyệt tour nháp hoặc tour vừa được yêu cầu chỉnh sửa'
      });
    }

    if (!hasSellableSeats(tour)) {
      return res.status(409).json({
        success: false,
        message: SEATS_NOT_READY_SUBMIT_MESSAGE
      });
    }

    const existingSubmission = await TourSubmission.findOne({
      tourId: tour._id,
      status: 'pending',
      isDeleted: { $ne: true }
    });

    if (existingSubmission) {
      return res.status(409).json({
        success: false,
        message: 'Tour này đã có một bài gửi đang chờ duyệt'
      });
    }

    const submission = await TourSubmission.create({
      tourId: tour._id,
      providerId: req.user._id,
      providerNote,
      status: 'pending'
    });

    const previousTourStatus = tour.status;
    tour.status = 'pending';

    try {
      await tour.save();
    } catch (saveError) {
      await TourSubmission.deleteOne({ _id: submission._id });
      throw saveError;
    }

    await submission.populate(TOUR_POPULATE);

    await notifyStaff({
      title: previousTourStatus === 'draft'
        ? 'Có tour mới gửi duyệt'
        : 'Có tour gửi duyệt lại',
      message: `Nhà cung cấp vừa gửi duyệt tour "${tour.title}". Vui lòng kiểm tra và phản hồi.`,
      sender: req.user._id
    });

    return res.status(201).json({
      success: true,
      message: 'Gửi duyệt tour thành công. Vui lòng chờ nhân viên kiểm duyệt.',
      data: submission
    });
  } catch (error) {
    console.error('Error creating tour submission:', error);
    return res.status(500).json({
      success: false,
      message: 'Không thể gửi duyệt tour'
    });
  }
};
// END UC-128 Create Tour Submission

// START UC-130 View Tour Submission List
/**
 * UC-130 – View Tour Submission List (staff và provider xem danh sách bài gửi).
 *
 * Cùng một endpoint nhưng phạm vi dữ liệu phụ thuộc vai trò:
 *  - provider chỉ thấy bài gửi của chính mình,
 *  - staff thấy toàn bộ để kiểm duyệt.
 *
 * Phần phức tạp:
 *  - Tìm kiếm theo tên/địa điểm của tour nên phải lọc gián tiếp: query trước các tour
 *    khớp từ khóa rồi dùng `tourId: { $in: [...] }` (không search được field populate).
 *  - Các điều kiện gom vào $and để filter tìm kiếm/trạng thái không ghi đè providerId.
 *  - Từ khóa được escape trước khi đưa vào RegExp để tránh lỗi regex từ input.
 */
export const getTourSubmissions = async (req, res) => {
  try {
    const {
      search,
      status = 'all',
      tourId,
      page = 1,
      limit = 10
    } = req.query;

    const filters = [{ isDeleted: { $ne: true } }];

    if (req.user.role === 'tourProvider') {
      filters.push({ providerId: req.user._id });
    } else {
      // Staff: phục hồi các tour 'pending' chưa có bài gửi trước khi liệt kê.
      await repairOrphanPendingTourSubmissions();
    }

    // Lọc theo tour cụ thể: dùng cho màn duyệt tour khi chỉ có tourId mà chưa biết
    // mã bài gửi tương ứng.
    if (tourId) {
      filters.push({ tourId });
    }

    if (search) {
      const safeSearch = escapeRegex(search);
      const matchedTours = await Tour.find({
        ...(req.user.role === 'tourProvider' ? { providerId: req.user._id } : {}),
        $or: [
          { title: { $regex: safeSearch, $options: 'i' } },
          { destinationLocation: { $regex: safeSearch, $options: 'i' } },
          { departureLocation: { $regex: safeSearch, $options: 'i' } }
        ]
      }).select('_id');

      filters.push({ tourId: { $in: matchedTours.map((tour) => tour._id) } });
    }

    if (status && status !== 'all') {
      filters.push({ status });
    }

    const query = { $and: filters };
    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 100);

    const [total, submissions] = await Promise.all([
      TourSubmission.countDocuments(query),
      TourSubmission.find(query)
        .populate(TOUR_POPULATE)
        .populate('providerId', 'username email phone')
        .populate('reviewedBy', 'username email')
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
    ]);

    return res.status(200).json({
      success: true,
      count: submissions.length,
      total,
      totalPages: Math.ceil(total / limitNum) || 1,
      currentPage: pageNum,
      data: submissions
    });
  } catch (error) {
    console.error('Error fetching tour submissions:', error);
    return res.status(500).json({
      success: false,
      message: 'Không thể tải danh sách bài gửi duyệt tour'
    });
  }
};
// END UC-130 View Tour Submission List

/**
 * Lấy chi tiết một bài gửi (form sửa của provider và màn duyệt của staff).
 * Provider không phải chủ sở hữu bị chặn 403, bài đã xóa mềm coi như 404.
 */
export const getTourSubmissionById = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return badRequest(res, errors);
  }

  try {
    const submission = await TourSubmission.findOne({
      _id: req.params.id,
      isDeleted: { $ne: true }
    })
      .populate(TOUR_POPULATE)
      .populate('providerId', 'username email phone')
      .populate('reviewedBy', 'username email');

    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy bài gửi duyệt tour'
      });
    }

    const ownerId = submission.providerId?._id || submission.providerId;
    if (req.user.role === 'tourProvider' && String(ownerId) !== String(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền xem bài gửi này'
      });
    }

    return res.status(200).json({
      success: true,
      data: submission
    });
  } catch (error) {
    console.error('Error fetching tour submission:', error);
    return res.status(500).json({
      success: false,
      message: 'Không thể tải bài gửi duyệt tour'
    });
  }
};

// START UC-129 Update Tour Submission
/**
 * UC-129 – Update Tour Submission (provider cập nhật yêu cầu, staff cập nhật trạng thái duyệt).
 *
 * Một endpoint phục vụ hai vai trò:
 *  - Provider: sửa ghi chú gửi kèm; nếu bài đang 'needs_revision'/'rejected' thì lần
 *    cập nhật này được coi là gửi lại, đưa bài gửi và tour về 'pending'.
 *  - Staff: duyệt một bài đang 'pending' sang approved/rejected/needs_revision,
 *    bắt buộc có lý do khi từ chối/yêu cầu chỉnh sửa.
 *
 * Phần phức tạp:
 *  - Trạng thái công khai thực sự nằm trên Tour, nên duyệt bài gửi phải cập nhật
 *    tour tương ứng: approved → 'active' (khách mới thấy), rejected → 'rejected',
 *    needs_revision → 'needs_revision' kèm revisionNote cho provider đọc.
 *  - Khi duyệt, các cờ từ chối/tạm ngưng cũ trên tour được dọn sạch để tour không
 *    còn hiển thị lý do cũ ở màn quản lý.
 *  - reviewNote của bài gửi được giữ lại sau khi provider gửi lại để họ đọc lý do cũ.
 *  - Cả lúc provider gửi lại lẫn lúc staff duyệt đều kiểm tra availableSeats >= MIN_TOUR_SEATS
 *    để không mở bán tour mà createBooking sẽ chặn mọi đơn.
 */
export const updateTourSubmission = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return badRequest(res, errors);
  }

  try {
    const submission = await TourSubmission.findOne({
      _id: req.params.id,
      isDeleted: { $ne: true }
    });

    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy bài gửi duyệt tour'
      });
    }

    if (req.user.role === 'tourProvider') {
      if (String(submission.providerId) !== String(req.user._id)) {
        return res.status(403).json({
          success: false,
          message: 'Bạn không có quyền cập nhật bài gửi này'
        });
      }

      if (submission.status === 'approved') {
        return res.status(409).json({
          success: false,
          message: 'Bài gửi đã được duyệt nên không thể chỉnh sửa. Hãy chỉnh sửa trực tiếp trên tour.'
        });
      }

      if (req.body.status !== undefined) {
        return res.status(400).json({
          success: false,
          message: 'Nhà cung cấp không được tự thay đổi trạng thái duyệt'
        });
      }

      if (!PROVIDER_EDITABLE_STATUSES.includes(submission.status)) {
        return res.status(409).json({
          success: false,
          message: 'Bài gửi đang ở trạng thái không thể chỉnh sửa'
        });
      }

      const tour = await Tour.findById(submission.tourId);
      if (!tour) {
        return res.status(404).json({
          success: false,
          message: 'Tour gắn với bài gửi không còn tồn tại'
        });
      }

      if (typeof req.body.providerNote === 'string') {
        submission.providerNote = req.body.providerNote.trim();
      }

      const isResubmission = submission.status !== 'pending';
      if (isResubmission) {
        if (!SUBMITTABLE_TOUR_STATUSES.includes(tour.status)) {
          return res.status(409).json({
            success: false,
            message: 'Tour đang ở trạng thái không thể gửi duyệt lại'
          });
        }

        if (!hasSellableSeats(tour)) {
          return res.status(409).json({
            success: false,
            message: SEATS_NOT_READY_SUBMIT_MESSAGE
          });
        }

        submission.status = 'pending';
        submission.reviewedAt = null;
        submission.reviewedBy = null;
        tour.status = 'pending';
        await tour.save();
      }

      await submission.save();
      await submission.populate(TOUR_POPULATE);

      if (isResubmission) {
        await notifyStaff({
          title: 'Tour đã được gửi duyệt lại',
          message: `Nhà cung cấp đã gửi lại tour "${tour.title}" sau khi chỉnh sửa.`,
          sender: req.user._id
        });
      }

      return res.status(200).json({
        success: true,
        message: isResubmission
          ? 'Đã cập nhật và gửi lại yêu cầu duyệt tour.'
          : 'Đã cập nhật bài gửi duyệt tour.',
        data: submission
      });
    }

    // Nhánh staff kiểm duyệt.
    const nextStatus = req.body.status;
    if (!STAFF_REVIEW_STATUSES.includes(nextStatus)) {
      return res.status(400).json({
        success: false,
        message: 'Trạng thái duyệt không hợp lệ'
      });
    }

    if (submission.status !== 'pending') {
      return res.status(409).json({
        success: false,
        message: 'Chỉ có thể duyệt bài gửi đang ở trạng thái chờ duyệt'
      });
    }

    const reviewNote = typeof req.body.reviewNote === 'string' ? req.body.reviewNote.trim() : '';
    if (nextStatus !== 'approved' && !reviewNote) {
      return res.status(400).json({
        success: false,
        message: nextStatus === 'rejected'
          ? 'Vui lòng nhập lý do từ chối bài gửi'
          : 'Vui lòng nhập nội dung cần chỉnh sửa'
      });
    }

    const tour = await Tour.findById(submission.tourId);
    if (!tour) {
      return res.status(404).json({
        success: false,
        message: 'Tour gắn với bài gửi không còn tồn tại'
      });
    }

    // Duyệt là chốt cuối: chặn tour không còn chỗ trống trước khi mở bán.
    if (nextStatus === 'approved' && !hasSellableSeats(tour)) {
      return res.status(409).json({
        success: false,
        message: SEATS_NOT_READY_APPROVE_MESSAGE
      });
    }

    if (nextStatus === 'approved') {
      clearTourReviewFlags(tour);
      tour.status = 'active';
    } else if (nextStatus === 'rejected') {
      tour.status = 'rejected';
      tour.rejectionReason = reviewNote;
      tour.rejectedAt = new Date();
      tour.rejectedBy = req.user._id;
    } else {
      tour.status = 'needs_revision';
      tour.revisionNote = reviewNote;
      tour.revisionRequestedAt = new Date();
      tour.revisionRequestedBy = req.user._id;
    }

    await tour.save();

    submission.status = nextStatus;
    submission.reviewNote = reviewNote;
    submission.reviewedAt = new Date();
    submission.reviewedBy = req.user._id;

    await submission.save();
    await submission.populate([
      TOUR_POPULATE,
      { path: 'reviewedBy', select: 'username email' }
    ]);

    await notifyProvider({
      providerId: submission.providerId,
      title: nextStatus === 'approved'
        ? 'Tour của bạn đã được duyệt và mở bán'
        : nextStatus === 'rejected'
          ? 'Tour của bạn bị từ chối duyệt'
          : 'Tour của bạn cần chỉnh sửa',
      message: nextStatus === 'approved'
        ? `Tour "${tour.title}" đã được duyệt và đang hiển thị cho khách hàng.`
        : `Tour "${tour.title}": ${reviewNote}`,
      sender: req.user._id
    });

    return res.status(200).json({
      success: true,
      message: nextStatus === 'approved'
        ? 'Đã duyệt và mở bán tour thành công.'
        : nextStatus === 'rejected'
          ? 'Đã từ chối bài gửi duyệt tour.'
          : 'Đã gửi yêu cầu chỉnh sửa tới nhà cung cấp.',
      data: submission
    });
  } catch (error) {
    console.error('Error updating tour submission:', error);
    return res.status(500).json({
      success: false,
      message: 'Không thể cập nhật bài gửi duyệt tour'
    });
  }
};
// END UC-129 Update Tour Submission

// START UC-131 Delete Tour Submission
/**
 * UC-131 – Delete Tour Submission (provider thu hồi yêu cầu duyệt của mình).
 *
 * Xóa mềm để giữ dấu vết kiểm duyệt: set isDeleted/deletedAt/deletedBy thay vì
 * xóa khỏi DB, sau đó mọi truy vấn danh sách đều bỏ qua bài đã xóa.
 *
 * Phần phức tạp:
 *  - Chỉ chủ sở hữu được xóa; staff/người khác bị chặn (route đã giới hạn role).
 *  - Bài đã được duyệt thì không cho xóa vì tour đã mở bán; trả 409 kèm hướng dẫn.
 *  - Thu hồi khi tour vẫn đang 'pending' phải đưa tour về 'draft', nếu không tour sẽ
 *    kẹt ở trạng thái chờ duyệt mà không còn bài gửi nào trong hàng đợi staff.
 */
export const deleteTourSubmission = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return badRequest(res, errors);
  }

  try {
    const submission = await TourSubmission.findOne({
      _id: req.params.id,
      isDeleted: { $ne: true }
    });

    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy bài gửi duyệt tour'
      });
    }

    if (String(submission.providerId) !== String(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền xóa bài gửi này'
      });
    }

    if (submission.status === 'approved') {
      return res.status(409).json({
        success: false,
        message: 'Bài gửi đã được duyệt nên không thể xóa. Hãy quản lý tour đã mở bán thay vì xóa bài gửi.'
      });
    }

    submission.isDeleted = true;
    submission.deletedAt = new Date();
    submission.deletedBy = req.user._id;
    await submission.save();

    // Trả tour về nháp để provider tiếp tục chỉnh sửa và gửi lại khi cần.
    const tour = await Tour.findById(submission.tourId);
    if (tour && tour.status === 'pending') {
      tour.status = 'draft';
      await tour.save();
    }

    return res.status(200).json({
      success: true,
      message: 'Đã thu hồi bài gửi duyệt tour. Tour đã quay về trạng thái nháp.'
    });
  } catch (error) {
    console.error('Error deleting tour submission:', error);
    return res.status(500).json({
      success: false,
      message: 'Không thể xóa bài gửi duyệt tour'
    });
  }
};
// END UC-131 Delete Tour Submission
