import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { destinationApi } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';

const DestinationDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [similarDestinations, setSimilarDestinations] = useState([]);
  const { user, isAuthenticated } = useAuth();
  const toast = useToast();
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
        setError(err.message || 'Không tìm thấy điểm đến.');
        toast.error(err.message || 'Không tìm thấy điểm đến.');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchDestination();
    }
  }, [id, toast]);

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
      toast.success(res.message || (res.isFavorite ? 'Đã lưu điểm đến yêu thích.' : 'Đã bỏ lưu điểm đến yêu thích.'));
    } catch (requestError) {
      toast.error(requestError.message || 'Không thể cập nhật điểm đến yêu thích.');
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
        <div className="container py-5 text-center" style={{ minHeight: '80vh' }}>
          <div className="card border-0 shadow-sm rounded-4 p-5 mx-auto" style={{ maxWidth: '500px' }}>
            <i className="bi bi-geo-alt-fill text-muted fs-1 mb-3"></i>
            <h5 className="fw-bold mb-2">Không tìm thấy điểm đến</h5>
            <p className="text-muted small mb-4">{error || 'Điểm đến bạn đang tìm kiếm không tồn tại hoặc đã bị gỡ bỏ.'}</p>
            <Link to="/destinations" className="btn btn-primary rounded-pill px-4">
              <i className="bi bi-arrow-left me-2"></i> Quay lại danh sách
            </Link>
          </div>
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
        {(() => {
          const images = Array.isArray(destination.images) ? destination.images.filter(Boolean) : [];
          if (images.length <= 1) {
            return (
              <div className="mb-5">
                {images[0] ? (
                  <div
                    className="position-relative overflow-hidden rounded-3 shadow-sm d-flex align-items-center justify-content-center"
                    style={{
                      backgroundColor: '#0f172a',
                      height: '420px'
                    }}
                  >
                    <div
                      aria-hidden="true"
                      style={{
                        position: 'absolute',
                        inset: 0,
                        backgroundImage: `url(${images[0]})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        filter: 'blur(20px)',
                        opacity: 0.4,
                        transform: 'scale(1.1)'
                      }}
                    />
                    <img
                      src={images[0]}
                      alt={destination.name}
                      className="position-relative"
                      style={{
                        maxHeight: '100%',
                        maxWidth: '100%',
                        width: 'auto',
                        height: 'auto',
                        objectFit: 'contain',
                        zIndex: 2,
                        boxShadow: '0 6px 24px rgba(0, 0, 0, 0.35)'
                      }}
                    />
                  </div>
                ) : (
                  <div className="w-100 rounded-3 bg-light d-flex align-items-center justify-content-center text-muted" style={{ height: '420px' }}>
                    <i className="bi bi-image fs-1"></i>
                  </div>
                )}
              </div>
            );
          }

          return (
            <div className="row g-2 mb-5">
              <div className="col-md-8">
                <img
                  src={images[0]}
                  alt={destination.name}
                  className="img-fluid w-100 rounded-start"
                  style={{ height: '400px', objectFit: 'cover' }}
                />
              </div>
              <div className="col-md-4 d-none d-md-flex flex-column gap-2">
                {images.length === 2 ? (
                  <img
                    src={images[1]}
                    alt={`${destination.name} 2`}
                    className="img-fluid w-100 rounded-end"
                    style={{ height: '400px', objectFit: 'cover' }}
                  />
                ) : (
                  <>
                    <img
                      src={images[1]}
                      alt={`${destination.name} 2`}
                      className="img-fluid w-100 rounded-end"
                      style={{ height: '196px', objectFit: 'cover' }}
                    />
                    <img
                      src={images[2]}
                      alt={`${destination.name} 3`}
                      className="img-fluid w-100 rounded-end"
                      style={{ height: '196px', objectFit: 'cover' }}
                    />
                  </>
                )}
              </div>
            </div>
          );
        })()}
        
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
        {/* START UC-83 Recommend Alternative Destination */}
        {similarDestinations.length > 0 && (
          <section className="mt-5 pt-4 border-top">
            <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-2 mb-4">
              <div>
                <span className="small text-uppercase text-primary fw-semibold">Gợi ý dành cho bạn</span>
                <h3 className="fw-bold mb-0">Điểm đến tương tự bạn có thể thích</h3>
              </div>
              <Link to="/destinations" className="btn btn-outline-primary btn-sm rounded-pill px-3 align-self-start align-self-sm-auto">
                Xem tất cả điểm đến <i className="bi bi-arrow-right ms-1"></i>
              </Link>
            </div>

            <div className="row row-cols-1 row-cols-md-3 g-4">
              {similarDestinations.map((item) => (
                <div key={item._id} className="col">
                  <div
                    className="editorial-card h-100 overflow-hidden d-flex flex-column cursor-pointer shadow-sm rounded-4 bg-white"
                    onClick={() => {
                      navigate(`/destinations/${item._id}`);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="editorial-zoom-img position-relative" style={{ height: '200px' }}>
                      <img
                        src={item.images?.[0] || 'https://res.cloudinary.com/fkjcxcyn/image/upload/v1789823911/tripmate_assets/jmgdqrgkput0yvptbvyr.jpg'}
                        className="w-100 h-100"
                        alt={item.name}
                        style={{ objectFit: 'cover' }}
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = 'https://res.cloudinary.com/fkjcxcyn/image/upload/v1789823911/tripmate_assets/jmgdqrgkput0yvptbvyr.jpg';
                        }}
                      />
                      {item.isPopular && (
                        <span className="position-absolute top-0 start-0 m-3 badge bg-primary text-white rounded-pill px-3 py-1.5 shadow-sm fw-semibold">
                          <i className="bi bi-fire me-1"></i>Nổi bật
                        </span>
                      )}
                    </div>
                    <div className="p-3 d-flex flex-column flex-grow-1">
                      <div className="text-muted small fw-medium mb-1 d-flex align-items-center">
                        <i className="bi bi-geo-alt-fill text-danger me-1 flex-shrink-0"></i>
                        <span className="text-truncate">{item.location || 'Việt Nam'}</span>
                      </div>
                      <h5 className="font-display fw-bold text-dark mb-2 text-truncate" title={item.name}>
                        {item.name}
                      </h5>
                      <p
                        className="text-secondary small mb-3 flex-grow-1"
                        style={{
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          lineHeight: '1.5'
                        }}
                      >
                        {item.description || 'Khám phá vẻ đẹp tuyệt mỹ và những trải nghiệm khó quên tại điểm đến này.'}
                      </p>
                      <div className="pt-2 border-top mt-auto d-flex justify-content-between align-items-center">
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
          </section>
        )}
        {/* END UC-83 Recommend Alternative Destination */}
        </div>
      </div>
      <Footer />
    </>
  );
};

export default DestinationDetails;
