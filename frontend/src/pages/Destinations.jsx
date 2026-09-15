import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { destinationApi } from '../services/api';

const Destinations = () => {
  const [destinations, setDestinations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDestinations = async () => {
      try {
        const response = await destinationApi.getAll();
        setDestinations(response.data);
      } catch (err) {
        setError(err.message || 'Failed to fetch destinations');
      } finally {
        setLoading(false);
      }
    };

    fetchDestinations();
  }, []);

  return (
    <>
      <Navbar />
      <div className="container py-5" style={{ minHeight: '80vh' }}>
        <h2 className="mb-4 text-center">Khám phá các điểm đến</h2>
        <p className="text-center text-muted mb-5">
          Tìm kiếm những địa điểm tuyệt vời nhất cho chuyến đi tiếp theo của bạn.
        </p>

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
          <div className="text-center text-muted">
            <p>Hiện chưa có điểm đến nào.</p>
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
      <Footer />
    </>
  );
};

export default Destinations;
