import { useEffect, useState } from 'react';
import { Link, useParams, useLocation } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import ReportReviewModal from '../components/ReportReviewModal';
import CreateReviewModal from '../components/CreateReviewModal';
import EditReviewModal from '../components/EditReviewModal';
import { tourApi, reviewApi } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
// Management layout handles sidebar and navbar via parent route

const formatPrice = (price) => new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND'
}).format(price || 0);

const TourDetails = () => {
  const { id } = useParams();
  const location = useLocation();
  const isManagementRoute = location.pathname.startsWith('/management');
  const { user, isAuthenticated } = useAuth();
  const toast = useToast();
  const [tour, setTour] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isFavorite, setIsFavorite] = useState(false);
  const [updatingFavorite, setUpdatingFavorite] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [reviewStats, setReviewStats] = useState({ averageRating: 0, totalReviews: 0 });
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsError, setReviewsError] = useState('');
  const [reviewToDelete, setReviewToDelete] = useState(null);
  const [reviewToEdit, setReviewToEdit] = useState(null);
  const [isDeletingReview, setIsDeletingReview] = useState(false);
  const [reviewToReport, setReviewToReport] = useState(null);
  const [reportedReviewIds, setReportedReviewIds] = useState([]);
  const [reviewEligibility, setReviewEligibility] = useState(null);
  const [eligibilityRefreshKey, setEligibilityRefreshKey] = useState(0);
  const [showCreateReview, setShowCreateReview] = useState(false);
  const [selectedImageIdx, setSelectedImageIdx] = useState(0);

  const isTourOwner = Boolean(user && tour && (
    user.role === 'tourProvider' && (
      (typeof tour.providerId === 'string' && tour.providerId === user._id) ||
      (tour.providerId?._id && tour.providerId._id === user._id)
    )
  ));
  const currentReviewEligibility = reviewEligibility?.tourId === id
    ? reviewEligibility
    : null;

  const handleDeleteReview = async () => {
    if (!reviewToDelete || isDeletingReview) return;

    setIsDeletingReview(true);
    try {
      const response = await reviewApi.delete(reviewToDelete._id);
      toast.success(response.message || 'Đã xóa đánh giá thành công.');
      const updatedReviews = reviews.filter((r) => r._id !== reviewToDelete._id);
      setReviews(updatedReviews);
      if (response.totalReviews !== undefined) {
        setReviewStats({
          averageRating: response.averageRating,
          totalReviews: response.totalReviews
        });
      } else {
        const total = updatedReviews.length;
        const avg = total > 0 ? Math.round((updatedReviews.reduce((sum, r) => sum + r.rating, 0) / total) * 10) / 10 : 0;
        setReviewStats({ averageRating: avg, totalReviews: total });
      }
      setReviewToDelete(null);
      setReviewEligibility(null);
      setEligibilityRefreshKey((current) => current + 1);
    } catch (err) {
      toast.error(err.message || 'Không thể xóa đánh giá.');
    } finally {
      setIsDeletingReview(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const loadTour = async () => {
      try {
        const response = await tourApi.getById(id);
        if (isMounted) setTour(response.data);
      } catch (err) {
        if (isMounted) setError(err.message || 'Không thể tải thông tin tour.');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadTour();
    return () => {
      isMounted = false;
    };
  }, [id]);

  useEffect(() => {
    if (!id || !isAuthenticated || user?.role !== 'customer') return;

    let isMounted = true;

    reviewApi.getEligibility(id)
      .then((response) => {
        if (isMounted) setReviewEligibility({ ...response.data, tourId: id });
      })
      .catch((err) => {
        if (isMounted) {
          setReviewEligibility({
            eligible: false,
            reason: 'unavailable',
            message: err.message || 'Không thể kiểm tra điều kiện đánh giá.',
            tourId: id
          });
        }
      });

    return () => {
      isMounted = false;
    };
  }, [id, isAuthenticated, user?.role, user?.id, user?._id, eligibilityRefreshKey]);

  useEffect(() => {
    if (!id || !isAuthenticated || user?.role !== 'customer') return;

    let isMounted = true;
    setReviewsLoading(true);

    reviewApi.getByTour(id)
      .then((response) => {
        if (isMounted) {
          setReviews(response.reviews || []);
          setReviewStats({
            averageRating: response.averageRating || 0,
            totalReviews: response.totalReviews || 0
          });
        }
      })
      .catch(() => {
        if (isMounted) setReviewsError('Không thể tải đánh giá.');
      })
      .finally(() => {
        if (isMounted) setReviewsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [id, isAuthenticated, user?.role]);

  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'customer') return;

    let isMounted = true;
    tourApi.getFavorites()
      .then((response) => {
        if (isMounted) {
          setIsFavorite((response.favoriteTourIds || []).map(String).includes(String(id)));
        }
      })
      .catch(() => { });

    return () => {
      isMounted = false;
    };
  }, [id, isAuthenticated, user?.role, user?.id, user?._id]);

  const handleFavorite = async () => {
    if (updatingFavorite) return;

    setUpdatingFavorite(true);
    setError('');
    try {
      if (isFavorite) {
        await tourApi.removeFavorite(id);
        setIsFavorite(false);
        toast.success('Đã bỏ lưu tour yêu thích.');
      } else {
        await tourApi.saveFavorite(id);
        setIsFavorite(true);
        toast.success('Đã lưu tour yêu thích.');
      }
    } catch (err) {
      toast.error(err.message || 'Không thể cập nhật tour yêu thích.');
    } finally {
      setUpdatingFavorite(false);
    }
  };

  const handleReviewCreated = (response) => {
    if (response.data) {
      setReviews((current) => [
        response.data,
        ...current.filter((review) => review._id !== response.data._id)
      ]);
    }
    setReviewStats((current) => ({
      averageRating: response.averageRating ?? current.averageRating,
      totalReviews: response.totalReviews ?? current.totalReviews + 1
    }));
    setReviewEligibility({
      eligible: false,
      reason: 'already_reviewed',
      message: 'Bạn đã đánh giá tour này.',
      reviewId: response.data?._id,
      tourId: id
    });
  };

  if (loading) {
    if (isManagementRoute) {
      return (
        <section className="management-page-section">
          <div className="management-loading-state text-center py-5">
            <div className="spinner-border text-primary me-2" role="status">
              <span className="visually-hidden">Đang tải...</span>
            </div>
            <span className="text-muted">Đang tải thông tin tour...</span>
          </div>
        </section>
      );
    }
    return (
      <>
        <Navbar />
        <main className="container py-5 text-center" style={{ minHeight: '80vh' }}>
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Đang tải...</span>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  if (!tour) {
    if (isManagementRoute) {
      return (
        <section className="management-page-section">
          <div className="alert alert-danger">{error || 'Không tìm thấy tour.'}</div>
          <Link
            to={user?.role === 'tourProvider' ? '/management/my-tours' : '/management/tours'}
            className="btn btn-outline-primary"
          >
            <i className="bi bi-arrow-left me-2"></i>Quay lại danh sách tour
          </Link>
        </section>
      );
    }
    return (
      <>
        <Navbar />
        <main className="container py-5" style={{ minHeight: '80vh' }}>
          <div className="alert alert-danger">{error || 'Không tìm thấy tour.'}</div>
          <Link to="/tours" className="btn btn-outline-primary">
            <i className="bi bi-arrow-left me-2"></i>Quay lại danh sách tour
          </Link>
        </main>
        <Footer />
      </>
    );
  }
  const images = Array.isArray(tour.images) ? tour.images.filter(Boolean) : [];
  const currentImage = images[selectedImageIdx] || images[0] || '';

  const tourContent = (
    <>
      {error && <div className="alert alert-danger">{error}</div>}

      <div className="row g-4 mb-4">
        <div className="col-lg-8">
              <div className="card border-0 shadow-sm rounded-4">
                <div className="card-body p-4 p-md-5">
                  <div className="d-flex justify-content-between align-items-start flex-wrap gap-3 mb-3">
                    <div>
                      <h1 className="fw-bold mb-2">{tour.title}</h1>
                      <p className="text-muted mb-0">
                        <i className="bi bi-geo-alt-fill text-danger me-2"></i>
                        {tour.departureLocation
                          ? `${tour.departureLocation} → ${tour.destinationLocation || tour.location}`
                          : (tour.destinationLocation || tour.location)}
                      </p>
                    </div>
                    <div className="d-flex align-items-center gap-2">
                      {isTourOwner && (
                        <Link
                          to={`/management/my-tours/${tour._id}/details`}
                          className="btn btn-warning text-dark rounded-pill px-3 shadow-sm d-flex align-items-center gap-1.5 fw-medium"
                        >
                          <i className="bi bi-gear-fill"></i>
                          <span>Thiết lập chi tiết</span>
                        </Link>
                      )}
                      {isAuthenticated && user?.role === 'customer' && (
                        <button
                          type="button"
                          className={`btn rounded-pill px-3 ${isFavorite ? 'btn-danger' : 'btn-outline-danger'}`}
                          onClick={handleFavorite}
                          disabled={updatingFavorite}
                        >
                          {updatingFavorite ? (
                            <span className="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>
                          ) : (
                            <i className={`bi ${isFavorite ? 'bi-heart-fill' : 'bi-heart'} me-2`}></i>
                          )}
                          {isFavorite ? 'Đã lưu' : 'Lưu tour'}
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="d-flex flex-wrap gap-3 mb-4">
                    <span className="badge text-bg-light border px-3 py-2">
                      <i className="bi bi-clock me-2"></i>{tour.duration}
                    </span>
                    <span className="badge text-bg-light border px-3 py-2 text-warning">
                      <i className="bi bi-star-fill me-2"></i>{tour.averageRating || '5.0'}
                    </span>
                    <span className="badge text-bg-light border px-3 py-2">
                      <i className="bi bi-person-check me-2"></i>Còn {tour.availableSeats} chỗ
                    </span>
                    {tour.categoryId?.name && (
                      <span className="badge text-bg-primary-subtle text-primary border border-primary-subtle px-3 py-2">
                        <i className="bi bi-tag-fill me-2"></i>{tour.categoryId.name}
                      </span>
                    )}
                  </div>

                  {/* Giới thiệu tour */}
                  <div className="mb-4">
                    <h2 className="h4 fw-bold mb-3 d-flex align-items-center gap-2">
                      <i className="bi bi-card-text text-primary"></i>
                      <span>Giới thiệu tour</span>
                    </h2>
                    <p className="text-secondary lh-lg mb-0" style={{ whiteSpace: 'pre-line' }}>{tour.description}</p>
                  </div>

                  {/* 1. Lịch trình chi tiết từng ngày */}
                  {(user?.role === 'customer' || isTourOwner) && tour.itinerary && tour.itinerary.length > 0 ? (
                    <div className="mb-4 pt-4 border-top">
                      <h2 className="h4 fw-bold mb-3 d-flex align-items-center gap-2">
                        <i className="bi bi-calendar-range text-primary"></i>
                        <span>1. Lịch trình chi tiết ({tour.itinerary.length} ngày)</span>
                      </h2>
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
                    </div>
                  ) : isTourOwner && (
                    <div className="alert alert-info border-0 rounded-3 p-3 d-flex align-items-center justify-content-between mb-4">
                      <div className="d-flex align-items-center gap-2">
                        <i className="bi bi-info-circle-fill fs-5 text-primary"></i>
                        <span className="small">Tour này chưa được thiết lập lịch trình chi tiết từng ngày.</span>
                      </div>
                      <Link to={`/management/my-tours/${tour._id}/details`} className="btn btn-sm btn-primary rounded-pill px-3">
                        Thiết lập ngay
                      </Link>
                    </div>
                  )}

                  {/* 2. Dịch vụ bao gồm & không bao gồm */}
                  {((tour.includedServices && tour.includedServices.length > 0) || (tour.excludedServices && tour.excludedServices.length > 0)) && (
                    <div className="mb-4 pt-4 border-top">
                      <h2 className="h4 fw-bold mb-3 d-flex align-items-center gap-2">
                        <i className="bi bi-check-circle text-primary"></i>
                        <span>2. Dịch vụ bao gồm & Không bao gồm</span>
                      </h2>
                      <div className="row g-3">
                        {tour.includedServices && tour.includedServices.length > 0 && (
                          <div className="col-md-6">
                            <div className="card border-0 bg-success-subtle h-100 rounded-3 p-3">
                              <h6 className="fw-bold text-success mb-2.5 d-flex align-items-center gap-2">
                                <i className="bi bi-check-circle-fill"></i>
                                <span>Dịch vụ bao gồm ({tour.includedServices.length})</span>
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
                          <div className="col-md-6">
                            <div className="card border-0 bg-danger-subtle h-100 rounded-3 p-3">
                              <h6 className="fw-bold text-danger mb-2.5 d-flex align-items-center gap-2">
                                <i className="bi bi-x-circle-fill"></i>
                                <span>Dịch vụ không bao gồm ({tour.excludedServices.length})</span>
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

                  {/* 3. Chính sách & Lưu ý */}
                  {(tour.cancellationPolicy || tour.notes) && (
                    <div className="mb-4 pt-4 border-top">
                      <h2 className="h4 fw-bold mb-3 d-flex align-items-center gap-2">
                        <i className="bi bi-shield-check text-primary"></i>
                        <span>3. Chính sách & Lưu ý</span>
                      </h2>
                      {tour.cancellationPolicy && (
                        <div className="card border rounded-3 p-3 mb-3 bg-white">
                          <h6 className="fw-bold text-primary mb-2 d-flex align-items-center gap-2">
                            <i className="bi bi-arrow-repeat"></i>
                            <span>Chính sách hoàn hủy tour</span>
                          </h6>
                          <p className="text-secondary small mb-0 lh-lg" style={{ whiteSpace: 'pre-line' }}>
                            {tour.cancellationPolicy}
                          </p>
                        </div>
                      )}
                      {tour.notes && (
                        <div className="card border rounded-3 p-3 bg-white">
                          <h6 className="fw-bold text-warning-emphasis mb-2 d-flex align-items-center gap-2">
                            <i className="bi bi-exclamation-triangle-fill text-warning"></i>
                            <span>Lưu ý quan trọng</span>
                          </h6>
                          <p className="text-secondary small mb-0 lh-lg" style={{ whiteSpace: 'pre-line' }}>
                            {tour.notes}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="col-lg-4">
              {/* Media Viewer Card (Đưa sang bên phải) */}
              <div className="card border-0 shadow-sm rounded-4 overflow-hidden mb-4 bg-white">
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

                      {images.length > 1 && (
                        <div className="position-absolute bottom-0 end-0 p-2" style={{ zIndex: 3 }}>
                          <span className="badge bg-dark bg-opacity-75 text-white px-2 py-1 rounded-pill" style={{ fontSize: '0.75rem' }}>
                            {selectedImageIdx + 1} / {images.length}
                          </span>
                        </div>
                      )}
                    </div>

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

              <div className="card border-0 shadow-sm rounded-4 sticky-sidebar">
                <div className="card-body p-4">
                  <p className="text-muted mb-1">Giá tour trọn gói</p>
                  <p className="fs-3 fw-bold text-primary mb-3">{formatPrice(tour.price)}</p>

                  {isAuthenticated && user?.role === 'customer' && tour.availableSeats > 0 && (
                    <div className="mb-3">
                      <Link
                        to={`/tours/${tour._id}/booking`}
                        className="btn btn-primary w-100 rounded-pill py-2 fw-semibold d-flex align-items-center justify-content-center gap-2 shadow-sm"
                      >
                        <i className="bi bi-calendar-check"></i>
                        <span>Đặt tour ngay</span>
                      </Link>
                    </div>
                  )}

                  {isAuthenticated && user?.role === 'customer' && tour.availableSeats === 0 && (
                    <div className="alert alert-warning py-2 text-center small mb-3">
                      <i className="bi bi-exclamation-triangle me-1"></i>Tour hiện đã hết chỗ
                    </div>
                  )}

                  {!isAuthenticated && (
                    <div className="mb-3">
                      <Link
                        to="/login"
                        className="btn btn-outline-primary w-100 rounded-pill py-2 fw-semibold"
                      >
                        <i className="bi bi-box-arrow-in-right me-2"></i>Đăng nhập để đặt tour
                      </Link>
                    </div>
                  )}

                  {isTourOwner && (
                    <div className="mb-3">
                      <Link
                        to={`/provider/tours/${tour._id}/details`}
                        className="btn btn-warning w-100 rounded-pill py-2.5 fw-semibold d-flex align-items-center justify-content-center gap-2 shadow-sm text-dark"
                      >
                        <i className="bi bi-sliders"></i>
                        <span>Cài đặt chi tiết tour</span>
                      </Link>
                    </div>
                  )}

                  {tour.providerId && (
                    <div className="p-3 rounded-3 bg-light border mb-3">
                      <div className="d-flex align-items-center gap-2 mb-2">
                        <i className="bi bi-building text-primary fs-5"></i>
                        <span className="fw-semibold small text-dark">Nhà cung cấp tour</span>
                      </div>
                      <div className="fw-bold text-dark">{tour.providerId.username || 'Đối tác TripMate'}</div>
                      {tour.providerId.phone && (
                        <div className="small text-muted mt-1">
                          <i className="bi bi-telephone me-1"></i>{tour.providerId.phone}
                        </div>
                      )}
                    </div>
                  )}

                  <hr />
                  <p className="small text-muted mb-0">
                    <i className="bi bi-info-circle me-2"></i>
                    Giá và số chỗ có thể thay đổi theo lịch khởi hành.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {user?.role === 'customer' && (
          <div className="card border-0 shadow-sm rounded-4 mb-4">
            <div className="card-body p-4 p-md-5">
              <div className="d-flex justify-content-between align-items-center flex-wrap gap-3 mb-4">
                <h2 className="h4 fw-bold mb-0">Đánh giá từ khách hàng</h2>
                {reviewStats.totalReviews > 0 && (
                  <div className="d-flex align-items-center gap-2">
                    <span className="badge text-bg-warning text-dark px-3 py-2">
                      <i className="bi bi-star-fill me-1"></i>{reviewStats.averageRating}
                    </span>
                    <span className="text-muted small">{reviewStats.totalReviews} đánh giá</span>
                  </div>
                )}
              </div>

              {isAuthenticated && user?.role === 'customer' && (
                !currentReviewEligibility ? (
                  <div className="border rounded-3 p-3 mb-4 d-flex align-items-center gap-2 text-muted small">
                    <span className="spinner-border spinner-border-sm text-primary" aria-hidden="true"></span>
                    Đang kiểm tra điều kiện đánh giá...
                  </div>
                ) : (
                  <div
                    className={`alert d-flex align-items-center justify-content-between flex-wrap gap-3 mb-4 ${
                      currentReviewEligibility.eligible
                        ? 'alert-success'
                        : currentReviewEligibility.reason === 'unavailable'
                          ? 'alert-warning'
                          : 'alert-light border'
                    }`}
                    role="status"
                  >
                    <div className="d-flex align-items-start gap-3">
                      <i className={`bi fs-4 ${
                        currentReviewEligibility.eligible ? 'bi-patch-check-fill text-success' : 'bi-info-circle text-primary'
                      }`}></i>
                      <div>
                        <div className="fw-semibold">
                          {currentReviewEligibility.eligible ? 'Bạn đã hoàn thành chuyến đi' : 'Điều kiện đánh giá'}
                        </div>
                        <div className="small">{currentReviewEligibility.message}</div>
                        {currentReviewEligibility.reason === 'trip_not_completed' && currentReviewEligibility.eligibleAt && (
                          <div className="small mt-1">
                            Thời gian dự kiến có thể đánh giá: {' '}
                            <strong>{new Date(currentReviewEligibility.eligibleAt).toLocaleDateString('vi-VN')}</strong>
                          </div>
                        )}
                      </div>
                    </div>
                    {currentReviewEligibility.eligible && (
                      <button
                        type="button"
                        className="btn btn-success"
                        onClick={() => setShowCreateReview(true)}
                      >
                        <i className="bi bi-star-fill me-2"></i>Viết đánh giá
                      </button>
                    )}
                  </div>
                )
              )}

              {reviewsLoading ? (
                <div className="text-center py-4">
                  <div className="spinner-border spinner-border-sm text-primary" role="status">
                    <span className="visually-hidden">Đang tải...</span>
                  </div>
                </div>
              ) : reviewsError ? (
                <div className="alert alert-warning small mb-0">{reviewsError}</div>
              ) : reviews.length === 0 ? (
                <div className="text-center text-muted py-4">
                  <i className="bi bi-chat-dots fs-3 d-block mb-2"></i>
                  Chưa có đánh giá nào cho tour này.
                </div>
              ) : (
                <div className="row g-3">
                  {reviews.map((review) => {
                    const currentUserId = user?.id || user?._id;
                    const isMyReview = currentUserId && (
                      String(review.userId?._id || review.userId) === String(currentUserId)
                    );

                    return (
                      <div key={review._id} className="col-md-6">
                        <div className="border rounded-3 p-3 h-100">
                          <div className="d-flex align-items-center gap-2 mb-2">
                            <div className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center flex-shrink-0" style={{ width: '40px', height: '40px', fontSize: '0.9rem' }}>
                              {review.userId?.username?.charAt(0)?.toUpperCase() || '?'}
                            </div>
                            <div className="min-width-0">
                              <div className="fw-semibold text-truncate">
                                {review.userId?.username || 'Ẩn danh'}
                                {isMyReview && <span className="badge text-bg-light border text-muted ms-2 small">Bạn</span>}
                              </div>
                              <div className="small text-muted">{new Date(review.createdAt).toLocaleDateString('vi-VN')}</div>
                            </div>
                            <div className="text-warning ms-auto flex-shrink-0 d-flex align-items-center gap-2">
                              <div>
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <i key={star} className={`bi ${star <= review.rating ? 'bi-star-fill' : 'bi-star'}`}></i>
                                ))}
                              </div>
                              {isMyReview && (
                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline-primary border-0 p-1 px-2 rounded-2"
                                  title="Sửa đánh giá"
                                  aria-label="Sửa đánh giá"
                                  onClick={() => setReviewToEdit(review)}
                                >
                                  <i className="bi bi-pencil"></i>
                                </button>
                              )}
                              {isMyReview && (
                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline-danger border-0 p-1 px-2 rounded-2"
                                  title="Xóa đánh giá"
                                  aria-label="Xóa đánh giá"
                                  onClick={() => setReviewToDelete(review)}
                                >
                                  <i className="bi bi-trash"></i>
                                </button>
                              )}
                              {isAuthenticated && user?.role === 'customer' && !isMyReview && (
                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline-warning border-0 p-1 px-2 rounded-2"
                                  title="Báo cáo vi phạm"
                                  aria-label="Báo cáo vi phạm"
                                  disabled={reportedReviewIds.includes(review._id)}
                                  onClick={() => setReviewToReport(review)}
                                >
                                  {reportedReviewIds.includes(review._id)
                                    ? <i className="bi bi-flag-fill text-warning"></i>
                                    : <i className="bi bi-flag"></i>
                                  }
                                </button>
                              )}
                            </div>
                          </div>
                          {review.comment && (
                            <p className="text-secondary mb-0 small">{review.comment}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
          )}

        {reviewToDelete && (
          <>
            <div className="modal fade show d-block" tabIndex="-1" role="dialog" aria-modal="true">
              <div className="modal-dialog modal-dialog-centered">
                <div className="modal-content border-0 shadow">
                  <div className="modal-header">
                    <h2 className="modal-title h5 fw-bold">Xác nhận xóa đánh giá</h2>
                    <button
                      type="button"
                      className="btn-close"
                      onClick={() => !isDeletingReview && setReviewToDelete(null)}
                      disabled={isDeletingReview}
                      aria-label="Đóng"
                    ></button>
                  </div>
                  <div className="modal-body">
                    <p className="mb-2">Bạn có chắc muốn xóa đánh giá của mình?</p>
                    <p className="text-muted small mb-0">
                      Đánh giá sẽ bị xóa vĩnh viễn và điểm đánh giá trung bình của tour sẽ được cập nhật lại.
                    </p>
                  </div>
                  <div className="modal-footer">
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={() => setReviewToDelete(null)}
                      disabled={isDeletingReview}
                    >
                      Hủy
                    </button>
                    <button
                      type="button"
                      className="btn btn-danger"
                      onClick={handleDeleteReview}
                      disabled={isDeletingReview}
                    >
                      {isDeletingReview ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>
                          Đang xóa...
                        </>
                      ) : (
                        'Xác nhận xóa'
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-backdrop fade show"></div>
          </>
        )}

        {reviewToReport && (
          <ReportReviewModal
            review={reviewToReport}
            onClose={() => setReviewToReport(null)}
            onReported={(id) => setReportedReviewIds((prev) => [...prev, id])}
          />
        )}

        {showCreateReview && currentReviewEligibility?.eligible && (
          <CreateReviewModal
            tourId={id}
            tourTitle={tour.title}
            onClose={() => setShowCreateReview(false)}
            onCreated={handleReviewCreated}
          />
        )}
        {/* UC-89 - sửa đánh giá của chính khách hàng */}
        {reviewToEdit && (
          <EditReviewModal
            review={reviewToEdit}
            tourTitle={tour.title}
            onClose={() => setReviewToEdit(null)}
            onUpdated={(response) => {
              if (response.data) {
                setReviews((current) =>
                  current.map((review) =>
                    review._id === response.data._id ? response.data : review
                  )
                );
              }
              setReviewStats((current) => ({
                averageRating: response.averageRating ?? current.averageRating,
                totalReviews: response.totalReviews ?? current.totalReviews
              }));
            }}
          />
        )}
    </>
  );

  if (isManagementRoute) {
    return (
      <section className="management-page-section">
        <div className="management-page-heading mb-4">
          <nav aria-label="breadcrumb" className="mb-2">
            <ol className="breadcrumb small mb-0">
              <li className="breadcrumb-item">
                <Link
                  to={user?.role === 'tourProvider' ? '/management/my-tours' : '/management/tours'}
                  className="text-decoration-none text-muted"
                >
                  {user?.role === 'tourProvider' ? 'Quản lý tour của tôi' : 'Quản lý tour'}
                </Link>
              </li>
              <li className="breadcrumb-item active text-primary fw-semibold" aria-current="page">
                Xem chi tiết tour
              </li>
            </ol>
          </nav>
        </div>
        {tourContent}
      </section>
    );
  }

  return (
    <>
      <Navbar />
      <main className="bg-light py-4 py-md-5">
        <div className="container">
          {tourContent}
        </div>
      </main>
      <Footer />
    </>
  );
};

export default TourDetails;
