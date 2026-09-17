import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { useAuth } from '../hooks/useAuth';

const Settings = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Settings states with localStorage persistence
  const [theme, setTheme] = useState(() => localStorage.getItem('tripmate_theme') || 'system');
  const [language, setLanguage] = useState(() => localStorage.getItem('tripmate_lang') || 'vi');
  const [emailNotifications, setEmailNotifications] = useState(() => {
    const saved = localStorage.getItem('tripmate_notif_email');
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [itineraryReminders, setItineraryReminders] = useState(() => {
    const saved = localStorage.getItem('tripmate_notif_itinerary');
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [promoAlerts, setPromoAlerts] = useState(() => {
    const saved = localStorage.getItem('tripmate_notif_promo');
    return saved !== null ? JSON.parse(saved) : false;
  });

  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleSave = (e) => {
    e.preventDefault();
    localStorage.setItem('tripmate_theme', theme);
    localStorage.setItem('tripmate_lang', language);
    localStorage.setItem('tripmate_notif_email', JSON.stringify(emailNotifications));
    localStorage.setItem('tripmate_notif_itinerary', JSON.stringify(itineraryReminders));
    localStorage.setItem('tripmate_notif_promo', JSON.stringify(promoAlerts));

    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
    }, 3000);
  };

  if (!user) return null;

  return (
    <>
      <Navbar />
      <main className="py-5 bg-light flex-grow-1">
        <div className="container">
          <div className="row justify-content-center">
            <div className="col-12 col-lg-8">
              {/* Header */}
              <div className="d-flex align-items-center justify-content-between mb-4">
                <div>
                  <h3 className="fw-bold mb-1">
                    <i className="bi bi-gear-wide-connected me-2 text-primary"></i>
                    Cài đặt hệ thống
                  </h3>
                  <p className="text-muted small mb-0">Quản lý trải nghiệm sử dụng, giao diện và thông báo của bạn</p>
                </div>
                <Link to="/profile" className="btn btn-outline-primary btn-sm rounded-pill px-3">
                  <i className="bi bi-person me-1"></i>
                  Trang cá nhân
                </Link>
              </div>

              {saveSuccess && (
                <div className="alert alert-success alert-dismissible fade show d-flex align-items-center gap-2 mb-4 shadow-sm" role="alert">
                  <i className="bi bi-check-circle-fill fs-5"></i>
                  <div>Đã lưu toàn bộ cài đặt thành công!</div>
                  <button type="button" className="btn-close ms-auto" onClick={() => setSaveSuccess(false)} aria-label="Close"></button>
                </div>
              )}

              <form onSubmit={handleSave}>
                {/* Giao diện & Trải nghiệm */}
                <div className="card shadow-sm border-0 rounded-3 mb-4">
                  <div className="card-header bg-white py-3 border-bottom">
                    <h5 className="card-title fw-bold mb-0 d-flex align-items-center gap-2">
                      <i className="bi bi-palette text-primary"></i>
                      Giao diện & Ngôn ngữ
                    </h5>
                  </div>
                  <div className="card-body p-4">
                    <div className="mb-4">
                      <label className="form-label fw-medium">Chế độ giao diện</label>
                      <div className="row g-3">
                        <div className="col-4">
                          <button
                            type="button"
                            className={`btn w-100 py-2 border d-flex flex-column align-items-center gap-1 ${theme === 'light' ? 'btn-primary text-white' : 'btn-outline-secondary'}`}
                            onClick={() => setTheme('light')}
                          >
                            <i className="bi bi-sun fs-5"></i>
                            <span className="small">Sáng</span>
                          </button>
                        </div>
                        <div className="col-4">
                          <button
                            type="button"
                            className={`btn w-100 py-2 border d-flex flex-column align-items-center gap-1 ${theme === 'dark' ? 'btn-primary text-white' : 'btn-outline-secondary'}`}
                            onClick={() => setTheme('dark')}
                          >
                            <i className="bi bi-moon-stars fs-5"></i>
                            <span className="small">Tối</span>
                          </button>
                        </div>
                        <div className="col-4">
                          <button
                            type="button"
                            className={`btn w-100 py-2 border d-flex flex-column align-items-center gap-1 ${theme === 'system' ? 'btn-primary text-white' : 'btn-outline-secondary'}`}
                            onClick={() => setTheme('system')}
                          >
                            <i className="bi bi-laptop fs-5"></i>
                            <span className="small">Hệ thống</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="mb-2">
                      <label htmlFor="languageSelect" className="form-label fw-medium">Ngôn ngữ hiển thị</label>
                      <select
                        id="languageSelect"
                        className="form-select"
                        value={language}
                        onChange={(e) => setLanguage(e.target.value)}
                      >
                        <option value="vi">Tiếng Việt (Vietnamese)</option>
                        <option value="en">English (Tiếng Anh)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Cài đặt Thông báo */}
                <div className="card shadow-sm border-0 rounded-3 mb-4">
                  <div className="card-header bg-white py-3 border-bottom">
                    <h5 className="card-title fw-bold mb-0 d-flex align-items-center gap-2">
                      <i className="bi bi-bell text-warning"></i>
                      Thông báo & Nhắc nhở
                    </h5>
                  </div>
                  <div className="card-body p-4">
                    <div className="d-flex justify-content-between align-items-center mb-3 pb-3 border-bottom">
                      <div>
                        <h6 className="fw-semibold mb-1">Email cập nhật tài khoản</h6>
                        <small className="text-muted">Nhận email khi có thông báo đăng nhập hoặc thay đổi tài khoản</small>
                      </div>
                      <div className="form-check form-switch fs-5">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          role="switch"
                          checked={emailNotifications}
                          onChange={(e) => setEmailNotifications(e.target.checked)}
                        />
                      </div>
                    </div>

                    <div className="d-flex justify-content-between align-items-center mb-3 pb-3 border-bottom">
                      <div>
                        <h6 className="fw-semibold mb-1">Nhắc nhở lịch trình chuyến đi</h6>
                        <small className="text-muted">Nhận thông báo nhắc nhở trước khi chuyến du lịch bắt đầu</small>
                      </div>
                      <div className="form-check form-switch fs-5">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          role="switch"
                          checked={itineraryReminders}
                          onChange={(e) => setItineraryReminders(e.target.checked)}
                        />
                      </div>
                    </div>

                    <div className="d-flex justify-content-between align-items-center">
                      <div>
                        <h6 className="fw-semibold mb-1">Ưu đãi & Tour giảm giá</h6>
                        <small className="text-muted">Nhận thông tin các tour khuyến mãi và điểm đến hot nhất tuần</small>
                      </div>
                      <div className="form-check form-switch fs-5">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          role="switch"
                          checked={promoAlerts}
                          onChange={(e) => setPromoAlerts(e.target.checked)}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tài khoản & Bảo mật */}
                <div className="card shadow-sm border-0 rounded-3 mb-4">
                  <div className="card-header bg-white py-3 border-bottom">
                    <h5 className="card-title fw-bold mb-0 d-flex align-items-center gap-2">
                      <i className="bi bi-shield-lock text-success"></i>
                      Bảo mật & Quyền riêng tư
                    </h5>
                  </div>
                  <div className="card-body p-4">
                    <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
                      <div>
                        <h6 className="fw-semibold mb-1">Thông tin cá nhân & Mật khẩu</h6>
                        <small className="text-muted">Đổi họ tên, số điện thoại, ngày sinh và cập nhật hồ sơ</small>
                      </div>
                      <Link to="/profile" className="btn btn-outline-secondary btn-sm px-3">
                        <i className="bi bi-pencil-square me-1"></i>
                        Cập nhật hồ sơ
                      </Link>
                    </div>
                  </div>
                </div>

                {/* Save button */}
                <div className="d-flex justify-content-end gap-2">
                  <button type="submit" className="btn btn-primary px-4 py-2 rounded-pill shadow-sm d-flex align-items-center gap-2">
                    <i className="bi bi-check2-circle"></i>
                    <span>Lưu cài đặt</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
};

export default Settings;
