import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { tourSubmissionApi } from '../services/api';
import CustomSelect from '../components/CustomSelect';
import ManagementPagination from '../components/management/ManagementPagination';
import TourSubmissionFormModal from './TourSubmissionFormModal';
import TourSubmissionReviewModal from './TourSubmissionReviewModal';

const formatCurrency = (value) => new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0
}).format(value || 0);

const formatDate = (value) => (value
  ? new Date(value).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })
  : '—');

const getStatusMeta = (status) => {
  switch (status) {
    case 'pending':
      return { label: 'Chờ duyệt', variant: 'badge-warning' };
    case 'needs_revision':
      return { label: 'Cần chỉnh sửa', variant: 'badge-info' };
    case 'approved':
      return { label: 'Đã duyệt', variant: 'badge-success' };
    case 'rejected':
      return { label: 'Bị từ chối', variant: 'badge-danger' };
    default:
      return { label: status, variant: 'badge-secondary' };
  }
};

// START UC-130 View Tour Submission List
/**
 * Trang danh sách yêu cầu duyệt tour dùng chung cho provider và staff.
 *
 * Phức tạp:
 *  - Một yêu cầu chỉ trỏ tới tour (`submission.tourId` đã populate), nên mọi cột nội
 *    dung (tên, ảnh, giá, hành trình) đọc từ tour; tour bị xóa thì hiện cảnh báo thay
 *    vì làm vỡ bảng.
 *  - Phạm vi dữ liệu do server quyết định theo token (provider: của mình, staff: tất cả);
 *    UI chỉ khác cột "Nhà cung cấp" và bộ thao tác.
 *  - Mở từ nút "Gửi duyệt" ở trang quản lý tour (`?tour=<id>`) sẽ bật form gửi duyệt
 *    với tour đó được chọn sẵn.
 *  - Ô tìm kiếm debounce 300ms; sau mỗi thao tác đều tải lại đúng trang hiện tại.
 */
export default function TourSubmissions() {
  const { user } = useAuth();
  const toast = useToast();
  const isStaff = user?.role === 'staff';
  const [searchParams, setSearchParams] = useSearchParams();
  const tourFromQuery = searchParams.get('tour') || '';

  const [submissions, setSubmissions] = useState([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [listError, setListError] = useState('');

  const [formState, setFormState] = useState({
    open: Boolean(tourFromQuery),
    mode: 'create',
    submission: null,
    preselectedTourId: tourFromQuery
  });
  const [reviewTarget, setReviewTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const statusOptions = useMemo(() => ([
    { value: 'all', label: 'Tất cả trạng thái' },
    { value: 'pending', label: 'Chờ duyệt' },
    { value: 'needs_revision', label: 'Cần chỉnh sửa' },
    { value: 'approved', label: 'Đã duyệt' },
    { value: 'rejected', label: 'Bị từ chối' }
  ]), []);

  const loadSubmissions = async (searchTerm = search, selectedStatus = status, page = currentPage) => {
    setIsLoading(true);
    try {
      const response = await tourSubmissionApi.list({
        search: searchTerm,
        status: selectedStatus,
        page,
        limit: 10
      });
      setSubmissions(response.data || []);
      setCurrentPage(response.currentPage || 1);
      setTotalPages(response.totalPages || 1);
      setListError('');
    } catch (requestError) {
      setListError(requestError.message || 'Không thể tải danh sách yêu cầu duyệt tour.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadSubmissions(search, status, currentPage);
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, status, currentPage]);

  const openCreateModal = () => setFormState({
    open: true,
    mode: 'create',
    submission: null,
    preselectedTourId: ''
  });

  const openEditModal = (submission) => setFormState({
    open: true,
    mode: 'edit',
    submission,
    preselectedTourId: ''
  });

  const closeFormModal = () => {
    setFormState({ open: false, mode: 'create', submission: null, preselectedTourId: '' });
    if (searchParams.get('tour')) {
      setSearchParams({}, { replace: true });
    }
  };

  const handleSaved = async () => {
    setCurrentPage(1);
    await loadSubmissions(search, status, 1);
  };

  const handleReviewed = async () => {
    await loadSubmissions(search, status, currentPage);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const response = await tourSubmissionApi.remove(deleteTarget._id);
      toast.success(response.message || 'Đã thu hồi yêu cầu duyệt tour.');
      setDeleteTarget(null);
      await loadSubmissions(search, status, currentPage);
    } catch (requestError) {
      toast.error(requestError.message || 'Không thể xóa yêu cầu duyệt tour.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handlePageChange = (page) => {
    if (page < 1 || page > totalPages || page === currentPage) return;
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const columnCount = isStaff ? 6 : 5;

  return (
    <section className="management-page-section">
      <div className="management-page-heading d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
        <div>
          <h1>{isStaff ? 'Duyệt yêu cầu duyệt tour' : 'Yêu cầu duyệt tour'}</h1>
          <p>
            {isStaff
              ? 'Kiểm duyệt yêu cầu mở bán tour do nhà cung cấp gửi lên.'
              : 'Gửi yêu cầu duyệt cho tour nháp và theo dõi phản hồi từ nhân viên.'}
          </p>
        </div>

        {!isStaff && (
          <button type="button" className="btn btn-primary d-inline-flex align-items-center gap-2" onClick={openCreateModal}>
            <i className="bi bi-send-plus"></i>
            <span>Gửi duyệt tour</span>
          </button>
        )}
      </div>

      {listError && (
        <div className="alert alert-danger alert-dismissible fade show" role="alert">
          <i className="bi bi-exclamation-triangle me-2"></i>
          {listError}
          <button type="button" className="btn-close" onClick={() => setListError('')} aria-label="Đóng"></button>
        </div>
      )}

      <div className="management-table-card">
        <div className="management-table-toolbar">
          <div className="management-search-box">
            <i className="bi bi-search"></i>
            <input
              type="search"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setCurrentPage(1);
              }}
              placeholder="Tìm theo tên tour, điểm đi hoặc điểm đến..."
              aria-label="Tìm kiếm yêu cầu duyệt tour"
            />
          </div>

          <div className="d-flex align-items-center gap-2">
            <label htmlFor="submission-status-filter" className="small text-muted fw-semibold mb-0 text-nowrap">
              <i className="bi bi-funnel me-1"></i>Trạng thái:
            </label>
            <CustomSelect
              id="submission-status-filter"
              style={{ width: '190px' }}
              triggerStyle={{ height: '36px', fontSize: '0.86rem' }}
              value={status}
              onChange={(event) => {
                setStatus(event.target.value);
                setCurrentPage(1);
              }}
              options={statusOptions}
            />
          </div>
        </div>

        <div className="table-responsive">
          <table className="management-table">
            <thead>
              <tr>
                <th style={{ width: '28%' }}>Tour gửi duyệt</th>
                {isStaff && <th style={{ width: '16%' }}>Nhà cung cấp</th>}
                <th style={{ width: '18%' }}>Hành trình</th>
                <th style={{ width: '14%' }}>Giá và chỗ</th>
                <th style={{ width: '16%' }}>Trạng thái</th>
                <th className="text-end" style={{ width: '10%' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={columnCount} className="text-center py-5 text-muted">
                    <div className="spinner-border spinner-border-sm text-primary me-2" role="status"></div>
                    Đang tải danh sách yêu cầu...
                  </td>
                </tr>
              ) : submissions.length === 0 ? (
                <tr>
                  <td colSpan={columnCount}>
                    <div className="management-empty-state">
                      <div className="management-empty-icon">
                        <i className="bi bi-inbox fs-2"></i>
                      </div>
                      <h6 className="fw-bold text-dark mb-1">Chưa có yêu cầu duyệt nào</h6>
                      <p className="small text-muted mb-0">
                        {isStaff
                          ? 'Yêu cầu mới từ nhà cung cấp sẽ xuất hiện tại đây.'
                          : (
                            <>
                              Hãy <Link to="/management/my-tours?action=create">tạo tour nháp</Link> rồi gửi duyệt để mở bán.
                            </>
                          )}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                submissions.map((submission) => {
                  const badge = getStatusMeta(submission.status);
                  const provider = submission.providerId;
                  const tour = submission.tourId && typeof submission.tourId === 'object' ? submission.tourId : null;

                  return (
                    <tr key={submission._id}>
                      <td>
                        <div className="d-flex align-items-center gap-3">
                          {tour?.images?.[0] ? (
                            <img src={tour.images[0]} alt={tour.title} className="management-table-thumb" />
                          ) : (
                            <div className="management-table-thumb-empty">
                              <i className="bi bi-image"></i>
                            </div>
                          )}
                          <div>
                            <div className="fw-bold text-dark">{tour?.title || 'Tour đã bị xóa'}</div>
                            <div className="small text-muted">
                              <i className="bi bi-clock me-1"></i>
                              {tour?.duration || '—'}
                              <span className="mx-1">·</span>
                              {formatDate(submission.createdAt)}
                            </div>
                          </div>
                        </div>
                      </td>

                      {isStaff && (
                        <td>
                          <div className="fw-semibold text-dark small">{provider?.username || '—'}</div>
                          <div className="small text-muted">{provider?.email || ''}</div>
                        </td>
                      )}

                      <td>
                        <div className="d-flex align-items-center gap-2 small">
                          <span className="text-dark fw-medium">{tour?.departureLocation || '—'}</span>
                          <i className="bi bi-arrow-right text-muted"></i>
                          <span className="text-primary fw-medium">{tour?.destinationLocation || '—'}</span>
                        </div>
                      </td>

                      <td>
                        <div className="fw-bold text-dark">{formatCurrency(tour?.price)}</div>
                        <div className="small text-muted">
                          <i className="bi bi-people me-1"></i>
                          {tour?.availableSeats || 0} chỗ
                        </div>
                      </td>

                      <td>
                        <span className={`management-badge ${badge.variant}`}>
                          <span className="management-badge-dot"></span>
                          {badge.label}
                        </span>
                        {['needs_revision', 'rejected'].includes(submission.status) && submission.reviewNote && (
                          <div
                            className="small text-muted mt-1 text-truncate"
                            style={{ maxWidth: '220px' }}
                            title={submission.reviewNote}
                          >
                            <i className="bi bi-info-circle me-1"></i>
                            {submission.reviewNote}
                          </div>
                        )}
                      </td>

                      <td className="text-end">
                        <div className="management-actions justify-content-end">
                          {isStaff ? (
                            <button
                              type="button"
                              className={`management-action-btn ${submission.status === 'pending' ? 'btn-edit' : 'btn-view'}`}
                              title={submission.status === 'pending' ? 'Kiểm duyệt yêu cầu' : 'Xem lại yêu cầu'}
                              aria-label={`Kiểm duyệt ${tour?.title || 'yêu cầu'}`}
                              onClick={() => setReviewTarget(submission)}
                            >
                              <i className={`bi ${submission.status === 'pending' ? 'bi-clipboard-check' : 'bi-eye'}`}></i>
                            </button>
                          ) : (
                            <>
                              {tour && (
                                <Link
                                  className="management-action-btn btn-view"
                                  to={`/management/my-tours/${tour._id}/details`}
                                  title="Xem tour"
                                  aria-label={`Xem tour ${tour.title}`}
                                >
                                  <i className="bi bi-box-arrow-up-right"></i>
                                </Link>
                              )}
                              {/* START UC-129 Update Tour Submission */}
                              <button
                                type="button"
                                className="management-action-btn btn-edit"
                                title={submission.status === 'approved' ? 'Đã duyệt, không thể sửa' : 'Cập nhật yêu cầu'}
                                aria-label={`Cập nhật yêu cầu ${tour?.title || ''}`}
                                disabled={submission.status === 'approved'}
                                onClick={() => openEditModal(submission)}
                              >
                                <i className="bi bi-pencil-square"></i>
                              </button>
                              {/* END UC-129 Update Tour Submission */}
                              {/* START UC-131 Delete Tour Submission */}
                              <button
                                type="button"
                                className="management-action-btn text-danger border-0 bg-transparent px-2"
                                title={submission.status === 'approved' ? 'Đã duyệt, không thể thu hồi' : 'Thu hồi yêu cầu duyệt'}
                                aria-label={`Xóa yêu cầu ${tour?.title || ''}`}
                                disabled={submission.status === 'approved'}
                                onClick={() => setDeleteTarget(submission)}
                              >
                                <i className="bi bi-trash3 fs-5"></i>
                              </button>
                              {/* END UC-131 Delete Tour Submission */}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <ManagementPagination
          currentPage={currentPage}
          totalPages={totalPages}
          itemLabel="yêu cầu"
          isLoading={isLoading}
          onPageChange={handlePageChange}
        />
      </div>

      <TourSubmissionFormModal
        open={formState.open}
        mode={formState.mode}
        submission={formState.submission}
        preselectedTourId={formState.preselectedTourId}
        onClose={closeFormModal}
        onSaved={handleSaved}
      />

      <TourSubmissionReviewModal
        open={Boolean(reviewTarget)}
        submission={reviewTarget}
        onClose={() => setReviewTarget(null)}
        onReviewed={handleReviewed}
      />

      {deleteTarget && (
        <div className="modal fade show d-block" tabIndex="-1" role="dialog" aria-modal="true" style={{ backgroundColor: 'rgba(15, 23, 42, 0.6)', zIndex: 1050 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg rounded-4">
              <div className="modal-header bg-light">
                <h5 className="modal-title fw-bold text-dark d-flex align-items-center gap-2">
                  <i className="bi bi-trash3 text-danger"></i>
                  <span>Thu hồi yêu cầu duyệt tour</span>
                </h5>
                <button type="button" className="btn-close" onClick={() => setDeleteTarget(null)} disabled={isDeleting} aria-label="Đóng"></button>
              </div>
              <div className="modal-body">
                <p className="mb-2">
                  Bạn có chắc muốn thu hồi yêu cầu duyệt của tour{' '}
                  <strong>{deleteTarget.tourId?.title || 'này'}</strong>?
                </p>
                <p className="small text-muted mb-0">
                  Tour sẽ quay về trạng thái nháp và nhân viên sẽ không kiểm duyệt yêu cầu này nữa.
                </p>
              </div>
              <div className="modal-footer bg-light">
                <button type="button" className="btn btn-outline-secondary rounded-pill px-4" onClick={() => setDeleteTarget(null)} disabled={isDeleting}>
                  Hủy
                </button>
                <button type="button" className="btn btn-danger rounded-pill px-4" onClick={handleDelete} disabled={isDeleting}>
                  {isDeleting ? 'Đang thu hồi...' : 'Thu hồi yêu cầu'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
// END UC-130 View Tour Submission List
