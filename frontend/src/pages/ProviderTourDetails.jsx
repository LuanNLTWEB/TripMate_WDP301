import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { tourApi, departureApi } from '../services/api';
import { useToast } from '../hooks/useToast';
import TourScheduleModal from './TourScheduleModal';
import EditTourPriceModal from './EditTourPriceModal';
import TourFormModal from './TourFormModal';
import CreateTourDepartureModal from './CreateTourDepartureModal';
import EditDepartureSlotModal from './EditDepartureSlotModal';
import CancelDepartureModal from './CancelDepartureModal';
import TourDetailAccordionSection from '../components/management/TourDetailAccordionSection';
import ProviderTourStickyBar from '../components/management/ProviderTourStickyBar';
import {
  INITIAL_OPEN_SECTIONS,
  areAllVisibleSectionsOpen,
  executeUnifiedSave,
  getDirtyState,
  getTourCategoryName,
  getTourStatusMeta,
  normalizeTourRecord,
  toggleVisibleSections,
  validateCapacityInput
} from '../utils/providerTourDetailsHelpers';

const formatCurrency = (value) => new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0
}).format(value || 0);

const formatDate = (value) => (value ? new Date(value).toLocaleString('vi-VN') : '—');

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

/**
 * Editable list column for Included or Excluded tour services.
 */
function ServiceListCard({
  title,
  icon,
  variant,
  placeholder,
  emptyText,
  items,
  inputValue,
  onInputChange,
  onAdd,
  onRemove
}) {
  const isSuccess = variant === 'success';
  const bgClass = isSuccess ? 'bg-success-subtle' : 'bg-danger-subtle';
  const textClass = isSuccess ? 'text-success' : 'text-danger';
  const btnClass = isSuccess ? 'btn-success' : 'btn-danger';
  const itemBorderClass = isSuccess ? 'border-success-subtle' : 'border-danger-subtle';
  const itemIconClass = isSuccess ? 'bi-check-lg text-success' : 'bi-x-lg text-danger';

  return (
    <div className={`card border-0 ${bgClass} h-100 rounded-3 p-3`}>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h6 className={`fw-bold ${textClass} mb-0 d-flex align-items-center gap-2`}>
          <i className={`bi ${icon}`}></i>
          <span>{title} ({items.length})</span>
        </h6>
      </div>

      <div className="input-group mb-3">
        <input
          type="text"
          className="form-control form-control-sm bg-white"
          placeholder={placeholder}
          value={inputValue}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              onAdd();
            }
          }}
        />
        <button
          type="button"
          className={`btn btn-sm ${btnClass} px-3`}
          onClick={onAdd}
        >
          <i className="bi bi-plus-lg me-1"></i>Thêm
        </button>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-4 text-muted small bg-white rounded-3 border">
          {emptyText}
        </div>
      ) : (
        <ul className="list-unstyled mb-0 d-flex flex-column gap-2 small">
          {items.map((item, idx) => (
            <li
              key={`${item}-${idx}`}
              className={`d-flex justify-content-between align-items-center p-2 rounded-2 bg-white border ${itemBorderClass} text-dark`}
            >
              <div className="d-flex align-items-start gap-2 min-w-0">
                <i className={`bi ${itemIconClass} flex-shrink-0 mt-0.5`}></i>
                <span className="text-break">{item}</span>
              </div>
              <button
                type="button"
                className="btn btn-sm btn-link text-danger p-0 ms-2"
                title="Xóa"
                onClick={() => onRemove(idx)}
              >
                <i className="bi bi-trash3"></i>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function ProviderTourDetails() {
  const { id } = useParams();
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [savingAll, setSavingAll] = useState(false);
  const [savingCapacity, setSavingCapacity] = useState(false);
  const [error, setError] = useState('');
  const [tour, setTour] = useState(null);

  // Navigation & collapsible sections state
  const [activeTab, setActiveTab] = useState('overview');
  const [openSections, setOpenSections] = useState(INITIAL_OPEN_SECTIONS);

  // Modals state
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showPriceModal, setShowPriceModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDepartureModal, setShowDepartureModal] = useState(false);
  const [selectedImageIdx, setSelectedImageIdx] = useState(0);
  const [editingDeparture, setEditingDeparture] = useState(null);
  const [cancellingDeparture, setCancellingDeparture] = useState(null);

  // Form states (STT 45 - Set Tour Details)
  const [includedServices, setIncludedServices] = useState([]);
  const [excludedServices, setExcludedServices] = useState([]);
  const [cancellationPolicy, setCancellationPolicy] = useState('');
  const [notes, setNotes] = useState('');
  const [newIncluded, setNewIncluded] = useState('');
  const [newExcluded, setNewExcluded] = useState('');

  // Capacity editor (UC-45 - Update Tour Capacity)
  const [capacityInput, setCapacityInput] = useState('');
  const [confirmedSeats, setConfirmedSeats] = useState(0);

  // Departures (UC-40 - Create Tour Departure)
  const [departures, setDepartures] = useState([]);
  const [loadingDepartures, setLoadingDepartures] = useState(false);
  const [exportingId, setExportingId] = useState(null);

  const dirtyState = useMemo(() => getDirtyState({
    tour,
    includedServices,
    excludedServices,
    cancellationPolicy,
    notes,
    capacityInput
  }), [tour, includedServices, excludedServices, cancellationPolicy, notes, capacityInput]);

  // Keep latest dirty flags accessible inside async refreshes after sub-modals close
  const dirtyRef = useRef(dirtyState);
  useEffect(() => {
    dirtyRef.current = dirtyState;
  }, [dirtyState]);

  const syncDraftFromTour = useCallback((rawTour, { preserveDirty = false } = {}) => {
    const data = normalizeTourRecord(rawTour);
    setTour(data);

    const currentDirty = dirtyRef.current;
    if (!preserveDirty || !currentDirty.isDetailsDirty) {
      setIncludedServices(data?.includedServices || []);
      setExcludedServices(data?.excludedServices || []);
      setCancellationPolicy(data?.cancellationPolicy || '');
      setNotes(data?.notes || '');
    }
    if (!preserveDirty || !currentDirty.isCapacityDirty) {
      setCapacityInput(String(data?.availableSeats ?? 0));
    }
  }, []);

  const fetchTourDetails = useCallback(async ({ preserveDirty = false } = {}) => {
    try {
      const res = await tourApi.getProviderById(id);
      syncDraftFromTour(res.data, { preserveDirty });
      setError('');
    } catch (err) {
      const msg = err.message || 'Không thể tải thông tin tour.';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [id, syncDraftFromTour, toast]);

  const loadDepartures = useCallback(async () => {
    setLoadingDepartures(true);
    try {
      const res = await departureApi.listByTour(id);
      setDepartures(res.data || []);
    } catch {
      setDepartures([]);
    } finally {
      setLoadingDepartures(false);
    }
  }, [id]);

  useEffect(() => {
    let active = true;
    tourApi.getProviderById(id)
      .then((res) => {
        if (!active) return;
        syncDraftFromTour(res.data);
        setError('');
      })
      .catch((err) => {
        if (!active) return;
        const msg = err.message || 'Không thể tải thông tin tour.';
        setError(msg);
        toast.error(msg);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    departureApi.listByTour(id)
      .then((res) => {
        if (active) setDepartures(res.data || []);
      })
      .catch(() => {
        if (active) setDepartures([]);
      });

    return () => {
      active = false;
    };
  }, [id, syncDraftFromTour, toast]);

  // Warn user before closing/reloading browser tab with unsaved changes
  useEffect(() => {
    if (!dirtyState.hasAnyDirty) return undefined;
    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [dirtyState.hasAnyDirty]);

  const handleExportManifest = async (departure) => {
    setExportingId(departure._id);
    try {
      const blob = await departureApi.exportManifest(departure._id);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `quan-ly-khach-hang-tour-${new Date(departure.departureDate).toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      toast.success('Đã xuất danh sách quản lý khách hàng thành công');
    } catch (err) {
      toast.error(err.message || 'Không thể xuất danh sách đoàn khách.');
    } finally {
      setExportingId(null);
    }
  };

  // START UC-45 Update Tour Capacity
  const handleSaveCapacity = async () => {
    const validation = validateCapacityInput(capacityInput);
    if (!validation.valid) {
      toast.error(validation.error);
      return;
    }

    setSavingCapacity(true);
    try {
      const res = await tourApi.updateCapacity(id, validation.parsed);
      const nextSeats = res.data?.availableSeats ?? validation.parsed;
      toast.success(res.message || 'Cập nhật số chỗ thành công!');
      setConfirmedSeats(res.data?.confirmedSeats ?? 0);
      setTour((current) => (current ? { ...current, availableSeats: nextSeats } : current));
      setCapacityInput(String(nextSeats));
    } catch (err) {
      toast.error(err.message || 'Không thể cập nhật số chỗ tour.');
    } finally {
      setSavingCapacity(false);
    }
  };
  // END UC-45 Update Tour Capacity

  // Unified save for all direct inline edits (Details + Capacity) triggered from Tour Bar or Footer
  const handleSaveAll = async () => {
    if (!dirtyState.hasAnyDirty) {
      toast.info('Chưa có thay đổi nào cần lưu.');
      return;
    }

    setSavingAll(true);
    try {
      const result = await executeUnifiedSave({
        tourId: id,
        currentTour: tour,
        dirtyState,
        detailsPayload: {
          includedServices,
          excludedServices,
          cancellationPolicy: cancellationPolicy.trim(),
          notes: notes.trim()
        },
        capacityInput,
        tourApi
      });

      if (result.confirmedSeats !== null) {
        setConfirmedSeats(result.confirmedSeats);
      }

      if (result.didSave && result.updatedTour) {
        setTour(result.updatedTour);
        if (result.detailsSaved) {
          setIncludedServices(result.updatedTour.includedServices || []);
          setExcludedServices(result.updatedTour.excludedServices || []);
          setCancellationPolicy(result.updatedTour.cancellationPolicy || '');
          setNotes(result.updatedTour.notes || '');
        }
        if (result.capacitySaved) {
          setCapacityInput(String(result.updatedTour.availableSeats ?? 0));
        }
      }

      result.messages.forEach((msg) => toast.success(msg));
      result.errors.forEach((errMsg) => toast.error(errMsg));
    } finally {
      setSavingAll(false);
    }
  };

  // Included / Excluded service handlers
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

  const toggleSection = (key) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleToggleAllVisible = () => {
    setOpenSections((prev) => toggleVisibleSections(prev, activeTab));
  };

  const handleJumpToGallery = () => {
    setActiveTab('overview');
    setOpenSections((prev) => ({ ...prev, media: true }));
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
        <div className="card border-0 shadow-sm rounded-4 p-5 text-center mx-auto" style={{ maxWidth: '500px' }}>
          <i className="bi bi-compass text-muted fs-1 mb-3"></i>
          <h5 className="fw-bold mb-2">Không tìm thấy tour</h5>
          <p className="text-muted small mb-4">{error || 'Tour không tồn tại hoặc đã bị xóa.'}</p>
          <Link to="/management/my-tours" className="btn btn-outline-primary d-inline-flex align-items-center justify-content-center gap-2">
            <i className="bi bi-arrow-left"></i>
            <span>Quay lại danh sách tour</span>
          </Link>
        </div>
      </section>
    );
  }

  const { statusClass, statusLabel } = getTourStatusMeta(tour.status);
  const categoryName = getTourCategoryName(tour.categoryId);
  const images = Array.isArray(tour.images) ? tour.images.filter(Boolean) : [];
  const safeImageIdx = selectedImageIdx < images.length ? selectedImageIdx : 0;
  const currentImage = images[safeImageIdx] || '';
  const itineraryDays = Array.isArray(tour.itinerary) ? tour.itinerary : [];
  const scheduledDeparturesCount = departures.filter((d) => d.status === 'scheduled').length;
  const allVisibleOpen = areAllVisibleSectionsOpen(openSections, activeTab);
  const showOverview = activeTab === 'overview' || activeTab === 'all';
  const showContent = activeTab === 'content' || activeTab === 'all';
  const showOperations = activeTab === 'operations' || activeTab === 'all';

  const tabMeta = {
    overview: `${images.length} ảnh`,
    content: `${itineraryDays.length} ngày`,
    operations: `${departures.length} đợt`,
    all: '7 mục'
  };

  return (
    <section className="management-page-section">
      {/* Compact Page Heading */}
      <div className="management-page-heading mb-3">
        <nav aria-label="breadcrumb" className="mb-1">
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
        <h1 className="mb-1">Thiết lập chi tiết Tour</h1>
        <p className="mb-0">Chuyển đổi nhanh từng nhóm thông tin, chỉnh sửa trực tiếp và đồng bộ thay đổi.</p>
      </div>

      {/* A. Compact 2-Column Tour Summary Card */}
      <div className="provider-tour-summary card border-0 shadow-sm rounded-4 mb-3 bg-white">
        <div className="card-body p-3 p-md-4">
          <div className="row g-3 align-items-center">
            {/* Left Thumbnail */}
            <div className="col-12 col-sm-auto">
              <button
                type="button"
                onClick={handleJumpToGallery}
                className="provider-tour-thumb-box p-0 border position-relative overflow-hidden rounded-3 d-block"
                title="Xem toàn bộ thư viện ảnh trong tab Tổng quan"
              >
                {currentImage ? (
                  <img
                    src={currentImage}
                    alt={tour.title}
                    className="w-100 h-100"
                    style={{ objectFit: 'cover' }}
                  />
                ) : (
                  <div className="w-100 h-100 bg-light d-flex flex-column align-items-center justify-content-center text-muted">
                    <i className="bi bi-image fs-2 opacity-50"></i>
                    <span className="small">Chưa có ảnh</span>
                  </div>
                )}
                <span className="provider-tour-thumb-count">
                  <i className="bi bi-images me-1"></i>
                  {images.length} ảnh
                </span>
              </button>
            </div>

            {/* Right Key Info */}
            <div className="col min-w-0">
              <div className="d-flex justify-content-between align-items-start gap-2 flex-wrap mb-2">
                <div className="min-w-0">
                  <div className="d-flex align-items-center gap-2 flex-wrap mb-1">
                    <h2 className="h4 fw-bold text-dark mb-0 text-break">{tour.title}</h2>
                    <span className={`staff-tour-status ${statusClass}`}>
                      <span></span>
                      {statusLabel}
                    </span>
                  </div>
                  <div className="text-muted small d-flex align-items-center gap-3 flex-wrap">
                    <span>
                      <i className="bi bi-geo-alt-fill text-danger me-1"></i>
                      {tour.departureLocation
                        ? `${tour.departureLocation} → ${tour.destinationLocation || tour.location}`
                        : (tour.destinationLocation || tour.location || '—')}
                    </span>
                    <span>
                      <i className="bi bi-folder2-open text-primary me-1"></i>
                      {categoryName}
                    </span>
                  </div>
                </div>
              </div>

              {/* 3 Highlight Metrics */}
              <div className="row g-2 pt-2 border-top">
                <div className="col-6 col-md-4">
                  <div className="provider-tour-metric">
                    <div className="provider-tour-metric-label">Giá tour</div>
                    <div className="d-flex align-items-center gap-2">
                      <span className="fw-bold text-primary">{formatCurrency(tour.price)}</span>
                      <button
                        type="button"
                        className="btn btn-link btn-sm p-0 text-decoration-none"
                        onClick={() => setShowPriceModal(true)}
                        title="Cập nhật giá tour"
                      >
                        <i className="bi bi-pencil-square small"></i>
                      </button>
                    </div>
                  </div>
                </div>
                <div className="col-6 col-md-4">
                  <div className="provider-tour-metric">
                    <div className="provider-tour-metric-label">Thời lượng & Lịch trình</div>
                    <div className="fw-semibold text-dark">
                      {tour.duration || '—'}
                      <span className="text-muted small fw-normal ms-1">({itineraryDays.length} ngày đã lập)</span>
                    </div>
                  </div>
                </div>
                <div className="col-12 col-md-4">
                  <div className="provider-tour-metric">
                    <div className="provider-tour-metric-label">Số chỗ & Khởi hành</div>
                    <div className="fw-semibold text-dark">
                      {tour.availableSeats ?? 0} chỗ
                      <span className="text-muted small fw-normal ms-1">• {scheduledDeparturesCount} đợt mở</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Staff Review Feedback Alerts */}
          {tour.status === 'needs_revision' && tour.revisionNote && (
            <div className="mt-3 p-3 rounded-3 bg-warning-subtle border border-warning-subtle">
              <h3 className="h6 fw-bold text-warning-emphasis mb-1">
                <i className="bi bi-pencil-square me-1"></i>Yêu cầu chỉnh sửa từ Nhân viên:
              </h3>
              <p className="mb-0 text-dark small">{tour.revisionNote}</p>
            </div>
          )}

          {tour.status === 'rejected' && tour.rejectionReason && (
            <div className="mt-3 p-3 rounded-3 bg-danger-subtle border border-danger-subtle">
              <h3 className="h6 fw-bold text-danger mb-1">
                <i className="bi bi-x-circle me-1"></i>Lý do từ chối từ Nhân viên:
              </h3>
              <p className="mb-0 text-dark small">{tour.rejectionReason}</p>
            </div>
          )}
        </div>
      </div>

      {/* B. Sticky Tour Action Bar (Left Tabs + Right Hover-Expand Icon Bar + Unified Save) */}
      <ProviderTourStickyBar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        tabMeta={tabMeta}
        dirtyState={dirtyState}
        allVisibleOpen={allVisibleOpen}
        onToggleAllVisible={handleToggleAllVisible}
        onEditInfo={() => setShowEditModal(true)}
        onEditPrice={() => setShowPriceModal(true)}
        onOpenSchedule={() => setShowScheduleModal(true)}
        onCreateDeparture={() => setShowDepartureModal(true)}
        onSaveAll={handleSaveAll}
        savingAll={savingAll}
      />

      {/* C. Tabbed + Collapsible Accordion Workspace */}
      {showOverview && (
        <>
          {/* Section: Full Media Gallery */}
          <TourDetailAccordionSection
            id="section-media"
            title="Hình ảnh tour"
            icon="bi-images"
            isOpen={openSections.media}
            onToggle={() => toggleSection('media')}
            summaryBadges={[{
              text: images.length > 0 ? `${images.length} hình ảnh` : 'Chưa có ảnh',
              className: images.length > 0
                ? 'bg-primary-subtle text-primary border border-primary-subtle'
                : 'bg-warning-subtle text-warning-emphasis border border-warning-subtle'
            }]}
            headerActions={currentImage && (
              <a
                href={currentImage}
                target="_blank"
                rel="noreferrer"
                className="btn btn-sm btn-outline-primary py-1 px-2 d-inline-flex align-items-center gap-1"
                title="Mở ảnh gốc trong tab mới"
              >
                <i className="bi bi-box-arrow-up-right"></i>
                <span className="d-none d-sm-inline">Xem ảnh gốc</span>
              </a>
            )}
          >
            {currentImage ? (
              <div className="rounded-3 overflow-hidden border">
                <div
                  className="position-relative d-flex align-items-center justify-content-center overflow-hidden"
                  style={{
                    backgroundColor: '#0f172a',
                    minHeight: '240px',
                    maxHeight: '380px',
                    height: '320px'
                  }}
                >
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
                  <img
                    src={currentImage}
                    alt={`${tour.title} - Ảnh ${safeImageIdx + 1}`}
                    className="position-relative"
                    style={{
                      maxHeight: '100%',
                      maxWidth: '100%',
                      objectFit: 'contain',
                      zIndex: 2,
                      boxShadow: '0 4px 16px rgba(0,0,0,0.3)'
                    }}
                  />
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
                      <div className="position-absolute bottom-0 end-0 p-3" style={{ zIndex: 3 }}>
                        <span className="badge bg-dark bg-opacity-75 text-white px-2.5 py-1.5 rounded-pill" style={{ fontSize: '0.8rem' }}>
                          {safeImageIdx + 1} / {images.length}
                        </span>
                      </div>
                    </>
                  )}
                </div>

                {images.length > 1 && (
                  <div className="p-3 bg-light border-top d-flex gap-2 overflow-auto align-items-center">
                    {images.map((imgUrl, idx) => (
                      <button
                        key={`${imgUrl}-${idx}`}
                        type="button"
                        onClick={() => setSelectedImageIdx(idx)}
                        className={`btn p-0 border rounded-2 overflow-hidden flex-shrink-0 transition-all ${
                          idx === safeImageIdx
                            ? 'border-primary border-2 shadow-sm'
                            : 'border-secondary-subtle opacity-75'
                        }`}
                        style={{
                          width: '64px',
                          height: '44px',
                          transform: idx === safeImageIdx ? 'scale(1.05)' : 'scale(1)'
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
              <div className="bg-light-subtle rounded-3 border d-flex flex-column align-items-center justify-content-center text-muted py-5" style={{ minHeight: '200px' }}>
                <i className="bi bi-image fs-1 mb-2 opacity-50"></i>
                <span className="small">Tour này chưa có hình ảnh.</span>
              </div>
            )}
          </TourDetailAccordionSection>

          {/* Section: Metadata & Description */}
          <TourDetailAccordionSection
            id="section-metadata"
            title="Thông tin cơ bản & Giới thiệu tour"
            icon="bi-info-circle"
            isOpen={openSections.metadata}
            onToggle={() => toggleSection('metadata')}
            summaryBadges={[{ text: categoryName, className: 'bg-light text-dark border' }]}
            headerActions={(
              <button
                type="button"
                className="btn btn-sm btn-outline-primary py-1 px-2 d-inline-flex align-items-center gap-1"
                onClick={() => setShowEditModal(true)}
              >
                <i className="bi bi-pencil-square"></i>
                <span className="d-none d-sm-inline">Cập nhật</span>
              </button>
            )}
          >
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

            {tour.description && (
              <div className="mt-4 pt-4 border-top">
                <h4 className="h6 fw-bold mb-2">Giới thiệu tour</h4>
                <p className="text-secondary lh-lg mb-0" style={{ whiteSpace: 'pre-line' }}>
                  {tour.description}
                </p>
              </div>
            )}
          </TourDetailAccordionSection>
        </>
      )}

      {showContent && (
        <>
          {/* Section 1: Detailed Itinerary */}
          <TourDetailAccordionSection
            id="section-itinerary"
            title="1. Lịch trình chi tiết từng ngày"
            icon="bi-calendar-range"
            isOpen={openSections.itinerary}
            onToggle={() => toggleSection('itinerary')}
            summaryBadges={[{
              text: itineraryDays.length > 0 ? `${itineraryDays.length} ngày` : 'Chưa lập lịch trình',
              className: itineraryDays.length > 0
                ? 'bg-primary-subtle text-primary border border-primary-subtle'
                : 'bg-warning-subtle text-warning-emphasis border border-warning-subtle'
            }]}
            headerActions={(
              <button
                type="button"
                className="btn btn-sm btn-outline-primary py-1 px-2 d-inline-flex align-items-center gap-1"
                onClick={() => setShowScheduleModal(true)}
              >
                <i className="bi bi-calendar-plus"></i>
                <span>{itineraryDays.length > 0 ? 'Quản lý lịch trình' : 'Tạo lịch trình'}</span>
              </button>
            )}
          >
            {itineraryDays.length > 0 ? (
              <div className="d-flex flex-column gap-3">
                {itineraryDays.map((dayItem, idx) => (
                  <div key={dayItem._id || idx} className="card border rounded-3 p-3 bg-light-subtle shadow-none">
                    <div className="d-flex justify-content-between align-items-start gap-2 mb-2 flex-wrap">
                      <span className="badge bg-primary text-white rounded-pill px-3 py-1.5">
                        Ngày {dayItem.day}
                      </span>
                      {dayItem.meals && dayItem.meals.length > 0 && (
                        <div className="d-flex align-items-center gap-2 flex-wrap">
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
          </TourDetailAccordionSection>

          {/* Section 2: Included & Excluded Services */}
          <TourDetailAccordionSection
            id="section-services"
            title="2. Dịch vụ bao gồm & Không bao gồm"
            icon="bi-check-circle"
            iconVariant="success"
            isOpen={openSections.services}
            onToggle={() => toggleSection('services')}
            isDirty={dirtyState.isDetailsDirty}
            summaryBadges={[
              {
                text: `${includedServices.length} bao gồm`,
                className: 'bg-success-subtle text-success border border-success-subtle'
              },
              {
                text: `${excludedServices.length} không bao gồm`,
                className: 'bg-danger-subtle text-danger border border-danger-subtle'
              }
            ]}
          >
            <div className="row g-4">
              <div className="col-md-6">
                <ServiceListCard
                  title="Dịch vụ bao gồm"
                  icon="bi-check-circle-fill"
                  variant="success"
                  placeholder="Thêm quyền lợi/dịch vụ bao gồm..."
                  emptyText="Chưa có dịch vụ bao gồm nào."
                  items={includedServices}
                  inputValue={newIncluded}
                  onInputChange={setNewIncluded}
                  onAdd={handleAddIncluded}
                  onRemove={(i) => setIncludedServices((prev) => prev.filter((_, idx) => idx !== i))}
                />
              </div>
              <div className="col-md-6">
                <ServiceListCard
                  title="Dịch vụ không bao gồm"
                  icon="bi-x-circle-fill"
                  variant="danger"
                  placeholder="Thêm khoản chi phí tự túc..."
                  emptyText="Chưa có dịch vụ không bao gồm nào."
                  items={excludedServices}
                  inputValue={newExcluded}
                  onInputChange={setNewExcluded}
                  onAdd={handleAddExcluded}
                  onRemove={(i) => setExcludedServices((prev) => prev.filter((_, idx) => idx !== i))}
                />
              </div>
            </div>
          </TourDetailAccordionSection>

          {/* Section 3: Policies & Notes */}
          <TourDetailAccordionSection
            id="section-policies"
            title="3. Chính sách hoàn hủy & Lưu ý"
            icon="bi-shield-check"
            iconVariant="warning"
            isOpen={openSections.policies}
            onToggle={() => toggleSection('policies')}
            isDirty={dirtyState.isDetailsDirty}
            summaryBadges={[{
              text: cancellationPolicy.trim() || notes.trim() ? 'Đã thiết lập' : 'Chưa nhập',
              className: cancellationPolicy.trim() || notes.trim()
                ? 'bg-primary-subtle text-primary border border-primary-subtle'
                : 'bg-light text-muted border'
            }]}
          >
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
          </TourDetailAccordionSection>
        </>
      )}

      {showOperations && (
        <>
          {/* Section 4: Capacity (UC-45) */}
          <TourDetailAccordionSection
            id="section-capacity"
            title="4. Số chỗ có thể đặt"
            icon="bi-people"
            iconVariant="info"
            isOpen={openSections.capacity}
            onToggle={() => toggleSection('capacity')}
            isDirty={dirtyState.isCapacityDirty}
            summaryBadges={[{
              text: `${tour.availableSeats ?? 0} chỗ mặc định`,
              className: 'bg-light text-dark border'
            }]}
          >
            <div>
              <label htmlFor="tour-capacity" className="form-label fw-semibold small text-muted mb-1">
                Số chỗ đang bán
              </label>
              <div className="d-flex flex-column flex-sm-row align-items-stretch align-items-sm-center gap-2">
                <input
                  id="tour-capacity"
                  type="number"
                  min="0"
                  step="1"
                  className="form-control"
                  style={{ maxWidth: '280px' }}
                  value={capacityInput}
                  onChange={(e) => setCapacityInput(e.target.value)}
                  disabled={savingCapacity || savingAll}
                />
                <button
                  type="button"
                  className="btn btn-primary px-4 d-inline-flex align-items-center justify-content-center gap-2 fw-semibold flex-shrink-0"
                  onClick={handleSaveCapacity}
                  disabled={savingCapacity || savingAll || !dirtyState.isCapacityDirty}
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
              <div className="form-text mt-2">
                Số chỗ đã được xác nhận đặt tour: <strong>{confirmedSeats}</strong>. Số chỗ mới không được thấp hơn giá trị này.
              </div>
            </div>
          </TourDetailAccordionSection>

          {/* Section 5: Tour Departures (UC-40) */}
          <TourDetailAccordionSection
            id="section-departures"
            title="5. Lịch khởi hành & Danh sách đoàn"
            icon="bi-calendar2-plus"
            isOpen={openSections.departures}
            onToggle={() => toggleSection('departures')}
            summaryBadges={[
              {
                text: `${scheduledDeparturesCount} đang mở`,
                className: scheduledDeparturesCount > 0
                  ? 'bg-success-subtle text-success border border-success-subtle'
                  : 'bg-light text-muted border'
              },
              {
                text: `Tổng ${departures.length} đợt`,
                className: 'bg-light text-secondary border'
              }
            ]}
            headerActions={(
              <button
                type="button"
                className="btn btn-sm btn-outline-primary py-1 px-2 d-inline-flex align-items-center gap-1 fw-semibold"
                onClick={() => setShowDepartureModal(true)}
              >
                <i className="bi bi-plus-circle"></i>
                <span>Tạo lịch khởi hành</span>
              </button>
            )}
          >
            <div className="d-flex justify-content-between align-items-center flex-wrap gap-3 mb-3">
              <div>
                <div className="fw-semibold text-dark">Quản lý các đợt khởi hành thực tế</div>
                <small className="text-muted">
                  Mỗi lịch khởi hành là một ngày khởi đi thực tế của tour, có số chỗ và giá riêng.
                </small>
              </div>
            </div>

            {loadingDepartures ? (
              <div className="text-center py-3">
                <span className="spinner-border spinner-border-sm text-primary" aria-hidden="true"></span>
                <span className="ms-2 text-muted small">Đang tải lịch khởi hành...</span>
              </div>
            ) : departures.length === 0 ? (
              <div className="text-center py-4 bg-light rounded-3 border text-muted small">
                <i className="bi bi-calendar-x d-block mb-2 fs-4"></i>
                <p className="mb-2">Tour này chưa có lịch khởi hành nào.</p>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-primary d-inline-flex align-items-center gap-1"
                  onClick={() => setShowDepartureModal(true)}
                >
                  <i className="bi bi-plus-circle"></i>
                  <span>Tạo lịch khởi hành đầu tiên</span>
                </button>
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
                          <span className={`management-badge ${d.status === 'scheduled' ? 'badge-success' : 'badge-danger'}`}>
                            <span className="management-badge-dot"></span>
                            {d.status === 'scheduled' ? 'Đang lên lịch' : 'Đã hủy'}
                          </span>
                        </td>
                        <td className="text-muted small">{d.note || '—'}</td>
                        <td className="text-end">
                          {d.status === 'scheduled' ? (
                            <>
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-primary py-0 px-2"
                                title="Chỉnh sửa lịch khởi hành"
                                onClick={() => setEditingDeparture(d)}
                              >
                                <i className="bi bi-pencil me-1"></i>Sửa
                              </button>
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-danger py-0 px-2 ms-2"
                                title="Hủy đợt khởi hành này"
                                onClick={() => setCancellingDeparture(d)}
                              >
                                <i className="bi bi-x-circle me-1"></i>Hủy lịch
                              </button>
                            </>
                          ) : (
                            <span className="text-danger small fst-italic me-2">
                              {d.cancelReason ? `Đã hủy: ${d.cancelReason}` : 'Đã hủy'}
                            </span>
                          )}
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-success py-0 px-2 ms-2"
                            title="Xuất danh sách đoàn khách ra file Excel"
                            onClick={() => handleExportManifest(d)}
                            disabled={exportingId === d._id}
                          >
                            <i className="bi bi-file-earmark-spreadsheet me-1"></i>
                            {exportingId === d._id ? 'Đang xuất...' : 'Xuất danh sách đoàn'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TourDetailAccordionSection>
        </>
      )}

      {/* Tour Schedule Modal */}
      <TourScheduleModal
        open={showScheduleModal}
        onClose={() => setShowScheduleModal(false)}
        tour={tour}
        onUpdated={() => fetchTourDetails({ preserveDirty: true })}
      />

      {/* Create Tour Departure Modal (UC-40) */}
      <CreateTourDepartureModal
        open={showDepartureModal}
        onClose={() => setShowDepartureModal(false)}
        tour={tour}
        onCreated={loadDepartures}
      />

      {/* Edit Tour Price Modal (UC-46) */}
      <EditTourPriceModal
        open={showPriceModal}
        onClose={() => setShowPriceModal(false)}
        tour={tour}
        onUpdated={(newPrice) => {
          setTour((prev) => (prev ? { ...prev, price: newPrice } : prev));
        }}
      />

      {/* Edit Departure Slot Modal */}
      <EditDepartureSlotModal
        open={!!editingDeparture}
        onClose={() => setEditingDeparture(null)}
        departure={editingDeparture}
        tourPrice={tour?.price}
        onUpdated={loadDepartures}
      />

      {/* Cancel Tour Departure Modal (UC-43) */}
      <CancelDepartureModal
        open={!!cancellingDeparture}
        onClose={() => setCancellingDeparture(null)}
        departure={cancellingDeparture}
        tourTitle={tour?.title}
        onCancelled={loadDepartures}
      />

      {showEditModal && (
        <TourFormModal
          mode="update"
          tour={tour}
          onClose={() => setShowEditModal(false)}
          onSaved={(updatedTour) => syncDraftFromTour(updatedTour, { preserveDirty: true })}
        />
      )}
    </section>
  );
}
