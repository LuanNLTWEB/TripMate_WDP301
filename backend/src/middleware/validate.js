import { body } from 'express-validator';

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
