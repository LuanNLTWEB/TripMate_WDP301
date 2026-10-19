import { createPortal } from 'react-dom';
import { TRIPMATE_LOGO_URL } from '../constants/brand';

const formatDate = (value, options = {}) => {
  if (!value) return 'Chưa xác định';

  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Chưa xác định'
    : date.toLocaleDateString('vi-VN', options);
};

const formatAmount = (value) => new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0
}).format(Number(value || 0));

const getActivityDateKey = (activity) => {
  const date = new Date(activity.date);
  return Number.isNaN(date.getTime()) ? 'undated' : date.toISOString().slice(0, 10);
};

function ItineraryPrintView({ itinerary }) {
  if (!itinerary || typeof document === 'undefined') return null;

  const activities = [...(itinerary.activities || [])].sort((first, second) => {
    const firstDate = new Date(first.date).getTime() || Number.MAX_SAFE_INTEGER;
    const secondDate = new Date(second.date).getTime() || Number.MAX_SAFE_INTEGER;
    if (firstDate !== secondDate) return firstDate - secondDate;
    return String(first.startTime || '').localeCompare(String(second.startTime || ''));
  });
  const destinations = itinerary.destinations || [];
  const tours = itinerary.tours || [];
  const activityCost = activities.reduce(
    (total, activity) => total + Number(activity.estimatedCost || 0),
    0
  );
  const tourCost = tours.reduce((total, tour) => total + Number(tour.price || 0), 0);
  const projectedCost = activityCost + tourCost;
  const groupedActivities = activities.reduce((groups, activity) => {
    const key = getActivityDateKey(activity);
    if (!groups[key]) groups[key] = [];
    groups[key].push(activity);
    return groups;
  }, {});
  const exportedAt = new Date();

  return createPortal(
    <section className="itinerary-print-root" aria-hidden="true">
      <header className="itinerary-print-header">
        <div className="itinerary-print-brand-lockup">
          <span className="itinerary-print-logo-frame">
            <img className="itinerary-print-logo" src={TRIPMATE_LOGO_URL} alt="TripMate" />
          </span>
          <div>
            <p className="itinerary-print-brand">TripMate</p>
            <p className="itinerary-print-tagline">Khám phá Việt Nam theo cách của bạn</p>
          </div>
        </div>
        <div className="itinerary-print-document-meta">
          <span>Kế hoạch hành trình</span>
          <strong>{formatDate(exportedAt, { day: '2-digit', month: '2-digit', year: 'numeric' })}</strong>
        </div>
      </header>

      <section className="itinerary-print-hero">
        <p>Hành trình cá nhân</p>
        <h1>{itinerary.title}</h1>
        <div className="itinerary-print-date-range">
          <span>
            {formatDate(itinerary.startDate, { day: '2-digit', month: 'long', year: 'numeric' })}
            {' - '}
            {formatDate(itinerary.endDate, { day: '2-digit', month: 'long', year: 'numeric' })}
          </span>
        </div>
      </section>

      <div className="itinerary-print-summary">
        <div>
          <span>Điểm đến</span>
          <strong>{destinations.length}</strong>
          <small>địa điểm</small>
        </div>
        <div>
          <span>Tour đã chọn</span>
          <strong>{tours.length}</strong>
          <small>hành trình</small>
        </div>
        <div>
          <span>Ngân sách</span>
          <strong>{formatAmount(itinerary.budget)}</strong>
          <small>dự kiến</small>
        </div>
        <div>
          <span>Chi phí kế hoạch</span>
          <strong>{formatAmount(projectedCost)}</strong>
          <small>tour và hoạt động</small>
        </div>
      </div>

      <section className="itinerary-print-section">
        <div className="itinerary-print-section-heading">
          <span>01</span>
          <div><h2>Điểm đến</h2><p>Những điểm dừng chân trong chuyến đi</p></div>
        </div>
        {destinations.length === 0 ? (
          <p className="itinerary-print-empty">Lịch trình chưa có điểm đến.</p>
        ) : (
          <div className="itinerary-print-destinations">
            {destinations.map((destination, index) => (
              <div key={destination._id || destination}>
                <span>{String(index + 1).padStart(2, '0')}</span>
                <div>
                  <strong>{destination.name || 'Điểm đến'}</strong>
                  <small>{destination.location || 'Chưa cập nhật địa chỉ'}</small>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="itinerary-print-section">
        <div className="itinerary-print-section-heading">
          <span>02</span>
          <div><h2>Tour trong kế hoạch</h2><p>Các trải nghiệm đã được thêm vào hành trình</p></div>
        </div>
        {tours.length === 0 ? (
          <p className="itinerary-print-empty">Lịch trình chưa có tour.</p>
        ) : (
          <div className="itinerary-print-tours">
            {tours.map((tour) => (
              <article key={tour._id || tour.title}>
                <div>
                  <strong>{tour.title || 'Tour du lịch'}</strong>
                  <span>{tour.departureLocation || 'Điểm khởi hành'} - {tour.destinationLocation || tour.location || 'Điểm đến'}</span>
                </div>
                <div>
                  <small>{tour.duration || 'Chưa cập nhật thời lượng'}</small>
                  <strong>{formatAmount(tour.price)}</strong>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="itinerary-print-section itinerary-print-activity-section">
        <div className="itinerary-print-section-heading">
          <span>03</span>
          <div><h2>Lịch hoạt động</h2><p>Chi tiết hoạt động được sắp xếp theo ngày và thời gian</p></div>
        </div>
        {activities.length === 0 ? (
          <p className="itinerary-print-empty">Lịch trình chưa có hoạt động.</p>
        ) : (
          <div className="itinerary-print-days">
            {Object.entries(groupedActivities).map(([dateKey, dateActivities], groupIndex) => (
              <article className="itinerary-print-day" key={dateKey}>
                <div className="itinerary-print-day-heading">
                  <span>Ngày {groupIndex + 1}</span>
                  <strong>{dateKey === 'undated' ? 'Chưa xác định ngày' : formatDate(`${dateKey}T00:00:00`, { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })}</strong>
                </div>
                <div className="itinerary-print-activities">
                  {dateActivities.map((activity, index) => (
                    <div className="itinerary-print-activity" key={activity._id || `${activity.title}-${index}`}>
                      <div className="itinerary-print-activity-time">
                        <strong>{activity.startTime || '--:--'}</strong>
                        <span>{activity.endTime ? `đến ${activity.endTime}` : ''}</span>
                      </div>
                      <div className="itinerary-print-activity-content">
                        <strong>{activity.title}</strong>
                        <span>{activity.location || 'Chưa cập nhật địa điểm'}</span>
                        {activity.notes && <p>{activity.notes}</p>}
                      </div>
                      <strong className="itinerary-print-activity-cost">{formatAmount(activity.estimatedCost)}</strong>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="itinerary-print-cost-note">
        <div>
          <span>Tổng chi phí tour</span>
          <strong>{formatAmount(tourCost)}</strong>
        </div>
        <div>
          <span>Tổng chi phí hoạt động</span>
          <strong>{formatAmount(activityCost)}</strong>
        </div>
        <div className="itinerary-print-cost-total">
          <span>Tổng dự kiến</span>
          <strong>{formatAmount(projectedCost)}</strong>
        </div>
      </section>

    </section>,
    document.body
  );
}

export default ItineraryPrintView;
