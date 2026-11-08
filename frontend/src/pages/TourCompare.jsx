import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { tourApi } from '../services/api';
import { useTourCompare } from '../hooks/useTourCompare';

const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=800&q=80';

const formatCurrency = (val) => {
  if (typeof val !== 'number') return '—';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
};

export default function TourCompare() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { compareIds, removeTour, addTour } = useTourCompare();

  const [tours, setTours] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Collapsible section tabs state (Đóng/mở tab từng mục 1 2 3)
  const [openSections, setOpenSections] = useState({
    overview: true,
    ratings: true,
    itinerary: true,
    services: true,
    policies: true
  });

  const toggleSection = (key) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const allSectionsOpen = Object.values(openSections).every(Boolean);

  const toggleAllSections = () => {
    const nextState = !allSectionsOpen;
    setOpenSections({
      overview: nextState,
      ratings: nextState,
      itinerary: nextState,
      services: nextState,
      policies: nextState
    });
  };

  // Sync compareIds with URL params or storage
  useEffect(() => {
    const urlIds = searchParams.get('ids');
    if (urlIds) {
      const idsFromUrl = urlIds.split(',').filter(Boolean);
      idsFromUrl.forEach((id) => addTour(id));
    }
  }, []);

  const loadComparison = async () => {
    if (compareIds.length < 2) {
      setTours([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await tourApi.compare(compareIds);
      setTours(res.data || []);
      setSearchParams({ ids: compareIds.join(',') }, { replace: true });
    } catch (err) {
      setError(err.message || 'Không thể tải thông tin so sánh tour');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadComparison();
  }, [compareIds.join(',')]);

  const handleRemoveFromCompare = (tourId) => {
    removeTour(tourId);
    setTours((prev) => prev.filter((t) => String(t._id) !== String(tourId)));
  };

  // Find lowest price and highest rating for highlight badges
  const minPrice = tours.length > 0 ? Math.min(...tours.map((t) => t.price || Infinity)) : null;
  const maxRating = tours.length > 0 ? Math.max(...tours.map((t) => t.averageRating || 0)) : null;

  const totalCols = tours.length + (tours.length < 4 ? 1 : 0);

  return (
    <div className="d-flex flex-column min-vh-100 bg-light">
      <Navbar />

      <main className="flex-grow-1 py-4 py-md-5">
        <div className="container-fluid px-3 px-md-5" style={{ maxWidth: '1600px' }}>
          {/* Header Title Section */}
          <div className="mb-4">
            <h1 className="fw-bold font-display text-dark mb-1">So sánh các tour du lịch</h1>
            <p className="text-muted mb-0">
              Đặt các hành trình cạnh nhau để so sánh chi tiết giá vé, lịch trình từng ngày, quyền lợi và phản hồi từ du khách.
            </p>
          </div>

          {/* Loading state */}
          {loading && (
            <div className="text-center py-5 my-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Đang tải...</span>
              </div>
              <p className="text-muted small mt-2">Đang tải dữ liệu so sánh các tour...</p>
            </div>
          )}

          {/* Error State */}
          {!loading && error && (
            <div className="card border-0 shadow-sm rounded-4 p-5 text-center my-4 bg-white">
              <i className="bi bi-exclamation-triangle-fill fs-1 text-danger mb-3 d-block"></i>
              <h5 className="fw-bold text-dark">{error}</h5>
              <p className="text-muted small mb-4">Vui lòng quay lại danh sách tour để chọn lại các tour muốn so sánh.</p>
              <div>
                <Link to="/tours" className="btn btn-primary rounded-pill px-4 btn-sm fw-semibold shadow-sm">
                  <i className="bi bi-arrow-left me-1"></i> Quay lại danh sách tour
                </Link>
              </div>
            </div>
          )}

          {/* Empty State / Fewer than 2 tours */}
          {!loading && !error && tours.length < 2 && (
            <div className="card border-0 shadow-sm rounded-4 text-center p-5 my-4 bg-white">
              <div className="mb-3">
                <span className="d-inline-flex align-items-center justify-content-center bg-primary-subtle text-primary rounded-circle" style={{ width: '84px', height: '84px' }}>
                  <i className="bi bi-columns-gap fs-1"></i>
                </span>
              </div>
              <h4 className="fw-bold text-dark mb-2">Cần ít nhất 2 tour để thực hiện so sánh</h4>
              <p className="text-muted small mb-4" style={{ maxWidth: '520px', margin: '0 auto', lineHeight: '1.6' }}>
                Hiện tại bạn đang chọn {tours.length} tour. Hãy quay về danh sách tour và bấm nút <strong>"So sánh"</strong> trên từng thẻ tour để bắt đầu so sánh song song.
              </p>
              <div>
                <Link to="/tours" className="btn btn-primary rounded-pill px-4 py-2 fw-semibold shadow-sm">
                  <i className="bi bi-compass me-2"></i>
                  Khám phá danh sách tour ngay
                </Link>
              </div>
            </div>
          )}

          {/* Comparison Matrix Table */}
          {!loading && !error && tours.length >= 2 && (
            <>
              {/* Top Bar: Title on the left, "Thu gọn tất cả" on the right (Đã xóa nút thêm tour bị trùng) */}
              <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3 mb-3 p-3 bg-white rounded-4 shadow-sm border">
                <div className="d-flex align-items-center gap-2.5">
                  <div className="rounded-circle bg-primary-subtle text-primary d-flex align-items-center justify-content-center flex-shrink-0" style={{ width: 42, height: 42 }}>
                    <i className="bi bi-columns-gap fs-5"></i>
                  </div>
                  <div>
                    <h5 className="fw-bold text-dark mb-0 font-display">Bảng đối chiếu tiêu chí chi tiết</h5>
                    <span className="text-muted small">Đang so sánh song song <strong>{tours.length}</strong> tour du lịch</span>
                  </div>
                </div>

                <div className="d-flex align-items-center gap-2 ms-md-auto">
                  <button
                    type="button"
                    className="btn btn-outline-secondary btn-sm rounded-pill px-3 py-1.5 fw-semibold d-inline-flex align-items-center gap-1.5 shadow-sm"
                    onClick={toggleAllSections}
                    title={allSectionsOpen ? 'Thu gọn tất cả các mục' : 'Mở rộng tất cả các mục'}
                  >
                    <i className={`bi ${allSectionsOpen ? 'bi-arrows-collapse' : 'bi-arrows-expand'}`}></i>
                    <span>{allSectionsOpen ? 'Thu gọn tất cả' : 'Mở rộng tất cả'}</span>
                  </button>
                </div>
              </div>

              <div className="tm-compare-card mb-5">
                <div className="table-responsive">
                  <table className="tm-compare-table" style={{ minWidth: `${tours.length * 280 + (tours.length < 4 ? 240 : 0)}px` }}>
                    {/* Header Row: Tours start at the very left (Sát trái, không còn ô tiêu chí trống) */}
                    <thead>
                      <tr>
                        {tours.map((tour) => {
                          const isBestPrice = minPrice !== null && tour.price === minPrice;
                          const isTopRating = maxRating !== null && tour.averageRating === maxRating && maxRating > 0;
                          return (
                            <th key={tour._id} className="tm-compare-header-cell" style={{ width: `${100 / totalCols}%` }}>
                              {/* Card Image with Badges and Glassmorphic Remove Button */}
                              <div className="tm-compare-thumb-wrap mb-3">
                                <img
                                  src={tour.images?.[0] || DEFAULT_IMAGE}
                                  alt={tour.title}
                                  onError={(e) => { e.target.onerror = null; e.target.src = DEFAULT_IMAGE; }}
                                />

                                <button
                                  type="button"
                                  className="tm-compare-remove-btn"
                                  onClick={() => handleRemoveFromCompare(tour._id)}
                                  title="Bỏ tour này khỏi bảng so sánh"
                                  aria-label="Bỏ so sánh"
                                >
                                  <i className="bi bi-x-lg"></i>
                                </button>

                                <div className="position-absolute bottom-0 start-0 m-2.5 d-flex flex-wrap gap-1">
                                  {isBestPrice && (
                                    <span className="badge bg-success shadow-sm rounded-pill px-2.5 py-1">
                                      <i className="bi bi-tag-fill me-1"></i>Giá tốt nhất
                                    </span>
                                  )}
                                  {isTopRating && (
                                    <span className="badge bg-warning text-dark shadow-sm rounded-pill px-2.5 py-1">
                                      <i className="bi bi-star-fill me-1"></i>Đánh giá cao nhất
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Title & Price */}
                              <h6 className="fw-bold mb-2 font-display text-truncate-2" title={tour.title} style={{ minHeight: '44px', lineHeight: '1.4' }}>
                                <Link to={`/tours/${tour._id}`} className="text-decoration-none text-dark hover-primary">
                                  {tour.title}
                                </Link>
                              </h6>

                              <div className="fs-4 fw-bold text-primary mb-3">
                                {formatCurrency(tour.price)}
                              </div>

                              {/* Direct Booking & Details CTAs */}
                              <div className="d-flex flex-column gap-2">
                                <Link
                                  to={`/tours/${tour._id}/booking`}
                                  className="btn btn-primary btn-sm rounded-pill py-2 fw-semibold shadow-sm d-flex align-items-center justify-content-center gap-1.5"
                                >
                                  <i className="bi bi-bag-check"></i>
                                  <span>Đặt tour ngay</span>
                                </Link>
                                <Link
                                  to={`/tours/${tour._id}`}
                                  className="btn btn-outline-secondary btn-sm rounded-pill py-1.5 fw-medium d-flex align-items-center justify-content-center gap-1"
                                >
                                  <span>Xem chi tiết tour</span>
                                  <i className="bi bi-chevron-right small"></i>
                                </Link>
                              </div>
                            </th>
                          );
                        })}

                        {/* Add Tour Slot Column: Navigates back to /tours */}
                        {tours.length < 4 && (
                          <th className="tm-compare-header-cell text-center" style={{ width: `${100 / totalCols}%` }}>
                            <Link
                              to="/tours"
                              className="tm-compare-add-slot d-flex flex-column align-items-center justify-content-center text-decoration-none p-4"
                              title="Khám phá danh sách tour để thêm vào bảng so sánh"
                            >
                              <div className="tm-compare-add-icon mb-3">
                                <i className="bi bi-plus-lg fs-4"></i>
                              </div>
                              <div className="fw-bold text-dark mb-1">Thêm tour vào so sánh</div>
                              <div className="text-muted small mb-3">Tối đa 4 tour</div>
                              <span className="btn btn-outline-primary btn-sm rounded-pill px-3 py-1.5 fw-semibold d-inline-flex align-items-center gap-1 shadow-sm">
                                <i className="bi bi-plus"></i> Chọn thêm tour
                              </span>
                            </Link>
                          </th>
                        )}
                      </tr>
                    </thead>

                    <tbody>
                      {/* ========================================================
                          SECTION 1: THÔNG TIN CHUNG & HÀNH TRÌNH
                         ======================================================== */}
                      <tr
                        className="tm-compare-section-row"
                        onClick={() => toggleSection('overview')}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && toggleSection('overview')}
                        title="Bấm để đóng/mở mục Thông tin chung & Hành trình"
                      >
                        <td colSpan={totalCols}>
                          <div className="d-flex align-items-center justify-content-between">
                            <div className="d-flex align-items-center gap-2">
                              <span className="tm-compare-section-badge">
                                <i className="bi bi-info-circle"></i>
                              </span>
                              <span className="tm-compare-section-title">1. Thông tin chung & Hành trình</span>
                            </div>
                            <div className={`tm-compare-section-toggle ${openSections.overview ? 'is-open' : ''}`}>
                              <i className="bi bi-chevron-down"></i>
                            </div>
                          </div>
                        </td>
                      </tr>

                      {openSections.overview && (
                        <>
                          {/* Criterion: Thời lượng */}
                          <tr className="tm-compare-criterion-bar">
                            <td colSpan={totalCols}>
                              <i className="bi bi-clock me-1 text-primary"></i> Thời lượng
                            </td>
                          </tr>
                          <tr className="tm-compare-row-animate">
                            {tours.map((t) => (
                              <td key={t._id}>
                                <span className="badge bg-light text-dark border px-3 py-1.5 fw-semibold rounded-pill">
                                  <i className="bi bi-clock-history me-1 text-primary"></i>{t.duration}
                                </span>
                              </td>
                            ))}
                            {tours.length < 4 && <td></td>}
                          </tr>

                          {/* Criterion: Lộ trình */}
                          <tr className="tm-compare-criterion-bar">
                            <td colSpan={totalCols}>
                              <i className="bi bi-geo-alt me-1 text-danger"></i> Lộ trình
                            </td>
                          </tr>
                          <tr className="tm-compare-row-animate">
                            {tours.map((t) => (
                              <td key={t._id}>
                                <div className="d-flex align-items-center gap-1.5 small">
                                  <i className="bi bi-geo-alt-fill text-danger flex-shrink-0"></i>
                                  {t.departureLocation ? (
                                    <span>
                                      <strong className="text-dark">{t.departureLocation}</strong>
                                      <i className="bi bi-arrow-right mx-1.5 text-muted"></i>
                                      <strong className="text-primary">{t.destinationLocation || t.location}</strong>
                                    </span>
                                  ) : (
                                    <strong className="text-primary">{t.destinationLocation || t.location}</strong>
                                  )}
                                </div>
                              </td>
                            ))}
                            {tours.length < 4 && <td></td>}
                          </tr>

                          {/* Criterion: Thể loại tour */}
                          <tr className="tm-compare-criterion-bar">
                            <td colSpan={totalCols}>
                              <i className="bi bi-tag me-1 text-info"></i> Thể loại tour
                            </td>
                          </tr>
                          <tr className="tm-compare-row-animate">
                            {tours.map((t) => (
                              <td key={t._id}>
                                {t.category?.name ? (
                                  <span className="badge bg-info-subtle text-info-emphasis border border-info-subtle rounded-pill px-2.5 py-1">
                                    {t.category.name}
                                  </span>
                                ) : (
                                  <span className="text-muted">—</span>
                                )}
                              </td>
                            ))}
                            {tours.length < 4 && <td></td>}
                          </tr>

                          {/* Criterion: Nhà cung cấp */}
                          <tr className="tm-compare-criterion-bar">
                            <td colSpan={totalCols}>
                              <i className="bi bi-building me-1 text-secondary"></i> Nhà cung cấp
                            </td>
                          </tr>
                          <tr className="tm-compare-row-animate">
                            {tours.map((t) => (
                              <td key={t._id}>
                                <div className="d-flex align-items-center gap-2">
                                  <div className="rounded-circle bg-light border d-flex align-items-center justify-content-center text-primary fw-bold" style={{ width: 28, height: 28, fontSize: '0.8rem' }}>
                                    {(t.provider?.businessName || t.provider?.username || 'T').charAt(0).toUpperCase()}
                                  </div>
                                  <span className="fw-semibold text-dark small">
                                    {t.provider?.businessName || t.provider?.username || 'TripMate Partner'}
                                  </span>
                                </div>
                              </td>
                            ))}
                            {tours.length < 4 && <td></td>}
                          </tr>
                        </>
                      )}

                      {/* ========================================================
                          SECTION 2: ĐÁNH GIÁ & TÌNH TRẠNG CHỖ
                         ======================================================== */}
                      <tr
                        className="tm-compare-section-row"
                        onClick={() => toggleSection('ratings')}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && toggleSection('ratings')}
                        title="Bấm để đóng/mở mục Đánh giá & Tình trạng chỗ"
                      >
                        <td colSpan={totalCols}>
                          <div className="d-flex align-items-center justify-content-between">
                            <div className="d-flex align-items-center gap-2">
                              <span className="tm-compare-section-badge bg-warning text-dark">
                                <i className="bi bi-star-half"></i>
                              </span>
                              <span className="tm-compare-section-title">2. Đánh giá & Tình trạng chỗ</span>
                            </div>
                            <div className={`tm-compare-section-toggle ${openSections.ratings ? 'is-open' : ''}`}>
                              <i className="bi bi-chevron-down"></i>
                            </div>
                          </div>
                        </td>
                      </tr>

                      {openSections.ratings && (
                        <>
                          {/* Criterion: Điểm đánh giá */}
                          <tr className="tm-compare-criterion-bar">
                            <td colSpan={totalCols}>
                              <i className="bi bi-star me-1 text-warning"></i> Điểm đánh giá
                            </td>
                          </tr>
                          <tr className="tm-compare-row-animate">
                            {tours.map((t) => (
                              <td key={t._id}>
                                <div className="d-flex align-items-center gap-1.5">
                                  <div className="d-flex text-warning small">
                                    <i className="bi bi-star-fill"></i>
                                  </div>
                                  <strong className="fs-6 text-dark">{t.averageRating ? t.averageRating.toFixed(1) : '5.0'}</strong>
                                  <span className="text-muted small">/ 5.0</span>
                                  <span className="badge bg-light text-muted ms-1 rounded-pill">({t.reviewCount || 0} nhận xét)</span>
                                </div>
                              </td>
                            ))}
                            {tours.length < 4 && <td></td>}
                          </tr>

                          {/* Criterion: Số chỗ mở bán */}
                          <tr className="tm-compare-criterion-bar">
                            <td colSpan={totalCols}>
                              <i className="bi bi-people me-1 text-primary"></i> Số chỗ mở bán
                            </td>
                          </tr>
                          <tr className="tm-compare-row-animate">
                            {tours.map((t) => (
                              <td key={t._id}>
                                <span className="badge bg-primary-subtle text-primary border border-primary-subtle rounded-pill px-2.5 py-1 fw-medium">
                                  <i className="bi bi-people-fill me-1"></i>{t.availableSeats} chỗ tối đa
                                </span>
                              </td>
                            ))}
                            {tours.length < 4 && <td></td>}
                          </tr>

                          {/* Criterion: Khởi hành sắp tới */}
                          <tr className="tm-compare-criterion-bar">
                            <td colSpan={totalCols}>
                              <i className="bi bi-calendar3 me-1 text-success"></i> Khởi hành sắp tới
                            </td>
                          </tr>
                          <tr className="tm-compare-row-animate">
                            {tours.map((t) => (
                              <td key={t._id}>
                                {t.upcomingDepartures && t.upcomingDepartures.length > 0 ? (
                                  <div className="d-flex flex-column gap-1.5">
                                    {t.upcomingDepartures.slice(0, 3).map((dep) => (
                                      <div key={dep._id} className="bg-light p-2 rounded-3 border small d-flex justify-content-between align-items-center">
                                        <span>
                                          <i className="bi bi-calendar-event me-1.5 text-muted"></i>
                                          <strong>{new Date(dep.departureDate).toLocaleDateString('vi-VN')}</strong>
                                        </span>
                                        <span className="badge bg-success-subtle text-success border border-success-subtle rounded-pill">
                                          Còn {dep.availableSeats} chỗ
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-muted small fst-italic">Liên hệ nhà cung cấp</span>
                                )}
                              </td>
                            ))}
                            {tours.length < 4 && <td></td>}
                          </tr>
                        </>
                      )}

                      {/* ========================================================
                          SECTION 3: LỊCH TRÌNH THEO NGÀY
                         ======================================================== */}
                      <tr
                        className="tm-compare-section-row"
                        onClick={() => toggleSection('itinerary')}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && toggleSection('itinerary')}
                        title="Bấm để đóng/mở mục Lịch trình chi tiết theo ngày"
                      >
                        <td colSpan={totalCols}>
                          <div className="d-flex align-items-center justify-content-between">
                            <div className="d-flex align-items-center gap-2">
                              <span className="tm-compare-section-badge bg-primary">
                                <i className="bi bi-calendar-range"></i>
                              </span>
                              <span className="tm-compare-section-title">3. Lịch trình chi tiết theo ngày</span>
                            </div>
                            <div className={`tm-compare-section-toggle ${openSections.itinerary ? 'is-open' : ''}`}>
                              <i className="bi bi-chevron-down"></i>
                            </div>
                          </div>
                        </td>
                      </tr>

                      {openSections.itinerary && (
                        <>
                          <tr className="tm-compare-criterion-bar">
                            <td colSpan={totalCols}>
                              <i className="bi bi-map me-1 text-primary"></i> Chi tiết hành trình
                            </td>
                          </tr>
                          <tr className="tm-compare-row-animate">
                            {tours.map((t) => (
                              <td key={t._id} className="align-top">
                                {t.itinerary && t.itinerary.length > 0 ? (
                                  <div className="d-flex flex-column gap-2">
                                    {t.itinerary.map((day) => (
                                      <div key={day.day} className="tm-compare-itinerary-item p-3">
                                        {/* Badge ngày nằm trên cùng riêng biệt */}
                                        <div className="mb-2">
                                          <span className="badge bg-primary text-white rounded-pill px-2.5 py-1 fw-semibold" style={{ fontSize: '0.74rem' }}>
                                            <i className="bi bi-calendar2-day me-1"></i>Ngày {day.day}
                                          </span>
                                        </div>
                                        <div className="fw-bold text-dark small mb-1.5" style={{ lineHeight: '1.45' }}>
                                          {day.title}
                                        </div>
                                        <div className="text-muted small" style={{ fontSize: '0.82rem', lineHeight: '1.5' }}>
                                          {day.description}
                                        </div>
                                        {day.meals && day.meals.length > 0 && (
                                          <div className="mt-2 pt-2 border-top text-secondary small" style={{ fontSize: '0.76rem' }}>
                                            <i className="bi bi-cup-hot me-1 text-warning"></i>Bữa ăn: {day.meals.join(', ')}
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-muted small fst-italic">Chưa cập nhật lịch trình</span>
                                )}
                              </td>
                            ))}
                            {tours.length < 4 && <td></td>}
                          </tr>
                        </>
                      )}

                      {/* ========================================================
                          SECTION 4: QUYỀN LỢI & DỊCH VỤ
                         ======================================================== */}
                      <tr
                        className="tm-compare-section-row"
                        onClick={() => toggleSection('services')}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && toggleSection('services')}
                        title="Bấm để đóng/mở mục Quyền lợi & Dịch vụ đi kèm"
                      >
                        <td colSpan={totalCols}>
                          <div className="d-flex align-items-center justify-content-between">
                            <div className="d-flex align-items-center gap-2">
                              <span className="tm-compare-section-badge bg-success">
                                <i className="bi bi-check2-all"></i>
                              </span>
                              <span className="tm-compare-section-title">4. Quyền lợi & Dịch vụ đi kèm</span>
                            </div>
                            <div className={`tm-compare-section-toggle ${openSections.services ? 'is-open' : ''}`}>
                              <i className="bi bi-chevron-down"></i>
                            </div>
                          </div>
                        </td>
                      </tr>

                      {openSections.services && (
                        <>
                          {/* Criterion: Dịch vụ bao gồm */}
                          <tr className="tm-compare-criterion-bar">
                            <td colSpan={totalCols}>
                              <i className="bi bi-check-circle me-1 text-success"></i> Dịch vụ bao gồm
                            </td>
                          </tr>
                          <tr className="tm-compare-row-animate">
                            {tours.map((t) => (
                              <td key={t._id} className="align-top">
                                {t.includedServices && t.includedServices.length > 0 ? (
                                  <ul className="list-unstyled mb-0 d-flex flex-column gap-1.5">
                                    {t.includedServices.map((srv, idx) => (
                                      <li key={idx} className="d-flex align-items-start gap-2 small">
                                        <i className="bi bi-check-circle-fill text-success flex-shrink-0 mt-0.5"></i>
                                        <span className="text-dark">{srv}</span>
                                      </li>
                                    ))}
                                  </ul>
                                ) : (
                                  <span className="text-muted small fst-italic">Theo tiêu chuẩn tour</span>
                                )}
                              </td>
                            ))}
                            {tours.length < 4 && <td></td>}
                          </tr>

                          {/* Criterion: Dịch vụ không bao gồm */}
                          <tr className="tm-compare-criterion-bar">
                            <td colSpan={totalCols}>
                              <i className="bi bi-x-circle me-1 text-danger"></i> Dịch vụ không bao gồm
                            </td>
                          </tr>
                          <tr className="tm-compare-row-animate">
                            {tours.map((t) => (
                              <td key={t._id} className="align-top">
                                {t.excludedServices && t.excludedServices.length > 0 ? (
                                  <ul className="list-unstyled mb-0 d-flex flex-column gap-1.5">
                                    {t.excludedServices.map((srv, idx) => (
                                      <li key={idx} className="d-flex align-items-start gap-2 small text-muted">
                                        <i className="bi bi-x-circle-fill text-danger flex-shrink-0 mt-0.5 opacity-75"></i>
                                        <span>{srv}</span>
                                      </li>
                                    ))}
                                  </ul>
                                ) : (
                                  <span className="text-muted small fst-italic">Chi phí cá nhân ngoài chương trình</span>
                                )}
                              </td>
                            ))}
                            {tours.length < 4 && <td></td>}
                          </tr>
                        </>
                      )}

                      {/* ========================================================
                          SECTION 5: CHÍNH SÁCH & QUY ĐỊNH
                         ======================================================== */}
                      <tr
                        className="tm-compare-section-row"
                        onClick={() => toggleSection('policies')}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && toggleSection('policies')}
                        title="Bấm để đóng/mở mục Chính sách & Quy định"
                      >
                        <td colSpan={totalCols}>
                          <div className="d-flex align-items-center justify-content-between">
                            <div className="d-flex align-items-center gap-2">
                              <span className="tm-compare-section-badge bg-secondary">
                                <i className="bi bi-shield-check"></i>
                              </span>
                              <span className="tm-compare-section-title">5. Chính sách & Quy định</span>
                            </div>
                            <div className={`tm-compare-section-toggle ${openSections.policies ? 'is-open' : ''}`}>
                              <i className="bi bi-chevron-down"></i>
                            </div>
                          </div>
                        </td>
                      </tr>

                      {openSections.policies && (
                        <>
                          {/* Criterion: Chính sách hủy */}
                          <tr className="tm-compare-criterion-bar">
                            <td colSpan={totalCols}>
                              <i className="bi bi-arrow-counterclockwise me-1 text-primary"></i> Chính sách hủy
                            </td>
                          </tr>
                          <tr className="tm-compare-row-animate">
                            {tours.map((t) => (
                              <td key={t._id} className="align-top small text-muted">
                                {t.cancellationPolicy ? (
                                  <span>{t.cancellationPolicy}</span>
                                ) : (
                                  <span className="fst-italic">Theo chính sách hoàn/hủy tiêu chuẩn của TripMate</span>
                                )}
                              </td>
                            ))}
                            {tours.length < 4 && <td></td>}
                          </tr>

                          {/* Criterion: Lưu ý quan trọng */}
                          <tr className="tm-compare-criterion-bar">
                            <td colSpan={totalCols}>
                              <i className="bi bi-chat-left-dots me-1 text-secondary"></i> Lưu ý quan trọng
                            </td>
                          </tr>
                          <tr className="tm-compare-row-animate">
                            {tours.map((t) => (
                              <td key={t._id} className="align-top small text-muted">
                                {t.notes ? t.notes : '—'}
                              </td>
                            ))}
                            {tours.length < 4 && <td></td>}
                          </tr>
                        </>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
