import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import logo from '../assets/logo.png';

function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role === 'admin';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-dark shadow-sm sticky-top" style={{ backgroundColor: '#1a1a2e' }}>
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
                  <Link className="nav-link text-warning" to="/stats">Thống kê</Link>
                </li>
              </>
            ) : user?.role === 'staff' ? (
              <>
                <li className="nav-item">
                  <Link className="nav-link text-warning" to="/staff/destinations">Quản lý điểm đến</Link>
                </li>
                <li className="nav-item">
                  <Link className="nav-link text-warning" to="/stats">Thống kê</Link>
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
              </>
            ) : <>
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
            </>}
          </ul>

          <div className="d-flex align-items-center gap-2">
            {isAuthenticated ? (
              <div className="d-flex align-items-center gap-3">
                <Link 
                  to="/profile" 
                  className="d-flex align-items-center gap-2 text-white text-decoration-none bg-dark bg-opacity-50 px-3 py-1 rounded-pill border border-secondary user-profile-link"
                  title="Xem và chỉnh sửa thông tin cá nhân"
                >
                  <i className="bi bi-person-circle fs-5 text-primary"></i>
                  <span className="fw-medium small">{user?.username}</span>
                  {user?.role === 'admin' && (
                    <span className="badge bg-warning text-dark text-uppercase small" style={{ fontSize: '10px' }}>
                      Quản trị viên
                    </span>
                  )}
                </Link>
                <button
                  type="button"
                  className="btn btn-outline-danger btn-sm d-flex align-items-center gap-1"
                  onClick={handleLogout}
                  title="Đăng xuất"
                >
                  <i className="bi bi-box-arrow-right"></i>
                  <span>Đăng xuất</span>
                </button>
              </div>
            ) : (
              <>
                <Link className="btn btn-outline-light" to="/login">Đăng nhập</Link>
                <Link className="btn btn-primary" to="/register">Đăng ký</Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
