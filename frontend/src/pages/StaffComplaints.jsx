import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { complaintApi, bookingApi } from '../services/api';
import { useToast } from '../hooks/useToast';
import CustomSelect from '../components/CustomSelect';

const STATUS_LABELS = { open: 'Mới', in_review: 'Đang xử lý', resolved: 'Đã giải quyết', rejected: 'Đã từ chối', cancelled: 'Đã hủy' };
const STATUS_META = {
  open: { label: 'Mới', className: 'badge-warning' },
  in_review: { label: 'Đang xử lý', className: 'badge-info' },
  resolved: { label: 'Đã giải quyết', className: 'badge-success' },
  rejected: { label: 'Đã từ chối', className: 'badge-danger' },
  cancelled: { label: 'Đã hủy', className: 'badge-secondary' }
};
const complaintCode = (id) => (id ? `CP-${String(id).slice(-6).toUpperCase()}` : '—');
const bookingCode = (id) => (id ? `BK-${String(id).slice(-6).toUpperCase()}` : '—');
const CATEGORY_LABELS = {
  quality_mismatch: 'Chất lượng tour',
  incorrect_cash_charge: 'Thu sai tiền',
  wrongful_no_show: 'No-Show oan',
  other: 'Khác'
};
const STATUS_OPTIONS = [
  { value: 'all', label: 'Tất cả trạng thái' },
  ...Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label }))
];
const BOOKING_STATUS_META = {
  pending: { label: 'Chờ xác nhận', className: 'badge-warning' },
  confirmed: { label: 'Đã xác nhận', className: 'badge-info' },
  paid: { label: 'Đã thanh toán', className: 'badge-success' },
  checked_in: { label: 'Đã check-in', className: 'badge-primary' },
  completed: { label: 'Hoàn thành', className: 'badge-success' },
  cancelled: { label: 'Đã hủy', className: 'badge-danger' },
  rejected: { label: 'Đã từ chối', className: 'badge-danger' },
  no_show: { label: 'No-Show', className: 'badge-secondary' }
};
const PAYMENT_METHOD_LABELS = { cash: 'Tiền mặt', bank_transfer: 'Chuyển khoản' };
const DETAIL_TABS = [
  { key: 'complaint', label: 'Khiếu nại', icon: 'bi-exclamation-diamond' },
  { key: 'booking', label: 'Đơn tour', icon: 'bi-receipt' },
  { key: 'customer', label: 'Khách hàng', icon: 'bi-person-vcard' },
  { key: 'provider', label: 'Nhà cung cấp', icon: 'bi-building' }
];

const formatDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('vi-VN');
};

const formatDateTime = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? '—'
    : date.toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
};

const formatCurrency = (value) => new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0
}).format(value || 0);

const bookingRoute = (tour) => {
  if (!tour) return '—';
  if (tour.departureLocation && tour.destinationLocation) {
    return `${tour.departureLocation} → ${tour.destinationLocation}`;
  }
  return tour.location || tour.destinationLocation || '—';
};

function InfoRow({ label, children }) {
  return (
    <div className="d-flex justify-content-between gap-3 py-2 border-bottom border-light">
      <span className="small text-muted">{label}</span>
      <span className="small fw-semibold text-dark text-end">{children || '—'}</span>
    </div>
  );
}

export default function StaffComplaints() {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [note, setNote] = useState('');
  const [noteError, setNoteError] = useState('');
  const [loading, setLoading] = useState(true);
  const [resettingNoShow, setResettingNoShow] = useState(false);
  const [detailTab, setDetailTab] = useState('complaint');

  // START STT 156 Reset No-Show Count (Staff)
  const handleResetNoShow = async (userId) => {
    if (!userId) return;
    setResettingNoShow(true);
    try {
      const res = await bookingApi.resetNoShow(userId, `Gỡ phạt No-Show theo khiếu nại #${selected?._id}`);
      toast.success(res.message || 'Đã đặt lại số lần vắng mặt của khách về 0 thành công.');
      setNote((current) => current && current.trim().length >= 5 ? current : 'Đã chấp thuận giải trình và xóa điểm vi phạm No-Show cho khách hàng.');
    } catch (err) {
      toast.error(err.message || 'Không thể đặt lại số lần vắng mặt.');
    } finally {
      setResettingNoShow(false);
    }
  };
  // END STT 156 Reset No-Show Count (Staff)

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await complaintApi.getManaged({ search, status, page: 1, limit: 50 });
      setItems(response.data || []);
    } catch (error) {
      toast.error(error.message || 'Không thể tải khiếu nại.');
    } finally {
      setLoading(false);
    }
  }, [search, status, toast]);

  useEffect(() => { load(); // eslint-disable-line react/set-state-in-effect
  }, [load]);

  const resolve = async (nextStatus) => {
    if (!selected || note.trim().length < 5) {
      setNoteError('Vui lòng nhập phản hồi xử lý ít nhất 5 ký tự.');
      document.getElementById('complaint-resolution-note')?.focus();
      toast.error('Vui lòng nhập phản hồi xử lý ít nhất 5 ký tự.');
      return;
    }
    try {
      await complaintApi.resolve(selected._id, { status: nextStatus, resolutionNote: note.trim() });
      toast.success('Đã cập nhật khiếu nại.');
      setSelected(null);
      setNote('');
      setNoteError('');
      await load();
    } catch (error) {
      toast.error(error.message || 'Không thể cập nhật khiếu nại.');
    }
  };

  const booking = selected?.bookingId && typeof selected.bookingId === 'object' ? selected.bookingId : {};
  const bookingId = booking._id || (typeof selected?.bookingId === 'string' ? selected.bookingId : null);
  const customer = selected?.customerId && typeof selected.customerId === 'object' ? selected.customerId : {};
  const tour = selected?.tourId && typeof selected.tourId === 'object' ? selected.tourId : {};
  const provider = (selected?.providerId && typeof selected.providerId === 'object' ? selected.providerId : null)
    || (tour.providerId && typeof tour.providerId === 'object' ? tour.providerId : null)
    || {};
  const complaintStatusMeta = STATUS_META[selected?.status] || { label: selected?.status || '—', className: 'badge-secondary' };
  const bookingStatusMeta = BOOKING_STATUS_META[booking.status] || { label: booking.status || '—', className: 'badge-secondary' };
  const isPaid = Boolean(booking.paidAt) || ['paid', 'checked_in', 'completed'].includes(booking.status);
  const paymentMeta = isPaid
    ? { label: 'Đã thanh toán', className: 'badge-success' }
    : { label: 'Chưa thanh toán', className: 'badge-warning' };
  const paymentMethodLabel = PAYMENT_METHOD_LABELS[booking.paymentMethod] || '—';
  const customerEmail = booking.email || customer.email;
  const customerPhone = booking.phone || customer.phone;
  const providerName = provider.username || '—';

  return (
    <section className="management-page-section">
      <div className="management-page-heading">
        <h1>Quản lý khiếu nại khách hàng</h1>
        <p>Tra cứu, xem chi tiết và xử lý các khiếu nại liên quan đến đơn đặt tour.</p>
      </div>
      <div className="management-table-card">
        <div className="management-table-toolbar flex-wrap gap-3">
          <form className="management-search-box" onSubmit={(e) => { e.preventDefault(); load(); }}>
            <i className="bi bi-search"></i>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm khách, email, số điện thoại hoặc nội dung..." />
          </form>
          <CustomSelect
            id="complaint-status-filter"
            style={{ width: '190px' }}
            triggerStyle={{ height: '40px', fontSize: '0.88rem' }}
            value={status}
            options={STATUS_OPTIONS}
            onChange={(e, val) => setStatus(val !== undefined ? val : e.target.value)}
            placeholder="Lọc trạng thái"
          />
        </div>
        <div className="table-responsive">
          <table className="management-table align-middle">
            <thead><tr><th>Mã khiếu nại</th><th>Mã đơn</th><th>Khách hàng</th><th>Tour</th><th>Loại</th><th>Trạng thái</th><th></th></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan="7" className="text-center py-5">Đang tải...</td></tr> : items.length === 0 ? <tr><td colSpan="7" className="text-center py-5 text-muted">Không có khiếu nại phù hợp.</td></tr> : items.map((item) => {
                const statusMeta = STATUS_META[item.status] || { label: item.status, className: 'badge-secondary' };
                return (
                  <tr key={item._id}>
                    <td className="fw-semibold">{complaintCode(item._id)}</td>
                    <td>{bookingCode(item.bookingId?._id || item.bookingId)}</td>
                    <td>{item.customerId?.username || item.bookingId?.fullName}<div className="small text-muted">{item.customerId?.email}</div></td>
                    <td>{item.tourId?.title || 'Tour'}</td>
                    <td>{CATEGORY_LABELS[item.category]}</td>
                    <td>
                      <span className={`management-badge ${statusMeta.className}`}>
                        <span className="management-badge-dot"></span>
                        {statusMeta.label}
                      </span>
                    </td>
                    <td><button className="btn btn-sm btn-outline-primary" onClick={() => { setSelected(item); setNote(item.resolutionNote || ''); setDetailTab('complaint'); }}>Xem</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      {selected && typeof document !== 'undefined' && createPortal(
        <>
          <div className="modal-backdrop fade show" style={{ zIndex: 1060 }} onClick={() => setSelected(null)}></div>
          <div className="modal fade show d-block" style={{ zIndex: 1065 }} tabIndex="-1" role="dialog" aria-modal="true" onClick={(e) => { if (e.target === e.currentTarget) setSelected(null); }}>
            <div className="modal-dialog modal-dialog-centered modal-md" style={{ maxWidth: 660 }}>
              <div className="modal-content shadow-lg border-0">
                <div className="modal-header align-items-start">
                  <div className="me-3">
                    <h5 className="modal-title mb-1">Chi tiết khiếu nại</h5>
                    <div className="d-flex flex-wrap align-items-center gap-2 small text-muted">
                      <span className="fw-semibold text-dark">{complaintCode(selected._id)}</span>
                      <span>•</span>
                      <span>{CATEGORY_LABELS[selected.category] || 'Khác'}</span>
                      <span>•</span>
                      <span>{formatDateTime(selected.createdAt)}</span>
                      <span className={`management-badge ${complaintStatusMeta.className}`}>
                        <span className="management-badge-dot"></span>
                        {complaintStatusMeta.label}
                      </span>
                    </div>
                  </div>
                  <button className="btn-close" onClick={() => setSelected(null)} aria-label="Đóng"></button>
                </div>
                <div className="modal-body">
                  <ul className="nav nav-tabs mb-3 flex-nowrap">
                    {DETAIL_TABS.map((tab) => (
                      <li className="nav-item" key={tab.key}>
                        <button
                          type="button"
                          className={`nav-link text-nowrap ${detailTab === tab.key ? 'active' : ''}`}
                          onClick={() => setDetailTab(tab.key)}
                        >
                          <i className={`bi ${tab.icon} me-1`}></i>{tab.label}
                        </button>
                      </li>
                    ))}
                  </ul>

                  {detailTab === 'complaint' && (
                    <div>
                      <InfoRow label="Người xử lý">{selected.resolvedBy?.username || '—'}</InfoRow>
                      <InfoRow label="Ngày xử lý">{formatDateTime(selected.resolvedAt)}</InfoRow>
                      <div className="mt-3">
                        <div className="small text-muted mb-1">Mô tả khiếu nại</div>
                        <div className="border rounded p-3 bg-light-subtle">{selected.description || '—'}</div>
                      </div>
                      {selected.evidenceImages?.length > 0 && (
                        <div className="mt-3">
                          <div className="text-muted small mb-1">Ảnh minh chứng ({selected.evidenceImages.length})</div>
                          <div className="d-flex flex-wrap gap-2">
                            {selected.evidenceImages.map((url, index) => (
                              <a key={`${url}-${index}`} href={url} target="_blank" rel="noreferrer" className="d-inline-block rounded-3 overflow-hidden border" style={{ width: 96, height: 72 }}>
                                <img src={url} alt={`Minh chứng ${index + 1}`} className="w-100 h-100 object-fit-cover" />
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {detailTab === 'booking' && (
                    <div>
                      <InfoRow label="Mã đơn">{bookingCode(bookingId)}</InfoRow>
                      <InfoRow label="Trạng thái đơn">
                        <span className={`management-badge ${bookingStatusMeta.className}`}>
                          <span className="management-badge-dot"></span>
                          {bookingStatusMeta.label}
                        </span>
                      </InfoRow>
                      <InfoRow label="Ngày khởi hành">{formatDate(booking.departureDate)}</InfoRow>
                      <InfoRow label="Số lượng khách">{booking.numberOfPeople ? `${booking.numberOfPeople} khách` : '—'}</InfoRow>
                      <InfoRow label="Tổng tiền">{booking.totalPrice != null ? formatCurrency(booking.totalPrice) : '—'}</InfoRow>
                      <InfoRow label="Ngày đặt">{formatDateTime(booking.createdAt)}</InfoRow>
                      <InfoRow label="Phương thức thanh toán">{paymentMethodLabel}</InfoRow>
                      <InfoRow label="Thanh toán">
                        <span className={`management-badge ${paymentMeta.className}`}>
                          <span className="management-badge-dot"></span>
                          {paymentMeta.label}
                        </span>
                      </InfoRow>
                      <InfoRow label="Ngày thanh toán">{formatDateTime(booking.paidAt)}</InfoRow>
                      <InfoRow label="Check-in">{formatDateTime(booking.checkedInAt)}</InfoRow>
                      <InfoRow label="Ghi chú">{booking.note || '—'}</InfoRow>
                    </div>
                  )}

                  {detailTab === 'customer' && (
                    <div>
                      <InfoRow label="Họ tên">{booking.fullName || customer.username || '—'}</InfoRow>
                      <InfoRow label="Tài khoản">{customer.username || '—'}</InfoRow>
                      <InfoRow label="Email">{customerEmail || '—'}</InfoRow>
                      <InfoRow label="Số điện thoại">{customerPhone || '—'}</InfoRow>
                      <InfoRow label="Địa chỉ">{booking.address || '—'}</InfoRow>
                    </div>
                  )}

                  {detailTab === 'provider' && (
                    <div>
                      <InfoRow label="Nhà cung cấp">{providerName}</InfoRow>
                      <InfoRow label="Email">{provider.email || '—'}</InfoRow>
                      <InfoRow label="Số điện thoại">{provider.phone || '—'}</InfoRow>
                      <InfoRow label="Tour">{tour.title || '—'}</InfoRow>
                      <InfoRow label="Thời lượng">{tour.duration || '—'}</InfoRow>
                      <InfoRow label="Tuyến đi">{bookingRoute(tour)}</InfoRow>
                    </div>
                  )}

                  <hr className="my-3" />

                  {/* START STT 156 Reset No-Show Count (Staff) */}
                  {selected.category === 'wrongful_no_show' && (
                    <div className="alert alert-warning p-3 mb-3 rounded-3 d-flex flex-wrap align-items-center justify-content-between gap-2 border border-warning-subtle">
                      <div>
                        <div className="fw-bold text-dark"><i className="bi bi-shield-exclamation me-1 text-warning"></i>Khách khiếu nại bị đánh dấu No-Show oan</div>
                        <div className="small text-muted">Nếu chấp thuận giải trình, nhân viên có thể xóa điểm vi phạm No-Show để khôi phục quyền đặt tour cho khách.</div>
                      </div>
                      <button
                        type="button"
                        className="btn btn-warning btn-sm fw-semibold rounded-pill px-3 shadow-sm d-inline-flex align-items-center gap-1"
                        onClick={() => handleResetNoShow(selected.customerId?._id || selected.customerId)}
                        disabled={resettingNoShow}
                      >
                        {resettingNoShow ? <span className="spinner-border spinner-border-sm"></span> : <i className="bi bi-arrow-counterclockwise"></i>}
                        <span>Reset điểm No-Show</span>
                      </button>
                    </div>
                  )}
                  {/* END STT 156 Reset No-Show Count (Staff) */}
                  {['open', 'in_review'].includes(selected.status) && (
                    <div className="mb-3">
                      <label className="form-label small fw-semibold text-muted mb-1" htmlFor="complaint-resolution-note">Kết quả / Phản hồi xử lý <span className="text-danger">*</span></label>
                      <textarea
                        id="complaint-resolution-note"
                        className={`form-control ${noteError ? 'is-invalid' : ''}`}
                        rows="4"
                        value={note}
                        onChange={(e) => {
                          setNote(e.target.value);
                          if (noteError) setNoteError('');
                        }}
                        placeholder="Nhập nội dung phản hồi xử lý cho khách hàng (tối thiểu 5 ký tự)..."
                      ></textarea>
                      {noteError && <div className="invalid-feedback d-block">{noteError}</div>}
                      <div className="d-flex justify-content-between align-items-center mt-1">
                        <small className={note.trim().length >= 5 ? 'text-success' : 'text-danger'}>
                          {note.trim().length >= 5 ? (
                            <><i className="bi bi-check-circle me-1"></i>Hợp lệ để giải quyết/từ chối</>
                          ) : (
                            <><i className="bi bi-exclamation-circle me-1"></i>Cần tối thiểu 5 ký tự ({note.trim().length}/5)</>
                          )}
                        </small>
                      </div>
                    </div>
                  )}
                  {selected.resolutionNote && <div className="alert alert-info">{selected.resolutionNote}</div>}
                </div>
                <div className="modal-footer">
                  <button className="btn btn-secondary" onClick={() => setSelected(null)}>Đóng</button>
                  {['open', 'in_review'].includes(selected.status) && <><button className="btn btn-danger" onClick={() => resolve('rejected')}>Từ chối</button><button className="btn btn-success" onClick={() => resolve('resolved')}>Đánh dấu đã giải quyết</button></>}
                </div>
              </div>
            </div>
          </div>
        </>,
        document.body
      )}
    </section>
  );
}
