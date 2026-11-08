import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { authApi } from '../services/api';
import { useToast } from '../hooks/useToast';

function ResetPassword() {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();

  const resetToken = location.state?.resetToken;
  const email = location.state?.email;

  const [formData, setFormData] = useState({
    newPassword: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Guard: if no resetToken, redirect to /forgot-password
  useEffect(() => {
    if (!resetToken) {
      toast.error('Vui lòng hoàn thành bước xác thực OTP trước');
      navigate('/forgot-password', { replace: true });
    }
  }, [resetToken, navigate, toast]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (error) setError('');
  };

  // Validation rules (BR-03)
  const isLengthValid = formData.newPassword.length >= 6;
  const hasUpper = /[A-Z]/.test(formData.newPassword);
  const hasLower = /[a-z]/.test(formData.newPassword);
  const hasNumber = /\d/.test(formData.newPassword);
  const isMatch = formData.newPassword && formData.newPassword === formData.confirmPassword;
  const isFormValid = isLengthValid && hasUpper && hasLower && hasNumber && isMatch;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!isLengthValid || !hasUpper || !hasLower || !hasNumber) {
      setError('Mật khẩu mới phải có ít nhất 6 ký tự, gồm 1 chữ hoa, 1 chữ thường và 1 chữ số');
      return;
    }

    if (!isMatch) {
      setError('Mật khẩu xác nhận không khớp');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await authApi.resetPassword({
        resetToken,
        newPassword: formData.newPassword
      });
      toast.success(response.message || 'Đặt lại mật khẩu thành công! Vui lòng đăng nhập.');
      navigate('/login', { replace: true });
    } catch (err) {
      setError(err.message || 'Không thể đặt lại mật khẩu');
      toast.error(err.message || 'Không thể đặt lại mật khẩu');
    } finally {
      setIsLoading(false);
    }
  };

  if (!resetToken) return null;

  return (
    <>
      <Navbar />
      <main className="py-5 bg-light flex-grow-1 d-flex align-items-center" style={{ minHeight: 'calc(100vh - 160px)' }}>
        <div className="container">
          <div className="row justify-content-center">
            <div className="col-12 col-sm-10 col-md-8 col-lg-5 col-xl-4">
              <div className="card shadow-sm border-0 rounded-3">
                <div className="card-body p-4 p-md-5">
                  <div className="text-center mb-4">
                    <div
                      className="d-inline-flex align-items-center justify-content-center bg-success bg-opacity-10 text-success rounded-circle mb-3"
                      style={{ width: '64px', height: '64px' }}
                    >
                      <i className="bi bi-lock-fill fs-2"></i>
                    </div>
                    <h1 className="h4 fw-bold mb-1">Đặt lại mật khẩu mới</h1>
                    <p className="text-muted small mb-0">
                      Tạo mật khẩu an toàn mới cho tài khoản {email ? `(${email})` : ''}
                    </p>
                  </div>

                  {error && (
                    <div className="alert alert-danger py-2 px-3 small d-flex align-items-center gap-2 mb-3" role="alert">
                      <i className="bi bi-exclamation-circle-fill flex-shrink-0"></i>
                      <div>{error}</div>
                    </div>
                  )}

                  <form onSubmit={handleSubmit} noValidate>
                    {/* New Password */}
                    <div className="mb-3">
                      <label htmlFor="newPassword" className="form-label small fw-medium">
                        Mật khẩu mới <span className="text-danger">*</span>
                      </label>
                      <div className="input-group">
                        <span className="input-group-text bg-white text-muted">
                          <i className="bi bi-shield-lock"></i>
                        </span>
                        <input
                          type={showPassword ? 'text' : 'password'}
                          className="form-control"
                          id="newPassword"
                          name="newPassword"
                          placeholder="Nhập mật khẩu mới"
                          value={formData.newPassword}
                          onChange={handleChange}
                          disabled={isLoading}
                          autoFocus
                          required
                        />
                        <button
                          type="button"
                          className="btn btn-outline-secondary bg-white text-muted border-start-0"
                          onClick={() => setShowPassword(!showPassword)}
                          disabled={isLoading}
                          aria-label="Hiện/ẩn mật khẩu"
                        >
                          <i className={`bi ${showPassword ? 'bi-eye-slash' : 'bi-eye'}`}></i>
                        </button>
                      </div>
                    </div>

                    {/* Confirm Password */}
                    <div className="mb-3">
                      <label htmlFor="confirmPassword" className="form-label small fw-medium">
                        Xác nhận mật khẩu mới <span className="text-danger">*</span>
                      </label>
                      <div className="input-group">
                        <span className="input-group-text bg-white text-muted">
                          <i className="bi bi-shield-check"></i>
                        </span>
                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          className="form-control"
                          id="confirmPassword"
                          name="confirmPassword"
                          placeholder="Nhập lại mật khẩu mới"
                          value={formData.confirmPassword}
                          onChange={handleChange}
                          disabled={isLoading}
                          required
                        />
                        <button
                          type="button"
                          className="btn btn-outline-secondary bg-white text-muted border-start-0"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          disabled={isLoading}
                          aria-label="Hiện/ẩn mật khẩu"
                        >
                          <i className={`bi ${showConfirmPassword ? 'bi-eye-slash' : 'bi-eye'}`}></i>
                        </button>
                      </div>
                    </div>

                    {/* Password criteria indicator */}
                    <div className="bg-light p-3 rounded-2 mb-4 border">
                      <div className="small fw-medium text-muted mb-2">Quy chuẩn mật khẩu (BR-03):</div>
                      <ul className="list-unstyled mb-0 small" style={{ fontSize: '0.8rem' }}>
                        <li className={`d-flex align-items-center gap-2 mb-1 ${isLengthValid ? 'text-success' : 'text-muted'}`}>
                          <i className={`bi ${isLengthValid ? 'bi-check-circle-fill' : 'bi-circle'}`}></i>
                          Tối thiểu 6 ký tự
                        </li>
                        <li className={`d-flex align-items-center gap-2 mb-1 ${hasUpper ? 'text-success' : 'text-muted'}`}>
                          <i className={`bi ${hasUpper ? 'bi-check-circle-fill' : 'bi-circle'}`}></i>
                          Ít nhất 1 chữ in hoa (A-Z)
                        </li>
                        <li className={`d-flex align-items-center gap-2 mb-1 ${hasLower ? 'text-success' : 'text-muted'}`}>
                          <i className={`bi ${hasLower ? 'bi-check-circle-fill' : 'bi-circle'}`}></i>
                          Ít nhất 1 chữ in thường (a-z)
                        </li>
                        <li className={`d-flex align-items-center gap-2 mb-1 ${hasNumber ? 'text-success' : 'text-muted'}`}>
                          <i className={`bi ${hasNumber ? 'bi-check-circle-fill' : 'bi-circle'}`}></i>
                          Ít nhất 1 chữ số (0-9)
                        </li>
                        <li className={`d-flex align-items-center gap-2 ${isMatch ? 'text-success' : 'text-muted'}`}>
                          <i className={`bi ${isMatch ? 'bi-check-circle-fill' : 'bi-circle'}`}></i>
                          Mật khẩu xác nhận trùng khớp
                        </li>
                      </ul>
                    </div>

                    <button
                      type="submit"
                      className="btn btn-primary w-100 py-2 fw-medium mb-3"
                      disabled={isLoading || !isFormValid}
                    >
                      {isLoading ? (
                        <span className="d-flex align-items-center justify-content-center gap-2">
                          <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                          Đang lưu mật khẩu mới...
                        </span>
                      ) : (
                        'Đổi mật khẩu'
                      )}
                    </button>

                    <div className="text-center">
                      <Link to="/login" className="small text-decoration-none text-muted">
                        Hủy và quay lại Đăng nhập
                      </Link>
                    </div>
                  </form>
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

export default ResetPassword;
