import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useToast } from '../hooks/useToast';
import { tourApi } from '../services/api';

const formatCurrency = (value) => new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0
}).format(value || 0);

const formatDateTime = (value) => (
  value ? new Date(value).toLocaleString('vi-VN') : '—'
);

function StaffTours() {
  const toast = useToast();
  const [tours, setTours] = useState([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [pendingTour, setPendingTour] = useState(null);
  const [reason, setReason] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const loadTours = async (searchTerm = search, selectedStatus = status, page = currentPage) => {
    setIsLoading(true);
    try {
      const response = await tourApi.getManaged({
        search: searchTerm,
        status: selectedStatus,
        page,
        limit: 10
      });
      setTours(response.data || []);
      setCurrentPage(response.currentPage || 1);
      setTotalPages(response.totalPages || 1);
      setError('');
    } catch (requestError) {
      setError(requestError.message || 'Không thể tải danh sách tour.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadTours(search, status, currentPage);
    }, 300);
    return () => clearTimeout(timer);
  }, [search, status, currentPage]);

  const openStatusDialog = (tour) => {
    setPendingTour(tour);
    setReason('');
  };

  const closeStatusDialog = () => {
    if (isSaving) return;
    setPendingTour(null);
    setReason('');
  };

  const handleStatusChange = async (event) => {
    event.preventDefault();
    if (!pendingTour || isSaving) return;

    const isSuspending = pendingTour.status !== 'suspended';
    const cleanReason = reason.trim();
    if (isSuspending && cleanReason.length < 5) {
      toast.warning('Vui lòng nhập lý do tạm ngưng có ít nhất 5 ký tự.');
      return;
    }

    setIsSaving(true);
    try {
      const response = await tourApi.setStatus(
        pendingTour._id,
        isSuspending ? 'suspended' : 'active',
        isSuspending ? cleanReason : ''
      );
      toast.success(response.message);
      setPendingTour(null);
      setReason('');
      await loadTours(search, status, currentPage);
    } catch (requestError) {
      toast.error(requestError.message || 'Không thể cập nhật trạng thái tour.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleFilterChange = (event) => {
    setStatus(event.target.value);
    setCurrentPage(1);
  };

  return (
    <section className="management-page-section">
      <div className="management-page-heading staff-tour-heading">
        <span className="management-page-kicker">Tour Operations</span>
        <h1>Quản lý tour</h1>
        <p>Theo dõi trạng thái và tạm ngưng những tour không còn đủ điều kiện hoạt động.</p>
      </div>

      {error && (
        <div className="alert alert-danger alert-dismissible fade show" role="alert">
          {error}
          <button type="button" className="btn-close" onClick={() => setError('')} aria-label="Đóng"></button>
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
              aria-label="Tìm kiếm tour"
            />
          </div>
          <div className="d-flex align-items-center gap-2">
            <label htmlFor="tour-status-filter" className="small text-muted fw-semibold mb-0 text-nowrap">
              <i className="bi bi-funnel me-1"></i>Trạng thái:
            </label>
            <select
              id="tour-status-filter"
              className="form-select form-select-sm"
              style={{ width: 'auto', minWidth: '160px' }}
              value={status}
              onChange={handleFilterChange}
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="active">Đang hoạt động</option>
              <option value="needs_revision">Cần chỉnh sửa</option>
              <option value="suspended">Tạm ngưng</option>
            </select>
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
              {isLoading ? (
                <tr>
                  <td colSpan="5" className="text-center py-5 text-muted">
                    <div className="spinner-border spinner-border-sm text-primary me-2" role="status"></div>
                    Đang tải danh sách tour...
                  </td>
                </tr>
              ) : tours.length === 0 ? (
                <tr>
                  <td colSpan="5">
                    <div className="management-empty-state">
                      <div className="management-empty-icon">
                        <i className="bi bi-map fs-2"></i>
                      </div>
                      <h6 className="fw-bold text-dark mb-1">Không tìm thấy tour phù hợp</h6>
                      <p className="small text-muted mb-0">Thử tìm kiếm với từ khóa khác hoặc điều chỉnh bộ lọc trạng thái.</p>
                    </div>
                  </td>
                </tr>
              ) : tours.map((tour) => {
                const isSuspended = tour.status === 'suspended';
                const isNeedsRevision = tour.status === 'needs_revision';
                const statusLabel = isSuspended ? 'Tạm ngưng' : isNeedsRevision ? 'Cần chỉnh sửa' : 'Đang hoạt động';
                const badgeVariant = isSuspended ? 'badge-danger' : isNeedsRevision ? 'badge-warning' : 'badge-success';

                return (
                  <tr key={tour._id}>
                    <td>
                      <div className="d-flex align-items-center gap-3">
                        {tour.images?.[0] ? (
                          <img
                            src={tour.images[0]}
                            alt={tour.title}
                            className="management-table-thumb"
                          />
                        ) : (
                          <div className="management-table-thumb-empty">
                            <i className="bi bi-image"></i>
                          </div>
                        )}
                        <div>
                          <div className="fw-bold text-dark">{tour.title}</div>
                          <div className="small text-muted">
                            <i className="bi bi-clock me-1"></i>
                            {tour.duration}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="d-flex align-items-center gap-2 small">
                        <span className="text-dark fw-medium">{tour.departureLocation || 'Chưa cập nhật'}</span>
                        <i className="bi bi-arrow-right text-muted"></i>
                        <span className="text-primary fw-medium">{tour.destinationLocation || tour.location}</span>
                      </div>
                    </td>
                    <td>
                      <div className="fw-bold text-dark">{formatCurrency(tour.price)}</div>
                      <div className="small text-muted">
                        <i className="bi bi-people me-1"></i>
                        Còn {tour.availableSeats || 0} chỗ
                      </div>
                    </td>
                    <td>
                      <span className={`management-badge ${badgeVariant}`}>
                        <span className="management-badge-dot"></span>
                        {statusLabel}
                      </span>
                      {isSuspended && tour.suspensionReason && (
                        <div className="small text-muted mt-1 text-truncate" style={{ maxWidth: '200px' }} title={tour.suspensionReason}>
                          <i className="bi bi-info-circle me-1"></i>{tour.suspensionReason}
                        </div>
                      )}
                    </td>
                    <td className="text-end">
                      <div className="management-actions">
                        {!isSuspended && (
                          <Link
                            className="management-action-btn btn-view"
                            to={isNeedsRevision ? `/management/tours/${tour._id}` : `/tours/${tour._id}`}
                            title="Xem chi tiết tour"
                            aria-label={`Xem ${tour.title}`}
                          >
                            <i className="bi bi-eye"></i>
                          </Link>
                        )}
                        <button
                          type="button"
                          className={`btn btn-sm ${isSuspended ? 'btn-outline-success' : 'btn-outline-danger'} d-inline-flex align-items-center gap-1 rounded-3 py-1 px-2 fw-semibold`}
                          style={{ fontSize: '0.78rem' }}
                          onClick={() => openStatusDialog(tour)}
                          title={isSuspended ? 'Kích hoạt lại tour' : 'Tạm ngưng tour'}
                        >
                          <i className={`bi ${isSuspended ? 'bi-play-circle' : 'bi-pause-circle'}`}></i>
                          <span>{isSuspended ? 'Kích hoạt' : 'Tạm ngưng'}</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {!isLoading && totalPages > 1 && (
          <div className="management-pagination-bar">
            <div>
              Trang <strong>{currentPage}</strong> trên <strong>{totalPages}</strong>
            </div>
            <nav aria-label="Phân trang">
              <ul className="pagination pagination-sm mb-0">
                <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                  <button className="page-link" onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}>
                    <i className="bi bi-chevron-left me-1"></i>Trước
                  </button>
                </li>
                {[...Array(totalPages)].map((_, idx) => (
                  <li key={idx} className={`page-item ${currentPage === idx + 1 ? 'active' : ''}`}>
                    <button className="page-link" onClick={() => setCurrentPage(idx + 1)}>
                      {idx + 1}
                    </button>
                  </li>
                ))}
                <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                  <button className="page-link" onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}>
                    Sau<i className="bi bi-chevron-right ms-1"></i>
                  </button>
                </li>
              </ul>
            </nav>
          </div>
        )}
      </div>

      {pendingTour && (
        <>
          <div className="modal fade show d-block" tabIndex="-1" role="dialog" aria-modal="true">
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content border-0 shadow">
                <form onSubmit={handleStatusChange}>
                  <div className="modal-header">
                    <h2 className="modal-title h5 fw-bold">
                      {pendingTour.status === 'suspended' ? 'Kích hoạt lại tour' : 'Tạm ngưng tour'}
                    </h2>
                    <button type="button" className="btn-close" onClick={closeStatusDialog} disabled={isSaving} aria-label="Đóng"></button>
                  </div>
                  <div className="modal-body">
                    <p>
                      Tour: <strong>{pendingTour.title}</strong>
                    </p>
                    {pendingTour.status === 'suspended' ? (
                      <p className="text-muted mb-0">
                        Tour sẽ xuất hiện trở lại trong danh sách và khách hàng có thể truy cập chi tiết tour.
                      </p>
                    ) : (
                      <>
                        <p className="text-muted small">
                          Tour sẽ bị ẩn khỏi danh sách, tìm kiếm, chi tiết và danh sách yêu thích của khách hàng.
                        </p>
                        <label className="form-label fw-semibold" htmlFor="tour-suspension-reason">Lý do tạm ngưng</label>
                        <textarea
                          id="tour-suspension-reason"
                          className="form-control"
                          rows="4"
                          maxLength="500"
                          value={reason}
                          onChange={(event) => setReason(event.target.value)}
                          placeholder="Nhập lý do để người quản lý khác có thể theo dõi..."
                          required
                          autoFocus
                        ></textarea>
                        <div className="form-text text-end">{reason.length}/500</div>
                      </>
                    )}
                  </div>
                  <div className="modal-footer">
                    <button type="button" className="btn btn-outline-secondary" onClick={closeStatusDialog} disabled={isSaving}>Hủy</button>
                    <button
                      type="submit"
                      className={`btn ${pendingTour.status === 'suspended' ? 'btn-success' : 'btn-danger'}`}
                      disabled={isSaving}
                    >
                      {isSaving ? 'Đang xử lý...' : (pendingTour.status === 'suspended' ? 'Kích hoạt lại' : 'Xác nhận tạm ngưng')}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show"></div>
        </>
      )}
    </section>
  );
}

export default StaffTours;
