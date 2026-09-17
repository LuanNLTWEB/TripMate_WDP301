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

      <div className="card border-0 shadow-sm staff-tour-card">
        <div className="card-body p-0">
          <div className="staff-tour-toolbar">
            <div className="staff-tour-search">
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
            <div className="staff-tour-status-filter">
              <label htmlFor="tour-status-filter">
                <i className="bi bi-funnel"></i>
                Trạng thái
              </label>
              <select
                id="tour-status-filter"
                className="form-select"
                value={status}
                onChange={handleFilterChange}
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="active">Đang hoạt động</option>
                <option value="suspended">Tạm ngưng</option>
              </select>
            </div>
          </div>

          <div className="table-responsive">
            <table className="table align-middle table-hover mb-0 staff-tour-table">
              <colgroup>
                <col className="staff-tour-col-main" />
                <col className="staff-tour-col-route" />
                <col className="staff-tour-col-price" />
                <col className="staff-tour-col-status" />
                <col className="staff-tour-col-actions" />
              </colgroup>
              <thead className="table-light text-muted small text-uppercase">
                <tr>
                  <th className="px-4 py-3">Tour</th>
                  <th className="py-3">Hành trình</th>
                  <th className="py-3">Giá và chỗ</th>
                  <th className="py-3">Trạng thái</th>
                  <th className="px-4 py-3 text-end">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan="5" className="text-center py-5">
                      <span className="spinner-border spinner-border-sm text-primary me-2"></span>
                      Đang tải danh sách tour...
                    </td>
                  </tr>
                ) : tours.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="text-center text-muted py-5">
                      <i className="bi bi-map fs-2 d-block mb-2"></i>
                      Không tìm thấy tour phù hợp.
                    </td>
                  </tr>
                ) : tours.map((tour) => {
                  const isSuspended = tour.status === 'suspended';
                  return (
                    <tr key={tour._id}>
                      <td className="px-4 py-3">
                        <div className="staff-tour-main-cell">
                          {tour.images?.[0] ? (
                            <img
                              src={tour.images[0]}
                              alt={tour.title}
                              className="staff-tour-thumbnail"
                            />
                          ) : (
                            <span className="staff-tour-thumbnail staff-tour-thumbnail-empty">
                              <i className="bi bi-image"></i>
                            </span>
                          )}
                          <div className="staff-tour-copy">
                            <div className="staff-tour-title">{tour.title}</div>
                            <div className="staff-tour-duration">
                              <i className="bi bi-clock"></i>
                              {tour.duration}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3">
                        <div className="staff-tour-route">
                          <span>{tour.departureLocation || 'Chưa cập nhật'}</span>
                          <i className="bi bi-arrow-right"></i>
                          <span>{tour.destinationLocation || tour.location}</span>
                        </div>
                      </td>
                      <td className="py-3">
                        <div className="staff-tour-price">{formatCurrency(tour.price)}</div>
                        <div className="staff-tour-seats">
                          <i className="bi bi-people"></i>
                          Còn {tour.availableSeats || 0} chỗ
                        </div>
                      </td>
                      <td className="py-3">
                        <span className={`staff-tour-status ${isSuspended ? 'is-suspended' : 'is-active'}`}>
                          <span></span>
                          {isSuspended ? 'Tạm ngưng' : 'Đang hoạt động'}
                        </span>
                        {isSuspended && (
                          <div className="small text-muted mt-2">
                            <div className="text-truncate" style={{ maxWidth: '240px' }} title={tour.suspensionReason}>
                              {tour.suspensionReason}
                            </div>
                            <div>{formatDateTime(tour.suspendedAt)}</div>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-end">
                        <div className="staff-tour-actions">
                          {!isSuspended && (
                            <Link className="staff-tour-view-button" to={`/tours/${tour._id}`} title="Xem tour" aria-label={`Xem ${tour.title}`}>
                              <i className="bi bi-eye"></i>
                            </Link>
                          )}
                          <button
                            type="button"
                            className={`staff-tour-status-button ${isSuspended ? 'is-activate' : 'is-suspend'}`}
                            onClick={() => openStatusDialog(tour)}
                          >
                            <i className={`bi ${isSuspended ? 'bi-play-circle' : 'bi-pause-circle'} me-1`}></i>
                            {isSuspended ? 'Kích hoạt' : 'Tạm ngưng'}
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
            <div className="staff-tour-pagination">
              <span className="small text-muted">Trang {currentPage} trên {totalPages}</span>
              <div className="btn-group btn-group-sm">
                <button
                  type="button"
                  className="btn btn-outline-primary"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((page) => page - 1)}
                >
                  Trước
                </button>
                <button
                  type="button"
                  className="btn btn-outline-primary"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((page) => page + 1)}
                >
                  Sau
                </button>
              </div>
            </div>
          )}
        </div>
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
