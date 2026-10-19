import { useState, useEffect } from 'react';
import { departureApi } from '../services/api';
import { useToast } from '../hooks/useToast';

const formatCurrency = (value) => new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0
}).format(Number(value) || 0);

export default function EditDepartureSlotModal({ open, onClose, departure, tourPrice, onUpdated }) {
  const toast = useToast();
  const [departureDate, setDepartureDate] = useState('');
  const [availableSeats, setAvailableSeats] = useState('');
  const [price, setPrice] = useState('');
  const [status, setStatus] = useState('scheduled');
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open && departure) {
      const dateVal = departure.departureDate ? new Date(departure.departureDate).toISOString().split('T')[0] : '';
      setDepartureDate(dateVal);
      setAvailableSeats(departure.availableSeats != null ? String(departure.availableSeats) : '0');
      setPrice(departure.price != null ? String(departure.price) : '');
      setStatus(departure.status || 'scheduled');
      setNote(departure.note || '');
      setErrors({});
    }
  }, [open, departure]);

  if (!open || !departure) return null;

  const validate = () => {
    const errs = {};
    if (!departureDate) {
      errs.departureDate = 'Vui lòng chọn ngày khởi hành';
    } else {
      const selected = new Date(departureDate).getTime();
      const now = Date.now();
      if (selected - now < 24 * 60 * 60 * 1000) {
        errs.departureDate = 'Ngày khởi hành phải cách thời điểm hiện tại ít nhất 24 giờ';
      }
    }

    if (availableSeats === '') {
      errs.availableSeats = 'Vui lòng nhập số chỗ';
    } else if (!Number.isInteger(Number(availableSeats)) || Number(availableSeats) < 0) {
      errs.availableSeats = 'Số chỗ phải là số nguyên không âm';
    }

    if (price !== '') {
      const parsed = Number(price);
      if (!Number.isFinite(parsed) || parsed < 0) {
        errs.price = 'Giá khởi hành phải là số không âm';
      }
    }

    if (note.length > 500) {
      errs.note = 'Ghi chú không được vượt quá 500 ký tự';
    }

    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0 || submitting) return;

    setSubmitting(true);
    try {
      const payload = {
        departureDate,
        availableSeats: Number(availableSeats),
        price: price === '' ? null : Number(price),
        status,
        note: note.trim()
      };

      const res = await departureApi.update(departure._id, payload);
      toast.success(res.message || 'Cập nhật lịch khởi hành thành công');
      if (onUpdated) onUpdated(res.data);
      onClose();
    } catch (err) {
      toast.error(err.message || 'Không thể cập nhật lịch khởi hành');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="modal-backdrop fade show"></div>
      <div className="modal fade show d-block" tabIndex="-1" role="dialog" aria-modal="true">
        <div className="modal-dialog modal-dialog-centered modal-lg">
          <div className="modal-content border-0 shadow">
            <div className="modal-header">
              <h5 className="modal-title fw-bold text-dark d-flex align-items-center gap-2">
                <i className="bi bi-pencil-square text-primary"></i>
                <span>Chỉnh sửa lịch khởi hành</span>
              </h5>
              <button
                type="button"
                className="btn-close"
                onClick={onClose}
                disabled={submitting}
                aria-label="Đóng"
              ></button>
            </div>
            <form onSubmit={handleSubmit} noValidate>
              <div className="modal-body p-4">
                <div className="row g-3">
                  <div className="col-md-6">
                    <label htmlFor="slot-departure-date" className="form-label fw-semibold">
                      Ngày khởi hành <span className="text-danger">*</span>
                    </label>
                    <input
                      id="slot-departure-date"
                      type="date"
                      className={`form-control ${errors.departureDate ? 'is-invalid' : ''}`}
                      value={departureDate}
                      onChange={(e) => setDepartureDate(e.target.value)}
                      disabled={submitting}
                      autoFocus
                    />
                    {errors.departureDate
                      ? <div className="invalid-feedback d-block">{errors.departureDate}</div>
                      : <div className="form-text">Ngày khởi hành phải cách hiện tại ít nhất 24 giờ.</div>}
                  </div>

                  <div className="col-md-3">
                    <label htmlFor="slot-seats" className="form-label fw-semibold">
                      Số chỗ <span className="text-danger">*</span>
                    </label>
                    <input
                      id="slot-seats"
                      type="number"
                      min="0"
                      step="1"
                      className={`form-control ${errors.availableSeats ? 'is-invalid' : ''}`}
                      value={availableSeats}
                      onChange={(e) => setAvailableSeats(e.target.value)}
                      disabled={submitting}
                    />
                    {errors.availableSeats
                      ? <div className="invalid-feedback d-block">{errors.availableSeats}</div>
                      : <div className="form-text">Số chỗ của lịch khởi hành này.</div>}
                  </div>

                  <div className="col-md-3">
                    <label htmlFor="slot-price" className="form-label fw-semibold">
                      Giá khởi hành
                    </label>
                    <input
                      id="slot-price"
                      type="number"
                      min="0"
                      step="1000"
                      className={`form-control ${errors.price ? 'is-invalid' : ''}`}
                      placeholder={tourPrice != null ? String(tourPrice) : ''}
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      disabled={submitting}
                    />
                    {errors.price
                      ? <div className="invalid-feedback d-block">{errors.price}</div>
                      : <div className="form-text">Để trống để theo giá tour ({formatCurrency(tourPrice)}).</div>}
                  </div>

                  <div className="col-md-6">
                    <label htmlFor="slot-status" className="form-label fw-semibold">
                      Trạng thái lịch
                    </label>
                    <select
                      id="slot-status"
                      className="form-select"
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      disabled={submitting}
                    >
                      <option value="scheduled">Đang lên lịch (Hoạt động)</option>
                      <option value="cancelled">Đã hủy (Tạm ngưng)</option>
                    </select>
                  </div>

                  <div className="col-12">
                    <label htmlFor="slot-note" className="form-label fw-semibold">
                      Ghi chú lịch khởi hành
                    </label>
                    <textarea
                      id="slot-note"
                      rows={3}
                      className={`form-control ${errors.note ? 'is-invalid' : ''}`}
                      placeholder="Ghi chú về địa điểm đón, dặn dò giờ giấc..."
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      maxLength={500}
                      disabled={submitting}
                    ></textarea>
                    {errors.note && <div className="invalid-feedback d-block">{errors.note}</div>}
                    <div className="form-text small text-muted text-end">{note.length}/500 ký tự</div>
                  </div>
                </div>
              </div>

              <div className="modal-footer bg-light">
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={onClose}
                  disabled={submitting}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="btn btn-primary d-inline-flex align-items-center gap-2"
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <span className="spinner-border spinner-border-sm" aria-hidden="true"></span>
                      <span>Đang lưu...</span>
                    </>
                  ) : (
                    <>
                      <i className="bi bi-check-lg"></i>
                      <span>Lưu thay đổi</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
