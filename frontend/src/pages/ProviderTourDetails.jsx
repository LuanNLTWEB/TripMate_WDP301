import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { tourApi, departureApi } from '../services/api';
import { useToast } from '../hooks/useToast';
import TourScheduleModal from './TourScheduleModal';
import EditTourPriceModal from './EditTourPriceModal';
import TourFormModal from './TourFormModal';
import CreateTourDepartureModal from './CreateTourDepartureModal';
import EditDepartureSlotModal from './EditDepartureSlotModal';

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
      <div className="small text-muted text-uppercase fw-semibold mb-1" style={{ fontSize: '0.75rem', letterSpacing: '0.04em' }}>
        {label}
      </div>
      <div className={mono ? 'font-monospace small' : 'fw-medium text-dark'}>
        {hasValue ? value : '—'}
      </div>
    </div>
  );
}

export default function ProviderTourDetails() {
  const { id } = useParams();
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [tour, setTour] = useState(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showPriceModal, setShowPriceModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDepartureModal, setShowDepartureModal] = useState(false);
  const [selectedImageIdx, setSelectedImageIdx] = useState(0);
  const [editingDeparture, setEditingDeparture] = useState(null);

  // Form states (STT 45 - Set Tour Details)
  const [includedServices, setIncludedServices] = useState([]);
  const [excludedServices, setExcludedServices] = useState([]);
  const [cancellationPolicy, setCancellationPolicy] = useState('');
  const [notes, setNotes] = useState('');

  // Temp inputs
  const [newIncluded, setNewIncluded] = useState('');
  const [newExcluded, setNewExcluded] = useState('');

  // Capacity editor (UC-44 - Update Tour Capacity)
  const [capacityInput, setCapacityInput] = useState('');
  const [confirmedSeats, setConfirmedSeats] = useState(0);
  const [savingCapacity, setSavingCapacity] = useState(false);

  // Departures (UC-40 - Create Tour Departure)
  const [departures, setDepartures] = useState([]);
  const [loadingDepartures, setLoadingDepartures] = useState(false);

  const loadTourDetails = () => {
    setLoading(true);
    tourApi.getProviderById(id)
      .then((res) => {
        const data = res.data;
        setTour(data);
        setIncludedServices(data.includedServices || []);
        setExcludedServices(data.excludedServices || []);
        setCancellationPolicy(data.cancellationPolicy || '');
        setNotes(data.notes || '');
        setCapacityInput(String(data.availableSeats ?? 0));
      })
      .catch((err) => {
        setError(err.message || 'Không thể tải thông tin tour.');
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const handleSaveCapacity = async () => {
    const parsed = Number(capacityInput);
    if (!Number.isInteger(parsed) || parsed < 0) {
      toast.error('Số chỗ phải là số nguyên không âm.');
      return;
    }

    setSavingCapacity(true);
    try {
      const res = await tourApi.updateCapacity(id, parsed);
      toast.success(res.message || 'Cập nhật số chỗ thành công!');
      setConfirmedSeats(res.data?.confirmedSeats ?? 0);
      setTour((current) => (current
        ? { ...current, availableSeats: res.data?.availableSeats ?? parsed }
        : current));
      setCapacityInput(String(res.data?.availableSeats ?? parsed));
    } catch (err) {
      toast.error(err.message || 'Không thể cập nhật số chỗ tour.');
    } finally {
      setSavingCapacity(false);
    }
  };

  const loadDepartures = async () => {
    setLoadingDepartures(true);
    try {
      const res = await departureApi.listByTour(id);
      setDepartures(res.data || []);
    } catch (err) {
      setDepartures([]);
    } finally {
      setLoadingDepartures(false);
    }
  };

  useEffect(() => {
    loadTourDetails();
  }, [id]);

  useEffect(() => {
    loadDepartures();
  }, [id]);

  // Included Services Handlers
  const handleAddIncluded = () => {
    const trimmed = newIncluded.trim();
    if (!trimmed) return;
    if (includedServices.includes(trimmed)) {
      toast.warning('Dịch vụ này đã có trong danh sách bao gồm.');
      return;
    }
    setIncludedServices((prev) => [...prev, trimmed]);
    setNewIncluded('');
  };

  const handleRemoveIncluded = (index) => {
    setIncludedServices((prev) => prev.filter((_, i) => i !== index));
  };

  // Excluded Services Handlers
  const handleAddExcluded = () => {
    const trimmed = newExcluded.trim();
    if (!trimmed) return;
    if (excludedServices.includes(trimmed)) {
      toast.warning('Dịch vụ này đã có trong danh sách không bao gồm.');
      return;
    }
    setExcludedServices((prev) => [...prev, trimmed]);
    setNewExcluded('');
  };

  const handleRemoveExcluded = (index) => {
    setExcludedServices((prev) => prev.filter((_, i) => i !== index));
  };

  // Save Tour Details (STT 45)
  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        includedServices,
        excludedServices,
        cancellationPolicy: cancellationPolicy.trim(),
        notes: notes.trim()
      };

      const res = await tourApi.setDetails(id, payload);
      toast.success(res.message || 'Đã lưu thiết lập chi tiết tour thành công!');
      setTour(res.data || tour);
    } catch (err) {
      toast.error(err.message || 'Không thể lưu thiết lập chi tiết tour.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
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

  if (error || !tour) {
    return (
      <section className="management-page-section">
        <div className="alert alert-danger">{error || 'Không tìm thấy tour.'}</div>
        <Link to="/management/my-tours" className="btn btn-outline-primary">
          <i className="bi bi-arrow-left me-2"></i>Quay lại danh sách tour
        </Link>
      </section>
    );
  }

  const isSuspended = tour.status === 'suspended';
  const isPending = tour.status === 'pending';
  const isNeedsRevision = tour.status === 'needs_revision';
  const isRejected = tour.status === 'rejected';
  const statusClass = isSuspended ? 'is-suspended' : isPending ? 'is-pending' : isNeedsRevision ? 'is-revision' : isRejected ? 'is-rejected' : 'is-active';
  const statusLabel = isSuspended ? 'Tạm ngưng' : isPending ? 'Chờ kiểm duyệt' : isNeedsRevision ? 'Cần chỉnh sửa' : isRejected ? 'Bị từ chối' : 'Đang hoạt động';

  const categoryName = tour.categoryId && typeof tour.categoryId === 'object'
    ? (tour.categoryId.name || '—')
    : (tour.categoryId || '—');

  const images = Array.isArray(tour.images) ? tour.images.filter(Boolean) : [];
  const currentImage = images[selectedImageIdx] || images[0] || '';

  return (
    <section className="management-page-section">
      {/* Management Heading matching Staff UI */}
      <div className="management-page-heading d-flex flex-column flex-md-row justify-content-between align-items-md-start gap-3">
        <div>
          <nav aria-label="breadcrumb" className="mb-2">
            <ol className="breadcrumb small mb-0">
              <li className="breadcrumb-item">
                <Link to="/management/my-tours" className="text-decoration-none text-muted">
                  Quản lý tour của tôi
                </Link>
              </li>
              <li className="breadcrumb-item active text-primary fw-semibold" aria-current="page">
                Chi tiết tour
              </li>
            </ol>
          </nav>
          <h1>Thiết lập chi tiết Tour</h1>
          <p>Cấu hình thông tin, lịch trình, dịch vụ, chính sách hoàn hủy và lưu ý quan trọng cho tour.</p>
        </div>
        <button type="button" className="btn btn-primary flex-shrink-0" onClick={() => setShowEditModal(true)}>
          <i className="bi bi-pencil-square me-2"></i>Cập nhật thông tin tour
        </button>
      </div>

      {/* Media Viewer Card */}
      <div className="card border-0 shadow-sm rounded-4 overflow-hidden mb-4 bg-white">
        <div className="p-3 border-bottom d-flex align-items-center justify-content-between">
          <h6 className="fw-bold text-dark mb-0 d-flex align-items-center gap-2">
            <i className="bi bi-images text-primary"></i>
            <span>Hình ảnh tour</span>
          </h6>
          {currentImage && (
            <a
              href={currentImage}
              target="_blank"
              rel="noreferrer"
              className="small text-decoration-none text-primary d-inline-flex align-items-center gap-1"
              title="Mở ảnh gốc trong tab mới"
            >
              <i className="bi bi-box-arrow-up-right"></i>
              <span>Xem ảnh gốc</span>
            </a>
          )}
        </div>

        {currentImage ? (
          <div>
            <div
              className="position-relative d-flex align-items-center justify-content-center overflow-hidden"
              style={{
                backgroundColor: '#0f172a',
                minHeight: '260px',
                maxHeight: '400px',
                height: '340px'
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
                  filter: 'blur(20px)',
                  opacity: 0.35,
                  transform: 'scale(1.1)'
                }}
              />

              {/* Foreground Uncropped Image */}
              <img
                src={currentImage}
                alt={`${tour.title} - Ảnh ${selectedImageIdx + 1}`}
                className="position-relative"
                style={{
                  maxHeight: '100%',
                  maxWidth: '100%',
                  objectFit: 'contain',
                  zIndex: 2,
                  boxShadow: '0 4px 16px rgba(0,0,0,0.3)'
                }}
              />

              {/* Navigation Arrows */}
              {images.length > 1 && (
                <>
                  <button
                    type="button"
                    className="btn btn-light btn-sm rounded-circle position-absolute top-50 start-0 translate-middle-y ms-3 shadow-sm"
                    style={{ zIndex: 3, width: '36px', height: '36px', padding: 0 }}
                    onClick={() => setSelectedImageIdx((prev) => (prev > 0 ? prev - 1 : images.length - 1))}
                    aria-label="Ảnh trước"
                  >
                    <i className="bi bi-chevron-left"></i>
                  </button>
                  <button
                    type="button"
                    className="btn btn-light btn-sm rounded-circle position-absolute top-50 end-0 translate-middle-y me-3 shadow-sm"
                    style={{ zIndex: 3, width: '36px', height: '36px', padding: 0 }}
                    onClick={() => setSelectedImageIdx((prev) => (prev < images.length - 1 ? prev + 1 : 0))}
                    aria-label="Ảnh tiếp theo"
                  >
                    <i className="bi bi-chevron-right"></i>
                  </button>
                </>
              )}

              {/* Counter Badge */}
              {images.length > 1 && (
                <div className="position-absolute bottom-0 end-0 p-3" style={{ zIndex: 3 }}>
                  <span className="badge bg-dark bg-opacity-75 text-white px-2.5 py-1.5 rounded-pill" style={{ fontSize: '0.8rem' }}>
                    {selectedImageIdx + 1} / {images.length}
                  </span>
                </div>
              )}
            </div>

            {/* Thumbnail Gallery Bar */}
            {images.length > 1 && (
              <div className="p-3 bg-light border-top d-flex gap-2 overflow-auto align-items-center">
                {images.map((imgUrl, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedImageIdx(idx)}
                    className={`btn p-0 border rounded-2 overflow-hidden flex-shrink-0 transition-all ${
                      idx === selectedImageIdx
                        ? 'border-primary border-2 shadow-sm'
                        : 'border-secondary-subtle opacity-75'
                    }`}
                    style={{
                      width: '64px',
                      height: '44px',
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
          <div className="bg-light-subtle d-flex flex-column align-items-center justify-content-center text-muted py-5" style={{ minHeight: '220px' }}>
            <i className="bi bi-image fs-1 mb-2 opacity-50"></i>
            <span className="small">Tour này chưa có hình ảnh.</span>
          </div>
        )}
      </div>

      {/* Main Single Card matching Staff ReviewTourSubmission */}
      <div className="card border-0 shadow-sm rounded-3 mb-4">
        <div className="card-body p-4">
          {/* Tour Title & Status */}
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
            <span className={`staff-tour-status ${statusClass}`}>
              <span></span>
              {statusLabel}
            </span>
          </div>

          {/* Metadata Grid (DetailItem row g-4) */}
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
              <div className="d-flex justify-content-between align-items-center mb-1">
                <div className="small text-muted text-uppercase fw-semibold" style={{ fontSize: '0.75rem', letterSpacing: '0.04em' }}>
                  Giá tour
                </div>
                <button
                  type="button"
                  className="btn btn-link btn-sm p-0 text-decoration-none fw-semibold text-primary"
                  style={{ fontSize: '0.78rem' }}
                  onClick={() => setShowPriceModal(true)}
                  title="Cập nhật giá"
                >
                  <i className="bi bi-pencil-square me-1"></i>Sửa
                </button>
              </div>
              <div className="fw-medium text-dark">
                {formatCurrency(tour.price)}
              </div>
            </div>
            <div className="col-md-6 col-xl-4">
              <DetailItem label="Số chỗ còn lại" value={tour.availableSeats} />
            </div>
            <div className="col-md-6 col-xl-4">
              <DetailItem label="Đánh giá trung bình" value={tour.averageRating ? `${tour.averageRating} / 5` : 'Chưa có'} />
            </div>
            <div className="col-md-6 col-xl-4">
              <DetailItem label="Ngày tạo" value={formatDate(tour.createdAt)} />
            </div>
            <div className="col-md-6 col-xl-4">
              <DetailItem label="Cập nhật lần cuối" value={formatDate(tour.updatedAt)} />
            </div>
          </div>

          {/* Feedback from Staff if any */}
          {tour.status === 'needs_revision' && tour.revisionNote && (
            <div className="mt-4 p-3 rounded-3 bg-warning-subtle border border-warning-subtle">
              <h3 className="h6 fw-bold text-warning-emphasis mb-2">
                <i className="bi bi-pencil-square me-1"></i>Yêu cầu chỉnh sửa từ Nhân viên:
              </h3>
              <p className="mb-0 text-dark small">{tour.revisionNote}</p>
            </div>
          )}

          {tour.status === 'rejected' && tour.rejectionReason && (
            <div className="mt-4 p-3 rounded-3 bg-danger-subtle border border-danger-subtle">
              <h3 className="h6 fw-bold text-danger mb-2">
                <i className="bi bi-x-circle me-1"></i>Lý do từ chối từ Nhân viên:
              </h3>
              <p className="mb-0 text-dark small">{tour.rejectionReason}</p>
            </div>
          )}

          {/* Tour Description */}
          {tour.description && (
            <div className="mt-4 pt-4 border-top">
              <h3 className="h5 fw-bold mb-2">Giới thiệu tour</h3>
              <p className="text-secondary lh-lg mb-0" style={{ whiteSpace: 'pre-line' }}>
                {tour.description}
              </p>
            </div>
          )}

          {/* 1. Lịch trình chi tiết từng ngày (Styling 100% like Staff Review) */}
          <div className="mt-4 pt-4 border-top">
            <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
              <h3 className="h5 fw-bold mb-0 d-flex align-items-center gap-2">
                <i className="bi bi-calendar-range text-primary"></i>
                <span>1. Lịch trình chi tiết ({tour.itinerary?.length || 0} ngày)</span>
              </h3>
              <button
                type="button"
                className="btn btn-sm btn-outline-primary d-inline-flex align-items-center gap-1.5"
                onClick={() => setShowScheduleModal(true)}
              >
                <i className="bi bi-calendar-plus"></i>
                <span>{tour.itinerary?.length > 0 ? 'Quản lý / Thêm ngày lịch trình' : 'Tạo lịch trình tour'}</span>
              </button>
            </div>

            {tour.itinerary && tour.itinerary.length > 0 ? (
              <div className="d-flex flex-column gap-3">
                {tour.itinerary.map((dayItem, idx) => (
                  <div key={idx} className="card border rounded-3 p-3 bg-light-subtle shadow-none">
                    <div className="d-flex justify-content-between align-items-start gap-2 mb-2">
                      <span className="badge bg-primary text-white rounded-pill px-3 py-1.5">
                        Ngày {dayItem.day}
                      </span>
                      {dayItem.meals && dayItem.meals.length > 0 && (
                        <div className="d-flex align-items-center gap-1.5 flex-wrap">
                          <span className="small text-muted me-1">
                            <i className="bi bi-cup-hot me-1"></i>Bữa ăn:
                          </span>
                          {dayItem.meals.map((meal, mIdx) => (
                            <span key={mIdx} className="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle rounded-pill small">
                              {meal}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <h5 className="fw-bold text-dark mb-2">{dayItem.title}</h5>
                    <p className="text-secondary small mb-0 lh-lg" style={{ whiteSpace: 'pre-line' }}>
                      {dayItem.description}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 bg-light rounded-3 border text-muted">
                <i className="bi bi-calendar-x fs-3 d-block mb-2 text-secondary"></i>
                <p className="mb-2 small">Chưa có lịch trình chi tiết cho từng ngày.</p>
                <button
                  type="button"
                  className="btn btn-sm btn-primary d-inline-flex align-items-center gap-1"
                  onClick={() => setShowScheduleModal(true)}
                >
                  <i className="bi bi-plus-circle"></i>
                  <span>Tạo lịch trình ngay (Tour Schedule)</span>
                </button>
              </div>
            )}
          </div>

          {/* 2. Dịch vụ bao gồm & không bao gồm (Styling like Staff Review) */}
          <div className="mt-4 pt-4 border-top">
            <h3 className="h5 fw-bold mb-3 d-flex align-items-center gap-2">
              <i className="bi bi-check-circle text-primary"></i>
              <span>2. Dịch vụ bao gồm & Không bao gồm</span>
            </h3>

            <div className="row g-4">
              {/* Dịch vụ bao gồm */}
              <div className="col-md-6">
                <div className="card border-0 bg-success-subtle h-100 rounded-3 p-3">
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h6 className="fw-bold text-success mb-0 d-flex align-items-center gap-2">
                      <i className="bi bi-check-circle-fill"></i>
                      <span>Dịch vụ bao gồm ({includedServices.length})</span>
                    </h6>
                  </div>

                  <div className="input-group mb-3">
                    <input
                      type="text"
                      className="form-control form-control-sm bg-white"
                      placeholder="Thêm quyền lợi/dịch vụ bao gồm..."
                      value={newIncluded}
                      onChange={(e) => setNewIncluded(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddIncluded();
                        }
                      }}
                    />
                    <button
                      type="button"
                      className="btn btn-sm btn-success px-3"
                      onClick={handleAddIncluded}
                    >
                      <i className="bi bi-plus-lg me-1"></i>Thêm
                    </button>
                  </div>

                  {includedServices.length === 0 ? (
                    <div className="text-center py-4 text-muted small bg-white rounded-3 border">
                      Chưa có dịch vụ bao gồm nào.
                    </div>
                  ) : (
                    <ul className="list-unstyled mb-0 d-flex flex-column gap-2 small">
                      {includedServices.map((inc, i) => (
                        <li key={i} className="d-flex justify-content-between align-items-center p-2 rounded-2 bg-white border border-success-subtle text-dark">
                          <div className="d-flex align-items-start gap-2 min-w-0">
                            <i className="bi bi-check-lg text-success flex-shrink-0 mt-0.5"></i>
                            <span className="text-break">{inc}</span>
                          </div>
                          <button
                            type="button"
                            className="btn btn-sm btn-link text-danger p-0 ms-2"
                            title="Xóa"
                            onClick={() => handleRemoveIncluded(i)}
                          >
                            <i className="bi bi-trash3"></i>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              {/* Dịch vụ không bao gồm */}
              <div className="col-md-6">
                <div className="card border-0 bg-danger-subtle h-100 rounded-3 p-3">
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h6 className="fw-bold text-danger mb-0 d-flex align-items-center gap-2">
                      <i className="bi bi-x-circle-fill"></i>
                      <span>Dịch vụ không bao gồm ({excludedServices.length})</span>
                    </h6>
                  </div>

                  <div className="input-group mb-3">
                    <input
                      type="text"
                      className="form-control form-control-sm bg-white"
                      placeholder="Thêm khoản chi phí tự túc..."
                      value={newExcluded}
                      onChange={(e) => setNewExcluded(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddExcluded();
                        }
                      }}
                    />
                    <button
                      type="button"
                      className="btn btn-sm btn-danger px-3"
                      onClick={handleAddExcluded}
                    >
                      <i className="bi bi-plus-lg me-1"></i>Thêm
                    </button>
                  </div>

                  {excludedServices.length === 0 ? (
                    <div className="text-center py-4 text-muted small bg-white rounded-3 border">
                      Chưa có dịch vụ không bao gồm nào.
                    </div>
                  ) : (
                    <ul className="list-unstyled mb-0 d-flex flex-column gap-2 small">
                      {excludedServices.map((exc, i) => (
                        <li key={i} className="d-flex justify-content-between align-items-center p-2 rounded-2 bg-white border border-danger-subtle text-dark">
                          <div className="d-flex align-items-start gap-2 min-w-0">
                            <i className="bi bi-x-lg text-danger flex-shrink-0 mt-0.5"></i>
                            <span className="text-break">{exc}</span>
                          </div>
                          <button
                            type="button"
                            className="btn btn-sm btn-link text-danger p-0 ms-2"
                            title="Xóa"
                            onClick={() => handleRemoveExcluded(i)}
                          >
                            <i className="bi bi-trash3"></i>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 3. Chính sách & Lưu ý (Styling like Staff Review) */}
          <div className="mt-4 pt-4 border-top">
            <h3 className="h5 fw-bold mb-3 d-flex align-items-center gap-2">
              <i className="bi bi-shield-check text-primary"></i>
              <span>3. Chính sách & Lưu ý</span>
            </h3>

            {/* Chính sách hoàn hủy */}
            <div className="card border rounded-3 p-3 mb-3 bg-white">
              <h6 className="fw-bold text-primary mb-2 d-flex align-items-center gap-2">
                <i className="bi bi-arrow-repeat"></i>
                <span>Chính sách hoàn hủy tour</span>
              </h6>
              <textarea
                className="form-control"
                rows={4}
                placeholder="Nhập chi tiết điều khoản hoàn tiền hoặc hủy vé của tour..."
                value={cancellationPolicy}
                onChange={(e) => setCancellationPolicy(e.target.value)}
              ></textarea>
            </div>

            {/* Lưu ý quan trọng */}
            <div className="card border rounded-3 p-3 bg-white">
              <h6 className="fw-bold text-warning-emphasis mb-2 d-flex align-items-center gap-2">
                <i className="bi bi-exclamation-triangle-fill text-warning"></i>
                <span>Lưu ý quan trọng</span>
              </h6>
              <textarea
                className="form-control"
                rows={4}
                placeholder="Nhập các lưu ý quan trọng mà khách hàng cần nắm trước khi tham gia tour..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              ></textarea>
            </div>
          </div>

          {/* 4. Số chỗ (UC-44 - Update Tour Capacity) */}
          <div className="mt-4 pt-4 border-top">
            <h3 className="h5 fw-bold mb-3 d-flex align-items-center gap-2">
              <i className="bi bi-people text-primary"></i>
              <span>4. Số chỗ có thể đặt</span>
            </h3>

            <div className="card border rounded-3 p-3 bg-white">
              <div className="row g-3 align-items-end">
                <div className="col-md-4">
                  <label htmlFor="tour-capacity" className="form-label fw-semibold small text-muted mb-1">
                    Số chỗ đang bán
                  </label>
                  <input
                    id="tour-capacity"
                    type="number"
                    min="0"
                    step="1"
                    className="form-control"
                    value={capacityInput}
                    onChange={(e) => setCapacityInput(e.target.value)}
                    disabled={savingCapacity}
                  />
                  <div className="form-text">
                    Số chỗ đã được xác nhận đặt tour: <strong>{confirmedSeats}</strong>. Số chỗ mới không được thấp hơn giá trị này.
                  </div>
                </div>
                <div className="col-md-auto">
                  <button
                    type="button"
                    className="btn btn-primary px-4 d-inline-flex align-items-center gap-2 fw-semibold"
                    onClick={handleSaveCapacity}
                    disabled={savingCapacity}
                  >
                    {savingCapacity ? (
                      <>
                        <span className="spinner-border spinner-border-sm" aria-hidden="true"></span>
                        <span>Đang lưu...</span>
                      </>
                    ) : (
                      <>
                        <i className="bi bi-check2-circle"></i>
                        <span>Lưu số chỗ</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* 5. Lịch khởi hành (UC-40 - Create Tour Departure) */}
          <div className="mt-4 pt-4 border-top">
            <h3 className="h5 fw-bold mb-3 d-flex align-items-center gap-2">
              <i className="bi bi-calendar2-plus text-primary"></i>
              <span>5. Lịch khởi hành</span>
            </h3>

            <div className="card border rounded-3 p-3 bg-white">
              <div className="d-flex justify-content-between align-items-center flex-wrap gap-3">
                <div>
                  <div className="fw-semibold text-dark">Tạo ngày khởi hành mới</div>
                  <small className="text-muted">
                    Mỗi lịch khởi hành là một ngày khởi đi thực tế của tour, có số chỗ và giá riêng.
                  </small>
                </div>
                <button
                  type="button"
                  className="btn btn-outline-primary px-4 d-inline-flex align-items-center gap-2 fw-semibold"
                  onClick={() => setShowDepartureModal(true)}
                >
                  <i className="bi bi-plus-circle"></i>
                  <span>Tạo lịch khởi hành</span>
                </button>
              </div>

              <hr className="my-3" />

              {loadingDepartures ? (
                <div className="text-center py-3">
                  <span className="spinner-border spinner-border-sm text-primary" aria-hidden="true"></span>
                  <span className="ms-2 text-muted small">Đang tải lịch khởi hành...</span>
                </div>
              ) : departures.length === 0 ? (
                <div className="text-center py-3 text-muted small">
                  <i className="bi bi-calendar-x d-block mb-2 fs-4"></i>
                  Tour này chưa có lịch khởi hành nào.
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-sm align-middle mb-0">
                    <thead>
                      <tr className="text-muted small">
                        <th scope="col">Ngày khởi hành</th>
                        <th scope="col">Số chỗ</th>
                        <th scope="col">Giá</th>
                        <th scope="col">Trạng thái</th>
                        <th scope="col">Ghi chú</th>
                        <th scope="col" className="text-end">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {departures.map((d) => (
                        <tr key={d._id}>
                          <td className="fw-medium">{formatDate(d.departureDate)}</td>
                          <td>{d.availableSeats}</td>
                          <td>{d.price != null ? formatCurrency(d.price) : <span className="text-muted">Theo giá tour</span>}</td>
                          <td>
                            <span className={`badge ${d.status === 'scheduled' ? 'badge-success' : 'badge-secondary'}`}>
                              {d.status === 'scheduled' ? 'Đang lên lịch' : 'Đã hủy'}
                            </span>
                          </td>
                          <td className="text-muted small">{d.note || '—'}</td>
                          <td className="text-end">
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-primary py-0 px-2"
                              title="Chỉnh sửa lịch khởi hành"
                              onClick={() => setEditingDeparture(d)}
                            >
                              <i className="bi bi-pencil me-1"></i>Sửa
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Action Bar ở cuối trang chuẩn Staff UI */}
          <div className="mt-4 pt-4 border-top d-flex justify-content-between align-items-center flex-wrap gap-3">
            <Link to="/management/my-tours" className="btn btn-outline-secondary d-inline-flex align-items-center gap-2">
              <i className="bi bi-arrow-left"></i>
              <span>Quay lại danh sách tour</span>
            </Link>
            <button
              type="button"
              className="btn btn-primary px-4 py-2.5 d-inline-flex align-items-center gap-2 shadow-sm fw-semibold"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? (
                <>
                  <span className="spinner-border spinner-border-sm" aria-hidden="true"></span>
                  <span>Đang lưu...</span>
                </>
              ) : (
                <>
                  <i className="bi bi-check2-circle fs-5"></i>
                  <span>Lưu tất cả chi tiết tour</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Tour Schedule Modal */}
      <TourScheduleModal
        open={showScheduleModal}
        onClose={() => setShowScheduleModal(false)}
        tour={tour}
        onUpdated={loadTourDetails}
      />

      {/* Create Tour Departure Modal (UC-40) */}
      <CreateTourDepartureModal
        open={showDepartureModal}
        onClose={() => setShowDepartureModal(false)}
        tour={tour}
        onCreated={() => loadDepartures()}
      />

      {/* Edit Tour Price Modal (UC-46) */}
      <EditTourPriceModal
        open={showPriceModal}
        onClose={() => setShowPriceModal(false)}
        tour={tour}
        onUpdated={(newPrice) => {
          setTour((prev) => ({ ...prev, price: newPrice }));
        }}
      />

      {/* Edit Departure Slot Modal (Chỉnh sửa lịch khởi hành) */}
      <EditDepartureSlotModal
        open={!!editingDeparture}
        onClose={() => setEditingDeparture(null)}
        departure={editingDeparture}
        tourPrice={tour?.price}
        onUpdated={() => loadDepartures()}
      />

      {showEditModal && (
        <TourFormModal
          mode="update"
          tour={tour}
          onClose={() => setShowEditModal(false)}
          onSaved={(updatedTour) => setTour(updatedTour)}
        />
      )}

    </section>
  );
}

