import { useState } from 'react';
import { reviewApi } from '../services/api';
import { useToast } from '../hooks/useToast';

const REPORT_REASONS = [
  'Nội dung không phù hợp',
  'Thông tin sai lệch',
  'Spam hoặc quảng cáo',
  'Ngôn ngữ thô tục',
  'Khác'
];

const ReportReviewModal = ({ review, onClose, onReported }) => {
  const toast = useToast();
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reason) return;

    setIsSubmitting(true);
    try {
      const response = await reviewApi.report(review._id, { reason, details });
      toast.success(response.message || 'Báo cáo vi phạm đã ghi nhận');
      if (onReported) onReported(review._id);
      onClose();
    } catch (err) {
      toast.error(err.message || 'Không thể gửi báo cáo vi phạm');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="modal fade show d-block" tabIndex="-1" role="dialog" aria-modal="true">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content border-0 shadow">
            <div className="modal-header">
              <h2 className="modal-title h5 fw-bold">
                <i className="bi bi-flag me-2"></i>
                Báo cáo vi phạm
              </h2>
              <button
                type="button"
                className="btn-close"
                onClick={onClose}
                disabled={isSubmitting}
                aria-label="Đóng"
              ></button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <p className="text-muted small mb-3">
                  Chọn lý do báo cáo đánh giá này. Chúng tôi sẽ xem xét và xử lý trong thời gian sớm nhất.
                </p>

                <div className="mb-3">
                  <label className="form-label fw-semibold">Lý do báo cáo <span className="text-danger">*</span></label>
                  <div className="d-flex flex-column gap-2">
                    {REPORT_REASONS.map((r) => (
                      <div key={r} className="form-check">
                        <input
                          className="form-check-input"
                          type="radio"
                          id={`reason-${r}`}
                          name="reportReason"
                          value={r}
                          checked={reason === r}
                          onChange={() => setReason(r)}
                          disabled={isSubmitting}
                        />
                        <label className="form-check-label" htmlFor={`reason-${r}`}>{r}</label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mb-1">
                  <label htmlFor="reportDetails" className="form-label fw-semibold">Chi tiết (tuỳ chọn)</label>
                  <textarea
                    id="reportDetails"
                    className="form-control"
                    rows={3}
                    maxLength={500}
                    placeholder="Mô tả thêm về vi phạm..."
                    value={details}
                    onChange={(e) => setDetails(e.target.value)}
                    disabled={isSubmitting}
                  />
                  <div className="text-end text-muted small mt-1">{details.length}/500</div>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={onClose}
                  disabled={isSubmitting}
                >
                  Huỷ
                </button>
                <button
                  type="submit"
                  className="btn btn-danger"
                  disabled={!reason || isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>
                      Đang gửi...
                    </>
                  ) : (
                    'Gửi báo cáo'
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

export default ReportReviewModal;
