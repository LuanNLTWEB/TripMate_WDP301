import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { bookingApi } from '../services/api';

const EMPTY_SUMMARY = {
  total: 0,
  pending: 0,
  confirmed: 0,
  paid: 0,
  checked_in: 0,
  cancelled: 0,
  confirmedRevenue: 0,
  collectedRevenue: 0,
  totalGuests: 0
};

const STATUS_OPTIONS = [
  { value: 'all', label: 'Tất cả', icon: 'bi-collection' },
  { value: 'pending', label: 'Chờ xử lý', icon: 'bi-hourglass-split' },
  { value: 'confirmed', label: 'Đã xác nhận', icon: 'bi-check-circle' },
  { value: 'paid', label: 'Đã thu tiền', icon: 'bi-cash-coin' },
  { value: 'checked_in', label: 'Đã điểm danh', icon: 'bi-person-check' },
  { value: 'cancelled', label: 'Đã hủy', icon: 'bi-x-circle' }
];

const SUMMARY_CARDS = [
  { key: 'total', label: 'Tổng yêu cầu', icon: 'bi-receipt', color: 'primary' },
  { key: 'pending', label: 'Chờ xử lý', icon: 'bi-hourglass-split', color: 'warning' },
  { key: 'confirmed', label: 'Đã xác nhận', icon: 'bi-check-circle', color: 'success' },
  { key: 'paid', label: 'Đã thu tiền', icon: 'bi-cash-coin', color: 'info' },
  { key: 'checked_in', label: 'Đã điểm danh', icon: 'bi-person-check', color: 'primary' },
  { key: 'cancelled', label: 'Đã hủy', icon: 'bi-x-circle', color: 'danger' }
];

const formatCurrency = (value) => new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0
}).format(Number(value) || 0);

const formatDate = (value) => {
  if (!value) return '—';
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(new Date(value));
};

const formatDateTime = (value) => {
  if (!value) return '—';
  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(new Date(value));
};

const getStatusBadge = (status) => {
  switch (status) {
    case 'confirmed':
      return { label: 'Đã xác nhận', className: 'badge-success' };
    case 'paid':
      return { label: 'Đã thu tiền', className: 'badge-info' };
    case 'checked_in':
      return { label: 'Đã điểm danh', className: 'badge-primary' };
    case 'cancelled':
      return { label: 'Đã hủy', className: 'badge-danger' };
    case 'pending':
    default:
      return { label: 'Chờ xử lý', className: 'badge-warning' };
  }
};

function BookingDetailModal({ booking, onClose, onApprove, onConfirmPayment, onCheckIn, isApproving, isProcessing }) {
  if (!booking) return null;

  const status = getStatusBadge(booking.status);
  const route = [
    booking.tourId?.departureLocation,
    booking.tourId?.destinationLocation || booking.tourId?.location
  ].filter(Boolean).join(' → ');

  return (
    <>
      <button
        type="button"
        className="modal-backdrop fade show border-0"
        aria-label="Đóng chi tiết booking"
        onClick={onClose}
      ></button>
      <div className="modal fade show d-block" tabIndex="-1" role="dialog" aria-modal="true">
        <div className="modal-dialog modal-dialog-centered modal-lg modal-dialog-scrollable">
          <div className="modal-content border-0 shadow-lg">
            <div className="modal-header bg-light">
              <div>
                <span className="small text-uppercase text-muted fw-semibold">Booking request</span>
                <h5 className="modal-title fw-bold mb-0">
                  Chi tiết yêu cầu #{booking._id?.slice(-8).toUpperCase()}
                </h5>
              </div>
              <button type="button" className="btn-close" onClick={onClose} aria-label="Đóng"></button>
            </div>

            <div className="modal-body p-4">
              <div className="d-flex justify-content-between align-items-start gap-3 mb-4 p-3 rounded-3 bg-primary-subtle">
                <div>
                  <div className="small text-muted mb-1">Tour được yêu cầu</div>
                  <div className="fw-bold text-dark">{booking.tourId?.title || 'Tour không còn khả dụng'}</div>
                  <div className="small text-primary mt-1">
                    <i className="bi bi-geo-alt me-1"></i>{route || 'Chưa cập nhật hành trình'}
                  </div>
                </div>
                <span className={`management-badge ${status.className}`}>
                  <span className="management-badge-dot"></span>{status.label}
                </span>
              </div>

              <div className="row g-4">
                <div className="col-md-6">
                  <section className="h-100 border rounded-3 p-3">
                    <h6 className="fw-bold mb-3">
                      <i className="bi bi-person text-primary me-2"></i>Thông tin khách hàng
                    </h6>
                    <dl className="row small mb-0 g-2">
                      <dt className="col-4 text-muted fw-medium">Họ tên</dt>
                      <dd className="col-8 mb-0 fw-semibold">{booking.fullName}</dd>
                      <dt className="col-4 text-muted fw-medium">Điện thoại</dt>
                      <dd className="col-8 mb-0">
                        <a href={`tel:${booking.phone}`} className="text-decoration-none">{booking.phone}</a>
                      </dd>
                      <dt className="col-4 text-muted fw-medium">Email</dt>
                      <dd className="col-8 mb-0 text-break">
                        <a href={`mailto:${booking.email}`} className="text-decoration-none">{booking.email}</a>
                      </dd>
                      <dt className="col-4 text-muted fw-medium">Địa chỉ</dt>
                      <dd className="col-8 mb-0">{booking.address || 'Không cung cấp'}</dd>
                    </dl>
                  </section>
                </div>

                <div className="col-md-6">
                  <section className="h-100 border rounded-3 p-3">
                    <h6 className="fw-bold mb-3">
                      <i className="bi bi-calendar2-check text-primary me-2"></i>Thông tin đặt tour
                    </h6>
                    <dl className="row small mb-0 g-2">
                      <dt className="col-5 text-muted fw-medium">Ngày khởi hành</dt>
                      <dd className="col-7 mb-0 fw-semibold">{formatDate(booking.departureDate)}</dd>
                      <dt className="col-5 text-muted fw-medium">Số khách</dt>
                      <dd className="col-7 mb-0">{booking.numberOfPeople} người</dd>
                      <dt className="col-5 text-muted fw-medium">Tổng tiền</dt>
                      <dd className="col-7 mb-0 fw-bold text-primary">{formatCurrency(booking.totalPrice)}</dd>
                      <dt className="col-5 text-muted fw-medium">Thời điểm gửi</dt>
                      <dd className="col-7 mb-0">{formatDateTime(booking.createdAt)}</dd>
                    </dl>
                  </section>
                </div>
              </div>

              <section className="mt-4 border rounded-3 p-3 bg-light-subtle">
                <h6 className="fw-bold mb-2">
                  <i className="bi bi-chat-left-text text-primary me-2"></i>Ghi chú của khách
                </h6>
                <p className="mb-0 small text-secondary" style={{ whiteSpace: 'pre-line' }}>
                  {booking.note || 'Khách hàng không để lại ghi chú.'}
                </p>
              </section>
            </div>

            <div className="modal-footer bg-light">
              {booking.tourId?._id && (
                <Link to={`/management/my-tours/${booking.tourId._id}/details`} className="btn btn-outline-primary">
                  <i className="bi bi-box-arrow-up-right me-2"></i>Xem tour
                </Link>
              )}
              {booking.status === 'pending' && onApprove && (
                <button type="button" className="btn btn-success" onClick={() => onApprove(booking)} disabled={isApproving}>
                  {isApproving ? <><span className="spinner-border spinner-border-sm me-2" role="status"></span>Đang duyệt...</> : <><i className="bi bi-check-circle me-2"></i>Duyệt đặt tour</>}
                </button>
              )}
              {/* UC-85 Confirm Payment & Check-in */}
              {booking.status === 'confirmed' && onConfirmPayment && (
                <>
                  <button type="button" className="btn btn-outline-success" onClick={() => onConfirmPayment(booking, 'cash')} disabled={isProcessing}>
                    <i className="bi bi-cash-coin me-2"></i>Đã thu tiền mặt
                  </button>
                  <button type="button" className="btn btn-success" onClick={() => onConfirmPayment(booking, 'bank_transfer')} disabled={isProcessing}>
                    <i className="bi bi-bank me-2"></i>Đã nhận chuyển khoản
                  </button>
                </>
              )}
              {booking.status === 'paid' && onCheckIn && (
                <button type="button" className="btn btn-primary" onClick={() => onCheckIn(booking)} disabled={isProcessing}>
                  <i className="bi bi-person-check me-2"></i>Điểm danh khách lên xe
                </button>
              )}
              <button type="button" className="btn btn-secondary" onClick={onClose}>Đóng</button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default function ProviderBookingRequests() {
  const [bookings, setBookings] = useState([]);
  const [summary, setSummary] = useState(EMPTY_SUMMARY);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchInput, setSearchInput] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [reportFrom, setReportFrom] = useState('');
  const [reportTo, setReportTo] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [approvingId, setApprovingId] = useState(null);
  const [processingId, setProcessingId] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    let active = true;

    const fetchBookings = async () => {
      setLoading(true);
      try {
        const response = await bookingApi.getProviderRequests({
          status: statusFilter,
          search: appliedSearch,
          page: currentPage,
          limit: 10
        });
        if (!active) return;
        setBookings(response.data || []);
        setSummary(response.summary || EMPTY_SUMMARY);
        setTotal(response.total || 0);
        setTotalPages(response.totalPages || 0);
        setError('');
      } catch (requestError) {
        if (!active) return;
        setBookings([]);
        setSummary(EMPTY_SUMMARY);
        setTotal(0);
        setTotalPages(0);
        setError(requestError.message || 'Không thể tải yêu cầu đặt tour.');
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchBookings();
    return () => {
      active = false;
    };
  }, [appliedSearch, currentPage, statusFilter]);

  const handleSearch = (event) => {
    event.preventDefault();
    setCurrentPage(1);
    setAppliedSearch(searchInput.trim());
  };

  const handleStatusChange = (status) => {
    setStatusFilter(status);
    setCurrentPage(1);
  };

  const handleApprove = async (booking) => {
    if (!booking || booking.status !== 'pending') return;
    const confirmed = window.confirm(`Xác nhận đặt tour cho ${booking.fullName} (${booking.numberOfPeople} người) vào tour "${booking.tourId?.title || 'này'}"?`);
    if (!confirmed) return;

    setApprovingId(booking._id);
    setError('');
    setSuccessMessage('');
    try {
      const response = await bookingApi.approveBooking(booking._id);
      const updated = response.data;
      setBookings((prev) => prev.map((item) => (item._id === updated._id ? updated : item)));
      setSelectedBooking((prev) => (prev && prev._id === updated._id ? updated : prev));
      setSummary((prev) => ({
        ...prev,
        pending: Math.max(0, (prev.pending || 0) - 1),
        confirmed: (prev.confirmed || 0) + 1,
        confirmedRevenue: (prev.confirmedRevenue || 0) + (updated.totalPrice || booking.totalPrice || 0)
      }));
      setSuccessMessage(response.message || 'Đã xác nhận đặt tour thành công.');
    } catch (requestError) {
      setError(requestError.message || 'Không thể xác nhận đặt tour.');
    } finally {
      setApprovingId(null);
    }
  };

  // START UC-85 Confirm Payment & Check-in
  // Ghi nhận đã thu tiền tại điểm đón: confirmed -> paid.
  const handleConfirmPayment = async (booking, paymentMethod = 'cash') => {
    if (!booking || booking.status !== 'confirmed') return;
    const methodLabel = paymentMethod === 'bank_transfer' ? 'chuyển khoản' : 'tiền mặt';
    const confirmed = window.confirm(`Xác nhận đã thu ${formatCurrency(booking.totalPrice)} bằng ${methodLabel} từ ${booking.fullName}?`);
    if (!confirmed) return;

    setProcessingId(booking._id);
    setError('');
    setSuccessMessage('');
    try {
      const response = await bookingApi.confirmPayment(booking._id, { paymentMethod });
      const updated = response.data;
      setBookings((prev) => prev.map((item) => (item._id === updated._id ? updated : item)));
      setSelectedBooking((prev) => (prev && prev._id === updated._id ? updated : prev));
      setSummary((prev) => ({
        ...prev,
        confirmed: Math.max(0, (prev.confirmed || 0) - 1),
        paid: (prev.paid || 0) + 1,
        confirmedRevenue: Math.max(0, (prev.confirmedRevenue || 0) - (updated.totalPrice || 0)),
        collectedRevenue: (prev.collectedRevenue || 0) + (updated.totalPrice || 0)
      }));
      setSuccessMessage(response.message || 'Đã xác nhận thu tiền.');
    } catch (requestError) {
      setError(requestError.message || 'Không thể xác nhận thanh toán.');
    } finally {
      setProcessingId(null);
    }
  };

  // Điểm danh khách đã lên xe: paid -> checked_in.
  const handleCheckIn = async (booking) => {
    if (!booking || booking.status !== 'paid') return;
    const confirmed = window.confirm(`Điểm danh ${booking.numberOfPeople} khách của ${booking.fullName} đã lên xe?`);
    if (!confirmed) return;

    setProcessingId(booking._id);
    setError('');
    setSuccessMessage('');
    try {
      const response = await bookingApi.checkIn(booking._id);
      const updated = response.data;
      setBookings((prev) => prev.map((item) => (item._id === updated._id ? updated : item)));
      setSelectedBooking((prev) => (prev && prev._id === updated._id ? updated : prev));
      setSummary((prev) => ({
        ...prev,
        paid: Math.max(0, (prev.paid || 0) - 1),
        checked_in: (prev.checked_in || 0) + 1
      }));
      setSuccessMessage(response.message || 'Đã điểm danh khách.');
    } catch (requestError) {
      setError(requestError.message || 'Không thể điểm danh khách.');
    } finally {
      setProcessingId(null);
    }
  };
  // END UC-85 Confirm Payment & Check-in

  const handleExportReport = async () => {
    setIsExporting(true);
    setError('');
    try {
      const blob = await bookingApi.exportProviderReport({ from: reportFrom, to: reportTo });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'tripmate-provider-booking-report.csv';
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (requestError) {
      setError(requestError.message || 'Không thể xuất báo cáo đặt tour.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <section className="management-page-section">
      <div className="management-page-heading">
        <span className="management-page-kicker">Booking Management</span>
        <h1>Yêu Cầu Đặt Tour</h1>
        <p>Theo dõi các yêu cầu đặt tour được gửi tới những tour do bạn cung cấp.</p>
      </div>

      <div className="row g-3 mb-4">
        {SUMMARY_CARDS.map((card) => (                          <div className="col-6 col-md-4 col-xl-2" key={card.key}>
            <div className="card border-0 shadow-sm h-100 rounded-3">
              <div className="card-body d-flex align-items-center gap-3">
                <div className={`rounded-circle bg-${card.color}-subtle text-${card.color} d-flex align-items-center justify-content-center flex-shrink-0`} style={{ width: 46, height: 46 }}>
                  <i className={`bi ${card.icon} fs-5`}></i>
                </div>
                <div>
                  <div className="small text-muted">{card.label}</div>
                  <div className="h4 fw-bold mb-0 text-dark">{summary[card.key] || 0}</div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="d-flex flex-wrap gap-3 mb-4">
        <span className="badge bg-light text-dark border py-2 px-3 fw-normal">
          <i className="bi bi-people text-primary me-2"></i>
          Tổng lượt khách: <strong>{summary.totalGuests || 0}</strong>
        </span>
        <span className="badge bg-light text-dark border py-2 px-3 fw-normal">
          <i className="bi bi-cash-coin text-success me-2"></i>
          Giá trị booking đã xác nhận: <strong>{formatCurrency(summary.confirmedRevenue)}</strong>
        </span>
        <span className="badge bg-light text-dark border py-2 px-3 fw-normal">
          <i className="bi bi-wallet2 text-info me-2"></i>
          Tiền đã thu tại điểm đón: <strong>{formatCurrency(summary.collectedRevenue)}</strong>
        </span>
      </div>

      <div className="card border-0 shadow-sm rounded-3 mb-4">
        <div className="card-body d-flex flex-wrap align-items-end gap-3">
          <div>
            <label className="form-label small fw-semibold mb-1" htmlFor="report-from">Từ ngày</label>
            <input id="report-from" type="date" className="form-control" value={reportFrom} onChange={(event) => setReportFrom(event.target.value)} />
          </div>
          <div>
            <label className="form-label small fw-semibold mb-1" htmlFor="report-to">Đến ngày</label>
            <input id="report-to" type="date" className="form-control" value={reportTo} onChange={(event) => setReportTo(event.target.value)} />
          </div>
          <button type="button" className="btn btn-outline-primary" onClick={handleExportReport} disabled={isExporting}>
            {isExporting
              ? <><span className="spinner-border spinner-border-sm me-2" role="status"></span>Đang xuất...</>
              : <><i className="bi bi-file-earmark-spreadsheet me-2"></i>Xuất báo cáo CSV</>}
          </button>
          <span className="small text-muted">Lọc theo thời điểm tạo đơn đặt tour.</span>
        </div>
      </div>

      {successMessage && (
        <div className="alert alert-success d-flex align-items-center" role="status">
          <i className="bi bi-check-circle-fill me-2"></i>{successMessage}
        </div>
      )}

      {error && (
        <div className="alert alert-danger d-flex align-items-center" role="alert">
          <i className="bi bi-exclamation-triangle-fill me-2"></i>{error}
        </div>
      )}

      <div className="management-table-card">
        <div className="management-table-toolbar flex-wrap gap-3">
          <div className="btn-group flex-wrap" role="group" aria-label="Lọc trạng thái booking">
            {STATUS_OPTIONS.map((option) => (
              <button
                type="button"
                key={option.value}
                className={`btn btn-sm ${statusFilter === option.value ? 'btn-primary' : 'btn-outline-secondary'}`}
                onClick={() => handleStatusChange(option.value)}
              >
                <i className={`bi ${option.icon} me-1`}></i>{option.label}
              </button>
            ))}
          </div>

          <form className="management-search-box" onSubmit={handleSearch} style={{ maxWidth: 420 }}>
            <i className="bi bi-search"></i>
            <input
              type="search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Tên khách, email, số điện thoại hoặc tour..."
              maxLength={100}
              aria-label="Tìm kiếm yêu cầu đặt tour"
            />
          </form>
        </div>

        <div className="table-responsive">
          <table className="management-table align-middle">
            <thead>
              <tr>
                <th style={{ width: '22%' }}>Khách hàng</th>
                <th style={{ width: '25%' }}>Tour</th>
                <th style={{ width: '16%' }}>Khởi hành</th>
                <th style={{ width: '15%' }}>Số khách & tổng tiền</th>
                <th style={{ width: '12%' }}>Trạng thái</th>
                <th className="text-center" style={{ width: '10%' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" className="text-center py-5 text-muted">
                    <span className="spinner-border spinner-border-sm text-primary me-2" role="status"></span>
                    Đang tải yêu cầu đặt tour...
                  </td>
                </tr>
              ) : bookings.length === 0 ? (
                <tr>
                  <td colSpan="6">
                    <div className="management-empty-state">
                      <div className="management-empty-icon"><i className="bi bi-inbox fs-2"></i></div>
                      <h6 className="fw-bold text-dark mb-1">Không có yêu cầu phù hợp</h6>
                      <p className="small text-muted mb-0">
                        {appliedSearch || statusFilter !== 'all'
                          ? 'Hãy thử thay đổi từ khóa hoặc trạng thái lọc.'
                          : 'Các yêu cầu đặt tour mới sẽ xuất hiện tại đây.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : bookings.map((booking) => {
                const status = getStatusBadge(booking.status);
                return (
                  <tr key={booking._id}>
                    <td>
                      <div className="d-flex align-items-center gap-2">
                        <div className="rounded-circle bg-primary-subtle text-primary d-flex align-items-center justify-content-center fw-bold flex-shrink-0" style={{ width: 38, height: 38 }}>
                          {(booking.fullName || 'K').charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="fw-semibold text-dark text-truncate">{booking.fullName}</div>
                          <a className="small text-muted text-decoration-none" href={`tel:${booking.phone}`}>
                            <i className="bi bi-telephone me-1"></i>{booking.phone}
                          </a>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="fw-semibold text-dark">{booking.tourId?.title || 'Tour không còn khả dụng'}</div>
                      <div className="small text-muted mt-1">
                        <i className="bi bi-hash me-1"></i>{booking._id.slice(-8).toUpperCase()}
                      </div>
                    </td>
                    <td>
                      <div className="fw-medium text-dark">{formatDate(booking.departureDate)}</div>
                      <div className="small text-muted">Gửi {formatDate(booking.createdAt)}</div>
                    </td>
                    <td>
                      <div className="fw-medium"><i className="bi bi-people me-1 text-primary"></i>{booking.numberOfPeople} người</div>
                      <div className="small fw-semibold text-primary mt-1">{formatCurrency(booking.totalPrice)}</div>
                    </td>
                    <td>
                      <span className={`management-badge ${status.className}`}>
                        <span className="management-badge-dot"></span>{status.label}
                      </span>
                    </td>
                    <td className="text-center">
                      <div className="management-actions justify-content-center">
                        <button
                          type="button"
                          className="management-action-btn btn-view"
                          title="Xem chi tiết yêu cầu"
                          aria-label={`Xem booking của ${booking.fullName}`}
                          onClick={() => setSelectedBooking(booking)}
                        >
                          <i className="bi bi-eye"></i>
                        </button>
                        {booking.status === 'pending' && (
                          <button
                            type="button"
                            className="management-action-btn btn-approve"
                            title="Duyệt đặt tour"
                            aria-label={`Duyệt booking của ${booking.fullName}`}
                            disabled={approvingId === booking._id}
                            onClick={() => handleApprove(booking)}
                          >
                            {approvingId === booking._id ? <span className="spinner-border spinner-border-sm" role="status" style={{ width: '1rem', height: '1rem' }}></span> : <i className="bi bi-check-lg"></i>}
                          </button>
                        )}
                        {/* UC-85 Confirm Payment & Check-in */}
                        {booking.status === 'confirmed' && (
                          <button
                            type="button"
                            className="management-action-btn btn-approve"
                            title="Xác nhận đã thu tiền mặt"
                            aria-label={`Xác nhận thu tiền booking của ${booking.fullName}`}
                            disabled={processingId === booking._id}
                            onClick={() => handleConfirmPayment(booking, 'cash')}
                          >
                            {processingId === booking._id ? <span className="spinner-border spinner-border-sm" role="status" style={{ width: '1rem', height: '1rem' }}></span> : <i className="bi bi-cash-coin"></i>}
                          </button>
                        )}
                        {booking.status === 'paid' && (
                          <button
                            type="button"
                            className="management-action-btn btn-approve"
                            title="Điểm danh khách lên xe"
                            aria-label={`Điểm danh booking của ${booking.fullName}`}
                            disabled={processingId === booking._id}
                            onClick={() => handleCheckIn(booking)}
                          >
                            {processingId === booking._id ? <span className="spinner-border spinner-border-sm" role="status" style={{ width: '1rem', height: '1rem' }}></span> : <i className="bi bi-person-check"></i>}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {!loading && totalPages > 1 && (
          <div className="management-pagination-bar">
            <div>
              Trang <strong>{currentPage}</strong>/{totalPages} · Tổng <strong>{total}</strong> yêu cầu
            </div>
            <nav aria-label="Phân trang yêu cầu đặt tour">
              <ul className="pagination pagination-sm mb-0">
                <li className={`page-item ${currentPage <= 1 ? 'disabled' : ''}`}>
                  <button
                    type="button"
                    className="page-link"
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage((page) => Math.max(page - 1, 1))}
                  >
                    <i className="bi bi-chevron-left me-1"></i>Trước
                  </button>
                </li>
                <li className="page-item active" aria-current="page">
                  <span className="page-link">{currentPage}</span>
                </li>
                <li className={`page-item ${currentPage >= totalPages ? 'disabled' : ''}`}>
                  <button
                    type="button"
                    className="page-link"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage((page) => Math.min(page + 1, totalPages))}
                  >
                    Sau<i className="bi bi-chevron-right ms-1"></i>
                  </button>
                </li>
              </ul>
            </nav>
          </div>
        )}
      </div>

      <BookingDetailModal
        booking={selectedBooking}
        onClose={() => setSelectedBooking(null)}
        onApprove={handleApprove}
        onConfirmPayment={handleConfirmPayment}
        onCheckIn={handleCheckIn}
        isApproving={approvingId === selectedBooking?._id}
        isProcessing={processingId === selectedBooking?._id}
      />
    </section>
  );
}
