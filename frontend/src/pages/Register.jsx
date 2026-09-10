import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

function Register() {
  const navigate = useNavigate();
  const { register, isAuthenticated } = useAuth();

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    dateOfBirth: '',
    gender: 'other'
  });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // If already logged in, redirect to home
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const validateForm = () => {
    const newErrors = {};
    const trimmedUsername = formData.username.trim();
    const trimmedEmail = formData.email.trim();
    
    if (!trimmedUsername) {
      newErrors.username = 'Vui lòng nhập tên người dùng';
    } else if (trimmedUsername.length < 3 || trimmedUsername.length > 30) {
      newErrors.username = 'Tên người dùng phải từ 3 đến 30 ký tự';
    } else if (!/^[a-zA-Z0-9_]+$/.test(trimmedUsername)) {
      newErrors.username = 'Tên người dùng chỉ được chứa chữ cái, số và dấu gạch dưới';
    }
    
    if (!trimmedEmail) {
      newErrors.email = 'Vui lòng nhập email';
    } else if (!/^\S+@\S+\.\S+$/.test(trimmedEmail)) {
      newErrors.email = 'Vui lòng nhập địa chỉ email hợp lệ';
    }
    
    if (!formData.password) {
      newErrors.password = 'Vui lòng nhập mật khẩu';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Mật khẩu phải có ít nhất 6 ký tự';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      newErrors.password = 'Mật khẩu phải chứa ít nhất 1 chữ hoa, 1 chữ thường và 1 chữ số';
    }
    
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Mật khẩu xác nhận không khớp';
    }
    
    if (formData.phone && !/^[0-9]{10,11}$/.test(formData.phone.trim())) {
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
    if (serverError) {
      setServerError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');
    setSuccessMessage('');
    
    if (!validateForm()) return;
    
    setIsLoading(true);
    
    try {
      await register({
        username: formData.username.trim(),
        email: formData.email.trim(),
        password: formData.password,
        phone: formData.phone?.trim() || undefined,
        dateOfBirth: formData.dateOfBirth || undefined,
        gender: formData.gender
      });

      setSuccessMessage('Tài khoản của bạn đã được tạo thành công.');

      // Reset form fields after successful registration
      setFormData({
        username: '',
        email: '',
        password: '',
        confirmPassword: '',
        phone: '',
        dateOfBirth: '',
        gender: 'other'
      });
      setErrors({});
    } catch (error) {
      setServerError(error.message || 'Đăng ký thất bại. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Navbar />
      <main className="py-5 bg-light flex-grow-1">
        <div className="container">
          <div className="row justify-content-center">
            <div className="col-12 col-md-10 col-lg-8 col-xl-7">
              <div className="card shadow-sm border-0 rounded-3">
                <div className="card-body p-4 p-md-5">
                  <div className="text-center mb-4">
                    <div className="d-inline-flex align-items-center justify-content-center bg-primary bg-opacity-10 text-primary rounded-circle mb-3" style={{ width: '60px', height: '60px' }}>
                      <i className="bi bi-person-plus-fill fs-2"></i>
                    </div>
                    <h2 className="fw-bold mb-1">Tạo tài khoản</h2>
                    <p className="text-muted small">Tham gia TripMate và bắt đầu lên kế hoạch cho chuyến đi</p>
                  </div>
                  
                  {/* Error Notification */}
                  {serverError && (
                    <div className="alert alert-danger alert-dismissible fade show small" role="alert">
                      <i className="bi bi-exclamation-triangle-fill me-2"></i>
                      {serverError}
                      <button type="button" className="btn-close" onClick={() => setServerError('')} aria-label="Đóng"></button>
                    </div>
                  )}

                  {/* Success Notification */}
                  {successMessage && (
                    <div className="alert alert-success alert-dismissible fade show p-3 mb-4 rounded-3 shadow-sm" role="alert">
                      <div className="d-flex align-items-center gap-2">
                        <i className="bi bi-check-circle-fill fs-5 text-success flex-shrink-0"></i>
                        <div className="flex-grow-1 small">
                          <strong className="me-1">Đăng ký thành công!</strong>
                          {successMessage}
                        </div>
                        <button 
                          type="button" 
                          className="btn-close" 
                          onClick={() => setSuccessMessage('')} 
                          aria-label="Đóng"
                        ></button>
                      </div>
                    </div>
                  )}
                  
                  <form onSubmit={handleSubmit} noValidate>
                    <div className="row g-3">
                      <div className="col-12">
                        <label htmlFor="username" className="form-label fw-medium small">Tên người dùng</label>
                        <div className="input-group">
                          <span className="input-group-text bg-white text-muted"><i className="bi bi-person"></i></span>
                          <input
                            type="text"
                            className={`form-control ${errors.username ? 'is-invalid' : ''}`}
                            id="username"
                            name="username"
                            value={formData.username}
                            onChange={handleChange}
                            placeholder="Nhập tên người dùng"
                            autoComplete="username"
                            disabled={isLoading}
                            required
                          />
                          {errors.username && <div className="invalid-feedback">{errors.username}</div>}
                        </div>
                      </div>
                      
                      <div className="col-12">
                        <label htmlFor="email" className="form-label fw-medium small">Địa chỉ Email</label>
                        <div className="input-group">
                          <span className="input-group-text bg-white text-muted"><i className="bi bi-envelope"></i></span>
                          <input
                            type="email"
                            className={`form-control ${errors.email ? 'is-invalid' : ''}`}
                            id="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            placeholder="name@example.com"
                            autoComplete="email"
                            disabled={isLoading}
                            required
                          />
                          {errors.email && <div className="invalid-feedback">{errors.email}</div>}
                        </div>
                      </div>
                      
                      <div className="col-12">
                        <label htmlFor="phone" className="form-label fw-medium small">Số điện thoại (Không bắt buộc)</label>
                        <div className="input-group">
                          <span className="input-group-text bg-white text-muted"><i className="bi bi-phone"></i></span>
                          <input
                            type="tel"
                            className={`form-control ${errors.phone ? 'is-invalid' : ''}`}
                            id="phone"
                            name="phone"
                            value={formData.phone}
                            onChange={handleChange}
                            placeholder="Ví dụ: 0912345678"
                            autoComplete="tel"
                            disabled={isLoading}
                          />
                          {errors.phone && <div className="invalid-feedback">{errors.phone}</div>}
                        </div>
                      </div>
                      
                      <div className="col-md-6">
                        <label htmlFor="dateOfBirth" className="form-label fw-medium small">Ngày sinh (Không bắt buộc)</label>
                        <input
                          type="date"
                          className={`form-control ${errors.dateOfBirth ? 'is-invalid' : ''}`}
                          id="dateOfBirth"
                          name="dateOfBirth"
                          value={formData.dateOfBirth}
                          onChange={handleChange}
                          max={new Date().toISOString().split('T')[0]}
                          disabled={isLoading}
                        />
                        {errors.dateOfBirth && <div className="invalid-feedback">{errors.dateOfBirth}</div>}
                      </div>
                      
                      <div className="col-md-6">
                        <label htmlFor="gender" className="form-label fw-medium small">Giới tính</label>
                        <select
                          className="form-select"
                          id="gender"
                          name="gender"
                          value={formData.gender}
                          onChange={handleChange}
                          disabled={isLoading}
                        >
                          <option value="male">Nam</option>
                          <option value="female">Nữ</option>
                          <option value="other">Khác</option>
                        </select>
                      </div>
                      
                      <div className="col-md-6">
                        <label htmlFor="password" className="form-label fw-medium small">Mật khẩu</label>
                        <div className="input-group">
                          <span className="input-group-text bg-white text-muted"><i className="bi bi-lock"></i></span>
                          <input
                            type={showPassword ? 'text' : 'password'}
                            className={`form-control ${errors.password ? 'is-invalid' : ''}`}
                            id="password"
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            placeholder="Tạo mật khẩu"
                            autoComplete="new-password"
                            disabled={isLoading}
                            required
                          />
                          <button
                            type="button"
                            className="btn btn-outline-secondary"
                            onClick={() => setShowPassword(!showPassword)}
                            aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                            tabIndex="-1"
                          >
                            <i className={showPassword ? 'bi bi-eye-slash' : 'bi bi-eye'}></i>
                          </button>
                          {errors.password && <div className="invalid-feedback">{errors.password}</div>}
                        </div>
                        <div className="form-text small">
                          Tối thiểu 6 ký tự gồm chữ hoa, chữ thường và số
                        </div>
                      </div>
                      
                      <div className="col-md-6">
                        <label htmlFor="confirmPassword" className="form-label fw-medium small">Xác nhận mật khẩu</label>
                        <div className="input-group">
                          <span className="input-group-text bg-white text-muted"><i className="bi bi-lock-fill"></i></span>
                          <input
                            type={showPassword ? 'text' : 'password'}
                            className={`form-control ${errors.confirmPassword ? 'is-invalid' : ''}`}
                            id="confirmPassword"
                            name="confirmPassword"
                            value={formData.confirmPassword}
                            onChange={handleChange}
                            placeholder="Xác nhận lại mật khẩu"
                            autoComplete="new-password"
                            disabled={isLoading}
                            required
                          />
                          {errors.confirmPassword && <div className="invalid-feedback">{errors.confirmPassword}</div>}
                        </div>
                      </div>
                      
                      <div className="col-12 mt-4">
                        <button
                          type="submit"
                          className="btn btn-primary w-100 py-2 fw-medium"
                          disabled={isLoading}
                        >
                          {isLoading ? (
                            <span className="d-flex align-items-center justify-content-center gap-2">
                              <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                              Đang tạo tài khoản...
                            </span>
                          ) : (
                            'Đăng ký'
                          )}
                        </button>
                      </div>
                    </div>
                  </form>
                  
                  <div className="text-center mt-4">
                    <p className="text-muted small mb-0">
                      Đã có tài khoản?{' '}
                      <Link to="/login" className="fw-medium text-decoration-none">Đăng nhập</Link>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

export default Register;