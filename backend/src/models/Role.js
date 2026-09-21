import mongoose from 'mongoose';

const roleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Tên vai trò là bắt buộc'],
    unique: true,
    trim: true,
    minlength: [2, 'Tên vai trò phải có ít nhất 2 ký tự'],
    maxlength: [50, 'Tên vai trò không được vượt quá 50 ký tự']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [200, 'Mô tả không được vượt quá 200 ký tự'],
    default: ''
  },
  isDefault: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

const Role = mongoose.model('Role', roleSchema);

export const DEFAULT_ROLES = [
  { name: 'admin', description: 'Quản trị viên hệ thống', isDefault: true },
  { name: 'staff', description: 'Nhân viên quản lý nội dung', isDefault: true },
  { name: 'tourProvider', description: 'Nhà cung cấp tour du lịch', isDefault: true },
  { name: 'customer', description: 'Khách hàng sử dụng dịch vụ', isDefault: true }
];

export const seedDefaultRoles = async () => {
  for (const role of DEFAULT_ROLES) {
    await Role.findOneAndUpdate(
      { name: role.name },
      { $setOnInsert: role },
      { upsert: true }
    );
  }
};

export default Role;
