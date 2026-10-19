import { useState } from 'react';
import CustomSelect from './CustomSelect';
import { ANNOUNCEMENT_AUDIENCE_OPTIONS } from '../utils/announcementFormatters';

const EMPTY_FORM = {
  title: '',
  content: '',
  audience: 'all',
  isActive: true
};

export default function AnnouncementFormModal({ announcement = null, saving, requestError, onClose, onSubmit }) {
  const [form, setForm] = useState(() => announcement ? {
    title: announcement.title || '',
    content: announcement.content || '',
    audience: announcement.audience || 'all',
    isActive: announcement.isActive !== false
  } : EMPTY_FORM);
  const [validationError, setValidationError] = useState('');
  const isEditing = Boolean(announcement?._id);

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((current) => ({ ...current, [name]: type === 'checkbox' ? checked : value }));
    setValidationError('');
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const title = form.title.trim();
    const content = form.content.trim();
    if (!title) {
      setValidationError('Vui lòng nhập tiêu đề thông báo.');
      return;
    }
    if (!content) {
      setValidationError('Vui lòng nhập nội dung thông báo.');
      return;
    }
    onSubmit({ ...form, title, content });
  };

  const error = validationError || requestError;

  return (
    <>
      <button
        type="button"
        className="modal-backdrop fade show border-0"
        aria-label="Đóng biểu mẫu thông báo"
        disabled={saving}
        onClick={onClose}
      ></button>
      <div className="modal fade show d-block" tabIndex="-1" role="dialog" aria-modal="true">
        <div className="modal-dialog modal-dialog-centered modal-lg modal-dialog-scrollable">
          <div className="modal-content border-0 shadow-lg">
            <div className="modal-header bg-light">
              <div>
                <span className="small text-uppercase text-primary fw-bold">System Announcements</span>
                <h2 className="modal-title h5 fw-bold mb-0 mt-1">
                  {isEditing ? 'Cập nhật thông báo' : 'Tạo thông báo mới'}
                </h2>
              </div>
              <button type="button" className="btn-close" disabled={saving} onClick={onClose} aria-label="Đóng"></button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="modal-body p-4">
                {error && <div className="alert alert-danger py-2"><i className="bi bi-exclamation-triangle-fill me-2"></i>{error}</div>}

                <div className="mb-3">
                  <label className="form-label fw-semibold" htmlFor="announcement-title">
                    Tiêu đề <span className="text-danger">*</span>
                  </label>
                  <input
                    id="announcement-title"
                    name="title"
                    type="text"
                    className="form-control"
                    value={form.title}
                    maxLength={150}
                    disabled={saving}
                    autoFocus
                    onChange={handleChange}
                  />
                  <div className="form-text text-end">{form.title.length}/150</div>
                </div>

                <div className="mb-3">
                  <label className="form-label fw-semibold" htmlFor="announcement-content">
                    Nội dung <span className="text-danger">*</span>
                  </label>
                  <textarea
                    id="announcement-content"
                    name="content"
                    className="form-control"
                    rows="8"
                    value={form.content}
                    maxLength={5000}
                    disabled={saving}
                    placeholder="Nhập nội dung cần gửi tới người dùng TripMate..."
                    onChange={handleChange}
                  ></textarea>
                  <div className="form-text d-flex justify-content-between gap-3">
                    <span>Nội dung giữ nguyên định dạng xuống dòng khi hiển thị.</span>
                    <span className="text-nowrap">{form.content.length}/5000</span>
                  </div>
                </div>

                <div className="row g-3 align-items-end">
                  <div className="col-md-7">
                    <label className="form-label fw-semibold" htmlFor="announcement-audience">Đối tượng nhận</label>
                    <CustomSelect
                      id="announcement-audience"
                      name="audience"
                      value={form.audience}
                      options={ANNOUNCEMENT_AUDIENCE_OPTIONS}
                      disabled={saving}
                      onChange={handleChange}
                      triggerStyle={{ height: '42px' }}
                    />
                  </div>
                  <div className="col-md-5">
                    <div className="form-check form-switch border rounded-3 p-3 ps-5 bg-light">
                      <input
                        id="announcement-active"
                        name="isActive"
                        type="checkbox"
                        className="form-check-input"
                        checked={form.isActive}
                        disabled={saving}
                        onChange={handleChange}
                      />
                      <label className="form-check-label fw-semibold" htmlFor="announcement-active">Phát hành ngay</label>
                    </div>
                  </div>
                </div>
              </div>

              <div className="modal-footer bg-light">
                <button type="button" className="btn btn-outline-secondary" disabled={saving} onClick={onClose}>Hủy</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? (
                    <><span className="spinner-border spinner-border-sm me-2"></span>Đang lưu...</>
                  ) : (
                    <><i className="bi bi-send-check me-2"></i>{isEditing ? 'Lưu thay đổi' : 'Tạo thông báo'}</>
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
