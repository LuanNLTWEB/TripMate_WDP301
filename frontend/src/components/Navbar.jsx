import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import logo from '../assets/logo.png';

function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const isAdmin = user?.role === 'admin';
  const canUseProfile = ['admin', 'staff', 'tourProvider', 'customer'].includes(user?.role);

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

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

  return (
    <nav className="navbar navbar-expand-lg navbar-dark shadow-sm sticky-top" style={{ backgroundColor: '#1a1a2e' }}>
      <div className="container">
        <Link className="navbar-brand d-flex align-items-center gap-2" to={isAdmin ? '/admin/accounts' : '/'}>
          <img src={logo} alt="TripMate" style={{ height: '40px', width: 'auto' }} />
          <span className="fw-bold fs-3">TripMate</span>
        </Link>
        <button
          className="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#navbarNav"
          aria-controls="navbarNav"
          aria-expanded="false"
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon"></span>
        </button>
        <div className="collapse navbar-collapse" id="navbarNav">
          <ul className="navbar-nav me-auto mb-2 mb-lg-0">
            {isAdmin ? (
              <>
                <li className="nav-item">
                  <Link className="nav-link text-warning" to="/admin/accounts">Quản lý tài khoản</Link>
                </li>
                <li className="nav-item">
                  <Link className="nav-link text-warning" to="/staff/destinations">Quản lý điểm đến</Link>
                </li>
                <li className="nav-item">
                  <Link className="nav-link text-warning" to="/staff/destination-categories">Quản lý danh mục</Link>
                </li>
                <li className="nav-item">
                  <Link className="nav-link text-warning" to="/stats">Thống kê</Link>
                </li>
              </>
            ) : user?.role === 'staff' ? (
              <>
                <li className="nav-item">
                  <Link className="nav-link text-warning" to="/staff/destinations">Quản lý điểm đến</Link>
                </li>
                <li className="nav-item">
                  <Link className="nav-link text-warning" to="/staff/destination-categories">Quản lý danh mục</Link>
                </li>
                <li className="nav-item">
                  <Link className="nav-link text-white-50 hover-white" to="/">Trang chủ</Link>
                </li>
                <li className="nav-item">
                  <Link className="nav-link text-white-50 hover-white" to="/destinations">Điểm đến</Link>
                </li>
                <li className="nav-item">
                  <Link className="nav-link text-white-50 hover-white" to="/tours">Tour du lịch</Link>
                </li>
                <li className="nav-item">
                  <Link className="nav-link text-white-50 hover-white" to="/itinerary">Lịch trình của tôi</Link>
                </li>
                <li className="nav-item">
                  <Link className="nav-link text-warning" to="/stats">Thống kê</Link>
                </li>
              </>
            ) : (
              <>
                <li className="nav-item">
                  <Link className="nav-link text-white-50 hover-white" to="/">Trang chủ</Link>
                </li>
                <li className="nav-item">
                  <Link className="nav-link text-white-50 hover-white" to="/destinations">Điểm đến</Link>
                </li>
                <li className="nav-item">
                  <Link className="nav-link text-white-50 hover-white" to="/tours">Tour du lịch</Link>
                </li>
                <li className="nav-item">
                  <Link className="nav-link text-white-50 hover-white" to="/itinerary">Lịch trình của tôi</Link>
                </li>
                <li className="nav-item">
                  <Link className="nav-link text-white-50 hover-white" to="/about">Giới thiệu</Link>
                </li>
              </>
            )}
          </ul>

          <div className="d-flex align-items-center gap-2">
            {isAuthenticated ? (
              <div className="position-relative" ref={dropdownRef}>
                <button
                  type="button"
                  className="btn d-flex align-items-center gap-2 text-white bg-dark bg-opacity-50 px-3 py-1 rounded-pill border border-secondary user-profile-link"
                  onClick={() => setIsDropdownOpen((prev) => !prev)}
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
                  <div
                    className="dropdown-menu dropdown-menu-end show shadow-lg border rounded-3 p-2 mt-2 user-dropdown-menu"
                    style={{
                      minWidth: '220px',
                      backgroundColor: '#1f1f38',
                      borderColor: 'rgba(255, 255, 255, 0.15)',
                      position: 'absolute',
                      right: 0,
                      top: '100%',
                      zIndex: 1050
                    }}
                  >
                    <div className="px-3 py-2 border-bottom border-secondary border-opacity-25 mb-1">
                      <div className="fw-bold text-white text-truncate">{user?.username}</div>
                      <div className="text-white-50 small text-truncate" style={{ fontSize: '0.8rem' }}>
                        {user?.email}
                      </div>
                    </div>

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
                <Link className="btn btn-outline-light btn-sm px-3" to="/login">Đăng nhập</Link>
                <Link className="btn btn-primary btn-sm px-3" to="/register">Đăng ký</Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
