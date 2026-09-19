import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { canAccessManagement } from '../config/managementNavigation';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
const logo = 'https://res.cloudinary.com/fkjcxcyn/image/upload/v1789823913/tripmate_assets/d4gczttux14p0fwdvxst.png';

function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const isManagementUser = canAccessManagement(user?.role);
  const canUseProfile = ['admin', 'staff', 'tourProvider', 'customer'].includes(user?.role);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const isActiveRoute = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isDropdownOpen]);

  const handleLogout = () => {
    logout();
    navigate('/login');
    toast.success('Bạn đã đăng xuất khỏi TripMate.');
  };

  const accountActions = isAuthenticated ? (
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
    <nav className="navbar navbar-expand-lg navbar-dark shadow-sm sticky-top navbar-glass tripmate-navbar py-2">
      <div className="container">
        <Link className="navbar-brand d-flex align-items-center gap-2 text-decoration-none" to="/">
          <img src={logo} alt="TripMate" className="tripmate-navbar-logo" />
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
                  <Link className={`nav-pill-link ${isActiveRoute('/itinerary') ? 'active' : ''}`} to="/itinerary">Lịch trình của tôi</Link>
                </li>
                <li className="nav-item">
                  <Link className={`nav-pill-link ${isActiveRoute('/about') ? 'active' : ''}`} to="/about">Giới thiệu</Link>
                </li>
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
