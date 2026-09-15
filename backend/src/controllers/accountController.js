import User from '../models/User.js';
import { validationResult } from 'express-validator';

const toAccountResponse = (user) => ({
  id: user._id,
  username: user.username,
  email: user.email,
  role: user.role === 'user' ? 'customer' : user.role,
  isActive: user.isActive !== false,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt
});

const toAccountDetailResponse = (user) => ({
  ...toAccountResponse(user),
  phone: user.phone,
  dateOfBirth: user.dateOfBirth,
  gender: user.gender
});

const getValidationError = (req) => {
  const errors = validationResult(req);
  return errors.isEmpty() ? null : errors.array()[0]?.msg || 'Dữ liệu không hợp lệ';
};

const findDuplicate = async (account, username, email) => User.findOne({
  _id: { $ne: account?._id },
  $or: [{ username }, { email }]
});

export const getAccounts = async (req, res) => {
  try {
    const search = req.query.search?.trim();
    const filter = {
      isDeleted: { $ne: true }
    };
    if (search) {
      filter.$or = [
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    const accounts = await User.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, accounts: accounts.map(toAccountResponse) });
  } catch (error) {
    console.error('Get accounts error:', error);
    res.status(500).json({ success: false, message: 'Không thể tải danh sách tài khoản' });
  }
};

export const createAccount = async (req, res) => {
  try {
    const validationError = getValidationError(req);
    if (validationError) return res.status(400).json({ success: false, message: validationError });

    const { username, email, password, phone, dateOfBirth, gender, role } = req.body;
    const duplicate = await findDuplicate(null, username, email);
    if (duplicate) return res.status(400).json({ success: false, message: duplicate.email === email ? 'Email đã được đăng ký' : 'Tên người dùng đã được sử dụng' });

    const account = await User.create({ username, email, password, phone: phone || undefined, dateOfBirth: dateOfBirth || undefined, gender, role });
    res.status(201).json({ success: true, message: 'Tạo tài khoản thành công', account: toAccountResponse(account) });
  } catch (error) {
    console.error('Create account error:', error);
    res.status(500).json({ success: false, message: 'Không thể tạo tài khoản' });
  }
};

export const getAccount = async (req, res) => {
  try {
    const account = await User.findOne({ _id: req.params.id, isDeleted: { $ne: true } });
    if (!account) return res.status(404).json({ success: false, message: 'Không tìm thấy tài khoản' });
    res.json({ success: true, account: toAccountDetailResponse(account) });
  } catch (error) {
    console.error('Get account error:', error);
    res.status(500).json({ success: false, message: 'Không thể tải thông tin tài khoản' });
  }
};

export const updateAccount = async (req, res) => {
  try {
    const validationError = getValidationError(req);
    if (validationError) return res.status(400).json({ success: false, message: validationError });

    const account = await User.findOne({ _id: req.params.id, isDeleted: { $ne: true } });
    if (!account) return res.status(404).json({ success: false, message: 'Không tìm thấy tài khoản' });

    const { role } = req.body;
    if (String(account._id) === String(req.user._id)) {
      return res.status(400).json({ success: false, message: 'Không thể thay đổi vai trò của chính bạn' });
    }

    const updatedAccount = await User.findByIdAndUpdate(
      account._id,
      { $set: { role } },
      { new: true }
    );
    res.json({ success: true, message: 'Cập nhật tài khoản thành công', account: toAccountResponse(updatedAccount) });
  } catch (error) {
    console.error('Update account error:', error);
    res.status(500).json({ success: false, message: error.message || 'Không thể cập nhật tài khoản' });
  }
};

export const setAccountStatus = async (req, res) => {
  try {
    const { isActive } = req.body;
    if (typeof isActive !== 'boolean') return res.status(400).json({ success: false, message: 'Trạng thái tài khoản không hợp lệ' });
    const account = await User.findOne({ _id: req.params.id, isDeleted: { $ne: true } });
    if (!account) return res.status(404).json({ success: false, message: 'Không tìm thấy tài khoản' });
    if (String(account._id) === String(req.user._id) && !isActive) return res.status(400).json({ success: false, message: 'Không thể vô hiệu hóa chính bạn' });
    
    const updatedAccount = await User.findByIdAndUpdate(
      account._id,
      { $set: { isActive } },
      { new: true }
    );
    res.json({ success: true, message: isActive ? 'Đã kích hoạt tài khoản' : 'Đã vô hiệu hóa tài khoản', account: toAccountResponse(updatedAccount) });
  } catch (error) {
    console.error('Set account status error:', error);
    res.status(500).json({ success: false, message: error.message || 'Không thể cập nhật trạng thái tài khoản' });
  }
};

export const deleteAccount = async (req, res) => {
  try {
    const account = await User.findOne({ _id: req.params.id, isDeleted: { $ne: true } });
    if (!account) return res.status(404).json({ success: false, message: 'Không tìm thấy tài khoản' });
    if (String(account._id) === String(req.user._id)) return res.status(400).json({ success: false, message: 'Không thể xóa chính bạn' });

    await User.findByIdAndUpdate(account._id, {
      $set: {
        isDeleted: true,
        deletedAt: new Date(),
        isActive: false
      }
    });

    res.json({ success: true, message: 'Đã xóa tài khoản' });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({ success: false, message: error.message || 'Không thể xóa tài khoản' });
  }
};
