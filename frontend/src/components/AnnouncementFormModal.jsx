import { useState } from 'react';
import CustomSelect from './CustomSelect';
import { ANNOUNCEMENT_AUDIENCE_OPTIONS } from '../utils/announcementFormatters';

const EMPTY_FORM = {
  title: '',
  content: '',
  audience: 'all',
  isActive: true
};

export default function AnnouncementFormModal({
  announcement = null,
  saving,
  requestError,
  onClose,
  onSubmit
}) {
  const [form, setForm] = useState(() =>
    announcement
      ? {
          title: announcement.title || '',
          content: announcement.content || '',
          audience: announcement.audience || 'all',
          isActive: announcement.isActive !== false
        }
      : EMPTY_FORM
  );
  const [validationError, setValidationError] = useState('');
  const isEditing = Boolean(announcement?._id);

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value
    }));
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
      <div
        className="modal-backdrop fade show"
        style={{ zIndex: 1050 }}
        onClick={() => !saving && onClose()}
      ></div>
      <div
        className="modal fade show d-block"
        tabIndex="-1"
        role="dialog"
        aria-modal="true"
        style={{ zIndex: 1055 }}
        onClick={(e) => {
          if (e.target === e.currentTarget && !saving) {
            onClose();
          }
        }}
      >
        <div className="modal-dialog modal-dialog-centered modal-lg">
          <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '16px', overflow: 'visible' }}>
            <div
              className="modal-header border-bottom py-3 px-4 bg-light"
              style={{ borderTopLeftRadius: '16px', borderTopRightRadius: '16px' }}
            >
              <div className="d-flex align-items-center gap-2">
                <div
                  className={`d-inline-flex align-items-center justify-content-center rounded-3 ${
                    isEditing ? 'bg-primary text-white' : 'bg-success text-white'
                  }`}
                  style={{ width: '38px', height: '38px' }}
                >
                  <i className={`bi ${isEditing ? 'bi-pencil-square' : 'bi-megaphone'} fs-5`}></i>
                </div>
                <div>
                  <span className="small text-uppercase text-primary fw-bold" style={{ letterSpacing: '0.08em' }}>
                    System Announcements
                  </span>
                  <h2 className="modal-title h5 fw-bold mb-0 text-dark">
                    {isEditing ? 'Cập nhật thông báo hệ thống' : 'Tạo thông báo hệ thống mới'}
                  </h2>
                </div>
              </div>
              <button
                type="button"
                className="btn-close"
                disabled={saving}
                onClick={onClose}
                aria-label="Đóng"
              ></button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="modal-body p-4" style={{ overflow: 'visible' }}>
                {error && (
                  <div className="alert alert-danger py-2 d-flex align-items-center mb-3" role="alert">
                    <i className="bi bi-exclamation-triangle-fill me-2 flex-shrink-0"></i>
                    <div>{error}</div>
                  </div>
                )}

                <div className="mb-3">
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <label className="form-label fw-semibold text-dark mb-0" htmlFor="announcement-title">
                      Tiêu đề thông báo <span className="text-danger">*</span>
                    </label>
                    <span
                      className={`small ${
                        form.title.length > 140 ? 'text-warning fw-bold' : 'text-muted'
                      }`}
                    >
                      {form.title.length} / 150 ký tự
                    </span>
                  </div>
                  <input
                    id="announcement-title"
                    name="title"
                    type="text"
                    className="form-control"
                    placeholder="VD: Thông báo bảo trì máy chủ ngày 25/10/2026..."
                    value={form.title}
                    maxLength={150}
                    disabled={saving}
                    autoFocus
                    onChange={handleChange}
                  />
                </div>

                <div className="mb-3">
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <label className="form-label fw-semibold text-dark mb-0" htmlFor="announcement-content">
                      Nội dung thông báo <span className="text-danger">*</span>
                    </label>
                    <span
                      className={`small ${
                        form.content.length > 4900 ? 'text-warning fw-bold' : 'text-muted'
                      }`}
                    >
                      {form.content.length} / 5000 ký tự
                    </span>
                  </div>
                  <textarea
                    id="announcement-content"
                    name="content"
                    className="form-control"
                    rows="5"
                    value={form.content}
                    maxLength={5000}
                    disabled={saving}
                    placeholder="Nhập nội dung chi tiết cần thông báo tới người dùng TripMate..."
                    onChange={handleChange}
                    style={{ lineHeight: 1.6 }}
                  ></textarea>
                  <div className="form-text text-muted mt-1">
                    <i className="bi bi-info-circle me-1"></i>
                    Nội dung giữ nguyên các khoảng cách và định dạng xuống dòng khi hiển thị cho người đọc.
                  </div>
                </div>

                <div className="row g-3 align-items-center pt-2">
                  <div className="col-md-7">
                    <label className="form-label fw-semibold text-dark mb-1" htmlFor="announcement-audience">
                      Đối tượng nhận thông báo
                    </label>
                    <CustomSelect
                      id="announcement-audience"
                      name="audience"
                      value={form.audience}
                      options={ANNOUNCEMENT_AUDIENCE_OPTIONS}
                      disabled={saving}
                      onChange={handleChange}
                      triggerStyle={{ height: '44px', borderRadius: '10px' }}
                    />
                  </div>

                  <div className="col-md-5">
                    <div className="border rounded-3 p-3 bg-light d-flex align-items-center justify-content-between">
                      <div>
                        <div className="fw-semibold text-dark small">Phát hành ngay</div>
                        <div className="text-muted" style={{ fontSize: '0.76rem' }}>
                          {form.isActive ? 'Công khai cho người dùng' : 'Lưu lại dưới dạng bản nháp'}
                        </div>
                      </div>
                      <div className="form-check form-switch mb-0 fs-5">
                        <input
                          id="announcement-active"
                          name="isActive"
                          type="checkbox"
                          className="form-check-input"
                          checked={form.isActive}
                          disabled={saving}
                          onChange={handleChange}
                          role="switch"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div
                className="modal-footer bg-light border-top px-4 py-3"
                style={{ borderBottomLeftRadius: '16px', borderBottomRightRadius: '16px' }}
              >
                <button
                  type="button"
                  className="btn btn-outline-secondary px-3"
                  disabled={saving}
                  onClick={onClose}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="btn btn-primary px-4 d-inline-flex align-items-center gap-2"
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                      <span>Đang lưu...</span>
                    </>
                  ) : (
                    <>
                      <i className={`bi ${isEditing ? 'bi-check-lg' : 'bi-send-check'}`}></i>
                      <span>{isEditing ? 'Lưu thay đổi' : 'Tạo thông báo'}</span>
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
