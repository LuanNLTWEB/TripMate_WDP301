import { useState, useEffect } from 'react';
import { tourApi } from '../services/api';
import { useToast } from '../hooks/useToast';

const formatCurrency = (value) => new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0
}).format(value || 0);

export default function EditTourPriceModal({ open, onClose, tour, onUpdated }) {
  const toast = useToast();
  const [price, setPrice] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open && tour) {
      setPrice(tour.price !== undefined && tour.price !== null ? String(tour.price) : '');
      setError('');
    }
  }, [open, tour]);

  if (!open || !tour) return null;

  const handlePriceChange = (e) => {
    const rawValue = e.target.value.replace(/\D/g, '');
    setPrice(rawValue);
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const numPrice = Number(price);
    if (!price || isNaN(numPrice) || numPrice <= 0) {
      setError('Giá tour mới phải là số hợp lệ lớn hơn 0.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const res = await tourApi.updatePrice(tour._id, numPrice);
      toast.success(res.message || 'Cập nhật giá tour thành công');
      if (onUpdated) {
        onUpdated(numPrice);
      }
      onClose();
    } catch (err) {
      setError(err.message || 'Không thể cập nhật giá tour.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="modal-backdrop fade show" style={{ zIndex: 1040 }}></div>
      <div className="modal fade show d-block" tabIndex="-1" role="dialog" aria-modal="true" style={{ zIndex: 1050 }}>
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content border-0 shadow-lg">
            <div className="modal-header bg-light">
              <div>
                <span className="badge text-bg-primary rounded-pill small mb-1">
                  Tour Pricing
                </span>
                <h5 className="modal-title fw-bold text-dark d-flex align-items-center gap-2">
                  <i className="bi bi-tag-fill text-primary"></i>
                  <span>Cập nhật giá tour</span>
                </h5>
                <small className="text-muted d-block text-truncate" style={{ maxWidth: '350px' }}>
                  Tour: <strong>{tour.title}</strong>
                </small>
              </div>
              <button
                type="button"
                className="btn-close"
                onClick={onClose}
                disabled={submitting}
                aria-label="Đóng"
              ></button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="modal-body p-4">
                {error && (
                  <div className="alert alert-danger py-2 small mb-3">
                    <i className="bi bi-exclamation-triangle-fill me-1"></i>
                    {error}
                  </div>
                )}

                <div className="mb-3">
                  <label htmlFor="edit-tour-price" className="form-label fw-semibold">
                    Giá tour mới (VNĐ) <span className="text-danger">*</span>
                  </label>
                  <div className="input-group">
                    <input
                      type="text"
                      id="edit-tour-price"
                      className="form-control font-monospace fw-semibold"
                      value={price ? Number(price).toLocaleString('vi-VN') : ''}
                      onChange={handlePriceChange}
                      placeholder="Ví dụ: 1.500.000"
                      autoFocus
                      required
                    />
                    <span className="input-group-text bg-light text-muted">VNĐ</span>
                  </div>
                  {price && !isNaN(Number(price)) && (
                    <div className="form-text mt-1 text-primary fw-medium small">
                      <i className="bi bi-info-circle me-1"></i>
                      Tương đương: <strong>{formatCurrency(Number(price))}</strong>
                    </div>
                  )}
                  <div className="form-text small text-muted mt-1">
                    Giá áp dụng cho các lượt đặt tour mới trong tương lai.
                  </div>
                </div>
              </div>

              <div className="modal-footer bg-light">
                <button
                  type="button"
                  className="btn btn-outline-secondary rounded-pill px-4"
                  onClick={onClose}
                  disabled={submitting}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="btn btn-primary rounded-pill px-4 d-inline-flex align-items-center gap-2"
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <span className="spinner-border spinner-border-sm" role="status"></span>
                      <span>Đang lưu...</span>
                    </>
                  ) : (
                    <>
                      <i className="bi bi-check-lg"></i>
                      <span>Lưu giá</span>
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
