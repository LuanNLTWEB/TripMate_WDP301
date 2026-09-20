import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { tourApi } from '../services/api';

const formatCurrency = (value) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value || 0);

export default function StaffPendingTours() {
  const [tours, setTours] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

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

  return (
    <section className="management-page-section">
      <div className="management-page-heading staff-tour-heading">
        <span className="management-page-kicker">Tour Approvals</span>
        <h1>Duyệt Tour Chờ</h1>
        <p>Kiểm tra và phê duyệt các tour do khách hàng đề xuất lên hệ thống.</p>
      </div>

      {error && (
        <div className="alert alert-danger alert-dismissible fade show" role="alert">
          {error}
          <button type="button" className="btn-close" onClick={() => setError('')} aria-label="Đóng"></button>
        </div>
      )}

      <div className="card border-0 shadow-sm staff-tour-card">
        <div className="table-responsive">
          <table className="table align-middle table-hover mb-0 staff-tour-table">
            <colgroup>
              <col className="staff-tour-col-main" />
              <col style={{ width: '20%' }} />
              <col style={{ width: '15%' }} />
              <col style={{ width: '20%' }} />
              <col className="staff-tour-col-actions" />
            </colgroup>
            <thead className="table-light text-muted small text-uppercase">
              <tr>
                <th className="px-4 py-3">Thông tin Tour</th>
                <th className="py-3">Hành trình</th>
                <th className="py-3">Giá & Chỗ</th>
                <th className="py-3">Ngày gửi</th>
                <th className="px-4 py-3 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan="5" className="text-center py-5">
                    <div className="spinner-border text-primary" role="status">
                      <span className="visually-hidden">Đang tải...</span>
                    </div>
                  </td>
                </tr>
              ) : tours.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center text-muted py-5">
                    <i className="bi bi-inbox fs-2 d-block mb-2 text-muted"></i>
                    Không có tour nào đang chờ duyệt.
                  </td>
                </tr>
              ) : tours.map((tour) => (
                <tr key={tour._id}>
                  <td className="px-4 py-3">
                    <div className="d-flex align-items-center gap-3">
                      {tour.images?.[0] ? (
                        <img
                          src={tour.images[0]}
                          alt={tour.title}
                          className="rounded shadow-sm"
                          style={{ width: '60px', height: '60px', objectFit: 'cover' }}
                        />
                      ) : (
                        <div className="rounded bg-light border d-flex align-items-center justify-content-center text-muted" style={{ width: '60px', height: '60px' }}>
                          <i className="bi bi-image fs-5"></i>
                        </div>
                      )}
                      <div>
                        <div className="fw-bold text-dark mb-1">{tour.title}</div>
                        <div className="text-muted small">
                          <i className="bi bi-clock me-1"></i>
                          {tour.duration}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3">
                    <div className="staff-tour-route">
                      <span>{tour.departureLocation || '—'}</span>
                      <i className="bi bi-arrow-right"></i>
                      <span>{tour.destinationLocation || tour.location}</span>
                    </div>
                  </td>
                  <td className="py-3">
                    <div className="staff-tour-price">{formatCurrency(tour.price)}</div>
                    <div className="staff-tour-seats">
                      <i className="bi bi-people"></i>
                      {tour.availableSeats || 0} chỗ
                    </div>
                  </td>
                  <td className="py-3">
                    <div className="small text-muted">
                      {new Date(tour.createdAt).toLocaleDateString('vi-VN')}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="d-flex justify-content-center align-items-center gap-2">
                      <Link
                        to={`/management/tours/${tour._id}`}
                        className="staff-tour-view-button"
                        title="Rà soát tour submission"
                        aria-label={`Rà soát ${tour.title}`}
                      >
                        <i className="bi bi-clipboard-check"></i>
                      </Link>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-success border-0 px-2"
                        title="Duyệt"
                      >
                        <i className="bi bi-check-lg fs-5"></i>
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-danger border-0 px-2"
                        title="Từ chối"
                      >
                        <i className="bi bi-x-lg fs-5"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
