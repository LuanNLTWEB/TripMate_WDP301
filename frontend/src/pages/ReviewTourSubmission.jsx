import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { tourApi } from '../services/api';

const formatCurrency = (value) => new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0
}).format(value || 0);

const formatDate = (value) => value ? new Date(value).toLocaleString('vi-VN') : '—';

function DetailItem({ label, value, mono }) {
  const hasValue = value !== null && value !== undefined && value !== '';
  return (
    <div>
      <div className="small text-muted text-uppercase fw-semibold mb-1">{label}</div>
      <div className={mono ? 'font-monospace small' : 'fw-medium text-dark'}>
        {hasValue ? value : '—'}
      </div>
    </div>
  );
}

function ReviewTourSubmission() {
  const { id } = useParams();
  const [tour, setTour] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;

    tourApi.getManagedById(id)
      .then((response) => {
        if (isMounted) {
          setTour(response.data);
          setError('');
        }
      })
      .catch((requestError) => {
        if (isMounted) setError(requestError.message || 'Không thể tải thông tin tour.');
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [id]);

  if (isLoading) {
    return (
      <section className="management-page-section">
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Đang tải...</span>
          </div>
        </div>
      </section>
    );
  }

  if (!tour) {
    return (
      <section className="management-page-section">
        <div className="alert alert-danger">{error || 'Không tìm thấy tour.'}</div>
        <Link to="/management/tours" className="btn btn-outline-primary">
          <i className="bi bi-arrow-left me-2"></i>Quay lại danh sách tour
        </Link>
      </section>
    );
  }

  const isSuspended = tour.status === 'suspended';
  const categoryName = tour.categoryId && typeof tour.categoryId === 'object'
    ? (tour.categoryId.name || '—')
    : (tour.categoryId || '—');
  const suspendedByName = tour.suspendedBy && typeof tour.suspendedBy === 'object'
    ? tour.suspendedBy.username
    : '—';

  return (
    <section className="management-page-section">
      <div className="management-page-heading">
        <span className="management-page-kicker">Tour Operations</span>
        <h1>Rà soát Tour Submission</h1>
        <p>Xem và kiểm tra chi tiết tour do Provider gửi lên trước khi xử lý ở bước tiếp theo.</p>
      </div>

      {error && (
        <div className="alert alert-danger alert-dismissible fade show" role="alert">
          {error}
          <button type="button" className="btn-close" onClick={() => setError('')} aria-label="Đóng"></button>
        </div>
      )}

      <Link to="/management/tours" className="btn btn-outline-secondary btn-sm mb-3">
        <i className="bi bi-arrow-left me-1"></i>Quay lại danh sách tour
      </Link>

      <div className="card border-0 shadow-sm rounded-3 overflow-hidden mb-4">
        {tour.images?.[0] ? (
          <img src={tour.images[0]} alt={tour.title} className="w-100" style={{ height: '280px', objectFit: 'cover' }} />
        ) : (
          <div className="bg-secondary-subtle d-flex align-items-center justify-content-center text-muted" style={{ height: '280px' }}>
            <i className="bi bi-image fs-1"></i>
          </div>
        )}
      </div>

      <div className="card border-0 shadow-sm rounded-3">
        <div className="card-body p-4">
          <div className="d-flex justify-content-between align-items-start flex-wrap gap-3 mb-4">
            <div>
              <h2 className="h3 fw-bold mb-1">{tour.title}</h2>
              <div className="text-muted">
                <i className="bi bi-geo-alt-fill text-danger me-1"></i>
                {tour.departureLocation
                  ? `${tour.departureLocation} → ${tour.destinationLocation || tour.location}`
                  : (tour.destinationLocation || tour.location)}
              </div>
            </div>
            <span className={`staff-tour-status ${isSuspended ? 'is-suspended' : 'is-active'}`}>
              <span></span>
              {isSuspended ? 'Tạm ngưng' : 'Đang hoạt động'}
            </span>
          </div>

          <div className="row g-4">
            <div className="col-md-6 col-xl-4">
              <DetailItem label="Mã tour" value={tour._id} mono />
            </div>
            <div className="col-md-6 col-xl-4">
              <DetailItem label="Danh mục tour" value={categoryName} />
            </div>
            <div className="col-md-6 col-xl-4">
              <DetailItem label="Điểm khởi hành" value={tour.departureLocation} />
            </div>
            <div className="col-md-6 col-xl-4">
              <DetailItem label="Điểm đến" value={tour.destinationLocation} />
            </div>
            <div className="col-md-6 col-xl-4">
              <DetailItem label="Địa điểm" value={tour.location} />
            </div>
            <div className="col-md-6 col-xl-4">
              <DetailItem label="Thời lượng" value={tour.duration} />
            </div>
            <div className="col-md-6 col-xl-4">
              <DetailItem label="Giá" value={formatCurrency(tour.price)} />
            </div>
            <div className="col-md-6 col-xl-4">
              <DetailItem label="Số chỗ còn lại" value={tour.availableSeats} />
            </div>
            <div className="col-md-6 col-xl-4">
              <DetailItem label="Đánh giá trung bình" value={tour.averageRating} />
            </div>
            <div className="col-md-6 col-xl-4">
              <DetailItem label="Ngày tạo" value={formatDate(tour.createdAt)} />
            </div>
            <div className="col-md-6 col-xl-4">
              <DetailItem label="Cập nhật lần cuối" value={formatDate(tour.updatedAt)} />
            </div>
          </div>

          {isSuspended && (
            <div className="mt-4 p-3 rounded-3 bg-danger-subtle border border-danger-subtle">
              <h3 className="h6 fw-bold text-danger mb-3">
                <i className="bi bi-exclamation-triangle me-1"></i>Thông tin tạm ngưng
              </h3>
              <div className="row g-3">
                <div className="col-md-4">
                  <DetailItem label="Lý do tạm ngưng" value={tour.suspensionReason} />
                </div>
                <div className="col-md-4">
                  <DetailItem label="Thời gian tạm ngưng" value={formatDate(tour.suspendedAt)} />
                </div>
                <div className="col-md-4">
                  <DetailItem label="Người tạm ngưng" value={suspendedByName} />
                </div>
              </div>
            </div>
          )}

          <div className="mt-4">
            <h3 className="h5 fw-bold mb-2">Giới thiệu tour</h3>
            <p className="text-secondary lh-lg mb-0" style={{ whiteSpace: 'pre-line' }}>
              {tour.description || '—'}
            </p>
          </div>

          <div className="mt-4 p-3 rounded-3 bg-light border small text-muted">
            <i className="bi bi-info-circle me-1"></i>
            Trang này chỉ phục vụ việc rà soát thông tin tour. Việc xử lý (duyệt, từ chối hoặc yêu cầu chỉnh sửa)
            được thực hiện ở bước tiếp theo.
          </div>
        </div>
      </div>
    </section>
  );
}

export default ReviewTourSubmission;