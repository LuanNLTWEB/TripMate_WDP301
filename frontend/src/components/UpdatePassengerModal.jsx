import { useState, useEffect } from 'react';
import { bookingApi } from '../services/api';
import { useToast } from '../hooks/useToast';

// START UC-152 Update Booking Passenger Info
/**
 * Modal to update passenger & contact details for an active booking.
 */
const UpdatePassengerModal = ({ booking, tourTitle, onClose, onUpdated }) => {
  const toast = useToast();
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    email: '',
    address: '',
    note: ''
  });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const MAX_UPDATES = 3;
  const currentUpdateCount = booking?.passengerUpdateCount || 0;
  const remainingUpdates = Math.max(0, MAX_UPDATES - currentUpdateCount);
  const isLimitReached = currentUpdateCount >= MAX_UPDATES;

  useEffect(() => {
    if (booking) {
      setFormData({
        fullName: booking.fullName || '',
        phone: booking.phone || '',
        email: booking.email || '',
        address: booking.address || '',
        note: booking.note || ''
      });
      setError('');
    }
  }, [booking]);

  if (!booking) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (error) setError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isLimitReached) {
      setError(`Đơn đặt tour đã đạt giới hạn tối đa ${MAX_UPDATES} lần chỉnh sửa thông tin.`);
      return;
    }

    const fullName = formData.fullName.trim();
    const phone = formData.phone.trim();
    const email = formData.email.trim();
    const address = formData.address.trim();
    const note = formData.note.trim();

    if (!fullName || fullName.length < 2) {
      setError('Họ và tên phải có ít nhất 2 ký tự.');
      return;
    }
    if (!phone || !/^(0)[35789][0-9]{8}$/.test(phone)) {
      setError('Số điện thoại không hợp lệ (10 số, bắt đầu bằng 03, 05, 07, 08, 09).');
      return;
    }
    if (!email || !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.(com|vn|edu|edu\.vn)$/i.test(email)) {
      setError('Email không hợp lệ.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const response = await bookingApi.updatePassengerInfo(booking._id, {
        fullName,
        phone,
        email,
        address,
        note
      });
      toast.success(response.message || 'Cập nhật thông tin hành khách thành công.');
      onUpdated(response.data);
      onClose();
    } catch (requestError) {
      setError(requestError.message || 'Không thể cập nhật thông tin hành khách.');
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
        aria-labelledby="update-passenger-modal-title"
        style={{
          backgroundColor: 'rgba(15, 23, 42, 0.7)',
          backdropFilter: 'blur(4px)',
          zIndex: 1060
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget && !isSubmitting) onClose();
        }}
      >
        <div className="modal-dialog modal-dialog-centered modal-lg">
          <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
            {/* Header */}
            <div className="modal-header bg-light px-4 py-3 border-bottom d-flex align-items-center justify-content-between">
              <div>
                <div className="d-flex align-items-center gap-2 mb-1">
                  <span className={`badge ${isLimitReached ? 'bg-danger-subtle text-danger border border-danger-subtle' : 'bg-primary-subtle text-primary border border-primary-subtle'} rounded-pill px-2.5 py-1`}>
                    {isLimitReached ? 'Đã hết lượt sửa (3/3)' : `Lượt sửa: ${currentUpdateCount}/${MAX_UPDATES}`}
                  </span>
                  <span className="text-muted small">Đơn #{booking._id?.slice(-8).toUpperCase()}</span>
                </div>
                <h5 id="update-passenger-modal-title" className="modal-title fw-bold text-dark mb-0">
                  Chỉnh sửa thông tin hành khách
                </h5>
              </div>
              <button
                type="button"
                className="btn-close"
                onClick={onClose}
                disabled={isSubmitting}
                aria-label="Đóng"
              />
            </div>

            {/* Form Body */}
            <form onSubmit={handleSubmit}>
              <div className="modal-body p-4">
                {error && (
                  <div className="alert alert-danger d-flex align-items-center gap-2 mb-3" role="alert">
                    <i className="bi bi-exclamation-triangle-fill flex-shrink-0" />
                    <div>{error}</div>
                  </div>
                )}

                {isLimitReached ? (
                  <div className="alert alert-warning d-flex align-items-center gap-2 mb-4" role="alert">
                    <i className="bi bi-exclamation-triangle-fill flex-shrink-0 fs-5" />
                    <div className="small">
                      Đơn đặt tour này đã đạt giới hạn tối đa <strong>{MAX_UPDATES}/{MAX_UPDATES}</strong> lần chỉnh sửa thông tin hành khách. Để bảo đảm danh sách hành khách đoàn chính xác, bạn không thể chỉnh sửa thêm trực tiếp. Vui lòng liên hệ nhà cung cấp tour nếu cần hỗ trợ.
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-light rounded-3 mb-4 d-flex align-items-center gap-3">
                    <i className="bi bi-info-circle-fill text-primary fs-4" />
                    <div className="small text-muted">
                      Thông tin liên hệ được sử dụng để xác nhận đón khách cho tour <strong>{tourTitle}</strong>. Giới hạn tối đa {MAX_UPDATES} lần sửa (Bạn còn lại <strong>{remainingUpdates}</strong> lần).
                    </div>
                  </div>
                )}

                <div className="row g-3">
                  <div className="col-12 col-md-6">
                    <label className="form-label fw-semibold small text-dark">
                      Họ và tên người liên hệ <span className="text-danger">*</span>
                    </label>
                    <div className="input-group">
                      <span className="input-group-text bg-light border-end-0">
                        <i className="bi bi-person text-muted" />
                      </span>
                      <input
                        type="text"
                        name="fullName"
                        className="form-control border-start-0 ps-1"
                        placeholder="Nhập họ và tên đầy đủ"
                        value={formData.fullName}
                        onChange={handleChange}
                        maxLength={100}
                        required
                        disabled={isSubmitting || isLimitReached}
                      />
                    </div>
                  </div>

                  <div className="col-12 col-md-6">
                    <label className="form-label fw-semibold small text-dark">
                      Số điện thoại <span className="text-danger">*</span>
                    </label>
                    <div className="input-group">
                      <span className="input-group-text bg-light border-end-0">
                        <i className="bi bi-telephone text-muted" />
                      </span>
                      <input
                        type="tel"
                        name="phone"
                        className="form-control border-start-0 ps-1"
                        placeholder="Ví dụ: 0912345678"
                        value={formData.phone}
                        onChange={handleChange}
                        required
                        disabled={isSubmitting || isLimitReached}
                      />
                    </div>
                  </div>

                  <div className="col-12">
                    <label className="form-label fw-semibold small text-dark">
                      Email nhận vé & thông báo <span className="text-danger">*</span>
                    </label>
                    <div className="input-group">
                      <span className="input-group-text bg-light border-end-0">
                        <i className="bi bi-envelope text-muted" />
                      </span>
                      <input
                        type="email"
                        name="email"
                        className="form-control border-start-0 ps-1"
                        placeholder="example@gmail.com"
                        value={formData.email}
                        onChange={handleChange}
                        required
                        disabled={isSubmitting || isLimitReached}
                      />
                    </div>
                  </div>

                  <div className="col-12">
                    <label className="form-label fw-semibold small text-dark">
                      Địa chỉ liên hệ
                    </label>
                    <input
                      type="text"
                      name="address"
                      className="form-control"
                      placeholder="Số nhà, đường, phường/xã, quận/huyện..."
                      value={formData.address}
                      onChange={handleChange}
                      maxLength={200}
                      disabled={isSubmitting || isLimitReached}
                    />
                  </div>

                  <div className="col-12">
                    <label className="form-label fw-semibold small text-dark">
                      Ghi chú / Yêu cầu đặc biệt cho nhà cung cấp
                    </label>
                    <textarea
                      name="note"
                      className="form-control"
                      rows="3"
                      placeholder="Ví dụ: Đón tại điểm hẹn, có người lớn tuổi, ăn chay..."
                      value={formData.note}
                      onChange={handleChange}
                      maxLength={500}
                      disabled={isSubmitting || isLimitReached}
                    />
                    <div className="form-text text-end text-muted small">
                      {formData.note.length}/500 ký tự
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="modal-footer bg-light px-4 py-3 border-top d-flex justify-content-end gap-2">
                <button
                  type="button"
                  className="btn btn-secondary rounded-pill px-4"
                  onClick={onClose}
                  disabled={isSubmitting}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="btn btn-primary rounded-pill px-4 fw-semibold d-inline-flex align-items-center gap-2"
                  disabled={isSubmitting || isLimitReached}
                >
                  {isSubmitting ? (
                    <>
                      <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                      <span>Đang lưu...</span>
                    </>
                  ) : (
                    <>
                      <i className="bi bi-check2-circle" />
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
};

export default UpdatePassengerModal;

