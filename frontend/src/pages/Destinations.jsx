import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { destinationApi } from '../services/api';

const Destinations = () => {
  const [destinations, setDestinations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Hàm lấy danh sách điểm đến từ API theo từ khóa tìm kiếm
  const fetchDestinations = async (search = '') => {
    setLoading(true);
    setError(null);
    try {
      const response = await destinationApi.getAll({ search });
      setDestinations(response.data || []);
    } catch (err) {
      setError(err.message || 'Không thể tải danh sách điểm đến.');
    } finally {
      setLoading(false);
    }
  };

  // Tải danh sách lần đầu khi vào trang
  useEffect(() => {
    fetchDestinations();
  }, []);

  // Xử lý khi người dùng nhấn Tìm kiếm
  const handleSearch = (e) => {
    e.preventDefault();
    fetchDestinations(searchTerm.trim());
  };

  // Xử lý khi xóa hoặc đặt lại tìm kiếm
  const handleReset = () => {
    setSearchTerm('');
    fetchDestinations('');
  };

  return (
    <>
      <Navbar />
      <div className="container py-4 py-md-5" style={{ minHeight: '80vh' }}>
        {/* Banner*/}
        <div
          className="position-relative overflow-hidden text-white shadow-sm"
          style={{
            borderRadius: '20px',
            minHeight: '260px',
            backgroundImage: `linear-gradient(to top, rgba(0, 0, 0, 0.75) 0%, rgba(0, 0, 0, 0.25) 60%, rgba(0, 0, 0, 0.05) 100%), url('https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1600&q=80')`,
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

        {/* Thanh tìm kiếm nổi*/}
        <div className="row justify-content-center" style={{ marginTop: '-42px', position: 'relative', zIndex: 2 }}>
          <div className="col-11 col-lg-10">
            <div className="card border-0 shadow-lg p-3 p-md-4" style={{ borderRadius: '18px' }}>
              <form onSubmit={handleSearch}>
                <div className="row g-3 align-items-end">
                  {/* Ô nhập Thành phố, địa điểm */}
                  <div className="col-12 col-md-8 col-lg-9">
                    <label className="form-label fw-bold small text-secondary mb-1">
                      Thành phố, địa điểm hoặc tên điểm đến:
                    </label>
                    <div className="input-group">
                      <span className="input-group-text bg-white border-end-0 text-primary fs-5">
                        <i className="bi bi-geo-alt"></i>
                      </span>
                      <input
                        type="text"
                        className="form-control border-start-0 ps-1 py-2"
                        placeholder="Thành phố, địa điểm, điểm đến bạn muốn tìm..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                      {searchTerm && (
                        <button
                          type="button"
                          className="btn btn-outline-secondary border-start-0 bg-white"
                          onClick={handleReset}
                          title="Xóa từ khóa"
                        >
                          <i className="bi bi-x-lg"></i>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Nút Tìm kiếm */}
                  <div className="col-12 col-md-4 col-lg-3">
                    <button
                      type="submit"
                      className="btn w-100 py-2 fw-semibold d-flex align-items-center justify-content-center gap-2 rounded-pill text-white"
                      style={{ backgroundColor: '#0194f3', borderColor: '#0194f3' }}
                    >
                      <span>Tìm kiếm</span>
                      <i className="bi bi-search"></i>
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* Danh sách điểm đến và thông báo kết quả */}
        <div className="mt-5">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h4 className="fw-bold mb-0">Các điểm đến nổi bật</h4>
            {searchTerm && (
              <button
                type="button"
                className="btn btn-link btn-sm text-decoration-none"
                onClick={handleReset}
              >
                <i className="bi bi-arrow-counterclockwise me-1"></i>Xem tất cả
              </button>
            )}
          </div>

          {loading ? (
            <div className="text-center">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          ) : error ? (
            <div className="alert alert-danger" role="alert">
              {error}
            </div>
          ) : destinations.length === 0 ? (
            <div className="text-center text-muted py-4">
              <p>Không tìm thấy điểm đến nào phù hợp.</p>
              {searchTerm && (
                <button className="btn btn-outline-primary btn-sm" onClick={handleReset}>
                  Xem tất cả điểm đến
                </button>
              )}
            </div>
          ) : (
            <div className="row row-cols-1 row-cols-md-3 g-4">
              {destinations.map((destination) => (
                <div key={destination._id} className="col">
                  <div className="card h-100 shadow-sm">
                    {destination.images?.[0] ? (
                      <img
                        src={destination.images[0]}
                        className="card-img-top"
                        alt={destination.name}
                        style={{ height: '250px', objectFit: 'cover' }}
                      />
                    ) : (
                      <div className="card-img-top bg-light d-flex align-items-center justify-content-center text-muted" style={{ height: '250px' }}>
                        <i className="bi bi-image fs-1"></i>
                      </div>
                    )}
                    <div className="card-body">
                      <h5 className="card-title">{destination.name}</h5>
                      <p className="card-text text-muted mb-2">
                        <i className="bi bi-geo-alt-fill me-1"></i>
                        {destination.location}
                      </p>
                      <p className="card-text" style={{
                        display: '-webkit-box',
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden'
                      }}>
                        {destination.description}
                      </p>
                      <div className="d-flex justify-content-between align-items-center mt-3">
                        <div className="text-warning">
                          <i className="bi bi-star-fill me-1"></i>
                          {destination.averageRating}
                        </div>
                        <Link to={`/destinations/${destination._id}`} className="btn btn-outline-primary btn-sm">
                          Xem chi tiết
                        </Link>
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

export default Destinations;
