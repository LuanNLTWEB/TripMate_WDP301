import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { tourApi } from '../services/api';
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
    if (!isAuthenticated || user?.role !== 'customer') return;

    let isMounted = true;
    tourApi.getFavorites()
      .then((response) => {
        if (isMounted) {
          setIsFavorite((response.favoriteTourIds || []).map(String).includes(String(id)));
        }
      })
      .catch(() => {});

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
      <main className="bg-light py-4 py-md-5" style={{ minHeight: '80vh' }}>
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

          <div className="row g-4">
            <div className="col-lg-8">
              <div className="card border-0 shadow-sm rounded-4 h-100">
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

                  <div className="d-flex flex-wrap gap-3 mb-4">
                    <span className="badge text-bg-light border px-3 py-2">
                      <i className="bi bi-clock me-2"></i>{tour.duration}
                    </span>
                    <span className="badge text-bg-light border px-3 py-2 text-warning">
                      <i className="bi bi-star-fill me-2"></i>{tour.averageRating}
                    </span>
                    <span className="badge text-bg-light border px-3 py-2">
                      <i className="bi bi-person-check me-2"></i>Còn {tour.availableSeats} chỗ
                    </span>
                  </div>

                  <h2 className="h4 fw-bold mb-3">Giới thiệu tour</h2>
                  <p className="text-secondary lh-lg mb-0" style={{ whiteSpace: 'pre-line' }}>{tour.description}</p>
                </div>
              </div>
            </div>

            <div className="col-lg-4">
              <div className="card border-0 shadow-sm rounded-4">
                <div className="card-body p-4">
                  <p className="text-muted mb-1">Giá tour</p>
                  <p className="fs-3 fw-bold text-primary mb-3">{formatPrice(tour.price)}</p>
                  <hr />
                  <p className="small text-muted mb-0">
                    <i className="bi bi-info-circle me-2"></i>
                    Giá và số chỗ có thể thay đổi theo lịch khởi hành.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
};

export default TourDetails;
