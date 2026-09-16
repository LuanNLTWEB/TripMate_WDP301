import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { tourApi } from '../services/api';

const Tours = () => {
  const [tours, setTours] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const fetchTours = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await tourApi.getAll();
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

  return (
    <>
      <Navbar />
      <div className="container py-4 py-md-5" style={{ minHeight: '80vh' }}>
        {/* Danh sách Tour */}
        <div className="mt-5">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h4 className="fw-bold mb-0">Các Tour đang mở</h4>
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
                  <div className="card h-100 shadow-sm border-0 position-relative overflow-hidden">
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
                    <div className="position-absolute top-0 end-0 bg-primary text-white px-3 py-1 rounded-start mt-3 fw-bold">
                      {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(tour.price)}
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
                      
                      <div className="d-flex justify-content-between align-items-center mt-3 pt-3 border-top">
                        <span className="text-muted small">
                          <i className="bi bi-person-check me-1"></i>Còn {tour.availableSeats} chỗ
                        </span>
                        <button className="btn btn-primary btn-sm rounded-pill px-3" onClick={() => alert('Chức năng Xem chi tiết đang được phát triển!')}>
                          Xem chi tiết
                        </button>
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
