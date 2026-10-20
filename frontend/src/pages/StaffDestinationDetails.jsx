import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { destinationApi, destinationCategoryApi } from '../services/api';
import { useToast } from '../hooks/useToast';
import DestinationFormModal from '../components/DestinationFormModal';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal';

function StaffDestinationDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [destination, setDestination] = useState(null);
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedImageIdx, setSelectedImageIdx] = useState(0);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [destRes, catRes] = await Promise.all([
        (destinationApi.getManagedById ? destinationApi.getManagedById(id) : destinationApi.getById(id)).catch(() => destinationApi.getById(id)),
        destinationCategoryApi.getAll().catch(() => ({ data: [] }))
      ]);
      setDestination(destRes.data);
      setCategories(catRes.data || []);
      setError('');
    } catch (err) {
      setError(err.message || 'Không thể tải thông tin điểm đến.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const handleToggleStatus = async () => {
    if (!destination) return;
    try {
      const nextStatus = destination.status === 'inactive' ? 'active' : 'inactive';
      const response = await destinationApi.updateStatus(destination._id, nextStatus);
      setDestination((prev) => ({ ...prev, status: nextStatus }));
      toast.success(response.message || 'Đã cập nhật trạng thái điểm đến.');
    } catch (err) {
      toast.error(err.message || 'Không thể cập nhật trạng thái.');
    }
  };

  const handleUpdate = async (payload) => {
    setIsSaving(true);
    try {
      const response = await destinationApi.update(id, payload);
      toast.success(response.message || 'Đã cập nhật điểm đến thành công.');
      setIsEditOpen(false);
      await loadData();
    } catch (err) {
      toast.error(err.message || 'Không thể cập nhật điểm đến.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const response = await destinationApi.remove(id);
      toast.success(response.message || `Đã xóa điểm đến "${destination.name}".`);
      navigate('/management/destinations');
    } catch (err) {
      toast.error(err.message || 'Không thể xóa điểm đến.');
      setShowDeleteModal(false);
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <section className="management-page-section">
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Đang tải...</span>
          </div>
          <p className="text-muted mt-2 mb-0">Đang tải thông tin điểm đến...</p>
        </div>
      </section>
    );
  }

  if (error || !destination) {
    return (
      <section className="management-page-section">
        <div className="alert alert-danger mb-4">{error || 'Không tìm thấy điểm đến.'}</div>
        <Link to="/management/destinations" className="btn btn-outline-primary d-inline-flex align-items-center gap-2">
          <i className="bi bi-arrow-left"></i>
          <span>Quay lại danh sách điểm đến</span>
        </Link>
      </section>
    );
  }

  const categoryName = destination.categoryId?.name || (typeof destination.categoryId === 'string' ? destination.categoryId : '—');
  const images = Array.isArray(destination.images) ? destination.images.filter(Boolean) : [];
  const currentImage = images[selectedImageIdx] || images[0] || '';

  return (
    <>
      <section className="management-page-section">
        {/* Top Heading */}
        <div className="management-page-heading mb-4">
          <nav aria-label="breadcrumb" className="mb-2">
            <ol className="breadcrumb small mb-0">
              <li className="breadcrumb-item">
                <Link to="/management/destinations" className="text-decoration-none text-muted">
                  Quản lý điểm đến
                </Link>
              </li>
              <li className="breadcrumb-item active text-primary fw-semibold" aria-current="page">
                Chi tiết điểm đến
              </li>
            </ol>
          </nav>
          <h1 className="text-dark fw-bold mb-2">{destination.name}</h1>
          <div className="d-flex align-items-center gap-3 flex-wrap">
            <span className={`management-badge ${destination.status === 'inactive' ? 'badge-secondary' : destination.isPopular ? 'badge-success' : 'badge-primary'}`}>
              <span className="management-badge-dot"></span>
              {destination.status === 'inactive' ? 'Tạm ẩn' : (destination.isPopular ? 'Phổ biến' : 'Đang hoạt động')}
            </span>
            <span className="text-muted small d-flex align-items-center gap-1">
              <i className="bi bi-geo-alt-fill text-danger"></i>
              {destination.location}
            </span>
          </div>
        </div>

        {/* Main Content Layout */}
        <div className="row g-4">
          {/* Left Column: Image Banner & Details */}
          <div className="col-12 col-lg-8">
            {/* Uncropped Media Viewer */}
            <div className="card border-0 shadow-sm rounded-4 overflow-hidden mb-4 bg-white">
              {currentImage ? (
                <div>
                  <div
                    className="position-relative d-flex align-items-center justify-content-center overflow-hidden"
                    style={{
                      backgroundColor: '#0f172a',
                      minHeight: '340px',
                      maxHeight: '480px',
                      height: '420px'
                    }}
                  >
                    {/* Ambient Blurred Backdrop */}
                    <div
                      aria-hidden="true"
                      style={{
                        position: 'absolute',
                        inset: 0,
                        backgroundImage: `url(${currentImage})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        filter: 'blur(28px)',
                        opacity: 0.35,
                        transform: 'scale(1.1)'
                      }}
                    />

                    {/* Foreground Uncropped Image */}
                    <img
                      src={currentImage}
                      alt={`${destination.name} - Ảnh ${selectedImageIdx + 1}`}
                      className="position-relative"
                      style={{
                        maxHeight: '100%',
                        maxWidth: '100%',
                        objectFit: 'contain',
                        zIndex: 2,
                        boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
                      }}
                    />

                    {/* Navigation Arrows (if multiple) */}
                    {images.length > 1 && (
                      <>
                        <button
                          type="button"
                          className="btn btn-light btn-sm rounded-circle position-absolute top-50 start-0 translate-middle-y ms-3 shadow"
                          style={{ zIndex: 3, width: '40px', height: '40px' }}
                          onClick={() => setSelectedImageIdx((prev) => (prev > 0 ? prev - 1 : images.length - 1))}
                          aria-label="Ảnh trước"
                        >
                          <i className="bi bi-chevron-left"></i>
                        </button>
                        <button
                          type="button"
                          className="btn btn-light btn-sm rounded-circle position-absolute top-50 end-0 translate-middle-y me-3 shadow"
                          style={{ zIndex: 3, width: '40px', height: '40px' }}
                          onClick={() => setSelectedImageIdx((prev) => (prev < images.length - 1 ? prev + 1 : 0))}
                          aria-label="Ảnh tiếp theo"
                        >
                          <i className="bi bi-chevron-right"></i>
                        </button>
                      </>
                    )}

                    {/* Badges / View Full Resolution */}
                    <div className="position-absolute top-0 end-0 p-3 d-flex gap-2" style={{ zIndex: 3 }}>
                      {images.length > 1 && (
                        <span className="badge bg-dark bg-opacity-75 text-white px-2.5 py-1.5 rounded-pill small">
                          <i className="bi bi-images me-1"></i>
                          {selectedImageIdx + 1} / {images.length}
                        </span>
                      )}
                      <a
                        href={currentImage}
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn-sm btn-dark bg-opacity-75 text-white border-0 rounded-pill px-3 py-1 d-inline-flex align-items-center gap-1.5"
                        title="Mở ảnh gốc trong tab mới"
                      >
                        <i className="bi bi-box-arrow-up-right"></i>
                        <span className="small">Xem ảnh gốc</span>
                      </a>
                    </div>
                  </div>

                  {/* Thumbnail Strip */}
                  {images.length > 1 && (
                    <div className="p-3 bg-light border-top d-flex gap-2 overflow-auto align-items-center">
                      <span className="small text-muted fw-semibold me-2 flex-shrink-0">
                        <i className="bi bi-collection me-1"></i>
                        Bộ sưu tập ({images.length}):
                      </span>
                      {images.map((imgUrl, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setSelectedImageIdx(idx)}
                          className={`btn p-0 border rounded-3 overflow-hidden flex-shrink-0 ${
                            idx === selectedImageIdx
                              ? 'border-primary border-2 shadow-sm'
                              : 'border-secondary-subtle opacity-75'
                          }`}
                          style={{
                            width: '76px',
                            height: '52px',
                            transform: idx === selectedImageIdx ? 'scale(1.05)' : 'scale(1)'
                          }}
                          aria-label={`Chọn ảnh ${idx + 1}`}
                        >
                          <img
                            src={imgUrl}
                            alt={`Thumbnail ${idx + 1}`}
                            className="w-100 h-100"
                            style={{ objectFit: 'cover' }}
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div
                  className="bg-light-subtle d-flex flex-column align-items-center justify-content-center text-muted py-5"
                  style={{ minHeight: '260px' }}
                >
                  <i className="bi bi-image fs-1 mb-2 opacity-50"></i>
                  <span className="small">Điểm đến này chưa có hình ảnh đính kèm.</span>
                </div>
              )}
            </div>

            <div className="card border-0 shadow-sm rounded-4 p-4 bg-white mb-4">
              <h5 className="fw-bold text-dark mb-3 d-flex align-items-center gap-2">
                <i className="bi bi-file-text text-primary"></i>
                <span>Giới thiệu chi tiết</span>
              </h5>
              <div
                className="text-secondary lh-lg mb-0"
                style={{ whiteSpace: 'pre-line', fontSize: '0.98rem' }}
              >
                {destination.description || 'Chưa có mô tả cho điểm đến này.'}
              </div>
            </div>
          </div>

          {/* Right Column: Actions & Key Attributes */}
          <div className="col-12 col-lg-4">
            {/* Quick Actions Card */}
            <div className="card border-0 shadow-sm rounded-4 p-4 bg-white mb-4">
              <h6 className="fw-bold text-dark mb-3 d-flex align-items-center gap-2">
                <i className="bi bi-sliders text-primary"></i>
                <span>Thao tác quản trị</span>
              </h6>
              <div className="d-flex flex-column gap-2">
                <button
                  type="button"
                  className="btn btn-primary w-100 d-inline-flex align-items-center justify-content-center gap-2 py-2 fw-semibold"
                  onClick={() => setIsEditOpen(true)}
                >
                  <i className="bi bi-pencil-square"></i>
                  <span>Chỉnh sửa điểm đến</span>
                </button>
                <button
                  type="button"
                  className={`btn ${destination.status === 'inactive' ? 'btn-outline-success' : 'btn-outline-warning'} w-100 d-inline-flex align-items-center justify-content-center gap-2 py-2 fw-semibold`}
                  onClick={handleToggleStatus}
                >
                  <i className={destination.status === 'inactive' ? 'bi bi-toggle-on' : 'bi bi-toggle-off'}></i>
                  <span>{destination.status === 'inactive' ? 'Kích hoạt điểm đến' : 'Tạm ẩn điểm đến'}</span>
                </button>
                <button
                  type="button"
                  className="btn btn-outline-danger w-100 d-inline-flex align-items-center justify-content-center gap-2 py-2 fw-semibold"
                  onClick={() => setShowDeleteModal(true)}
                >
                  <i className="bi bi-trash"></i>
                  <span>Xóa điểm đến</span>
                </button>
              </div>
            </div>

            <div className="card border-0 shadow-sm rounded-4 p-4 bg-white mb-4">
              <h6 className="fw-bold text-dark mb-3 d-flex align-items-center gap-2">
                <i className="bi bi-info-circle text-primary"></i>
                <span>Thông tin tổng quát</span>
              </h6>

              <div className="d-flex flex-column gap-3 small">
                <div>
                  <span className="text-muted d-block mb-1">Vị trí địa lý</span>
                  <strong className="text-dark fs-6 d-flex align-items-center gap-1">
                    <i className="bi bi-geo-alt text-danger"></i>
                    {destination.location}
                  </strong>
                </div>

                <div className="border-top pt-2">
                  <span className="text-muted d-block mb-1">Danh mục phân loại</span>
                  <span className="badge bg-light text-dark border px-2.5 py-1.5 fw-semibold">
                    {categoryName}
                  </span>
                </div>

                <div className="border-top pt-2">
                  <span className="text-muted d-block mb-1">Đánh giá trung bình</span>
                  <div className="d-flex align-items-center gap-2">
                    <span className="badge bg-warning bg-opacity-10 text-warning border border-warning px-2 py-1 fw-bold fs-6">
                      ★ {destination.averageRating || 0}
                    </span>
                    <span className="text-muted">({destination.numReviews || 0} lượt đánh giá)</span>
                  </div>
                </div>

                <div className="border-top pt-2">
                  <span className="text-muted d-block mb-1">Độ phổ biến</span>
                  {destination.isPopular ? (
                    <span className="text-success fw-bold d-flex align-items-center gap-1">
                      <i className="bi bi-check-circle-fill"></i>
                      Điểm đến phổ biến
                    </span>
                  ) : (
                    <span className="text-secondary">Điểm đến tiêu chuẩn</span>
                  )}
                </div>
              </div>
            </div>

            <div className="card border-0 shadow-sm rounded-4 p-4 bg-white">
              <h6 className="fw-bold text-dark mb-3 d-flex align-items-center gap-2">
                <i className="bi bi-shield-check text-primary"></i>
                <span>Thông tin quản trị</span>
              </h6>

              <div className="d-flex flex-column gap-2 small text-muted">
                <div>
                  <span className="d-block text-secondary">Mã định danh (ID):</span>
                  <code className="text-dark bg-light px-2 py-0.5 rounded">{destination._id}</code>
                </div>
                {destination.createdAt && (
                  <div className="border-top pt-2">
                    <span className="d-block text-secondary">Ngày khởi tạo:</span>
                    <span className="text-dark">{new Date(destination.createdAt).toLocaleString('vi-VN')}</span>
                  </div>
                )}
                {destination.updatedAt && (
                  <div className="border-top pt-2">
                    <span className="d-block text-secondary">Cập nhật lần cuối:</span>
                    <span className="text-dark">{new Date(destination.updatedAt).toLocaleString('vi-VN')}</span>
                  </div>
                )}
              </div>

              <div className="mt-4 pt-3 border-top">
                <a
                  href={`/destinations/${destination._id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-outline-secondary w-100 btn-sm d-inline-flex align-items-center justify-content-center gap-2"
                >
                  <i className="bi bi-box-arrow-up-right"></i>
                  <span>Xem giao diện khách hàng</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Reusable Form Modal for Editing */}
      <DestinationFormModal
        isOpen={isEditOpen}
        destination={destination}
        categories={categories}
        saving={isSaving}
        onClose={() => setIsEditOpen(false)}
        onSubmit={handleUpdate}
      />

      {/* Reusable Confirm Delete Modal */}
      <ConfirmDeleteModal
        isOpen={showDeleteModal}
        title="Xác nhận xóa điểm đến"
        message={
          <>
            Bạn có chắc chắn muốn xóa điểm đến <strong>{destination.name}</strong>?
            <br />
            <small className="text-muted">
              Thao tác này sẽ gỡ bỏ điểm đến khỏi hệ thống và chuyển bạn về danh sách điểm đến.
            </small>
          </>
        }
        loading={isDeleting}
        onConfirm={handleDelete}
        onClose={() => setShowDeleteModal(false)}
      />
    </>
  );
}

export default StaffDestinationDetails;
