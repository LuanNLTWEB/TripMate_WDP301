import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useToast } from '../hooks/useToast';
import { tourApi, tourCategoryApi, uploadApi } from '../services/api';
import CustomSelect from '../components/CustomSelect';

const formatCurrency = (value) => new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0
}).format(value || 0);

const getStatusBadge = (status) => {
  switch (status) {
    case 'active':
      return {
        label: 'Đang hoạt động',
        variant: 'badge-success'
      };
    case 'pending':
      return {
        label: 'Chờ kiểm duyệt',
        variant: 'badge-warning'
      };
    case 'needs_revision':
      return {
        label: 'Cần chỉnh sửa',
        variant: 'badge-info'
      };
    case 'rejected':
      return {
        label: 'Bị từ chối',
        variant: 'badge-danger'
      };
    case 'suspended':
      return {
        label: 'Tạm ngưng',
        variant: 'badge-secondary'
      };
    default:
      return {
        label: status,
        variant: 'badge-secondary'
      };
  }
};

export default function ProviderTours() {
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  // Modal state for Creating a Tour
  const [showCreateModal, setShowCreateModal] = useState(
    searchParams.get('action') === 'create' || searchParams.get('tab') === 'create'
  );

  // --- List State ---
  const [tours, setTours] = useState([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [listError, setListError] = useState('');

  // --- Create Form State ---
  const [categories, setCategories] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createError, setCreateError] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    categoryId: '',
    departureLocation: '',
    destinationLocation: '',
    location: '',
    duration: '',
    price: '',
    availableSeats: '',
    imageUrl: '',
    description: ''
  });

  // Load tour categories
  useEffect(() => {
    tourCategoryApi.getAll()
      .then((res) => setCategories(res.data || []))
      .catch(() => {});
  }, []);

  // Load tours list
  const loadTours = async (searchTerm = search, selectedStatus = status, page = currentPage) => {
    setIsLoading(true);
    try {
      const response = await tourApi.getProviderTours({
        search: searchTerm,
        status: selectedStatus,
        page,
        limit: 10
      });
      setTours(response.data || []);
      setCurrentPage(response.currentPage || 1);
      setTotalPages(response.totalPages || 1);
      setListError('');
    } catch (requestError) {
      setListError(requestError.message || 'Không thể tải danh sách tour của bạn.');
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

  const handleFilterChange = (e) => {
    setStatus(e.target.value);
    setCurrentPage(1);
  };

  const handlePageChange = (page) => {
    if (page < 1 || page > totalPages || page === currentPage) return;
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // --- Create Form Handlers ---
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const updated = { ...prev, [name]: value };
      if (name === 'destinationLocation' && (!prev.location || prev.location === prev.destinationLocation)) {
        updated.location = value;
      }
      return updated;
    });
  };

  const handlePriceChange = (e) => {
    const rawValue = e.target.value.replace(/\D/g, '');
    setFormData((prev) => ({ ...prev, price: rawValue }));
  };

  const handleImageFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setCreateError('Kích thước ảnh không được vượt quá 5MB.');
        return;
      }
      setImageFile(file);
      const previewUrl = URL.createObjectURL(file);
      setImagePreview(previewUrl);
      setCreateError('');
    }
  };

  const handleResetCreateForm = () => {
    setFormData({
      title: '',
      categoryId: '',
      departureLocation: '',
      destinationLocation: '',
      location: '',
      duration: '',
      price: '',
      availableSeats: '',
      imageUrl: '',
      description: ''
    });
    setImageFile(null);
    setImagePreview('');
    setCreateError('');
  };

  const handleCloseModal = () => {
    if (isSubmitting) return;
    setShowCreateModal(false);
    handleResetCreateForm();
    if (searchParams.get('action') || searchParams.get('tab')) {
      setSearchParams({});
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setCreateError('');

    if (!formData.title.trim()) {
      setCreateError('Vui lòng nhập tên tour.');
      return;
    }
    if (!formData.departureLocation.trim()) {
      setCreateError('Vui lòng nhập điểm khởi hành.');
      return;
    }
    if (!formData.destinationLocation.trim()) {
      setCreateError('Vui lòng nhập điểm đến.');
      return;
    }
    const numPrice = Number(formData.price);
    if (!formData.price || isNaN(numPrice) || numPrice < 0) {
      setCreateError('Giá tour phải là một số hợp lệ lớn hơn hoặc bằng 0.');
      return;
    }
    const numSeats = Number(formData.availableSeats);
    if (!formData.availableSeats || isNaN(numSeats) || numSeats <= 0) {
      setCreateError('Vui lòng nhập số lượng chỗ hợp lệ (lớn hơn 0).');
      return;
    }
    if (!formData.description.trim()) {
      setCreateError('Vui lòng nhập mô tả chi tiết tour.');
      return;
    }
    if (!imageFile && !formData.imageUrl) {
      setCreateError('Vui lòng tải lên hoặc dán URL hình ảnh đại diện của tour.');
      return;
    }

    setIsSubmitting(true);
    let finalImageUrl = formData.imageUrl;

    try {
      if (imageFile) {
        const uploadData = new FormData();
        uploadData.append('image', imageFile);
        const uploadRes = await uploadApi.uploadImage(uploadData);
        finalImageUrl = uploadRes.url;
      }

      const payload = {
        title: formData.title.trim(),
        categoryId: formData.categoryId || null,
        departureLocation: formData.departureLocation.trim(),
        destinationLocation: formData.destinationLocation.trim(),
        location: (formData.location || formData.destinationLocation).trim(),
        duration: formData.duration.trim() || 'Lịch trình linh hoạt',
        price: numPrice,
        availableSeats: numSeats,
        description: formData.description.trim(),
        images: finalImageUrl.trim() ? [finalImageUrl.trim()] : []
      };

      const res = await tourApi.create(payload);
      toast.success(res.message || 'Tạo tour mới thành công! Tour đang ở trạng thái chờ nhân viên kiểm duyệt.');
      handleResetCreateForm();
      setShowCreateModal(false);
      setSearchParams({});
      await loadTours('', 'all', 1);
    } catch (err) {
      setCreateError(err.message || 'Không thể tạo tour. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="management-page-section">
      {/* Page Heading & Nút Tạo Tour Mới */}
      <div className="management-page-heading d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
        <div>
          <span className="management-page-kicker">Tour Provider</span>
          <h1>Quản lý tour</h1>
          <p>Xem danh sách, quản lý và đăng tải các tour du lịch của bạn trên hệ thống.</p>
        </div>

        <button
          type="button"
          className="btn btn-primary d-inline-flex align-items-center gap-2"
          onClick={() => {
            setShowCreateModal(true);
            setCreateError('');
          }}
        >
          <i className="bi bi-plus-circle"></i>
          <span>Tạo tour mới</span>
        </button>
      </div>

      {listError && (
        <div className="alert alert-danger alert-dismissible fade show" role="alert">
          {listError}
          <button type="button" className="btn-close" onClick={() => setListError('')} aria-label="Đóng"></button>
        </div>
      )}

      {/* Bảng danh sách tour chuẩn Staff UI */}
      <div className="management-table-card">
        <div className="management-table-toolbar">
          <div className="management-search-box">
            <i className="bi bi-search"></i>
            <input
              type="search"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Tìm theo tên tour, điểm đi hoặc điểm đến..."
              aria-label="Tìm kiếm tour"
            />
          </div>

          <div className="d-flex align-items-center gap-2">
            <label htmlFor="provider-status-filter" className="small text-muted fw-semibold mb-0 text-nowrap">
              <i className="bi bi-funnel me-1"></i>Trạng thái:
            </label>
            <CustomSelect
              id="provider-status-filter"
              style={{ width: '190px' }}
              triggerStyle={{ height: '36px', fontSize: '0.86rem' }}
              value={status}
              onChange={handleFilterChange}
              options={[
                { value: 'all', label: 'Tất cả trạng thái' },
                { value: 'active', label: 'Đang hoạt động', icon: 'bi bi-check-circle text-success' },
                { value: 'pending', label: 'Chờ kiểm duyệt', icon: 'bi bi-hourglass-split text-warning' },
                { value: 'needs_revision', label: 'Cần chỉnh sửa', icon: 'bi bi-pencil-square text-info' },
                { value: 'rejected', label: 'Bị từ chối', icon: 'bi bi-x-circle text-danger' },
                { value: 'suspended', label: 'Tạm ngưng', icon: 'bi bi-slash-circle text-secondary' }
              ]}
            />
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
              ) : (
                tours.map((tour) => {
                  const badge = getStatusBadge(tour.status);

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
                        <span className={`management-badge ${badge.variant}`}>
                          <span className="management-badge-dot"></span>
                          {badge.label}
                        </span>

                        {tour.status === 'needs_revision' && tour.revisionNote && (
                          <div className="small text-muted mt-1 text-truncate" style={{ maxWidth: '200px' }} title={tour.revisionNote}>
                            <i className="bi bi-info-circle me-1"></i>{tour.revisionNote}
                          </div>
                        )}

                        {tour.status === 'rejected' && tour.rejectionReason && (
                          <div className="small text-muted mt-1 text-truncate" style={{ maxWidth: '200px' }} title={tour.rejectionReason}>
                            <i className="bi bi-exclamation-circle me-1"></i>{tour.rejectionReason}
                          </div>
                        )}
                      </td>

                      <td className="text-end">
                        <div className="management-actions justify-content-end">
                          <Link
                            className="management-action-btn btn-view"
                            to={`/tours/${tour._id}`}
                            title="Xem chi tiết tour"
                            aria-label={`Xem ${tour.title}`}
                          >
                            <i className="bi bi-eye"></i>
                          </Link>
                          <Link
                            className="management-action-btn btn-edit"
                            to={`/provider/tours/${tour._id}/details`}
                            title="Thiết lập chi tiết tour (Lịch trình, dịch vụ, chính sách)"
                            aria-label={`Thiết lập chi tiết ${tour.title}`}
                          >
                            <i className="bi bi-sliders"></i>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
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
                  <button
                    className="page-link"
                    onClick={() => handlePageChange(Math.max(currentPage - 1, 1))}
                    disabled={currentPage === 1}
                  >
                    <i className="bi bi-chevron-left me-1"></i>Trước
                  </button>
                </li>
                {[...Array(totalPages)].map((_, idx) => (
                  <li key={idx} className={`page-item ${currentPage === idx + 1 ? 'active' : ''}`}>
                    <button
                      className="page-link"
                      onClick={() => handlePageChange(idx + 1)}
                    >
                      {idx + 1}
                    </button>
                  </li>
                ))}
                <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                  <button
                    className="page-link"
                    onClick={() => handlePageChange(Math.min(currentPage + 1, totalPages))}
                    disabled={currentPage === totalPages}
                  >
                    Sau<i className="bi bi-chevron-right ms-1"></i>
                  </button>
                </li>
              </ul>
            </nav>
          </div>
        )}
      </div>

      {/* ================= POPUP / MODAL TẠO TOUR MỚI ================= */}
      {showCreateModal && (
        <>
          <div
            className="modal fade show d-block"
            tabIndex="-1"
            role="dialog"
            aria-modal="true"
            style={{ backgroundColor: 'rgba(15, 23, 42, 0.6)', zIndex: 1055 }}
            onClick={(e) => {
              if (e.target === e.currentTarget && !isSubmitting) {
                handleCloseModal();
              }
            }}
          >
            <div className="modal-dialog modal-dialog-centered modal-xl modal-dialog-scrollable">
              <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
                {/* Modal Header */}
                <div className="modal-header bg-light-subtle px-4 py-3 border-bottom d-flex align-items-center justify-content-between">
                  <div>
                    <h2 className="modal-title h5 fw-bold text-dark mb-0 d-flex align-items-center gap-2">
                      <i className="bi bi-plus-circle-fill text-primary"></i>
                      <span>Tạo Tour Du Lịch Mới</span>
                    </h2>
                    <p className="small text-muted mb-0 mt-0.5">
                      Điền thông tin chi tiết để gửi nhân viên kiểm duyệt trước khi mở bán tour.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={handleCloseModal}
                    disabled={isSubmitting}
                    aria-label="Đóng"
                  ></button>
                </div>

                {/* Form & Modal Body */}
                <form onSubmit={handleCreateSubmit} className="d-flex flex-column" style={{ minHeight: 0 }}>
                  <div className="modal-body p-4 overflow-y-auto" style={{ maxHeight: '70vh' }}>
                    {createError && (
                      <div className="alert alert-danger alert-dismissible fade show mb-4 rounded-3" role="alert">
                        <i className="bi bi-exclamation-triangle-fill me-2"></i>
                        {createError}
                        <button type="button" className="btn-close" onClick={() => setCreateError('')}></button>
                      </div>
                    )}

                    <div className="row g-4">
                      {/* Cột trái: Thông tin Tour */}
                      <div className="col-12 col-lg-8">
                        <div className="card border rounded-4 p-4 shadow-none bg-light-subtle mb-0">
                          <h6 className="fw-bold text-dark mb-3 d-flex align-items-center gap-2">
                            <i className="bi bi-info-circle text-primary"></i>
                            <span>Thông tin cơ bản</span>
                          </h6>

                          <div className="mb-3">
                            <label className="form-label small fw-semibold text-secondary">
                              Tên Tour Du Lịch <span className="text-danger">*</span>
                            </label>
                            <input
                              type="text"
                              name="title"
                              className="form-control rounded-3"
                              placeholder="Ví dụ: Nghỉ dưỡng Đảo Ngọc Phú Quốc 4N3Đ - Chuẩn 5 Sao"
                              value={formData.title}
                              onChange={handleInputChange}
                              required
                            />
                          </div>

                          <div className="row g-3 mb-3">
                            <div className="col-md-6">
                              <label className="form-label small fw-semibold text-secondary">
                                Danh mục phân loại
                              </label>
                              <CustomSelect
                                id="provider-create-tour-category"
                                value={formData.categoryId}
                                onChange={(e) => setFormData((p) => ({ ...p, categoryId: e.target.value }))}
                                options={[
                                  { value: '', label: 'Chọn danh mục phù hợp' },
                                  ...categories.map((c) => ({ value: c._id, label: c.name }))
                                ]}
                                triggerStyle={{ height: '42px', borderRadius: '10px' }}
                              />
                            </div>
                            <div className="col-md-6">
                              <label className="form-label small fw-semibold text-secondary">
                                Thời lượng chuyến đi <span className="text-danger">*</span>
                              </label>
                              <input
                                type="text"
                                name="duration"
                                className="form-control rounded-3"
                                placeholder="Ví dụ: 3 ngày 2 đêm, 4 ngày 3 đêm..."
                                value={formData.duration}
                                onChange={handleInputChange}
                                required
                              />
                            </div>
                          </div>

                          <div className="row g-3 mb-3">
                            <div className="col-md-6">
                              <label className="form-label small fw-semibold text-secondary">
                                Điểm khởi hành <span className="text-danger">*</span>
                              </label>
                              <input
                                type="text"
                                name="departureLocation"
                                className="form-control rounded-3"
                                placeholder="Ví dụ: Hà Nội, TP. Hồ Chí Minh, Đà Nẵng..."
                                value={formData.departureLocation}
                                onChange={handleInputChange}
                                required
                              />
                            </div>
                            <div className="col-md-6">
                              <label className="form-label small fw-semibold text-secondary">
                                Điểm đến chính <span className="text-danger">*</span>
                              </label>
                              <input
                                type="text"
                                name="destinationLocation"
                                className="form-control rounded-3"
                                placeholder="Ví dụ: Phú Quốc, Sapa, Nha Trang, Hạ Long..."
                                value={formData.destinationLocation}
                                onChange={handleInputChange}
                                required
                              />
                            </div>
                          </div>

                          <div className="row g-3 mb-3">
                            <div className="col-md-6">
                              <label className="form-label small fw-semibold text-secondary">
                                Giá vé trọn gói (VNĐ) <span className="text-danger">*</span>
                              </label>
                              <div className="input-group">
                                <input
                                  type="text"
                                  name="price"
                                  className="form-control rounded-start-3"
                                  placeholder="Ví dụ: 4500000"
                                  value={formData.price ? Number(formData.price).toLocaleString('vi-VN') : ''}
                                  onChange={handlePriceChange}
                                  required
                                />
                                <span className="input-group-text rounded-end-3 bg-white text-muted">đ / khách</span>
                              </div>
                            </div>
                            <div className="col-md-6">
                              <label className="form-label small fw-semibold text-secondary">
                                Số lượng chỗ tối đa <span className="text-danger">*</span>
                              </label>
                              <div className="input-group">
                                <input
                                  type="number"
                                  name="availableSeats"
                                  min="1"
                                  className="form-control rounded-start-3"
                                  placeholder="Ví dụ: 25"
                                  value={formData.availableSeats}
                                  onChange={handleInputChange}
                                  required
                                />
                                <span className="input-group-text rounded-end-3 bg-white text-muted">chỗ</span>
                              </div>
                            </div>
                          </div>

                          <div className="mb-0">
                            <label className="form-label small fw-semibold text-secondary">
                              Giới thiệu tổng quan chuyến đi <span className="text-danger">*</span>
                            </label>
                            <textarea
                              name="description"
                              rows={4}
                              className="form-control rounded-3"
                              placeholder="Mô tả tóm tắt điểm nổi bật, trải nghiệm đáng nhớ và nét đặc sắc của chuyến đi này..."
                              value={formData.description}
                              onChange={handleInputChange}
                              required
                            ></textarea>
                          </div>
                        </div>
                      </div>

                      {/* Cột phải: Ảnh đại diện & Gợi ý */}
                      <div className="col-12 col-lg-4">
                        <div className="card border rounded-4 p-4 shadow-none bg-light-subtle mb-3">
                          <h6 className="fw-bold text-dark mb-3 d-flex align-items-center gap-2">
                            <i className="bi bi-image text-primary"></i>
                            <span>Hình ảnh đại diện</span>
                          </h6>

                          {/* Image Preview Box */}
                          <div
                            className="border rounded-4 overflow-hidden mb-3 bg-white d-flex align-items-center justify-content-center text-muted position-relative shadow-sm"
                            style={{ height: '180px' }}
                          >
                            {imagePreview || formData.imageUrl ? (
                              <img
                                src={imagePreview || formData.imageUrl}
                                alt="Tour preview"
                                className="w-100 h-100 object-fit-cover"
                              />
                            ) : (
                              <div className="text-center p-3">
                                <i className="bi bi-cloud-arrow-up fs-2 text-primary opacity-50 mb-1 d-block"></i>
                                <span className="small text-muted">Chưa có ảnh preview</span>
                              </div>
                            )}
                          </div>

                          {/* Upload file */}
                          <div className="mb-3">
                            <label className="form-label small fw-semibold text-secondary">
                              Tải ảnh từ máy tính (tối đa 5MB)
                            </label>
                            <input
                              type="file"
                              accept="image/*"
                              className="form-control form-control-sm rounded-3"
                              onChange={handleImageFileChange}
                            />
                          </div>

                          {/* Or image URL */}
                          <div>
                            <label className="form-label small fw-semibold text-secondary">
                              Hoặc dán trực tiếp URL ảnh:
                            </label>
                            <input
                              type="url"
                              name="imageUrl"
                              className="form-control form-control-sm rounded-3"
                              placeholder="https://images.unsplash.com/..."
                              value={formData.imageUrl}
                              onChange={(e) => {
                                handleInputChange(e);
                                setImagePreview(e.target.value);
                              }}
                            />
                          </div>
                        </div>

                        <div className="card border-0 bg-primary-subtle text-primary-emphasis rounded-4 p-3 small">
                          <div className="d-flex align-items-center gap-2 fw-bold mb-1">
                            <i className="bi bi-shield-check fs-6"></i>
                            <span>Quy trình kiểm duyệt</span>
                          </div>
                          <p className="mb-0 lh-sm opacity-75" style={{ fontSize: '0.8rem' }}>
                            Sau khi tạo, tour sẽ chuyển sang trạng thái <em>"Chờ kiểm duyệt"</em> để nhân viên TripMate xem xét và kích hoạt mở bán.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Modal Footer */}
                  <div className="modal-footer bg-light-subtle px-4 py-3 border-top d-flex justify-content-end align-items-center gap-2">
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={handleCloseModal}
                      disabled={isSubmitting}
                    >
                      Hủy bỏ
                    </button>

                    <button
                      type="submit"
                      className="btn btn-primary d-inline-flex align-items-center gap-2"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <span className="spinner-border spinner-border-sm" aria-hidden="true"></span>
                          <span>Đang tạo tour...</span>
                        </>
                      ) : (
                        <>
                          <i className="bi bi-check2-circle"></i>
                          <span>Lưu & Gửi kiểm duyệt</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show" style={{ zIndex: 1050 }}></div>
        </>
      )}
    </section>
  );
}
