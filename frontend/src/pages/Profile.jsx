import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { authApi } from '../services/api';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

function ProfileForm({ user, onUpdateProfile }) {
  const toast = useToast();
  const initialValues = {
    username: user?.username || '',
    email: user?.email || '',
    phone: user?.phone || '',
    dateOfBirth: user?.dateOfBirth ? user.dateOfBirth.substring(0, 10) : '',
    gender: user?.gender || 'other'
  };

  const [formData, setFormData] = useState(initialValues);
  const [originalData, setOriginalData] = useState(initialValues);
  const [isDirty, setIsDirty] = useState(false);

  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  useEffect(() => {
    setIsDirty(JSON.stringify(formData) !== JSON.stringify(originalData));
  }, [formData, originalData]);

  const validateForm = () => {
    const newErrors = {};
    const trimmedUsername = formData.username.trim();

    if (!trimmedUsername) {
      newErrors.username = 'Vui lòng nhập tên người dùng';
    } else if (trimmedUsername.length < 3 || trimmedUsername.length > 30) {
      newErrors.username = 'Tên người dùng phải từ 3 đến 30 ký tự';
    } else if (!/^[a-zA-Z0-9_]+$/.test(trimmedUsername)) {
      newErrors.username = 'Tên người dùng chỉ được chứa chữ cái, số và dấu gạch dưới';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Vui lòng nhập số điện thoại';
    } else if (!/^[0-9]{10,11}$/.test(formData.phone.trim())) {
      newErrors.phone = 'Số điện thoại phải gồm 10-11 chữ số';
    }

    if (formData.dateOfBirth) {
      const dob = new Date(formData.dateOfBirth);
      const today = new Date();
      let age = today.getFullYear() - dob.getFullYear();
      const m = today.getMonth() - dob.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
        age--;
      }
      if (age < 12) {
        newErrors.dateOfBirth = 'Bạn phải đủ ít nhất 12 tuổi';
      }
      if (dob > today) {
        newErrors.dateOfBirth = 'Ngày sinh không thể ở tương lai';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleReset = () => {
    setFormData(originalData);
    setErrors({});
    setIsEditMode(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);

    try {
      const updatedData = {
        username: formData.username.trim(),
        email: formData.email,
        phone: formData.phone?.trim() || '',
        dateOfBirth: formData.dateOfBirth || '',
        gender: formData.gender
      };
      const res = await onUpdateProfile({
        username: updatedData.username,
        phone: updatedData.phone,
        dateOfBirth: updatedData.dateOfBirth || null,
        gender: updatedData.gender
      });

      setFormData(updatedData);
      setOriginalData(updatedData);
      setIsEditMode(false);
      toast.success(res.message || 'Cập nhật thông tin thành công!');
    } catch (error) {
      toast.error(error.message || 'Cập nhật thông tin thất bại. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  const formattedJoinDate = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString('vi-VN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    : null;

  return (
    <div className="container">
      <div className="row justify-content-center">
        <div className="col-12 col-lg-9 col-xl-8">
          {/* Profile Header Card */}
          <div className="card shadow-sm border-0 rounded-3 mb-4">
            <div className="card-body p-4 p-md-5">
              <div className="d-flex flex-column flex-sm-row align-items-center gap-4 text-center text-sm-start">
                <div
                  className="d-flex align-items-center justify-content-center bg-primary bg-opacity-10 text-primary rounded-circle flex-shrink-0"
                  style={{ width: '88px', height: '88px' }}
                >
                  <i className="bi bi-person-circle fs-1 text-primary"></i>
                </div>
                <div className="flex-grow-1">
                  <div className="d-flex flex-wrap align-items-center justify-content-center justify-content-sm-start gap-2 mb-1">
                    <h3 className="fw-bold mb-0">{user.username}</h3>
                    <span className="badge bg-primary-subtle text-primary border border-primary-subtle text-uppercase small">
                      {{
                        admin: 'Quản trị viên',
                        staff: 'Nhân viên',
                        tourProvider: 'Tour Provider',
                        customer: 'Khách hàng'
                      }[user.role] || 'Khách hàng'}
                    </span>
                  </div>
                  <p className="text-muted small mb-1">
                    <i className="bi bi-envelope me-1"></i>
                    {user.email}
                  </p>
                  {formattedJoinDate && (
                    <p className="text-muted small mb-0">
                      <i className="bi bi-calendar3 me-1"></i>
                      Thành viên từ: {formattedJoinDate}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Edit Profile Card */}
          <div className="card shadow-sm border-0 rounded-3">
            <div className="card-body p-4 p-md-5">
              <div className="d-flex align-items-center justify-content-between mb-4 border-bottom pb-3">
                <div>
                  <h4 className="fw-bold mb-1">Thông tin cá nhân</h4>
                  <p className="text-muted small mb-0">Chỉnh sửa và cập nhật thông tin tài khoản cơ bản của bạn</p>
                </div>
                <i className="bi bi-person-gear fs-3 text-muted"></i>
              </div>

              <form onSubmit={handleSubmit} noValidate>
                <div className="row g-3">
                  {/* Username */}
                  <div className="col-12 col-md-6">
                    <label htmlFor="username" className="form-label fw-medium small">
                      Tên người dùng
                    </label>
                    <div className="input-group">
                      <span className="input-group-text bg-white text-muted">
                        <i className="bi bi-person"></i>
                      </span>
                      <input
                        type="text"
                        className={`form-control ${errors.username ? 'is-invalid' : ''}`}
                        id="username"
                        name="username"
                        value={formData.username}
                        onChange={handleChange}
                        placeholder="Nhập tên người dùng"
                        disabled={isLoading || !isEditMode}
                        required
                      />
                      {errors.username && (
                        <div className="invalid-feedback">{errors.username}</div>
                      )}
                    </div>
                  </div>

                  {/* Email (Readonly identity) */}
                  <div className="col-12 col-md-6">
                    <label htmlFor="email" className="form-label fw-medium small">
                      Địa chỉ Email
                    </label>
                    <div className="input-group">
                      <span className="input-group-text bg-light text-muted">
                        <i className="bi bi-envelope"></i>
                      </span>
                      <input
                        type="email"
                        className="form-control bg-light text-muted"
                        id="email"
                        name="email"
                        value={formData.email}
                        readOnly
                        disabled
                      />
                    </div>
                    <div className="form-text small">Email là định danh tài khoản và không thể chỉnh sửa.</div>
                  </div>

                  {/* Phone */}
                  <div className="col-12 col-md-6">
                    <label htmlFor="phone" className="form-label fw-medium small">
                      Số điện thoại
                    </label>
                    <div className="input-group">
                      <span className="input-group-text bg-white text-muted">
                        <i className="bi bi-phone"></i>
                      </span>
                      <input
                        type="tel"
                        className={`form-control ${errors.phone ? 'is-invalid' : ''}`}
                        id="phone"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        placeholder="Ví dụ: 0912345678"
                        disabled={isLoading || !isEditMode}
                        required
                      />
                      {errors.phone && (
                        <div className="invalid-feedback">{errors.phone}</div>
                      )}
                    </div>
                  </div>

                  {/* Date of Birth */}
                  <div className="col-12 col-md-6">
                    <label htmlFor="dateOfBirth" className="form-label fw-medium small">
                      Ngày sinh
                    </label>
                    <div className="input-group">
                      <span className="input-group-text bg-white text-muted">
                        <i className="bi bi-calendar-event"></i>
                      </span>
                      <input
                        type="date"
                        className={`form-control ${errors.dateOfBirth ? 'is-invalid' : ''}`}
                        id="dateOfBirth"
                        name="dateOfBirth"
                        value={formData.dateOfBirth}
                        onChange={handleChange}
                        max={new Date().toISOString().split('T')[0]}
                        disabled={isLoading || !isEditMode}
                      />
                      {errors.dateOfBirth && (
                        <div className="invalid-feedback">{errors.dateOfBirth}</div>
                      )}
                    </div>
                  </div>

                  {/* Gender */}
                  <div className="col-12 col-md-6">
                    <label htmlFor="gender" className="form-label fw-medium small">
                      Giới tính
                    </label>
                    <select
                      className="form-select"
                      id="gender"
                      name="gender"
                      value={formData.gender}
                      onChange={handleChange}
                      disabled={isLoading || !isEditMode}
                    >
                      <option value="male">Nam</option>
                      <option value="female">Nữ</option>
                      <option value="other">Khác</option>
                    </select>
                  </div>

                  
                </div>

                {/* Action buttons */}
                <div className="d-flex justify-content-end gap-2 mt-4 pt-3 border-top">
                  {!isEditMode ? (
                    <button
                      type="button"
                      className="btn btn-outline-secondary px-4"
                      onClick={() => setIsEditMode(true)}
                      disabled={isLoading}
                    >
                      Chỉnh sửa
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        className="btn btn-outline-secondary px-4"
                        onClick={handleReset}
                        disabled={isLoading}
                      >
                        Quay lại
                      </button>
                      <button
                        type="submit"
                        className="btn btn-primary px-4 d-inline-flex align-items-center gap-2"
                        disabled={isLoading || !isDirty}
                      >
                        {isLoading ? (
                          <>
                            <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                            <span>Đang lưu...</span>
                          </>
                        ) : (
                          <>
                            <i className="bi bi-check2"></i>
                            <span>Lưu thay đổi</span>
                          </>
                        )}
                      </button>
                    </>
                  )}

                </div>
              </form>
            </div>
          </div>

          {/* Change Password Card */}
          <ChangePasswordForm />
        </div>
      </div>
    </div>
  );
}

function ChangePasswordForm() {
  const toast = useToast();
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  const toggleShow = (field) => {
    setShowPassword(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.currentPassword) {
      newErrors.currentPassword = 'Vui lòng nhập mật khẩu hiện tại';
    }

    if (!formData.newPassword) {
      newErrors.newPassword = 'Vui lòng nhập mật khẩu mới';
    } else if (formData.newPassword.length < 6) {
      newErrors.newPassword = 'Mật khẩu mới phải có ít nhất 6 ký tự';
    } else if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.newPassword)) {
      newErrors.newPassword = 'Mật khẩu mới phải chứa ít nhất 1 chữ hoa, 1 chữ thường và 1 chữ số';
    } else if (formData.currentPassword && formData.newPassword === formData.currentPassword) {
      newErrors.newPassword = 'Mật khẩu mới không được trùng với mật khẩu hiện tại';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Vui lòng xác nhận mật khẩu mới';
    } else if (formData.newPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Mật khẩu xác nhận không khớp';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);

    try {
      const res = await authApi.changePassword({
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword
      });

      toast.success(res.message || 'Đổi mật khẩu thành công!');
      setFormData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      setErrors({});
    } catch (error) {
      toast.error(error.message || 'Đổi mật khẩu thất bại. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="card shadow-sm border-0 rounded-3 mt-4">
      <div className="card-body p-4 p-md-5">
        <div className="d-flex align-items-center justify-content-between mb-4 border-bottom pb-3">
          <div>
            <h4 className="fw-bold mb-1">Đổi mật khẩu</h4>
            <p className="text-muted small mb-0">Cập nhật mật khẩu để tăng cường bảo mật cho tài khoản của bạn</p>
          </div>
          <i className="bi bi-shield-lock fs-3 text-muted"></i>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="row g-3">
            {/* Current Password */}
            <div className="col-12">
              <label htmlFor="currentPassword" className="form-label fw-medium small">
                Mật khẩu hiện tại
              </label>
              <div className="input-group">
                <span className="input-group-text bg-white text-muted">
                  <i className="bi bi-key"></i>
                </span>
                <input
                  type={showPassword.current ? 'text' : 'password'}
                  className={`form-control ${errors.currentPassword ? 'is-invalid' : ''}`}
                  id="currentPassword"
                  name="currentPassword"
                  value={formData.currentPassword}
                  onChange={handleChange}
                  placeholder="Nhập mật khẩu hiện tại"
                  disabled={isLoading}
                  required
                />
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => toggleShow('current')}
                  tabIndex="-1"
                  aria-label={showPassword.current ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                  <i className={`bi ${showPassword.current ? 'bi-eye-slash' : 'bi-eye'}`}></i>
                </button>
              </div>
              {errors.currentPassword && (
                <div className="invalid-feedback d-block">{errors.currentPassword}</div>
              )}
            </div>

            {/* New Password */}
            <div className="col-12 col-md-6">
              <label htmlFor="newPassword" className="form-label fw-medium small">
                Mật khẩu mới
              </label>
              <div className="input-group">
                <span className="input-group-text bg-white text-muted">
                  <i className="bi bi-lock"></i>
                </span>
                <input
                  type={showPassword.new ? 'text' : 'password'}
                  className={`form-control ${errors.newPassword ? 'is-invalid' : ''}`}
                  id="newPassword"
                  name="newPassword"
                  value={formData.newPassword}
                  onChange={handleChange}
                  placeholder="Tối thiểu 6 ký tự (Hoa, thường, số)"
                  disabled={isLoading}
                  required
                />
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => toggleShow('new')}
                  tabIndex="-1"
                  aria-label={showPassword.new ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                  <i className={`bi ${showPassword.new ? 'bi-eye-slash' : 'bi-eye'}`}></i>
                </button>
              </div>
              {errors.newPassword && (
                <div className="invalid-feedback d-block">{errors.newPassword}</div>
              )}
            </div>

            {/* Confirm New Password */}
            <div className="col-12 col-md-6">
              <label htmlFor="confirmPassword" className="form-label fw-medium small">
                Xác nhận mật khẩu mới
              </label>
              <div className="input-group">
                <span className="input-group-text bg-white text-muted">
                  <i className="bi bi-lock-fill"></i>
                </span>
                <input
                  type={showPassword.confirm ? 'text' : 'password'}
                  className={`form-control ${errors.confirmPassword ? 'is-invalid' : ''}`}
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Nhập lại mật khẩu mới"
                  disabled={isLoading}
                  required
                />
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => toggleShow('confirm')}
                  tabIndex="-1"
                  aria-label={showPassword.confirm ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                  <i className={`bi ${showPassword.confirm ? 'bi-eye-slash' : 'bi-eye'}`}></i>
                </button>
              </div>
              {errors.confirmPassword && (
                <div className="invalid-feedback d-block">{errors.confirmPassword}</div>
              )}
            </div>
          </div>

          {/* Action button */}
          <div className="d-flex justify-content-end mt-4 pt-3 border-top">
            <button
              type="submit"
              className="btn btn-primary px-4 d-inline-flex align-items-center gap-2"
              disabled={isLoading || !formData.currentPassword || !formData.newPassword || !formData.confirmPassword}
            >
              {isLoading ? (
                <>
                  <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                  <span>Đang xử lý...</span>
                </>
              ) : (
                <>
                  <i className="bi bi-shield-check"></i>
                  <span>Đổi mật khẩu</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Profile() {
  const navigate = useNavigate();
  const { user, isAuthenticated, updateProfile } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  if (!user) {
    return null;
  }

  return (
    <>
      <Navbar />
      <main className="py-5 bg-light flex-grow-1">
        <ProfileForm key={user.id || user.username} user={user} onUpdateProfile={updateProfile} />
      </main>
      <Footer />
    </>
  );
}

export default Profile;
