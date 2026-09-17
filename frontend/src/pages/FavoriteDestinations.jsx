import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { destinationApi } from '../services/api';
import { useAuth } from '../hooks/useAuth';

const FavoriteDestinations = () => {
  const { user, isAuthenticated } = useAuth();
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toggling, setToggling] = useState(null);

  useEffect(() => {
    const fetchFavorites = async () => {
      if (!isAuthenticated || user?.role !== 'customer') {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const response = await destinationApi.getFavorites();
        setFavorites(response.data || []);
      } catch (err) {
        setError(err.message || 'Không thể tải danh sách điểm đến yêu thích.');
      } finally {
        setLoading(false);
      }
    };

    fetchFavorites();
  }, [isAuthenticated, user?.role]);

  const handleUnsave = async (e, destId) => {
    e.preventDefault();
    if (toggling === destId) return;
    setToggling(destId);
    try {
      await destinationApi.toggleFavorite(destId);
      setFavorites((prev) => prev.filter((d) => d._id !== destId));
    } catch {
      // bỏ qua lỗi
    } finally {
      setToggling(null);
    }
  };

  return (
    <>
      <Navbar />
      <main className="bg-light py-5 flex-grow-1">
        <div className="container">
          <div className="mb-4">
            <p className="text-primary text-uppercase fw-semibold small mb-2">Favorites</p>
            <h1 className="fw-bold mb-2">Điểm đến yêu thích</h1>
            <p className="text-muted mb-0">Xem lại các điểm đến bạn đã yêu thích.</p>
          </div>

          {!isAuthenticated ? (
            <div className="alert alert-info">Vui lòng đăng nhập để xem điểm đến yêu thích.</div>
          ) : user?.role !== 'customer' ? (
            <div className="alert alert-warning">Chức năng điểm đến yêu thích dành cho Customer.</div>
          ) : (
            <>
              {error && <div className="alert alert-danger">{error}</div>}

              {loading ? (
                <div className="text-center py-5">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                  <p className="text-muted mt-3">Đang tải danh sách điểm đến yêu thích...</p>
                </div>
              ) : favorites.length === 0 ? (
                <div className="card border-0 shadow-sm text-center py-5">
                  <div className="card-body text-muted">
                    <p className="mb-0">Bạn chưa có điểm đến yêu thích nào.</p>
                    <Link to="/destinations" className="btn btn-outline-primary btn-sm mt-3">
                      Khám phá điểm đến
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="row row-cols-1 row-cols-md-3 g-4">
                  {favorites.map((dest) => (
                    <div key={dest._id} className="col">
                    <div className="card h-100 shadow-sm">
                          <div className="position-relative">
                            {dest.images?.[0] ? (
                              <img
                                src={dest.images[0]}
                                className="card-img-top"
                                alt={dest.name}
                                style={{ height: '250px', objectFit: 'cover' }}
                              />
                            ) : (
                              <div className="card-img-top bg-light d-flex align-items-center justify-content-center text-muted" style={{ height: '250px' }}>
                                <i className="bi bi-image fs-1"></i>
                              </div>
                            )}
                            <button
                              className="btn btn-light border-0 rounded-circle p-1 position-absolute"
                              style={{ top: '10px', right: '10px', width: '36px', height: '36px', lineHeight: 1 }}
                              onClick={(e) => handleUnsave(e, dest._id)}
                              disabled={toggling === dest._id}
                              title="Bỏ yêu thích"
                            >
                              <i className="bi bi-heart-fill text-danger"></i>
                            </button>
                          </div>
                        <div className="card-body">
                          <h5 className="card-title">{dest.name}</h5>
                          <p className="card-text text-muted mb-2">
                            <i className="bi bi-geo-alt-fill me-1"></i>
                            {dest.location}
                          </p>
                          <p className="card-text" style={{
                            display: '-webkit-box',
                            WebkitLineClamp: 3,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden'
                          }}>
                            {dest.description}
                          </p>
                          <div className="d-flex justify-content-between align-items-center mt-3">
                            <div className="text-warning">
                              <i className="bi bi-star-fill me-1"></i>
                              {dest.averageRating}
                            </div>
                            <Link to={`/destinations/${dest._id}`} className="btn btn-outline-primary btn-sm">
                              Xem chi tiết
                            </Link>
                          </div>
                        </div>
                      </div>
                    </div>

                  ))}
                </div>
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
