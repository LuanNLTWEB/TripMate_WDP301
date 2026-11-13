import { body, param, query } from 'express-validator';
import Role from '../models/Role.js';

// START UC-17 Create Destination
// Điều kiện đầu vào khi staff tạo điểm đến: tên/mô tả/vị trí bắt buộc, 1-10 ảnh là URL hợp lệ.
export const createDestinationValidation = [
  body('name')
    .trim()
    .notEmpty().withMessage('Vui lòng nhập tên điểm đến')
    .isLength({ max: 100 }).withMessage('Tên điểm đến không được vượt quá 100 ký tự'),
  body('description')
    .trim()
    .notEmpty().withMessage('Vui lòng nhập mô tả điểm đến'),
  body('location')
    .trim()
    .notEmpty().withMessage('Vui lòng nhập vị trí điểm đến'),
  body('images')
    .isArray({ min: 1, max: 10 }).withMessage('Cần ít nhất một hình ảnh và tối đa 10 hình ảnh'),
  body('images.*')
    .isURL().withMessage('Mỗi hình ảnh phải là một URL hợp lệ'),
  body('isPopular')
    .optional()
    .isBoolean().withMessage('Trạng thái phổ biến không hợp lệ')
];
// END UC-17 Create Destination

// START UC-121 Update Destination Status
// Chỉ nhận active/inactive và id Mongo hợp lệ.
export const updateDestinationStatusValidation = [
  param('id').isMongoId().withMessage('Mã điểm đến không hợp lệ'),
  body('status')
    .isIn(['active', 'inactive']).withMessage('Trạng thái phải là active hoặc inactive')
];
// END UC-121 Update Destination Status

export const registerValidation = [
  body('username')
    .trim()
    .notEmpty().withMessage('Vui lòng nhập tên người dùng')
    .isLength({ min: 3, max: 30 }).withMessage('Tên người dùng phải từ 3 đến 30 ký tự')
    .matches(/^[a-zA-Z0-9_]+$/).withMessage('Tên người dùng chỉ được chứa chữ cái, số và dấu gạch dưới'),

  body('email')
    .trim()
    .notEmpty().withMessage('Vui lòng nhập email')
    .isEmail().withMessage('Vui lòng cung cấp địa chỉ email hợp lệ')
    .normalizeEmail(),

  body('password')
    .notEmpty().withMessage('Vui lòng nhập mật khẩu')
    .isLength({ min: 6 }).withMessage('Mật khẩu phải có ít nhất 6 ký tự')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).withMessage('Mật khẩu phải chứa ít nhất 1 chữ hoa, 1 chữ thường và 1 chữ số'),

  body('phone')
    .trim()
    .notEmpty().withMessage('Vui lòng nhập số điện thoại')
    .matches(/^[0-9]{10,11}$/).withMessage('Số điện thoại phải gồm 10-11 chữ số'),

  body('dateOfBirth')
    .optional()
    .isISO8601().withMessage('Ngày sinh phải có định dạng hợp lệ (YYYY-MM-DD)')
    .custom((value) => {
      const dob = new Date(value);
      const today = new Date();
      let age = today.getFullYear() - dob.getFullYear();
      const m = today.getMonth() - dob.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
        age--;
      }
      if (age < 12) {
        throw new Error('Bạn phải đủ ít nhất 12 tuổi');
      }
      if (dob > today) {
        throw new Error('Ngày sinh không thể ở tương lai');
      }
      return true;
    }),

  body('gender')
    .optional()
    .isIn(['male', 'female', 'other']).withMessage('Giới tính phải là male, female hoặc other')
];

// START UC-66 Submit Booking Complaint
// Khách hàng gửi khiếu nại gắn với một đơn đặt tour, kèm ảnh minh chứng tuỳ chọn;
// nhân viên xử lý khiếu nại đó (UC-81/153/154).
export const createComplaintValidation = [
  body('bookingId').isMongoId().withMessage('Mã đơn đặt tour không hợp lệ'),
  body('category')
    .isIn(['quality_mismatch', 'incorrect_cash_charge', 'wrongful_no_show', 'other'])
    .withMessage('Loại khiếu nại không hợp lệ'),
  body('description')
    .trim()
    .isLength({ min: 20, max: 2000 })
    .withMessage('Nội dung khiếu nại phải từ 20 đến 2000 ký tự'),
  body('evidenceImages')
    .optional()
    .isArray({ max: 5 }).withMessage('Chỉ được gửi tối đa 5 ảnh minh chứng'),
  body('evidenceImages.*')
    .optional()
    .isURL({ protocols: ['http', 'https'], require_protocol: true })
    .withMessage('Mỗi ảnh minh chứng phải là một URL hợp lệ')
];
// END UC-66 Submit Booking Complaint

// START STT 68 Update Booking Complaint Validation
export const updateComplaintValidation = [
  param('id').isMongoId().withMessage('Mã khiếu nại không hợp lệ'),
  body('category')
    .optional()
    .isIn(['quality_mismatch', 'incorrect_cash_charge', 'wrongful_no_show', 'other'])
    .withMessage('Loại khiếu nại không hợp lệ'),
  body('description')
    .optional()
    .trim()
    .isLength({ min: 20, max: 2000 })
    .withMessage('Nội dung khiếu nại phải từ 20 đến 2000 ký tự'),
  body('evidenceImages')
    .optional()
    .isArray({ max: 5 }).withMessage('Chỉ được gửi tối đa 5 ảnh minh chứng'),
  body('evidenceImages.*')
    .optional()
    .isURL({ protocols: ['http', 'https'], require_protocol: true })
    .withMessage('Mỗi ảnh minh chứng phải là một URL hợp lệ')
];
// END STT 68 Update Booking Complaint Validation

// START UC-85 Confirm Payment & Check-in
// Provider ghi nhận đã thu tiền (tiền mặt hoặc chuyển khoản) rồi điểm danh khách.
export const confirmBookingPaymentValidation = [
  param('id').isMongoId().withMessage('Mã đơn đặt tour không hợp lệ'),
  body('paymentMethod')
    .optional()
    .isIn(['cash', 'bank_transfer'])
    .withMessage('Phương thức thanh toán phải là cash hoặc bank_transfer')
];

// Kiểm tra mã đơn đặt tour dùng khi điểm danh.
export const checkInBookingValidation = [
  param('id').isMongoId().withMessage('Mã đơn đặt tour không hợp lệ')
];
// END UC-85 Confirm Payment & Check-in

export const completeBookingValidation = [
  param('id').isMongoId().withMessage('Mã đơn đặt tour không hợp lệ')
];


// Kiểm tra từ khoá, trạng thái, trang và số dòng của danh sách khiếu nại.
export const complaintListValidation = [
  query('status')
    .optional()
    .isIn(['all', 'open', 'in_review', 'resolved', 'rejected', 'cancelled'])
    .withMessage('Trạng thái khiếu nại không hợp lệ'),
  query('page').optional().isInt({ min: 1 }).withMessage('Trang không hợp lệ'),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Giới hạn không hợp lệ')
];

export const complaintIdValidation = [
  param('id').isMongoId().withMessage('Mã khiếu nại không hợp lệ')
];

export const resolveComplaintValidation = [
  ...complaintIdValidation,
  body('status').isIn(['resolved', 'rejected']).withMessage('Kết quả xử lý không hợp lệ'),
  body('resolutionNote')
    .trim()
    .isLength({ min: 5, max: 2000 })
    .withMessage('Nội dung xử lý phải từ 5 đến 2000 ký tự')
];

export const loginValidation = [
  body('email')
    .trim()
    .notEmpty().withMessage('Vui lòng nhập email')
    .isEmail().withMessage('Vui lòng cung cấp địa chỉ email hợp lệ')
    .normalizeEmail(),

  body('password')
    .notEmpty().withMessage('Vui lòng nhập mật khẩu')
];

export const changePasswordValidation = [
  body('currentPassword')
    .notEmpty().withMessage('Vui lòng nhập mật khẩu hiện tại'),

  body('newPassword')
    .notEmpty().withMessage('Vui lòng nhập mật khẩu mới')
    .isLength({ min: 6 }).withMessage('Mật khẩu mới phải có ít nhất 6 ký tự')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).withMessage('Mật khẩu mới phải chứa ít nhất 1 chữ hoa, 1 chữ thường và 1 chữ số')
];

export const forgotPasswordValidation = [
  body('email')
    .trim()
    .notEmpty().withMessage('Vui lòng nhập email')
    .isEmail().withMessage('Vui lòng cung cấp địa chỉ email hợp lệ')
    .normalizeEmail()
];

export const verifyOtpValidation = [
  body('email')
    .trim()
    .notEmpty().withMessage('Vui lòng nhập email')
    .isEmail().withMessage('Vui lòng cung cấp địa chỉ email hợp lệ')
    .normalizeEmail(),
  body('otp')
    .trim()
    .notEmpty().withMessage('Vui lòng nhập mã OTP')
    .isLength({ min: 6, max: 6 }).withMessage('Mã OTP phải gồm 6 chữ số')
    .matches(/^[0-9]{6}$/).withMessage('Mã OTP chỉ bao gồm chữ số')
];

export const resendOtpValidation = [
  body('email')
    .trim()
    .notEmpty().withMessage('Vui lòng nhập email')
    .isEmail().withMessage('Vui lòng cung cấp địa chỉ email hợp lệ')
    .normalizeEmail()
];

export const resetPasswordValidation = [
  body('resetToken')
    .notEmpty().withMessage('Mã xác thực reset không hợp lệ hoặc thiếu'),
  body('newPassword')
    .notEmpty().withMessage('Vui lòng nhập mật khẩu mới')
    .isLength({ min: 6 }).withMessage('Mật khẩu mới phải có ít nhất 6 ký tự')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).withMessage('Mật khẩu mới phải chứa ít nhất 1 chữ hoa, 1 chữ thường và 1 chữ số')
];

export const updateProfileValidation = [
  body('username')
    .optional()
    .trim()
    .notEmpty().withMessage('Tên người dùng không được để trống')
    .isLength({ min: 3, max: 30 }).withMessage('Tên người dùng phải từ 3 đến 30 ký tự')
    .matches(/^[a-zA-Z0-9_]+$/).withMessage('Tên người dùng chỉ được chứa chữ cái, số và dấu gạch dưới'),

  body('phone')
    .trim()
    .notEmpty().withMessage('Vui lòng nhập số điện thoại')
    .matches(/^[0-9]{10,11}$/).withMessage('Số điện thoại phải gồm 10-11 chữ số'),

  body('dateOfBirth')
    .optional({ values: 'falsy' })
    .isISO8601().withMessage('Ngày sinh phải có định dạng hợp lệ (YYYY-MM-DD)')
    .custom((value) => {
      const dob = new Date(value);
      const today = new Date();
      let age = today.getFullYear() - dob.getFullYear();
      const m = today.getMonth() - dob.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
        age--;
      }
      if (age < 12) {
        throw new Error('Bạn phải đủ ít nhất 12 tuổi');
      }
      if (dob > today) {
        throw new Error('Ngày sinh không thể ở tương lai');
      }
      return true;
    }),

  body('gender')
    .optional()
    .isIn(['male', 'female', 'other']).withMessage('Giới tính phải là male, female hoặc other')
];

export const accountValidation = [
  body('username')
    .trim()
    .notEmpty().withMessage('Vui lòng nhập tên người dùng')
    .isLength({ min: 3, max: 30 }).withMessage('Tên người dùng phải từ 3 đến 30 ký tự')
    .matches(/^[a-zA-Z0-9_]+$/).withMessage('Tên người dùng chỉ được chứa chữ cái, số và dấu gạch dưới'),
  body('email')
    .trim()
    .notEmpty().withMessage('Vui lòng nhập email')
    .isEmail().withMessage('Vui lòng cung cấp địa chỉ email hợp lệ')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('Vui lòng nhập mật khẩu')
    .isLength({ min: 6 }).withMessage('Mật khẩu phải có ít nhất 6 ký tự')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).withMessage('Mật khẩu phải chứa ít nhất 1 chữ hoa, 1 chữ thường và 1 chữ số'),
  body('phone').trim().notEmpty().withMessage('Vui lòng nhập số điện thoại').matches(/^[0-9]{10,11}$/).withMessage('Số điện thoại phải gồm 10-11 chữ số'),
  body('dateOfBirth')
    .optional({ values: 'falsy' })
    .isISO8601().withMessage('Ngày sinh phải có định dạng hợp lệ (YYYY-MM-DD)')
    .custom((value) => {
      const dateOfBirth = new Date(value);
      const today = new Date();
      let age = today.getFullYear() - dateOfBirth.getFullYear();
      const monthDifference = today.getMonth() - dateOfBirth.getMonth();
      if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < dateOfBirth.getDate())) age--;
      if (dateOfBirth > today) throw new Error('Ngày sinh không thể ở tương lai');
      if (age < 12) throw new Error('Bạn phải đủ ít nhất 12 tuổi');
      return true;
    }),
  body('gender').optional().isIn(['male', 'female', 'other']).withMessage('Giới tính không hợp lệ'),
  body('role')
    .optional()
    .trim()
    .custom(async (value) => {
      if (!value) return true;
      const roleExists = await Role.findOne({ name: value });
      if (!roleExists) throw new Error('Vai trò không hợp lệ');
      return true;
    })
];

export const updateAccountRoleValidation = [
  body('role')
    .trim()
    .notEmpty().withMessage('Vui lòng chọn vai trò')
    .custom(async (value) => {
      const roleExists = await Role.findOne({ name: value });
      if (!roleExists) throw new Error('Vai trò không hợp lệ');
      return true;
    })
];

export const itineraryValidation = [
  body('title')
    .trim()
    .notEmpty().withMessage('Vui lòng nhập tên lịch trình')
    .isLength({ min: 3, max: 120 }).withMessage('Tên lịch trình phải từ 3 đến 120 ký tự'),
  body('budget')
    .optional({ values: 'falsy' })
    .isFloat({ min: 0, max: 500000000 }).withMessage('Ngân sách không hợp lệ'),
  body('startDate')
    .optional({ values: 'falsy' })
    .isISO8601().withMessage('Ngày bắt đầu không hợp lệ'),
  body('endDate')
    .optional({ values: 'falsy' })
    .isISO8601().withMessage('Ngày kết thúc không hợp lệ')
    .custom((endDate, { req }) => {
      if (req.body.startDate && new Date(endDate) < new Date(req.body.startDate)) {
        throw new Error('Ngày kết thúc phải sau ngày bắt đầu');
      }
      return true;
    })
];

export const updateItineraryValidation = [
  param('id').isMongoId().withMessage('Mã lịch trình không hợp lệ'),
  body('title')
    .optional()
    .trim()
    .notEmpty().withMessage('Tên lịch trình không được để trống')
    .isLength({ min: 3, max: 120 }).withMessage('Tên lịch trình phải từ 3 đến 120 ký tự'),
  body('budget')
    .optional({ values: 'falsy' })
    .isFloat({ min: 0, max: 500000000 }).withMessage('Ngân sách không hợp lệ'),
  body('startDate')
    .optional({ values: 'falsy' })
    .isISO8601().withMessage('Ngày bắt đầu không hợp lệ'),
  body('endDate')
    .optional({ values: 'falsy' })
    .isISO8601().withMessage('Ngày kết thúc không hợp lệ')
    .custom((endDate, { req }) => {
      if (req.body.startDate && new Date(endDate) < new Date(req.body.startDate)) {
        throw new Error('Ngày kết thúc phải sau ngày bắt đầu');
      }
      return true;
    })
];

// START UC-53 Add Activity to Itinerary
// Hoạt động phải có tên, ngày ISO, giờ HH:mm và chi phí không âm.
export const activityValidation = [
  param('id').isMongoId().withMessage('Mã lịch trình không hợp lệ'),
  body('title').trim().notEmpty().withMessage('Vui lòng nhập tên hoạt động'),
  body('date').isISO8601().withMessage('Ngày hoạt động không hợp lệ'),
  body('startTime').matches(/^([01]\d|2[0-3]):[0-5]\d$/).withMessage('Giờ bắt đầu phải có dạng HH:mm'),
  body('endTime').matches(/^([01]\d|2[0-3]):[0-5]\d$/).withMessage('Giờ kết thúc phải có dạng HH:mm'),
  body('estimatedCost').optional().isFloat({ min: 0 }).withMessage('Chi phí không được âm')
];
// END UC-53 Add Activity to Itinerary

export const itineraryIdValidation = [
  param('id').isMongoId().withMessage('Mã lịch trình không hợp lệ')
];

export const duplicateItineraryValidation = [
  param('id').isMongoId().withMessage('Mã lịch trình không hợp lệ'),
  body('title').optional().trim().isLength({ max: 120 }).withMessage('Tên lịch trình không được vượt quá 120 ký tự'),
  body('startDate').optional({ nullable: true, checkFalsy: true }).isISO8601().withMessage('Ngày bắt đầu không hợp lệ')
];

export const shareItineraryValidation = [
  param('id').isMongoId().withMessage('Mã lịch trình không hợp lệ'),
  body('email').isEmail().withMessage('Email người nhận không hợp lệ').normalizeEmail(),
  body('permission').isIn(['view', 'edit']).withMessage('Quyền hạn phải là "view" hoặc "edit"')
];

export const removeCollaboratorValidation = [
  param('id').isMongoId().withMessage('Mã lịch trình không hợp lệ'),
  param('userId').isMongoId().withMessage('Mã người dùng không hợp lệ')
];

export const inviteCollaboratorValidation = [
  param('id').isMongoId().withMessage('Mã lịch trình không hợp lệ'),
  body('email').isEmail().withMessage('Email người nhận không hợp lệ').normalizeEmail(),
  body('permission').isIn(['view', 'edit']).withMessage('Quyền hạn phải là "view" hoặc "edit"')
];

export const deleteInvitationValidation = [
  param('id').isMongoId().withMessage('Mã lịch trình không hợp lệ'),
  param('notificationId').isMongoId().withMessage('Mã lời mời không hợp lệ')
];

export const changeCollaboratorRoleValidation = [
  param('id').isMongoId().withMessage('Mã lịch trình không hợp lệ'),
  param('userId').isMongoId().withMessage('Mã người dùng không hợp lệ'),
  body('permission').isIn(['view', 'edit']).withMessage('Quyền hạn phải là "view" hoặc "edit"')
];

export const respondInvitationValidation = [
  param('notificationId').isMongoId().withMessage('Mã lời mời không hợp lệ'),
  body('action').isIn(['accept', 'decline']).withMessage('Hành động phải là "accept" hoặc "decline"')
];

export const addCommentValidation = [
  param('id').isMongoId().withMessage('Mã lịch trình không hợp lệ'),
  body('content')
    .trim()
    .notEmpty().withMessage('Nội dung bình luận không được để trống và không vượt quá 500 ký tự')
    .isLength({ max: 500 }).withMessage('Nội dung bình luận không được để trống và không vượt quá 500 ký tự')
];

export const deleteCommentValidation = [
  param('id').isMongoId().withMessage('Mã lịch trình không hợp lệ'),
  param('commentId').isMongoId().withMessage('Mã bình luận không hợp lệ')
];

export const tourIdValidation = [
  param('id').isMongoId().withMessage('Mã tour không hợp lệ')
];

export const updateTourStatusValidation = [
  param('id').isMongoId().withMessage('Mã tour không hợp lệ'),
  body('status')
    .isIn(['active', 'suspended', 'rejected']).withMessage('Trạng thái tour không hợp lệ'),
  body('reason')
    .optional({ values: 'falsy' })
    .custom((value, { req }) => {
      const reason = typeof value === 'string' ? value.trim() : '';
      if (req.body.status === 'suspended' && reason.length < 5) {
        throw new Error('Lý do tạm ngưng phải có ít nhất 5 ký tự');
      }
      if (reason.length > 500) {
        throw new Error('Lý do không được vượt quá 500 ký tự');
      }
      return true;
    })
];

export const itineraryDestinationValidation = [
  param('id').isMongoId().withMessage('Mã lịch trình không hợp lệ'),
  body('destinationId')
    .notEmpty().withMessage('Vui lòng chọn điểm đến')
    .isMongoId().withMessage('Mã điểm đến không hợp lệ')
];

export const removeDestinationValidation = [
  param('id').isMongoId().withMessage('Mã lịch trình không hợp lệ'),
  param('destinationId').isMongoId().withMessage('Mã điểm đến không hợp lệ')
];

export const removeActivityFromItineraryValidation = [
  param('id').isMongoId().withMessage('Mã lịch trình không hợp lệ'),
  param('activityId').isMongoId().withMessage('Mã hoạt động không hợp lệ')
];

export const updateActivityValidation = [
  param('id').isMongoId().withMessage('Mã lịch trình không hợp lệ'),
  param('activityId').isMongoId().withMessage('Mã hoạt động không hợp lệ'),
  body('title').optional().trim().notEmpty().withMessage('Vui lòng nhập tên hoạt động'),
  body('date').optional().isISO8601().withMessage('Ngày hoạt động không hợp lệ'),
  body('startTime').optional().matches(/^([01]\d|2[0-3]):[0-5]\d$/).withMessage('Giờ bắt đầu phải có dạng HH:mm'),
  body('endTime').optional().matches(/^([01]\d|2[0-3]):[0-5]\d$/).withMessage('Giờ kết thúc phải có dạng HH:mm'),
  body('estimatedCost').optional().isFloat({ min: 0 }).withMessage('Chi phí không được âm')
];

export const itineraryTourValidation = [
  param('id').isMongoId().withMessage('Mã lịch trình không hợp lệ'),
  body('tourId')
    .notEmpty().withMessage('Vui lòng chọn tour')
    .isMongoId().withMessage('Mã tour không hợp lệ')
];

export const removeTourFromItineraryValidation = [
  param('id').isMongoId().withMessage('Mã lịch trình không hợp lệ'),
  param('tourId').isMongoId().withMessage('Mã tour không hợp lệ')
];

export const reorderActivitiesValidation = [
  param('id').isMongoId().withMessage('Mã lịch trình không hợp lệ'),
  body('activities')
    .isArray({ min: 1 }).withMessage('Danh sách hoạt động không hợp lệ'),
  body('activities.*')
    .isMongoId().withMessage('Mã hoạt động không hợp lệ')
];

export const createCategoryValidation = [
  body('name')
    .trim()
    .notEmpty().withMessage('Vui lòng nhập tên danh mục')
    .isLength({ max: 100 }).withMessage('Tên danh mục không được vượt quá 100 ký tự'),
  body('description')
    .optional()
    .trim()
];

export const updateCategoryValidation = [
  param('id').isMongoId().withMessage('Mã danh mục không hợp lệ'),
  body('name')
    .trim()
    .notEmpty().withMessage('Vui lòng nhập tên danh mục')
    .isLength({ max: 100 }).withMessage('Tên danh mục không được vượt quá 100 ký tự'),
  body('description')
    .optional()
    .trim()
];

export const categoryIdValidation = [
  param('id').isMongoId().withMessage('Mã danh mục không hợp lệ')
];

export const destinationIdValidation = [
  param('id').isMongoId().withMessage('Mã điểm đến không hợp lệ')
];

export const updateDestinationValidation = [
  param('id').isMongoId().withMessage('Mã điểm đến không hợp lệ'),
  body('name')
    .trim()
    .notEmpty().withMessage('Vui lòng nhập tên điểm đến')
    .isLength({ max: 100 }).withMessage('Tên điểm đến không được vượt quá 100 ký tự'),
  body('description')
    .trim()
    .notEmpty().withMessage('Vui lòng nhập mô tả điểm đến'),
  body('location')
    .trim()
    .notEmpty().withMessage('Vui lòng nhập vị trí điểm đến'),
  body('images')
    .isArray({ min: 1, max: 10 }).withMessage('Cần ít nhất một hình ảnh và tối đa 10 hình ảnh'),
  body('images.*')
    .isURL().withMessage('Mỗi hình ảnh phải là một URL hợp lệ'),
  body('categoryId')
    .optional({ values: 'falsy' })
    .isMongoId().withMessage('Mã danh mục không hợp lệ'),
  body('isPopular')
    .optional()
    .isBoolean().withMessage('Trạng thái phổ biến không hợp lệ')
];

export const requestRevisionValidation = [
  param('id').isMongoId().withMessage('Mã tour không hợp lệ'),
  body('note')
    .trim()
    .notEmpty().withMessage('Vui lòng nhập nội dung yêu cầu chỉnh sửa')
    .isLength({ min: 10, max: 1000 }).withMessage('Nội dung phải từ 10 đến 1000 ký tự')
];

export const createTourValidation = [
  body('title')
    .trim()
    .notEmpty().withMessage('Vui lòng nhập tên tour')
    .isLength({ max: 100 }).withMessage('Tên tour không được vượt quá 100 ký tự'),
  body('description')
    .trim()
    .notEmpty().withMessage('Vui lòng nhập giới thiệu tour'),
  body('location')
    .trim()
    .notEmpty().withMessage('Vui lòng nhập địa điểm'),
  body('departureLocation')
    .trim()
    .notEmpty().withMessage('Vui lòng nhập điểm khởi hành'),
  body('destinationLocation')
    .trim()
    .notEmpty().withMessage('Vui lòng nhập điểm đến'),
  body('price')
    .notEmpty().withMessage('Vui lòng nhập giá tour')
    .isFloat({ min: 0 }).withMessage('Giá tour phải là số dương'),
  body('duration')
    .trim()
    .notEmpty().withMessage('Vui lòng nhập thời lượng tour (ví dụ: 3 ngày 2 đêm)'),
  body('availableSeats')
    .optional({ values: 'falsy' })
    .isInt({ min: 0 }).withMessage('Số chỗ phải là số nguyên không âm'),
  body('categoryId')
    .optional({ values: 'falsy' })
    .isMongoId().withMessage('Mã danh mục không hợp lệ'),
  body('images')
    .optional()
    .isArray().withMessage('Hình ảnh phải là một mảng URL')
];

export const setTourDetailsValidation = [
  param('id').isMongoId().withMessage('Mã tour không hợp lệ'),
  body('itinerary')
    .optional()
    .isArray().withMessage('Lịch trình chi tiết phải là một danh sách các ngày'),
  body('itinerary.*.day')
    .optional()
    .isInt({ min: 1 }).withMessage('Số thứ tự ngày phải là số nguyên dương'),
  body('itinerary.*.title')
    .optional()
    .trim()
    .notEmpty().withMessage('Tiêu đề ngày không được để trống'),
  body('itinerary.*.description')
    .optional()
    .trim()
    .notEmpty().withMessage('Mô tả hoạt động ngày không được để trống'),
  body('itinerary.*.meals')
    .optional()
    .isArray().withMessage('Danh sách bữa ăn phải là một mảng'),
  body('includedServices')
    .optional()
    .isArray().withMessage('Dịch vụ bao gồm phải là một mảng'),
  body('excludedServices')
    .optional()
    .isArray().withMessage('Dịch vụ không bao gồm phải là một mảng'),
  body('cancellationPolicy')
    .optional()
    .isString().withMessage('Chính sách hoàn hủy phải là chuỗi ký tự'),
  body('notes')
    .optional()
    .isString().withMessage('Lưu ý tour phải là chuỗi ký tự')
];

// Validation khi customer đặt tour
export const createBookingValidation = [
  body('fullName')
    .trim()
    .notEmpty().withMessage('Vui lòng nhập họ và tên')
    .isLength({ min: 2, max: 100 }).withMessage('Họ và tên phải từ 2 đến 100 ký tự'),
  body('phone')
    .trim()
    .notEmpty().withMessage('Vui lòng nhập số điện thoại')
    .matches(/^0[35789][0-9]{8}$/).withMessage('Số điện thoại không hợp lệ (ví dụ: 0901234567)'),
  body('email')
    .trim()
    .notEmpty().withMessage('Vui lòng nhập email')
    .matches(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.(com|vn|edu|edu\.vn)$/i)
    .withMessage('Email không hợp lệ (chỉ chấp nhận đuôi .com, .vn, .edu, .edu.vn)'),
  body('address')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ min: 5, max: 200 }).withMessage('Địa chỉ phải từ 5 đến 200 ký tự')
    .custom((val) => {
      if (!/[a-zA-ZÀ-ỹ]{2,}/.test(val)) {
        throw new Error('Địa chỉ không hợp lệ (không được chỉ chứa số hoặc ký tự đặc biệt)');
      }
      return true;
    }),
  body('numberOfPeople')
    .notEmpty().withMessage('Vui lòng nhập số lượng người')
    .isInt({ min: 1, max: 100 }).withMessage('Số lượng người phải từ 1 đến 100'),
  body('departureDate')
    .notEmpty().withMessage('Vui lòng chọn ngày khởi hành')
    .isISO8601().withMessage('Ngày khởi hành không đúng định dạng')
    .custom((value) => {
      const selectedDate = new Date(value);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (selectedDate < today) {
        throw new Error('Ngày khởi hành phải là ngày trong tương lai');
      }
      return true;
    }),
  body('departureId')
    .optional({ checkFalsy: true })
    .isMongoId().withMessage('Mã lịch khởi hành không hợp lệ'),
  body('note')
    .optional()
    .isLength({ max: 500 }).withMessage('Ghi chú không được vượt quá 500 ký tự')
];

export const createTourScheduleValidation = [
  param('id').isMongoId().withMessage('Mã tour không hợp lệ'),
  body('title')
    .trim()
    .notEmpty().withMessage('Vui lòng nhập tiêu đề ngày lịch trình')
    .isLength({ min: 3, max: 150 }).withMessage('Tiêu đề phải từ 3 đến 150 ký tự'),
  body('description')
    .trim()
    .notEmpty().withMessage('Vui lòng nhập mô tả hoạt động cho ngày')
    .isLength({ min: 5, max: 2000 }).withMessage('Mô tả hoạt động phải từ 5 đến 2000 ký tự'),
  body('day')
    .optional()
    .isInt({ min: 1, max: 50 }).withMessage('Số ngày phải là số nguyên từ 1 đến 50'),
  body('meals')
    .optional()
    .isArray().withMessage('Danh sách bữa ăn phải là một mảng')
    .custom((meals) => Array.isArray(meals) && meals.every((meal) => ['Sáng', 'Trưa', 'Tối'].includes(meal)))
    .withMessage('Bữa ăn chỉ được gồm Sáng, Trưa hoặc Tối')
];

export const updateProviderTourValidation = [
  param('id').isMongoId().withMessage('Mã tour không hợp lệ'),
  body('title')
    .trim()
    .notEmpty().withMessage('Vui lòng nhập tên tour')
    .isLength({ max: 100 }).withMessage('Tên tour không được vượt quá 100 ký tự'),
  body('description')
    .trim()
    .isLength({ min: 10, max: 5000 }).withMessage('Giới thiệu tour phải từ 10 đến 5000 ký tự'),
  body('location')
    .trim()
    .notEmpty().withMessage('Vui lòng nhập địa điểm')
    .isLength({ max: 150 }).withMessage('Địa điểm không được vượt quá 150 ký tự'),
  body('departureLocation')
    .trim()
    .notEmpty().withMessage('Vui lòng nhập điểm khởi hành')
    .isLength({ max: 150 }).withMessage('Điểm khởi hành không được vượt quá 150 ký tự'),
  body('destinationLocation')
    .trim()
    .notEmpty().withMessage('Vui lòng nhập điểm đến')
    .isLength({ max: 150 }).withMessage('Điểm đến không được vượt quá 150 ký tự'),
  body('duration')
    .trim()
    .notEmpty().withMessage('Vui lòng nhập thời lượng tour')
    .isLength({ max: 100 }).withMessage('Thời lượng không được vượt quá 100 ký tự'),
  body('price')
    .isFloat({ min: 0 }).withMessage('Giá tour phải là số không âm')
    .toFloat(),
  body('availableSeats')
    .isInt({ min: 0, max: 10000 }).withMessage('Số chỗ phải là số nguyên từ 0 đến 10000')
    .toInt(),
  body('categoryId')
    .optional({ values: 'falsy' })
    .isMongoId().withMessage('Mã danh mục không hợp lệ'),
  body('images')
    .isArray({ min: 1, max: 10 }).withMessage('Tour phải có từ 1 đến 10 hình ảnh'),
  body('images.*')
    .isURL({ protocols: ['http', 'https'], require_protocol: true })
    .withMessage('URL hình ảnh không hợp lệ')
];

export const updateTourScheduleValidation = [
  param('id').isMongoId().withMessage('Mã tour không hợp lệ'),
  param('scheduleId').isMongoId().withMessage('Mã ngày lịch trình không hợp lệ'),
  body('title')
    .trim()
    .notEmpty().withMessage('Vui lòng nhập tiêu đề ngày lịch trình')
    .isLength({ min: 3, max: 150 }).withMessage('Tiêu đề phải từ 3 đến 150 ký tự'),
  body('description')
    .trim()
    .notEmpty().withMessage('Vui lòng nhập mô tả hoạt động cho ngày')
    .isLength({ min: 5, max: 2000 }).withMessage('Mô tả hoạt động phải từ 5 đến 2000 ký tự'),
  body('day')
    .isInt({ min: 1, max: 50 }).withMessage('Số ngày phải là số nguyên từ 1 đến 50')
    .toInt(),
  body('meals')
    .optional()
    .isArray().withMessage('Danh sách bữa ăn phải là một mảng')
    .custom((meals) => Array.isArray(meals) && meals.every((meal) => ['Sáng', 'Trưa', 'Tối'].includes(meal)))
    .withMessage('Bữa ăn chỉ được gồm Sáng, Trưa hoặc Tối')
];

export const deleteTourScheduleValidation = [
  param('id').isMongoId().withMessage('Mã tour không hợp lệ'),
  param('scheduleId').isMongoId().withMessage('Mã ngày lịch trình không hợp lệ')
];

// START UC-45 Update Tour Capacity
// Số chỗ phải là số nguyên không âm (BR-50).
export const updateTourCapacityValidation = [
  param('id').isMongoId().withMessage('Mã tour không hợp lệ'),
  body('availableSeats')
    .exists({ values: 'falsy' }).withMessage('Vui lòng nhập số chỗ')
    .isInt({ min: 0 }).withMessage('Số chỗ phải là số nguyên không âm')
    .toInt()
];
// END UC-45 Update Tour Capacity

export const updateTourPriceValidation = [
  param('id').isMongoId().withMessage('Mã tour không hợp lệ'),
  body('price')
    .notEmpty().withMessage('Vui lòng nhập giá tour mới')
    .isFloat({ gt: 0 }).withMessage('Giá tour mới phải là số hợp lệ lớn hơn 0')
];

export const providerBookingListValidation = [
  query('search')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('Từ khóa tìm kiếm không được vượt quá 100 ký tự'),
  query('status')
    .optional()
    .isIn(['all', 'pending', 'confirmed', 'paid', 'checked_in', 'completed', 'cancelled', 'rejected', 'no_show'])
    .withMessage('Trạng thái booking không hợp lệ'),
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Số trang phải là số nguyên dương')
    .toInt(),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 }).withMessage('Số booking mỗi trang phải từ 1 đến 50')
    .toInt()
];

export const moderateReviewValidation = [
  param('id').isMongoId().withMessage('Mã đánh giá không hợp lệ'),
  body('status')
    .isIn(['approved', 'rejected', 'flagged', 'pending'])
    .withMessage('Trạng thái kiểm duyệt không hợp lệ'),
  body('moderationReason').custom((value, { req }) => {
    const reason = typeof value === 'string' ? value.trim() : '';
    if (['rejected', 'flagged'].includes(req.body.status) && reason.length < 5) {
      throw new Error('Lý do kiểm duyệt phải có ít nhất 5 ký tự');
    }
    if (reason.length > 500) {
      throw new Error('Lý do kiểm duyệt không được vượt quá 500 ký tự');
    }
    return true;
  })
];

// START UC-89 Update Tour Review
// Điểm 1-5 sao (BR-104) và nội dung 10-1000 ký tự.
export const updateReviewValidation = [
  param('id').isMongoId().withMessage('Mã đánh giá không hợp lệ'),
  body('rating')
    .notEmpty().withMessage('Vui lòng chọn số sao đánh giá')
    .isInt({ min: 1, max: 5 }).withMessage('Điểm đánh giá phải là số nguyên từ 1 đến 5 sao')
    .toInt(),
  body('comment')
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage('Nội dung đánh giá phải có từ 10 đến 1000 ký tự')
];
// END UC-89 Update Tour Review

// START UC-95 Restore Review
// Chỉ cần id đánh giá hợp lệ.
export const voteHelpfulValidation = [
  param('id').isMongoId().withMessage('Mã đánh giá không hợp lệ')
];

// Kiểm tra mã đánh giá khi khôi phục đánh giá đã xoá.
export const restoreReviewValidation = [
  param('id').isMongoId().withMessage('Mã đánh giá không hợp lệ')
];
// END UC-95 Restore Review

export const hideReviewValidation = [
  param('id').isMongoId().withMessage('Mã đánh giá không hợp lệ'),
  body('moderationReason')
    .trim()
    .isLength({ min: 5, max: 500 })
    .withMessage('Lý do ẩn đánh giá phải có từ 5 đến 500 ký tự')
];

// START UC-74 Cancel Booking
// Bắt buộc lý do hủy từ 10 đến 500 ký tự.
export const cancelBookingValidation = [
  param('id').isMongoId().withMessage('Mã đặt tour không hợp lệ'),
  body('reason')
    .trim()
    .notEmpty().withMessage('Vui lòng nhập lý do hủy đặt tour')
    .isLength({ min: 10, max: 500 })
    .withMessage('Lý do hủy phải có từ 10 đến 500 ký tự')
];
// END UC-74 Cancel Booking

export const reportedReviewListValidation = [
  query('search')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('Từ khóa tìm kiếm không được vượt quá 100 ký tự'),
  query('status')
    .optional()
    .isIn(['all', 'pending', 'approved', 'rejected', 'flagged'])
    .withMessage('Trạng thái đánh giá không hợp lệ'),
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Số trang phải là số nguyên dương')
    .toInt(),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 }).withMessage('Số báo cáo mỗi trang phải từ 1 đến 50')
    .toInt()
];

export const reviewEligibilityValidation = [
  param('tourId').isMongoId().withMessage('Mã tour không hợp lệ')
];

export const createReviewValidation = [
  param('tourId').isMongoId().withMessage('Mã tour không hợp lệ'),
  body('rating')
    .notEmpty().withMessage('Vui lòng chọn số sao đánh giá')
    .isInt({ min: 1, max: 5 }).withMessage('Số sao phải là số nguyên từ 1 đến 5')
    .toInt(),
  body('comment')
    .trim()
    .notEmpty().withMessage('Vui lòng nhập nội dung đánh giá')
    .isLength({ min: 10, max: 1000 }).withMessage('Nội dung đánh giá phải từ 10 đến 1000 ký tự')
];

// START UC-40 Create Tour Departure
// Tour/ngày khởi hành/số chỗ bắt buộc, giá tùy chọn không âm.
export const createDepartureValidation = [
  body('tourId')
    .notEmpty().withMessage('Vui lòng chọn tour')
    .isMongoId().withMessage('Mã tour không hợp lệ'),
  body('departureDate')
    .notEmpty().withMessage('Vui lòng chọn ngày khởi hành')
    .isISO8601().withMessage('Ngày khởi hành không hợp lệ')
    .toDate(),
  body('availableSeats')
    .exists({ values: 'falsy' }).withMessage('Vui lòng nhập số chỗ')
    .isInt({ min: 1 }).withMessage('Số chỗ phải lớp hơn 0')
    .toInt(),
  body('price')
    .optional({ nullable: true, checkFalsy: true })
    .isFloat({ min: 0 }).withMessage('Giá khởi hành phải là số không âm')
    .toFloat(),
  body('note')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Ghi chú không được vượt quá 500 ký tự')
];
// END UC-40 Create Tour Departure

export const listDeparturesValidation = [
  query('tourId')
    .notEmpty().withMessage('Vui lòng chọn tour')
    .isMongoId().withMessage('Mã tour không hợp lệ')
];

export const departureIdValidation = [
  param('id').isMongoId().withMessage('Mã lịch khởi hành không hợp lệ')
];

// START UC-43 Cancel Tour Departure
export const cancelDepartureValidation = [
  param('id').isMongoId().withMessage('Mã lịch khởi hành không hợp lệ'),
  body('reason')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 500 }).withMessage('Lý do hủy không được vượt quá 500 ký tự')
];
// END UC-43 Cancel Tour Departure

export const announcementIdValidation = [
  param('id').isMongoId().withMessage('Mã thông báo không hợp lệ')
];

export const createAnnouncementValidation = [
  body('title')
    .trim()
    .notEmpty().withMessage('Vui lòng nhập tiêu đề thông báo')
    .isLength({ max: 150 }).withMessage('Tiêu đề thông báo không được vượt quá 150 ký tự'),
  body('content')
    .trim()
    .notEmpty().withMessage('Vui lòng nhập nội dung thông báo')
    .isLength({ max: 5000 }).withMessage('Nội dung thông báo không được vượt quá 5000 ký tự'),
  body('audience')
    .optional()
    .isIn(['all', 'customer', 'tourProvider']).withMessage('Đối tượng nhận thông báo không hợp lệ'),
  body('isActive')
    .optional()
    .isBoolean().withMessage('Trạng thái phát hành phải là true hoặc false')
];

// START UC-83 Search & Filter Platform Announcements
export const announcementListValidation = [
  query('search')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('Từ khóa tìm kiếm không được vượt quá 100 ký tự'),
  query('audience')
    .optional()
    .isIn(['all', 'customer', 'tourProvider']).withMessage('Đối tượng nhận thông báo không hợp lệ'),
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Số trang phải là số nguyên dương')
    .toInt(),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 }).withMessage('Số thông báo mỗi trang phải từ 1 đến 50')
    .toInt()
];

export const managedAnnouncementListValidation = [
  ...announcementListValidation,
  query('status')
    .optional()
    .isIn(['all', 'active', 'draft']).withMessage('Trạng thái thông báo không hợp lệ')
];
// END UC-83 Search & Filter Platform Announcements

export const updateAnnouncementValidation = [
  ...announcementIdValidation,
  body('title')
    .trim()
    .notEmpty().withMessage('Vui lòng nhập tiêu đề thông báo')
    .isLength({ max: 150 }).withMessage('Tiêu đề thông báo không được vượt quá 150 ký tự'),
  body('content')
    .trim()
    .notEmpty().withMessage('Vui lòng nhập nội dung thông báo')
    .isLength({ max: 5000 }).withMessage('Nội dung thông báo không được vượt quá 5000 ký tự'),
  body('audience')
    .optional()
    .isIn(['all', 'customer', 'tourProvider']).withMessage('Đối tượng nhận thông báo không hợp lệ'),
  body('isActive')
    .optional()
    .isBoolean().withMessage('Trạng thái phát hành phải là true hoặc false')
];

export const updateTourDepartureValidation = [
  param('id').isMongoId().withMessage('Mã tour không hợp lệ'),
  body('departureLocation')
    .trim()
    .notEmpty().withMessage('Vui lòng nhập điểm khởi hành')
    .isLength({ max: 100 }).withMessage('Điểm khởi hành không được vượt quá 100 ký tự'),
  body('destinationLocation')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('Điểm đến không được vượt quá 100 ký tự'),
  body('departureDate')
    .optional({ nullable: true, checkFalsy: true })
    .isISO8601().withMessage('Ngày khởi hành không hợp lệ')
    .toDate()
];

export const updateDepartureValidation = [
  param('id').isMongoId().withMessage('Mã lịch khởi hành không hợp lệ'),
  body('departureDate')
    .optional({ nullable: true, checkFalsy: true })
    .isISO8601().withMessage('Ngày khởi hành không hợp lệ')
    .toDate(),
  body('availableSeats')
    .optional()
    .isInt({ min: 1 }).withMessage('Số chỗ phải lớn hơn 0')
    .toInt(),
  body('price')
    .optional({ nullable: true, checkFalsy: true })
    .isFloat({ min: 0 }).withMessage('Giá khởi hành phải là số không âm')
    .toFloat(),
  body('note')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Ghi chú không được vượt quá 500 ký tự'),
  body('status')
    .optional()
    .isIn(['scheduled', 'cancelled']).withMessage('Trạng thái không hợp lệ')
];

// START UC-120 Transfer Itinerary Ownership
// Bắt buộc chọn newOwnerId là Mongo id hợp lệ.
export const transferOwnershipValidation = [
    param('id').isMongoId().withMessage('Mã lịch trình không hợp lệ'),
    body('newOwnerId')
      .notEmpty().withMessage('Vui lòng chọn người nhận quyền sở hữu')
      .isMongoId().withMessage('Mã người dùng không hợp lệ')
  ];




// END UC-120 Transfer Itinerary Ownership

export const createNotificationValidation = [
  body('title')
    .trim()
    .notEmpty().withMessage('Vui lòng nhập tiêu đề thông báo')
    .isLength({ max: 150 }).withMessage('Tiêu đề thông báo không được vượt quá 150 ký tự'),
  body('message')
    .trim()
    .notEmpty().withMessage('Vui lòng nhập nội dung thông báo')
    .isLength({ max: 500 }).withMessage('Nội dung thông báo không được vượt quá 500 ký tự'),
  body('targetType')
    .isIn(['all', 'customer', 'tourProvider', 'staff', 'specific_user']).withMessage('Đối tượng nhận thông báo không hợp lệ'),
  body('targetEmail')
    .if(body('targetType').equals('specific_user'))
    .trim()
    .notEmpty().withMessage('Vui lòng nhập email người nhận')
    .isEmail().withMessage('Email người nhận không hợp lệ')
    .normalizeEmail()
];


export const notificationListValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Số trang phải là số nguyên dương')
    .toInt(),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Số thông báo mỗi trang phải từ 1 đến 100')
    .toInt(),
  query('status')
    .optional()
    .isIn(['all', 'unread', 'read']).withMessage('Trạng thái không hợp lệ'),
  query('type')
    .optional()
    .trim()
    .isLength({ max: 30 }).withMessage('Loại thông báo không hợp lệ')
];


export const managedNotificationListValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Số trang phải là số nguyên dương')
    .toInt(),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Số thông báo mỗi trang phải từ 1 đến 100')
    .toInt(),
  query('targetType')
    .optional({ values: 'falsy' })
    .isIn(['all', 'customer', 'tourProvider', 'staff', 'specific_user']).withMessage('Đối tượng nhận thông báo không hợp lệ'),
  query('search')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('Từ khóa tìm kiếm không được vượt quá 100 ký tự')
];

export const markNotificationReadValidation = [
  param('id').isMongoId().withMessage('Mã thông báo không hợp lệ')
];

export const updateNotificationValidation = [
  param('id').isMongoId().withMessage('Mã thông báo không hợp lệ'),
  body('title')
    .trim()
    .notEmpty().withMessage('Vui lòng nhập tiêu đề thông báo')
    .isLength({ max: 150 }).withMessage('Tiêu đề thông báo không được vượt quá 150 ký tự'),
  body('message')
    .trim()
    .notEmpty().withMessage('Vui lòng nhập nội dung thông báo')
    .isLength({ max: 500 }).withMessage('Nội dung thông báo không được vượt quá 500 ký tự')
];

export const deleteNotificationValidation = [
  param('id').isMongoId().withMessage('Mã thông báo không hợp lệ')
];

// START UC-147 Add Packing Item
export const addPackingItemValidation = [
  param('id').isMongoId().withMessage('Mã lịch trình không hợp lệ'),
  body('name')
    .trim()
    .notEmpty().withMessage('Vui lòng nhập tên vật dụng')
    .isLength({ max: 160 }).withMessage('Tên vật dụng không được vượt quá 160 ký tự')
];
// END UC-147 Add Packing Item

export const updatePackingItemValidation = [
  param('id').isMongoId().withMessage('Mã lịch trình không hợp lệ'),
  param('itemId').isMongoId().withMessage('Mã vật dụng không hợp lệ'),
  body('name')
    .trim()
    .notEmpty().withMessage('Vui lòng nhập tên vật dụng')
    .isLength({ max: 160 }).withMessage('Tên vật dụng không được vượt quá 160 ký tự')
];

export const removePackingItemValidation = [
  param('id').isMongoId().withMessage('Mã lịch trình không hợp lệ'),
  param('itemId').isMongoId().withMessage('Mã vật dụng không hợp lệ')
];

// START UC-151 Mark Item as Packed
export const updatePackingItemStatusValidation = [
  param('id').isMongoId().withMessage('Mã lịch trình không hợp lệ'),
  param('itemId').isMongoId().withMessage('Mã vật dụng không hợp lệ'),
  body('status')
    .isIn(['incomplete', 'completed'])
    .withMessage('Trạng thái vật dụng không hợp lệ')
];
// END UC-151 Mark Item as Packed

// START UC-152 Update Booking Passenger Info
export const updateBookingPassengerInfoValidation = [
  param('id').isMongoId().withMessage('Mã đặt tour không hợp lệ'),
  body('fullName')
    .trim()
    .notEmpty().withMessage('Vui lòng nhập họ và tên')
    .isLength({ min: 2, max: 100 }).withMessage('Họ và tên phải từ 2 đến 100 ký tự'),
  body('phone')
    .trim()
    .notEmpty().withMessage('Vui lòng nhập số điện thoại')
    .matches(/^(0)[35789][0-9]{8}$/).withMessage('Số điện thoại không hợp lệ'),
  body('email')
    .trim()
    .notEmpty().withMessage('Vui lòng nhập email')
    .matches(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.(com|vn|edu|edu\.vn)$/i).withMessage('Email không hợp lệ'),
  body('address')
    .optional({ checkFalsy: false })
    .trim()
    .isLength({ max: 200 }).withMessage('Địa chỉ không được vượt quá 200 ký tự'),
  body('note')
    .optional({ checkFalsy: false })
    .trim()
    .isLength({ max: 500 }).withMessage('Ghi chú không được vượt quá 500 ký tự')
];
// END UC-152 Update Booking Passenger Info

// START UC-128 Create Tour Submission
// Yêu cầu duyệt gắn với một tour nháp đã có: bắt buộc tourId hợp lệ, ghi chú tùy chọn.
export const createTourSubmissionValidation = [
  body('tourId')
    .notEmpty().withMessage('Vui lòng chọn tour cần gửi duyệt')
    .isMongoId().withMessage('Mã tour không hợp lệ'),
  body('providerNote')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 500 }).withMessage('Ghi chú không được vượt quá 500 ký tự')
];
// END UC-128 Create Tour Submission

// START UC-129 Update Tour Submission
// Provider sửa ghi chú (gửi lại), staff đổi status kèm lý do duyệt.
export const updateTourSubmissionValidation = [
  param('id').isMongoId().withMessage('Mã bài gửi không hợp lệ'),
  body('providerNote')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Ghi chú không được vượt quá 500 ký tự'),
  body('status')
    .optional()
    .isIn(['pending', 'approved', 'rejected', 'needs_revision']).withMessage('Trạng thái duyệt không hợp lệ'),
  // BR-63: yêu cầu chỉnh sửa phải kèm ghi chú từ 10 đến 1000 ký tự; từ chối chỉ
  // cần ghi chú khác rỗng (controller trả 400 khi thiếu).
  body('reviewNote')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 1000 }).withMessage('Nội dung phản hồi không được vượt quá 1000 ký tự')
    .custom((value, { req }) => {
      const note = typeof value === 'string' ? value.trim() : '';
      if (req.body.status === 'needs_revision' && note.length < 10) {
        throw new Error('Nội dung cần chỉnh sửa phải có ít nhất 10 ký tự');
      }
      return true;
    })
];
// END UC-129 Update Tour Submission

// START UC-130 View Tour Submission List
// Kiểm tra từ khoá, trạng thái, trang và số dòng của danh sách bài gửi.
export const tourSubmissionListValidation = [
  query('search')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('Từ khóa tìm kiếm không được vượt quá 100 ký tự'),
  query('status')
    .optional()
    .isIn(['all', 'pending', 'needs_revision', 'approved', 'rejected']).withMessage('Trạng thái bài gửi không hợp lệ'),
  query('tourId')
    .optional()
    .isMongoId().withMessage('Mã tour không hợp lệ'),
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Số trang phải là số nguyên dương')
    .toInt(),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Số bản ghi mỗi trang phải từ 1 đến 100')
    .toInt()
];
// END UC-130 View Tour Submission List

// START UC-131 Delete Tour Submission
// Kiểm tra tham số mã bài gửi trên đường dẫn.
export const tourSubmissionIdValidation = [
  param('id').isMongoId().withMessage('Mã bài gửi không hợp lệ')
];
// END UC-131 Delete Tour Submission

// START UC-58 Check Time Conflict
export const checkTimeConflictValidation = [
  param('id').isMongoId().withMessage('Mã lịch trình không hợp lệ'),
  body('date').isISO8601().withMessage('Ngày hoạt động không hợp lệ'),
  body('startTime').matches(/^([01]\d|2[0-3]):[0-5]\d$/).withMessage('Giờ bắt đầu phải có dạng HH:mm'),
  body('endTime').matches(/^([01]\d|2[0-3]):[0-5]\d$/).withMessage('Giờ kết thúc phải có dạng HH:mm'),
  body('excludeActivityId')
    .optional({ values: 'falsy' })
    .isMongoId().withMessage('Mã hoạt động loại trừ không hợp lệ'),
  body('title')
    .optional()
    .trim()
    .isLength({ max: 160 }).withMessage('Tên hoạt động không được vượt quá 160 ký tự')
];
// END UC-58 Check Time Conflict


// START UC-78 Respond to Booking (Provider)
export const respondBookingValidation = [
  param('id').isMongoId().withMessage('Mã đơn đặt tour không hợp lệ'),
  body('action')
    .isIn(['confirm', 'reject'])
    .withMessage('Hành động phản hồi phải là confirm (duyệt) hoặc reject (từ chối)'),
  body('rejectionReason')
    .if(body('action').equals('reject'))
    .trim()
    .notEmpty().withMessage('Vui lòng nhập lý do từ chối đặt chỗ')
    .isLength({ min: 5, max: 500 }).withMessage('Lý do từ chối phải từ 5 đến 500 ký tự')
];
// END UC-78 Respond to Booking (Provider)

// START UC-86 Mark Booking as No-Show (Provider)
export const markNoShowValidation = [
  param('id').isMongoId().withMessage('Mã đơn đặt tour không hợp lệ'),
  body('noShowReason')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Ghi chú vắng mặt không được vượt quá 500 ký tự')
];
// END UC-86 Mark Booking as No-Show (Provider)

// START UC-64 Compare Tours
export const compareToursValidation = [
  body('tourIds')
    .isArray({ min: 2, max: 4 })
    .withMessage('Vui lòng chọn từ 2 đến 4 tour để so sánh'),
  body('tourIds.*')
    .isMongoId()
    .withMessage('Mã tour không hợp lệ')
];
// END UC-64 Compare Tours


// START Reply to Tour Review
export const replyReviewValidation = [
  param('id').isMongoId().withMessage('Mã đánh giá không hợp lệ'),
  body('comment')
    .trim()
    .notEmpty().withMessage('Vui lòng nhập nội dung phản hồi')
    .isLength({ min: 5, max: 1000 })
    .withMessage('Nội dung phản hồi phải có từ 5 đến 1000 ký tự')
];

export const deleteReplyReviewValidation = [
  param('id').isMongoId().withMessage('Mã đánh giá không hợp lệ')
];
// END Reply to Tour Review
