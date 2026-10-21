import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { authApi } from '../services/api';
import { useToast } from '../hooks/useToast';

function VerifyOtp() {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();

  const email = location.state?.email;
  const initialCooldown = location.state?.initialCooldown || 60;

  // Array of 6 single-digit strings
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const inputRefs = useRef([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [cooldown, setCooldown] = useState(initialCooldown);
  const [maxAttemptsReached, setMaxAttemptsReached] = useState(false);

  // Guard: if no email provided, redirect to forgot-password
  useEffect(() => {
    if (!email) {
      toast.error('Vui lòng nhập email để nhận mã OTP trước');
      navigate('/forgot-password', { replace: true });
    }
  }, [email, navigate, toast]);

  // Cooldown countdown timer for resend OTP (BR-10)
  useEffect(() => {
    if (cooldown <= 0) return;
    const interval = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldown]);

  const handleDigitChange = (index, value) => {
    if (maxAttemptsReached) return;
    setError('');

    // If user pasted a full code
    if (value.length > 1) {
      const numbers = value.replace(/\D/g, '').slice(0, 6).split('');
      const newDigits = [...otpDigits];
      numbers.forEach((num, i) => {
        if (i < 6) newDigits[i] = num;
      });
      setOtpDigits(newDigits);
      const focusIndex = Math.min(numbers.length, 5);
      inputRefs.current[focusIndex]?.focus();
      return;
    }

    const digit = value.replace(/\D/g, '');
    const newDigits = [...otpDigits];
    newDigits[index] = digit;
    setOtpDigits(newDigits);

    // Auto focus next input
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const fullOtp = otpDigits.join('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (fullOtp.length !== 6) {
      setError('Vui lòng nhập đầy đủ 6 chữ số mã OTP');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await authApi.verifyOtp({ email, otp: fullOtp });
      toast.success(response.message || 'Xác thực OTP thành công!');
      // Navigate to reset-password with resetToken
      navigate('/reset-password', {
        state: {
          email,
          resetToken: response.resetToken
        }
      });
    } catch (err) {
      setError(err.message || 'Mã OTP không hợp lệ');
      toast.error(err.message || 'Mã OTP không hợp lệ');
      if (err.errors?.maxAttemptsReached || err.maxAttemptsReached || err.message?.includes('quá 3 lần')) {
        setMaxAttemptsReached(true);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (cooldown > 0 || isResending) return;

    setIsResending(true);
    setError('');
    setMaxAttemptsReached(false);

    try {
      const response = await authApi.resendOtp({ email });
      toast.success(response.message || 'Mã OTP mới đã được gửi!');
      setCooldown(response.cooldown || 60);
      setOtpDigits(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } catch (err) {
      toast.error(err.message || 'Không thể gửi lại mã OTP');
      setError(err.message || 'Không thể gửi lại mã OTP');
      if (err.remainingSeconds) {
        setCooldown(err.remainingSeconds);
      }
    } finally {
      setIsResending(false);
    }
  };

  if (!email) return null;

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
                      <i className="bi bi-shield-lock-fill fs-2"></i>
                    </div>
                    <h1 className="h4 fw-bold mb-1">Xác thực mã OTP</h1>
                    <p className="text-muted small mb-1">
                      Chúng tôi đã gửi mã xác thực 6 số đến email:
                    </p>
                    <div className="fw-semibold text-dark small mb-2">{email}</div>
                    <Link to="/forgot-password" className="small text-decoration-none text-primary">
                      Đổi email khác?
                    </Link>
                  </div>

                  {error && (
                    <div className="alert alert-danger py-2 px-3 small d-flex align-items-center gap-2 mb-3" role="alert">
                      <i className="bi bi-exclamation-circle-fill flex-shrink-0"></i>
                      <div>{error}</div>
                    </div>
                  )}

                  {maxAttemptsReached ? (
                    <div className="text-center py-3">
                      <p className="text-danger small mb-3">
                        Bạn đã nhập sai mã OTP 3 lần. Vui lòng yêu cầu gửi mã mới để tiếp tục.
                      </p>
                      <button
                        type="button"
                        className="btn btn-outline-primary w-100 py-2"
                        onClick={handleResendOtp}
                        disabled={cooldown > 0 || isResending}
                      >
                        {isResending ? 'Đang gửi...' : cooldown > 0 ? `Gửi lại mã OTP (${cooldown}s)` : 'Gửi lại mã OTP'}
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleSubmit}>
                      <div className="mb-4">
                        <label className="form-label small fw-medium text-center d-block mb-3">
                          Nhập mã OTP 6 chữ số (Hiệu lực 10 phút)
                        </label>
                        <div className="d-flex justify-content-between gap-2">
                          {otpDigits.map((digit, index) => (
                            <input
                              key={index}
                              ref={(el) => (inputRefs.current[index] = el)}
                              type="text"
                              inputMode="numeric"
                              pattern="[0-9]*"
                              maxLength="1"
                              className="form-control text-center fs-4 fw-bold p-0"
                              style={{ width: '46px', height: '52px' }}
                              value={digit}
                              onChange={(e) => handleDigitChange(index, e.target.value)}
                              onKeyDown={(e) => handleKeyDown(index, e)}
                              disabled={isLoading || maxAttemptsReached}
                              autoFocus={index === 0}
                            />
                          ))}
                        </div>
                      </div>

                      <button
                        type="submit"
                        className="btn btn-primary w-100 py-2 fw-medium mb-3"
                        disabled={isLoading || fullOtp.length !== 6}
                      >
                        {isLoading ? (
                          <span className="d-flex align-items-center justify-content-center gap-2">
                            <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                            Đang xác thực...
                          </span>
                        ) : (
                          'Xác thực OTP'
                        )}
                      </button>

                      <div className="d-flex justify-content-between align-items-center small text-muted pt-2 border-top">
                        <span>Chưa nhận được mã?</span>
                        <button
                          type="button"
                          className="btn btn-link btn-sm p-0 text-decoration-none fw-medium"
                          onClick={handleResendOtp}
                          disabled={cooldown > 0 || isResending}
                        >
                          {isResending ? (
                            'Đang gửi...'
                          ) : cooldown > 0 ? (
                            <span className="text-muted">Gửi lại ({cooldown}s)</span>
                          ) : (
                            'Gửi lại mã OTP'
                          )}
                        </button>
                      </div>
                    </form>
                  )}
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

export default VerifyOtp;
