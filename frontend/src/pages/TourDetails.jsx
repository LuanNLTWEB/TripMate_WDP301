import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { tourApi, reviewApi } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';

const formatPrice = (price) => new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND'
}).format(price || 0);

const TourDetails = () => {
  const { id } = useParams();
  const { user, isAuthenticated } = useAuth();
  const toast = useToast();
  const [tour, setTour] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isFavorite, setIsFavorite] = useState(false);
  const [updatingFavorite, setUpdatingFavorite] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [reviewStats, setReviewStats] = useState({ averageRating: 0, totalReviews: 0 });
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [reviewsError, setReviewsError] = useState('');
  const [reviewToDelete, setReviewToDelete] = useState(null);
  const [isDeletingReview, setIsDeletingReview] = useState(false);

  const isTourOwner = Boolean(user && tour && (
    user.role === 'admin' ||
    (user.role === 'tourProvider' && (
      (typeof tour.providerId === 'string' && tour.providerId === user._id) ||
      (tour.providerId?._id && tour.providerId._id === user._id)
    ))
  ));

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
    if (!id) return;

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
  }, [id]);

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

  if (loading) {
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

  return (
    <>
      <Navbar />
      <main className="bg-light py-4 py-md-5">
        <div className="container">
          {error && <div className="alert alert-danger">{error}</div>}

          <div className="card border-0 shadow-sm rounded-4 overflow-hidden mb-4">
            {tour.images?.[0] ? (
              <img src={tour.images[0]} alt={tour.title} className="w-100" style={{ height: '430px', objectFit: 'cover' }} />
            ) : (
              <div className="bg-secondary-subtle d-flex align-items-center justify-content-center text-muted" style={{ height: '430px' }}>
                <i className="bi bi-image fs-1"></i>
              </div>
            )}
          </div>

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
                        <i className="bi bi-tag-fill me-1.5"></i>{tour.categoryId.name}
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

                  {/* Lịch trình chi tiết từng ngày */}
                  {tour.itinerary && tour.itinerary.length > 0 ? (
                    <div className="mb-4 pt-3 border-top">
                      <h2 className="h4 fw-bold mb-3 d-flex align-items-center gap-2">
                        <i className="bi bi-calendar-range text-primary"></i>
                        <span>Lịch trình chi tiết ({tour.itinerary.length} ngày)</span>
                      </h2>
                      <div className="d-flex flex-column gap-3">
                        {tour.itinerary.map((dayItem, idx) => (
                          <div key={idx} className="card border rounded-4 p-3.5 bg-light-subtle shadow-none">
                            <div className="d-flex justify-content-between align-items-start gap-2 mb-2">
                              <span className="badge bg-primary text-white rounded-pill px-3 py-1.5 fs-6">
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
                    <div className="alert alert-info border-0 rounded-4 p-3 d-flex align-items-center justify-content-between mb-4">
                      <div className="d-flex align-items-center gap-2">
                        <i className="bi bi-info-circle-fill fs-5 text-primary"></i>
                        <span className="small">Tour này chưa được thiết lập lịch trình chi tiết từng ngày.</span>
                      </div>
                      <Link to={`/management/my-tours/${tour._id}/details`} className="btn btn-sm btn-primary rounded-pill px-3">
                        Thiết lập ngay
                      </Link>
                    </div>
                  )}

                  {/* Dịch vụ bao gồm & không bao gồm */}
                  {((tour.includedServices && tour.includedServices.length > 0) || (tour.excludedServices && tour.excludedServices.length > 0)) && (
                    <div className="mb-4 pt-3 border-top">
                      <h2 className="h4 fw-bold mb-3 d-flex align-items-center gap-2">
                        <i className="bi bi-check-circle text-primary"></i>
                        <span>Dịch vụ & Tiện ích tour</span>
                      </h2>
                      <div className="row g-3">
                        {tour.includedServices && tour.includedServices.length > 0 && (
                          <div className="col-md-6">
                            <div className="card border-0 bg-success-subtle h-100 rounded-4 p-3.5">
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
                          <div className="col-md-6">
                            <div className="card border-0 bg-danger-subtle h-100 rounded-4 p-3.5">
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

                  {/* Chính sách hoàn hủy & Lưu ý */}
                  {(tour.cancellationPolicy || tour.notes) && (
                    <div className="mb-4 pt-3 border-top">
                      <h2 className="h4 fw-bold mb-3 d-flex align-items-center gap-2">
                        <i className="bi bi-shield-check text-primary"></i>
                        <span>Chính sách & Quy định</span>
                      </h2>
                      {tour.cancellationPolicy && (
                        <div className="card border rounded-4 p-3.5 mb-3 bg-white">
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
                        <div className="card border rounded-4 p-3.5 bg-white">
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
                                  className="btn btn-sm btn-outline-danger border-0 p-1 px-2 rounded-2"
                                  title="Xóa đánh giá"
                                  aria-label="Xóa đánh giá"
                                  onClick={() => setReviewToDelete(review)}
                                >
                                  <i className="bi bi-trash"></i>
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
        </div>

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
      </main>
      <Footer />
    </>
  );
};

export default TourDetails;
