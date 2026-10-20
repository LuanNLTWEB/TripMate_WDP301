import { body, param, query } from 'express-validator';
import Role from '../models/Role.js';

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

export const updateDestinationStatusValidation = [
  param('id').isMongoId().withMessage('Mã điểm đến không hợp lệ'),
  body('status')
    .isIn(['active', 'inactive']).withMessage('Trạng thái phải là active hoặc inactive')
];

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

export const activityValidation = [
  param('id').isMongoId().withMessage('Mã lịch trình không hợp lệ'),
  body('title').trim().notEmpty().withMessage('Vui lòng nhập tên hoạt động'),
  body('date').isISO8601().withMessage('Ngày hoạt động không hợp lệ'),
  body('startTime').matches(/^([01]\d|2[0-3]):[0-5]\d$/).withMessage('Giờ bắt đầu phải có dạng HH:mm'),
  body('endTime').matches(/^([01]\d|2[0-3]):[0-5]\d$/).withMessage('Giờ kết thúc phải có dạng HH:mm'),
  body('estimatedCost').optional().isFloat({ min: 0 }).withMessage('Chi phí không được âm')
];

export const itineraryIdValidation = [
  param('id').isMongoId().withMessage('Mã lịch trình không hợp lệ')
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

export const updateTourCapacityValidation = [
  param('id').isMongoId().withMessage('Mã tour không hợp lệ'),
  body('availableSeats')
    .exists({ values: 'falsy' }).withMessage('Vui lòng nhập số chỗ')
    .isInt({ min: 0 }).withMessage('Số chỗ phải là số nguyên không âm')
    .toInt()
];

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
    .isIn(['all', 'pending', 'confirmed', 'cancelled'])
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

export const restoreReviewValidation = [
  param('id').isMongoId().withMessage('Mã đánh giá không hợp lệ')
];

export const hideReviewValidation = [
  param('id').isMongoId().withMessage('Mã đánh giá không hợp lệ'),
  body('moderationReason')
    .trim()
    .isLength({ min: 5, max: 500 })
    .withMessage('Lý do ẩn đánh giá phải có từ 5 đến 500 ký tự')
];

export const cancelBookingValidation = [
  param('id').isMongoId().withMessage('Mã đặt tour không hợp lệ'),
  body('reason')
    .trim()
    .notEmpty().withMessage('Vui lòng nhập lý do hủy đặt tour')
    .isLength({ min: 10, max: 500 })
    .withMessage('Lý do hủy phải có từ 10 đến 500 ký tự')
];

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
    .isInt({ min: 0 }).withMessage('Số chỗ phải là số nguyên không âm')
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

export const listDeparturesValidation = [
  query('tourId')
    .notEmpty().withMessage('Vui lòng chọn tour')
    .isMongoId().withMessage('Mã tour không hợp lệ')
];

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

export const announcementListValidation = [
  query('search')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('Từ khóa tìm kiếm không được vượt quá 100 ký tự'),
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
    .isIn(['all', 'active', 'draft']).withMessage('Trạng thái thông báo không hợp lệ'),
  query('audience')
    .optional()
    .isIn(['all', 'customer', 'tourProvider']).withMessage('Đối tượng nhận thông báo không hợp lệ')
];

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
    .isInt({ min: 0 }).withMessage('Số chỗ phải là số nguyên không âm')
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

export const transferOwnershipValidation = [
    param('id').isMongoId().withMessage('Mã lịch trình không hợp lệ'),
    body('newOwnerId')
      .notEmpty().withMessage('Vui lòng chọn người nhận quyền sở hữu')
      .isMongoId().withMessage('Mã người dùng không hợp lệ')
  ];


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
