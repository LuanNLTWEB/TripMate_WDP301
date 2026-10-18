import { useState, useEffect } from 'react';
import { departureApi } from '../services/api';
import { useToast } from '../hooks/useToast';

const formatCurrency = (value) => new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0
}).format(Number(value) || 0);

export default function CreateTourDepartureModal({ open, onClose, tour, onCreated }) {
  const toast = useToast();
  const [departureDate, setDepartureDate] = useState('');
  const [availableSeats, setAvailableSeats] = useState('');
  const [price, setPrice] = useState('');
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const tourId = tour?._id;
  const tourPrice = tour?.price ?? 0;

  useEffect(() => {
    if (open) {
      setDepartureDate('');
      setAvailableSeats(tour?.availableSeats != null ? String(tour.availableSeats) : '');
      setPrice('');
      setNote('');
      setErrors({});
    }
  }, [open, tour?.availableSeats]);

  if (!open) return null;

  const validate = () => {
    const errs = {};
    if (!departureDate) {
      errs.departureDate = 'Vui lòng chọn ngày khởi hành';
    } else if (new Date(departureDate).getTime() - Date.now() < 24 * 60 * 60 * 1000) {
      errs.departureDate = 'Ngày khởi hành phải cách thời điểm hiện tại ít nhất 24 giờ';
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
    if (Object.keys(nextErrors).length > 0 || submitting || !tourId) return;

    setSubmitting(true);
    try {
      const payload = {
        tourId,
        departureDate,
        availableSeats: Number(availableSeats),
        price: price === '' ? undefined : Number(price),
        note: note.trim()
      };

      const res = await departureApi.create(payload);
      toast.success(res.message || 'Tạo lịch khởi hành thành công!');
      if (onCreated) onCreated(res.data);
      onClose();
    } catch (err) {
      toast.error(err.message || 'Không thể tạo lịch khởi hành.');
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
                <i className="bi bi-calendar2-plus text-primary"></i>
                <span>Tạo Lịch Khởi Hành</span>
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
                {tour?.title && (
                  <div className="alert alert-light border d-flex align-items-center gap-2 mb-4">
                    <i className="bi bi-signpost-split text-primary"></i>
                    <span className="small">
                      Tour: <strong>{tour.title}</strong>
                    </span>
                  </div>
                )}
                <div className="row g-3">
                  <div className="col-md-6">
                    <label htmlFor="departure-date" className="form-label fw-semibold">
                      Ngày khởi hành <span className="text-danger">*</span>
                    </label>
                    <input
                      id="departure-date"
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
                    <label htmlFor="departure-seats" className="form-label fw-semibold">
                      Số chỗ <span className="text-danger">*</span>
                    </label>
                    <input
                      id="departure-seats"
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
                      : <div className="form-text">Số chỗ riêng của lịch khởi hành này.</div>}
                  </div>

                  <div className="col-md-3">
                    <label htmlFor="departure-price" className="form-label fw-semibold">
                      Giá khởi hành
                    </label>
                    <input
                      id="departure-price"
                      type="number"
                      min="0"
                      step="1000"
                      className={`form-control ${errors.price ? 'is-invalid' : ''}`}
                      placeholder={String(tourPrice)}
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      disabled={submitting}
                    />
                    {errors.price
                      ? <div className="invalid-feedback d-block">{errors.price}</div>
                      : <div className="form-text">Để trống để dùng giá tour ({formatCurrency(tourPrice)}).</div>}
                  </div>

                  <div className="col-12">
                    <label htmlFor="departure-note" className="form-label fw-semibold">
                      Ghi chú cho lịch khởi hành
                    </label>
                    <textarea
                      id="departure-note"
                      rows={3}
                      className={`form-control ${errors.note ? 'is-invalid' : ''}`}
                      placeholder="VD: Khởi hành lúc 06:30 tại sân bay Tân Sơn Nhất, quý khách vui lòng có mặt 30 phút trước."
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
                      <span>Đang tạo...</span>
                    </>
                  ) : (
                    <>
                      <i className="bi bi-calendar2-plus"></i>
                      <span>Tạo lịch khởi hành</span>
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