import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { tourApi } from '../services/api';
import { useToast } from '../hooks/useToast';

const formatCurrency = (value) => new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0
}).format(value || 0);

const formatDate = (value) => value ? new Date(value).toLocaleString('vi-VN') : '—';



function ReviewTourSubmission() {
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const fromSource = searchParams.get('from');
  const toast = useToast();
  const [tour, setTour] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // State cho modal revision
  const [showRevisionModal, setShowRevisionModal] = useState(false);
  const [revisionNote, setRevisionNote] = useState('');
  const [isSubmittingRevision, setIsSubmittingRevision] = useState(false);
  const [revisionError, setRevisionError] = useState('');

  // State cho modal approve
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [isSubmittingApprove, setIsSubmittingApprove] = useState(false);

  // State cho modal reject
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [isSubmittingReject, setIsSubmittingReject] = useState(false);

  // State cho media viewer & suspend
  const [selectedImageIdx, setSelectedImageIdx] = useState(0);
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [suspendReason, setSuspendReason] = useState('');
  const [isSubmittingSuspend, setIsSubmittingSuspend] = useState(false);

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

  useEffect(() => {
    if (tour && !fromSource) {
      if (tour.status === 'pending' || tour.status === 'needs_revision') {
        setSearchParams({ from: 'pending-tours' }, { replace: true });
      } else {
        setSearchParams({ from: 'tours' }, { replace: true });
      }
    }
  }, [tour, fromSource, setSearchParams]);

  const handleOpenRevisionModal = () => {
    setRevisionNote('');
    setRevisionError('');
    setShowRevisionModal(true);
  };

  const handleCloseRevisionModal = () => {
    setShowRevisionModal(false);
    setRevisionNote('');
    setRevisionError('');
  };

  const handleSubmitRevision = async () => {
    if (revisionNote.trim().length < 10) {
      setRevisionError('Nội dung phải có ít nhất 10 ký tự.');
      return;
    }

    setIsSubmittingRevision(true);
    setRevisionError('');

    try {
      const response = await tourApi.requestRevision(id, revisionNote.trim());
      setTour(response.data);
      handleCloseRevisionModal();
      toast.success('Đã gửi yêu cầu chỉnh sửa tour.');
    } catch (err) {
      setRevisionError(err.message || 'Không thể gửi yêu cầu chỉnh sửa.');
    } finally {
      setIsSubmittingRevision(false);
    }
  };

  const handleSubmitApprove = async () => {
    setIsSubmittingApprove(true);
    try {
      const response = await tourApi.setStatus(id, 'active');
      setTour(response.data);
      setShowApproveModal(false);
      toast.success(response.message || 'Đã phê duyệt tour thành công.');
    } catch (err) {
      toast.error(err.message || 'Không thể phê duyệt tour.');
    } finally {
      setIsSubmittingApprove(false);
    }
  };

  const handleSubmitReject = async () => {
    setIsSubmittingReject(true);
    try {
      const response = await tourApi.setStatus(id, 'rejected', rejectReason);
      setTour(response.data);
      setShowRejectModal(false);
      toast.success(response.message || 'Đã từ chối duyệt tour.');
    } catch (err) {
      toast.error(err.message || 'Không thể từ chối duyệt tour.');
    } finally {
      setIsSubmittingReject(false);
    }
  };

  const handleReactivate = async () => {
    setIsSubmittingApprove(true);
    try {
      const response = await tourApi.setStatus(id, 'active');
      setTour(response.data);
      toast.success(response.message || 'Đã kích hoạt lại tour thành công.');
    } catch (err) {
      toast.error(err.message || 'Không thể kích hoạt lại tour.');
    } finally {
      setIsSubmittingApprove(false);
    }
  };

  const handleSuspend = async () => {
    if (suspendReason.trim().length < 5) {
      toast.warning('Vui lòng nhập lý do tạm ngưng ít nhất 5 ký tự.');
      return;
    }
    setIsSubmittingSuspend(true);
    try {
      const response = await tourApi.setStatus(id, 'suspended', suspendReason.trim());
      setTour(response.data);
      setShowSuspendModal(false);
      setSuspendReason('');
      toast.success(response.message || 'Đã tạm ngưng tour thành công.');
    } catch (err) {
      toast.error(err.message || 'Không thể tạm ngưng tour.');
    } finally {
      setIsSubmittingSuspend(false);
    }
  };

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
        <Link to="/management/pending-tours" className="btn btn-outline-primary">
          <i className="bi bi-arrow-left me-2"></i>Quay lại danh sách duyệt tour
        </Link>
      </section>
    );
  }

  const isSuspended = tour.status === 'suspended';
  const isPending = tour.status === 'pending';
  const isNeedsRevision = tour.status === 'needs_revision';
  const isRejected = tour.status === 'rejected';
  const statusLabel = isSuspended ? 'Tạm ngưng' : isPending ? 'Chờ duyệt' : isNeedsRevision ? 'Cần chỉnh sửa' : isRejected ? 'Đã từ chối' : 'Đang hoạt động';
  const categoryName = tour.categoryId && typeof tour.categoryId === 'object'
    ? (tour.categoryId.name || '—')
    : (tour.categoryId || '—');
  const suspendedByName = tour.suspendedBy && typeof tour.suspendedBy === 'object'
    ? tour.suspendedBy.username
    : '—';
  const revisionRequestedByName = tour.revisionRequestedBy && typeof tour.revisionRequestedBy === 'object'
    ? tour.revisionRequestedBy.username
    : '—';
  const rejectedByName = tour.rejectedBy && typeof tour.rejectedBy === 'object'
    ? tour.rejectedBy.username
    : '—';

  const images = Array.isArray(tour.images) ? tour.images.filter(Boolean) : [];
  const currentImage = images[selectedImageIdx] || images[0] || '';

  const badgeVariant = isSuspended ? 'badge-danger' : isPending ? 'badge-info' : isNeedsRevision ? 'badge-warning' : isRejected ? 'badge-danger' : 'badge-success';

  return (
    <section className="management-page-section">
      {/* Top Heading */}
      <div className="management-page-heading mb-4">
        <nav aria-label="breadcrumb" className="mb-2">
          <ol className="breadcrumb small mb-0">
            <li className="breadcrumb-item">
              <Link
                to={fromSource === 'pending-tours' || isPending || isNeedsRevision ? '/management/pending-tours' : '/management/tours'}
                className="text-decoration-none text-muted"
              >
                {fromSource === 'pending-tours' || isPending || isNeedsRevision ? 'Duyệt Tour Chờ' : 'Quản lý tour'}
              </Link>
            </li>
            <li className="breadcrumb-item active text-primary fw-semibold" aria-current="page">
              {isPending || isNeedsRevision ? 'Rà soát đề xuất tour' : 'Chi tiết tour'}
            </li>
          </ol>
        </nav>
        <h1 className="text-dark fw-bold mb-2">{tour.title}</h1>
        <div className="d-flex align-items-center gap-3 flex-wrap">
          <span className={`management-badge ${badgeVariant}`}>
            <span className="management-badge-dot"></span>
            {statusLabel}
          </span>
          <span className="text-muted small d-flex align-items-center gap-1.5">
            <i className="bi bi-geo-alt-fill text-danger"></i>
            {tour.departureLocation
              ? `${tour.departureLocation} → ${tour.destinationLocation || tour.location}`
              : (tour.destinationLocation || tour.location)}
          </span>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger alert-dismissible fade show mb-4" role="alert">
          {error}
          <button type="button" className="btn-close" onClick={() => setError('')} aria-label="Đóng"></button>
        </div>
      )}

      {/* 2-Column Responsive Layout */}
      <div className="row g-4">
        {/* Left Column: Tour Content Details */}
        <div className="col-12 col-lg-8">
          {/* Operational Alerts (Revision / Suspended / Rejected) */}
          {isNeedsRevision && (
            <div className="card border-0 shadow-sm rounded-4 p-4 bg-warning bg-opacity-10 border border-warning-subtle mb-4">
              <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-2 pb-2 border-bottom border-warning-subtle">
                <h6 className="fw-bold text-warning-emphasis mb-0 d-flex align-items-center gap-2">
                  <i className="bi bi-pencil-square fs-5"></i>
                  <span>Yêu cầu chỉnh sửa gửi tới nhà cung cấp</span>
                </h6>
                {tour.revisionRequestedAt && (
                  <span className="small text-muted">
                    <i className="bi bi-clock me-1"></i>{formatDate(tour.revisionRequestedAt)}
                  </span>
                )}
              </div>
              <p className="text-dark mb-2 lh-base fw-medium" style={{ whiteSpace: 'pre-line' }}>
                {tour.revisionNote || 'Chưa có ghi chú cụ thể.'}
              </p>
              {revisionRequestedByName !== '—' && (
                <div className="small text-muted">
                  Người yêu cầu: <strong>{revisionRequestedByName}</strong>
                </div>
              )}
            </div>
          )}

          {isSuspended && (
            <div className="card border-0 shadow-sm rounded-4 p-4 bg-danger bg-opacity-10 border border-danger-subtle mb-4">
              <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-2 pb-2 border-bottom border-danger-subtle">
                <h6 className="fw-bold text-danger mb-0 d-flex align-items-center gap-2">
                  <i className="bi bi-slash-circle fs-5"></i>
                  <span>Thông tin tour đang bị tạm ngưng</span>
                </h6>
                {tour.suspendedAt && (
                  <span className="small text-muted">
                    <i className="bi bi-clock me-1"></i>{formatDate(tour.suspendedAt)}
                  </span>
                )}
              </div>
              <p className="text-dark mb-2 lh-base fw-medium">
                {tour.suspensionReason || 'Không có lý do chi tiết.'}
              </p>
              {suspendedByName !== '—' && (
                <div className="small text-muted">
                  Người thực hiện: <strong>{suspendedByName}</strong>
                </div>
              )}
            </div>
          )}

          {isRejected && (
            <div className="card border-0 shadow-sm rounded-4 p-4 bg-danger bg-opacity-10 border border-danger-subtle mb-4">
              <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-2 pb-2 border-bottom border-danger-subtle">
                <h6 className="fw-bold text-danger mb-0 d-flex align-items-center gap-2">
                  <i className="bi bi-x-circle fs-5"></i>
                  <span>Tour đã bị từ chối duyệt</span>
                </h6>
                {tour.rejectedAt && (
                  <span className="small text-muted">
                    <i className="bi bi-clock me-1"></i>{formatDate(tour.rejectedAt)}
                  </span>
                )}
              </div>
              {tour.rejectionReason && (
                <p className="text-dark mb-2 lh-base fw-medium">
                  {tour.rejectionReason}
                </p>
              )}
              {rejectedByName !== '—' && (
                <div className="small text-muted">
                  Người từ chối: <strong>{rejectedByName}</strong>
                </div>
              )}
            </div>
          )}

          {/* Section: Giới thiệu tour */}
          <div className="card border-0 shadow-sm rounded-4 p-4 bg-white mb-4">
            <h5 className="fw-bold text-dark mb-3 d-flex align-items-center gap-2">
              <i className="bi bi-file-earmark-text text-primary"></i>
              <span>Giới thiệu chi tiết tour</span>
            </h5>
            <div className="text-secondary lh-lg mb-0" style={{ whiteSpace: 'pre-line', fontSize: '0.98rem' }}>
              {tour.description || 'Chưa có thông tin giới thiệu cho tour này.'}
            </div>
          </div>

          {/* Section: Lịch trình chi tiết */}
          {tour.itinerary && tour.itinerary.length > 0 && (
            <div className="card border-0 shadow-sm rounded-4 p-4 bg-white mb-4">
              <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3 pb-2 border-bottom">
                <h5 className="fw-bold text-dark mb-0 d-flex align-items-center gap-2">
                  <i className="bi bi-calendar-range text-primary"></i>
                  <span>Lịch trình chi tiết</span>
                </h5>
                <span className="badge bg-primary-subtle text-primary border border-primary-subtle rounded-pill px-3 py-1.5 fw-semibold">
                  {tour.itinerary.length} ngày khám phá
                </span>
              </div>

              <div className="d-flex flex-column gap-3">
                {tour.itinerary.map((dayItem, idx) => (
                  <div key={idx} className="card border rounded-3 p-3 bg-light-subtle shadow-none">
                    <div className="d-flex justify-content-between align-items-start gap-2 mb-2 flex-wrap">
                      <span className="badge bg-primary text-white rounded-pill px-3 py-1.5 fw-semibold">
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
                    <h6 className="fw-bold text-dark mb-2">{dayItem.title}</h6>
                    <p className="text-secondary small mb-0 lh-lg" style={{ whiteSpace: 'pre-line' }}>
                      {dayItem.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section: Dịch vụ bao gồm & không bao gồm */}
          {((tour.includedServices && tour.includedServices.length > 0) || (tour.excludedServices && tour.excludedServices.length > 0)) && (
            <div className="card border-0 shadow-sm rounded-4 p-4 bg-white mb-4">
              <h5 className="fw-bold text-dark mb-3 d-flex align-items-center gap-2 pb-2 border-bottom">
                <i className="bi bi-check-circle text-primary"></i>
                <span>Dịch vụ & Tiện ích đi kèm</span>
              </h5>
              <div className="row g-3">
                {tour.includedServices && tour.includedServices.length > 0 && (
                  <div className="col-12 col-md-6">
                    <div className="card border-0 bg-success-subtle h-100 rounded-3 p-3">
                      <h6 className="fw-bold text-success mb-2.5 d-flex align-items-center gap-2">
                        <i className="bi bi-check-circle-fill"></i>
                        <span>Dịch vụ bao gồm</span>
                      </h6>
                      <ul className="list-unstyled mb-0 d-flex flex-column gap-2 small">
                        {tour.includedServices.map((inc, i) => (
                          <li key={i} className="d-flex align-items-start gap-2 text-dark">
                            <i className="bi bi-check-lg text-success flex-shrink-0 mt-0.5"></i>
                            <span>{inc}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
                {tour.excludedServices && tour.excludedServices.length > 0 && (
                  <div className="col-12 col-md-6">
                    <div className="card border-0 bg-danger-subtle h-100 rounded-3 p-3">
                      <h6 className="fw-bold text-danger mb-2.5 d-flex align-items-center gap-2">
                        <i className="bi bi-x-circle-fill"></i>
                        <span>Dịch vụ không bao gồm</span>
                      </h6>
                      <ul className="list-unstyled mb-0 d-flex flex-column gap-2 small">
                        {tour.excludedServices.map((exc, i) => (
                          <li key={i} className="d-flex align-items-start gap-2 text-dark">
                            <i className="bi bi-x-lg text-danger flex-shrink-0 mt-0.5"></i>
                            <span>{exc}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Section: Chính sách & Lưu ý */}
          {(tour.cancellationPolicy || tour.notes) && (
            <div className="card border-0 shadow-sm rounded-4 p-4 bg-white mb-4">
              <h5 className="fw-bold text-dark mb-3 d-flex align-items-center gap-2 pb-2 border-bottom">
                <i className="bi bi-shield-check text-primary"></i>
                <span>Chính sách & Lưu ý quan trọng</span>
              </h5>
              {tour.cancellationPolicy && (
                <div className="card border rounded-3 p-3 mb-3 bg-light-subtle">
                  <h6 className="fw-bold text-primary mb-2 d-flex align-items-center gap-2">
                    <i className="bi bi-arrow-repeat"></i>
                    <span>Chính sách hoàn hủy</span>
                  </h6>
                  <p className="text-secondary small mb-0 lh-lg" style={{ whiteSpace: 'pre-line' }}>
                    {tour.cancellationPolicy}
                  </p>
                </div>
              )}
              {tour.notes && (
                <div className="card border rounded-3 p-3 bg-light-subtle">
                  <h6 className="fw-bold text-warning-emphasis mb-2 d-flex align-items-center gap-2">
                    <i className="bi bi-exclamation-triangle-fill text-warning"></i>
                    <span>Lưu ý của nhà tổ chức</span>
                  </h6>
                  <p className="text-secondary small mb-0 lh-lg" style={{ whiteSpace: 'pre-line' }}>
                    {tour.notes}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Actions & Key Metrics Sidebar */}
        <div className="col-12 col-lg-4">
          {/* 1. Media Viewer Card — Đưa lên trên đầu */}
          <div className="card border-0 shadow-sm rounded-4 overflow-hidden mb-3 bg-white">
            <div className="p-3 border-bottom d-flex align-items-center justify-content-between">
              <h6 className="fw-bold text-dark mb-0 d-flex align-items-center gap-2" style={{ fontSize: '0.95rem' }}>
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
                    minHeight: '220px',
                    maxHeight: '320px',
                    height: '260px'
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

                  {/* Navigation Arrows (if multiple) */}
                  {images.length > 1 && (
                    <>
                      <button
                        type="button"
                        className="btn btn-light btn-sm rounded-circle position-absolute top-50 start-0 translate-middle-y ms-2 shadow-sm"
                        style={{ zIndex: 3, width: '32px', height: '32px', padding: 0 }}
                        onClick={() => setSelectedImageIdx((prev) => (prev > 0 ? prev - 1 : images.length - 1))}
                        aria-label="Ảnh trước"
                      >
                        <i className="bi bi-chevron-left small"></i>
                      </button>
                      <button
                        type="button"
                        className="btn btn-light btn-sm rounded-circle position-absolute top-50 end-0 translate-middle-y me-2 shadow-sm"
                        style={{ zIndex: 3, width: '32px', height: '32px', padding: 0 }}
                        onClick={() => setSelectedImageIdx((prev) => (prev < images.length - 1 ? prev + 1 : 0))}
                        aria-label="Ảnh tiếp theo"
                      >
                        <i className="bi bi-chevron-right small"></i>
                      </button>
                    </>
                  )}

                  {/* Counter Badge */}
                  {images.length > 1 && (
                    <div className="position-absolute bottom-0 end-0 p-2" style={{ zIndex: 3 }}>
                      <span className="badge bg-dark bg-opacity-75 text-white px-2 py-1 rounded-pill" style={{ fontSize: '0.75rem' }}>
                        {selectedImageIdx + 1} / {images.length}
                      </span>
                    </div>
                  )}
                </div>

                {/* Thumbnail Gallery Bar (if multiple images) */}
                {images.length > 1 && (
                  <div className="p-2.5 bg-light border-top d-flex gap-2 overflow-auto align-items-center">
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
                          width: '58px',
                          height: '40px',
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
              <div className="bg-light-subtle d-flex flex-column align-items-center justify-content-center text-muted py-4" style={{ minHeight: '180px' }}>
                <i className="bi bi-image fs-2 mb-1 opacity-50"></i>
                <span className="small">Tour này chưa có hình ảnh.</span>
              </div>
            )}
          </div>

          {/* 2. Quick Actions Panel Card — Thiết kế nhỏ gọn (Compact) */}
          <div className="card border-0 shadow-sm rounded-4 p-3 bg-white mb-3">
            <div className="d-flex align-items-center justify-content-between mb-2 pb-2 border-bottom">
              <div className="fw-bold text-dark d-flex align-items-center gap-1.5" style={{ fontSize: '0.875rem' }}>
                <i className="bi bi-sliders text-primary"></i>
                <span>Thao tác rà soát</span>
              </div>
              <span className={`management-badge ${badgeVariant}`} style={{ fontSize: '0.72rem', padding: '0.2rem 0.55rem' }}>
                <span className="management-badge-dot"></span>
                {statusLabel}
              </span>
            </div>

            {(isPending || isNeedsRevision) && (
              <div className="d-flex flex-column gap-1.5 pt-1">
                <button
                  type="button"
                  className="btn btn-success btn-sm w-100 d-inline-flex align-items-center justify-content-center gap-1.5 py-1.5 fw-medium"
                  style={{ fontSize: '0.825rem' }}
                  onClick={() => setShowApproveModal(true)}
                >
                  <i className="bi bi-check-circle"></i>
                  <span>Phê duyệt tour</span>
                </button>
                <button
                  type="button"
                  className="btn btn-warning btn-sm w-100 d-inline-flex align-items-center justify-content-center gap-1.5 py-1.5 fw-medium text-dark"
                  style={{ fontSize: '0.825rem' }}
                  onClick={handleOpenRevisionModal}
                >
                  <i className="bi bi-pencil-square"></i>
                  <span>{isNeedsRevision ? 'Cập nhật yêu cầu sửa' : 'Yêu cầu chỉnh sửa'}</span>
                </button>
                <button
                  type="button"
                  className="btn btn-outline-danger btn-sm w-100 d-inline-flex align-items-center justify-content-center gap-1.5 py-1.5 fw-medium"
                  style={{ fontSize: '0.825rem' }}
                  onClick={() => {
                    setRejectReason('');
                    setShowRejectModal(true);
                  }}
                >
                  <i className="bi bi-x-circle"></i>
                  <span>Từ chối duyệt</span>
                </button>
              </div>
            )}

            {tour.status === 'active' && (
              <div className="pt-1">
                <button
                  type="button"
                  className="btn btn-outline-danger btn-sm w-100 d-inline-flex align-items-center justify-content-center gap-1.5 py-1.5 fw-medium"
                  style={{ fontSize: '0.825rem' }}
                  onClick={() => {
                    setSuspendReason('');
                    setShowSuspendModal(true);
                  }}
                >
                  <i className="bi bi-slash-circle"></i>
                  <span>Tạm ngưng tour</span>
                </button>
              </div>
            )}

            {isSuspended && (
              <div className="pt-1">
                <button
                  type="button"
                  className="btn btn-success btn-sm w-100 d-inline-flex align-items-center justify-content-center gap-1.5 py-1.5 fw-medium"
                  style={{ fontSize: '0.825rem' }}
                  onClick={handleReactivate}
                  disabled={isSubmittingApprove}
                >
                  <i className="bi bi-check-circle"></i>
                  <span>Kích hoạt lại tour</span>
                </button>
              </div>
            )}

            {isRejected && (
              <div className="text-center py-1 text-muted" style={{ fontSize: '0.8rem' }}>
                <i className="bi bi-info-circle me-1"></i>
                Tour đã bị từ chối duyệt đề xuất.
              </div>
            )}
          </div>

          {/* Key Metrics Card: Giá bán, Chỗ còn lại, Thời lượng */}
          <div className="card border-0 shadow-sm rounded-4 p-4 bg-white mb-4">
            <h6 className="fw-bold text-dark mb-3 d-flex align-items-center gap-2">
              <i className="bi bi-tag text-primary"></i>
              <span>Giá bán & Quy mô</span>
            </h6>

            <div className="p-3 rounded-3 bg-light mb-3">
              <span className="small text-muted d-block mb-1">Giá bán công khai</span>
              <div className="h4 fw-bold text-primary mb-0">
                {formatCurrency(tour.price)}
                <small className="fs-6 fw-normal text-muted ms-1">/ khách</small>
              </div>
            </div>

            <div className="d-flex flex-column gap-3 small">
              <div className="d-flex justify-content-between align-items-center">
                <span className="text-muted d-flex align-items-center gap-1.5">
                  <i className="bi bi-people text-secondary"></i>Số chỗ còn lại:
                </span>
                <span className="badge bg-secondary-subtle text-dark border px-2.5 py-1.5 fw-bold">
                  {tour.availableSeats ?? 0} chỗ
                </span>
              </div>

              <div className="d-flex justify-content-between align-items-center border-top pt-2">
                <span className="text-muted d-flex align-items-center gap-1.5">
                  <i className="bi bi-clock-history text-secondary"></i>Thời lượng:
                </span>
                <strong className="text-dark">{tour.duration || '—'}</strong>
              </div>

              <div className="d-flex justify-content-between align-items-center border-top pt-2">
                <span className="text-muted d-flex align-items-center gap-1.5">
                  <i className="bi bi-star-fill text-warning"></i>Đánh giá trung bình:
                </span>
                <span className="badge bg-warning bg-opacity-10 text-warning border border-warning px-2 py-1 fw-bold">
                  ★ {tour.averageRating || 0}
                </span>
              </div>

              <div className="d-flex justify-content-between align-items-center border-top pt-2">
                <span className="text-muted d-flex align-items-center gap-1.5">
                  <i className="bi bi-grid text-secondary"></i>Danh mục tour:
                </span>
                <span className="badge bg-light text-dark border px-2.5 py-1.5 fw-semibold text-truncate" style={{ maxWidth: '160px' }}>
                  {categoryName}
                </span>
              </div>
            </div>
          </div>

          {/* Journey Location Card */}
          <div className="card border-0 shadow-sm rounded-4 p-4 bg-white mb-4">
            <h6 className="fw-bold text-dark mb-3 d-flex align-items-center gap-2">
              <i className="bi bi-map text-primary"></i>
              <span>Lộ trình di chuyển</span>
            </h6>

            <div className="d-flex flex-column gap-3 small">
              <div>
                <span className="text-muted d-block mb-1">Điểm khởi hành</span>
                <strong className="text-dark d-flex align-items-center gap-1.5 fs-6">
                  <i className="bi bi-geo-alt text-secondary"></i>
                  {tour.departureLocation || 'Chưa cập nhật'}
                </strong>
              </div>

              <div className="border-top pt-2">
                <span className="text-muted d-block mb-1">Điểm đến</span>
                <strong className="text-primary d-flex align-items-center gap-1.5 fs-6">
                  <i className="bi bi-flag-fill text-danger"></i>
                  {tour.destinationLocation || tour.location || 'Chưa cập nhật'}
                </strong>
              </div>

              {tour.location && tour.location !== tour.destinationLocation && (
                <div className="border-top pt-2">
                  <span className="text-muted d-block mb-1">Khu vực / Địa bàn</span>
                  <span className="text-dark">{tour.location}</span>
                </div>
              )}
            </div>
          </div>

          {/* Administrative Metadata Card */}
          <div className="card border-0 shadow-sm rounded-4 p-4 bg-white mb-4">
            <h6 className="fw-bold text-dark mb-3 d-flex align-items-center gap-2">
              <i className="bi bi-info-circle text-primary"></i>
              <span>Thông tin quản trị</span>
            </h6>

            <div className="d-flex flex-column gap-2 small text-muted">
              <div>
                <span className="d-block text-secondary mb-1">Mã định danh (ID):</span>
                <code className="text-dark bg-light px-2 py-0.5 rounded font-monospace">{tour._id}</code>
              </div>
              {tour.createdAt && (
                <div className="border-top pt-2">
                  <span className="d-block text-secondary">Ngày tạo:</span>
                  <span className="text-dark">{formatDate(tour.createdAt)}</span>
                </div>
              )}
              {tour.updatedAt && (
                <div className="border-top pt-2">
                  <span className="d-block text-secondary">Cập nhật lần cuối:</span>
                  <span className="text-dark">{formatDate(tour.updatedAt)}</span>
                </div>
              )}
            </div>

            {/* Public Page View Link */}
            <div className="border-top pt-3 mt-3">
              <a
                href={`/tours/${tour._id}`}
                target="_blank"
                rel="noreferrer"
                className="btn btn-outline-secondary w-100 btn-sm d-inline-flex align-items-center justify-content-center gap-2"
              >
                <i className="bi bi-box-arrow-up-right"></i>
                <span>Xem trang tour công khai</span>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Modal yêu cầu chỉnh sửa */}
      {showRevisionModal && (
        <div
          className="modal d-block"
          tabIndex="-1"
          role="dialog"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
        >
          <div className="modal-dialog modal-dialog-centered" role="document">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="bi bi-pencil-square me-2"></i>Yêu cầu chỉnh sửa tour
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={handleCloseRevisionModal}
                  disabled={isSubmittingRevision}
                  aria-label="Đóng"
                ></button>
              </div>
              <div className="modal-body">
                <p className="text-muted small mb-3">
                  Nhập nội dung cần chỉnh sửa để Provider biết cần sửa gì. Tối thiểu 10 ký tự.
                </p>
                <textarea
                  id="revision-note"
                  className={`form-control${revisionError ? ' is-invalid' : ''}`}
                  rows={5}
                  placeholder="Ví dụ: Ảnh mờ, cần ảnh rõ hơn. Mô tả tour quá ngắn, thiếu thông tin lịch trình."
                  value={revisionNote}
                  onChange={(e) => {
                    setRevisionNote(e.target.value);
                    if (revisionError) setRevisionError('');
                  }}
                  disabled={isSubmittingRevision}
                  maxLength={1000}
                />
                {revisionError && (
                  <div className="invalid-feedback">{revisionError}</div>
                )}
                <div className="text-muted small mt-1 text-end">
                  {revisionNote.length}/1000 ký tự
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={handleCloseRevisionModal}
                  disabled={isSubmittingRevision}
                >
                  Hủy
                </button>
                <button
                  type="button"
                  className="btn btn-warning"
                  onClick={handleSubmitRevision}
                  disabled={isSubmittingRevision}
                >
                  {isSubmittingRevision ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>
                      Đang gửi...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-send me-2"></i>Gửi yêu cầu
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal phê duyệt tour */}
      {showApproveModal && (
        <div
          className="modal d-block"
          tabIndex="-1"
          role="dialog"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
        >
          <div className="modal-dialog modal-dialog-centered" role="document">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title fw-bold text-success d-flex align-items-center gap-2">
                  <i className="bi bi-check-circle"></i>
                  <span>Phê duyệt và phát hành tour</span>
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowApproveModal(false)}
                  disabled={isSubmittingApprove}
                  aria-label="Đóng"
                ></button>
              </div>
              <div className="modal-body">
                <p className="mb-2">
                  Bạn có chắc muốn phê duyệt tour <strong>{tour.title}</strong>?
                </p>
                <div className="alert alert-info py-2 small mb-0">
                  <i className="bi bi-info-circle me-1"></i>
                  Tour sẽ chuyển sang trạng thái <strong>Đang hoạt động</strong> và được mở bán công khai cho du khách trên toàn hệ thống.
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => setShowApproveModal(false)}
                  disabled={isSubmittingApprove}
                >
                  Hủy
                </button>
                <button
                  type="button"
                  className="btn btn-success"
                  onClick={handleSubmitApprove}
                  disabled={isSubmittingApprove}
                >
                  {isSubmittingApprove ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>
                      Đang xử lý...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-check-lg me-1"></i>Xác nhận phê duyệt
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal từ chối duyệt tour */}
      {showRejectModal && (
        <div
          className="modal d-block"
          tabIndex="-1"
          role="dialog"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
        >
          <div className="modal-dialog modal-dialog-centered" role="document">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title fw-bold text-danger d-flex align-items-center gap-2">
                  <i className="bi bi-x-circle"></i>
                  <span>Từ chối duyệt tour</span>
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowRejectModal(false)}
                  disabled={isSubmittingReject}
                  aria-label="Đóng"
                ></button>
              </div>
              <div className="modal-body">
                <p className="mb-2">
                  Bạn có chắc muốn từ chối duyệt đề xuất tour <strong>{tour.title}</strong>?
                </p>
                <div className="mb-3">
                  <label htmlFor="submission-reject-reason" className="form-label small fw-semibold">
                    Lý do từ chối (tùy chọn):
                  </label>
                  <textarea
                    id="submission-reject-reason"
                    className="form-control form-control-sm"
                    rows="3"
                    placeholder="Nhập lý do từ chối để gửi cho đối tác..."
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    maxLength={500}
                    disabled={isSubmittingReject}
                  ></textarea>
                </div>
                <p className="text-muted small mb-0">
                  Tour sau khi bị từ chối sẽ không được công khai trên hệ thống.
                </p>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => setShowRejectModal(false)}
                  disabled={isSubmittingReject}
                >
                  Hủy
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={handleSubmitReject}
                  disabled={isSubmittingReject}
                >
                  {isSubmittingReject ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>
                      Đang xử lý...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-x-lg me-1"></i>Xác nhận từ chối
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal tạm ngưng tour */}
      {showSuspendModal && (
        <div
          className="modal d-block"
          tabIndex="-1"
          role="dialog"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
        >
          <div className="modal-dialog modal-dialog-centered" role="document">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title fw-bold text-danger d-flex align-items-center gap-2">
                  <i className="bi bi-slash-circle"></i>
                  <span>Tạm ngưng hoạt động tour</span>
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowSuspendModal(false)}
                  disabled={isSubmittingSuspend}
                  aria-label="Đóng"
                ></button>
              </div>
              <div className="modal-body">
                <p className="mb-2">
                  Bạn có chắc muốn tạm ngưng tour <strong>{tour.title}</strong>?
                </p>
                <div className="mb-3">
                  <label htmlFor="submission-suspend-reason" className="form-label small fw-semibold">
                    Lý do tạm ngưng (tối thiểu 5 ký tự): <span className="text-danger">*</span>
                  </label>
                  <textarea
                    id="submission-suspend-reason"
                    className="form-control"
                    rows="3"
                    placeholder="Nhập lý do tạm ngưng để lưu trữ và gửi thông báo..."
                    value={suspendReason}
                    onChange={(e) => setSuspendReason(e.target.value)}
                    maxLength={500}
                    disabled={isSubmittingSuspend}
                  ></textarea>
                </div>
                <div className="alert alert-warning py-2 small mb-0">
                  <i className="bi bi-exclamation-triangle me-1"></i>
                  Tour bị tạm ngưng sẽ lập tức bị ẩn khỏi kết quả tìm kiếm và du khách không thể đặt tour này.
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => setShowSuspendModal(false)}
                  disabled={isSubmittingSuspend}
                >
                  Hủy
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={handleSuspend}
                  disabled={isSubmittingSuspend}
                >
                  {isSubmittingSuspend ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>
                      Đang xử lý...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-slash-circle me-1"></i>Xác nhận tạm ngưng
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default ReviewTourSubmission;