import { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { bookingApi } from '../services/api';
import { useToast } from '../hooks/useToast';

const formatCurrency = (value) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value || 0);
const formatDate = (value) => new Date(value).toLocaleDateString('vi-VN');

export default function MyBookings() {
  const toast = useToast();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [retryingId, setRetryingId] = useState(null);

  const loadBookings = async () => {
    setLoading(true);
    try {
      const response = await bookingApi.getMyBookings();
      setBookings(response.data || []);
    } catch (error) {
      toast.error(error.message || 'Unable to load your bookings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBookings();
  }, []);

  const handleRetry = async (bookingId) => {
    setRetryingId(bookingId);
    try {
      const response = await bookingApi.retryPayment(bookingId);
      setBookings((current) => current.map((booking) => booking._id === bookingId ? { ...booking, ...response.data } : booking));
      toast.success(response.message || 'Payment retry started.');
    } catch (error) {
      toast.error(error.message || 'Unable to retry payment.');
    } finally {
      setRetryingId(null);
    }
  };

  return (
    <>
      <Navbar />
      <main className="bg-light py-5" style={{ minHeight: '80vh' }}>
        <div className="container">
          <div className="mb-4">
            <span className="text-primary fw-semibold small text-uppercase">Booking management</span>
            <h1 className="fw-bold mb-2">My bookings</h1>
            <p className="text-muted mb-0">Track booking and payment status. Failed payments can be retried safely.</p>
          </div>
          {loading ? (
            <div className="text-center py-5"><span className="spinner-border text-primary"></span></div>
          ) : bookings.length === 0 ? (
            <div className="alert alert-info">You do not have any bookings yet.</div>
          ) : (
            <div className="vstack gap-3">
              {bookings.map((booking) => (
                <article className="card border-0 shadow-sm rounded-4" key={booking._id}>
                  <div className="card-body p-4">
                    <div className="d-flex justify-content-between align-items-start gap-3 flex-wrap">
                      <div>
                        <h2 className="h5 fw-bold mb-1">{booking.tourId?.title || 'Tour unavailable'}</h2>
                        <div className="text-muted small">Departure: {formatDate(booking.departureDate)} · {booking.numberOfPeople} people</div>
                      </div>
                      <span className={`badge ${booking.status === 'confirmed' ? 'text-bg-success' : booking.status === 'cancelled' ? 'text-bg-danger' : 'text-bg-warning'}`}>{booking.status}</span>
                    </div>
                    <div className="d-flex justify-content-between align-items-center flex-wrap gap-3 mt-3 pt-3 border-top">
                      <div>
                        <div className="fw-bold">{formatCurrency(booking.totalPrice)}</div>
                        <div className="small text-muted">Payment: <strong>{booking.paymentStatus || 'unpaid'}</strong></div>
                        {booking.paymentStatus === 'failed' && <div className="small text-danger mt-1">{booking.paymentFailureReason}</div>}
                      </div>
                      {booking.paymentStatus === 'failed' && (
                        <button type="button" className="btn btn-primary btn-sm" onClick={() => handleRetry(booking._id)} disabled={retryingId === booking._id}>
                          {retryingId === booking._id ? 'Retrying...' : 'Retry payment'}
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
