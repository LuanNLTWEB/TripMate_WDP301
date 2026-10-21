import { useState } from 'react';
import { notificationApi } from '../services/api';
import { useToast } from '../hooks/useToast';

export default function CreateNotificationModal({ isOpen, onClose, onSuccess }) {
  const toast = useToast();
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    targetType: 'all',
    targetEmail: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      setError('Vui lòng nhập tiêu đề thông báo');
      return;
    }

    if (!formData.message.trim()) {
      setError('Vui lòng nhập nội dung thông báo');
      return;
    }

    if (formData.targetType === 'specific_user' && !formData.targetEmail.trim()) {
      setError('Vui lòng nhập email người nhận');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const payload = {
        title: formData.title.trim(),
        message: formData.message.trim(),
        targetType: formData.targetType,
        targetEmail: formData.targetType === 'specific_user' ? formData.targetEmail.trim() : undefined
      };

      const response = await notificationApi.create(payload);
      toast.success(response.message || 'Đã gửi thông báo thành công');
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      setError(err.message || 'Không thể tạo thông báo');
      toast.error(err.message || 'Không thể tạo thông báo');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="modal-backdrop fade show" style={{ zIndex: 1050 }}></div>
      <div className="modal d-block" tabIndex="-1" role="dialog" aria-modal="true" style={{ zIndex: 1055 }}>
        <div className="modal-dialog modal-dialog-centered modal-lg" role="document">
          <div className="modal-content shadow border-0 rounded-4">
            <form onSubmit={handleSubmit}>
              <div className="modal-header border-bottom px-4 pt-4 pb-3">
                <div className="d-flex align-items-center gap-2">
                  <div className="bg-primary bg-opacity-10 text-primary p-2 rounded-circle">
                    <i className="bi bi-bell-fill fs-5"></i>
                  </div>
                  <div>
                    <h5 className="modal-title fw-bold mb-0">Tạo thông báo mới</h5>
                    <div className="text-muted small">Gửi thông báo tới hộp thư người dùng hệ thống</div>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn-close"
                  onClick={onClose}
                  disabled={isSubmitting}
                  aria-label="Đóng"
                ></button>
              </div>

              <div className="modal-body p-4">
                {error && (
                  <div className="alert alert-danger py-2 px-3 small d-flex align-items-center gap-2 mb-3">
                    <i className="bi bi-exclamation-circle-fill flex-shrink-0"></i>
                    <div>{error}</div>
                  </div>
                )}

                <div className="mb-3">
                  <label htmlFor="notif-title" className="form-label small fw-semibold">
                    Tiêu đề thông báo <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    id="notif-title"
                    name="title"
                    className="form-control"
                    placeholder="VD: Nhắc nhở cập nhật thông tin cá nhân..."
                    value={formData.title}
                    onChange={handleChange}
                    maxLength={150}
                    disabled={isSubmitting}
                    required
                  />
                  <div className="form-text text-end small">{formData.title.length}/150 ký tự</div>
                </div>

                <div className="mb-3">
                  <label htmlFor="notif-target" className="form-label small fw-semibold">
                    Đối tượng nhận thông báo <span className="text-danger">*</span>
                  </label>
                  <select
                    id="notif-target"
                    name="targetType"
                    className="form-select"
                    value={formData.targetType}
                    onChange={handleChange}
                    disabled={isSubmitting}
                  >
                    <option value="all">Tất cả người dùng (Khách hàng, Nhà cung cấp, Nhân viên)</option>
                    <option value="customer">Chỉ Khách hàng (Customer)</option>
                    <option value="tourProvider">Chỉ Nhà cung cấp tour (Tour Provider)</option>
                    <option value="staff">Chỉ Nhân viên (Staff)</option>
                    <option value="specific_user">Gửi cho 1 người dùng cụ thể (nhập email)</option>
                  </select>
                </div>

                {formData.targetType === 'specific_user' && (
                  <div className="mb-3">
                    <label htmlFor="notif-email" className="form-label small fw-semibold">
                      Email người nhận <span className="text-danger">*</span>
                    </label>
                    <input
                      type="email"
                      id="notif-email"
                      name="targetEmail"
                      className="form-control"
                      placeholder="name@example.com"
                      value={formData.targetEmail}
                      onChange={handleChange}
                      disabled={isSubmitting}
                      required
                    />
                  </div>
                )}

                <div className="mb-3">
                  <label htmlFor="notif-message" className="form-label small fw-semibold">
                    Nội dung thông báo <span className="text-danger">*</span>
                  </label>
                  <textarea
                    id="notif-message"
                    name="message"
                    className="form-control"
                    rows="4"
                    placeholder="Nhập nội dung thông báo gửi đến người dùng..."
                    value={formData.message}
                    onChange={handleChange}
                    maxLength={500}
                    disabled={isSubmitting}
                    required
                  ></textarea>
                  <div className="form-text text-end small">{formData.message.length}/500 ký tự</div>
                </div>
              </div>

              <div className="modal-footer border-top px-4 py-3 bg-light rounded-bottom-4">
                <button
                  type="button"
                  className="btn btn-outline-secondary px-3"
                  onClick={onClose}
                  disabled={isSubmitting}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="btn btn-primary px-4 fw-medium"
                  disabled={isSubmitting || !formData.title.trim() || !formData.message.trim()}
                >
                  {isSubmitting ? (
                    <span className="d-flex align-items-center gap-2">
                      <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                      Đang gửi...
                    </span>
                  ) : (
                    'Gửi thông báo'
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
