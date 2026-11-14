import { useState, useEffect } from 'react';
import { departureApi } from '../services/api';
import { useToast } from '../hooks/useToast';

const formatDate = (val) => {
  if (!val) return '—';
  const d = new Date(val);
  return `${d.toLocaleDateString('vi-VN')} (${d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })})`;
};

export default function CancelDepartureModal({ open, onClose, departure, tourTitle, onCancelled }) {
  const toast = useToast();
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (open) {
      setReason('');
      setErrorMsg('');
      setSubmitting(false);
    }
  }, [open, departure]);

  if (!open || !departure) return null;

  const diffMs = new Date(departure.departureDate).getTime() - Date.now();
  const hoursRemaining = Math.max(0, Math.floor(diffMs / (3600 * 1000)));
  const isBlockedBySLA = hoursRemaining < 72;

  const handleConfirmCancel = async (e) => {
    e.preventDefault();
    if (isBlockedBySLA) {
      toast.error('Không thể hủy đợt khởi hành do thời gian khởi hành còn dưới 72 giờ.');
      return;
    }

    const trimmedReason = reason.trim();
    if (!trimmedReason) {
      const msg = 'Vui lòng nhập lý do hủy lịch khởi hành để thông báo cho khách hàng.';
      setErrorMsg(msg);
      toast.error(msg);
      document.getElementById('cancel-departure-reason')?.focus();
      return;
    }

    if (trimmedReason.length > 500) {
      const msg = 'Lý do hủy không được vượt quá 500 ký tự.';
      setErrorMsg(msg);
      toast.error(msg);
      document.getElementById('cancel-departure-reason')?.focus();
      return;
    }

    setSubmitting(true);
    setErrorMsg('');

    try {
      const res = await departureApi.cancel(departure._id, { reason: trimmedReason });
      toast.success(res.message || 'Hủy lịch khởi hành thành công');
      if (onCancelled) onCancelled(res.data);
      onClose();
    } catch (err) {
      const msg = err.message || 'Không thể hủy lịch khởi hành';
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="modal-backdrop fade show"></div>
      <div className="modal fade show d-block" tabIndex="-1" role="dialog" aria-modal="true">
        <div className="modal-dialog modal-dialog-centered modal-lg modal-dialog-scrollable">
          <div className="modal-content border-0 shadow">
            <div className="modal-header bg-light border-bottom">
              <h5 className="modal-title fw-bold text-danger d-flex align-items-center gap-2">
                <i className="bi bi-x-circle-fill text-danger"></i>
                <span>Hủy đợt khởi hành tour</span>
              </h5>
              <button
                type="button"
                className="btn-close"
                onClick={onClose}
                disabled={submitting}
                aria-label="Đóng"
              ></button>
            </div>

            <form onSubmit={handleConfirmCancel} noValidate>
              <div className="modal-body p-4">
                {/* SLA 72h Alert */}
                {isBlockedBySLA ? (
                  <div className="alert alert-danger d-flex align-items-start gap-2 mb-3">
                    <i className="bi bi-exclamation-octagon-fill fs-5 mt-1 flex-shrink-0"></i>
                    <div>
                      <strong className="d-block mb-1">Không thể hủy đợt khởi hành</strong>
                      <span>
                        Thời điểm khởi hành chỉ còn lại khoảng <strong>{hoursRemaining} giờ</strong>. Theo chính sách của hệ thống,
                        nhà cung cấp chỉ được phép hủy lịch khởi hành trước giờ khởi hành ít nhất <strong>72 giờ</strong>.
                      </span>
                      <div className="mt-2 small text-muted">
                        Do không đủ thời gian sắp xếp lại kế hoạch di chuyển cho hành khách, vui lòng liên hệ bộ phận hỗ trợ
                        hoặc ban quản trị để giải quyết ngoại lệ.
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="alert alert-warning d-flex align-items-start gap-2 mb-3">
                    <i className="bi bi-shield-exclamation fs-5 mt-1 flex-shrink-0"></i>
                    <div>
                      <strong className="d-block mb-1">Chính sách hủy đợt khởi hành</strong>
                      <ul className="mb-0 ps-3 small">
                        <li>
                          Toàn bộ các đơn đặt tour trong đợt khởi hành này sẽ tự động chuyển sang trạng thái{' '}
                          <strong>Đã hủy</strong>.
                        </li>
                        <li>
                          Hệ thống tự động ghi nhận chính sách <strong>hoàn tiền 100%</strong> cho toàn bộ hành khách bị
                          ảnh hưởng.
                        </li>
                        <li>
                          Khách hàng sẽ nhận được thông báo trực tiếp qua hệ thống kèm theo lý do hủy bạn cung cấp bên dưới.
                        </li>
                        <li>
                          Thao tác hủy này <strong>không thể hoàn tác</strong>.
                        </li>
                      </ul>
                    </div>
                  </div>
                )}

                {/* Thông tin đợt khởi hành */}
                <div className="card bg-light border-0 mb-3">
                  <div className="card-body p-3">
                    <div className="row g-2 small">
                      <div className="col-sm-6">
                        <span className="text-muted d-block">Tour:</span>
                        <strong className="text-dark">{tourTitle || '—'}</strong>
                      </div>
                      <div className="col-sm-6">
                        <span className="text-muted d-block">Ngày khởi hành:</span>
                        <strong className="text-primary">{formatDate(departure.departureDate)}</strong>
                      </div>
                      <div className="col-sm-6">
                        <span className="text-muted d-block">Số chỗ đã cấu hình:</span>
                        <strong className="text-dark">{departure.availableSeats} chỗ</strong>
                      </div>
                      <div className="col-sm-6">
                        <span className="text-muted d-block">Thời gian còn lại:</span>
                        <strong className={isBlockedBySLA ? 'text-danger' : 'text-success'}>
                          {hoursRemaining} giờ trước khởi hành
                        </strong>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Lý do hủy */}
                <div className="mb-3">
                  <label htmlFor="cancel-departure-reason" className="form-label fw-semibold">
                    Lý do hủy đợt khởi hành <span className="text-danger">*</span>
                  </label>
                  <textarea
                    id="cancel-departure-reason"
                    rows="3"
                    className={`form-control ${errorMsg ? 'is-invalid' : ''}`}
                    placeholder="Vui lòng nhập lý do hủy lịch khởi hành (ví dụ: bão lũ thời tiết cực đoan, bảo trì kỹ thuật tuyến tham quan, phương tiện không đáp ứng...)"
                    value={reason}
                    onChange={(e) => {
                      setReason(e.target.value);
                      if (errorMsg) setErrorMsg('');
                    }}
                    maxLength={500}
                    disabled={submitting || isBlockedBySLA}
                  ></textarea>
                  <div className="d-flex justify-content-between align-items-center mt-1">
                    {errorMsg ? (
                      <div className="invalid-feedback d-block">{errorMsg}</div>
                    ) : (
                      <div className="form-text small">Lý do này sẽ được gửi trực tiếp đến hộp thư của hành khách.</div>
                    )}
                    <span className="text-muted small ms-auto">{reason.length}/500 ký tự</span>
                  </div>
                </div>
              </div>

              <div className="modal-footer bg-light border-top">
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={onClose}
                  disabled={submitting}
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  className="btn btn-danger d-flex align-items-center gap-1"
                  disabled={submitting || isBlockedBySLA || !reason.trim()}
                >
                  {submitting ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                      <span>Đang xử lý hủy...</span>
                    </>
                  ) : (
                    <>
                      <i className="bi bi-x-circle me-1"></i>
                      <span>Xác nhận hủy đợt khởi hành</span>
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

