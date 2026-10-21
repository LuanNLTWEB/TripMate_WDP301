import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { authApi } from '../services/api';
import { useToast } from '../hooks/useToast';

function ForgotPassword() {
  const navigate = useNavigate();
  const toast = useToast();

  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setError('Vui lòng nhập địa chỉ email');
      return;
    }

    if (!/^\S+@\S+\.\S+$/.test(trimmedEmail)) {
      setError('Vui lòng nhập địa chỉ email hợp lệ');
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      const response = await authApi.forgotPassword({ email: trimmedEmail });
      toast.success(response.message || 'Mã xác thực OTP đã được gửi đến email của bạn');
      // Navigate to OTP verification page, passing email in state
      navigate('/verify-otp', {
        state: {
          email: trimmedEmail,
          initialCooldown: response.cooldown || 60
        }
      });
    } catch (err) {
      toast.error(err.message || 'Không thể gửi yêu cầu đặt lại mật khẩu');
      setError(err.message || 'Không thể gửi yêu cầu đặt lại mật khẩu');
    } finally {
      setIsLoading(false);
    }
  };

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
                      className="d-inline-flex align-items-center justify-content-center bg-primary bg-opacity-10 text-primary rounded-circle mb-3"
                      style={{ width: '64px', height: '64px' }}
                    >
                      <i className="bi bi-key-fill fs-2"></i>
                    </div>
                    <h1 className="h4 fw-bold mb-1">Quên mật khẩu?</h1>
                    <p className="text-muted small mb-0">
                      Nhập địa chỉ email liên kết với tài khoản TripMate của bạn để nhận mã OTP xác thực.
                    </p>
                  </div>

                  {error && (
                    <div className="alert alert-danger py-2 px-3 small d-flex align-items-center gap-2 mb-3" role="alert">
                      <i className="bi bi-exclamation-circle-fill flex-shrink-0"></i>
                      <div>{error}</div>
                    </div>
                  )}

                  <form onSubmit={handleSubmit} noValidate>
                    <div className="mb-3">
                      <label htmlFor="email" className="form-label small fw-medium">
                        Địa chỉ Email <span className="text-danger">*</span>
                      </label>
                      <div className="input-group">
                        <span className="input-group-text bg-white text-muted">
                          <i className="bi bi-envelope"></i>
                        </span>
                        <input
                          type="email"
                          className={`form-control ${error ? 'is-invalid' : ''}`}
                          id="email"
                          name="email"
                          placeholder="name@example.com"
                          value={email}
                          onChange={(e) => {
                            setEmail(e.target.value);
                            if (error) setError('');
                          }}
                          disabled={isLoading}
                          autoFocus
                          required
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="btn btn-primary w-100 py-2 fw-medium mb-3"
                      disabled={isLoading || !email.trim()}
                    >
                      {isLoading ? (
                        <span className="d-flex align-items-center justify-content-center gap-2">
                          <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                          Đang gửi mã OTP...
                        </span>
                      ) : (
                        'Gửi mã OTP xác nhận'
                      )}
                    </button>

                    <div className="text-center">
                      <Link to="/login" className="small text-decoration-none text-muted d-inline-flex align-items-center gap-1">
                        <i className="bi bi-arrow-left"></i> Quay lại Đăng nhập
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

export default ForgotPassword;
