import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { destinationApi, tourApi } from '../services/api';
import { useAuth } from '../hooks/useAuth';

const formatPrice = (price) => new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND'
}).format(price || 0);

const FavoriteDestinations = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [favoriteDestinations, setFavoriteDestinations] = useState([]);
  const [favoriteTours, setFavoriteTours] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [removingKey, setRemovingKey] = useState('');
  const [activeTab, setActiveTab] = useState('destinations');

  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'customer') {
      return;
    }

    let isMounted = true;

    const fetchFavorites = async () => {
      setLoading(true);
      setError('');
      setFavoriteDestinations([]);
      setFavoriteTours([]);

      const [destinationResult, tourResult] = await Promise.allSettled([
        destinationApi.getFavorites(),
        tourApi.getFavorites()
      ]);

      if (!isMounted) return;

      const loadErrors = [];
      let loadedDestinations = [];
      let loadedTours = [];
      if (destinationResult.status === 'fulfilled') {
        loadedDestinations = destinationResult.value.data || [];
        setFavoriteDestinations(loadedDestinations);
      } else {
        loadErrors.push('điểm đến');
      }

      if (tourResult.status === 'fulfilled') {
        loadedTours = tourResult.value.data || [];
        setFavoriteTours(loadedTours);
      } else {
        loadErrors.push('tour');
      }

      if (loadedDestinations.length === 0 && loadedTours.length > 0) {
        setActiveTab('tours');
      }

      if (loadErrors.length > 0) {
        setError(`Không thể tải danh sách ${loadErrors.join(' và ')} yêu thích.`);
      }
      setLoading(false);
    };

    fetchFavorites();

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, user?.role, user?.id, user?._id]);

  const handleRemoveDestination = async (destinationId) => {
    const itemKey = `destination:${destinationId}`;
    if (removingKey) return;

    setRemovingKey(itemKey);
    setError('');
    try {
      await destinationApi.toggleFavorite(destinationId);
      setFavoriteDestinations((current) => current.filter((destination) => destination._id !== destinationId));
    } catch (err) {
      setError(err.message || 'Không thể bỏ lưu điểm đến yêu thích.');
    } finally {
      setRemovingKey('');
    }
  };

  const handleRemoveTour = async (tourId) => {
    const itemKey = `tour:${tourId}`;
    if (removingKey) return;

    setRemovingKey(itemKey);
    setError('');
    try {
      await tourApi.removeFavorite(tourId);
      setFavoriteTours((current) => current.filter((tour) => tour._id !== tourId));
    } catch (err) {
      setError(err.message || 'Không thể bỏ lưu tour yêu thích.');
    } finally {
      setRemovingKey('');
    }
  };

  return (
    <>
      <Navbar />
      <main className="bg-light py-5 flex-grow-1" style={{ minHeight: '80vh' }}>
        <div className="container">
          <div className="mb-4">
            <div>
              <p className="text-primary text-uppercase fw-semibold small mb-2">Favorites</p>
              <h1 className="fw-bold mb-2">Yêu thích của tôi</h1>
              <p className="text-muted mb-0">Chọn một danh mục để xem lại những nội dung bạn quan tâm.</p>
            </div>
          </div>

          {!isAuthenticated ? (
            <div className="alert alert-info">
              Vui lòng <Link to="/login" className="alert-link">đăng nhập</Link> để xem danh sách yêu thích.
            </div>
          ) : user?.role !== 'customer' ? (
            <div className="alert alert-warning">Chức năng yêu thích chỉ dành cho Customer.</div>
          ) : loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Đang tải...</span>
              </div>
              <p className="text-muted mt-3">Đang tải danh sách yêu thích...</p>
            </div>
          ) : (
            <>
              {error && (
                <div className="alert alert-danger alert-dismissible" role="alert">
                  {error}
                  <button type="button" className="btn-close" aria-label="Đóng" onClick={() => setError('')}></button>
                </div>
              )}

              <div className="card border-0 shadow-sm rounded-4 mb-4">
                <div className="card-body p-2 p-md-3">
                  <div className="nav nav-pills nav-fill gap-2" role="tablist" aria-label="Loại mục yêu thích">
                    <button
                      type="button"
                      className={`nav-link d-flex align-items-center justify-content-center gap-2 py-3 ${activeTab === 'destinations' ? 'active' : 'text-dark'}`}
                      onClick={() => setActiveTab('destinations')}
                      role="tab"
                      aria-selected={activeTab === 'destinations'}
                    >
                      <i className="bi bi-geo-alt-fill"></i>
                      <span className="fw-semibold">Điểm đến yêu thích</span>
                    </button>
                    <button
                      type="button"
                      className={`nav-link d-flex align-items-center justify-content-center gap-2 py-3 ${activeTab === 'tours' ? 'active' : 'text-dark'}`}
                      onClick={() => setActiveTab('tours')}
                      role="tab"
                      aria-selected={activeTab === 'tours'}
                    >
                      <i className="bi bi-map-fill"></i>
                      <span className="fw-semibold">Tour yêu thích</span>
                    </button>
                  </div>
                </div>
              </div>

              {activeTab === 'destinations' && (
              <section aria-labelledby="favorite-destinations-heading">
                <div className="mb-3">
                  <h2 id="favorite-destinations-heading" className="h4 fw-bold mb-0">
                    <i className="bi bi-geo-alt-fill text-primary me-2"></i>
                    Điểm đến yêu thích
                  </h2>
                </div>

                {favoriteDestinations.length === 0 ? (
                  <div className="card border-0 shadow-sm text-center py-4">
                    <div className="card-body text-muted">
                      <i className="bi bi-geo-alt fs-1 d-block mb-2"></i>
                      <p className="mb-3">Bạn chưa lưu điểm đến nào.</p>
                      <Link to="/destinations" className="btn btn-outline-primary btn-sm">Khám phá điểm đến</Link>
                    </div>
                  </div>
                ) : (
                  <div className="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-4">
                    {favoriteDestinations.map((destination) => {
                      const itemKey = `destination:${destination._id}`;
                      return (
                        <div key={destination._id} className="col">
                          <div
                            className="card h-100 border-0 shadow-sm rounded-4 overflow-hidden"
                            role="link"
                            tabIndex={0}
                            aria-label={`Xem chi tiết điểm đến ${destination.name}`}
                            title="Xem chi tiết điểm đến"
                            onClick={() => navigate(`/destinations/${destination._id}`)}
                            onKeyDown={(event) => {
                              if (event.target !== event.currentTarget) return;
                              if (event.key === 'Enter' || event.key === ' ') {
                                event.preventDefault();
                                navigate(`/destinations/${destination._id}`);
                              }
                            }}
                            style={{ cursor: 'pointer' }}
                          >
                            <div className="position-relative">
                              {destination.images?.[0] ? (
                                <img src={destination.images[0]} className="card-img-top" alt={destination.name} style={{ height: '220px', objectFit: 'cover' }} />
                              ) : (
                                <div className="bg-light d-flex align-items-center justify-content-center text-muted" style={{ height: '220px' }}>
                                  <i className="bi bi-image fs-1"></i>
                                </div>
                              )}
                              <button
                                type="button"
                                className="btn btn-light rounded-circle position-absolute top-0 end-0 m-3 shadow-sm"
                                style={{ width: '40px', height: '40px' }}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  handleRemoveDestination(destination._id);
                                }}
                                disabled={Boolean(removingKey)}
                                aria-label={`Bỏ lưu điểm đến ${destination.name}`}
                                title="Bỏ yêu thích"
                              >
                                {removingKey === itemKey
                                  ? <span className="spinner-border spinner-border-sm" aria-hidden="true"></span>
                                  : <i className="bi bi-heart-fill text-danger"></i>}
                              </button>
                            </div>
                            <div className="card-body d-flex flex-column">
                              <h3 className="h5 card-title fw-bold">{destination.name}</h3>
                              <p className="text-muted small mb-2"><i className="bi bi-geo-alt-fill me-1"></i>{destination.location}</p>
                              <p className="card-text text-secondary flex-grow-1" style={{ display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                {destination.description}
                              </p>
                              <div className="mt-3">
                                <span className="text-warning"><i className="bi bi-star-fill me-1"></i>{destination.averageRating}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
              )}

              {activeTab === 'tours' && (
              <section aria-labelledby="favorite-tours-heading">
                <div className="mb-3">
                  <h2 id="favorite-tours-heading" className="h4 fw-bold mb-0">
                    <i className="bi bi-map-fill text-primary me-2"></i>
                    Tour yêu thích
                  </h2>
                </div>

                {favoriteTours.length === 0 ? (
                  <div className="card border-0 shadow-sm text-center py-4">
                    <div className="card-body text-muted">
                      <i className="bi bi-map fs-1 d-block mb-2"></i>
                      <p className="mb-3">Bạn chưa lưu tour nào.</p>
                      <Link to="/tours" className="btn btn-outline-primary btn-sm">Khám phá tour</Link>
                    </div>
                  </div>
                ) : (
                  <div className="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-4">
                    {favoriteTours.map((tour) => {
                      const itemKey = `tour:${tour._id}`;
                      return (
                        <div key={tour._id} className="col">
                          <div
                            className="card h-100 border-0 shadow-sm rounded-4 overflow-hidden"
                            role="link"
                            tabIndex={0}
                            aria-label={`Xem chi tiết tour ${tour.title}`}
                            title="Xem chi tiết tour"
                            onClick={() => navigate(`/tours/${tour._id}`)}
                            onKeyDown={(event) => {
                              if (event.target !== event.currentTarget) return;
                              if (event.key === 'Enter' || event.key === ' ') {
                                event.preventDefault();
                                navigate(`/tours/${tour._id}`);
                              }
                            }}
                            style={{ cursor: 'pointer' }}
                          >
                            <div className="position-relative">
                              {tour.images?.[0] ? (
                                <img src={tour.images[0]} className="card-img-top" alt={tour.title} style={{ height: '220px', objectFit: 'cover' }} />
                              ) : (
                                <div className="bg-light d-flex align-items-center justify-content-center text-muted" style={{ height: '220px' }}>
                                  <i className="bi bi-image fs-1"></i>
                                </div>
                              )}
                              <span className="position-absolute bottom-0 start-0 bg-primary text-white px-3 py-1 fw-semibold">
                                {formatPrice(tour.price)}
                              </span>
                              <button
                                type="button"
                                className="btn btn-light rounded-circle position-absolute top-0 end-0 m-3 shadow-sm"
                                style={{ width: '40px', height: '40px' }}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  handleRemoveTour(tour._id);
                                }}
                                disabled={Boolean(removingKey)}
                                aria-label={`Bỏ lưu tour ${tour.title}`}
                                title="Bỏ yêu thích"
                              >
                                {removingKey === itemKey
                                  ? <span className="spinner-border spinner-border-sm" aria-hidden="true"></span>
                                  : <i className="bi bi-heart-fill text-danger"></i>}
                              </button>
                            </div>
                            <div className="card-body d-flex flex-column">
                              <div className="d-flex justify-content-between align-items-center mb-2">
                                <span className="badge text-bg-light border"><i className="bi bi-clock me-1"></i>{tour.duration}</span>
                                <span className="text-warning"><i className="bi bi-star-fill me-1"></i>{tour.averageRating}</span>
                              </div>
                              <h3 className="h5 card-title fw-bold">{tour.title}</h3>
                              <p className="text-muted small mb-2"><i className="bi bi-geo-alt-fill me-1"></i>{tour.location}</p>
                              <p className="card-text text-secondary flex-grow-1" style={{ display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                {tour.description}
                              </p>
                              <div className="mt-3 pt-3 border-top">
                                <span className="text-muted small"><i className="bi bi-person-check me-1"></i>Còn {tour.availableSeats} chỗ</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
              )}
            </>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
};

export default FavoriteDestinations;
