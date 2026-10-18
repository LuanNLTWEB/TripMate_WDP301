import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { reviewApi } from '../services/api';

const EMPTY_SUMMARY = {
  total: 0,
  pending: 0,
  flagged: 0,
  approved: 0,
  rejected: 0
};

const STATUS_OPTIONS = [
  { value: 'all', label: 'Tất cả báo cáo' },
  { value: 'flagged', label: 'Chờ xử lý' },
  { value: 'approved', label: 'Đã cho hiển thị' },
  { value: 'rejected', label: 'Đã từ chối' }
];

const getStatusBadge = (status) => {
  switch (status) {
    case 'approved':
      return { label: 'Đã cho hiển thị', className: 'badge-success' };
    case 'rejected':
      return { label: 'Đã từ chối', className: 'badge-danger' };
    case 'pending':
      return { label: 'Chờ duyệt', className: 'badge-secondary' };
    case 'flagged':
    default:
      return { label: 'Chờ xử lý', className: 'badge-warning' };
  }
};

const formatDateTime = (value) => value
  ? new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(new Date(value))
  : '—';

const renderStars = (rating) => (
  <span className="d-inline-flex align-items-center" aria-label={`${rating} trên 5 sao`}>
    {[1, 2, 3, 4, 5].map((star) => (
      <i
        key={star}
        className={`bi ${star <= rating ? 'bi-star-fill text-warning' : 'bi-star text-muted'} me-1`}
      ></i>
    ))}
  </span>
);

function ReportDetailModal({ review, onClose }) {
  if (!review) return null;
  const status = getStatusBadge(review.status);

  return (
    <>
      <button
        type="button"
        className="modal-backdrop fade show border-0"
        aria-label="Đóng chi tiết báo cáo"
        onClick={onClose}
      ></button>
      <div className="modal fade show d-block" tabIndex="-1" role="dialog" aria-modal="true">
        <div className="modal-dialog modal-dialog-centered modal-lg modal-dialog-scrollable">
          <div className="modal-content border-0 shadow-lg">
            <div className="modal-header bg-light">
              <div>
                <span className="small text-danger text-uppercase fw-semibold">Reported review</span>
                <h5 className="modal-title fw-bold mb-0">Chi tiết báo cáo đánh giá</h5>
              </div>
              <button type="button" className="btn-close" onClick={onClose} aria-label="Đóng"></button>
            </div>

            <div className="modal-body p-4">
              <div className="d-flex justify-content-between align-items-start gap-3 mb-4">
                <div>
                  <div className="small text-muted">Tour được đánh giá</div>
                  <div className="fw-bold text-dark">{review.tourId?.title || 'Tour không còn khả dụng'}</div>
                  <div className="small text-muted mt-1">
                    <i className="bi bi-geo-alt text-danger me-1"></i>
                    {review.tourId?.departureLocation && `${review.tourId.departureLocation} → `}
                    {review.tourId?.destinationLocation || review.tourId?.location || 'Chưa cập nhật'}
                  </div>
                </div>
                <span className={`management-badge ${status.className}`}>
                  <span className="management-badge-dot"></span>{status.label}
                </span>
              </div>

              <section className="border rounded-3 p-3 mb-4">
                <div className="d-flex justify-content-between align-items-start gap-3 mb-2">
                  <div>
                    <div className="fw-semibold">{review.userId?.username || 'Khách hàng'}</div>
                    <div className="small text-muted">{review.userId?.email || 'Không có email'}</div>
                  </div>
                  {renderStars(review.rating)}
                </div>
                <p className="mb-0 text-secondary" style={{ whiteSpace: 'pre-line' }}>
                  {review.comment || 'Đánh giá không có nội dung bình luận.'}
                </p>
              </section>

              <section className="border border-danger-subtle bg-danger-subtle rounded-3 p-3 mb-4">
                <h6 className="fw-bold text-danger-emphasis mb-3">
                  <i className="bi bi-flag-fill me-2"></i>Nội dung báo cáo
                </h6>
                <dl className="row mb-0 g-2 small">
                  <dt className="col-md-3 text-muted fw-medium">Lý do</dt>
                  <dd className="col-md-9 mb-0 fw-semibold">{review.reportReason || 'Không ghi nhận'}</dd>
                  <dt className="col-md-3 text-muted fw-medium">Chi tiết</dt>
                  <dd className="col-md-9 mb-0" style={{ whiteSpace: 'pre-line' }}>
                    {review.reportDetails || 'Người báo cáo không cung cấp mô tả bổ sung.'}
                  </dd>
                  <dt className="col-md-3 text-muted fw-medium">Người báo cáo</dt>
                  <dd className="col-md-9 mb-0">
                    {review.reportedBy?.username || review.reportedBy?.email || 'Tài khoản không còn khả dụng'}
                  </dd>
                  <dt className="col-md-3 text-muted fw-medium">Thời điểm</dt>
                  <dd className="col-md-9 mb-0">{formatDateTime(review.reportedAt)}</dd>
                </dl>
              </section>

              {review.moderationReason && (
                <section className="border rounded-3 p-3 bg-light-subtle">
                  <h6 className="fw-bold mb-2">
                    <i className="bi bi-shield-check text-primary me-2"></i>Kết quả kiểm duyệt
                  </h6>
                  <p className="small mb-1">{review.moderationReason}</p>
                  <div className="small text-muted">
                    Xử lý bởi {review.moderatedBy?.username || review.moderatedBy?.email || 'nhân viên hệ thống'}
                  </div>
                </section>
              )}
            </div>

            <div className="modal-footer bg-light">
              <Link to="/management/reviews" className="btn btn-primary">
                <i className="bi bi-shield-check me-2"></i>Đến trang kiểm duyệt
              </Link>
              <button type="button" className="btn btn-outline-secondary" onClick={onClose}>Đóng</button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default function ReportedReviews() {
  const [reviews, setReviews] = useState([]);
  const [summary, setSummary] = useState(EMPTY_SUMMARY);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchInput, setSearchInput] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedReview, setSelectedReview] = useState(null);

  useEffect(() => {
    let active = true;

    const fetchReportedReviews = async () => {
      setLoading(true);
      try {
        const response = await reviewApi.getReported({
          status: statusFilter,
          search: appliedSearch,
          page: currentPage,
          limit: 10
        });
        if (!active) return;
        setReviews(response.data || []);
        setSummary(response.summary || EMPTY_SUMMARY);
        setTotal(response.total || 0);
        setTotalPages(response.totalPages || 0);
        setError('');
      } catch (requestError) {
        if (!active) return;
        setReviews([]);
        setSummary(EMPTY_SUMMARY);
        setTotal(0);
        setTotalPages(0);
        setError(requestError.message || 'Không thể tải danh sách đánh giá bị báo cáo.');
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchReportedReviews();
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

  return (
    <section className="management-page-section">
      <div className="management-page-heading d-flex flex-column flex-md-row justify-content-between align-items-md-start gap-3">
        <div>
          <span className="management-page-kicker">Review Moderation</span>
          <h1>Đánh Giá Bị Báo Cáo</h1>
          <p>Xem lý do, người báo cáo và trạng thái xử lý của các đánh giá bị phản ánh.</p>
        </div>
        <Link to="/management/reviews" className="btn btn-outline-primary flex-shrink-0">
          <i className="bi bi-shield-check me-2"></i>Kiểm duyệt đánh giá
        </Link>
      </div>

      <div className="row g-3 mb-4">
        <div className="col-6 col-lg-3">
          <div className="card border-0 shadow-sm h-100"><div className="card-body">
            <div className="small text-muted">Tổng báo cáo</div><div className="h4 fw-bold mb-0">{summary.total}</div>
          </div></div>
        </div>
        <div className="col-6 col-lg-3">
          <div className="card border-0 shadow-sm h-100"><div className="card-body">
            <div className="small text-muted">Chờ xử lý</div><div className="h4 fw-bold text-warning mb-0">{summary.flagged + summary.pending}</div>
          </div></div>
        </div>
        <div className="col-6 col-lg-3">
          <div className="card border-0 shadow-sm h-100"><div className="card-body">
            <div className="small text-muted">Cho hiển thị</div><div className="h4 fw-bold text-success mb-0">{summary.approved}</div>
          </div></div>
        </div>
        <div className="col-6 col-lg-3">
          <div className="card border-0 shadow-sm h-100"><div className="card-body">
            <div className="small text-muted">Đã từ chối</div><div className="h4 fw-bold text-danger mb-0">{summary.rejected}</div>
          </div></div>
        </div>
      </div>

      {error && <div className="alert alert-danger"><i className="bi bi-exclamation-triangle-fill me-2"></i>{error}</div>}

      <div className="management-table-card">
        <div className="management-table-toolbar flex-wrap gap-3">
          <div className="btn-group flex-wrap" role="group" aria-label="Lọc trạng thái báo cáo">
            {STATUS_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`btn btn-sm ${statusFilter === option.value ? 'btn-primary' : 'btn-outline-secondary'}`}
                onClick={() => handleStatusChange(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
          <form className="management-search-box" onSubmit={handleSearch} style={{ maxWidth: 420 }}>
            <i className="bi bi-search"></i>
            <input
              type="search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Tìm nội dung hoặc lý do báo cáo..."
              maxLength={100}
            />
          </form>
        </div>

        <div className="table-responsive">
          <table className="management-table align-middle">
            <thead>
              <tr>
                <th style={{ width: '22%' }}>Đánh giá</th>
                <th style={{ width: '20%' }}>Tour</th>
                <th style={{ width: '24%' }}>Thông tin báo cáo</th>
                <th style={{ width: '17%' }}>Người báo cáo</th>
                <th style={{ width: '12%' }}>Trạng thái</th>
                <th className="text-center" style={{ width: '5%' }}>Xem</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="6" className="text-center py-5 text-muted">
                  <span className="spinner-border spinner-border-sm text-primary me-2"></span>Đang tải báo cáo...
                </td></tr>
              ) : reviews.length === 0 ? (
                <tr><td colSpan="6"><div className="management-empty-state">
                  <div className="management-empty-icon"><i className="bi bi-flag fs-2"></i></div>
                  <h6 className="fw-bold text-dark mb-1">Không có báo cáo phù hợp</h6>
                  <p className="small text-muted mb-0">Thử thay đổi trạng thái hoặc từ khóa tìm kiếm.</p>
                </div></td></tr>
              ) : reviews.map((review) => {
                const status = getStatusBadge(review.status);
                return (
                  <tr key={review._id}>
                    <td>
                      <div className="mb-1">{renderStars(review.rating)}</div>
                      <div className="small text-dark text-truncate" style={{ maxWidth: 240 }} title={review.comment}>
                        {review.comment || 'Không có bình luận'}
                      </div>
                      <div className="small text-muted">Bởi {review.userId?.username || 'Khách hàng'}</div>
                    </td>
                    <td>
                      <div className="fw-semibold text-dark">{review.tourId?.title || 'Tour không khả dụng'}</div>
                      <div className="small text-muted mt-1">{review.tourId?.location || review.tourId?.destinationLocation || '—'}</div>
                    </td>
                    <td>
                      <div className="fw-semibold text-danger-emphasis"><i className="bi bi-flag-fill me-1"></i>{review.reportReason || 'Không rõ lý do'}</div>
                      <div className="small text-muted text-truncate mt-1" style={{ maxWidth: 260 }} title={review.reportDetails}>
                        {review.reportDetails || 'Không có mô tả bổ sung'}
                      </div>
                    </td>
                    <td>
                      <div className="fw-medium">{review.reportedBy?.username || 'Tài khoản không khả dụng'}</div>
                      <div className="small text-muted">{formatDateTime(review.reportedAt)}</div>
                    </td>
                    <td><span className={`management-badge ${status.className}`}><span className="management-badge-dot"></span>{status.label}</span></td>
                    <td className="text-center">
                      <button type="button" className="management-action-btn btn-view" onClick={() => setSelectedReview(review)} aria-label="Xem chi tiết báo cáo">
                        <i className="bi bi-eye"></i>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {!loading && totalPages > 1 && (
          <div className="management-pagination-bar">
            <div>Trang <strong>{currentPage}</strong>/{totalPages} · Tổng <strong>{total}</strong> báo cáo</div>
            <div className="btn-group btn-group-sm">
              <button type="button" className="btn btn-outline-secondary" disabled={currentPage <= 1} onClick={() => setCurrentPage((page) => page - 1)}>
                <i className="bi bi-chevron-left me-1"></i>Trước
              </button>
              <button type="button" className="btn btn-outline-secondary" disabled={currentPage >= totalPages} onClick={() => setCurrentPage((page) => page + 1)}>
                Sau<i className="bi bi-chevron-right ms-1"></i>
              </button>
            </div>
          </div>
        )}
      </div>

      <ReportDetailModal review={selectedReview} onClose={() => setSelectedReview(null)} />
    </section>
  );
}
