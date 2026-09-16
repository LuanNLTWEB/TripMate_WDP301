import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { tourApi } from '../services/api';

const Tours = () => {
  const [tours, setTours] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const today = new Date().toISOString().split('T')[0];

  // Search states
  const [departure, setDeparture] = useState('');
  const [destination, setDestination] = useState('');
  const [travelDate, setTravelDate] = useState(today);

  // Dropdown visibility states
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
            backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.55) 100%), url('/src/assets/banner_tours.jpg')`,
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
                <div className="row g-2 align-items-stretch">

                  {/* Điểm khởi hành */}
                  <div className="col-12 col-md-3 col-lg-3" style={{ position: 'relative' }}>
                    <label className="form-label small text-secondary mb-1">Điểm khởi hành</label>
                    <div className="input-group">
                      <span className="input-group-text bg-white border-end-0">
                        <i className="bi bi-geo-alt text-primary"></i>
                      </span>
                      <input
                        type="text"
                        className="form-control border-start-0 ps-0"
                        placeholder="Tất cả"
                        value={departure}
                        onChange={(e) => setDeparture(e.target.value)}
                        onFocus={() => setShowDepartureList(true)}
                        onBlur={() => setTimeout(() => setShowDepartureList(false), 150)}
                      />
                      {departure && (
                        <button
                          type="button"
                          className="btn btn-outline-secondary border-start-0 bg-white"
                          onClick={() => setDeparture('')}
                          title="Xóa"
                        >
                          <i className="bi bi-x-lg"></i>
                        </button>
                      )}
                    </div>
                    {/* Dropdown gợi ý điểm khởi hành */}
                    {showDepartureList && filteredDeparture.length > 0 && (
                      <ul className="list-group shadow" style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100, maxHeight: '220px', overflowY: 'auto' }}>
                        {filteredDeparture.map((option) => (
                          <li
                            key={option}
                            className="list-group-item list-group-item-action d-flex align-items-center gap-2"
                            style={{ cursor: 'pointer' }}
                            onMouseDown={() => {
                              setDeparture(option === 'Tất cả' ? '' : option);
                              setShowDepartureList(false);
                            }}
                          >
                            <i className="bi bi-geo-alt text-primary"></i>
                            {option}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {/* Điểm đến */}
                  <div className="col-12 col-md-4 col-lg-4" style={{ position: 'relative' }}>
                    <label className="form-label small text-secondary mb-1">Điểm đến</label>
                    <div className="input-group">
                      <span className="input-group-text bg-white border-end-0">
                        <i className="bi bi-geo-alt-fill text-primary"></i>
                      </span>
                      <input
                        type="text"
                        className="form-control border-start-0 ps-0"
                        placeholder="Địa điểm bất kỳ..."
                        value={destination}
                        onChange={(e) => setDestination(e.target.value)}
                        onFocus={() => setShowDestinationList(true)}
                        onBlur={() => setTimeout(() => setShowDestinationList(false), 150)}
                      />
                      {destination && (
                        <button
                          type="button"
                          className="btn btn-outline-secondary border-start-0 bg-white"
                          onClick={() => setDestination('')}
                          title="Xóa"
                        >
                          <i className="bi bi-x-lg"></i>
                        </button>
                      )}
                    </div>
                    {/* Dropdown gợi ý điểm đến */}
                    {showDestinationList && filteredDestination.length > 0 && (
                      <ul className="list-group shadow" style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100, maxHeight: '220px', overflowY: 'auto' }}>
                        {filteredDestination.map((option) => (
                          <li
                            key={option}
                            className="list-group-item list-group-item-action d-flex align-items-center gap-2"
                            style={{ cursor: 'pointer' }}
                            onMouseDown={() => {
                              setDestination(option);
                              setShowDestinationList(false);
                            }}
                          >
                            <i className="bi bi-geo-alt-fill text-primary"></i>
                            {option}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {/* Ngày đi */}
                  <div className="col-12 col-md-3 col-lg-3">
                    <label className="form-label small text-secondary mb-1">Ngày đi</label>
                    <div className="input-group">
                      <span className="input-group-text bg-white border-end-0">
                        <i className="bi bi-calendar3 text-primary"></i>
                      </span>
                      <input
                        type="date"
                        className="form-control border-start-0 ps-0"
                        value={travelDate}
                        min={today}
                        onChange={(e) => setTravelDate(e.target.value)}
                      />
                    </div>
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
                        <button
                          className="btn btn-primary btn-sm rounded-pill px-3"
                          onClick={() => alert('Chức năng Xem chi tiết đang được phát triển!')}
                        >
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
