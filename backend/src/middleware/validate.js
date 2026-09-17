import { body, param } from 'express-validator';

/**
 * Validate the destination fields managed by Staff.
 */
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

/**
 * Validate a destination status change request.
 */
export const updateDestinationStatusValidation = [
  param('id').isMongoId().withMessage('Mã điểm đến không hợp lệ'),
  body('status')
    .isIn(['active', 'inactive']).withMessage('Trạng thái phải là active hoặc inactive')
];

// Register validation rules
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

// Login validation rules
export const loginValidation = [
  body('email')
    .trim()
    .notEmpty().withMessage('Vui lòng nhập email')
    .isEmail().withMessage('Vui lòng cung cấp địa chỉ email hợp lệ')
    .normalizeEmail(),
  
  body('password')
    .notEmpty().withMessage('Vui lòng nhập mật khẩu')
];

// Update profile validation rules
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
  body('role').optional().isIn(['admin', 'staff', 'tourProvider', 'customer']).withMessage('Vai trò không hợp lệ')
];

export const updateAccountRoleValidation = [
  body('role')
    .notEmpty().withMessage('Vui lòng chọn vai trò')
    .isIn(['admin', 'staff', 'tourProvider', 'customer']).withMessage('Vai trò không hợp lệ')
];

/**
 * Validate personal itinerary metadata.
 */
export const itineraryValidation = [
  body('title')
    .trim()
    .notEmpty().withMessage('Vui lòng nhập tên lịch trình')
    .isLength({ max: 120 }).withMessage('Tên lịch trình không được vượt quá 120 ký tự'),
  body('budget')
    .optional()
    .isFloat({ min: 0 }).withMessage('Ngân sách không được âm'),
  body('startDate')
    .optional({ values: 'falsy' })
    .isISO8601().withMessage('Ngày bắt đầu không hợp lệ'),
  body('endDate')
    .optional({ values: 'falsy' })
    .isISO8601().withMessage('Ngày kết thúc không hợp lệ')
];

/**
 * Validate a personal itinerary activity.
 */
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

export const tourIdValidation = [
  param('id').isMongoId().withMessage('Mã tour không hợp lệ')
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

/**
 * Validate destination category creation.
 */
export const createCategoryValidation = [
  body('name')
    .trim()
    .notEmpty().withMessage('Vui lòng nhập tên danh mục')
    .isLength({ max: 100 }).withMessage('Tên danh mục không được vượt quá 100 ký tự'),
  body('description')
    .optional()
    .trim()
];

/**
 * Validate destination category update.
 */
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

/**
 * Validate destination category ID param.
 */
export const categoryIdValidation = [
  param('id').isMongoId().withMessage('Mã danh mục không hợp lệ')
];

export const destinationIdValidation = [
  param('id').isMongoId().withMessage('Mã điểm đến không hợp lệ')
];

/**
 * Validate destination update.
 */
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
