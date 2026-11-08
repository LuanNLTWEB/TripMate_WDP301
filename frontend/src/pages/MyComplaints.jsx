import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal';
import { complaintApi } from '../services/api';
import { useToast } from '../hooks/useToast';

const CATEGORY_LABELS = {
  quality_mismatch: 'Chất lượng tour không giống mô tả',
  incorrect_cash_charge: 'Provider thu sai tiền mặt',
  wrongful_no_show: 'Bị đánh dấu No-Show oan',
  other: 'Khác'
};

const STATUS_META = {
  open: { label: 'Mới gửi', icon: 'bi-envelope-open', className: 'bg-warning-subtle text-warning-emphasis border border-warning-subtle' },
  in_review: { label: 'Đang xử lý', icon: 'bi-hourglass-split', className: 'bg-info-subtle text-info-emphasis border border-info-subtle' },
  resolved: { label: 'Đã giải quyết', icon: 'bi-check-circle', className: 'bg-success-subtle text-success-emphasis border border-success-subtle' },
  rejected: { label: 'Đã từ chối', icon: 'bi-slash-circle', className: 'bg-danger-subtle text-danger-emphasis border border-danger-subtle' },
  cancelled: { label: 'Đã hủy', icon: 'bi-x-circle', className: 'bg-secondary-subtle text-secondary border border-secondary-subtle' }
};

const formatDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? '—'
    : date.toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const bookingCode = (id) => (id ? `BK-${String(id).slice(-6).toUpperCase()}` : '—');
const complaintCode = (id) => (id ? `CP-${String(id).slice(-6).toUpperCase()}` : '—');

export default function MyComplaints() {
  const navigate = useNavigate();
  const toast = useToast();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [complaintToCancel, setComplaintToCancel] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  const counts = useMemo(() => {
    const result = { total: complaints.length, open: 0, in_review: 0, resolved: 0, rejected: 0, cancelled: 0 };
    complaints.forEach((complaint) => {
      if (result[complaint.status] !== undefined) {
        result[complaint.status] += 1;
      }
    });
    return result;
  }, [complaints]);

  const load = async () => {
    setLoading(true);
    try {
      const complaintResponse = await complaintApi.getMine();
      setComplaints(complaintResponse.data || []);
      setError('');
    } catch (requestError) {
      setError(requestError.message || 'Không thể tải khiếu nại.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); // eslint-disable-line react/set-state-in-effect
  }, []);

  const handleConfirmCancel = async () => {
    if (!complaintToCancel || cancelling) return;
    setCancelling(true);
    try {
      const response = await complaintApi.cancel(complaintToCancel._id);
      toast.success(response.message || 'Đã hủy khiếu nại thành công.');
      setComplaints((prev) =>
        prev.map((item) => (item._id === complaintToCancel._id ? response.data : item))
      );
      setComplaintToCancel(null);
    } catch (err) {
      toast.error(err.message || 'Không thể hủy khiếu nại.');
    } finally {
      setCancelling(false);
    }
  };

  return (
    <>
      <Navbar />
      <main className="container py-5">
        <div className="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-4">
          <div>
            <h1 className="fw-bold">Khiếu nại của tôi</h1>
            <p className="text-muted mb-0">Theo dõi trạng thái xử lý các khiếu nại liên quan đến đơn đặt tour đã xác nhận.</p>
          </div>
          <button
            type="button"
            className="btn btn-warning rounded-pill px-4 fw-semibold"
            onClick={() => navigate('/my-bookings?complain=1')}
          >
            <i className="bi bi-flag me-2"></i>Gửi khiếu nại mới
          </button>
        </div>

        {complaints.length > 0 && (
          <div className="d-flex flex-wrap gap-2 mb-4">
            <span className="badge bg-light text-dark border rounded-pill px-3 py-2">
              <i className="bi bi-list-ul me-1"></i>Tổng: {counts.total}
            </span>
            <span className={`badge rounded-pill px-3 py-2 ${STATUS_META.open.className}`}><i className={`bi ${STATUS_META.open.icon} me-1`}></i>{STATUS_META.open.label}: {counts.open}</span>
            <span className={`badge rounded-pill px-3 py-2 ${STATUS_META.in_review.className}`}><i className={`bi ${STATUS_META.in_review.icon} me-1`}></i>{STATUS_META.in_review.label}: {counts.in_review}</span>
            <span className={`badge rounded-pill px-3 py-2 ${STATUS_META.resolved.className}`}><i className={`bi ${STATUS_META.resolved.icon} me-1`}></i>{STATUS_META.resolved.label}: {counts.resolved}</span>
            <span className={`badge rounded-pill px-3 py-2 ${STATUS_META.rejected.className}`}><i className={`bi ${STATUS_META.rejected.icon} me-1`}></i>{STATUS_META.rejected.label}: {counts.rejected}</span>
            <span className={`badge rounded-pill px-3 py-2 ${STATUS_META.cancelled.className}`}><i className={`bi ${STATUS_META.cancelled.icon} me-1`}></i>{STATUS_META.cancelled.label}: {counts.cancelled}</span>
          </div>
        )}

        {error && <div className="alert alert-danger">{error}</div>}

        {loading ? (
          <div className="text-center py-5"><div className="spinner-border text-primary" role="status"><span className="visually-hidden">Đang tải...</span></div><p className="text-muted mt-2 mb-0">Đang tải khiếu nại...</p></div>
        ) : complaints.length === 0 ? (
          <div className="card border-0 shadow-sm">
            <div className="card-body text-center py-5">
              <div className="mx-auto mb-3 bg-light text-muted rounded-circle d-flex align-items-center justify-content-center" style={{ width: 72, height: 72 }}>
                <i className="bi bi-inbox fs-2"></i>
              </div>
              <h5 className="fw-bold">Bạn chưa có khiếu nại nào</h5>
              <p className="text-muted mx-auto" style={{ maxWidth: 480 }}>
                Khi đơn đặt tour của bạn gặp sự cố, bạn có thể gửi khiếu nại ngay tại lịch sử đặt tour — kèm ảnh minh chứng — và quay lại đây để theo dõi tiến trình xử lý.
              </p>
              <button type="button" className="btn btn-warning rounded-pill px-4 fw-semibold" onClick={() => navigate('/my-bookings?complain=1')}>
                <i className="bi bi-flag me-2"></i>Gửi khiếu nại đầu tiên
              </button>
            </div>
          </div>
        ) : (
          <div className="d-flex flex-column gap-3">
            {complaints.map((complaint) => {
              const statusMeta = STATUS_META[complaint.status] || STATUS_META.open;
              const canCancel = ['open', 'in_review'].includes(complaint.status);
              return (
                <article className="card border-0 shadow-sm rounded-4 overflow-hidden" key={complaint._id}>
                  <div className="card-body p-4">
                    <div className="d-flex flex-wrap justify-content-between align-items-start gap-2">
                      <div className="d-flex flex-wrap align-items-center gap-2">
                        <span className="badge bg-secondary-subtle text-secondary font-monospace">{complaintCode(complaint._id)}</span>
                        <span className={`badge rounded-pill ${statusMeta.className}`}><i className={`bi ${statusMeta.icon} me-1`}></i>{statusMeta.label}</span>
                      </div>
                      <div className="d-flex align-items-center gap-2">
                        <span className="small text-muted text-nowrap">
                          <i className="bi bi-calendar3 me-1"></i>{formatDate(complaint.createdAt)}
                        </span>
                        {canCancel && (
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-danger rounded-pill px-3"
                            onClick={() => setComplaintToCancel(complaint)}
                          >
                            <i className="bi bi-x-circle me-1"></i>Hủy khiếu nại
                          </button>
                        )}
                      </div>
                    </div>

                    <h5 className="fw-bold mt-3 mb-1">{complaint.tourId?.title || 'Tour'}</h5>
                    <div className="d-flex flex-wrap gap-x-3 gap-y-1 small text-muted">
                      <span><i className="bi bi-tag me-1"></i>{CATEGORY_LABELS[complaint.category] || 'Khác'}</span>
                      <span><i className="bi bi-receipt me-1"></i>{bookingCode(complaint.bookingId?._id)}</span>
                      <span><i className="bi bi-geo-alt me-1"></i>{complaint.tourId?.departureLocation || '—'} → {complaint.tourId?.destinationLocation || '—'}</span>
                    </div>

                    <p className="mt-3 mb-0">{complaint.description}</p>

                    {complaint.evidenceImages?.length > 0 && (
                      <>
                        <div className="text-muted small mt-3 mb-2">
                          <i className="bi bi-images me-1"></i>Ảnh minh chứng ({complaint.evidenceImages.length})
                        </div>
                        <div className="d-flex flex-wrap gap-2">
                          {complaint.evidenceImages.map((url, index) => (
                            <a key={`${url}-${index}`} href={url} target="_blank" rel="noreferrer" className="d-inline-block rounded-3 overflow-hidden border shadow-sm" style={{ width: 96, height: 72 }} title={`Minh chứng ${index + 1}`}>
                              <img src={url} alt={`Minh chứng ${index + 1}`} className="w-100 h-100 object-fit-cover" />
                            </a>
                          ))}
                        </div>
                      </>
                    )}

                    {complaint.resolutionNote && (
                      <div className={`alert ${complaint.status === 'rejected' ? 'alert-danger' : 'alert-info'} py-3 mt-3 mb-0`}>
                        <div className="fw-semibold small mb-1">
                          <i className="bi bi-clipboard-check me-1"></i>
                          {complaint.status === 'rejected' ? 'Lý do từ chối' : 'Kết quả xử lý'}
                          {complaint.resolvedAt && <span className="text-muted fw-normal"> · {formatDate(complaint.resolvedAt)}</span>}
                        </div>
                        {complaint.resolutionNote}
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {!loading && (
          <div className="text-muted small mt-4">
            <i className="bi bi-info-circle me-1"></i>
            Khiếu nại mới được gửi tại lịch sử đặt tour, ngay trên đơn đặt tour cần khiếu nại. Bạn sẽ thấy cập nhật xử lý ngay tại trang này.
          </div>
        )}
        <Link className="btn btn-link px-0 mt-3" to="/my-bookings">Quay lại lịch sử đặt tour</Link>

        <ConfirmDeleteModal
          isOpen={Boolean(complaintToCancel)}
          title="Xác nhận hủy khiếu nại"
          message={`Bạn có chắc chắn muốn hủy khiếu nại ${complaintToCancel ? complaintCode(complaintToCancel._id) : ''} cho tour "${complaintToCancel?.tourId?.title || 'Tour'}" không?`}
          confirmText="Hủy khiếu nại"
          cancelText="Đóng"
          loading={cancelling}
          onConfirm={handleConfirmCancel}
          onClose={() => {
            if (!cancelling) setComplaintToCancel(null);
          }}
        />
      </main>
      <Footer />
    </>
  );
}
