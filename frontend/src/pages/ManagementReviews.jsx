import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import ReviewDetailModal from '../components/ReviewDetailModal';
import ReviewManagementTable from '../components/ReviewManagementTable';
import { useToast } from '../hooks/useToast';
import { reviewApi } from '../services/api';

const EMPTY_SUMMARY = {
  total: 0,
  pending: 0,
  flagged: 0,
  approved: 0,
  rejected: 0
};

const ALL_STATUS_OPTIONS = [
  { value: 'all', label: 'Tất cả' },
  { value: 'pending', label: 'Chờ duyệt' },
  { value: 'approved', label: 'Đã duyệt' },
  { value: 'rejected', label: 'Đã từ chối' },
  { value: 'flagged', label: 'Bị gắn cờ' }
];

const REPORTED_STATUS_OPTIONS = [
  { value: 'all', label: 'Tất cả báo cáo' },
  { value: 'flagged', label: 'Chờ xử lý' },
  { value: 'pending', label: 'Chờ duyệt' },
  { value: 'approved', label: 'Đã cho hiển thị' },
  { value: 'rejected', label: 'Đã từ chối' }
];

function ReportSummary({ summary }) {
  const cards = [
    { label: 'Tổng báo cáo', value: summary.total, color: 'text-dark' },
    { label: 'Chờ xử lý', value: summary.flagged + summary.pending, color: 'text-warning' },
    { label: 'Cho hiển thị', value: summary.approved, color: 'text-success' },
    { label: 'Đã từ chối', value: summary.rejected, color: 'text-danger' }
  ];

  return (
    <div className="row g-3 mb-4">
      {cards.map((card) => (
        <div className="col-6 col-lg-3" key={card.label}>
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <div className="small text-muted">{card.label}</div>
              <div className={`h4 fw-bold mb-0 ${card.color}`}>{card.value}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function RejectReviewModal({ state, loading, onReasonChange, onClose, onConfirm }) {
  if (!state.open) return null;

  return (
    <>
      <div className="modal-backdrop fade show"></div>
      <div
        className="modal fade show d-block"
        tabIndex="-1"
        role="dialog"
        aria-modal="true"
        onClick={(event) => {
          if (event.target === event.currentTarget && !loading) onClose();
        }}
      >
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content border-0 shadow">
            <div className="modal-header">
              <h5 className="modal-title text-danger">
                <i className="bi bi-exclamation-triangle me-2"></i>Từ chối hiển thị đánh giá
              </h5>
              <button type="button" className="btn-close" disabled={loading} onClick={onClose} aria-label="Đóng"></button>
            </div>
            <div className="modal-body">
              <p className="mb-2">
                Bạn có chắc chắn muốn từ chối đánh giá của{' '}
                <strong>{state.review?.userId?.username || 'khách hàng này'}</strong>?
              </p>
              <div className="p-2 bg-light rounded small mb-3 text-muted">
                “{state.review?.comment || 'Không có lời bình luận'}”
              </div>
              <label className="form-label small fw-semibold" htmlFor="review-rejection-reason">
                Lý do từ chối
              </label>
              <textarea
                id="review-rejection-reason"
                className="form-control form-control-sm"
                rows="3"
                maxLength={500}
                placeholder="Ví dụ: Chứa ngôn từ không phù hợp hoặc nội dung quảng cáo..."
                value={state.reason}
                disabled={loading}
                onChange={(event) => onReasonChange(event.target.value)}
              ></textarea>
              <div className="form-text">Nếu để trống, hệ thống sẽ dùng lý do mặc định.</div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-sm btn-secondary" disabled={loading} onClick={onClose}>
                Hủy
              </button>
              <button type="button" className="btn btn-sm btn-danger" disabled={loading} onClick={onConfirm}>
                {loading ? (
                  <><span className="spinner-border spinner-border-sm me-2"></span>Đang xử lý...</>
                ) : 'Xác nhận từ chối'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default function ManagementReviews() {
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeView = searchParams.get('view') === 'reported' ? 'reported' : 'all';
  const isReportedView = activeView === 'reported';
  const statusOptions = isReportedView ? REPORTED_STATUS_OPTIONS : ALL_STATUS_OPTIONS;

  const [reviews, setReviews] = useState([]);
  const [summary, setSummary] = useState(EMPTY_SUMMARY);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchInput, setSearchInput] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [selectedReview, setSelectedReview] = useState(null);
  const [rejectModal, setRejectModal] = useState({ open: false, review: null, reason: '' });

  useEffect(() => {
    let active = true;

    const loadReviews = async () => {
      setLoading(true);
      try {
        const params = {
          page: currentPage,
          limit: 10,
          status: statusFilter,
          search: appliedSearch
        };
        const response = isReportedView
          ? await reviewApi.getReported(params)
          : await reviewApi.getForModeration(params);

        if (!active) return;
        setReviews(response.data || []);
        setSummary(isReportedView ? (response.summary || EMPTY_SUMMARY) : EMPTY_SUMMARY);
        setTotal(response.total || 0);
        setTotalPages(Math.max(response.totalPages || 1, 1));
        setCurrentPage(response.currentPage || currentPage);
        setError('');
      } catch (requestError) {
        if (!active) return;
        setReviews([]);
        setSummary(EMPTY_SUMMARY);
        setTotal(0);
        setTotalPages(1);
        setError(requestError.message || (
          isReportedView
            ? 'Không thể tải danh sách đánh giá bị báo cáo.'
            : 'Không thể tải danh sách đánh giá kiểm duyệt.'
        ));
      } finally {
        if (active) setLoading(false);
      }
    };

    loadReviews();
    return () => {
      active = false;
    };
  }, [appliedSearch, currentPage, isReportedView, reloadKey, statusFilter]);

  const changeView = (view) => {
    setSearchParams(view === 'reported' ? { view: 'reported' } : {});
    setStatusFilter('all');
    setSearchInput('');
    setAppliedSearch('');
    setCurrentPage(1);
    setSelectedReview(null);
    setError('');
  };

  const changeStatus = (status) => {
    setStatusFilter(status);
    setCurrentPage(1);
  };

  const submitSearch = (event) => {
    event.preventDefault();
    setCurrentPage(1);
    setAppliedSearch(searchInput.trim());
  };

  const refreshReviews = () => setReloadKey((value) => value + 1);

  const moderateReview = async (review, status, moderationReason = '') => {
    setActionLoading(true);
    try {
      await reviewApi.moderate(review._id, { status, moderationReason });
      const messages = {
        approved: 'Đã phê duyệt đánh giá thành công.',
        rejected: 'Đã từ chối hiển thị đánh giá.',
        flagged: 'Đã gắn cờ đánh giá để xem xét.'
      };
      if (status === 'flagged') toast.info(messages[status]);
      else toast.success(messages[status]);
      setSelectedReview(null);
      refreshReviews();
      return true;
    } catch (requestError) {
      toast.error(requestError.message || 'Không thể cập nhật trạng thái đánh giá.');
      return false;
    } finally {
      setActionLoading(false);
    }
  };

  const handleApprove = (review) => moderateReview(review, 'approved');
  const handleFlag = (review) => moderateReview(review, 'flagged', 'Cần xem xét lại nội dung');

  const openRejectModal = (review) => {
    setSelectedReview(null);
    setRejectModal({ open: true, review, reason: '' });
  };

  const closeRejectModal = () => setRejectModal({ open: false, review: null, reason: '' });

  const confirmReject = async () => {
    if (!rejectModal.review) return;
    const success = await moderateReview(
      rejectModal.review,
      'rejected',
      rejectModal.reason.trim() || 'Nội dung vi phạm quy chuẩn cộng đồng'
    );
    if (success) closeRejectModal();
  };

  return (
    <section className="management-page-section">
      <div className="management-page-heading">
        <span className="management-page-kicker">Review Moderation</span>
        <h1>Quản Lý Đánh Giá</h1>
        <p>Xem báo cáo vi phạm và kiểm duyệt đánh giá tour trong cùng một quy trình.</p>
      </div>

      <ul className="nav nav-pills gap-2 mb-4" aria-label="Chế độ quản lý đánh giá">
        <li className="nav-item">
          <button
            type="button"
            className={`nav-link ${!isReportedView ? 'active' : ''}`}
            aria-current={!isReportedView ? 'page' : undefined}
            onClick={() => changeView('all')}
          >
            <i className="bi bi-chat-square-quote me-2"></i>Tất cả đánh giá
          </button>
        </li>
        <li className="nav-item">
          <button
            type="button"
            className={`nav-link ${isReportedView ? 'active' : ''}`}
            aria-current={isReportedView ? 'page' : undefined}
            onClick={() => changeView('reported')}
          >
            <i className="bi bi-flag me-2"></i>Đánh giá bị báo cáo
          </button>
        </li>
      </ul>

      {isReportedView && <ReportSummary summary={summary} />}

      {error && (
        <div className="alert alert-danger alert-dismissible fade show" role="alert">
          <i className="bi bi-exclamation-triangle-fill me-2"></i>{error}
          <button type="button" className="btn-close" onClick={() => setError('')} aria-label="Đóng"></button>
        </div>
      )}

      <div className="management-table-card">
        <div className="management-table-toolbar flex-wrap gap-3">
          <div className="btn-group flex-wrap" role="group" aria-label="Lọc trạng thái đánh giá">
            {statusOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`btn btn-sm ${statusFilter === option.value ? 'btn-primary' : 'btn-outline-secondary'}`}
                disabled={loading}
                onClick={() => changeStatus(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
          <form className="management-search-box" onSubmit={submitSearch} style={{ maxWidth: 420 }}>
            <i className="bi bi-search"></i>
            <input
              type="search"
              value={searchInput}
              maxLength={100}
              placeholder={isReportedView ? 'Tìm nội dung hoặc lý do báo cáo...' : 'Tìm nội dung đánh giá...'}
              onChange={(event) => setSearchInput(event.target.value)}
            />
          </form>
        </div>

        <ReviewManagementTable
          reviews={reviews}
          reported={isReportedView}
          loading={loading}
          actionLoading={actionLoading}
          onView={setSelectedReview}
          onApprove={handleApprove}
          onReject={openRejectModal}
          onFlag={handleFlag}
        />

        {!loading && totalPages > 1 && (
          <div className="management-pagination-bar">
            <div>
              Trang <strong>{currentPage}</strong>/{totalPages} · Tổng <strong>{total}</strong>{' '}
              {isReportedView ? 'báo cáo' : 'đánh giá'}
            </div>
            <div className="btn-group btn-group-sm">
              <button
                type="button"
                className="btn btn-outline-secondary"
                disabled={currentPage <= 1 || loading}
                onClick={() => setCurrentPage((page) => page - 1)}
              >
                <i className="bi bi-chevron-left me-1"></i>Trước
              </button>
              <button
                type="button"
                className="btn btn-outline-secondary"
                disabled={currentPage >= totalPages || loading}
                onClick={() => setCurrentPage((page) => page + 1)}
              >
                Sau<i className="bi bi-chevron-right ms-1"></i>
              </button>
            </div>
          </div>
        )}
      </div>

      <ReviewDetailModal
        review={selectedReview}
        actionLoading={actionLoading}
        onClose={() => setSelectedReview(null)}
        onApprove={handleApprove}
        onReject={openRejectModal}
        onFlag={handleFlag}
      />

      <RejectReviewModal
        state={rejectModal}
        loading={actionLoading}
        onReasonChange={(reason) => setRejectModal((current) => ({ ...current, reason }))}
        onClose={closeRejectModal}
        onConfirm={confirmReject}
      />

    </section>
  );
}
