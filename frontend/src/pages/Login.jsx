import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated } = useAuth();
  const toast = useToast();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: true
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // If already logged in, redirect to home or previous page
  useEffect(() => {
    if (isAuthenticated) {
      const from = location.state?.from?.pathname || '/';
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, location]);

  const validateForm = () => {
    const newErrors = {};
    const trimmedEmail = formData.email.trim();

    if (!trimmedEmail) {
      newErrors.email = 'Vui lòng nhập email';
    } else if (!/^\S+@\S+\.\S+$/.test(trimmedEmail)) {
      newErrors.email = 'Vui lòng nhập địa chỉ email hợp lệ';
    }

    if (!formData.password) {
      newErrors.password = 'Vui lòng nhập mật khẩu';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));

    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);

    try {
      const response = await login(formData.email.trim(), formData.password, formData.rememberMe);
      const from = location.state?.from?.pathname || (response.user.role === 'admin' ? '/admin/accounts' : '/');
      toast.success(`Chào mừng ${response.user.username || 'bạn'} quay lại!`);
      navigate(from, { replace: true });
    } catch (error) {
      toast.error(error.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Navbar />
      <main className="py-5 bg-light flex-grow-1 d-flex align-items-center">
        <div className="container">
          <div className="row justify-content-center">
            <div className="col-12 col-sm-10 col-md-8 col-lg-5 col-xl-4">
              <div className="card shadow-sm border-0 rounded-3">
                <div className="card-body p-4 p-md-5">
                  <div className="text-center mb-4">
                    <div className="d-inline-flex align-items-center justify-content-center bg-primary bg-opacity-10 text-primary rounded-circle mb-3" style={{ width: '60px', height: '60px' }}>
                      <i className="bi bi-person-fill-lock fs-2"></i>
                    </div>
                    <h2 className="fw-bold mb-1">Chào mừng trở lại</h2>
                    <p className="text-muted small">Đăng nhập để tiếp tục cùng TripMate</p>
                  </div>

                  <form onSubmit={handleSubmit} noValidate>
                    {/* Email Input */}
                    <div className="mb-3">
                      <label htmlFor="email" className="form-label fw-medium small">
                        Địa chỉ Email
                      </label>
                      <div className="input-group">
                        <span className="input-group-text bg-white text-muted">
                          <i className="bi bi-envelope"></i>
                        </span>
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
                        {errors.email && (
                          <div className="invalid-feedback">{errors.email}</div>
                        )}
                      </div>
                    </div>

                    {/* Password Input */}
                    <div className="mb-3">
                      <label htmlFor="password" className="form-label fw-medium small">
                        Mật khẩu
                      </label>
                      <div className="input-group">
                        <span className="input-group-text bg-white text-muted">
                          <i className="bi bi-lock"></i>
                        </span>
                        <input
                          type={showPassword ? 'text' : 'password'}
                          className={`form-control ${errors.password ? 'is-invalid' : ''}`}
                          id="password"
                          name="password"
                          value={formData.password}
                          onChange={handleChange}
                          placeholder="Nhập mật khẩu của bạn"
                          autoComplete="current-password"
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
                        {errors.password && (
                          <div className="invalid-feedback">{errors.password}</div>
                        )}
                      </div>
                    </div>

                    {/* Remember me & Forgot password */}
                    <div className="d-flex justify-content-between align-items-center mb-4">
                      <div className="form-check">
                        <input
                          type="checkbox"
                          className="form-check-input"
                          id="rememberMe"
                          name="rememberMe"
                          checked={formData.rememberMe}
                          onChange={handleChange}
                          disabled={isLoading}
                        />
                        <label className="form-check-label small text-muted" htmlFor="rememberMe">
                          Ghi nhớ đăng nhập
                        </label>
                      </div>
                      <Link to="/forgot-password" className="small text-decoration-none">
                        Quên mật khẩu?
                      </Link>
                    </div>

                    {/* Submit Button */}
                    <button
                      type="submit"
                      className="btn btn-primary w-100 py-2 fw-medium"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <span className="d-flex align-items-center justify-content-center gap-2">
                          <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                          Đang đăng nhập...
                        </span>
                      ) : (
                        'Đăng nhập'
                      )}
                    </button>
                  </form>

                  <div className="text-center mt-4">
                    <p className="text-muted small mb-0">
                      Chưa có tài khoản?{' '}
                      <Link to="/register" className="fw-medium text-decoration-none">
                        Đăng ký ngay
                      </Link>
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

export default Login;
