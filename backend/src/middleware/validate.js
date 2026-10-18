import { body, param } from 'express-validator';
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

export const updateTourValidation = [
  param('id').isMongoId().withMessage('Tour ID is invalid'),
  body('title').optional().trim().notEmpty().withMessage('Tour title is required').isLength({ max: 100 }).withMessage('Tour title cannot exceed 100 characters'),
  body('description').optional().trim().notEmpty().withMessage('Tour description is required'),
  body('location').optional().trim().notEmpty().withMessage('Tour location is required'),
  body('departureLocation').optional().trim().notEmpty().withMessage('Departure location is required'),
  body('destinationLocation').optional().trim().notEmpty().withMessage('Destination location is required'),
  body('duration').optional().trim().notEmpty().withMessage('Tour duration is required'),
  body('categoryId').optional({ values: 'falsy' }).isMongoId().withMessage('Tour category ID is invalid'),
  body('images').optional().isArray().withMessage('Images must be an array')
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

export const smartItineraryValidation = [
  body('title').trim().notEmpty().withMessage('Itinerary title is required').isLength({ max: 120 }).withMessage('Itinerary title cannot exceed 120 characters'),
  body('budget').optional({ values: 'falsy' }).isFloat({ min: 0 }).withMessage('Budget must be a non-negative number'),
  body('destination').optional({ values: 'falsy' }).isString().isLength({ max: 120 }).withMessage('Destination preference cannot exceed 120 characters'),
  body('startDate').optional({ values: 'falsy' }).isISO8601().withMessage('Start date is invalid'),
  body('endDate').optional({ values: 'falsy' }).isISO8601().withMessage('End date is invalid')
];

export const optimizeBudgetValidation = [
  param('id').isMongoId().withMessage('Itinerary ID is invalid'),
  body('apply').optional().isBoolean().withMessage('Apply must be a boolean')
];

export const createReviewValidation = [
  param('tourId').isMongoId().withMessage('Tour ID is invalid'),
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5').toInt(),
  body('comment').optional({ values: 'falsy' }).trim().isLength({ max: 1000 }).withMessage('Comment cannot exceed 1000 characters')
];

export const bookingIdValidation = [
  param('id').isMongoId().withMessage('Booking ID is invalid')
];

export const paymentFailureValidation = [
  param('id').isMongoId().withMessage('Booking ID is invalid'),
  body('reason').trim().notEmpty().withMessage('Payment failure reason is required').isLength({ max: 500 }).withMessage('Payment failure reason cannot exceed 500 characters')
];

export const announcementIdValidation = [
  param('id').isMongoId().withMessage('Announcement ID is invalid')
];

export const createAnnouncementValidation = [
  body('title').trim().notEmpty().withMessage('Announcement title is required').isLength({ max: 150 }).withMessage('Announcement title cannot exceed 150 characters'),
  body('content').trim().notEmpty().withMessage('Announcement content is required').isLength({ max: 5000 }).withMessage('Announcement content cannot exceed 5000 characters'),
  body('audience').optional().isIn(['all', 'customer', 'tourProvider']).withMessage('Announcement audience is invalid'),
  body('isActive').optional().isBoolean().withMessage('Announcement active status must be boolean')
];

export const updateAnnouncementValidation = [
  param('id').isMongoId().withMessage('Announcement ID is invalid'),
  body('title').optional().trim().notEmpty().withMessage('Announcement title cannot be empty').isLength({ max: 150 }).withMessage('Announcement title cannot exceed 150 characters'),
  body('content').optional().trim().notEmpty().withMessage('Announcement content cannot be empty').isLength({ max: 5000 }).withMessage('Announcement content cannot exceed 5000 characters'),
  body('audience').optional().isIn(['all', 'customer', 'tourProvider']).withMessage('Announcement audience is invalid'),
  body('isActive').optional().isBoolean().withMessage('Announcement active status must be boolean')
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
];

export const updateTourScheduleValidation = [
  param('id').isMongoId().withMessage('Tour ID is invalid'),
  param('scheduleId').isMongoId().withMessage('Schedule ID is invalid'),
  body('title').trim().notEmpty().withMessage('Schedule title is required').isLength({ min: 3, max: 150 }).withMessage('Schedule title must be 3 to 150 characters'),
  body('description').trim().notEmpty().withMessage('Schedule description is required').isLength({ min: 5, max: 2000 }).withMessage('Schedule description must be 5 to 2000 characters'),
  body('day').isInt({ min: 1, max: 50 }).withMessage('Schedule day must be between 1 and 50'),
  body('meals').optional().isArray().withMessage('Meals must be an array')
];

export const deleteTourScheduleValidation = [
  param('id').isMongoId().withMessage('Tour ID is invalid'),
  param('scheduleId').isMongoId().withMessage('Schedule ID is invalid')
];

export const createTourDepartureValidation = [
  param('id').isMongoId().withMessage('Tour ID is invalid'),
  body('departureDate').isISO8601().withMessage('Departure date is invalid').custom((value) => {
    const departureDate = new Date(value);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (departureDate < today) throw new Error('Departure date must be in the future');
    return true;
  }),
  body('capacity').isInt({ min: 1 }).withMessage('Departure capacity must be at least 1')
];

export const cancelTourDepartureValidation = [
  param('id').isMongoId().withMessage('Tour ID is invalid'),
  param('departureId').isMongoId().withMessage('Departure ID is invalid'),
  body('reason').trim().notEmpty().withMessage('Cancellation reason is required').isLength({ min: 5, max: 500 }).withMessage('Cancellation reason must be 5 to 500 characters')
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



