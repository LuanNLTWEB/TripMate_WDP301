import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { bookingApi } from '../services/api';
import CustomSelect from '../components/CustomSelect';

const EMPTY_SUMMARY = {
  total: 0,
  pending: 0,
  confirmed: 0,
  cancelled: 0,
  confirmedRevenue: 0,
  totalGuests: 0
};

const STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'Tất cả trạng thái' },
  { value: 'pending', label: 'Chờ xác nhận', icon: 'bi bi-hourglass-split text-warning' },
  { value: 'confirmed', label: 'Đã xác nhận', icon: 'bi bi-check-circle text-success' },
  { value: 'rejected', label: 'Đã từ chối', icon: 'bi bi-slash-circle text-danger' },
  { value: 'no_show', label: 'Vắng mặt', icon: 'bi bi-person-x text-danger' },
  { value: 'cancelled', label: 'Đã hủy', icon: 'bi bi-x-circle text-secondary' }
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

const formatCustomerName = (fullName) => {
  if (!fullName) return '—';
  const trimmed = String(fullName).trim();
  const words = trimmed.split(/\s+/).filter(Boolean);

  // Chỉ bao gồm họ, tên đệm, tên (tối đa 3 từ), nếu dài hơn thì hiển thị ...
  if (words.length > 3) {
    return `${words.slice(0, 3).join(' ')}...`;
  }

  // Nếu là từ đơn quá dài (như chuỗi test hoặc mã định danh)
  if (trimmed.length > 18) {
    return `${trimmed.slice(0, 16)}...`;
  }

  return trimmed;
};

const getStatusBadge = (status) => {
  switch (status) {
    case 'confirmed':
      return { label: 'Đã xác nhận', className: 'badge-success' };
    case 'cancelled':
      return { label: 'Đã hủy', className: 'badge-danger' };
    case 'rejected':
      return { label: 'Đã từ chối', className: 'badge-secondary' };
    case 'no_show':
      return { label: 'Vắng mặt', className: 'badge-danger' };
    case 'pending':
    default:
      return { label: 'Chờ xác nhận', className: 'badge-warning' };
  }
};

const isDeparturePassed = (d) => {
  if (!d) return false;
  return new Date() >= new Date(d).setHours(0, 0, 0, 0);
};

function BookingDetailModal({ booking, onClose, onApprove, onReject, onNoShow, isApproving }) {
  if (!booking) return null;

  const status = getStatusBadge(booking.status);
  const route = [
    booking.tourId?.departureLocation,
    booking.tourId?.destinationLocation || booking.tourId?.location
  ].filter(Boolean).join(' → ');

  return (
    <>
      <div className="modal-backdrop fade show" style={{ zIndex: 1050 }} onClick={onClose}></div>
      <div
        className="modal fade show d-block"
        tabIndex="-1"
        role="dialog"
        aria-modal="true"
        style={{ zIndex: 1055, overscrollBehavior: 'contain' }}
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <div className="modal-dialog modal-dialog-centered modal-lg modal-dialog-scrollable" style={{ overscrollBehavior: 'contain' }}>
          <div className="modal-content border-0 shadow">
            <div className="modal-header">
              <h5 className="modal-title fw-bold text-dark d-flex align-items-center mb-0">
                <i className="bi bi-file-earmark-person text-primary me-2"></i>
                <span>Chi tiết yêu cầu #{booking._id?.slice(-8).toUpperCase()}</span>
              </h5>
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

              {booking.rejectionReason && (
                <section className="mt-3 border border-secondary rounded-3 p-3 bg-secondary-subtle">
                  <h6 className="fw-bold mb-1 text-dark">
                    <i className="bi bi-slash-circle text-danger me-2"></i>Lý do từ chối đặt tour
                  </h6>
                  <p className="mb-0 small text-secondary">{booking.rejectionReason}</p>
                </section>
              )}

              {booking.status === 'no_show' && (
                <section className="mt-3 border border-danger rounded-3 p-3 bg-danger-subtle">
                  <h6 className="fw-bold mb-1 text-danger">
                    <i className="bi bi-person-x-fill me-2"></i>Đã ghi nhận khách vắng mặt
                  </h6>
                  <p className="mb-0 small text-danger-emphasis">
                    Ghi chú: {booking.noShowReason || 'Khách không có mặt vào ngày khởi hành.'}
                    {booking.noShowMarkedAt && <span> · Ghi nhận lúc: {formatDateTime(booking.noShowMarkedAt)}</span>}
                  </p>
                </section>
              )}
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
              {booking.status === 'pending' && onReject && (
                <button type="button" className="btn btn-outline-danger" onClick={() => onReject(booking)}>
                  <i className="bi bi-x-circle me-2"></i>Từ chối
                </button>
              )}
              {booking.status === 'confirmed' && isDeparturePassed(booking.departureDate) && onNoShow && (
                <button type="button" className="btn btn-outline-warning text-dark fw-semibold" onClick={() => onNoShow(booking)}>
                  <i className="bi bi-person-x me-2"></i>Báo vắng mặt
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
  const [showExportBar, setShowExportBar] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  // START UC-78 Respond to Booking (Provider)
  const [approveModal, setApproveModal] = useState({ open: false, booking: null, submitting: false, error: '' });
  const [rejectModal, setRejectModal] = useState({ open: false, booking: null, reason: '', submitting: false, error: '' });
  // END UC-78 Respond to Booking (Provider)
  // START UC-86 Mark Booking as No-Show (Provider)
  const [noShowModal, setNoShowModal] = useState({ open: false, booking: null, reason: '', submitting: false, error: '' });
  // END UC-86 Mark Booking as No-Show (Provider)

  // Khóa cuộn trang nền an toàn và bắt phím Escape khi có bất kỳ modal nào mở
  useEffect(() => {
    const isAnyModalOpen = Boolean(
      selectedBooking ||
      approveModal.open ||
      rejectModal.open ||
      noShowModal.open
    );
    if (!isAnyModalOpen) return;

    document.body.classList.add('modal-open');

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (approveModal.open && !approveModal.submitting) setApproveModal({ open: false, booking: null, submitting: false, error: '' });
        else if (rejectModal.open && !rejectModal.submitting) setRejectModal({ open: false, booking: null, reason: '', submitting: false, error: '' });
        else if (noShowModal.open && !noShowModal.submitting) setNoShowModal({ open: false, booking: null, reason: '', submitting: false, error: '' });
        else if (selectedBooking) setSelectedBooking(null);
      }
    };
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.classList.remove('modal-open');
    };
  }, [selectedBooking, approveModal.open, approveModal.submitting, rejectModal.open, rejectModal.submitting, noShowModal.open, noShowModal.submitting]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setAppliedSearch(searchInput.trim());
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

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

  const handleStatusChange = (e) => {
    const val = typeof e === 'string' ? e : e?.target?.value;
    setStatusFilter(val || 'all');
    setCurrentPage(1);
  };

  const handleApprove = (booking) => {
    if (!booking || booking.status !== 'pending') return;
    setApproveModal({ open: true, booking, submitting: false, error: '' });
  };

  const handleConfirmApprove = async () => {
    const booking = approveModal.booking;
    if (!booking) return;

    setApproveModal((prev) => ({ ...prev, submitting: true, error: '' }));
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
      setApproveModal({ open: false, booking: null, submitting: false, error: '' });
    } catch (requestError) {
      setApproveModal((prev) => ({ ...prev, submitting: false, error: requestError.message || 'Không thể xác nhận đặt tour.' }));
    }
  };

  // START UC-78 Respond to Booking (Provider)
  const handleConfirmReject = async (e) => {
    e.preventDefault();
    const { booking, reason } = rejectModal;
    if (!booking) return;
    if (reason.trim().length < 5) {
      setRejectModal((prev) => ({ ...prev, error: 'Lý do từ chối phải có ít nhất 5 ký tự.' }));
      return;
    }

    setRejectModal((prev) => ({ ...prev, submitting: true, error: '' }));
    try {
      const response = await bookingApi.respondBooking(booking._id, {
        action: 'reject',
        rejectionReason: reason.trim()
      });
      const updated = response.data;
      setBookings((prev) => prev.map((item) => (item._id === updated._id ? updated : item)));
      setSelectedBooking((prev) => (prev && prev._id === updated._id ? updated : prev));
      setSummary((prev) => ({
        ...prev,
        pending: Math.max(0, (prev.pending || 0) - 1),
        rejected: (prev.rejected || 0) + 1
      }));
      setSuccessMessage(response.message || 'Đã từ chối đơn đặt tour thành công.');
      setRejectModal({ open: false, booking: null, reason: '', submitting: false, error: '' });
    } catch (requestError) {
      setRejectModal((prev) => ({ ...prev, submitting: false, error: requestError.message || 'Không thể từ chối đơn đặt tour.' }));
    }
  };
  // END UC-78 Respond to Booking (Provider)

  // START UC-86 Mark Booking as No-Show (Provider)
  const handleConfirmNoShow = async (e) => {
    e.preventDefault();
    const { booking, reason } = noShowModal;
    if (!booking) return;

    setNoShowModal((prev) => ({ ...prev, submitting: true, error: '' }));
    try {
      const response = await bookingApi.markNoShow(booking._id, reason.trim() || undefined);
      const updated = response.data;
      setBookings((prev) => prev.map((item) => (item._id === updated._id ? updated : item)));
      setSelectedBooking((prev) => (prev && prev._id === updated._id ? updated : prev));
      setSummary((prev) => ({
        ...prev,
        confirmed: Math.max(0, (prev.confirmed || 0) - 1),
        no_show: (prev.no_show || 0) + 1
      }));
      setSuccessMessage(response.message || 'Đã ghi nhận khách vắng mặt thành công.');
      setNoShowModal({ open: false, booking: null, reason: '', submitting: false, error: '' });
    } catch (requestError) {
      setNoShowModal((prev) => ({ ...prev, submitting: false, error: requestError.message || 'Không thể ghi nhận khách vắng mặt.' }));
    }
  };
  // END UC-86 Mark Booking as No-Show (Provider)

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
      {/* Page Heading & Nút Xuất Báo Cáo */}
      <div className="management-page-heading d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
        <div>
          <span className="management-page-kicker">Tour Provider</span>
          <h1>Yêu cầu đặt tour</h1>
          <p>Xem danh sách, quản lý và phản hồi các yêu cầu đặt tour du lịch của khách hàng.</p>
        </div>

        <button
          type="button"
          className="btn btn-outline-primary d-inline-flex align-items-center gap-2"
          onClick={() => setShowExportBar((prev) => !prev)}
        >
          <i className="bi bi-file-earmark-spreadsheet"></i>
          <span>{showExportBar ? 'Ẩn bộ lọc báo cáo' : 'Xuất báo cáo CSV'}</span>
        </button>
      </div>

      {showExportBar && (
        <div className="card border-0 shadow-sm rounded-3 mb-4">
          <div className="card-body d-flex flex-wrap align-items-end gap-3">
            <div>
              <label className="form-label small fw-semibold mb-1" htmlFor="report-from">Từ ngày</label>
              <input id="report-from" type="date" className="form-control form-control-sm" value={reportFrom} onChange={(event) => setReportFrom(event.target.value)} />
            </div>
            <div>
              <label className="form-label small fw-semibold mb-1" htmlFor="report-to">Đến ngày</label>
              <input id="report-to" type="date" className="form-control form-control-sm" value={reportTo} onChange={(event) => setReportTo(event.target.value)} />
            </div>
            <button type="button" className="btn btn-primary btn-sm" onClick={handleExportReport} disabled={isExporting}>
              {isExporting
                ? <><span className="spinner-border spinner-border-sm me-2" role="status"></span>Đang xuất...</>
                : <><i className="bi bi-download me-1"></i>Tải file CSV</>}
            </button>
            <span className="small text-muted">Lọc theo thời điểm tạo đơn đặt tour.</span>
          </div>
        </div>
      )}

      {/* Summary KPI Badges */}
      <div className="d-flex flex-wrap gap-3 mb-4">
        <span className="badge bg-white text-dark border py-2 px-3 fw-normal shadow-sm rounded-3">
          <i className="bi bi-receipt text-primary me-2"></i>
          Tổng đơn: <strong>{summary.total || 0}</strong>
        </span>
        <span className="badge bg-white text-dark border py-2 px-3 fw-normal shadow-sm rounded-3">
          <i className="bi bi-hourglass-split text-warning me-2"></i>
          Chờ xác nhận: <strong className="text-warning">{summary.pending || 0}</strong>
        </span>
        <span className="badge bg-white text-dark border py-2 px-3 fw-normal shadow-sm rounded-3">
          <i className="bi bi-people text-info me-2"></i>
          Lượt khách: <strong>{summary.totalGuests || 0}</strong>
        </span>
        <span className="badge bg-white text-dark border py-2 px-3 fw-normal shadow-sm rounded-3">
          <i className="bi bi-cash-coin text-success me-2"></i>
          Doanh thu đã xác nhận: <strong>{formatCurrency(summary.confirmedRevenue)}</strong>
        </span>
      </div>

      {successMessage && (
        <div className="alert alert-success d-flex align-items-center alert-dismissible fade show" role="status">
          <i className="bi bi-check-circle-fill me-2"></i>
          <div>{successMessage}</div>
          <button type="button" className="btn-close ms-auto" onClick={() => setSuccessMessage('')} aria-label="Đóng"></button>
        </div>
      )}

      {error && (
        <div className="alert alert-danger d-flex align-items-center alert-dismissible fade show" role="alert">
          <i className="bi bi-exclamation-triangle-fill me-2"></i>
          <div>{error}</div>
          <button type="button" className="btn-close ms-auto" onClick={() => setError('')} aria-label="Đóng"></button>
        </div>
      )}

      {/* Bảng danh sách yêu cầu đặt tour đồng bộ 1:1 với UI Quản lý tour */}
      <div className="management-table-card">
        <div className="management-table-toolbar">
          <div className="management-search-box">
            <i className="bi bi-search"></i>
            <input
              type="search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Tìm theo tên tour, điểm đi hoặc điểm đến..."
              aria-label="Tìm kiếm yêu cầu đặt tour"
            />
          </div>

          <div className="d-flex align-items-center gap-2">
            <label htmlFor="provider-booking-status-filter" className="small text-muted fw-semibold mb-0 text-nowrap">
              <i className="bi bi-funnel me-1"></i>Trạng thái:
            </label>
            <CustomSelect
              id="provider-booking-status-filter"
              style={{ width: '190px' }}
              triggerStyle={{ height: '36px', fontSize: '0.86rem' }}
              value={statusFilter}
              onChange={handleStatusChange}
              options={STATUS_FILTER_OPTIONS}
            />
          </div>
        </div>

        <div className="table-responsive">
          <table className="management-table">
            <thead>
              <tr>
                <th style={{ width: '30%' }}>Tour</th>
                <th style={{ width: '25%' }}>Hành trình</th>
                <th style={{ width: '18%' }}>Giá và chỗ</th>
                <th style={{ width: '15%' }}>Trạng thái</th>
                <th className="text-end" style={{ width: '12%' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="5" className="text-center py-5 text-muted">
                    <span className="spinner-border spinner-border-sm text-primary me-2" role="status"></span>
                    Đang tải yêu cầu đặt tour...
                  </td>
                </tr>
              ) : bookings.length === 0 ? (
                <tr>
                  <td colSpan="5">
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
                      <div className="d-flex align-items-center gap-3">
                        {booking.tourId?.images?.[0] ? (
                          <img
                            src={booking.tourId.images[0]}
                            alt={booking.tourId.title || 'Tour'}
                            className="management-table-thumb"
                          />
                        ) : (
                          <div className="management-table-thumb-empty">
                            <i className="bi bi-image"></i>
                          </div>
                        )}
                        <div>
                          <div className="fw-bold text-dark">{booking.tourId?.title || 'Tour không còn khả dụng'}</div>
                          <div className="small text-muted mt-1">
                            <i className="bi bi-clock me-1"></i>
                            {booking.tourId?.duration || 'Lịch trình tiêu chuẩn'}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td>
                      <div className="d-flex align-items-center gap-2 small">
                        <span className="text-dark fw-medium">{booking.tourId?.departureLocation || 'Chưa cập nhật'}</span>
                        <i className="bi bi-arrow-right text-muted"></i>
                        <span className="text-primary fw-medium">{booking.tourId?.destinationLocation || booking.tourId?.location || 'Chưa cập nhật'}</span>
                      </div>
                      <div className="small text-muted mt-1 d-flex align-items-center" title={`${booking.fullName} - ${booking.phone}`}>
                        <i className="bi bi-person me-1 text-primary flex-shrink-0"></i>
                        <span className="text-dark fw-medium text-truncate" style={{ maxWidth: '140px' }}>
                          {formatCustomerName(booking.fullName)}
                        </span>
                        {booking.phone && (
                          <span className="text-muted ms-1 flex-shrink-0">({booking.phone})</span>
                        )}
                      </div>
                    </td>

                    <td>
                      <div className="fw-bold text-dark">{formatCurrency(booking.totalPrice)}</div>
                      <div className="small text-muted mt-1">
                        <i className="bi bi-people me-1"></i>
                        <span>{booking.numberOfPeople} khách</span>
                        <span className="mx-1">·</span>
                        <i className="bi bi-calendar-event me-1"></i>
                        <span>{formatDate(booking.departureDate)}</span>
                      </div>
                    </td>

                    <td>
                      <span className={`management-badge ${status.className}`}>
                        <span className="management-badge-dot"></span>{status.label}
                      </span>
                      {booking.status === 'rejected' && booking.rejectionReason && (
                        <div className="small text-muted mt-1 text-truncate" style={{ maxWidth: '170px' }} title={booking.rejectionReason}>
                          <i className="bi bi-info-circle me-1 text-danger"></i>{booking.rejectionReason}
                        </div>
                      )}
                      {booking.status === 'no_show' && booking.noShowReason && (
                        <div className="small text-muted mt-1 text-truncate" style={{ maxWidth: '170px' }} title={booking.noShowReason}>
                          <i className="bi bi-person-x me-1 text-danger"></i>{booking.noShowReason}
                        </div>
                      )}
                    </td>

                    <td className="text-end">
                      <div className="management-actions justify-content-end">
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
                          <>
                            <button
                              type="button"
                              className="management-action-btn btn-approve"
                              title="Duyệt đặt tour"
                              aria-label={`Duyệt booking của ${booking.fullName}`}
                              onClick={() => handleApprove(booking)}
                            >
                              <i className="bi bi-check-lg"></i>
                            </button>
                            <button
                              type="button"
                              className="management-action-btn btn-delete"
                              title="Từ chối giữ chỗ"
                              aria-label={`Từ chối booking của ${booking.fullName}`}
                              onClick={() => setRejectModal({ open: true, booking, reason: '', submitting: false, error: '' })}
                            >
                              <i className="bi bi-x-lg"></i>
                            </button>
                          </>
                        )}
                        {booking.status === 'confirmed' && isDeparturePassed(booking.departureDate) && (
                          <button
                            type="button"
                            className="management-action-btn btn-flag"
                            title="Báo khách vắng mặt"
                            aria-label={`Báo khách vắng mặt ${booking.fullName}`}
                            onClick={() => setNoShowModal({ open: true, booking, reason: '', submitting: false, error: '' })}
                          >
                            <i className="bi bi-person-x"></i>
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

      {selectedBooking && (
        <BookingDetailModal
          booking={selectedBooking}
          onClose={() => setSelectedBooking(null)}
          onApprove={(b) => {
            setSelectedBooking(null);
            handleApprove(b);
          }}
          onReject={(b) => {
            setSelectedBooking(null);
            setRejectModal({ open: true, booking: b, reason: '', submitting: false, error: '' });
          }}
          onNoShow={(b) => {
            setSelectedBooking(null);
            setNoShowModal({ open: true, booking: b, reason: '', submitting: false, error: '' });
          }}
          isApproving={approveModal.open && approveModal.submitting}
        />
      )}

      {/* START Approve Booking Modal */}
      {approveModal.open && approveModal.booking && (
        <>
          <div className="modal-backdrop fade show" style={{ zIndex: 1050 }} onClick={() => !approveModal.submitting && setApproveModal({ open: false, booking: null, submitting: false, error: '' })}></div>
          <div
            className="modal fade show d-block"
            tabIndex="-1"
            role="dialog"
            aria-modal="true"
            style={{ zIndex: 1055, overscrollBehavior: 'contain' }}
            onClick={(e) => {
              if (e.target === e.currentTarget && !approveModal.submitting) {
                setApproveModal({ open: false, booking: null, submitting: false, error: '' });
              }
            }}
          >
            <div className="modal-dialog modal-dialog-centered" style={{ overscrollBehavior: 'contain' }}>
              <div className="modal-content border-0 shadow">
                <div className="modal-header">
                  <h5 className="modal-title fw-bold text-dark d-flex align-items-center mb-0">
                    <i className="bi bi-check-circle text-success me-2"></i>
                    <span>Xác nhận duyệt đặt tour</span>
                  </h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setApproveModal({ open: false, booking: null, submitting: false, error: '' })}
                    disabled={approveModal.submitting}
                    aria-label="Đóng"
                  ></button>
                </div>
                <div className="modal-body py-3">
                  <p className="mb-3 text-dark">
                    Bạn có chắc chắn muốn duyệt đơn đặt tour của <strong>{approveModal.booking.fullName}</strong> ({approveModal.booking.numberOfPeople} người) cho tour <strong>{approveModal.booking.tourId?.title}</strong>?
                  </p>
                  <div className="p-3 bg-light rounded-3 border small mb-3">
                    <div className="d-flex justify-content-between mb-1">
                      <span className="text-muted">Khởi hành:</span>
                      <strong className="text-dark">{formatDate(approveModal.booking.departureDate)}</strong>
                    </div>
                    <div className="d-flex justify-content-between mb-1">
                      <span className="text-muted">Số điện thoại:</span>
                      <strong className="text-dark">{approveModal.booking.phone}</strong>
                    </div>
                    <div className="d-flex justify-content-between">
                      <span className="text-muted">Tổng tiền:</span>
                      <strong className="text-success">{formatCurrency(approveModal.booking.totalPrice)}</strong>
                    </div>
                  </div>

                  <p className="small text-muted mb-0">
                    <i className="bi bi-info-circle text-primary me-1"></i>
                    Khi duyệt, đơn sẽ chuyển sang trạng thái <strong>Đã xác nhận</strong> và tự động cập nhật số chỗ trống của tour.
                  </p>

                  {approveModal.error && (
                    <div className="alert alert-danger py-2 small mt-3 mb-0">{approveModal.error}</div>
                  )}
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => setApproveModal({ open: false, booking: null, submitting: false, error: '' })}
                    disabled={approveModal.submitting}
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    className="btn btn-success d-inline-flex align-items-center gap-1"
                    onClick={handleConfirmApprove}
                    disabled={approveModal.submitting}
                  >
                    {approveModal.submitting ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-1" role="status"></span>
                        Đang duyệt...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-check-lg me-1"></i>
                        Xác nhận duyệt
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
      {/* END Approve Booking Modal */}

      {/* START UC-78 Reject Booking Modal */}
      {rejectModal.open && rejectModal.booking && (
        <>
          <div className="modal-backdrop fade show" style={{ zIndex: 1050 }} onClick={() => !rejectModal.submitting && setRejectModal({ open: false, booking: null, reason: '', submitting: false, error: '' })}></div>
          <div
            className="modal fade show d-block"
            tabIndex="-1"
            role="dialog"
            aria-modal="true"
            style={{ zIndex: 1055, overscrollBehavior: 'contain' }}
            onClick={(e) => {
              if (e.target === e.currentTarget && !rejectModal.submitting) {
                setRejectModal({ open: false, booking: null, reason: '', submitting: false, error: '' });
              }
            }}
          >
            <div className="modal-dialog modal-dialog-centered" style={{ overscrollBehavior: 'contain' }}>
              <div className="modal-content border-0 shadow">
                <form onSubmit={handleConfirmReject}>
                  <div className="modal-header">
                    <h5 className="modal-title fw-bold text-dark d-flex align-items-center mb-0">
                      <i className="bi bi-x-circle text-danger me-2"></i>
                      <span>Từ chối yêu cầu đặt tour</span>
                    </h5>
                    <button
                      type="button"
                      className="btn-close"
                      onClick={() => setRejectModal({ open: false, booking: null, reason: '', submitting: false, error: '' })}
                      disabled={rejectModal.submitting}
                      aria-label="Đóng"
                    ></button>
                  </div>
                  <div className="modal-body py-3">
                    <p className="mb-3 text-dark">
                      Từ chối yêu cầu đặt tour của <strong>{rejectModal.booking.fullName}</strong> ({rejectModal.booking.numberOfPeople} người) cho tour <strong>{rejectModal.booking.tourId?.title}</strong>.
                    </p>
                    <div className="mb-3">
                      <label htmlFor="rejectionReasonInput" className="form-label fw-semibold">
                        Lý do từ chối <span className="text-danger">*</span>
                      </label>
                      <textarea
                        id="rejectionReasonInput"
                        className="form-control"
                        rows="3"
                        required
                        minLength={5}
                        maxLength={500}
                        placeholder="Nhập lý do cụ thể (ví dụ: Hết xe vận chuyển, thời tiết xấu, quá tải...)"
                        value={rejectModal.reason}
                        onChange={(e) => setRejectModal((prev) => ({ ...prev, reason: e.target.value, error: '' }))}
                        disabled={rejectModal.submitting}
                        autoFocus
                      ></textarea>
                      <div className="d-flex justify-content-between form-text small mt-1">
                        <span>Tối thiểu 5 ký tự. Lý do sẽ được thông báo tới khách hàng.</span>
                        <span>{rejectModal.reason.length}/500</span>
                      </div>
                    </div>
                    {rejectModal.error && (
                      <div className="alert alert-danger py-2 small mb-0">{rejectModal.error}</div>
                    )}
                  </div>
                  <div className="modal-footer">
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={() => setRejectModal({ open: false, booking: null, reason: '', submitting: false, error: '' })}
                      disabled={rejectModal.submitting}
                    >
                      Hủy
                    </button>
                    <button
                      type="submit"
                      className="btn btn-danger d-inline-flex align-items-center gap-1"
                      disabled={rejectModal.submitting || rejectModal.reason.trim().length < 5}
                    >
                      {rejectModal.submitting ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-1" role="status"></span>
                          Đang xử lý...
                        </>
                      ) : (
                        <>
                          <i className="bi bi-x-circle me-1"></i>
                          Xác nhận từ chối
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </>
      )}
      {/* END UC-78 Reject Booking Modal */}

      {/* START UC-86 Mark Booking as No-Show Modal */}
      {noShowModal.open && noShowModal.booking && (
        <>
          <div className="modal-backdrop fade show" style={{ zIndex: 1050 }} onClick={() => !noShowModal.submitting && setNoShowModal({ open: false, booking: null, reason: '', submitting: false, error: '' })}></div>
          <div
            className="modal fade show d-block"
            tabIndex="-1"
            role="dialog"
            aria-modal="true"
            style={{ zIndex: 1055, overscrollBehavior: 'contain' }}
            onClick={(e) => {
              if (e.target === e.currentTarget && !noShowModal.submitting) {
                setNoShowModal({ open: false, booking: null, reason: '', submitting: false, error: '' });
              }
            }}
          >
            <div className="modal-dialog modal-dialog-centered" style={{ overscrollBehavior: 'contain' }}>
              <div className="modal-content border-0 shadow">
                <form onSubmit={handleConfirmNoShow}>
                  <div className="modal-header">
                    <h5 className="modal-title fw-bold text-dark d-flex align-items-center mb-0">
                      <i className="bi bi-person-x text-warning me-2"></i>
                      <span>Xác nhận khách vắng mặt</span>
                    </h5>
                    <button
                      type="button"
                      className="btn-close"
                      onClick={() => setNoShowModal({ open: false, booking: null, reason: '', submitting: false, error: '' })}
                      disabled={noShowModal.submitting}
                      aria-label="Đóng"
                    ></button>
                  </div>
                  <div className="modal-body py-3">
                    <div className="alert alert-warning border small mb-3">
                      <strong>Cảnh báo:</strong> Thao tác này sẽ ghi nhận vi phạm vắng mặt cho khách hàng <strong>{noShowModal.booking.fullName}</strong>. Tích lũy từ 2 lần vi phạm, tài khoản khách sẽ bị tự động khóa chức năng đặt tour.
                    </div>
                    <div className="mb-3">
                      <label htmlFor="noShowReasonInput" className="form-label fw-semibold">
                        Ghi chú sự việc (tùy chọn)
                      </label>
                      <textarea
                        id="noShowReasonInput"
                        className="form-control"
                        rows="3"
                        maxLength={500}
                        placeholder="Ví dụ: Đã gọi điện nhiều lần nhưng khách tắt máy, xe đã xuất phát sau 30 phút chờ..."
                        value={noShowModal.reason}
                        onChange={(e) => setNoShowModal((prev) => ({ ...prev, reason: e.target.value, error: '' }))}
                        disabled={noShowModal.submitting}
                      ></textarea>
                      <div className="form-text text-end">{noShowModal.reason.length}/500</div>
                    </div>
                    {noShowModal.error && (
                      <div className="alert alert-danger py-2 small mb-0">{noShowModal.error}</div>
                    )}
                  </div>
                  <div className="modal-footer">
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={() => setNoShowModal({ open: false, booking: null, reason: '', submitting: false, error: '' })}
                      disabled={noShowModal.submitting}
                    >
                      Hủy
                    </button>
                    <button
                      type="submit"
                      className="btn btn-warning text-dark fw-semibold d-inline-flex align-items-center gap-1"
                      disabled={noShowModal.submitting}
                    >
                      {noShowModal.submitting ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-1" role="status"></span>
                          Đang ghi nhận...
                        </>
                      ) : (
                        <>
                          <i className="bi bi-person-x-fill me-1"></i>
                          Xác nhận vắng mặt
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </>
      )}
      {/* END UC-86 Mark Booking as No-Show Modal */}
    </section>
  );
}
