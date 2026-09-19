import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { tourApi } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { DEPARTURE_LOCATIONS } from '../constants/provinces';
import toursBanner from '../assets/banner_tours.jpg';

const DEFAULT_IMAGE_FALLBACK = 'https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=800&q=80';
const DESTINATION_OPTIONS = [
  'Hạ Long',
  'Đà Nẵng',
  'Hội An',
  'Phú Quốc',
  'Sapa',
  'Đà Lạt',
  'Huế',
  'Nha Trang',
  'Cần Thơ',
  'Ninh Bình',
  'Quy Nhơn',
  'Phan Thiết',
  'Vũng Tàu',
  'Hà Nội',
  'TP. Hồ Chí Minh'
];

const getPaginationItems = (currentPage, totalPages) => {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  if (currentPage <= 4) {
    return [1, 2, 3, 4, 5, '...', totalPages];
  }
  if (currentPage >= totalPages - 3) {
    return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  }
  return [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
};

const Tours = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const toast = useToast();
  const [tours, setTours] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [favoriteTourIds, setFavoriteTourIds] = useState(new Set());
  const [favoriteOwnerId, setFavoriteOwnerId] = useState('');
  const [savingFavoriteId, setSavingFavoriteId] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalTours, setTotalTours] = useState(0);

  const [departure, setDeparture] = useState('');
  const [destination, setDestination] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [minSeats, setMinSeats] = useState('');
  const [sort, setSort] = useState('newest');

  const fetchTours = async (filters = {}, pageNum = 1) => {
    setLoading(true);
    setError(null);
    try {
      const response = await tourApi.getAll({ ...filters, page: pageNum, limit: 6 });
      setTours(response.data || []);
      setTotalPages(response.totalPages || 1);
      setTotalTours(response.total !== undefined ? response.total : (response.data || []).length);
      setCurrentPage(response.currentPage || pageNum);
    } catch (err) {
      setError(err.message || 'Không thể tải danh sách tour.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const urlSearch = searchParams.get('search') || '';
    if (urlSearch) {
      const matched = DESTINATION_OPTIONS.find(
        (d) => d.toLowerCase().includes(urlSearch.toLowerCase()) || urlSearch.toLowerCase().includes(d.toLowerCase())
      );
      if (matched) {
        setDestination(matched);
      }
      fetchTours({ search: urlSearch });
    } else {
      fetchTours();
    }
  }, [searchParams]);

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
          toast.error(err.message || 'Không thể tải danh sách tour yêu thích.');
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, user?.role, user?.id, user?._id, toast]);

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
      toast.warning('Chức năng yêu thích chỉ dành cho khách hàng.');
      return;
    }

    setSavingFavoriteId(normalizedTourId);
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
        toast.success(response.message || 'Đã bỏ lưu tour yêu thích.');
      } else {
        const response = await tourApi.saveFavorite(normalizedTourId);
        setFavoriteTourIds((currentIds) => {
          const updatedIds = new Set(currentIds);
          updatedIds.add(String(response.tourId || normalizedTourId));
          return updatedIds;
        });
        setFavoriteOwnerId(String(user?.id || user?._id || ''));
        toast.success(response.message || 'Đã lưu tour yêu thích.');
      }
    } catch (err) {
      toast.error(err.message || (isFav ? 'Không thể bỏ lưu tour yêu thích.' : 'Không thể lưu tour yêu thích.'));
    } finally {
      setSavingFavoriteId('');
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchTours({
      departure: departure === 'Tất cả' ? '' : departure.trim(),
      destination: destination.trim(),
      maxPrice,
      minSeats,
      sort
    }, 1);
  };

  const handleReset = () => {
    setDeparture('');
    setDestination('');
    setMaxPrice('');
    setMinSeats('');
    setSort('newest');
    setCurrentPage(1);
    fetchTours({ sort: 'newest' }, 1);
  };

  const handleSortChange = (event) => {
    const nextSort = event.target.value;
    setSort(nextSort);
    setCurrentPage(1);
    fetchTours({
      departure: departure === 'Tất cả' ? '' : departure.trim(),
      destination: destination.trim(),
      maxPrice,
      minSeats,
      sort: nextSort
    }, 1);
  };

  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > totalPages || newPage === currentPage) return;
    setCurrentPage(newPage);
    fetchTours({
      departure: departure === 'Tất cả' ? '' : departure.trim(),
      destination: destination.trim(),
      maxPrice,
      minSeats,
      sort
    }, newPage);
    window.scrollTo({ top: 380, behavior: 'smooth' });
  };

  return (
    <>
      <Navbar />
      <div className="container py-4 py-md-5" style={{ minHeight: '80vh' }}>

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

        <div className="row justify-content-center" style={{ marginTop: '-42px', position: 'relative', zIndex: 10 }}>
          <div className="col-12 col-lg-11">
            <div className="card border-0 shadow-lg p-3 p-md-4 bg-white" style={{ borderRadius: '20px' }}>
              <form onSubmit={handleSearch}>
                <div className="row g-3 align-items-end">
                  <div className="col-12 col-md-6 col-lg-3">
                    <label className="form-label small text-secondary fw-semibold mb-1 d-flex align-items-center gap-1" htmlFor="tour-departure-select">
                      <i className="bi bi-geo-alt text-primary"></i>
                      <span>Khởi hành từ</span>
                    </label>
                    <select
                      id="tour-departure-select"
                      className="form-select form-select-lg fs-6 bg-light border-light-subtle rounded-3"
                      style={{ height: '48px' }}
                      value={departure}
                      onChange={(e) => setDeparture(e.target.value)}
                    >
                      <option value="">Tất cả điểm khởi hành</option>
                      {DEPARTURE_LOCATIONS.map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>

                  <div className="col-12 col-md-6 col-lg-3">
                    <label className="form-label small text-secondary fw-semibold mb-1 d-flex align-items-center gap-1" htmlFor="tour-destination-select">
                      <i className="bi bi-pin-map text-primary"></i>
                      <span>Bạn muốn đi đâu?</span>
                    </label>
                    <select
                      id="tour-destination-select"
                      className="form-select form-select-lg fs-6 bg-light border-light-subtle rounded-3"
                      style={{ height: '48px' }}
                      value={destination}
                      onChange={(e) => setDestination(e.target.value)}
                    >
                      <option value="">Tất cả điểm đến</option>
                      {DESTINATION_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>

                  <div className="col-6 col-md-3 col-lg-2">
                    <label className="form-label small text-secondary fw-semibold mb-1 d-flex align-items-center gap-1" htmlFor="tour-max-price">
                      <i className="bi bi-cash-stack text-primary"></i>
                      <span>Giá tối đa</span>
                    </label>
                    <div className="position-relative">
                      <input
                        id="tour-max-price"
                        type="text"
                        inputMode="numeric"
                        className="form-control form-control-lg fs-6 bg-light border-light-subtle rounded-3 pe-4"
                        style={{ height: '48px' }}
                        value={maxPrice ? Number(maxPrice).toLocaleString('vi-VN') : ''}
                        placeholder="Không giới hạn"
                        onChange={(e) => {
                          const raw = e.target.value.replace(/\D/g, '');
                          setMaxPrice(raw);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'ArrowUp') {
                            e.preventDefault();
                            const cur = maxPrice ? Number(maxPrice) : 0;
                            setMaxPrice(String(cur + 100000));
                          } else if (e.key === 'ArrowDown') {
                            e.preventDefault();
                            const cur = maxPrice ? Number(maxPrice) : 0;
                            const next = Math.max(0, cur - 100000);
                            setMaxPrice(next > 0 ? String(next) : '');
                          }
                        }}
                      />
                      <div
                        className="position-absolute end-0 top-50 translate-middle-y d-flex flex-column align-items-center justify-content-center me-2 pe-1"
                        style={{
                          width: '15px',
                          zIndex: 2,
                          userSelect: 'none'
                        }}
                      >
                        <button
                          type="button"
                          className="btn p-0 border-0 d-flex align-items-center justify-content-center bg-transparent"
                          style={{ width: '13px', height: '9px', lineHeight: 1 }}
                          onClick={() => {
                            const cur = maxPrice ? Number(maxPrice) : 0;
                            setMaxPrice(String(cur + 100000));
                          }}
                          tabIndex={-1}
                          aria-label="Tăng giá"
                        >
                          <svg width="7" height="4" viewBox="0 0 7 4" fill="#64748b">
                            <path d="M3.5 0L7 4H0L3.5 0Z" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          className="btn p-0 border-0 d-flex align-items-center justify-content-center bg-transparent"
                          style={{ width: '13px', height: '9px', lineHeight: 1, marginTop: '2px' }}
                          onClick={() => {
                            const cur = maxPrice ? Number(maxPrice) : 0;
                            const next = Math.max(0, cur - 100000);
                            setMaxPrice(next > 0 ? String(next) : '');
                          }}
                          tabIndex={-1}
                          aria-label="Giảm giá"
                        >
                          <svg width="7" height="4" viewBox="0 0 7 4" fill="#64748b">
                            <path d="M3.5 4L0 0H7L3.5 4Z" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="col-6 col-md-3 col-lg-2">
                    <label className="form-label small text-secondary fw-semibold mb-1 d-flex align-items-center gap-1" htmlFor="tour-min-seats">
                      <i className="bi bi-people text-primary"></i>
                      <span>Số chỗ</span>
                    </label>
                    <input
                      id="tour-min-seats"
                      type="number"
                      className="form-control form-control-lg fs-6 bg-light border-light-subtle rounded-3"
                      style={{ height: '48px' }}
                      value={minSeats}
                      min="1"
                      placeholder="Tối thiểu 1"
                      onChange={(e) => setMinSeats(e.target.value)}
                    />
                  </div>

                  <div className="col-12 col-md-6 col-lg-2">
                    <button
                      type="submit"
                      className="btn btn-primary btn-lg w-100 fs-6 fw-semibold d-flex align-items-center justify-content-center gap-2 rounded-pill shadow-sm text-white"
                      style={{ height: '48px' }}
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

        <div className="mt-5">
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4 pb-2 border-bottom border-light-subtle">
            <div>
              <h3 className="fw-bold mb-1 font-display">Các Tour du lịch</h3>
              <p className="text-muted small mb-0">
                Tìm thấy <span className="fw-bold text-primary">{totalTours}</span> hành trình khám phá phù hợp
              </p>
            </div>
            <div className="d-flex align-items-center gap-2">
              <label className="text-muted small fw-medium text-nowrap d-flex align-items-center gap-1">
                <i className="bi bi-arrow-down-up"></i>
                <span>Sắp xếp:</span>
              </label>
              <select
                className="form-select form-select-sm rounded-pill px-3 shadow-none border-secondary-subtle"
                style={{ width: '160px', height: '38px' }}
                value={sort}
                onChange={handleSortChange}
                aria-label="Sắp xếp tour"
              >
                <option value="newest">Mới nhất</option>
                <option value="priceAsc">Giá tăng dần</option>
                <option value="priceDesc">Giá giảm dần</option>
                <option value="rating">Đánh giá cao</option>
              </select>
            </div>
          </div>

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
            <div className="text-center text-muted py-5 border rounded-4 bg-light">
              <i className="bi bi-compass fs-1 text-secondary mb-3 d-block"></i>
              <h5 className="fw-bold">Không tìm thấy tour nào</h5>
              <p className="small mb-3">Xin lỗi, hiện tại chưa có tour nào phù hợp với điều kiện tìm kiếm của bạn.</p>
              <button className="btn btn-outline-primary btn-sm rounded-pill px-4" onClick={handleReset}>
                Đặt lại bộ lọc
              </button>
            </div>
          ) : (
            <div className="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-4">
              {tours.map((tour) => (
                <div key={tour._id} className="col">
                  <div
                    className="editorial-card h-100 overflow-hidden d-flex flex-column cursor-pointer"
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
                  >
                    <div className="editorial-zoom-img position-relative" style={{ height: '230px' }}>
                      <img
                        src={tour.images?.[0] || DEFAULT_IMAGE_FALLBACK}
                        className="w-100 h-100"
                        alt={tour.title}
                        style={{ objectFit: 'cover' }}
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = DEFAULT_IMAGE_FALLBACK;
                        }}
                      />

                      <div className="position-absolute top-0 start-0 m-3 d-flex flex-wrap gap-1" style={{ zIndex: 2 }}>
                        <span className="badge bg-dark bg-opacity-75 text-white rounded-pill px-3 py-1.5 shadow-sm fw-normal">
                          <i className="bi bi-clock me-1"></i>{tour.duration}
                        </span>
                      </div>

                      <button
                        type="button"
                        className="btn btn-light rounded-circle position-absolute top-0 end-0 m-3 shadow-sm d-flex align-items-center justify-content-center"
                        style={{ width: '38px', height: '38px', zIndex: 3 }}
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
                          <i className={`bi ${isFavoriteTour(tour._id) ? 'bi-heart-fill text-danger' : 'bi-heart text-secondary'} fs-6`}></i>
                        )}
                      </button>

                      <span className="position-absolute bottom-0 start-0 m-3 badge bg-primary text-white shadow px-3 py-2 fs-6 rounded-pill fw-bold" style={{ zIndex: 2 }}>
                        {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(tour.price)}
                      </span>
                    </div>

                    <div className="p-4 d-flex flex-column flex-grow-1">
                      <div className="text-muted small fw-medium mb-2 d-flex align-items-center">
                        <i className="bi bi-geo-alt-fill text-danger me-1 flex-shrink-0"></i>
                        <span className="text-truncate">
                          {tour.departureLocation
                            ? `${tour.departureLocation} → ${tour.destinationLocation || tour.location}`
                            : (tour.destinationLocation || tour.location)}
                        </span>
                      </div>
                      <h5 className="font-display fw-bold text-dark mb-2 text-truncate" title={tour.title}>
                        {tour.title}
                      </h5>
                      <p
                        className="text-secondary small mb-3 flex-grow-1"
                        style={{
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          lineHeight: '1.6'
                        }}
                      >
                        {tour.description}
                      </p>
                      <div className="pt-3 border-top border-light-subtle mt-auto d-flex justify-content-between align-items-center">
                        <span className="small text-muted d-inline-flex align-items-center">
                          <i className="bi bi-check-circle-fill text-success me-1.5"></i>Còn {tour.availableSeats ?? 0} chỗ
                        </span>
                        <div className="d-flex align-items-center gap-2">
                          <span className="small fw-bold text-warning d-inline-flex align-items-center">
                            <i className="bi bi-star-fill me-1"></i>{tour.averageRating ? tour.averageRating.toFixed(1) : '5.0'}
                          </span>
                          <span className="text-primary small fw-semibold d-inline-flex align-items-center gap-1">
                            Chi tiết <i className="bi bi-arrow-right"></i>
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <div className="d-flex flex-column flex-sm-row justify-content-between align-items-center gap-3 mt-5 pt-4 border-top border-light-subtle">
              <span className="text-muted small">
                Trang <strong className="text-dark">{currentPage}</strong> trên <strong className="text-dark">{totalPages}</strong> (Tổng cộng {totalTours} tour)
              </span>
              <nav aria-label="Phân trang tour du lịch">
                <ul className="pagination pagination-sm mb-0 gap-1 align-items-center">
                  <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-secondary rounded-pill px-3 py-1.5 d-flex align-items-center gap-1 shadow-none"
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                    >
                      <i className="bi bi-chevron-left"></i>
                      <span className="d-none d-sm-inline">Trước</span>
                    </button>
                  </li>
                  {getPaginationItems(currentPage, totalPages).map((item, idx) => {
                    if (item === '...') {
                      return (
                        <li key={`ellipsis-${idx}`} className="page-item px-1">
                          <span className="text-muted small user-select-none">…</span>
                        </li>
                      );
                    }
                    const isActive = item === currentPage;
                    return (
                      <li key={item} className="page-item">
                        <button
                          type="button"
                          className={`btn btn-sm rounded-circle d-flex align-items-center justify-content-center shadow-none ${
                            isActive
                              ? 'btn-primary text-white fw-bold shadow-sm'
                              : 'btn-outline-secondary text-dark border-0'
                          }`}
                          style={{ width: '36px', height: '36px' }}
                          onClick={() => handlePageChange(item)}
                        >
                          {item}
                        </button>
                      </li>
                    );
                  })}
                  <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-secondary rounded-pill px-3 py-1.5 d-flex align-items-center gap-1 shadow-none"
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                    >
                      <span className="d-none d-sm-inline">Sau</span>
                      <i className="bi bi-chevron-right"></i>
                    </button>
                  </li>
                </ul>
              </nav>
            </div>
          )}
        </div>

      </div>
      <Footer />
    </>
  );
};

export default Tours;
