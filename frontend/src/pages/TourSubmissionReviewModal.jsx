import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { tourSubmissionApi } from '../services/api';
import { useToast } from '../hooks/useToast';

const formatCurrency = (value) => new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0
}).format(value || 0);

const formatDate = (value) => (value
  ? new Date(value).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })
  : '—');

const DECISIONS = [
  { value: 'approved', label: 'Duyệt & mở bán', icon: 'bi-check-circle', variant: 'success' },
  { value: 'needs_revision', label: 'Yêu cầu chỉnh sửa', icon: 'bi-pencil-square', variant: 'info' },
  { value: 'rejected', label: 'Từ chối', icon: 'bi-x-circle', variant: 'danger' }
];

// START UC-129 Update Tour Submission
/**
 * Modal staff kiểm duyệt một yêu cầu duyệt tour.
 *
 * Phức tạp:
 *  - Nội dung cần duyệt nằm trên tour được populate trong `submission.tourId`, không
 *    phải bản snapshot trên bài gửi; tour đã bị xóa thì modal báo rõ để staff không
 *    duyệt nhầm một yêu cầu mồ côi.
 *  - Chỉ bài 'pending' mới hiện bộ nút quyết định; bài đã xử lý chỉ còn chế độ xem lại.
 *  - Duyệt sẽ đổi tour sang 'active' (mở bán) nên nút được gắn nhãn rõ "Duyệt & mở bán".
 */
export default function TourSubmissionReviewModal({ open, submission, onClose, onReviewed }) {
  const toast = useToast();
  const [decision, setDecision] = useState('approved');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDecision('approved');
    setNote('');
    setError('');
  }, [open, submission]);

  if (!open || !submission) return null;

  const isPending = submission.status === 'pending';
  const tour = submission.tourId && typeof submission.tourId === 'object' ? submission.tourId : null;
  const provider = submission.providerId;
  const providerName = provider?.username || provider?.email || 'Nhà cung cấp';
  const requiresNote = decision !== 'approved';

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isSubmitting || !isPending) return;

    if (requiresNote && !note.trim()) {
      const msg = decision === 'rejected'
        ? 'Vui lòng nhập lý do từ chối tour.'
        : 'Vui lòng nhập nội dung cần chỉnh sửa.';
      setError(msg);
      toast.error(msg);
      document.getElementById('submission-review-note')?.focus();
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const response = await tourSubmissionApi.update(submission._id, {
        status: decision,
        reviewNote: note.trim()
      });
      toast.success(response.message || 'Đã cập nhật yêu cầu duyệt tour.');
      if (onReviewed) await onReviewed(response.data);
      onClose();
    } catch (requestError) {
      const msg = requestError.message || 'Không thể cập nhật yêu cầu duyệt tour.';
      setError(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="modal-backdrop fade show" style={{ zIndex: 1040 }}></div>
      <div
        className="modal fade show d-block"
        tabIndex="-1"
        role="dialog"
        aria-modal="true"
        style={{ zIndex: 1050 }}
        onClick={(event) => {
          if (event.target === event.currentTarget && !isSubmitting) onClose();
        }}
      >
        <div className="modal-dialog modal-dialog-centered modal-lg modal-dialog-scrollable">
          <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
            <div className="modal-header bg-light px-4 py-3">
              <div>
                <span className="badge text-bg-primary rounded-pill small mb-1">Tour Submission Review</span>
                <h5 className="modal-title fw-bold text-dark d-flex align-items-center gap-2">
                  <i className="bi bi-clipboard-check text-primary"></i>
                  <span>Kiểm duyệt yêu cầu duyệt tour</span>
                </h5>
                <small className="text-muted">
                  {providerName} · gửi lúc {formatDate(submission.createdAt)}
                </small>
              </div>
              <button type="button" className="btn-close" onClick={onClose} disabled={isSubmitting} aria-label="Đóng"></button>
            </div>

            <form className="d-flex flex-column flex-grow-1 overflow-hidden" onSubmit={handleSubmit} noValidate>
              <div className="modal-body px-4 py-3 pb-5 flex-grow-1 overflow-y-auto" style={{ minHeight: 0 }}>
                {!tour ? (
                  <div className="alert alert-warning small">
                    <i className="bi bi-exclamation-triangle me-2"></i>
                    Tour gắn với yêu cầu này không còn tồn tại. Không thể duyệt, hãy từ chối yêu cầu.
                  </div>
                ) : (
                  <>
                    {tour.images?.[0] && (
                      <img
                        src={tour.images[0]}
                        alt={tour.title}
                        className="rounded-3 border mb-3"
                        style={{ width: '100%', maxHeight: '220px', objectFit: 'cover' }}
                      />
                    )}

                    <h6 className="fw-bold text-dark mb-1">{tour.title}</h6>
                    <div className="d-flex flex-wrap gap-3 small text-muted mb-3">
                      <span><i className="bi bi-clock me-1"></i>{tour.duration}</span>
                      <span><i className="bi bi-telephone me-1"></i>{provider?.phone || 'Chưa có SĐT'}</span>
                      <span><i className="bi bi-tag me-1"></i>{tour.categoryId?.name || 'Chưa phân loại'}</span>
                    </div>

                    <div className="row g-3 mb-3">
                      <div className="col-sm-4">
                        <div className="border rounded-3 p-3 h-100 bg-light-subtle">
                          <div className="small text-muted">Giá tour</div>
                          <div className="fw-bold text-dark">{formatCurrency(tour.price)}</div>
                        </div>
                      </div>
                      <div className="col-sm-4">
                        <div className="border rounded-3 p-3 h-100 bg-light-subtle">
                          <div className="small text-muted">Số chỗ</div>
                          <div className="fw-bold text-dark">{tour.availableSeats || 0} chỗ</div>
                        </div>
                      </div>
                      <div className="col-sm-4">
                        <div className="border rounded-3 p-3 h-100 bg-light-subtle">
                          <div className="small text-muted">Hành trình</div>
                          <div className="fw-semibold text-dark small">
                            {tour.departureLocation || '—'}
                            <i className="bi bi-arrow-right text-muted mx-1"></i>
                            {tour.destinationLocation || '—'}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mb-3">
                      <div className="small fw-semibold text-secondary mb-1">Mô tả tour</div>
                      <div className="border rounded-3 p-3 small text-dark" style={{ whiteSpace: 'pre-line' }}>
                        {tour.description || 'Tour chưa có mô tả.'}
                      </div>
                    </div>

                    <Link
                      className="btn btn-sm btn-outline-primary rounded-pill mb-3"
                      to={`/management/tours/${tour._id}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <i className="bi bi-box-arrow-up-right me-1"></i>
                      Xem toàn bộ nội dung tour
                    </Link>
                  </>
                )}

                {submission.providerNote && (
                  <div className="mb-3">
                    <div className="small fw-semibold text-secondary mb-1">Ghi chú của nhà cung cấp</div>
                    <div className="border rounded-3 p-3 small text-dark bg-warning-subtle">
                      {submission.providerNote}
                    </div>
                  </div>
                )}

                {!isPending && (
                  <div className="mb-3">
                    <div className="small fw-semibold text-secondary mb-1">Kết quả duyệt trước đó</div>
                    <div className="border rounded-3 p-3 small text-dark bg-light-subtle">
                      <div className="mb-1">
                        <span className="fw-semibold">Trạng thái: </span>
                        {submission.status === 'approved' ? 'Đã duyệt' : submission.status === 'rejected' ? 'Bị từ chối' : 'Yêu cầu chỉnh sửa'}
                      </div>
                      <div>{submission.reviewNote || 'Không có phản hồi.'}</div>
                      <div className="text-muted mt-1">
                        {submission.reviewedBy?.username || 'Nhân viên'} · {formatDate(submission.reviewedAt)}
                      </div>
                    </div>
                  </div>
                )}

                {error && (
                  <div className="alert alert-danger py-2 small" role="alert">{error}</div>
                )}

                {!isPending ? (
                  <div className="alert alert-info small mb-0">
                    Yêu cầu đã được xử lý. Nếu nhà cung cấp gửi lại, yêu cầu sẽ quay về trạng thái chờ duyệt.
                  </div>
                ) : (
                  <>
                    <div className="mb-2">
                      <div className="small fw-semibold text-secondary mb-2">Quyết định kiểm duyệt</div>
                      <div className="d-flex flex-wrap gap-2">
                        {DECISIONS.map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            className={`btn btn-sm rounded-pill d-inline-flex align-items-center gap-2 ${
                              decision === option.value
                                ? `btn-${option.variant}`
                                : `btn-outline-${option.variant}`
                            }`}
                            onClick={() => {
                              setDecision(option.value);
                              setError('');
                            }}
                          >
                            <i className={`bi ${option.icon}`}></i>
                            {option.label}
                          </button>
                        ))}
                      </div>
                      <div className="form-text">
                        Duyệt sẽ đưa tour sang trạng thái đang hoạt động và hiển thị cho khách hàng.
                      </div>
                    </div>

                    <div className="mb-2">
                      <label className="form-label small fw-semibold text-secondary" htmlFor="submission-review-note">
                        Nội dung phản hồi {requiresNote ? <span className="text-danger">*</span> : '(không bắt buộc)'}
                      </label>
                      <textarea
                        id="submission-review-note"
                        rows="3"
                        maxLength={1000}
                        className={`form-control rounded-3 ${error ? 'is-invalid' : ''}`}
                        placeholder={requiresNote
                          ? 'Nêu rõ nội dung cần chỉnh sửa hoặc lý do từ chối...'
                          : 'Ghi chú thêm cho nhà cung cấp (không bắt buộc)'}
                        value={note}
                        onChange={(event) => {
                          setNote(event.target.value);
                          if (error) setError('');
                        }}
                      ></textarea>
                      {error && <div className="invalid-feedback">{error}</div>}
                    </div>
                  </>
                )}
              </div>

              <div className="modal-footer bg-light px-4 py-3 flex-shrink-0">
                <button type="button" className="btn btn-outline-secondary rounded-pill px-4" onClick={onClose} disabled={isSubmitting}>
                  Đóng
                </button>
                {isPending && (
                  <button type="submit" className="btn btn-primary rounded-pill px-4 d-inline-flex align-items-center gap-2" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <span className="spinner-border spinner-border-sm" role="status"></span>
                        Đang xử lý...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-send-check"></i>
                        Xác nhận
                      </>
                    )}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
// END UC-129 Update Tour Submission
