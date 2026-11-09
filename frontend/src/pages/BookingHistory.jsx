import { useEffect, useState, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import CustomSelect from '../components/CustomSelect';
import { bookingApi } from '../services/api';
import CancelBookingModal from '../components/CancelBookingModal';
// START UC-66 Submit Booking Complaint
import SubmitComplaintModal from '../components/SubmitComplaintModal';
// END UC-66 Submit Booking Complaint
// START UC-82 Download Booking Voucher
import BookingVoucherModal from '../components/BookingVoucherModal';
// END UC-82 Download Booking Voucher
// START UC-152 Update Booking Passenger Info
import UpdatePassengerModal from '../components/UpdatePassengerModal';
// END UC-152 Update Booking Passenger Info
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
    case 'paid':
      return {
        label: 'Đã thanh toán',
        icon: 'bi-cash-coin',
        className: 'bg-info-subtle text-info-emphasis border border-info-subtle',
        desc: 'Nhà cung cấp đã xác nhận thu tiền tại điểm đón.'
      };
    case 'checked_in':
      return {
        label: 'Đã điểm danh',
        icon: 'bi-person-check-fill',
        className: 'bg-primary-subtle text-primary border border-primary-subtle',
        desc: 'Bạn đã được điểm danh và lên xe khởi hành.'
      };
    case 'completed':
      return {
        label: 'Đã hoàn thành',
        icon: 'bi-flag-fill',
        className: 'bg-secondary-subtle text-secondary border border-secondary-subtle',
        desc: 'Chuyến đi đã hoàn thành thành công.'
      };
    case 'cancelled':
      return {
        label: 'Đã hủy',
        icon: 'bi-x-circle-fill',
        className: 'bg-danger-subtle text-danger border border-danger-subtle',
        desc: 'Đơn đặt tour này đã bị hủy.'
      };
    case 'rejected':
      return {
        label: 'Đã từ chối',
        icon: 'bi-slash-circle-fill',
        className: 'bg-secondary-subtle text-secondary border border-secondary-subtle',
        desc: 'Đơn đặt tour đã bị nhà cung cấp từ chối.'
      };
    case 'no_show':
      return {
        label: 'Vắng mặt',
        icon: 'bi-person-x-fill',
        className: 'bg-danger-subtle text-danger-emphasis border border-danger-subtle',
        desc: 'Khách hàng không có mặt vào ngày khởi hành và không báo hủy trước.'
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

// BR-88: Khách chỉ được tự hủy đơn khi còn ít nhất 48 giờ trước ngày khởi hành
const canCancelBooking = (booking) => {
  if (!booking || !['pending', 'confirmed'].includes(booking.status)) return false;
  if (!booking.departureDate) return false;
  const hoursToDeparture = (new Date(booking.departureDate).getTime() - Date.now()) / (60 * 60 * 1000);
  return hoursToDeparture >= 48;
};

const SORT_OPTIONS = [
  { value: 'newest', label: 'Mới đặt gần đây' },
  { value: 'oldest', label: 'Cũ nhất' },
  { value: 'departure-soon', label: 'Khởi hành gần nhất' },
  { value: 'price-desc', label: 'Tổng tiền giảm dần' },
  { value: 'price-asc', label: 'Tổng tiền tăng dần' }
];

const BookingHistory = () => {
  const { user, isAuthenticated } = useAuth();
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [bookingToCancel, setBookingToCancel] = useState(null);
  // START UC-66 Submit Booking Complaint
  const [bookingToComplain, setBookingToComplain] = useState(null);
  // END UC-66 Submit Booking Complaint
  // START UC-82 Download Booking Voucher
  const [voucherBooking, setVoucherBooking] = useState(null);
  // END UC-82 Download Booking Voucher
  // START UC-152 Update Booking Passenger Info
  const [bookingToUpdatePassenger, setBookingToUpdatePassenger] = useState(null);
  // END UC-152 Update Booking Passenger Info
  const [copiedId, setCopiedId] = useState('');

  const handleBookingUpdated = (updatedBooking) => {
    if (!updatedBooking?._id) return;
    setBookings((prev) =>
      prev.map((b) => (b._id === updatedBooking._id ? { ...b, ...updatedBooking } : b))
    );
    if (selectedBooking?._id === updatedBooking._id) {
      setSelectedBooking((prev) => ({ ...prev, ...updatedBooking }));
    }
  };

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

  // UC-66 – MyComplaints gửi user tới đây với ?complain=1 để chống trùng chức năng:
  // mở modal khiếu nại ngay trên đơn đủ điều kiện đầu tiên.
  useEffect(() => {
    if (searchParams.get('complain') !== '1' || loading) return;
    const firstEligibleBooking = bookings.find((booking) =>
      ['paid', 'checked_in', 'completed', 'no_show'].includes(booking.status)
    );
    if (firstEligibleBooking) {
      setBookingToComplain(firstEligibleBooking);
    } else if (!loading) {
      toast.error('Bạn chưa có đơn đủ điều kiện để gửi khiếu nại.');
    }
    setSearchParams({}, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, bookings, loading]);

  // Khóa cuộn trang nền an toàn và bắt phím Escape khi có bất kỳ modal nào mở
  useEffect(() => {
    const isAnyModalOpen = Boolean(
      selectedBooking ||
      voucherBooking ||
      bookingToComplain ||
      bookingToCancel
    );
    if (!isAnyModalOpen) return;

    document.body.classList.add('modal-open');

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (voucherBooking) setVoucherBooking(null);
        else if (selectedBooking) setSelectedBooking(null);
        else if (bookingToComplain) setBookingToComplain(null);
        else if (bookingToCancel) setBookingToCancel(null);
      }
    };
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.classList.remove('modal-open');
    };
  }, [selectedBooking, voucherBooking, bookingToComplain, bookingToCancel]);

  const copyBookingCode = (code, fullId) => {
    navigator.clipboard.writeText(fullId || code);
    setCopiedId(fullId);
    toast.success(`Đã sao chép mã đơn: ${code}`);
    setTimeout(() => setCopiedId(''), 2000);
  };

  // Status counts
  const counts = useMemo(() => {
    const res = { all: bookings.length, pending: 0, confirmed: 0, paid: 0, checked_in: 0, completed: 0, cancelled: 0, rejected: 0, no_show: 0 };
    bookings.forEach((b) => {
      if (res[b.status] !== undefined) {
        res[b.status]++;
      } else {
        res.pending++;
      }
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
        if (sortBy === 'newest') return new Date(b.createdAt) - new Date(a.createdAt);
        if (sortBy === 'oldest') return new Date(a.createdAt) - new Date(b.createdAt);
        if (sortBy === 'departure-soon') return new Date(a.departureDate) - new Date(b.departureDate);
        if (sortBy === 'price-desc') return (b.totalPrice || 0) - (a.totalPrice || 0);
        if (sortBy === 'price-asc') return (a.totalPrice || 0) - (b.totalPrice || 0);
        return 0;
      });
  }, [bookings, statusFilter, searchTerm, sortBy]);

  const PAGE_SIZE = 5;
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, searchTerm, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filteredBookings.length / PAGE_SIZE));
  const pagedBookings = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredBookings.slice(start, start + PAGE_SIZE);
  }, [filteredBookings, currentPage]);

  return (
    <>
      <div className="management-page-section">
        <div>
          {/* Header Banner */}
          <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3 mb-4">
            <div>
              <h1 className="fw-bold mb-1 display-6">Lịch sử đặt tour</h1>
              <p className="text-muted mb-0">
                Theo dõi trạng thái, chi tiết hành trình và quản lý các đơn đặt tour của bạn cùng TripMate.
              </p>
            </div>

            <div className="d-flex align-items-center gap-2">
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
              {/* Filter & Search Section */}
              <div className="card border-0 shadow-sm rounded-4 p-3 p-md-4 mb-4 bg-white">
                {/* Hàng 1: Danh sách các tab trạng thái dàn đều full-width */}
                <div
                  className="d-flex flex-wrap align-items-center gap-2 pb-3 border-bottom"
                  role="tablist"
                  aria-label="Lọc theo trạng thái đơn đặt tour"
                >
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
                    id="tab-paid-bookings"
                    className={`btn btn-sm rounded-pill px-3 py-2 fw-medium ${
                      statusFilter === 'paid'
                        ? 'btn-info text-dark'
                        : 'btn-outline-secondary border-0 bg-light text-muted'
                    }`}
                    onClick={() => setStatusFilter('paid')}
                  >
                    Đã thanh toán <span className="badge rounded-pill bg-info-subtle text-info-emphasis ms-1">{counts.paid}</span>
                  </button>

                  <button
                    type="button"
                    id="tab-checked-in-bookings"
                    className={`btn btn-sm rounded-pill px-3 py-2 fw-medium ${
                      statusFilter === 'checked_in'
                        ? 'btn-primary text-white'
                        : 'btn-outline-secondary border-0 bg-light text-muted'
                    }`}
                    onClick={() => setStatusFilter('checked_in')}
                  >
                    Đã điểm danh <span className="badge rounded-pill bg-primary-subtle text-primary ms-1">{counts.checked_in}</span>
                  </button>

                  <button
                    type="button"
                    id="tab-completed-bookings"
                    className={`btn btn-sm rounded-pill px-3 py-2 fw-medium ${
                      statusFilter === 'completed'
                        ? 'btn-secondary text-white'
                        : 'btn-outline-secondary border-0 bg-light text-muted'
                    }`}
                    onClick={() => setStatusFilter('completed')}
                  >
                    Đã hoàn thành <span className="badge rounded-pill bg-secondary-subtle text-secondary ms-1">{counts.completed}</span>
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

                  {counts.rejected > 0 && (
                    <button
                      type="button"
                      id="tab-rejected-bookings"
                      className={`btn btn-sm rounded-pill px-3 py-2 fw-medium ${
                        statusFilter === 'rejected'
                          ? 'btn-secondary text-white'
                          : 'btn-outline-secondary border-0 bg-light text-muted'
                      }`}
                      onClick={() => setStatusFilter('rejected')}
                    >
                      Bị từ chối <span className="badge rounded-pill bg-secondary-subtle text-dark ms-1">{counts.rejected}</span>
                    </button>
                  )}

                  {counts.no_show > 0 && (
                    <button
                      type="button"
                      id="tab-noshow-bookings"
                      className={`btn btn-sm rounded-pill px-3 py-2 fw-medium ${
                        statusFilter === 'no_show'
                          ? 'btn-dark text-white'
                          : 'btn-outline-danger border-0 bg-danger-subtle text-danger'
                      }`}
                      onClick={() => setStatusFilter('no_show')}
                    >
                      Vắng mặt <span className="badge rounded-pill bg-danger text-white ms-1">{counts.no_show}</span>
                    </button>
                  )}
                </div>

                {/* Hàng 2: Thanh công cụ Tìm kiếm & Sắp xếp tách riêng biệt */}
                <div className="d-flex flex-column flex-md-row align-items-stretch align-items-md-center justify-content-between gap-3 pt-3">
                  {/* Cột trái: Ô tìm kiếm và nút đặt lại bộ lọc */}
                  <div className="d-flex align-items-center gap-2 flex-grow-1" style={{ maxWidth: '520px' }}>
                    <div className="input-group">
                      <span className="input-group-text bg-light border-end-0 text-muted">
                        <i className="bi bi-search"></i>
                      </span>
                      <input
                        type="text"
                        id="search-bookings-input"
                        className="form-control bg-light border-start-0"
                        placeholder="Tìm mã đơn, tên tour, điểm đến, tên khách..."
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

                    {(searchTerm || statusFilter !== 'all') && (
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary rounded-pill px-3 text-nowrap d-inline-flex align-items-center gap-1"
                        onClick={() => {
                          setSearchTerm('');
                          setStatusFilter('all');
                        }}
                        title="Đặt lại bộ lọc về mặc định"
                      >
                        <i className="bi bi-arrow-counterclockwise"></i>
                        <span className="d-none d-sm-inline">Đặt lại</span>
                      </button>
                    )}
                  </div>

                  {/* Cột phải: Thông tin số lượng hiển thị và Dropdown sắp xếp */}
                  <div className="d-flex align-items-center gap-3 justify-content-between justify-content-md-end">
                    <span className="text-muted small text-nowrap">
                      Hiển thị <strong>{filteredBookings.length}</strong> / {bookings.length} đơn
                    </span>
                    <div className="d-flex align-items-center gap-2">
                      <label htmlFor="sort-bookings-select" className="small text-muted fw-semibold mb-0 text-nowrap d-none d-sm-inline">
                        <i className="bi bi-sort-down me-1"></i>Sắp xếp:
                      </label>
                      <CustomSelect
                        id="sort-bookings-select"
                        value={sortBy}
                        options={SORT_OPTIONS}
                        onChange={(e, val) => setSortBy(val !== undefined ? val : e.target.value)}
                        style={{ minWidth: '190px' }}
                        triggerStyle={{ height: '38px', backgroundColor: '#f8f9fa', border: '1px solid #dee2e6' }}
                      />
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
                <>
                  /* Bookings List */
                  <div className="row g-4">
                  {pagedBookings.map((booking) => {
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

                                {booking.status === 'no_show' && (
                                  <div className="alert alert-danger py-2 px-3 small mt-2 mb-0 rounded-3 border border-danger-subtle">
                                    <div className="fw-semibold text-danger">
                                      <i className="bi bi-person-x-fill me-1"></i>Đơn bị ghi nhận khách vắng mặt
                                    </div>
                                    <div className="text-muted mt-0.5">Lý do: {booking.noShowReason || 'Khách không có mặt vào ngày khởi hành và không báo hủy trước.'}</div>
                                  </div>
                                )}

                                {booking.status === 'rejected' && (
                                  <div className="alert alert-secondary py-2 px-3 small mt-2 mb-0 rounded-3 border">
                                    <div className="fw-semibold text-dark">
                                      <i className="bi bi-slash-circle-fill text-secondary me-1"></i>Đơn bị nhà cung cấp từ chối
                                    </div>
                                    <div className="text-muted mt-0.5">Lý do: {booking.rejectionReason || 'Nhà cung cấp không thể nhận đơn.'}</div>
                                  </div>
                                )}
                              </div>

                              {/* Price & Action */}
                              <div className="col-12 col-md-3 col-xl-3 text-md-end border-top border-md-top-0 pt-3 pt-md-0">
                                <div className="mb-2">
                                  <div className="text-muted small">Tổng tiền thanh toán</div>
                                  <div className="h4 fw-bold text-primary mb-0">{formatPrice(booking.totalPrice)}</div>
                                </div>

                                <div className="d-flex flex-column gap-2 justify-content-end align-items-stretch">
                                  {/* Primary CTA */}
                                  <button
                                    type="button"
                                    id={`btn-view-booking-${booking._id}`}
                                    className="btn btn-primary btn-sm rounded-pill py-2 fw-semibold w-100 shadow-xs d-inline-flex align-items-center justify-content-center gap-1.5"
                                    onClick={() => setSelectedBooking(booking)}
                                  >
                                    <i className="bi bi-eye"></i>
                                    <span>Xem chi tiết</span>
                                  </button>

                                  {/* START UC-82 Download Booking Voucher */}
                                  {booking.status === 'confirmed' && (
                                    <button
                                      type="button"
                                      id={`btn-voucher-${booking._id}`}
                                      className="btn btn-outline-success btn-sm rounded-pill py-1.5 px-3 fw-semibold w-100 d-inline-flex align-items-center justify-content-center gap-1.5"
                                      onClick={() => setVoucherBooking(booking)}
                                      title="Xem và tải phiếu xác nhận đặt chỗ (Booking Voucher)"
                                    >
                                      <i className="bi bi-ticket-perforated"></i>
                                      <span>Xem Voucher</span>
                                    </button>
                                  )}
                                  {/* END UC-82 Download Booking Voucher */}

                                  {/* Đánh giá tour khi chuyến đi đã hoàn thành */}
                                  {booking.status === 'completed' && (tour._id || booking.tourId) && (
                                    <Link
                                      to={`/tours/${tour._id || (typeof booking.tourId === 'object' ? booking.tourId._id : booking.tourId)}?review=true#reviews`}
                                      id={`btn-review-booking-${booking._id}`}
                                      className="btn btn-warning btn-sm rounded-pill py-1.5 px-3 fw-semibold w-100 d-inline-flex align-items-center justify-content-center gap-1.5 shadow-xs"
                                      title="Đánh giá tour đã hoàn thành"
                                    >
                                      <i className="bi bi-star-fill text-dark"></i>
                                      <span>Đánh giá tour</span>
                                    </Link>
                                  )}

                                  {/* Active Booking Quick Action: Sửa thông tin hành khách */}
                                  {booking.status !== 'cancelled' && booking.status !== 'completed' && booking.status !== 'checked_in' && (
                                    <div className="w-100">
                                      <button
                                        type="button"
                                        id={`btn-update-passenger-${booking._id}`}
                                        className={`btn btn-sm rounded-pill py-1.5 px-2 w-100 small fw-medium d-inline-flex align-items-center justify-content-center gap-1 ${
                                          (booking.passengerUpdateCount || 0) >= 3
                                            ? 'btn-light text-muted border'
                                            : 'btn-outline-secondary'
                                        }`}
                                        onClick={() => setBookingToUpdatePassenger(booking)}
                                        disabled={(booking.passengerUpdateCount || 0) >= 3}
                                        title={(booking.passengerUpdateCount || 0) >= 3 ? 'Đã đạt giới hạn 3 lần chỉnh sửa' : 'Cập nhật thông tin hành khách'}
                                      >
                                        <i className="bi bi-pencil-square"></i>
                                        <span>
                                          {(booking.passengerUpdateCount || 0) >= 3
                                            ? 'Đã sửa (3/3 lần)'
                                            : (booking.passengerUpdateCount || 0) > 0
                                              ? `Sửa thông tin (${booking.passengerUpdateCount}/3)`
                                              : 'Sửa thông tin'}
                                        </span>
                                      </button>
                                    </div>
                                  )}

                                  {/* Auxiliary Actions: Khiếu nại & Hủy tour */}
                                  <div className="d-flex gap-1.5 w-100">
                                    {['paid', 'checked_in', 'completed', 'no_show'].includes(booking.status) && (
                                      <button
                                        type="button"
                                        id={`btn-submit-complaint-${booking._id}`}
                                        className="btn btn-light text-muted border-0 btn-sm rounded-pill py-1 px-2 flex-grow-1 small d-inline-flex align-items-center justify-content-center gap-1"
                                        onClick={() => setBookingToComplain(booking)}
                                        title="Gửi khiếu nại"
                                      >
                                        <i className="bi bi-flag"></i>
                                        <span>Khiếu nại</span>
                                      </button>
                                    )}

                                    {booking.status !== 'cancelled' && booking.status !== 'completed' && (
                                      <button
                                        type="button"
                                        id={`btn-cancel-booking-${booking._id}`}
                                        className="btn btn-light text-danger border-0 btn-sm rounded-pill py-1 px-2 flex-grow-1 small d-inline-flex align-items-center justify-content-center gap-1"
                                        onClick={() => setBookingToCancel(booking)}
                                        title="Hủy đặt tour"
                                      >
                                        <i className="bi bi-x-circle"></i>
                                        <span>Hủy tour</span>
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </article>
                      </div>
                    );
                  })}
                </div>

                {totalPages > 1 && (
                  <div className="d-flex flex-column flex-sm-row align-items-center justify-content-between gap-3 mt-4 pt-3 border-top">
                    <div className="text-muted small">
                      Hiển thị {(currentPage - 1) * PAGE_SIZE + 1} - {Math.min(currentPage * PAGE_SIZE, filteredBookings.length)} trên tổng số {filteredBookings.length} đơn đặt tour
                    </div>
                    <nav aria-label="Phân trang đơn đặt tour">
                      <ul className="pagination pagination-sm mb-0">
                        <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                          <button
                            type="button"
                            className="page-link"
                            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                          >
                            <i className="bi bi-chevron-left me-1"></i>Trước
                          </button>
                        </li>
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                          <li key={page} className={`page-item ${currentPage === page ? 'active' : ''}`}>
                            <button
                              type="button"
                              className="page-link"
                              onClick={() => setCurrentPage(page)}
                            >
                              {page}
                            </button>
                          </li>
                        ))}
                        <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                          <button
                            type="button"
                            className="page-link"
                            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                          >
                            Sau<i className="bi bi-chevron-right ms-1"></i>
                          </button>
                        </li>
                      </ul>
                    </nav>
                  </div>
                )}
              </>
            )}
            </>
          )}
        </div>
      </div>

      {/* START UC-66 Submit Booking Complaint */}
      {bookingToComplain && (
        <SubmitComplaintModal
          bookings={bookings}
          initialBooking={bookingToComplain}
          onClose={() => setBookingToComplain(null)}
        />
      )}
      {/* END UC-66 Submit Booking Complaint */}

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

      {/* START UC-152 Update Booking Passenger Info */}
      {bookingToUpdatePassenger && (
        <UpdatePassengerModal
          booking={bookingToUpdatePassenger}
          tourTitle={bookingToUpdatePassenger.tourId?.title || 'Tour'}
          onClose={() => setBookingToUpdatePassenger(null)}
          onUpdated={(updated) => {
            setBookingToUpdatePassenger(null);
            handleBookingUpdated(updated);
          }}
        />
      )}
      {/* END UC-152 Update Booking Passenger Info */}

      {/* ================= MODAL XEM CHI TIẾT ĐƠN ĐẶT TOUR (CHỈ VIEW) ================= */}
      {selectedBooking && (
        <>
          <div className="modal-backdrop fade show" style={{ zIndex: 1050 }} onClick={() => setSelectedBooking(null)}></div>
          <div
            className="modal fade show d-block"
            tabIndex="-1"
            role="dialog"
            aria-modal="true"
            style={{ zIndex: 1055, overscrollBehavior: 'contain' }}
            onClick={(e) => {
              if (e.target === e.currentTarget) setSelectedBooking(null);
            }}
          >
          <div className="modal-dialog modal-dialog-centered modal-lg modal-dialog-scrollable" style={{ overscrollBehavior: 'contain' }}>
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
                  <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
                    <h6 className="fw-bold text-uppercase text-muted small tracking-wide mb-0">
                      <i className="bi bi-person-lines-fill me-2 text-primary"></i>Thông tin khách hàng & Chuyến đi
                    </h6>
                    {selectedBooking.status !== 'cancelled' && selectedBooking.status !== 'completed' && selectedBooking.status !== 'checked_in' && (
                      <div className="d-flex align-items-center gap-2">
                        <button
                          type="button"
                          className={`btn btn-sm rounded-pill px-3 py-1 ${
                            (selectedBooking.passengerUpdateCount || 0) >= 3
                              ? 'btn-light text-muted border'
                              : 'btn-outline-secondary'
                          }`}
                          onClick={() => setBookingToUpdatePassenger(selectedBooking)}
                          disabled={(selectedBooking.passengerUpdateCount || 0) >= 3}
                          title={(selectedBooking.passengerUpdateCount || 0) >= 3 ? 'Đã đạt giới hạn 3 lần chỉnh sửa' : 'Cập nhật thông tin'}
                        >
                          <i className="bi bi-person-gear me-1"></i>
                          <span>
                            {(selectedBooking.passengerUpdateCount || 0) >= 3
                              ? 'Đã sửa (3/3 lần)'
                              : (selectedBooking.passengerUpdateCount || 0) > 0
                                ? `Sửa thông tin (${selectedBooking.passengerUpdateCount}/3)`
                                : 'Sửa thông tin'}
                          </span>
                        </button>
                      </div>
                    )}
                  </div>

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
                <div className="d-flex gap-2">
                  {selectedBooking.status === 'confirmed' && (
                    <button
                      type="button"
                      className="btn btn-success rounded-pill px-4 fw-semibold"
                      onClick={() => {
                        setVoucherBooking(selectedBooking);
                        setSelectedBooking(null);
                      }}
                    >
                      <i className="bi bi-ticket-perforated me-1"></i>Xem Voucher
                    </button>
                  )}
                  {selectedBooking.status === 'completed' && (selectedBooking.tourId?._id || selectedBooking.tourId) && (
                    <Link
                      to={`/tours/${selectedBooking.tourId?._id || (typeof selectedBooking.tourId === 'object' ? selectedBooking.tourId._id : selectedBooking.tourId)}?review=true#reviews`}
                      className="btn btn-warning rounded-pill px-4 fw-semibold d-inline-flex align-items-center gap-1.5"
                      onClick={() => setSelectedBooking(null)}
                    >
                      <i className="bi bi-star-fill"></i>
                      <span>Đánh giá tour</span>
                    </Link>
                  )}
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
        </div>
      </>
    )}

      {/* START UC-82 Download Booking Voucher */}
      {voucherBooking && (
        <BookingVoucherModal
          bookingId={voucherBooking._id}
          initialBooking={voucherBooking}
          onClose={() => setVoucherBooking(null)}
        />
      )}
      {/* END UC-82 Download Booking Voucher */}
    </>
  );
};

export default BookingHistory;
