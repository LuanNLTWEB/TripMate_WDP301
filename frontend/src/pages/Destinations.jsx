import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { destinationApi, destinationCategoryApi } from '../services/api';
const destinationsBanner = 'https://res.cloudinary.com/fkjcxcyn/image/upload/v1789823911/tripmate_assets/jmgdqrgkput0yvptbvyr.jpg';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';

const DEFAULT_IMAGE_FALLBACK = 'https://res.cloudinary.com/fkjcxcyn/image/upload/v1789824275/tripmate_assets/g6tkjy46skan17hyreku.jpg';

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

const Destinations = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const toast = useToast();
  const [destinations, setDestinations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [minRating, setMinRating] = useState('');
  const [popularOnly, setPopularOnly] = useState(false);
  const [sort, setSort] = useState('newest');
  const [categories, setCategories] = useState([]);
  const [favoriteIds, setFavoriteIds] = useState(new Set());
  const [toggling, setToggling] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalDestinations, setTotalDestinations] = useState(0);

  const fetchDestinations = async (filters = {}, pageNum = 1) => {
    setLoading(true);
    setError(null);
    try {
      const response = await destinationApi.getAll({ ...filters, page: pageNum, limit: 6 });
      setDestinations(response.data || []);
      setTotalPages(response.totalPages || 1);
      setTotalDestinations(response.total !== undefined ? response.total : (response.data || []).length);
      setCurrentPage(response.currentPage || pageNum);
    } catch (err) {
      setError(err.message || 'Không thể tải danh sách điểm đến.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDestinations();
    destinationCategoryApi.getAll()
      .then((response) => setCategories(response.data || []))
      .catch((requestError) => toast.error(requestError.message || 'Không thể tải danh mục điểm đến.'));
  }, [toast]);

  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'customer') return;
    destinationApi.getFavorites()
      .then((res) => {
        const ids = new Set((res.data || []).map((d) => d._id));
        setFavoriteIds(ids);
      })
      .catch(() => {});
  }, [isAuthenticated, user?.role]);

  const handleToggleFavorite = async (e, destId) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) {
      toast.info('Vui lòng đăng nhập để lưu điểm đến yêu thích.');
      navigate('/login');
      return;
    }
    if (user?.role !== 'customer') {
      toast.warning('Chức năng yêu thích chỉ dành cho khách hàng.');
      return;
    }
    if (toggling === destId) return;
    setToggling(destId);
    try {
      const res = await destinationApi.toggleFavorite(destId);
      setFavoriteIds((prev) => {
        const next = new Set(prev);
        if (res.isFavorite) next.add(destId);
        else next.delete(destId);
        return next;
      });
      toast.success(res.message || (res.isFavorite ? 'Đã lưu điểm đến yêu thích.' : 'Đã bỏ lưu điểm đến yêu thích.'));
    } catch (requestError) {
      toast.error(requestError.message || 'Không thể cập nhật điểm đến yêu thích.');
    } finally {
      setToggling(null);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchDestinations({
      search: searchTerm.trim(),
      categoryId,
      minRating,
      isPopular: popularOnly ? 'true' : '',
      sort
    }, 1);
  };

  const handleReset = () => {
    setSearchTerm('');
    setCategoryId('');
    setMinRating('');
    setPopularOnly(false);
    setSort('newest');
    setCurrentPage(1);
    fetchDestinations({ sort: 'newest' }, 1);
  };

  const handleSortChange = (event) => {
    const nextSort = event.target.value;
    setSort(nextSort);
    setCurrentPage(1);
    fetchDestinations({
      search: searchTerm.trim(),
      categoryId,
      minRating,
      isPopular: popularOnly ? 'true' : '',
      sort: nextSort
    }, 1);
  };

  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > totalPages || newPage === currentPage) return;
    setCurrentPage(newPage);
    fetchDestinations({
      search: searchTerm.trim(),
      categoryId,
      minRating,
      isPopular: popularOnly ? 'true' : '',
      sort
    }, newPage);
    window.scrollTo({ top: 380, behavior: 'smooth' });
  };

  const hasFilters = Boolean(searchTerm || categoryId || minRating || popularOnly || sort !== 'newest');

  return (
    <>
      <Navbar />
      <div className="container py-4 py-md-5" style={{ minHeight: '80vh' }}>
        <div
          className="position-relative overflow-hidden text-white shadow-sm"
          style={{
            borderRadius: '20px',
            minHeight: '260px',
            backgroundImage: `linear-gradient(to top, rgba(0, 0, 0, 0.75) 0%, rgba(0, 0, 0, 0.25) 60%, rgba(0, 0, 0, 0.05) 100%), url(${destinationsBanner})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            display: 'flex',
            alignItems: 'flex-end',
            padding: '2rem'
          }}
        >
          <div className="mb-4">
            <h2 className="fw-bold mb-2 fs-3 fs-md-2">
              Điểm đến tiếp theo của bạn? Khám phá cùng TripMate
            </h2>
            <p className="mb-0 text-white-50 small fs-md-6">
              Khám phá nhiều lựa chọn từ các thành phố, địa danh, danh lam thắng cảnh và hơn thế nữa
            </p>
          </div>
        </div>

        <div className="row justify-content-center" style={{ marginTop: '-42px', position: 'relative', zIndex: 10 }}>
          <div className="col-12 col-lg-11">
            <div className="card border-0 shadow-lg p-3 p-md-4 bg-white" style={{ borderRadius: '20px' }}>
              <form onSubmit={handleSearch}>
                <div className="row g-3 align-items-end">
                  <div className="col-12 col-md-6 col-lg-4">
                    <label className="form-label small text-secondary fw-semibold mb-1 d-flex align-items-center gap-1">
                      <i className="bi bi-geo-alt text-primary"></i>
                      <span>Tìm kiếm điểm đến</span>
                    </label>
                    <div className="position-relative">
                      <input
                        type="text"
                        className="form-control form-control-lg fs-6 bg-light border-light-subtle rounded-3"
                        style={{ height: '48px', paddingRight: searchTerm ? '38px' : '14px' }}
                        placeholder="Tên thành phố, địa danh, thắng cảnh..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                      {searchTerm && (
                        <button
                          type="button"
                          className="btn btn-sm btn-link text-muted position-absolute p-0"
                          style={{ right: '12px', top: '50%', transform: 'translateY(-50%)', textDecoration: 'none' }}
                          onClick={handleReset}
                          title="Xóa từ khóa"
                        >
                          <i className="bi bi-x-circle-fill fs-6"></i>
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="col-6 col-md-3 col-lg-2">
                    <label className="form-label small text-secondary fw-semibold mb-1 d-flex align-items-center gap-1" htmlFor="destination-category-filter">
                      <i className="bi bi-grid text-primary"></i>
                      <span>Danh mục</span>
                    </label>
                    <select
                      id="destination-category-filter"
                      className="form-select form-select-lg fs-6 bg-light border-light-subtle rounded-3"
                      style={{ height: '48px' }}
                      value={categoryId}
                      onChange={(event) => setCategoryId(event.target.value)}
                    >
                      <option value="">Tất cả danh mục</option>
                      {categories.map((category) => (
                        <option key={category._id} value={category._id}>{category.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="col-6 col-md-3 col-lg-2">
                    <label className="form-label small text-secondary fw-semibold mb-1 d-flex align-items-center gap-1" htmlFor="destination-rating-filter">
                      <i className="bi bi-star-fill text-warning"></i>
                      <span>Đánh giá</span>
                    </label>
                    <select
                      id="destination-rating-filter"
                      className="form-select form-select-lg fs-6 bg-light border-light-subtle rounded-3"
                      style={{ height: '48px' }}
                      value={minRating}
                      onChange={(event) => setMinRating(event.target.value)}
                    >
                      <option value="">Tất cả đánh giá</option>
                      <option value="4">Từ 4 sao trở lên</option>
                      <option value="3">Từ 3 sao trở lên</option>
                      <option value="2">Từ 2 sao trở lên</option>
                    </select>
                  </div>

                  <div className="col-6 col-md-6 col-lg-2">
                    <label className="form-label small text-secondary fw-semibold mb-1 d-flex align-items-center gap-1">
                      <i className="bi bi-stars text-primary"></i>
                      <span>Đặc điểm</span>
                    </label>
                    <div
                      className="form-control form-control-lg fs-6 d-flex align-items-center justify-content-between bg-light border-light-subtle rounded-3 px-3 cursor-pointer"
                      style={{ height: '48px' }}
                      onClick={() => setPopularOnly(!popularOnly)}
                    >
                      <span className="small fw-semibold text-secondary">Nổi bật</span>
                      <div className="form-check form-switch mb-0 p-0" style={{ minHeight: 'auto' }}>
                        <input
                          id="destination-popular-filter"
                          type="checkbox"
                          className="form-check-input ms-0 cursor-pointer"
                          checked={popularOnly}
                          onChange={(event) => setPopularOnly(event.target.checked)}
                          onClick={(e) => e.stopPropagation()}
                          style={{ width: '2.2em', height: '1.2em' }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="col-6 col-md-6 col-lg-2">
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
              <h3 className="fw-bold mb-1 font-display">Danh sách điểm đến</h3>
              <p className="text-muted small mb-0">
                Tìm thấy <span className="fw-bold text-primary">{totalDestinations}</span> điểm đến tuyệt vời
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
                aria-label="Sắp xếp điểm đến"
              >
                <option value="newest">Mới nhất</option>
                <option value="rating">Đánh giá cao</option>
                <option value="nameAsc">Tên A–Z</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Đang tải...</span>
              </div>
            </div>
          ) : error ? (
            <div className="alert alert-danger" role="alert">
              {error}
            </div>
          ) : destinations.length === 0 ? (
            <div className="text-center text-muted py-5 border rounded-4 bg-light">
              <i className="bi bi-geo-alt fs-1 text-secondary mb-3 d-block"></i>
              <h5 className="fw-bold">Không tìm thấy điểm đến nào</h5>
              <p className="small mb-3">Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm để khám phá nhiều hơn.</p>
              {hasFilters && (
                <button className="btn btn-outline-primary btn-sm rounded-pill px-4" onClick={handleReset}>
                  Đặt lại bộ lọc
                </button>
              )}
            </div>
          ) : (
            <div className="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-4">
              {destinations.map((destination) => (
                <div key={destination._id} className="col">
                  <div
                    className="editorial-card h-100 overflow-hidden d-flex flex-column cursor-pointer"
                    role="link"
                    tabIndex={0}
                    aria-label={`Xem chi tiết điểm đến ${destination.name}`}
                    onClick={() => navigate(`/destinations/${destination._id}`)}
                    onKeyDown={(e) => {
                      if (e.target !== e.currentTarget) return;
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        navigate(`/destinations/${destination._id}`);
                      }
                    }}
                  >
                    <div className="editorial-zoom-img position-relative" style={{ height: '230px' }}>
                      <img
                        src={destination.images?.[0] || DEFAULT_IMAGE_FALLBACK}
                        className="w-100 h-100"
                        alt={destination.name}
                        style={{ objectFit: 'cover' }}
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = DEFAULT_IMAGE_FALLBACK;
                        }}
                      />
                      <div className="position-absolute top-0 start-0 m-3 d-flex flex-wrap gap-1" style={{ zIndex: 2 }}>
                        {destination.isPopular && (
                          <span className="badge bg-primary text-white rounded-pill px-3 py-1.5 shadow-sm fw-semibold">
                            <i className="bi bi-fire me-1"></i>Nổi bật
                          </span>
                        )}
                        {destination.category?.name && (
                          <span className="badge bg-dark bg-opacity-75 text-white rounded-pill px-2.5 py-1.5 shadow-sm fw-normal">
                            {destination.category.name}
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        className="btn btn-light rounded-circle position-absolute top-0 end-0 m-3 shadow-sm d-flex align-items-center justify-content-center"
                        style={{ width: '38px', height: '38px', zIndex: 3 }}
                        onClick={(e) => handleToggleFavorite(e, destination._id)}
                        disabled={toggling === destination._id}
                        aria-label={favoriteIds.has(destination._id) ? 'Bỏ yêu thích' : 'Lưu yêu thích'}
                        title={favoriteIds.has(destination._id) ? 'Bỏ yêu thích' : 'Lưu yêu thích'}
                      >
                        {toggling === destination._id ? (
                          <span className="spinner-border spinner-border-sm text-danger" aria-hidden="true"></span>
                        ) : (
                          <i className={`bi ${favoriteIds.has(destination._id) ? 'bi-heart-fill text-danger' : 'bi-heart text-secondary'} fs-6`}></i>
                        )}
                      </button>

                      <span className="position-absolute bottom-0 start-0 m-3 badge bg-white text-dark shadow-sm px-2.5 py-1.5 rounded-pill fw-bold small" style={{ zIndex: 2 }}>
                        <i className="bi bi-star-fill text-warning me-1"></i>
                        {destination.averageRating ? destination.averageRating.toFixed(1) : '5.0'}
                      </span>
                    </div>

                    <div className="p-4 d-flex flex-column flex-grow-1">
                      <div className="text-muted small fw-medium mb-2 d-flex align-items-center">
                        <i className="bi bi-geo-alt-fill text-danger me-1 flex-shrink-0"></i>
                        <span className="text-truncate">{destination.location || 'Việt Nam'}</span>
                      </div>
                      <h5 className="font-display fw-bold text-dark mb-2 text-truncate" title={destination.name}>
                        {destination.name}
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
                        {destination.description || 'Khám phá vẻ đẹp tuyệt mỹ và những trải nghiệm khó quên tại điểm đến này.'}
                      </p>
                      <div className="pt-3 border-top border-light-subtle mt-auto d-flex justify-content-between align-items-center">
                        <span className="text-muted small">
                          <i className="bi bi-eye me-1"></i>Xem chi tiết
                        </span>
                        <span className="text-primary small fw-semibold d-inline-flex align-items-center gap-1">
                          Khám phá <i className="bi bi-arrow-right"></i>
                        </span>
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
                Trang <strong className="text-dark">{currentPage}</strong> trên <strong className="text-dark">{totalPages}</strong> (Tổng cộng {totalDestinations} điểm đến)
              </span>
              <nav aria-label="Phân trang điểm đến">
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

export default Destinations;
