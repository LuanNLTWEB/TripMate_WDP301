import { useState } from 'react';
import { bookingApi } from '../services/api';
import { useToast } from '../hooks/useToast';

const MIN_REASON = 10;
const MAX_REASON = 500;
const FREE_CANCEL_WINDOW_HOURS = 48;

const formatDate = (value) =>
  value ? new Date(value).toLocaleString('vi-VN') : '—';

/**
 * Modal hủy đặt tour (UC-74 - Cancel Booking)
 *
 * Chỉ xử lý thao tác hủy. Danh sách đơn và điều kiện hiển thị nút do
 * BookingHistory.jsx quyết định.
 */
const CancelBookingModal = ({ booking, tourTitle, onClose, onCancelled }) => {
  const toast = useToast();
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const normalizedReason = reason.trim();

    if (normalizedReason.length < MIN_REASON) {
      setError(`Lý do hủy phải có ít nhất ${MIN_REASON} ký tự.`);
      return;
    }

    setError('');
    setIsSubmitting(true);
    try {
      const response = await bookingApi.cancel(booking._id, normalizedReason);
      toast.success(response.message || 'Hủy đặt tour thành công.');
      onCancelled(response);
      onClose();
    } catch (requestError) {
      const message = requestError.message || 'Không thể hủy đặt tour.';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div
        className="modal fade show d-block"
        tabIndex="-1"
        role="dialog"
        aria-modal="true"
        style={{ backgroundColor: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(4px)', zIndex: 1055 }}
        onClick={(event) => {
          if (event.target === event.currentTarget) onClose();
        }}
      >
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
            <div className="modal-header bg-light px-4 py-3 border-bottom d-flex align-items-center justify-content-between">
              <div>
                <span className="badge text-bg-danger-subtle text-danger-emphasis text-uppercase fw-semibold mb-1">
                  Mã đơn: #{booking._id.slice(-6).toUpperCase()}
                </span>
                <h5 className="modal-title fw-bold text-dark mb-0">
                  <i className="bi bi-x-octagon me-2 text-danger"></i>Hủy đặt tour
                </h5>
              </div>
              <button
                type="button"
                className="btn-close"
                onClick={onClose}
                disabled={isSubmitting}
                aria-label="Đóng"
              ></button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="modal-body px-4">
                <p className="text-muted small mb-4">
                  Bạn đang hủy đơn cho <strong className="text-dark">{tourTitle}</strong>.
                  Số chỗ đã giữ sẽ được trả lại cho tour ngay khi hủy.
                </p>

                <div className="card border bg-light mb-4">
                  <div className="card-body py-3">
                    <div className="small text-muted">
                      Ngày khởi hành:{' '}
                      <strong className="text-dark">{formatDate(booking.departureDate)}</strong>
                    </div>
                    <div className="small text-muted">
                      Số lượng khách: <strong className="text-dark">{booking.numberOfPeople}</strong>
                    </div>
                  </div>
                </div>

                <div className="mb-2">
                  <label htmlFor="cancelBookingReason" className="form-label fw-semibold">
                    Lý do hủy <span className="text-danger">*</span>
                  </label>
                  <textarea
                    id="cancelBookingReason"
                    className={`form-control ${error ? 'is-invalid' : ''}`}
                    rows={4}
                    minLength={MIN_REASON}
                    maxLength={MAX_REASON}
                    placeholder="VD: Tôi có thay đổi kế hoạch đi vào ngày khác."
                    value={reason}
                    disabled={isSubmitting}
                    onChange={(event) => {
                      setReason(event.target.value);
                      setError('');
                    }}
                  />
                  <div className="d-flex justify-content-between mt-1">
                    <span className="text-muted small">Tối thiểu {MIN_REASON} ký tự</span>
                    <span className="text-muted small">{reason.length}/{MAX_REASON}</span>
                  </div>
                </div>

                {error && (
                  <div className="alert alert-danger py-2 small mb-0 mt-3" role="alert">
                    <i className="bi bi-exclamation-circle me-2"></i>{error}
                  </div>
                )}

                <div className="alert alert-light border small mt-3 mb-0">
                  <i className="bi bi-info-circle me-1"></i>
                  Chỉ hủy được miễn phí khi còn ít nhất {FREE_CANCEL_WINDOW_HOURS} giờ trước ngày khởi hành.
                </div>
              </div>

              <div className="modal-footer border-0 px-4 pb-4 pt-2">
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={onClose}
                  disabled={isSubmitting}
                >
                  Giữ lại đơn
                </button>
                <button
                  type="submit"
                  className="btn btn-danger px-4"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>
                      Đang hủy...
                    </>
                  ) : (
                    <><i className="bi bi-x-circle me-2"></i>Xác nhận hủy đặt tour</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
      <div className="modal-backdrop fade show"></div>
    </>
  );
};

export default CancelBookingModal;