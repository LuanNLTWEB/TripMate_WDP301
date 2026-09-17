import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { tourApi, destinationApi } from '../services/api';

const DEFAULT_IMAGE_FALLBACK = 'https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=800&q=80';

function Home() {
  const navigate = useNavigate();
  const [tours, setTours] = useState([]);
  const [destinations, setDestinations] = useState([]);
  const [loading, setLoading] = useState(true);

  const [realStats, setRealStats] = useState({
    totalTours: 0,
    totalDestinations: 0,
    availableSeats: 0,
    avgRating: '5.0'
  });

  const [searchDestination, setSearchDestination] = useState('');
  const [searchDate, setSearchDate] = useState('');
  const [searchDuration, setSearchDuration] = useState('');

  const [selectedDurationKey, setSelectedDurationKey] = useState('2');

  useEffect(() => {
    let isMounted = true;

    const loadRealData = async () => {
      setLoading(true);
      try {
        const [toursRes, destsRes] = await Promise.allSettled([
          tourApi.getAll({ limit: 6 }),
          destinationApi.getAll({ limit: 6 })
        ]);

        const loadedTours = toursRes.status === 'fulfilled' ? (toursRes.value?.data || []) : [];
        const totalToursCount = toursRes.status === 'fulfilled' ? (toursRes.value?.total ?? loadedTours.length) : 0;

        const loadedDests = destsRes.status === 'fulfilled' ? (destsRes.value?.data || []) : [];
        const totalDestsCount = destsRes.status === 'fulfilled' ? (destsRes.value?.total ?? loadedDests.length) : 0;

        if (isMounted) {
          setTours(loadedTours);
          setDestinations(loadedDests);

          const totalSeats = loadedTours.reduce((sum, t) => sum + (Number(t.availableSeats) || 0), 0);
          const avg = loadedTours.length > 0
            ? (loadedTours.reduce((sum, t) => sum + (Number(t.averageRating) || 0), 0) / loadedTours.length).toFixed(1)
            : '5.0';

          setRealStats({
            totalTours: totalToursCount,
            totalDestinations: totalDestsCount,
            availableSeats: totalSeats,
            avgRating: avg
          });
        }
      } catch (err) {
        console.error('Lỗi khi tải dữ liệu trang chủ:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadRealData();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleQuickSearch = (e) => {
    e.preventDefault();
    const queryParts = [searchDestination, searchDuration].filter(Boolean);
    const query = queryParts.join(' ').trim();
    navigate(`/tours${query ? `?search=${encodeURIComponent(query)}` : ''}`);
  };

  const formatVnd = (val) => new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND'
  }).format(val || 0);

  const durationTabs = [
    { key: '2', label: '2 Ngày 1 Đêm', keyword: '2 ngày' },
    { key: '3', label: '3 Ngày 2 Đêm', keyword: '3 ngày' },
    { key: '4', label: '4 Ngày trở lên', keyword: '4 ngày' }
  ];

  const currentTabInfo = durationTabs.find((t) => t.key === selectedDurationKey) || durationTabs[0];
  const matchedTours = tours.filter((t) => t.duration?.toLowerCase().includes(currentTabInfo.keyword.toLowerCase()));

  return (
    <>
      <Navbar />

      <main className="bg-light">
        <section className="py-5 bg-white border-bottom position-relative">
          <div className="container py-4 py-lg-5">
            <div className="row g-5 align-items-center">
              <div className="col-12 col-lg-7">
                <div className="mb-3">
                  <span className="editorial-badge">
                    <i className="bi bi-stars text-primary"></i>
                    TRẢI NGHIỆM DU LỊCH ĐỘC BẢN VIỆT NAM
                  </span>
                </div>

                <h1 className="font-display display-4 fw-bold text-dark mb-3 lh-sm">
                  Đánh Thức Khát Khao Khám Phá, <br className="d-none d-md-block" />
                  <span className="text-primary fst-italic">Hành Trình Tinh Tế</span> Cùng TripMate
                </h1>

                <p className="lead text-secondary mb-4 fs-5 col-xl-11 lh-base">
                  Hệ thống kết nối trực tiếp với các điểm đến danh thắng và tour du lịch trọn gói
                  đang mở bán, giúp bạn dễ dàng chọn lựa hoặc tự lập lịch trình cá nhân hóa.
                </p>

                <div className="d-flex flex-wrap gap-3 mb-4">
                  <Link to="/itinerary" className="btn btn-primary btn-lg rounded-pill px-4 shadow-sm d-inline-flex align-items-center gap-2">
                    <i className="bi bi-calendar-plus"></i>
                    <span>Tự lập lịch trình ngay</span>
                  </Link>
                  <Link to="/tours" className="btn btn-outline-secondary btn-lg rounded-pill px-4 d-inline-flex align-items-center gap-2">
                    <i className="bi bi-compass"></i>
                    <span>Xem {realStats.totalTours} Tour có sẵn</span>
                  </Link>
                </div>

                <div className="d-flex align-items-center gap-4 pt-3 border-top border-light-subtle flex-wrap">
                  <div className="d-flex align-items-center gap-2">
                    <i className="bi bi-database-check text-success fs-5"></i>
                    <span className="small text-secondary">Dữ liệu tour & điểm đến cập nhật liên tục</span>
                  </div>
                  <div className="d-flex align-items-center gap-2">
                    <i className="bi bi-shield-check text-primary fs-5"></i>
                    <span className="small text-secondary">Giá vé niêm yết minh bạch</span>
                  </div>
                </div>
              </div>

              <div className="col-12 col-lg-5">
                {tours.length > 0 ? (
                  <div
                    className="editorial-card overflow-hidden shadow cursor-pointer position-relative"
                    onClick={() => navigate(`/tours/${tours[0]._id}`)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="editorial-zoom-img" style={{ height: '360px' }}>
                      <img
                        src={tours[0].images?.[0] || DEFAULT_IMAGE_FALLBACK}
                        alt={tours[0].title}
                        className="w-100 h-100"
                        style={{ objectFit: 'cover' }}
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = DEFAULT_IMAGE_FALLBACK;
                        }}
                      />
                      <span className="position-absolute bottom-0 start-0 bg-primary text-white px-3 py-1 fw-bold small">
                        {formatVnd(tours[0].price)}
                      </span>
                      <span className="position-absolute top-0 end-0 m-2 badge bg-white text-dark shadow-sm">
                        ★ {tours[0].averageRating || 5.0}
                      </span>
                    </div>
                    <div className="p-4 bg-white">
                      <div className="d-flex justify-content-between align-items-center mb-1 text-muted small">
                        <span><i className="bi bi-clock me-1"></i>{tours[0].duration || 'Lịch trình linh hoạt'}</span>
                        <span><i className="bi bi-geo-alt-fill text-danger me-1"></i>{tours[0].location || 'Việt Nam'}</span>
                      </div>
                      <h5 className="font-display fw-bold text-dark mb-1">{tours[0].title}</h5>
                      <span className="text-primary small fw-semibold">
                        Xem chi tiết tour này <i className="bi bi-arrow-right ms-1"></i>
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="editorial-card p-5 text-center text-muted bg-white">
                    <i className="bi bi-compass fs-1 text-primary mb-3 d-block"></i>
                    <h5>Khám Phá Các Hành Trình Mới</h5>
                    <p className="small mb-3">Hệ thống đang sẵn sàng các tour và điểm đến hấp dẫn.</p>
                    <Link to="/destinations" className="btn btn-outline-primary btn-sm">Xem danh sách điểm đến</Link>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-5 pt-2">
              <div className="editorial-card p-3 p-md-4 shadow-sm bg-white">
                <form onSubmit={handleQuickSearch}>
                  <div className="row g-3 align-items-end">
                    <div className="col-12 col-md-4">
                      <label htmlFor="homeSearchDest" className="form-label small text-secondary text-uppercase fw-semibold mb-1">
                        <i className="bi bi-geo-alt me-1 text-primary"></i>Bạn muốn đi đâu?
                      </label>
                      <input
                        id="homeSearchDest"
                        type="text"
                        className="form-control form-control-lg fs-6 bg-light border-light-subtle"
                        placeholder="Nhập địa điểm (Hạ Long, Sapa, Đà Nẵng...)"
                        value={searchDestination}
                        onChange={(e) => setSearchDestination(e.target.value)}
                      />
                    </div>

                    <div className="col-12 col-md-3">
                      <label htmlFor="homeSearchDate" className="form-label small text-secondary text-uppercase fw-semibold mb-1">
                        <i className="bi bi-calendar-event me-1 text-primary"></i>Ngày khởi hành
                      </label>
                      <input
                        id="homeSearchDate"
                        type="date"
                        className="form-control form-control-lg fs-6 bg-light border-light-subtle"
                        value={searchDate}
                        onChange={(e) => setSearchDate(e.target.value)}
                      />
                    </div>

                    <div className="col-12 col-md-3">
                      <label htmlFor="homeSearchDuration" className="form-label small text-secondary text-uppercase fw-semibold mb-1">
                        <i className="bi bi-clock me-1 text-primary"></i>Thời lượng dự kiến
                      </label>
                      <select
                        id="homeSearchDuration"
                        className="form-select form-select-lg fs-6 bg-light border-light-subtle"
                        value={searchDuration}
                        onChange={(e) => setSearchDuration(e.target.value)}
                      >
                        <option value="">Tất cả thời lượng</option>
                        <option value="2 ngày">2 ngày 1 đêm</option>
                        <option value="3 ngày">3 ngày 2 đêm</option>
                        <option value="4 ngày">4 ngày 3 đêm</option>
                      </select>
                    </div>

                    <div className="col-12 col-md-2">
                      <button type="submit" className="btn btn-primary btn-lg w-100 fs-6 fw-semibold d-flex align-items-center justify-content-center gap-2">
                        <i className="bi bi-search"></i>
                        <span>Tìm ngay</span>
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>

            <div className="row g-4 text-center mt-3 pt-3">
              <div className="col-6 col-md-3">
                <div className="font-display fs-2 fw-bold text-primary mb-1">
                  {realStats.totalDestinations}
                </div>
                <div className="text-secondary small text-uppercase" style={{ letterSpacing: '0.06em' }}>
                  Điểm đến trong hệ thống
                </div>
              </div>
              <div className="col-6 col-md-3">
                <div className="font-display fs-2 fw-bold text-primary mb-1">
                  {realStats.totalTours}
                </div>
                <div className="text-secondary small text-uppercase" style={{ letterSpacing: '0.06em' }}>
                  Tour du lịch đang mở
                </div>
              </div>
              <div className="col-6 col-md-3">
                <div className="font-display fs-2 fw-bold text-primary mb-1">
                  {realStats.availableSeats}
                </div>
                <div className="text-secondary small text-uppercase" style={{ letterSpacing: '0.06em' }}>
                  Chỗ trống sẵn sàng
                </div>
              </div>
              <div className="col-6 col-md-3">
                <div className="font-display fs-2 fw-bold text-primary mb-1">
                  {realStats.avgRating} ★
                </div>
                <div className="text-secondary small text-uppercase" style={{ letterSpacing: '0.06em' }}>
                  Đánh giá trung bình
                </div>
              </div>
            </div>

          </div>
        </section>

        <section className="py-5 bg-white border-bottom">
          <div className="container py-4">
            <div className="row justify-content-center text-center mb-4">
              <div className="col-lg-8">
                <span className="editorial-badge-amber mb-2">ĐIỀU HƯỚNG THÔNG MINH</span>
                <h2 className="font-display fw-bold text-dark display-6 mb-2">Lọc Tour Theo Quỹ Thời Gian</h2>
                <p className="text-muted small">Hệ thống tự động lọc các tour có thời lượng phù hợp nhất với kế hoạch của bạn</p>

                <div className="btn-group p-1 bg-light rounded-pill border shadow-sm mt-2" role="group" aria-label="Bộ lọc thời lượng">
                  {durationTabs.map((tab) => (
                    <button
                      key={tab.key}
                      type="button"
                      className={`btn rounded-pill px-4 py-2 small fw-semibold transition-all ${selectedDurationKey === tab.key ? 'btn-primary text-white shadow-sm' : 'btn-light text-secondary border-0'}`}
                      onClick={() => setSelectedDurationKey(tab.key)}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="row justify-content-center">
              <div className="col-12 col-lg-11">
                {matchedTours.length > 0 ? (
                  <div className="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-4">
                    {matchedTours.map((tour) => (
                      <div key={tour._id} className="col">
                        <div
                          className="editorial-card h-100 overflow-hidden d-flex flex-column shadow-sm"
                          onClick={() => navigate(`/tours/${tour._id}`)}
                          style={{ cursor: 'pointer' }}
                        >
                          <div className="editorial-zoom-img position-relative" style={{ height: '200px' }}>
                            <img
                              src={tour.images?.[0] || DEFAULT_IMAGE_FALLBACK}
                              alt={tour.title}
                              className="w-100 h-100"
                              style={{ objectFit: 'cover' }}
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = DEFAULT_IMAGE_FALLBACK;
                              }}
                            />
                            <span className="position-absolute bottom-0 start-0 bg-primary text-white px-3 py-1 fw-bold small">
                              {formatVnd(tour.price)}
                            </span>
                            <span className="position-absolute top-0 end-0 m-2 badge bg-white text-dark shadow-sm">
                              ★ {tour.averageRating || 5.0}
                            </span>
                          </div>
                          <div className="p-3 d-flex flex-column flex-grow-1">
                            <div className="text-muted small mb-1">
                              <i className="bi bi-geo-alt-fill text-danger me-1"></i>{tour.location || 'Việt Nam'}
                            </div>
                            <h6 className="font-display fw-bold text-dark mb-2">{tour.title}</h6>
                            <p className="text-secondary small mb-3 flex-grow-1" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                              {tour.description}
                            </p>
                            <div className="d-flex justify-content-between align-items-center pt-2 border-top border-light-subtle mt-auto">
                              <span className="text-muted small">Còn {tour.availableSeats ?? 0} chỗ</span>
                              <span className="text-primary small fw-semibold">Xem chi tiết <i className="bi bi-arrow-right"></i></span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="editorial-card p-5 text-center text-muted bg-white">
                    <p className="mb-2">Hiện tại chưa có tour nào thuộc gói {currentTabInfo.label}.</p>
                    <Link to="/tours" className="btn btn-outline-primary btn-sm rounded-pill px-4">Xem toàn bộ tour</Link>
                  </div>
                )}
              </div>
            </div>

          </div>
        </section>

        <section className="py-5 bg-white border-bottom">
          <div className="container py-4 py-lg-5">
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-end gap-3 mb-5">
              <div>
                <span className="editorial-badge mb-2">ĐIỂM ĐẾN TRONG HỆ THỐNG</span>
                <h2 className="font-display display-6 fw-bold text-dark mb-1">Điểm Đến Tuyển Chọn</h2>
                <p className="text-muted mb-0">Các điểm dừng chân đang có trong cơ sở dữ liệu của TripMate</p>
              </div>
              <Link to="/destinations" className="text-primary text-decoration-none fw-semibold d-inline-flex align-items-center gap-1">
                <span>Xem tất cả ({realStats.totalDestinations})</span>
                <i className="bi bi-arrow-right"></i>
              </Link>
            </div>

            {loading ? (
              <div className="text-center py-5">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Đang tải điểm đến...</span>
                </div>
              </div>
            ) : destinations.length > 0 ? (
              <div className="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-4">
                {destinations.map((dest) => (
                  <div key={dest._id} className="col">
                    <div
                      className="editorial-card h-100 overflow-hidden d-flex flex-column cursor-pointer"
                      onClick={() => navigate(`/destinations/${dest._id}`)}
                      style={{ cursor: 'pointer' }}
                    >
                      <div className="editorial-zoom-img position-relative" style={{ height: '220px' }}>
                        <img
                          src={dest.images?.[0] || DEFAULT_IMAGE_FALLBACK}
                          alt={dest.name}
                          className="w-100 h-100"
                          style={{ objectFit: 'cover' }}
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = DEFAULT_IMAGE_FALLBACK;
                          }}
                        />
                        {dest.isPopular && (
                          <span className="position-absolute top-0 start-0 m-2 badge bg-primary text-white shadow-sm">
                            Điểm đến nổi bật
                          </span>
                        )}
                        <span className="position-absolute top-0 end-0 m-2 badge bg-white text-dark shadow-sm">
                          ★ {dest.averageRating || 5.0}
                        </span>
                      </div>

                      <div className="p-4 d-flex flex-column flex-grow-1">
                        <div className="text-muted small mb-2">
                          <i className="bi bi-geo-alt-fill text-danger me-1"></i>{dest.location || 'Việt Nam'}
                        </div>
                        <h5 className="font-display fw-bold text-dark mb-2">{dest.name}</h5>
                        <p
                          className="text-secondary small mb-3 flex-grow-1"
                          style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
                        >
                          {dest.description || 'Chưa có mô tả chi tiết cho điểm đến này.'}
                        </p>
                        <div className="pt-3 border-top mt-auto d-flex justify-content-between align-items-center">
                          <span className="text-primary small fw-semibold">Xem chi tiết</span>
                          <i className="bi bi-arrow-right text-primary"></i>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="editorial-card p-5 text-center text-muted bg-white">
                <i className="bi bi-geo-alt fs-1 text-secondary mb-3 d-block"></i>
                <h5>Chưa có điểm đến nào trong cơ sở dữ liệu</h5>
                <p className="small mb-3">Vui lòng quay lại sau hoặc liên hệ quản trị viên để cập nhật danh mục điểm đến.</p>
                <Link to="/destinations" className="btn btn-primary btn-sm rounded-pill px-4">Tới trang Điểm đến</Link>
              </div>
            )}
          </div>
        </section>

        <section className="py-5 bg-light border-bottom">
          <div className="container py-4 py-lg-5">
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-end gap-3 mb-5">
              <div>
                <span className="editorial-badge mb-2">TOUR DU LỊCH ĐANG MỞ</span>
                <h2 className="font-display display-6 fw-bold text-dark mb-1">Các Tour Khám Phá Nổi Bật</h2>
                <p className="text-muted mb-0">Đặt tour nhanh chóng, giữ chỗ tức thì với thông tin minh bạch</p>
              </div>
              <Link to="/tours" className="text-primary text-decoration-none fw-semibold d-inline-flex align-items-center gap-1">
                <span>Xem toàn bộ ({realStats.totalTours})</span>
                <i className="bi bi-arrow-right"></i>
              </Link>
            </div>

            {loading ? (
              <div className="text-center py-5">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Đang tải tour...</span>
                </div>
              </div>
            ) : tours.length > 0 ? (
              <div className="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-4">
                {tours.map((tour) => (
                  <div key={tour._id} className="col">
                    <div
                      className="editorial-card h-100 overflow-hidden d-flex flex-column shadow-sm"
                      onClick={() => navigate(`/tours/${tour._id}`)}
                      style={{ cursor: 'pointer' }}
                    >
                      <div className="editorial-zoom-img position-relative" style={{ height: '220px' }}>
                        <img
                          src={tour.images?.[0] || DEFAULT_IMAGE_FALLBACK}
                          alt={tour.title}
                          className="w-100 h-100"
                          style={{ objectFit: 'cover' }}
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = DEFAULT_IMAGE_FALLBACK;
                          }}
                        />
                        <span className="position-absolute bottom-0 start-0 bg-primary text-white px-3 py-1 fw-bold small">
                          {formatVnd(tour.price)}
                        </span>
                        <span className="position-absolute top-0 end-0 m-2 badge bg-white text-dark shadow-sm">
                          <i className="bi bi-star-fill text-warning me-1"></i>{tour.averageRating || 5.0}
                        </span>
                      </div>

                      <div className="p-4 d-flex flex-column flex-grow-1">
                        <div className="d-flex justify-content-between align-items-center text-muted small mb-2">
                          <span><i className="bi bi-clock me-1"></i>{tour.duration || 'Lịch trình linh hoạt'}</span>
                          <span><i className="bi bi-geo-alt-fill text-danger me-1"></i>{tour.location || 'Việt Nam'}</span>
                        </div>

                        <h5 className="font-display fw-bold text-dark mb-2">{tour.title}</h5>

                        <p
                          className="text-secondary small mb-4 flex-grow-1"
                          style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
                        >
                          {tour.description}
                        </p>

                        <div className="d-flex justify-content-between align-items-center pt-3 border-top border-light-subtle mt-auto">
                          <span className="text-muted small">
                            <i className="bi bi-person-check me-1"></i>Còn {tour.availableSeats ?? 0} chỗ
                          </span>
                          <span className="text-primary small fw-semibold">
                            Xem chi tiết <i className="bi bi-arrow-right ms-1"></i>
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="editorial-card p-5 text-center text-muted bg-white">
                <i className="bi bi-compass fs-1 text-secondary mb-3 d-block"></i>
                <h5>Chưa có tour nào trong cơ sở dữ liệu</h5>
                <p className="small mb-3">Vui lòng quay lại sau hoặc dùng seeder để nạp dữ liệu mẫu.</p>
                <Link to="/tours" className="btn btn-primary btn-sm rounded-pill px-4">Tới trang Tour</Link>
              </div>
            )}
          </div>
        </section>

        <section className="py-5 bg-white border-bottom">
          <div className="container py-4 py-lg-5">
            <div className="text-center mb-5">
              <span className="editorial-badge mb-2">VÌ SAO CHỌN TRIPMATE?</span>
              <h2 className="font-display display-6 fw-bold text-dark mb-2">Bốn Trải Nghiệm Độc Bản</h2>
              <p className="text-muted col-lg-6 mx-auto">
                TripMate giúp bạn dễ dàng khám phá, lập kế hoạch và đặt chuyến đi hoàn hảo
              </p>
            </div>

            <div className="row g-4">
              <div className="col-12 col-md-6 col-lg-3">
                <div className="editorial-card p-4 h-100 border text-center text-md-start">
                  <div className="font-display fs-2 fw-bold text-primary opacity-50 mb-2">01</div>
                  <h5 className="fw-bold text-dark mb-2">Tự Do Lên Lịch Trình</h5>
                  <p className="text-muted small mb-0 lh-base">
                    Công cụ lập kế hoạch thông minh giúp bạn dễ dàng chọn ngày, xếp điểm tham quan và ước tính kinh phí.
                  </p>
                </div>
              </div>

              <div className="col-12 col-md-6 col-lg-3">
                <div className="editorial-card p-4 h-100 border text-center text-md-start">
                  <div className="font-display fs-2 fw-bold text-primary opacity-50 mb-2">02</div>
                  <h5 className="fw-bold text-dark mb-2">Tour Đầy Đủ Chi Tiết</h5>
                  <p className="text-muted small mb-0 lh-base">
                    Mỗi tour đều có thông tin cụ thể về thời gian, địa điểm, số chỗ còn và giá vé rõ ràng minh bạch.
                  </p>
                </div>
              </div>

              <div className="col-12 col-md-6 col-lg-3">
                <div className="editorial-card p-4 h-100 border text-center text-md-start">
                  <div className="font-display fs-2 fw-bold text-primary opacity-50 mb-2">03</div>
                  <h5 className="fw-bold text-dark mb-2">Lưu Điểm Yêu Thích</h5>
                  <p className="text-muted small mb-0 lh-base">
                    Lưu nhanh các điểm đến và tour yêu thích vào danh sách riêng để dễ dàng theo dõi và chia sẻ.
                  </p>
                </div>
              </div>

              <div className="col-12 col-md-6 col-lg-3">
                <div className="editorial-card p-4 h-100 border text-center text-md-start">
                  <div className="font-display fs-2 fw-bold text-primary opacity-50 mb-2">04</div>
                  <h5 className="fw-bold text-dark mb-2">Hỗ Trợ In Ấn & Xuất File</h5>
                  <p className="text-muted small mb-0 lh-base">
                    Dễ dàng in ấn hoặc xuất lịch trình ra định dạng A4 chuẩn mực để mang theo trong suốt chuyến đi.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-5 bg-white">
          <div className="container py-4">
            <div className="editorial-card p-5 text-center bg-primary text-white position-relative overflow-hidden shadow">
              <div className="position-relative z-1 py-3 col-lg-8 mx-auto">
                <span className="badge bg-white text-primary px-3 py-2 text-uppercase mb-3 fw-bold">
                  Bắt đầu ngay hôm nay
                </span>
                <h2 className="font-display display-5 fw-bold mb-3">
                  Sẵn Sàng Cho Chuyến Đi Đáng Nhớ Của Bạn?
                </h2>
                <p className="lead text-white-50 mb-4 fs-6">
                  Dù là tự thiết kế lịch trình riêng tư hay chọn tour trọn gói,
                  TripMate luôn đồng hành mang đến trải nghiệm tiện lợi và đáng tin cậy.
                </p>
                <div className="d-flex justify-content-center gap-3 flex-wrap">
                  <Link to="/itinerary" className="btn btn-light btn-lg rounded-pill px-4 text-primary fw-bold">
                    <i className="bi bi-calendar-plus me-2"></i>Tạo lịch trình ngay
                  </Link>
                  <Link to="/tours" className="btn btn-outline-light btn-lg rounded-pill px-4">
                    <i className="bi bi-compass me-2"></i>Khám phá danh sách Tour
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

      </main>

      <Footer />
    </>
  );
}

export default Home;
