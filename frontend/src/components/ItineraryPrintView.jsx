const formatDate = (value) => {
  if (!value) return '—';

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('vi-VN');
};

const formatAmount = (value) => Number(value || 0).toLocaleString('vi-VN');

function ItineraryPrintView({ itinerary }) {
  if (!itinerary) return null;

  const activities = itinerary.activities || [];
  const totalEstimatedCost = activities.reduce(
    (total, activity) => total + Number(activity.estimatedCost || 0),
    0
  );

  return (
    <section className="itinerary-print-root" aria-hidden="true">
      <header className="itinerary-print-header">
        <div>
          <p className="itinerary-print-brand">TripMate</p>
          <h1>{itinerary.title}</h1>
        </div>
        <p>Ngày xuất: {new Date().toLocaleDateString('vi-VN')}</p>
      </header>

      <div className="itinerary-print-summary">
        {(itinerary.startDate || itinerary.endDate) && (
          <div>
            <span>Thời gian</span>
            <strong>{formatDate(itinerary.startDate)} – {formatDate(itinerary.endDate)}</strong>
          </div>
        )}
        <div>
          <span>Ngân sách dự kiến</span>
          <strong>{formatAmount(itinerary.budget)}</strong>
        </div>
        <div>
          <span>Tổng chi phí hoạt động</span>
          <strong>{formatAmount(totalEstimatedCost)}</strong>
        </div>
      </div>

      <h2>Điểm đến</h2>
      {(itinerary.destinations || []).length === 0 ? (
        <p className="itinerary-print-empty">Lịch trình chưa có điểm đến.</p>
      ) : (
        <ul className="itinerary-print-destinations">
          {itinerary.destinations.map((destination) => (
            <li key={destination._id || destination}>
              <strong>{destination.name}</strong>
              {destination.location ? ` — ${destination.location}` : ''}
            </li>
          ))}
        </ul>
      )}

      <h2>Danh sách hoạt động</h2>
      {activities.length === 0 ? (
        <p className="itinerary-print-empty">Lịch trình chưa có hoạt động.</p>
      ) : (
        <table className="itinerary-print-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Hoạt động</th>
              <th>Thời gian</th>
              <th>Địa điểm</th>
              <th>Chi phí dự kiến</th>
              <th>Ghi chú</th>
            </tr>
          </thead>
          <tbody>
            {activities.map((activity, index) => (
              <tr key={activity._id || `${activity.title}-${index}`}>
                <td>{index + 1}</td>
                <td>{activity.title}</td>
                <td>
                  {formatDate(activity.date)}
                  <br />
                  {activity.startTime} – {activity.endTime}
                </td>
                <td>{activity.location || '—'}</td>
                <td>{formatAmount(activity.estimatedCost)}</td>
                <td>{activity.notes || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

export default ItineraryPrintView;
