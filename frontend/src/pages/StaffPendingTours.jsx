import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useToast } from '../hooks/useToast';
import { tourApi } from '../services/api';

const formatCurrency = (value) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value || 0);

export default function StaffPendingTours() {
  const toast = useToast();
  const [tours, setTours] = useState([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [rejectingTour, setRejectingTour] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadPendingTours = async () => {
    setIsLoading(true);
    try {
      const response = await tourApi.getManaged({ status: 'pending', limit: 50 });
      setTours(response.data || []);
      setError('');
    } catch (requestError) {
      setError(requestError.message || 'Không thể tải danh sách tour chờ duyệt.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPendingTours();
  }, []);

  const filteredTours = tours.filter((tour) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      tour.title?.toLowerCase().includes(q) ||
      tour.departureLocation?.toLowerCase().includes(q) ||
      tour.destinationLocation?.toLowerCase().includes(q) ||
      tour.location?.toLowerCase().includes(q)
    );
  });

  const handleOpenReject = (tour) => {
    setRejectingTour(tour);
  };

  const handleCloseReject = () => {
    if (isSubmitting) return;
    setRejectingTour(null);
  };

  const handleConfirmReject = async (e) => {
    e.preventDefault();
    if (!rejectingTour || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const response = await tourApi.setStatus(rejectingTour._id, 'rejected');
      toast.success(response.message || 'Đã từ chối duyệt tour thành công.');
      setTours((prevTours) => prevTours.filter((t) => t._id !== rejectingTour._id));
      setRejectingTour(null);
    } catch (requestError) {
      toast.error(requestError.message || 'Không thể từ chối tour.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="management-page-section">
      <div className="management-page-heading">
        <span className="management-page-kicker">Tour Approvals</span>
        <h1>Duyệt Tour Chờ</h1>
        <p>Kiểm tra và phê duyệt các tour do đối tác hoặc khách hàng đề xuất lên hệ thống.</p>
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
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo tên tour, điểm đi hoặc điểm đến..."
              aria-label="Tìm kiếm tour chờ duyệt"
            />
          </div>
          <div className="text-muted small">
            Hiển thị <strong>{filteredTours.length}</strong> / {tours.length} tour chờ duyệt
          </div>
        </div>

        <div className="table-responsive">
          <table className="management-table">
            <thead>
              <tr>
                <th style={{ width: '32%' }}>Thông tin Tour</th>
                <th style={{ width: '25%' }}>Hành trình</th>
                <th style={{ width: '18%' }}>Giá & Chỗ</th>
                <th style={{ width: '15%' }}>Ngày gửi</th>
                <th className="text-end" style={{ width: '10%' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan="5" className="text-center py-5 text-muted">
                    <div className="spinner-border spinner-border-sm text-primary me-2" role="status"></div>
                    Đang tải danh sách tour chờ duyệt...
                  </td>
                </tr>
              ) : filteredTours.length === 0 ? (
                <tr>
                  <td colSpan="5">
                    <div className="management-empty-state">
                      <div className="management-empty-icon">
                        <i className="bi bi-inbox fs-2"></i>
                      </div>
                      <h6 className="fw-bold text-dark mb-1">Không có tour nào đang chờ duyệt</h6>
                      <p className="small text-muted mb-0">Tất cả đề xuất tour đã được xử lý hoặc chưa có yêu cầu mới.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredTours.map((tour) => (
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
                        <span className="text-dark fw-medium">{tour.departureLocation || '—'}</span>
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
                      <div className="small text-muted">
                        <i className="bi bi-calendar3 me-1"></i>
                        {new Date(tour.createdAt).toLocaleDateString('vi-VN')}
                      </div>
                    </td>
                    <td className="text-end">
                      <div className="management-actions">
                        <Link
                          to={`/management/tours/${tour._id}`}
                          className="management-action-btn btn-view"
                          title="Rà soát chi tiết & phê duyệt"
                          aria-label={`Rà soát ${tour.title}`}
                        >
                          <i className="bi bi-clipboard-check"></i>
                        </Link>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-danger border-0 px-2"
                          title="Từ chối duyệt tour"
                          onClick={() => handleOpenReject(tour)}
                        >
                          <i className="bi bi-x-lg fs-5"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {rejectingTour && (
        <>
          <div className="modal fade show d-block" tabIndex="-1" role="dialog" aria-modal="true">
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content border-0 shadow">
                <form onSubmit={handleConfirmReject}>
                  <div className="modal-header">
                    <h2 className="modal-title h5 fw-bold">
                      Từ chối duyệt tour
                    </h2>
                    <button
                      type="button"
                      className="btn-close"
                      onClick={handleCloseReject}
                      disabled={isSubmitting}
                      aria-label="Đóng"
                    ></button>
                  </div>
                  <div className="modal-body">
                    <p className="mb-2">
                      Bạn có chắc muốn từ chối duyệt tour <strong>{rejectingTour.title}</strong>?
                    </p>
                    <p className="text-muted small mb-0">
                      Tour sau khi bị từ chối sẽ không được hiển thị công khai trên hệ thống.
                    </p>
                  </div>
                  <div className="modal-footer">
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={handleCloseReject}
                      disabled={isSubmitting}
                    >
                      Hủy
                    </button>
                    <button
                      type="submit"
                      className="btn btn-danger"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? 'Đang xử lý...' : 'Xác nhận từ chối'}
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
