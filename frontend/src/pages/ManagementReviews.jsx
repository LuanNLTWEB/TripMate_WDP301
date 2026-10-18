import { useEffect, useState } from 'react';
import { reviewApi } from '../services/api';
import { useToast } from '../hooks/useToast';

const STATUS_OPTIONS = [
  { value: 'all', label: 'Tất cả' },
  { value: 'pending', label: 'Chờ duyệt' },
  { value: 'approved', label: 'Đã duyệt' },
  { value: 'rejected', label: 'Đã từ chối' },
  { value: 'flagged', label: 'Bị gắn cờ' }
];

const renderStars = (rating) => {
  const stars = [];
  for (let i = 1; i <= 5; i++) {
    stars.push(
      <i
        key={i}
        className={`bi ${i <= rating ? 'bi-star-fill text-warning' : 'bi-star text-muted'} me-1`}
      />
    );
  }
  return <span className="d-inline-flex align-items-center">{stars}</span>;
};

const getStatusBadge = (status) => {
  switch (status) {
    case 'approved':
      return <span className="management-badge badge-success"><span className="management-badge-dot"></span>Đã duyệt</span>;
    case 'rejected':
      return <span className="management-badge badge-danger"><span className="management-badge-dot"></span>Đã từ chối</span>;
    case 'flagged':
      return <span className="management-badge badge-warning"><span className="management-badge-dot"></span>Gắn cờ</span>;
    case 'pending':
    default:
      return <span className="management-badge badge-secondary"><span className="management-badge-dot"></span>Chờ duyệt</span>;
  }
};

export default function ManagementReviews() {
  const toast = useToast();
  const [reviews, setReviews] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');

  // Reject modal state
  const [rejectModal, setRejectModal] = useState({
    open: false,
    review: null,
    reason: ''
  });

  // Delete modal state
  const [deleteModal, setDeleteModal] = useState({
    open: false,
    review: null
  });

  const loadReviews = async (page = 1, status = statusFilter, searchKeyword = search) => {
    setIsLoading(true);
    try {
      const response = await reviewApi.getForModeration({
        page,
        limit: 10,
        status,
        search: searchKeyword.trim()
      });
      setReviews(response.data || []);
      setTotal(response.total || 0);
      setTotalPages(response.totalPages || 1);
      setCurrentPage(response.currentPage || 1);
      setError('');
    } catch (requestError) {
      setError(requestError.message || 'Không thể tải danh sách đánh giá kiểm duyệt.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReviews(1, statusFilter, search);
  }, [statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadReviews(1, statusFilter, search);
  };

  const handleApprove = async (review) => {
    setActionLoading(true);
    try {
      await reviewApi.moderate(review._id, { status: 'approved', moderationReason: '' });
      toast.success('Đã phê duyệt đánh giá thành công.');
      loadReviews(currentPage, statusFilter, search);
    } catch (requestError) {
      toast.error(requestError.message || 'Không thể phê duyệt đánh giá.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleFlag = async (review) => {
    setActionLoading(true);
    try {
      await reviewApi.moderate(review._id, { status: 'flagged', moderationReason: 'Cần xem xét lại nội dung' });
      toast.info('Đã gắn cờ đánh giá.');
      loadReviews(currentPage, statusFilter, search);
    } catch (requestError) {
      toast.error(requestError.message || 'Không thể gắn cờ đánh giá.');
    } finally {
      setActionLoading(false);
    }
  };

  const confirmReject = async () => {
    if (!rejectModal.review) return;
    setActionLoading(true);
    try {
      await reviewApi.moderate(rejectModal.review._id, {
        status: 'rejected',
        moderationReason: rejectModal.reason.trim() || 'Nội dung vi phạm quy chuẩn cộng đồng'
      });
      toast.success('Đã từ chối hiển thị đánh giá.');
      setRejectModal({ open: false, review: null, reason: '' });
      loadReviews(currentPage, statusFilter, search);
    } catch (requestError) {
      toast.error(requestError.message || 'Không thể từ chối đánh giá.');
    } finally {
      setActionLoading(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteModal.review) return;
    setActionLoading(true);
    try {
      await reviewApi.delete(deleteModal.review._id);
      toast.success('Đã xóa đánh giá vĩnh viễn khỏi hệ thống.');
      setDeleteModal({ open: false, review: null });
      loadReviews(currentPage, statusFilter, search);
    } catch (requestError) {
      toast.error(requestError.message || 'Không thể xóa đánh giá.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <section className="management-page-section">
      <div className="management-page-heading">
        <span className="management-page-kicker">Review Moderation</span>
        <h1>Kiểm Duyệt Đánh Giá</h1>
        <p>Quản lý, kiểm tra và phê duyệt các đánh giá của khách hàng về các tour du lịch.</p>
      </div>

      {error && (
        <div className="alert alert-danger alert-dismissible fade show" role="alert">
          {error}
          <button type="button" className="btn-close" onClick={() => setError('')} aria-label="Đóng"></button>
        </div>
      )}

      {/* Reviews Table Card */}
      <div className="management-table-card">
        {/* Unified Toolbar */}
        <div className="management-table-toolbar">
          <div className="btn-group flex-wrap" role="group" aria-label="Lọc trạng thái">
            {STATUS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={`btn btn-sm ${statusFilter === opt.value ? 'btn-primary' : 'btn-outline-secondary'}`}
                onClick={() => setStatusFilter(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSearchSubmit} className="management-search-box" style={{ maxWidth: '360px' }}>
            <i className="bi bi-search"></i>
            <input
              type="text"
              placeholder="Tìm nội dung đánh giá..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </form>
        </div>

        <div className="table-responsive">
          <table className="management-table">
            <thead>
              <tr>
                <th style={{ width: '22%' }}>Khách hàng</th>
                <th style={{ width: '22%' }}>Tour du lịch</th>
                <th style={{ width: '28%' }}>Nội dung đánh giá</th>
                <th style={{ width: '13%' }}>Trạng thái</th>
                <th className="text-center" style={{ width: '15%' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan="5" className="text-center py-5 text-muted">
                    <div className="spinner-border spinner-border-sm text-primary me-2" role="status"></div>
                    Đang tải danh sách đánh giá...
                  </td>
                </tr>
              ) : reviews.length === 0 ? (
                <tr>
                  <td colSpan="5">
                    <div className="management-empty-state">
                      <div className="management-empty-icon">
                        <i className="bi bi-chat-square-dots fs-2"></i>
                      </div>
                      <h6 className="fw-bold text-dark mb-1">Không có đánh giá nào phù hợp</h6>
                      <p className="small text-muted mb-0">Thử thay đổi bộ lọc trạng thái hoặc từ khóa tìm kiếm.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                reviews.map((review) => (
                  <tr key={review._id}>
                    <td>
                      <div className="d-flex align-items-center">
                        <div className="rounded-circle bg-primary bg-opacity-10 text-primary d-flex align-items-center justify-content-center me-2 fw-bold" style={{ width: '36px', height: '36px' }}>
                          {(review.userId?.username || 'U')[0].toUpperCase()}
                        </div>
                        <div>
                          <div className="fw-semibold text-dark">{review.userId?.username || 'Khách hàng'}</div>
                          <small className="text-muted">{review.userId?.email || '—'}</small>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="fw-medium text-dark line-clamp-1">{review.tourId?.title || 'Tour không khả dụng'}</div>
                      <small className="text-muted">
                        <i className="bi bi-geo-alt me-1 text-danger"></i>
                        {review.tourId?.departureLocation ? `${review.tourId.departureLocation} → ` : ''}
                        {review.tourId?.location || ''}
                      </small>
                    </td>
                    <td>
                      <div className="mb-1">{renderStars(review.rating)}</div>
                      <div className="text-dark small" style={{ maxHeight: '60px', overflowY: 'auto' }}>
                        {review.comment || <span className="text-muted fst-italic">Không có lời bình luận</span>}
                      </div>
                      <div className="text-muted small" style={{ fontSize: '0.75rem' }}>
                        {new Date(review.createdAt).toLocaleString('vi-VN')}
                        {review.moderationReason && (
                          <span className="ms-2 text-danger">
                            (Lý do: {review.moderationReason})
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      {getStatusBadge(review.status)}
                    </td>
                    <td className="text-center">
                      <div className="management-actions justify-content-center">
                        {review.status !== 'approved' && (
                          <button
                            type="button"
                            className="management-action-btn btn-approve"
                            title="Phê duyệt đánh giá"
                            disabled={actionLoading}
                            onClick={() => handleApprove(review)}
                          >
                            <i className="bi bi-check-lg"></i>
                          </button>
                        )}
                        {review.status !== 'rejected' && (
                          <button
                            type="button"
                            className="management-action-btn btn-delete"
                            title="Từ chối đánh giá"
                            disabled={actionLoading}
                            onClick={() => setRejectModal({ open: true, review, reason: '' })}
                          >
                            <i className="bi bi-x-circle"></i>
                          </button>
                        )}
                        {review.status !== 'flagged' && (
                          <button
                            type="button"
                            className="management-action-btn btn-flag"
                            title="Gắn cờ xem xét"
                            disabled={actionLoading}
                            onClick={() => handleFlag(review)}
                          >
                            <i className="bi bi-flag"></i>
                          </button>
                        )}
                        <button
                          type="button"
                          className="management-action-btn btn-delete"
                          title="Xóa vĩnh viễn"
                          disabled={actionLoading}
                          onClick={() => setDeleteModal({ open: true, review })}
                        >
                          <i className="bi bi-trash"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Unified Pagination */}
        {totalPages > 1 && (
          <div className="management-pagination-bar">
            <div>
              Trang <strong>{currentPage}</strong> trên <strong>{totalPages}</strong> (Tổng {total} đánh giá)
            </div>
            <nav aria-label="Phân trang">
              <ul className="pagination pagination-sm mb-0">
                <li className={`page-item ${currentPage <= 1 ? 'disabled' : ''}`}>
                  <button
                    className="page-link"
                    disabled={currentPage <= 1 || isLoading}
                    onClick={() => loadReviews(currentPage - 1, statusFilter, search)}
                  >
                    <i className="bi bi-chevron-left me-1"></i>Trước
                  </button>
                </li>
                <li className={`page-item ${currentPage >= totalPages ? 'disabled' : ''}`}>
                  <button
                    className="page-link"
                    disabled={currentPage >= totalPages || isLoading}
                    onClick={() => loadReviews(currentPage + 1, statusFilter, search)}
                  >
                    Sau<i className="bi bi-chevron-right ms-1"></i>
                  </button>
                </li>
              </ul>
            </nav>
          </div>
        )}
      </div>

      {/* Reject Modal */}
      {rejectModal.open && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow">
              <div className="modal-header">
                <h5 className="modal-title text-danger">
                  <i className="bi bi-exclamation-triangle me-2"></i>Từ chối hiển thị đánh giá
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setRejectModal({ open: false, review: null, reason: '' })}
                ></button>
              </div>
              <div className="modal-body">
                <p className="mb-2">Bạn có chắc chắn muốn từ chối đánh giá của <strong>{rejectModal.review?.userId?.username}</strong>?</p>
                <div className="p-2 bg-light rounded small mb-3 text-muted">
                  "{rejectModal.review?.comment || 'Không có lời bình luận'}"
                </div>
                <label className="form-label small fw-semibold">Lý do từ chối:</label>
                <textarea
                  className="form-control form-control-sm"
                  rows="3"
                  placeholder="Nhập lý do từ chối (ví dụ: Chứa ngôn từ không phù hợp, spam quảng cáo...)"
                  value={rejectModal.reason}
                  onChange={(e) => setRejectModal((prev) => ({ ...prev, reason: e.target.value }))}
                ></textarea>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-sm btn-secondary"
                  onClick={() => setRejectModal({ open: false, review: null, reason: '' })}
                >
                  Hủy
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-danger"
                  disabled={actionLoading}
                  onClick={confirmReject}
                >
                  {actionLoading ? 'Đang xử lý...' : 'Xác nhận từ chối'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {deleteModal.open && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow">
              <div className="modal-header">
                <h5 className="modal-title text-danger">
                  <i className="bi bi-trash me-2"></i>Xóa đánh giá vĩnh viễn
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setDeleteModal({ open: false, review: null })}
                ></button>
              </div>
              <div className="modal-body">
                <p className="mb-0">
                  Hành động này sẽ <strong>xóa hoàn toàn</strong> đánh giá khỏi cơ sở dữ liệu và tự động tính toán lại điểm trung bình cho tour. Bạn có chắc chắn muốn xóa?
                </p>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-sm btn-secondary"
                  onClick={() => setDeleteModal({ open: false, review: null })}
                >
                  Hủy
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-danger"
                  disabled={actionLoading}
                  onClick={confirmDelete}
                >
                  {actionLoading ? 'Đang xóa...' : 'Xác nhận xóa'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
