import { useEffect, useRef, useState, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { canAccessManagement } from '../config/managementNavigation';
import { canAccessRoleGroup, ACCESS_ROLES } from '../config/accessControl';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { notificationApi } from '../services/api';
import { getNotificationTypeMeta, formatNotificationDateTime } from '../utils/notificationFormatters';
import { TRIPMATE_LOGO_URL } from '../constants/brand';

function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const isManagementUser = canAccessManagement(user?.role);
  const canUseProfile = canAccessRoleGroup(user?.role, ACCESS_ROLES.CUSTOMER_ONLY);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Notification dropdown state
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isNotifLoading, setIsNotifLoading] = useState(false);
  const notificationDropdownRef = useRef(null);

  const canViewNotifications = isAuthenticated && ['customer', 'tourProvider', 'staff'].includes(user?.role);

  const loadRecentNotifications = useCallback(async () => {
    if (!canViewNotifications) return;
    try {
      setIsNotifLoading(true);
      const res = await notificationApi.getAll({ page: 1, limit: 5 });
      setNotifications(res.notifications || []);
      setUnreadCount(res.unreadCount || 0);
    } catch {
      // Ignore background load failures
    } finally {
      setIsNotifLoading(false);
    }
  }, [canViewNotifications]);

  useEffect(() => {
    if (canViewNotifications) {
      loadRecentNotifications();
    }
  }, [canViewNotifications, loadRecentNotifications, location.pathname]);

  const isActiveRoute = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
      if (notificationDropdownRef.current && !notificationDropdownRef.current.contains(event.target)) {
        setIsNotificationOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsDropdownOpen(false);
        setIsNotificationOpen(false);
      }
    };

    if (isDropdownOpen || isNotificationOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isDropdownOpen, isNotificationOpen]);

  const handleLogout = () => {
    logout();
    navigate('/login');
    toast.success('Bạn đã đăng xuất khỏi TripMate.');
  };

  const handleToggleNotifications = () => {
    setIsDropdownOpen(false);
    setIsNotificationOpen((current) => {
      const next = !current;
      if (next) {
        loadRecentNotifications();
      }
      return next;
    });
  };

  const handleClickNotification = async (item) => {
    if (!item.isRead) {
      try {
        await notificationApi.markAsRead(item._id);
        setNotifications((prev) =>
          prev.map((n) => (n._id === item._id ? { ...n, isRead: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch {
        // Ignore
      }
    }
    setIsNotificationOpen(false);
    navigate('/notifications');
  };

  const handleMarkAllReadQuick = async (e) => {
    e.stopPropagation();
    try {
      await notificationApi.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
      toast.success('Đã đánh dấu tất cả thông báo là đã đọc');
    } catch {
      toast.error('Không thể đánh dấu tất cả đã đọc');
    }
  };

  const accountActions = isAuthenticated ? (
    <div className="d-flex align-items-center gap-2">
      {canViewNotifications && (
        <div className="position-relative" ref={notificationDropdownRef}>
          <button
            type="button"
            className={`btn d-flex align-items-center justify-content-center text-white rounded-circle shadow-sm position-relative navbar-bell-btn ${
              isNotificationOpen ? 'is-active' : ''
            }`}
            style={{ width: '40px', height: '40px' }}
            onClick={handleToggleNotifications}
            aria-expanded={isNotificationOpen}
            aria-haspopup="true"
            title="Hộp thư thông báo"
          >
            <i className={`bi ${isNotificationOpen ? 'bi-bell-fill' : 'bi-bell'} text-white`}></i>
            {unreadCount > 0 && (
              <span
                className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger border border-2 border-dark"
                style={{ fontSize: '0.62rem', padding: '0.2em 0.4em', minWidth: '17px' }}
              >
                {unreadCount > 99 ? '99+' : unreadCount}
                <span className="visually-hidden">thông báo chưa đọc</span>
              </span>
            )}
          </button>

          {isNotificationOpen && (
            <div
              className="dropdown-menu dropdown-menu-end show shadow-lg border rounded-4 p-0 mt-2 notification-dropdown-menu"
              style={{
                backgroundColor: '#ffffff',
                borderColor: '#e2e8f0',
                width: '360px',
                maxWidth: 'calc(100vw - 24px)',
                right: 0,
                zIndex: 1060,
                boxShadow: '0 20px 40px rgba(0, 0, 0, 0.18), 0 4px 12px rgba(0, 0, 0, 0.08)'
              }}
            >
              {/* Dropdown Header */}
              <div className="d-flex align-items-center justify-content-between p-3 border-bottom border-light-subtle bg-light rounded-top-4">
                <div className="d-flex align-items-center gap-2">
                  <span className="fw-bold text-dark fs-6">Thông báo</span>
                  {unreadCount > 0 && (
                    <span className="badge bg-danger rounded-pill px-2 py-0.5" style={{ fontSize: '0.7rem' }}>
                      {unreadCount} mới
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    className="btn btn-link btn-sm text-primary p-0 text-decoration-none small d-inline-flex align-items-center gap-1 fw-medium"
                    style={{ fontSize: '0.78rem' }}
                    onClick={handleMarkAllReadQuick}
                    title="Đánh dấu tất cả là đã đọc"
                  >
                    <i className="bi bi-check2-all"></i>
                    <span>Đọc tất cả</span>
                  </button>
                )}
              </div>

              {/* Dropdown Notification List */}
              <div
                className="notification-dropdown-list"
                style={{ maxHeight: '330px', overflowY: 'auto' }}
              >
                {isNotifLoading && notifications.length === 0 ? (
                  <div className="text-center py-4 text-muted">
                    <span className="spinner-border spinner-border-sm me-2 text-primary" role="status"></span>
                    <span className="small">Đang tải thông báo...</span>
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="text-center py-4 px-3 text-muted">
                    <i className="bi bi-bell-slash fs-3 d-block mb-2 text-muted"></i>
                    <div className="small fw-semibold text-dark">Chưa có thông báo nào</div>
                    <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                      Thông báo gửi tới tài khoản của bạn sẽ xuất hiện tại đây
                    </div>
                  </div>
                ) : (
                  notifications.map((item) => {
                    const typeMeta = getNotificationTypeMeta(item.notificationType);
                    return (
                      <div
                        key={item._id}
                        role="button"
                        tabIndex={0}
                        className={`d-flex align-items-start gap-2.5 p-3 border-bottom border-light-subtle text-decoration-none notification-dropdown-item ${
                          !item.isRead ? 'bg-primary bg-opacity-10' : 'bg-white'
                        }`}
                        style={{
                          cursor: 'pointer',
                          transition: 'background-color 0.15s ease'
                        }}
                        onClick={() => handleClickNotification(item)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleClickNotification(item);
                        }}
                      >
                        <div
                          className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0 mt-0.5 shadow-xs"
                          style={{
                            width: '32px',
                            height: '32px',
                            backgroundColor: !item.isRead ? '#dbeafe' : '#f1f5f9',
                            color: !item.isRead ? '#2563eb' : '#64748b'
                          }}
                        >
                          <i className={`bi ${typeMeta.iconClass?.split(' ')[0] || 'bi-bell'} small`}></i>
                        </div>

                        <div className="flex-grow-1 overflow-hidden" style={{ minWidth: 0 }}>
                          <div className="d-flex align-items-center justify-content-between gap-1 mb-0.5">
                            <span
                              className={`small text-truncate ${!item.isRead ? 'fw-bold text-dark' : 'text-secondary'}`}
                              style={{ maxWidth: '210px' }}
                            >
                              {item.title}
                            </span>
                            {!item.isRead && (
                              <span
                                className="rounded-circle bg-primary flex-shrink-0"
                                style={{ width: '7px', height: '7px' }}
                                title="Chưa đọc"
                              ></span>
                            )}
                          </div>
                          <p
                            className="text-muted mb-1 text-break"
                            style={{
                              fontSize: '0.76rem',
                              lineHeight: 1.35,
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden'
                            }}
                          >
                            {item.message}
                          </p>
                          <div
                            className="text-muted d-flex align-items-center gap-1 font-monospace"
                            style={{ fontSize: '0.7rem' }}
                          >
                            <i className="bi bi-clock" style={{ fontSize: '0.68rem' }}></i>
                            <span>{formatNotificationDateTime(item.createdAt)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Dropdown Footer */}
              <div className="p-2 border-top border-light-subtle bg-light text-center rounded-bottom-4">
                <Link
                  to="/notifications"
                  className="btn btn-sm btn-link text-primary text-decoration-none fw-semibold d-inline-flex align-items-center gap-1.5 py-1 px-3 w-100 justify-content-center"
                  style={{ fontSize: '0.82rem' }}
                  onClick={() => setIsNotificationOpen(false)}
                >
                  <span>Xem tất cả thông báo</span>
                  <i className="bi bi-arrow-right"></i>
                </Link>
              </div>
            </div>
          )}
        </div>
      )}
      <div className="position-relative" ref={dropdownRef}>
      <button
        type="button"
        className="btn d-flex align-items-center gap-2 text-white bg-white bg-opacity-10 px-3 py-2 rounded-pill border border-white border-opacity-15 shadow-sm user-profile-link"
        onClick={() => setIsDropdownOpen((current) => !current)}
        aria-expanded={isDropdownOpen}
        aria-haspopup="true"
        title="Menu tài khoản"
      >
        <i className="bi bi-person-circle fs-5 text-white-50"></i>
        <span className="fw-medium small">{user?.username}</span>
        {user?.role === 'admin' && (
          <span className="badge bg-warning text-dark text-uppercase small" style={{ fontSize: '10px' }}>
            Quản trị viên
          </span>
        )}
        {user?.role === 'staff' && (
          <span className="badge bg-info text-dark text-uppercase small" style={{ fontSize: '10px' }}>
            Nhân viên
          </span>
        )}
        {user?.role === 'tourProvider' && (
          <span className="badge bg-primary text-white text-uppercase small" style={{ fontSize: '10px' }}>
            Nhà cung cấp
          </span>
        )}
        <i
          className="bi bi-chevron-down small text-white-50 ms-1"
          style={{
            transition: 'transform 0.2s ease',
            transform: isDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)'
          }}
        ></i>
      </button>

      {isDropdownOpen && (
        <div className="dropdown-menu dropdown-menu-end show shadow-lg border rounded-4 p-2 mt-2 user-dropdown-menu" style={{ backgroundColor: '#0f172a', borderColor: 'rgba(255, 255, 255, 0.1)' }}>
          <div className="px-3 py-2 border-bottom border-secondary border-opacity-25 mb-1">
            <div className="fw-bold text-white text-truncate">{user?.username}</div>
            <div className="text-white-50 small text-truncate user-dropdown-email">{user?.email}</div>
          </div>

          {isManagementUser && (
            <Link
              to="/management"
              className="dropdown-item d-flex align-items-center gap-2 py-2 px-3 rounded text-white-50"
              onClick={() => setIsDropdownOpen(false)}
            >
              <i className="bi bi-speedometer2 fs-6"></i>
              <span>Trang quản lý</span>
            </Link>
          )}

          {user?.role === 'tourProvider' && (
            <Link
              to="/announcements"
              className="dropdown-item d-flex align-items-center gap-2 py-2 px-3 rounded text-white-50"
              onClick={() => setIsDropdownOpen(false)}
            >
              <i className="bi bi-newspaper fs-6"></i>
              <span>Tin tức hệ thống</span>
            </Link>
          )}



          {user?.role === 'customer' && (
            <Link
              to="/my-bookings"
              id="navbar-my-bookings-link"
              className="dropdown-item d-flex align-items-center gap-2 py-2 px-3 rounded text-white-50"
              onClick={() => setIsDropdownOpen(false)}
            >
              <i className="bi bi-clock-history fs-6"></i>
              <span>Lịch sử đặt tour</span>
            </Link>
          )}

          {user?.role === 'customer' && (
            <Link
              to="/itinerary"
              className="dropdown-item d-flex align-items-center gap-2 py-2 px-3 rounded text-white-50"
              onClick={() => setIsDropdownOpen(false)}
            >
              <i className="bi bi-calendar2-week fs-6"></i>
              <span>Lịch trình của tôi</span>
            </Link>
          )}

          {user?.role === 'customer' && (
            <Link
              to="/favorites"
              className="dropdown-item d-flex align-items-center gap-2 py-2 px-3 rounded text-white-50"
              onClick={() => setIsDropdownOpen(false)}
            >
              <i className="bi bi-heart fs-6"></i>
              <span>Yêu thích</span>
            </Link>
          )}

          {user?.role === 'customer' && (
            <Link
              to="/my-complaints"
              className="dropdown-item d-flex align-items-center gap-2 py-2 px-3 rounded text-white-50"
              onClick={() => setIsDropdownOpen(false)}
            >
              <i className="bi bi-exclamation-diamond fs-6"></i>
              <span>Khiếu nại của tôi</span>
            </Link>
          )}

          {canUseProfile && (
            <Link
              to="/profile"
              className="dropdown-item d-flex align-items-center gap-2 py-2 px-3 rounded text-white-50"
              onClick={() => setIsDropdownOpen(false)}
            >
              <i className="bi bi-person fs-6"></i>
              <span>Hồ sơ</span>
            </Link>
          )}

          <div className="dropdown-divider border-secondary border-opacity-25 my-1"></div>

          <button
            type="button"
            className="dropdown-item d-flex align-items-center gap-2 py-2 px-3 rounded text-danger"
            onClick={() => {
              setIsDropdownOpen(false);
              handleLogout();
            }}
          >
            <i className="bi bi-box-arrow-right fs-6"></i>
            <span>Đăng xuất</span>
          </button>
        </div>
      )}
    </div>
    </div>
  ) : (
    <div className="d-flex align-items-center gap-2">
      <Link className="btn btn-sm btn-outline-light rounded-pill px-3 py-2 fw-medium border-opacity-25 shadow-none" to="/login">
        Đăng nhập
      </Link>
      <Link className="btn btn-sm btn-primary rounded-pill px-3 py-2 fw-semibold shadow-sm" to="/register">
        Đăng ký
      </Link>
    </div>
  );

  return (
    <nav className="navbar navbar-expand-lg navbar-dark shadow-sm sticky-top navbar-glass tripmate-navbar py-2" style={{ zIndex: 1040 }}>
      <div className="container">
        <Link className="navbar-brand d-flex align-items-center gap-2 text-decoration-none" to="/">
          <img src={TRIPMATE_LOGO_URL} alt="TripMate" className="tripmate-navbar-logo" />
          <span className="font-display fw-bold fs-3 text-white tracking-tight">TripMate</span>
        </Link>

        {isManagementUser ? (
          accountActions
        ) : (
          <>
            <button
              className="navbar-toggler border-0 shadow-none"
              type="button"
              data-bs-toggle="collapse"
              data-bs-target="#navbarNav"
              aria-controls="navbarNav"
              aria-expanded="false"
              aria-label="Mở điều hướng"
            >
              <span className="navbar-toggler-icon"></span>
            </button>
            <div className="collapse navbar-collapse" id="navbarNav">
              <ul className="navbar-nav me-auto mb-2 mb-lg-0 ms-lg-4 gap-1">
                <li className="nav-item">
                  <Link className={`nav-pill-link ${isActiveRoute('/destinations') ? 'active' : ''}`} to="/destinations">Điểm đến</Link>
                </li>
                <li className="nav-item">
                  <Link className={`nav-pill-link ${isActiveRoute('/tours') ? 'active' : ''}`} to="/tours">Tour du lịch</Link>
                </li>
                <li className="nav-item">
                  <Link className={`nav-pill-link ${isActiveRoute('/about') ? 'active' : ''}`} to="/about">Giới thiệu</Link>
                </li>
                {user?.role === 'customer' && (
                  <li className="nav-item">
                    <Link className={`nav-pill-link ${isActiveRoute('/announcements') ? 'active' : ''}`} to="/announcements">Tin tức</Link>
                  </li>
                )}
              </ul>
              <div className="d-flex align-items-center gap-2">{accountActions}</div>
            </div>
          </>
        )}
      </div>
    </nav>
  );
}

export default Navbar;
