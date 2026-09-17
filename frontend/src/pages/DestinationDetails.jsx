import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { destinationApi } from '../services/api';
import { useAuth } from '../hooks/useAuth';

const DestinationDetails = () => {
  const { id } = useParams();
  const { user, isAuthenticated } = useAuth();
  const [destination, setDestination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isToggling, setIsToggling] = useState(false);

  useEffect(() => {
    const fetchDestination = async () => {
      try {
        const response = await destinationApi.getById(id);
        setDestination(response.data);
      } catch (err) {
        setError(err.message || 'Failed to fetch destination details');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchDestination();
    }
  }, [id]);

  // Load trạng thái yêu thích ban đầu
  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'customer') return;
    destinationApi.getFavorites()
      .then((res) => {
        const favIds = (res.data || []).map((d) => d._id);
        setIsFavorite(favIds.includes(id));
      })
      .catch(() => {});
  }, [id, isAuthenticated, user?.role]);

  const handleToggleFavorite = async () => {
    if (isToggling) return;
    setIsToggling(true);
    try {
      const res = await destinationApi.toggleFavorite(id);
      setIsFavorite(res.isFavorite);
    } catch {
      // bỏ qua lỗi
    } finally {
      setIsToggling(false);
    }
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="container py-5 text-center" style={{ minHeight: '80vh' }}>
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  if (error || !destination) {
    return (
      <>
        <Navbar />
        <div className="container py-5" style={{ minHeight: '80vh' }}>
          <div className="alert alert-danger" role="alert">
            {error || 'Không tìm thấy điểm đến.'}
          </div>
          <Link to="/destinations" className="btn btn-outline-primary">
            <i className="bi bi-arrow-left me-2"></i> Quay lại
          </Link>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="container py-5" style={{ minHeight: '80vh' }}>

        
        {/* Header Section */}
        <div className="mb-4">
          <h1 className="fw-bold mb-2">{destination.name}</h1>
          <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
            <div className="d-flex align-items-center text-muted">
              <span className="me-3">
                <i className="bi bi-star-fill text-warning me-1"></i>
                <span className="fw-medium text-dark">{destination.averageRating}</span> 
                <span className="ms-1">(Đánh giá)</span>
              </span>
              <span>
                <i className="bi bi-geo-alt-fill text-danger me-1"></i>
                <span className="text-decoration-underline">{destination.location}</span>
              </span>
              {destination.categoryId?.name && (
                <span className="ms-3">
                  <i className="bi bi-tag-fill text-info me-1"></i>
                  {destination.categoryId.name}
                </span>
              )}
            </div>
            {isAuthenticated && user?.role === 'customer' && (
              <button
                className={`btn btn-sm d-flex align-items-center gap-2 ${isFavorite ? 'btn-danger' : 'btn-outline-danger'}`}
                onClick={handleToggleFavorite}
                disabled={isToggling}
                title={isFavorite ? 'Bỏ yêu thích' : 'Lưu yêu thích'}
              >
                <i className={`bi ${isFavorite ? 'bi-heart-fill' : 'bi-heart'}`}></i>
                {isFavorite ? 'Đã lưu' : 'Lưu yêu thích'}
              </button>
            )}
          </div>
        </div>

        {/* Image Gallery */}
        <div className="row g-2 mb-5">
          <div className="col-md-8">
            {destination.images?.[0] ? (
              <img 
                src={destination.images[0]} 
                alt={destination.name} 
                className="img-fluid w-100 rounded-start" 
                style={{ height: '400px', objectFit: 'cover' }}
              />
            ) : (
              <div className="w-100 rounded-start bg-light d-flex align-items-center justify-content-center text-muted" style={{ height: '400px' }}>
                <i className="bi bi-image fs-1"></i>
              </div>
            )}
          </div>
          <div className="col-md-4 d-none d-md-flex flex-column gap-2">
            {destination.images?.[1] ? (
              <img 
                src={destination.images[1]} 
                alt={`${destination.name} 2`} 
                className="img-fluid w-100 rounded-end"
                style={{ height: '196px', objectFit: 'cover' }} 
              />
            ) : (
              <div className="w-100 rounded-end bg-light d-flex align-items-center justify-content-center text-muted" style={{ height: '196px' }}>
                <i className="bi bi-image fs-3"></i>
              </div>
            )}
            {destination.images?.[2] ? (
              <img 
                src={destination.images[2]} 
                alt={`${destination.name} 3`} 
                className="img-fluid w-100 rounded-end"
                style={{ height: '196px', objectFit: 'cover' }} 
              />
            ) : (
              <div className="w-100 rounded-end bg-light d-flex align-items-center justify-content-center text-muted" style={{ height: '196px' }}>
                <i className="bi bi-image fs-3"></i>
              </div>
            )}
          </div>
        </div>
        
        {/* Content Section */}
        <div className="row">
          <div className="col-lg-8">
            <h3 className="fw-bold mb-4">Khám phá {destination.name}</h3>
            <div className="card border-0 shadow-sm mb-4">
              <div className="card-body p-4">
                <p className="card-text fs-6 lh-lg text-justify" style={{ whiteSpace: 'pre-line' }}>
                  {destination.description}
                </p>
              </div>
            </div>
          </div>
          
          <div className="col-lg-4">
            {/* Quick Info Box */}
            <div className="card border-0 shadow-sm rounded-4 sticky-top" style={{ top: '6rem' }}>
              <div className="card-body p-4">
                <h5 className="fw-bold mb-4">Thông tin nổi bật</h5>
                <ul className="list-unstyled mb-0">
                  <li className="d-flex align-items-center mb-3">
                    <i className="bi bi-geo-alt fs-4 text-primary me-3"></i>
                    <div>
                      <div className="fw-bold">Vị trí</div>
                      <div className="text-muted small">{destination.location}</div>
                    </div>
                  </li>
                  <li className="d-flex align-items-center mb-3">
                    <i className="bi bi-star fs-4 text-warning me-3"></i>
                    <div>
                      <div className="fw-bold">Đánh giá</div>
                      <div className="text-muted small">{destination.averageRating} / 5.0</div>
                    </div>
                  </li>
                  <li className="d-flex align-items-center">
                    <i className="bi bi-camera fs-4 text-success me-3"></i>
                    <div>
                      <div className="fw-bold">Góc chụp ảnh</div>
                      <div className="text-muted small">Cảnh quan tuyệt đẹp</div>
                    </div>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
};

export default DestinationDetails;
