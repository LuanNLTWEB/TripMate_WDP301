import { useEffect, useState } from 'react';
import { notificationApi } from '../services/api';
import { useToast } from '../hooks/useToast';
import CustomSelect from './CustomSelect';
import {
  NOTIFICATION_TARGET_OPTIONS,
  getNotificationTargetMeta
} from '../utils/notificationFormatters';

const formatEditingTargetSummary = (notification) => {
  if (!notification) return null;

  if (notification.targetType === 'specific_user') {
    if (notification.targetEmail) return notification.targetEmail;
    if (notification.recipient?.username && notification.recipient?.email) {
      return `${notification.recipient.username} (${notification.recipient.email})`;
    }
    return notification.recipient?.email || notification.recipient?.username || 'Người dùng cụ thể';
  }

  const targetMeta = getNotificationTargetMeta(notification.targetType);
  const countSuffix = notification.recipientCount > 0
    ? ` (${notification.recipientCount} người nhận)`
    : '';
  return `${targetMeta.shortLabel}${countSuffix}`;
};

export default function CreateNotificationModal({
  isOpen = true,
  onClose,
  onSuccess,
  notification = null
}) {
  const toast = useToast();
  const isEditing = Boolean(notification?._id);

  const [formData, setFormData] = useState(() => ({
    title: notification?.title || '',
    message: notification?.message || '',
    targetType: notification?.targetType || 'all',
    targetEmail: notification?.targetEmail || notification?.recipient?.email || ''
  }));
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !isSubmitting) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen) return null;

  const editingTargetMeta = getNotificationTargetMeta(notification?.targetType);
  const editingTargetSummary = formatEditingTargetSummary(notification);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const trimmedTitle = formData.title.trim();
    const trimmedMessage = formData.message.trim();
    const trimmedEmail = formData.targetEmail.trim();

    const fieldErrors = {};
    if (!trimmedTitle) {
      fieldErrors.title = 'Vui lòng nhập tiêu đề thông báo';
    }

    if (!trimmedMessage) {
      fieldErrors.message = 'Vui lòng nhập nội dung thông báo';
    }

    if (!isEditing && formData.targetType === 'specific_user') {
      if (!trimmedEmail) {
        fieldErrors.targetEmail = 'Vui lòng nhập email người nhận';
      } else if (!/^\S+@\S+\.\S+$/.test(trimmedEmail)) {
        fieldErrors.targetEmail = 'Email người nhận không hợp lệ';
      }
    }

    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      toast.error('Vui lòng kiểm tra và điền đầy đủ các thông tin được đánh dấu đỏ.');
      const firstField = Object.keys(fieldErrors)[0];
      if (firstField === 'title') document.getElementById('notif-title')?.focus();
      else if (firstField === 'targetEmail') document.getElementById('notif-email')?.focus();
      else if (firstField === 'message') document.getElementById('notif-message')?.focus();
      return;
    }

    setErrors({});
    setIsSubmitting(true);
    setError('');

    try {
      if (isEditing) {
        const response = await notificationApi.update(notification._id, {
          title: trimmedTitle,
          message: trimmedMessage
        });
        toast.success(response.message || 'Cập nhật thông báo thành công');
      } else {
        const payload = {
          title: trimmedTitle,
          message: trimmedMessage,
          targetType: formData.targetType,
          targetEmail: formData.targetType === 'specific_user' ? trimmedEmail : undefined
        };
        const response = await notificationApi.create(payload);
        toast.success(response.message || 'Đã gửi thông báo thành công');
      }

      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      const fallbackMsg = isEditing ? 'Không thể cập nhật thông báo' : 'Không thể tạo thông báo';
      const msg = err.message || fallbackMsg;
      setError(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="modal-backdrop fade show" style={{ zIndex: 1050 }}></div>
      <div
        className="modal d-block"
        tabIndex="-1"
        role="dialog"
        aria-modal="true"
        style={{ zIndex: 1055 }}
        onClick={(e) => {
          if (e.target === e.currentTarget && !isSubmitting) {
            onClose();
          }
        }}
      >
        <div className="modal-dialog modal-dialog-centered modal-lg" role="document">
          <div className="modal-content shadow border-0 rounded-4">
            <form onSubmit={handleSubmit} noValidate>
              <div className="modal-header border-bottom px-4 pt-4 pb-3">
                <div className="d-flex align-items-center gap-2">
                  <div className="bg-primary bg-opacity-10 text-primary p-2 rounded-circle">
                    <i className={`bi ${isEditing ? 'bi-pencil-square' : 'bi-bell-fill'} fs-5`}></i>
                  </div>
                  <div>
                    <h5 className="modal-title fw-bold mb-0">
                      {isEditing ? 'Chỉnh sửa thông báo' : 'Tạo thông báo mới'}
                    </h5>
                    <div className="text-muted small">
                      {isEditing
                        ? 'Cập nhật tiêu đề và nội dung thông báo hệ thống'
                        : 'Gửi thông báo tới hộp thư người dùng hệ thống'}
                    </div>
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
                <div className="mb-3">
                  <label htmlFor="notif-title" className="form-label small fw-semibold">
                    Tiêu đề thông báo <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    id="notif-title"
                    name="title"
                    className={`form-control ${errors.title ? 'is-invalid' : ''}`}
                    placeholder="VD: Nhắc nhở cập nhật thông tin cá nhân..."
                    value={formData.title}
                    onChange={handleChange}
                    maxLength={150}
                    disabled={isSubmitting}
                    required
                  />
                  {errors.title && <div className="invalid-feedback">{errors.title}</div>}
                  <div className="form-text text-end small">{formData.title.length}/150 ký tự</div>
                </div>

                {isEditing ? (
                  editingTargetSummary && (
                    <div className="mb-3">
                      <label className="form-label small fw-semibold text-muted">
                        Đối tượng nhận thông báo
                      </label>
                      <div className="form-control bg-light text-muted small">
                        <i className={`bi ${editingTargetMeta.icon} me-1`}></i>
                        {editingTargetSummary}
                      </div>
                    </div>
                  )
                ) : (
                  <>
                    <div className="mb-3">
                      <label htmlFor="notif-target" className="form-label small fw-semibold">
                        Đối tượng nhận thông báo <span className="text-danger">*</span>
                      </label>
                      <CustomSelect
                        id="notif-target"
                        name="targetType"
                        value={formData.targetType}
                        options={NOTIFICATION_TARGET_OPTIONS.map((option) => ({
                          value: option.value,
                          label: option.createLabel
                        }))}
                        onChange={(e, val) => {
                          const targetVal = val !== undefined ? val : e.target.value;
                          setFormData((prev) => ({ ...prev, targetType: targetVal }));
                        }}
                        disabled={isSubmitting}
                      />
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
                          className={`form-control ${errors.targetEmail ? 'is-invalid' : ''}`}
                          placeholder="name@example.com"
                          value={formData.targetEmail}
                          onChange={handleChange}
                          disabled={isSubmitting}
                          required
                        />
                        {errors.targetEmail && <div className="invalid-feedback">{errors.targetEmail}</div>}
                      </div>
                    )}
                  </>
                )}

                <div className="mb-3">
                  <label htmlFor="notif-message" className="form-label small fw-semibold">
                    Nội dung thông báo <span className="text-danger">*</span>
                  </label>
                  <textarea
                    id="notif-message"
                    name="message"
                    className={`form-control ${errors.message ? 'is-invalid' : ''}`}
                    rows="4"
                    placeholder="Nhập nội dung thông báo gửi đến người dùng..."
                    value={formData.message}
                    onChange={handleChange}
                    maxLength={500}
                    disabled={isSubmitting}
                    required
                  ></textarea>
                  {errors.message && <div className="invalid-feedback">{errors.message}</div>}
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
                      {isEditing ? 'Đang lưu...' : 'Đang gửi...'}
                    </span>
                  ) : (
                    isEditing ? 'Lưu thay đổi' : 'Gửi thông báo'
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
