import Role from '../models/Role.js';
import User from '../models/User.js';

export const getRoles = async (req, res) => {
  try {
    const roles = await Role.find().sort({ isDefault: -1, createdAt: -1 });
    res.json({ success: true, roles });
  } catch (error) {
    console.error('Get roles error:', error);
    res.status(500).json({ success: false, message: 'Không thể tải danh sách vai trò' });
  }
};

export const createRole = async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Tên vai trò là bắt buộc' });
    }

    const existing = await Role.findOne({ name: name.trim() });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Tên vai trò đã tồn tại' });
    }

    const role = await Role.create({
      name: name.trim(),
      description: description?.trim() || ''
    });
    res.status(201).json({ success: true, message: 'Tạo vai trò thành công', role });
  } catch (error) {
    console.error('Create role error:', error);
    res.status(500).json({ success: false, message: 'Không thể tạo vai trò' });
  }
};

export const updateRole = async (req, res) => {
  try {
    const role = await Role.findById(req.params.id);
    if (!role) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy vai trò' });
    }
    if (role.isDefault) {
      return res.status(400).json({ success: false, message: 'Không thể sửa vai trò mặc định' });
    }

    const { name, description } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Tên vai trò là bắt buộc' });
    }

    const duplicate = await Role.findOne({ name: name.trim(), _id: { $ne: role._id } });
    if (duplicate) {
      return res.status(400).json({ success: false, message: 'Tên vai trò đã tồn tại' });
    }

    const oldName = role.name;
    const updatedRole = await Role.findByIdAndUpdate(
      role._id,
      { $set: { name: name.trim(), description: description?.trim() || '' } },
      { new: true }
    );

    if (oldName !== name.trim()) {
      await User.updateMany({ role: oldName }, { $set: { role: name.trim() } });
    }

    res.json({ success: true, message: 'Cập nhật vai trò thành công', role: updatedRole });
  } catch (error) {
    console.error('Update role error:', error);
    res.status(500).json({ success: false, message: 'Không thể cập nhật vai trò' });
  }
};

export const deleteRole = async (req, res) => {
  try {
    const role = await Role.findById(req.params.id);
    if (!role) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy vai trò' });
    }
    if (role.isDefault) {
      return res.status(400).json({ success: false, message: 'Không thể xóa vai trò mặc định' });
    }

    const userCount = await User.countDocuments({ role: role.name, isDeleted: { $ne: true } });
    if (userCount > 0) {
      return res.status(400).json({ success: false, message: `Không thể xóa vai trò đang được ${userCount} tài khoản sử dụng` });
    }

    await Role.findByIdAndDelete(role._id);
    res.json({ success: true, message: 'Đã xóa vai trò' });
  } catch (error) {
    console.error('Delete role error:', error);
    res.status(500).json({ success: false, message: 'Không thể xóa vai trò' });
  }
};
