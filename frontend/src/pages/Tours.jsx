import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { tourApi } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import toursBanner from '../assets/banner_tours.jpg';

const Tours = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [tours, setTours] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [favoriteTourIds, setFavoriteTourIds] = useState(new Set());
  const [favoriteOwnerId, setFavoriteOwnerId] = useState('');
  const [savingFavoriteId, setSavingFavoriteId] = useState('');
  const [favoriteMessage, setFavoriteMessage] = useState('');
  const [favoriteError, setFavoriteError] = useState('');

  const today = new Date().toISOString().split('T')[0];

  // Search states
  const [departure, setDeparture] = useState('');
  const [destination, setDestination] = useState('');
  const [travelDate, setTravelDate] = useState(today);

  // Dropdown 
  const [showDepartureList, setShowDepartureList] = useState(false);
  const [showDestinationList, setShowDestinationList] = useState(false);

  // Danh sách tỉnh/thành (lấy từ API công khai)
  const [provinces, setProvinces] = useState(['Tất cả']);

  useEffect(() => {
    fetch('https://provinces.open-api.vn/api/p/')
      .then((res) => res.json())
      .then((data) => {
        const names = data.map((p) => p.name);
        setProvinces(['Tất cả', ...names]);
      })
      .catch(() => {
        // fallback nếu API lỗi
        setProvinces(['Tất cả', 'TP. Hồ Chí Minh', 'Hà Nội', 'Đà Nẵng', 'Cần Thơ', 'Hải Phòng']);
      });
  }, []);

  // Danh sách điểm đến trong nước
  const destinationOptions = ['Hà Nội', 'TP. Hồ Chí Minh', 'Đà Nẵng', 'Hội An', 'Phú Quốc', 'Nha Trang', 'Đà Lạt', 'Sapa', 'Hạ Long', 'Huế', 'Phan Thiết', 'Vũng Tàu'];

  // Lọc danh sách theo giá trị đang gõ
  const filteredDeparture = provinces.filter((o) =>
    o.toLowerCase().includes(departure.toLowerCase())
  );
  const filteredDestination = destinationOptions.filter((o) =>
    o.toLowerCase().includes(destination.toLowerCase())
  );

  const fetchTours = async (search = '') => {
    setLoading(true);
    setError(null);
    try {
      const response = await tourApi.getAll({ search });
      setTours(response.data || []);
    } catch (err) {
      setError(err.message || 'Không thể tải danh sách tour.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTours();
  }, []);

  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'customer') return;

    let isMounted = true;
    tourApi.getFavorites()
      .then((response) => {
        if (isMounted) {
          setFavoriteTourIds(new Set((response.favoriteTourIds || []).map(String)));
          setFavoriteOwnerId(String(user?.id || user?._id || ''));
        }
      })
      .catch((err) => {
        if (isMounted) {
          setFavoriteError(err.message || 'Không thể tải danh sách tour yêu thích.');
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, user?.role, user?.id, user?._id]);

  const isFavoriteTour = (tourId) => (
    favoriteOwnerId === String(user?.id || user?._id || '')
    && favoriteTourIds.has(String(tourId))
  );

  const handleToggleFavorite = async (tourId) => {
    const normalizedTourId = String(tourId);
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    if (user?.role !== 'customer') {
      setFavoriteError('Chức năng yêu thích chỉ dành cho khách hàng.');
      return;
    }

    setSavingFavoriteId(normalizedTourId);
    setFavoriteMessage('');
    setFavoriteError('');

    const isFav = isFavoriteTour(normalizedTourId);

    try {
      if (isFav) {
        const response = await tourApi.removeFavorite(normalizedTourId);
        setFavoriteTourIds((currentIds) => {
          const updatedIds = new Set(currentIds);
          updatedIds.delete(normalizedTourId);
          return updatedIds;
        });
        setFavoriteOwnerId(String(user?.id || user?._id || ''));
        setFavoriteMessage(response.message || 'Đã bỏ lưu tour yêu thích.');
      } else {
        const response = await tourApi.saveFavorite(normalizedTourId);
        setFavoriteTourIds((currentIds) => {
          const updatedIds = new Set(currentIds);
          updatedIds.add(String(response.tourId || normalizedTourId));
          return updatedIds;
        });
        setFavoriteOwnerId(String(user?.id || user?._id || ''));
        setFavoriteMessage(response.message || 'Đã lưu tour yêu thích.');
      }
    } catch (err) {
      setFavoriteError(err.message || (isFav ? 'Không thể bỏ lưu tour yêu thích.' : 'Không thể lưu tour yêu thích.'));
    } finally {
      setSavingFavoriteId('');
    }
  };

  // Xử lý submit tìm kiếm
  const handleSearch = (e) => {
    e.preventDefault();
    const keyword = [departure === 'Tất cả' ? '' : departure, destination].filter(Boolean).join(' ');
    fetchTours(keyword.trim());
  };

  // Xử lý reset
  const handleReset = () => {
    setDeparture('');
    setDestination('');
    setTravelDate('');
    fetchTours('');
  };

  return (
    <>
      <Navbar />
      <div className="container py-4 py-md-5" style={{ minHeight: '80vh' }}>

        {/* Banner */}
        <div
          className="position-relative overflow-hidden text-white shadow-sm"
          style={{
            borderRadius: '20px',
            minHeight: '260px',
            backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.55) 100%), url(${toursBanner})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            display: 'flex',
            alignItems: 'flex-end',
            padding: '2rem'
          }}
        >
          <div className="mb-4">
            <h2 className="fw-bold mb-2 fs-3">
              Tour trọn gói
            </h2>
            <p className="mb-0 text-white-50 small">
              Khám phá hàng trăm tour du lịch trong nước cùng TripMate
            </p>
          </div>
        </div>

        {/* Thanh tìm kiếm nổi */}
        <div className="row justify-content-center" style={{ marginTop: '-42px', position: 'relative', zIndex: 2 }}>
          <div className="col-12 col-lg-11">
            <div className="card border-0 shadow-lg p-3 p-md-4" style={{ borderRadius: '18px' }}>

              <form onSubmit={handleSearch}>
                <div className="row g-2 align-items-center">

                  {/* Điểm khởi hành */}
                  <div className="col-12 col-md-4 col-lg-4 position-relative">
                    <label className="form-label text-muted small fw-semibold mb-1">
                      <i className="bi bi-geo-alt me-1 text-primary"></i>Khởi hành từ
                    </label>
                    <div className="input-group">
                      <input
                        type="text"
                        className="form-control form-control-lg fs-6 border-0 bg-light"
                        placeholder="Chọn điểm khởi hành"
                        value={departure}
                        onChange={(e) => {
                          setDeparture(e.target.value);
                          setShowDepartureList(true);
                        }}
                        onFocus={() => setShowDepartureList(true)}
                        onBlur={() => setTimeout(() => setShowDepartureList(false), 200)}
                      />
                      <button
                        type="button"
                        className="btn bg-light border-0 text-muted"
                        onClick={() => setShowDepartureList(!showDepartureList)}
                        tabIndex={-1}
                      >
                        <i className="bi bi-chevron-down small"></i>
                      </button>
                    </div>

                    {showDepartureList && (
                      <div
                        className="dropdown-menu show w-100 shadow border-0 mt-1 py-1"
                        style={{ maxHeight: '200px', overflowY: 'auto', zIndex: 1000 }}
                      >
                        {filteredDeparture.length > 0 ? (
                          filteredDeparture.map((opt) => (
                            <button
                              key={opt}
                              type="button"
                              className="dropdown-item py-2 small"
                              onMouseDown={() => {
                                setDeparture(opt);
                                setShowDepartureList(false);
                              }}
                            >
                              {opt}
                            </button>
                          ))
                        ) : (
                          <div className="dropdown-item text-muted small py-2">Không tìm thấy</div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Điểm đến */}
                  <div className="col-12 col-md-3 col-lg-3 position-relative">
                    <label className="form-label text-muted small fw-semibold mb-1">
                      <i className="bi bi-pin-map me-1 text-primary"></i>Bạn muốn đi đâu?
                    </label>
                    <div className="input-group">
                      <input
                        type="text"
                        className="form-control form-control-lg fs-6 border-0 bg-light"
                        placeholder="Chọn điểm đến"
                        value={destination}
                        onChange={(e) => {
                          setDestination(e.target.value);
                          setShowDestinationList(true);
                        }}
                        onFocus={() => setShowDestinationList(true)}
                        onBlur={() => setTimeout(() => setShowDestinationList(false), 200)}
                      />
                      <button
                        type="button"
                        className="btn bg-light border-0 text-muted"
                        onClick={() => setShowDestinationList(!showDestinationList)}
                        tabIndex={-1}
                      >
                        <i className="bi bi-chevron-down small"></i>
                      </button>
                    </div>

                    {showDestinationList && (
                      <div
                        className="dropdown-menu show w-100 shadow border-0 mt-1 py-1"
                        style={{ maxHeight: '200px', overflowY: 'auto', zIndex: 1000 }}
                      >
                        {filteredDestination.length > 0 ? (
                          filteredDestination.map((opt) => (
                            <button
                              key={opt}
                              type="button"
                              className="dropdown-item py-2 small"
                              onMouseDown={() => {
                                setDestination(opt);
                                setShowDestinationList(false);
                              }}
                            >
                              {opt}
                            </button>
                          ))
                        ) : (
                          <div className="dropdown-item text-muted small py-2">Không tìm thấy</div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Ngày khởi hành */}
                  <div className="col-12 col-md-3 col-lg-3">
                    <label className="form-label text-muted small fw-semibold mb-1">
                      <i className="bi bi-calendar3 me-1 text-primary"></i>Ngày khởi hành
                    </label>
                    <input
                      type="date"
                      className="form-control form-control-lg fs-6 border-0 bg-light"
                      value={travelDate}
                      min={today}
                      onChange={(e) => setTravelDate(e.target.value)}
                    />
                  </div>

                  {/* Nút Tìm kiếm */}
                  <div className="col-12 col-md-2 col-lg-2 d-flex align-items-end">
                    <button
                      type="submit"
                      className="btn w-100 py-2 fw-semibold d-flex align-items-center justify-content-center gap-2 rounded-pill text-white"
                      style={{ backgroundColor: '#0057e7', borderColor: '#0057e7' }}
                    >
                      <i className="bi bi-search"></i>
                      <span>Tìm kiếm</span>
                    </button>
                  </div>

                </div>
              </form>

            </div>
          </div>
        </div>

        {/* Danh sách Tour */}
        <div className="mt-5">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h4 className="fw-bold mb-0">Các Tour đang mở</h4>
            {(departure || destination || travelDate) && (
              <button
                type="button"
                className="btn btn-link btn-sm text-decoration-none"
                onClick={handleReset}
              >
                <i className="bi bi-arrow-counterclockwise me-1"></i>Xem tất cả
              </button>
            )}
          </div>

          {favoriteMessage && (
            <div className="alert alert-success alert-dismissible" role="alert">
              {favoriteMessage}
              <button
                type="button"
                className="btn-close"
                aria-label="Đóng"
                onClick={() => setFavoriteMessage('')}
              ></button>
            </div>
          )}

          {favoriteError && (
            <div className="alert alert-danger alert-dismissible" role="alert">
              {favoriteError}
              <button
                type="button"
                className="btn-close"
                aria-label="Đóng"
                onClick={() => setFavoriteError('')}
              ></button>
            </div>
          )}

          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          ) : error ? (
            <div className="alert alert-danger" role="alert">
              {error}
            </div>
          ) : tours.length === 0 ? (
            <div className="text-center text-muted py-5 border rounded bg-light">
              <i className="bi bi-compass fs-1 text-secondary mb-3 d-block"></i>
              <h5 className="fw-bold">Hiện chưa có tour nào</h5>
              <p>Xin lỗi, hiện tại chúng tôi chưa có tour nào.</p>
            </div>
          ) : (
            <div className="row row-cols-1 row-cols-md-3 g-4">
              {tours.map((tour) => (
                <div key={tour._id} className="col">
                  <div
                    className="card h-100 shadow-sm border-0 position-relative overflow-hidden"
                    role="link"
                    tabIndex={0}
                    aria-label={`Xem chi tiết tour ${tour.title}`}
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
                        <img
                          src={tour.images[0]}
                          className="card-img-top"
                          alt={tour.title}
                          style={{ height: '220px', objectFit: 'cover' }}
                        />
                      ) : (
                        <div className="card-img-top bg-light d-flex align-items-center justify-content-center text-muted" style={{ height: '220px' }}>
                          <i className="bi bi-image fs-1"></i>
                        </div>
                      )}

                      {/* Phần giá nằm bên trái giống như ở trong phần yêu thích */}
                      <span className="position-absolute bottom-0 start-0 bg-primary text-white px-3 py-1 fw-semibold">
                        {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(tour.price)}
                      </span>

                      {/* Phần tim nằm ở trên cùng bên phải giống như ở trong phần yêu thích, thích/hủy thích trực tiếp */}
                      <button
                        type="button"
                        className="btn btn-light rounded-circle position-absolute top-0 end-0 m-3 shadow-sm d-flex align-items-center justify-content-center"
                        style={{ width: '40px', height: '40px', zIndex: 2 }}
                        onClick={(event) => {
                          event.stopPropagation();
                          handleToggleFavorite(tour._id);
                        }}
                        disabled={savingFavoriteId === String(tour._id)}
                        aria-label={isFavoriteTour(tour._id) ? `Bỏ lưu tour ${tour.title}` : `Lưu tour ${tour.title}`}
                        title={isFavoriteTour(tour._id) ? 'Bỏ yêu thích' : 'Yêu thích'}
                      >
                        {savingFavoriteId === String(tour._id) ? (
                          <span className="spinner-border spinner-border-sm text-danger" aria-hidden="true"></span>
                        ) : (
                          <i className={`bi ${isFavoriteTour(tour._id) ? 'bi-heart-fill text-danger' : 'bi-heart text-secondary'} fs-5`}></i>
                        )}
                      </button>
                    </div>

                    <div className="card-body">
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <span className="badge bg-light text-dark border">
                          <i className="bi bi-clock me-1"></i>{tour.duration}
                        </span>
                        <div className="text-warning small fw-bold">
                          <i className="bi bi-star-fill me-1"></i>{tour.averageRating}
                        </div>
                      </div>
                      <h5 className="card-title fw-bold mb-1">{tour.title}</h5>
                      <p className="card-text text-muted small mb-3">
                        <i className="bi bi-geo-alt-fill me-1"></i>{tour.location}
                      </p>
                      <p className="card-text text-secondary" style={{
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        fontSize: '0.9rem'
                      }}>
                        {tour.description}
                      </p>
                      <div className="mt-3 pt-3 border-top">
                        <span className="text-muted small">
                          <i className="bi bi-person-check me-1"></i>Còn {tour.availableSeats} chỗ
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
      <Footer />
    </>
  );
};

export default Tours;
