import { useEffect, useState } from 'react';
import { itineraryApi } from '../services/api';

const formatMoney = (value) => `${Number(value || 0).toLocaleString('vi-VN')} ₫`;

export default function TripBudgetModal({ open, itinerary, onClose }) {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open || !itinerary) return;
    setLoading(true);
    setError('');
    setResult(null);
    itineraryApi.getBudget(itinerary._id)
      .then((res) => setResult(res))
      .catch((err) => setError(err.message || 'Không thể tính toán ngân sách chuyến đi'))
      .finally(() => setLoading(false));
  }, [open, itinerary]);

  if (!open) return null;

  const breakdown = result?.breakdown;

  return (
    <>
      <div className="modal-backdrop fade show"></div>
      <div className="modal fade show d-block" tabIndex="-1" role="dialog" aria-modal="true">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content border-0 shadow">
            <div className="modal-header">
              <h5 className="modal-title fw-bold d-flex align-items-center gap-2">
                <i className="bi bi-calculator text-primary"></i>
                <span>Bảng tổng quan ngân sách chuyến đi</span>
              </h5>
              <button type="button" className="btn-close" onClick={onClose} aria-label="Đóng"></button>
            </div>

            <div className="modal-body p-4">
              {itinerary?.title && (
                <div className="mb-3 text-muted small">
                  Lịch trình: <strong className="text-dark">{itinerary.title}</strong>
                </div>
              )}

              {loading && (
                <div className="text-center py-4">
                  <span className="spinner-border spinner-border-sm text-primary" aria-hidden="true"></span>
                  <span className="ms-2 text-muted small">Đang tính toán...</span>
                </div>
              )}

              {error && <div className="alert alert-danger mb-0">{error}</div>}

              {breakdown && (
                <ul className="list-group">
                  <li className="list-group-item d-flex justify-content-between">
                    <span>Ngân sách dự kiến</span>
                    <strong>{formatMoney(breakdown.totalBudget)}</strong>
                  </li>
                  <li className="list-group-item d-flex justify-content-between">
                    <span>Chi phí hoạt động</span>
                    <strong>{formatMoney(breakdown.activityExpenses)}</strong>
                  </li>
                  <li className="list-group-item d-flex justify-content-between">
                    <span>Chi phí tour</span>
                    <strong>{formatMoney(breakdown.tourExpenses)}</strong>
                  </li>
                  <li className="list-group-item d-flex justify-content-between">
                    <span>Tổng chi phí</span>
                    <strong>{formatMoney(result.totalCost)}</strong>
                  </li>
                  <li className={`list-group-item d-flex justify-content-between ${breakdown.isOverBudget ? 'list-group-item-danger' : 'list-group-item-success'}`}>
                    <span>{breakdown.isOverBudget ? 'Vượt ngân sách' : 'Ngân sách còn lại'}</span>
                    <strong>{formatMoney(Math.abs(breakdown.remainingAmount))}</strong>
                  </li>
                </ul>
              )}
            </div>

            <div className="modal-footer bg-light">
              <button type="button" className="btn btn-outline-secondary" onClick={onClose}>Đóng</button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
