import { useEffect, useState } from 'react';
import { bookingApi } from '../services/api';
import { useToast } from '../hooks/useToast';

const formatDate = (value) => new Date(value).toLocaleDateString('vi-VN');
const formatCurrency = (value) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value || 0);

const statusLabel = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  cancelled: 'Cancelled'
};

export default function ProviderBookingRequests() {
  const toast = useToast();
  const [status, setStatus] = useState('all');
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadBookings = async () => {
    setLoading(true);
    try {
      const response = await bookingApi.getProviderRequests({ status, limit: 50 });
      setBookings(response.data || []);
      setError('');
    } catch (requestError) {
      setError(requestError.message || 'Unable to load booking requests.');
      toast.error(requestError.message || 'Unable to load booking requests.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBookings();
  }, [status]);

  return (
    <section className="management-page-section">
      <div className="management-page-heading">
        <span className="management-page-kicker">Booking Management</span>
        <h1>Booking requests</h1>
        <p>Review customer requests for tours owned by your provider account.</p>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="management-table-card">
        <div className="management-table-toolbar">
          <div className="d-flex align-items-center gap-2">
            <label className="small text-muted fw-semibold" htmlFor="booking-status">Status</label>
            <select id="booking-status" className="form-select form-select-sm" value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="all">All statuses</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <button type="button" className="btn btn-sm btn-outline-primary" onClick={loadBookings} disabled={loading}>
            <i className="bi bi-arrow-clockwise me-1"></i>Refresh
          </button>
        </div>

        <div className="table-responsive">
          <table className="management-table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Tour</th>
                <th>Departure</th>
                <th>People</th>
                <th>Total</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="6" className="text-center py-5 text-muted"><span className="spinner-border spinner-border-sm me-2"></span>Loading booking requests...</td></tr>
              ) : bookings.length === 0 ? (
                <tr><td colSpan="6" className="text-center py-5 text-muted">No booking requests found.</td></tr>
              ) : bookings.map((booking) => (
                <tr key={booking._id}>
                  <td>
                    <div className="fw-semibold">{booking.customerId?.username || booking.fullName}</div>
                    <div className="small text-muted">{booking.customerId?.email || booking.email}</div>
                  </td>
                  <td>
                    <div className="fw-semibold">{booking.tourId?.title || 'Tour unavailable'}</div>
                    <div className="small text-muted">{booking.tourId?.departureLocation || booking.tourId?.location || '—'}</div>
                  </td>
                  <td>{formatDate(booking.departureDate)}</td>
                  <td>{booking.numberOfPeople}</td>
                  <td>{formatCurrency(booking.totalPrice)}</td>
                  <td><span className={`badge ${booking.status === 'confirmed' ? 'text-bg-success' : booking.status === 'cancelled' ? 'text-bg-danger' : 'text-bg-warning'}`}>{statusLabel[booking.status] || booking.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
