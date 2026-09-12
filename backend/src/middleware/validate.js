import { body, param } from 'express-validator';

/**
 * Validate the payload used when staff create a destination.
 */
export const createDestinationValidation = [
  body('name')
    .trim()
    .notEmpty().withMessage('Destination name is required')
    .isLength({ max: 120 }).withMessage('Destination name cannot exceed 120 characters'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 2000 }).withMessage('Description cannot exceed 2000 characters'),

  body('category')
    .trim()
    .notEmpty().withMessage('Destination category is required')
    .isLength({ max: 80 }).withMessage('Destination category cannot exceed 80 characters'),

  body('location.address')
    .trim()
    .notEmpty().withMessage('Destination address is required'),

  body('location.city')
    .trim()
    .notEmpty().withMessage('Destination city is required'),

  body('location.country')
    .trim()
    .notEmpty().withMessage('Destination country is required'),

  body('images')
    .optional()
    .isArray({ max: 10 }).withMessage('Images must be an array with at most 10 items'),

  body('images.*')
    .optional()
    .isURL().withMessage('Each image must be a valid URL')
];

/**
 * Validate a destination identifier and its requested status.
 */
export const updateDestinationStatusValidation = [
  param('id').isMongoId().withMessage('Invalid destination identifier'),
  body('status')
    .isIn(['active', 'inactive']).withMessage('Status must be active or inactive')
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
    .optional()
    .trim()
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
    .optional({ values: 'falsy' })
    .trim()
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

/**
 * Validate an itinerary header before it is created or updated.
 */
export const itineraryValidation = [
  body('title')
    .optional()
    .trim()
    .notEmpty().withMessage('Itinerary title cannot be empty')
    .isLength({ max: 120 }).withMessage('Itinerary title cannot exceed 120 characters'),
  body('budget')
    .optional()
    .isFloat({ min: 0 }).withMessage('Budget cannot be negative'),
  body('startDate')
    .optional()
    .isISO8601().withMessage('Start date must be valid'),
  body('endDate')
    .optional()
    .isISO8601().withMessage('End date must be valid')
];

/**
 * Validate an itinerary activity payload.
 */
export const activityValidation = [
  param('id').isMongoId().withMessage('Invalid itinerary identifier'),
  body('title')
    .trim()
    .notEmpty().withMessage('Activity title is required')
    .isLength({ max: 160 }).withMessage('Activity title cannot exceed 160 characters'),
  body('date').isISO8601().withMessage('Activity date must be valid'),
  body('startTime').matches(/^([01]\d|2[0-3]):[0-5]\d$/).withMessage('Start time must use HH:mm format'),
  body('endTime').matches(/^([01]\d|2[0-3]):[0-5]\d$/).withMessage('End time must use HH:mm format'),
  body('estimatedCost').optional().isFloat({ min: 0 }).withMessage('Estimated cost cannot be negative')
];

export const itineraryIdValidation = [
  param('id').isMongoId().withMessage('Invalid itinerary identifier')
];