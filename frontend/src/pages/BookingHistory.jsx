import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { bookingApi } from '../services/api';
import CancelBookingModal from '../components/CancelBookingModal';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';

const formatPrice = (price) =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND'
  }).format(price || 0);

const formatDate = (dateString) => {
  if (!dateString) return '—';
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

const formatDateTime = (dateString) => {
  if (!dateString) return '—';
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const getStatusBadge = (status) => {
  switch (status) {
    case 'confirmed':
      return {
        label: 'Đã xác nhận',
        icon: 'bi-check-circle-fill',
        className: 'bg-success-subtle text-success border border-success-subtle',
        desc: 'Đơn đặt tour đã được xác nhận và giữ chỗ thành công.'
      };
    case 'cancelled':
      return {
        label: 'Đã hủy',
        icon: 'bi-x-circle-fill',
        className: 'bg-danger-subtle text-danger border border-danger-subtle',
        desc: 'Đơn đặt tour này đã bị hủy.'
      };
    case 'pending':
    default:
      return {
        label: 'Chờ xác nhận',
        icon: 'bi-clock-history',
        className: 'bg-warning-subtle text-warning-emphasis border border-warning-subtle',
        desc: 'Đơn đặt tour đang chờ nhà cung cấp kiểm tra và xác nhận chỗ.'
      };
  }
};

const BookingHistory = () => {
  const { user, isAuthenticated } = useAuth();
  const toast = useToast();

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [bookingToCancel, setBookingToCancel] = useState(null);
  const [copiedId, setCopiedId] = useState('');

  useEffect(() => {
    document.title = 'Lịch sử đặt tour | TripMate';
  }, []);

  const fetchBookings = async () => {
    if (!isAuthenticated || user?.role !== 'customer') {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await bookingApi.getMyBookings();
      setBookings(res.data || []);
    } catch (err) {
      console.error('Error fetching bookings:', err);
      setError(err.message || 'Không thể tải danh sách đặt tour. Vui lòng thử lại sau.');
      toast.error('Không thể tải danh sách đặt tour');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user?.role, user?._id]);

  const copyBookingCode = (code, fullId) => {
    navigator.clipboard.writeText(fullId || code);
    setCopiedId(fullId);
    toast.success(`Đã sao chép mã đơn: ${code}`);
    setTimeout(() => setCopiedId(''), 2000);
  };

  // Status counts
  const counts = useMemo(() => {
    const res = { all: bookings.length, pending: 0, confirmed: 0, cancelled: 0 };
    bookings.forEach((b) => {
      if (b.status === 'confirmed') res.confirmed++;
      else if (b.status === 'cancelled') res.cancelled++;
      else res.pending++;
    });
    return res;
  }, [bookings]);

  // Filtered & sorted bookings
  const filteredBookings = useMemo(() => {
    return bookings
      .filter((booking) => {
        if (statusFilter !== 'all' && booking.status !== statusFilter) {
          return false;
        }

        if (searchTerm.trim()) {
          const term = searchTerm.trim().toLowerCase();
          const tourTitle = booking.tourId?.title?.toLowerCase() || '';
          const destination = booking.tourId?.destinationLocation?.toLowerCase() || '';
          const location = booking.tourId?.location?.toLowerCase() || '';
          const code = booking._id?.toLowerCase() || '';
          const passenger = booking.fullName?.toLowerCase() || '';

          if (
            !tourTitle.includes(term) &&
            !destination.includes(term) &&
            !location.includes(term) &&
            !code.includes(term) &&
            !passenger.includes(term)
          ) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'newest') {
          return new Date(b.createdAt) - new Date(a.createdAt);
        }
        if (sortBy === 'oldest') {
          return new Date(a.createdAt) - new Date(b.createdAt);
        }
        if (sortBy === 'departure-soon') {
          return new Date(a.departureDate) - new Date(b.departureDate);
        }
        if (sortBy === 'price-desc') {
          return (b.totalPrice || 0) - (a.totalPrice || 0);
        }
        if (sortBy === 'price-asc') {
          return (a.totalPrice || 0) - (b.totalPrice || 0);
        }
        return 0;
      });
  }, [bookings, statusFilter, searchTerm, sortBy]);

  return (
    <>
      <Navbar />

      <main className="bg-light py-5 flex-grow-1" style={{ minHeight: '85vh' }}>
        <div className="container">
          {/* Header Banner */}
          <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3 mb-4">
            <div>
              <div className="d-flex align-items-center gap-2 mb-1">
                <span className="badge bg-primary-subtle text-primary border border-primary-subtle text-uppercase fw-semibold px-2 py-1 small">
                  Booking History
                </span>
                <span className="text-muted small">·</span>
                <span className="text-muted small">Cổng thông tin khách hàng</span>
              </div>
              <h1 className="fw-bold mb-1 display-6">Lịch sử đặt tour</h1>
              <p className="text-muted mb-0">
                Theo dõi trạng thái, chi tiết hành trình và quản lý các đơn đặt tour của bạn cùng TripMate.
              </p>
            </div>

            <div className="d-flex align-items-center gap-2">
              <button
                type="button"
                id="btn-refresh-bookings"
                className="btn btn-white bg-white border shadow-sm rounded-pill px-3 py-2 text-dark d-inline-flex align-items-center gap-2"
                onClick={fetchBookings}
                disabled={loading}
                title="Làm mới danh sách"
              >
                <i className={`bi bi-arrow-clockwise ${loading ? 'spin-icon' : ''}`}></i>
                <span className="small fw-medium">Làm mới</span>
              </button>

              <Link
                to="/tours"
                id="btn-explore-more-tours"
                className="btn btn-primary rounded-pill px-3 py-2 d-inline-flex align-items-center gap-2 shadow-sm"
              >
                <i className="bi bi-compass"></i>
                <span className="small fw-semibold">Khám phá tour mới</span>
              </Link>
            </div>
          </div>

          {!isAuthenticated ? (
            <div className="card border-0 shadow-sm rounded-4 p-5 text-center bg-white my-4">
              <div className="mx-auto mb-3 text-warning">
                <i className="bi bi-shield-lock fs-1"></i>
              </div>
              <h4 className="fw-bold mb-2">Yêu cầu đăng nhập</h4>
              <p className="text-muted mb-4">
                Vui lòng đăng nhập với tài khoản khách hàng để xem lịch sử đặt tour của bạn.
              </p>
              <div className="d-flex justify-content-center gap-2">
                <Link to="/login" className="btn btn-primary rounded-pill px-4 py-2">
                  Đăng nhập ngay
                </Link>
                <Link to="/register" className="btn btn-outline-secondary rounded-pill px-4 py-2">
                  Đăng ký tài khoản
                </Link>
              </div>
            </div>
          ) : user?.role !== 'customer' ? (
            <div className="alert alert-warning rounded-4 shadow-sm p-4 d-flex align-items-center gap-3">
              <i className="bi bi-exclamation-triangle-fill fs-3 flex-shrink-0"></i>
              <div>
                <h5 className="alert-heading fw-bold mb-1">Quyền truy cập bị giới hạn</h5>
                <p className="mb-0 small">
                  Chức năng lịch sử đặt tour cá nhân chỉ áp dụng cho tài khoản <strong>Khách hàng (Customer)</strong>.
                  Tài khoản quản trị hoặc nhà cung cấp vui lòng sử dụng trang quản lý riêng.
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Summary Stats Cards */}
              <div className="row g-3 mb-4">
                <div className="col-6 col-lg-3">
                  <div
                    className={`card border-0 shadow-sm rounded-4 p-3 transition-card h-100 ${
                      statusFilter === 'all' ? 'border-primary border-2 bg-primary bg-opacity-10' : 'bg-white'
                    }`}
                    style={{ cursor: 'pointer' }}
                    onClick={() => setStatusFilter('all')}
                  >
                    <div className="d-flex align-items-center justify-content-between mb-2">
                      <span className="text-muted small fw-medium">Tổng đơn đặt</span>
                      <div className="rounded-circle bg-primary bg-opacity-10 text-primary p-2 d-flex align-items-center justify-content-center" style={{ width: 36, height: 36 }}>
                        <i className="bi bi-receipt"></i>
                      </div>
                    </div>
                    <div className="h3 fw-bold mb-0 text-dark">{counts.all}</div>
                    <span className="text-muted small mt-1">Tất cả thời gian</span>
                  </div>
                </div>

                <div className="col-6 col-lg-3">
                  <div
                    className={`card border-0 shadow-sm rounded-4 p-3 transition-card h-100 ${
                      statusFilter === 'pending' ? 'border-warning border-2 bg-warning bg-opacity-10' : 'bg-white'
                    }`}
                    style={{ cursor: 'pointer' }}
                    onClick={() => setStatusFilter('pending')}
                  >
                    <div className="d-flex align-items-center justify-content-between mb-2">
                      <span className="text-muted small fw-medium">Chờ xác nhận</span>
                      <div className="rounded-circle bg-warning bg-opacity-15 text-warning-emphasis p-2 d-flex align-items-center justify-content-center" style={{ width: 36, height: 36 }}>
                        <i className="bi bi-hourglass-split"></i>
                      </div>
                    </div>
                    <div className="h3 fw-bold mb-0 text-warning-emphasis">{counts.pending}</div>
                    <span className="text-muted small mt-1">Đang chờ xử lý</span>
                  </div>
                </div>

                <div className="col-6 col-lg-3">
                  <div
                    className={`card border-0 shadow-sm rounded-4 p-3 transition-card h-100 ${
                      statusFilter === 'confirmed' ? 'border-success border-2 bg-success bg-opacity-10' : 'bg-white'
                    }`}
                    style={{ cursor: 'pointer' }}
                    onClick={() => setStatusFilter('confirmed')}
                  >
                    <div className="d-flex align-items-center justify-content-between mb-2">
                      <span className="text-muted small fw-medium">Đã xác nhận</span>
                      <div className="rounded-circle bg-success bg-opacity-15 text-success p-2 d-flex align-items-center justify-content-center" style={{ width: 36, height: 36 }}>
                        <i className="bi bi-check2-circle"></i>
                      </div>
                    </div>
                    <div className="h3 fw-bold mb-0 text-success">{counts.confirmed}</div>
                    <span className="text-muted small mt-1">Đã giữ chỗ an toàn</span>
                  </div>
                </div>

                <div className="col-6 col-lg-3">
                  <div
                    className={`card border-0 shadow-sm rounded-4 p-3 transition-card h-100 ${
                      statusFilter === 'cancelled' ? 'border-danger border-2 bg-danger bg-opacity-10' : 'bg-white'
                    }`}
                    style={{ cursor: 'pointer' }}
                    onClick={() => setStatusFilter('cancelled')}
                  >
                    <div className="d-flex align-items-center justify-content-between mb-2">
                      <span className="text-muted small fw-medium">Đã hủy</span>
                      <div className="rounded-circle bg-danger bg-opacity-15 text-danger p-2 d-flex align-items-center justify-content-center" style={{ width: 36, height: 36 }}>
                        <i className="bi bi-x-circle"></i>
                      </div>
                    </div>
                    <div className="h3 fw-bold mb-0 text-danger">{counts.cancelled}</div>
                    <span className="text-muted small mt-1">Đã kết thúc / Hủy</span>
                  </div>
                </div>
              </div>

              {/* Filter & Search Bar */}
              <div className="card border-0 shadow-sm rounded-4 p-3 p-md-4 mb-4 bg-white">
                <div className="row g-3 align-items-center">
                  {/* Status Pills */}
                  <div className="col-12 col-lg-6">
                    <div className="d-flex flex-wrap gap-2" role="tablist">
                      <button
                        type="button"
                        id="tab-all-bookings"
                        className={`btn btn-sm rounded-pill px-3 py-2 fw-medium ${
                          statusFilter === 'all'
                            ? 'btn-dark text-white'
                            : 'btn-outline-secondary border-0 bg-light text-muted'
                        }`}
                        onClick={() => setStatusFilter('all')}
                      >
                        Tất cả <span className="badge rounded-pill bg-white text-dark ms-1">{counts.all}</span>
                      </button>

                      <button
                        type="button"
                        id="tab-pending-bookings"
                        className={`btn btn-sm rounded-pill px-3 py-2 fw-medium ${
                          statusFilter === 'pending'
                            ? 'btn-warning text-dark fw-semibold'
                            : 'btn-outline-secondary border-0 bg-light text-muted'
                        }`}
                        onClick={() => setStatusFilter('pending')}
                      >
                        Chờ xác nhận <span className="badge rounded-pill bg-warning-subtle text-dark ms-1">{counts.pending}</span>
                      </button>

                      <button
                        type="button"
                        id="tab-confirmed-bookings"
                        className={`btn btn-sm rounded-pill px-3 py-2 fw-medium ${
                          statusFilter === 'confirmed'
                            ? 'btn-success text-white'
                            : 'btn-outline-secondary border-0 bg-light text-muted'
                        }`}
                        onClick={() => setStatusFilter('confirmed')}
                      >
                        Đã xác nhận <span className="badge rounded-pill bg-success-subtle text-success ms-1">{counts.confirmed}</span>
                      </button>

                      <button
                        type="button"
                        id="tab-cancelled-bookings"
                        className={`btn btn-sm rounded-pill px-3 py-2 fw-medium ${
                          statusFilter === 'cancelled'
                            ? 'btn-danger text-white'
                            : 'btn-outline-secondary border-0 bg-light text-muted'
                        }`}
                        onClick={() => setStatusFilter('cancelled')}
                      >
                        Đã hủy <span className="badge rounded-pill bg-danger-subtle text-danger ms-1">{counts.cancelled}</span>
                      </button>
                    </div>
                  </div>

                  {/* Search and Sort Controls */}
                  <div className="col-12 col-lg-6">
                    <div className="d-flex flex-column flex-sm-row gap-2 justify-content-lg-end">
                      {/* Search box */}
                      <div className="input-group" style={{ maxWidth: '320px' }}>
                        <span className="input-group-text bg-light border-end-0 text-muted">
                          <i className="bi bi-search"></i>
                        </span>
                        <input
                          type="text"
                          id="search-bookings-input"
                          className="form-control bg-light border-start-0"
                          placeholder="Tìm mã đơn, tour, tên khách..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        {searchTerm && (
                          <button
                            type="button"
                            className="btn bg-light border-0 text-muted"
                            onClick={() => setSearchTerm('')}
                            title="Xóa tìm kiếm"
                          >
                            <i className="bi bi-x"></i>
                          </button>
                        )}
                      </div>

                      {/* Sort select */}
                      <select
                        id="sort-bookings-select"
                        className="form-select bg-light border-0 fw-medium text-dark"
                        style={{ width: 'auto' }}
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        aria-label="Sắp xếp đơn đặt"
                      >
                        <option value="newest">Mới đặt gần đây</option>
                        <option value="oldest">Cũ nhất</option>
                        <option value="departure-soon">Khởi hành gần nhất</option>
                        <option value="price-desc">Tổng tiền giảm dần</option>
                        <option value="price-asc">Tổng tiền tăng dần</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Error Alert */}
              {error && (
                <div className="alert alert-danger rounded-4 shadow-sm p-4 mb-4 d-flex align-items-center justify-content-between">
                  <div className="d-flex align-items-center gap-3">
                    <i className="bi bi-exclamation-octagon-fill fs-3 flex-shrink-0"></i>
                    <div>
                      <h6 className="fw-bold mb-1">Đã có lỗi xảy ra</h6>
                      <p className="mb-0 small">{error}</p>
                    </div>
                  </div>
                  <button type="button" className="btn btn-outline-danger btn-sm rounded-pill px-3" onClick={fetchBookings}>
                    Thử lại
                  </button>
                </div>
              )}

              {/* Content Loading State */}
              {loading ? (
                <div className="row g-4">
                  {[1, 2, 3].map((n) => (
                    <div className="col-12" key={n}>
                      <div className="card border-0 shadow-sm rounded-4 p-4 bg-white placeholder-glow">
                        <div className="d-flex flex-column flex-md-row gap-4 align-items-md-center">
                          <div className="placeholder rounded-4" style={{ width: 140, height: 110 }}></div>
                          <div className="flex-grow-1">
                            <span className="placeholder col-3 mb-2"></span>
                            <h5 className="placeholder col-7 mb-2"></h5>
                            <p className="placeholder col-5 mb-0"></p>
                          </div>
                          <div className="text-end" style={{ minWidth: 160 }}>
                            <span className="placeholder col-8 mb-2 d-block"></span>
                            <span className="placeholder col-6 btn btn-sm rounded-pill"></span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : bookings.length === 0 ? (
                /* Overall Empty State (Customer has 0 bookings) */
                <div className="card border-0 shadow-sm rounded-4 p-5 text-center bg-white my-4">
                  <div
                    className="mx-auto mb-4 bg-primary bg-opacity-10 text-primary rounded-circle d-flex align-items-center justify-content-center"
                    style={{ width: 96, height: 96 }}
                  >
                    <i className="bi bi-luggage fs-1"></i>
                  </div>
                  <h3 className="fw-bold mb-2">Bạn chưa có đơn đặt tour nào</h3>
                  <p className="text-muted mb-4 mx-auto" style={{ maxWidth: 520 }}>
                    TripMate mang đến hàng trăm tour du lịch phong phú khắp Việt Nam từ các nhà cung cấp uy tín.
                    Hãy chọn một điểm đến lý tưởng và bắt đầu chuyến phiêu lưu ngay hôm nay!
                  </p>
                  <div>
                    <Link
                      to="/tours"
                      id="empty-cta-explore-tours"
                      className="btn btn-primary rounded-pill px-4 py-2 fw-semibold shadow-sm"
                    >
                      <i className="bi bi-compass me-2"></i>
                      Khám phá tour ngay
                    </Link>
                  </div>
                </div>
              ) : filteredBookings.length === 0 ? (
                /* Filter / Search Empty State */
                <div className="card border-0 shadow-sm rounded-4 p-5 text-center bg-white my-4">
                  <div className="mx-auto mb-3 text-muted">
                    <i className="bi bi-funnel fs-1"></i>
                  </div>
                  <h4 className="fw-bold mb-2">Không tìm thấy đơn đặt tour phù hợp</h4>
                  <p className="text-muted mb-4 mx-auto" style={{ maxWidth: 480 }}>
                    Không có kết quả nào trùng khớp với trạng thái hoặc từ khóa tìm kiếm của bạn. Hãy thử thay đổi bộ lọc.
                  </p>
                  <div>
                    <button
                      type="button"
                      id="btn-reset-booking-filters"
                      className="btn btn-outline-secondary rounded-pill px-4 py-2"
                      onClick={() => {
                        setStatusFilter('all');
                        setSearchTerm('');
                      }}
                    >
                      Đặt lại bộ lọc
                    </button>
                  </div>
                </div>
              ) : (
                /* Bookings List */
                <div className="row g-4">
                  {filteredBookings.map((booking) => {
                    const statusInfo = getStatusBadge(booking.status);
                    const shortCode = `BK-${booking._id.slice(-6).toUpperCase()}`;
                    const tour = booking.tourId || {};
                    const tourThumbnail =
                      tour.images && tour.images.length > 0
                        ? tour.images[0]
                        : 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80';

                    return (
                      <div className="col-12" key={booking._id}>
                        <article className="card border-0 shadow-sm rounded-4 overflow-hidden bg-white hover-shadow transition-card">
                          {/* Top Info Bar */}
                          <div className="card-header bg-light bg-opacity-50 border-bottom px-4 py-3 d-flex flex-wrap align-items-center justify-content-between gap-2">
                            <div className="d-flex align-items-center gap-2">
                              <span className="text-muted small">Mã đơn:</span>
                              <span className="fw-bold text-dark font-monospace">{shortCode}</span>
                              <button
                                type="button"
                                className="btn btn-sm btn-link p-0 text-muted"
                                title="Sao chép mã đơn"
                                onClick={() => copyBookingCode(shortCode, booking._id)}
                                aria-label="Sao chép mã đơn"
                              >
                                <i className={`bi ${copiedId === booking._id ? 'bi-check2 text-success' : 'bi-clipboard'}`}></i>
                              </button>
                            </div>

                            <div className="d-flex align-items-center gap-3">
                              <span className="text-muted small d-none d-sm-inline">
                                <i className="bi bi-calendar3 me-1"></i>
                                Đặt ngày: {formatDate(booking.createdAt)}
                              </span>
                              <span className={`badge rounded-pill px-3 py-2 fw-medium ${statusInfo.className}`}>
                                <i className={`bi ${statusInfo.icon} me-1`}></i>
                                {statusInfo.label}
                              </span>
                            </div>
                          </div>

                          {/* Main Body */}
                          <div className="card-body p-4">
                            <div className="row g-4 align-items-center">
                              {/* Tour Thumbnail */}
                              <div className="col-12 col-md-3 col-xl-2 text-center text-md-start">
                                <div className="position-relative rounded-3 overflow-hidden shadow-sm" style={{ height: 110, width: '100%' }}>
                                  <img
                                    src={tourThumbnail}
                                    alt={tour.title || 'Tour thumbnail'}
                                    className="w-100 h-100 object-fit-cover"
                                    onError={(e) => {
                                      e.currentTarget.src =
                                        'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80';
                                    }}
                                  />
                                  {tour.duration && (
                                    <span
                                      className="position-absolute bottom-0 start-0 m-1 px-2 py-0-5 rounded-pill badge bg-dark bg-opacity-75 text-white small"
                                      style={{ fontSize: '10px' }}
                                    >
                                      <i className="bi bi-clock me-1"></i>
                                      {tour.duration}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Tour & Passenger Details */}
                              <div className="col-12 col-md-6 col-xl-7">
                                <div className="mb-2">
                                  {tour._id ? (
                                    <Link
                                      to={`/tours/${tour._id}`}
                                      className="fw-bold fs-5 text-dark text-decoration-none hover-primary line-clamp-1"
                                      title={tour.title}
                                    >
                                      {tour.title}
                                    </Link>
                                  ) : (
                                    <span className="fw-bold fs-5 text-dark">{tour.title || 'Thông tin tour'}</span>
                                  )}
                                </div>

                                <div className="row g-2 text-muted small mb-2">
                                  <div className="col-12 col-sm-6">
                                    <i className="bi bi-calendar-event text-primary me-2"></i>
                                    <span>Khởi hành: </span>
                                    <strong className="text-dark">{formatDate(booking.departureDate)}</strong>
                                  </div>
                                  <div className="col-12 col-sm-6">
                                    <i className="bi bi-people text-primary me-2"></i>
                                    <span>Số lượng: </span>
                                    <strong className="text-dark">{booking.numberOfPeople} người</strong>
                                  </div>
                                  <div className="col-12 col-sm-6">
                                    <i className="bi bi-person text-primary me-2"></i>
                                    <span>Người đặt: </span>
                                    <span className="text-dark">{booking.fullName}</span>
                                  </div>
                                  <div className="col-12 col-sm-6">
                                    <i className="bi bi-telephone text-primary me-2"></i>
                                    <span>Liên hệ: </span>
                                    <span className="text-dark">{booking.phone}</span>
                                  </div>
                                </div>

                                {(tour.departureLocation || tour.location) && (
                                  <div className="small text-muted text-truncate">
                                    <i className="bi bi-geo-alt me-1 text-danger"></i>
                                    {tour.departureLocation && tour.destinationLocation ? (
                                      <span>
                                        {tour.departureLocation} <i className="bi bi-arrow-right mx-1 text-muted"></i> {tour.destinationLocation}
                                      </span>
                                    ) : (
                                      <span>{tour.location}</span>
                                    )}
                                  </div>
                                )}
                              </div>

                              {/* Price & Action */}
                              <div className="col-12 col-md-3 col-xl-3 text-md-end border-top border-md-top-0 pt-3 pt-md-0">
                                <div className="mb-2">
                                  <div className="text-muted small">Tổng tiền thanh toán</div>
                                  <div className="h4 fw-bold text-primary mb-0">{formatPrice(booking.totalPrice)}</div>
                                </div>

                                <div className="d-flex flex-row flex-md-column gap-2 justify-content-end">
                                  <button
                                    type="button"
                                    id={`btn-view-booking-${booking._id}`}
                                    className="btn btn-outline-primary btn-sm rounded-pill px-3 py-2 fw-semibold d-inline-flex align-items-center justify-content-center gap-1"
                                    onClick={() => setSelectedBooking(booking)}
                                  >
                                    <i className="bi bi-eye"></i>
                                    <span>Xem chi tiết đơn</span>
                                  </button>

                                  {booking.status !== 'cancelled' && (
                                    <button
                                      type="button"
                                      id={`btn-cancel-booking-${booking._id}`}
                                      className="btn btn-outline-danger btn-sm rounded-pill px-3 py-2 fw-semibold d-inline-flex align-items-center justify-content-center gap-1"
                                      onClick={() => setBookingToCancel(booking)}
                                    >
                                      <i className="bi bi-x-circle"></i>
                                      <span>Hủy đặt tour</span>
                                    </button>
                                  )}

                                  {tour._id && (
                                    <Link
                                      to={`/tours/${tour._id}`}
                                      className="btn btn-light btn-sm rounded-pill px-3 py-2 text-muted d-inline-flex align-items-center justify-content-center gap-1"
                                    >
                                      <span>Trang tour</span>
                                      <i className="bi bi-arrow-up-right small"></i>
                                    </Link>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </article>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* UC-74 - hủy đặt tour */}
      {bookingToCancel && (
        <CancelBookingModal
          booking={bookingToCancel}
          tourTitle={bookingToCancel.tourId?.title || 'Tour'}
          onClose={() => setBookingToCancel(null)}
          onCancelled={() => {
            setBookingToCancel(null);
            fetchBookings();
          }}
        />
      )}

      {/* ================= MODAL XEM CHI TIẾT ĐƠN ĐẶT TOUR (CHỈ VIEW) ================= */}
      {selectedBooking && (
        <div
          className="modal fade show d-block"
          tabIndex="-1"
          role="dialog"
          aria-modal="true"
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(4px)', zIndex: 1055 }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedBooking(null);
          }}
        >
          <div className="modal-dialog modal-dialog-centered modal-lg modal-dialog-scrollable">
            <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
              {/* Modal Header */}
              <div className="modal-header bg-light px-4 py-3 border-bottom d-flex align-items-center justify-content-between">
                <div>
                  <div className="d-flex align-items-center gap-2 mb-1">
                    <span className="badge bg-secondary-subtle text-secondary font-monospace small">
                      #BK-{selectedBooking._id.slice(-6).toUpperCase()}
                    </span>
                    <span className={`badge rounded-pill px-2 py-1 small ${getStatusBadge(selectedBooking.status).className}`}>
                      <i className={`bi ${getStatusBadge(selectedBooking.status).icon} me-1`}></i>
                      {getStatusBadge(selectedBooking.status).label}
                    </span>
                  </div>
                  <h5 className="modal-title fw-bold text-dark mb-0">Chi tiết đơn đặt tour</h5>
                </div>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setSelectedBooking(null)}
                  aria-label="Đóng"
                ></button>
              </div>

              {/* Modal Body */}
              <div className="modal-body p-4">
                {/* Status notice */}
                <div className={`p-3 rounded-3 mb-4 ${getStatusBadge(selectedBooking.status).className}`}>
                  <div className="d-flex align-items-start gap-2">
                    <i className={`bi ${getStatusBadge(selectedBooking.status).icon} fs-5 mt-n1`}></i>
                    <div>
                      <div className="fw-bold">{getStatusBadge(selectedBooking.status).label}</div>
                      <div className="small opacity-90">{getStatusBadge(selectedBooking.status).desc}</div>
                    </div>
                  </div>
                </div>

                {/* Section 1: Tour Information */}
                <div className="mb-4">
                  <h6 className="fw-bold text-uppercase text-muted small tracking-wide mb-3">
                    <i className="bi bi-compass me-2 text-primary"></i>Thông tin tour
                  </h6>

                  <div className="p-3 bg-light rounded-3 d-flex flex-column flex-sm-row gap-3 align-items-sm-center">
                    <img
                      src={
                        selectedBooking.tourId?.images?.[0] ||
                        'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80'
                      }
                      alt={selectedBooking.tourId?.title || 'Tour'}
                      className="rounded-3 object-fit-cover flex-shrink-0"
                      style={{ width: 120, height: 80 }}
                      onError={(e) => {
                        e.currentTarget.src =
                          'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80';
                      }}
                    />
                    <div className="flex-grow-1">
                      <div className="fw-bold fs-6 text-dark mb-1">
                        {selectedBooking.tourId?.title || 'Tour du lịch'}
                      </div>
                      <div className="text-muted small d-flex flex-wrap gap-3">
                        {selectedBooking.tourId?.duration && (
                          <span>
                            <i className="bi bi-clock me-1"></i>
                            {selectedBooking.tourId.duration}
                          </span>
                        )}
                        {selectedBooking.tourId?.location && (
                          <span>
                            <i className="bi bi-geo-alt me-1"></i>
                            {selectedBooking.tourId.location}
                          </span>
                        )}
                      </div>
                      {selectedBooking.tourId?.departureLocation && selectedBooking.tourId?.destinationLocation && (
                        <div className="small text-muted mt-1">
                          Lộ trình: {selectedBooking.tourId.departureLocation} <i className="bi bi-arrow-right"></i> {selectedBooking.tourId.destinationLocation}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Section 2: Passenger & Booking Details */}
                <div className="mb-4">
                  <h6 className="fw-bold text-uppercase text-muted small tracking-wide mb-3">
                    <i className="bi bi-person-lines-fill me-2 text-primary"></i>Thông tin khách hàng & Chuyến đi
                  </h6>

                  <div className="row g-3">
                    <div className="col-12 col-sm-6">
                      <div className="p-3 border rounded-3 bg-white h-100">
                        <div className="text-muted small mb-1">Họ và tên người đặt</div>
                        <div className="fw-semibold text-dark">{selectedBooking.fullName}</div>
                      </div>
                    </div>

                    <div className="col-12 col-sm-6">
                      <div className="p-3 border rounded-3 bg-white h-100">
                        <div className="text-muted small mb-1">Số điện thoại liên hệ</div>
                        <div className="fw-semibold text-dark">{selectedBooking.phone}</div>
                      </div>
                    </div>

                    <div className="col-12 col-sm-6">
                      <div className="p-3 border rounded-3 bg-white h-100">
                        <div className="text-muted small mb-1">Email nhận thông báo</div>
                        <div className="fw-semibold text-dark text-truncate">{selectedBooking.email}</div>
                      </div>
                    </div>

                    <div className="col-12 col-sm-6">
                      <div className="p-3 border rounded-3 bg-white h-100">
                        <div className="text-muted small mb-1">Ngày khởi hành</div>
                        <div className="fw-semibold text-primary">{formatDate(selectedBooking.departureDate)}</div>
                      </div>
                    </div>

                    <div className="col-12 col-sm-6">
                      <div className="p-3 border rounded-3 bg-white h-100">
                        <div className="text-muted small mb-1">Số lượng hành khách</div>
                        <div className="fw-semibold text-dark">{selectedBooking.numberOfPeople} người</div>
                      </div>
                    </div>

                    <div className="col-12 col-sm-6">
                      <div className="p-3 border rounded-3 bg-white h-100">
                        <div className="text-muted small mb-1">Thời gian gửi đơn</div>
                        <div className="fw-semibold text-dark">{formatDateTime(selectedBooking.createdAt)}</div>
                      </div>
                    </div>

                    {selectedBooking.address && (
                      <div className="col-12">
                        <div className="p-3 border rounded-3 bg-white">
                          <div className="text-muted small mb-1">Địa chỉ liên hệ</div>
                          <div className="text-dark">{selectedBooking.address}</div>
                        </div>
                      </div>
                    )}

                    {selectedBooking.note && (
                      <div className="col-12">
                        <div className="p-3 border rounded-3 bg-white">
                          <div className="text-muted small mb-1">Ghi chú yêu cầu đặc biệt</div>
                          <div className="text-dark fst-italic">"{selectedBooking.note}"</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Section 3: Provider Information (BR-90) */}
                {selectedBooking.tourId?.providerId && (
                  <div className="mb-4">
                    <h6 className="fw-bold text-uppercase text-muted small tracking-wide mb-3">
                      <i className="bi bi-building me-2 text-primary"></i>Đơn vị tổ chức tour
                    </h6>

                    <div className="p-3 border rounded-3 bg-light d-flex flex-wrap align-items-center justify-content-between gap-2">
                      <div>
                        <div className="fw-bold text-dark">
                          {selectedBooking.tourId.providerId.username || 'Nhà cung cấp TripMate'}
                        </div>
                        <div className="text-muted small">Đối tác điều hành tour chính thức</div>
                      </div>

                      <div className="d-flex flex-wrap gap-2 text-muted small">
                        {selectedBooking.tourId.providerId.email && (
                          <span className="badge bg-white text-dark border px-2 py-1">
                            <i className="bi bi-envelope me-1"></i>
                            {selectedBooking.tourId.providerId.email}
                          </span>
                        )}
                        {selectedBooking.tourId.providerId.phone && (
                          <span className="badge bg-white text-dark border px-2 py-1">
                            <i className="bi bi-telephone me-1"></i>
                            {selectedBooking.tourId.providerId.phone}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Section 4: Payment Summary */}
                <div>
                  <h6 className="fw-bold text-uppercase text-muted small tracking-wide mb-3">
                    <i className="bi bi-cash-stack me-2 text-primary"></i>Chi tiết thanh toán
                  </h6>

                  <div className="p-3 bg-light rounded-3">
                    <div className="d-flex justify-content-between text-muted small mb-2">
                      <span>Đơn giá mỗi khách:</span>
                      <span>
                        {formatPrice(
                          selectedBooking.tourId?.price ||
                            (selectedBooking.numberOfPeople > 0
                              ? selectedBooking.totalPrice / selectedBooking.numberOfPeople
                              : selectedBooking.totalPrice)
                        )}
                      </span>
                    </div>

                    <div className="d-flex justify-content-between text-muted small mb-2">
                      <span>Số lượng khách:</span>
                      <span>× {selectedBooking.numberOfPeople} người</span>
                    </div>

                    <div className="border-top pt-2 mt-2 d-flex justify-content-between align-items-center">
                      <span className="fw-bold text-dark">Tổng chi phí dự kiến:</span>
                      <span className="h4 fw-bold text-primary mb-0">{formatPrice(selectedBooking.totalPrice)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="modal-footer bg-light px-4 py-3 border-top d-flex justify-content-between align-items-center">
                <span className="text-muted small">
                  <i className="bi bi-info-circle me-1"></i>
                  Đơn đặt hiển thị ở chế độ xem chi tiết
                </span>
                <button
                  type="button"
                  id="btn-close-booking-modal"
                  className="btn btn-secondary rounded-pill px-4"
                  onClick={() => setSelectedBooking(null)}
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </>
  );
};

export default BookingHistory;
