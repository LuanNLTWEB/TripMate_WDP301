import { useState, useEffect } from 'react';

/**
 * CategoryFormModal - Standardized Create & Update Modal for Categories
 * Reused across Destination Categories and Tour Categories.
 * Styled matching the system design (clean '+' icon, subtitle, structured card).
 */
export default function CategoryFormModal({
  isOpen,
  category = null,
  type = 'destination',
  saving = false,
  onClose,
  onSubmit
}) {
  const isEditing = Boolean(category?._id);
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (category) {
        setFormData({
          name: category.name || '',
          description: category.description || ''
        });
      } else {
        setFormData({ name: '', description: '' });
      }
      setError('');
    }
  }, [isOpen, category]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !saving) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, saving, onClose]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const name = formData.name.trim();
    const description = formData.description.trim();

    if (!name) {
      setError('Vui lòng nhập tên danh mục.');
      return;
    }
    if (name.length > 100) {
      setError('Tên danh mục không được vượt quá 100 ký tự.');
      return;
    }

    onSubmit({ name, description });
  };

  const isTour = type === 'tour';
  const title = isEditing
    ? (isTour ? 'Cập nhật danh mục tour' : 'Cập nhật danh mục điểm đến')
    : (isTour ? 'Tạo Danh Mục Tour Mới' : 'Tạo Danh Mục Điểm Đến Mới');
  const subtitle = isEditing
    ? `Điều chỉnh thông tin danh mục ${category?.name || ''}.`
    : (isTour
      ? 'Điền thông tin chi tiết để tạo mới danh mục phân loại tour.'
      : 'Điền thông tin chi tiết để tạo mới danh mục phân loại điểm đến.');

  const placeholderName = isTour
    ? 'Ví dụ: Du lịch sinh thái, Nghỉ dưỡng, Khám phá mạo hiểm...'
    : 'Ví dụ: Bãi biển, Di tích lịch sử, Văn hóa ẩm thực...';
  const placeholderDesc = isTour
    ? 'Mô tả tóm tắt nét đặc trưng của nhóm tour thuộc danh mục này...'
    : 'Mô tả tóm tắt đặc điểm nổi bật của các điểm đến thuộc danh mục này...';

  return (
    <>
      <div
        className="modal fade show d-block"
        tabIndex="-1"
        role="dialog"
        aria-modal="true"
        style={{ backgroundColor: 'rgba(15, 23, 42, 0.6)', zIndex: 1055 }}
        onClick={(event) => {
          if (event.target === event.currentTarget && !saving) onClose();
        }}
      >
        <div className="modal-dialog modal-dialog-centered modal-lg modal-dialog-scrollable">
          <div
            className="modal-content border-0 shadow-lg rounded-4 overflow-hidden"
            style={{ maxHeight: 'calc(100dvh - 2rem)' }}
          >
            {/* Header: Clean + icon and subtitle */}
            <div className="modal-header bg-light-subtle px-4 py-3 border-bottom flex-shrink-0 d-flex align-items-center justify-content-between">
              <div>
                <h2 className="modal-title h5 fw-bold text-dark mb-0 d-flex align-items-center gap-2">
                  <i className={`bi ${isEditing ? 'bi-pencil-square' : 'bi-plus-circle-fill'} text-primary`}></i>
                  <span>{title}</span>
                </h2>
                <p className="small text-muted mb-0 mt-0.5">{subtitle}</p>
              </div>
              <button
                type="button"
                className="btn-close"
                onClick={onClose}
                disabled={saving}
                aria-label="Đóng"
              ></button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="d-flex flex-column flex-grow-1 overflow-hidden"
              style={{ minHeight: 0 }}
              noValidate
            >
              <div className="modal-body p-4 overflow-y-auto" style={{ minHeight: 0 }}>
                {error && (
                  <div className="alert alert-danger alert-dismissible fade show mb-4 rounded-3 d-flex align-items-center gap-2" role="alert">
                    <i className="bi bi-exclamation-triangle-fill"></i>
                    <span>{error}</span>
                    <button type="button" className="btn-close ms-auto" onClick={() => setError('')} aria-label="Đóng"></button>
                  </div>
                )}

                <div className="card border rounded-4 p-4 shadow-none bg-light-subtle mb-0">
                  <h6 className="fw-bold text-dark mb-3 d-flex align-items-center gap-2">
                    <i className="bi bi-info-circle text-primary"></i>
                    <span>Thông tin danh mục</span>
                  </h6>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold text-secondary" htmlFor="category-modal-name">
                      Tên danh mục <span className="text-danger">*</span>
                    </label>
                    <input
                      id="category-modal-name"
                      name="name"
                      className="form-control rounded-3"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder={placeholderName}
                      maxLength={100}
                      disabled={saving}
                      autoFocus
                      required
                    />
                    <div className="d-flex justify-content-between form-text">
                      <span>Tối đa 100 ký tự</span>
                      <span>{formData.name.length}/100</span>
                    </div>
                  </div>

                  <div className="mb-0">
                    <label className="form-label small fw-semibold text-secondary" htmlFor="category-modal-desc">
                      Mô tả giới thiệu (tùy chọn)
                    </label>
                    <textarea
                      id="category-modal-desc"
                      name="description"
                      className="form-control rounded-3"
                      rows={4}
                      value={formData.description}
                      onChange={handleChange}
                      placeholder={placeholderDesc}
                      maxLength={500}
                      disabled={saving}
                    ></textarea>
                    <div className="d-flex justify-content-between form-text">
                      <span>Giới thiệu ngắn gọn để phân loại chính xác hơn</span>
                      <span>{formData.description.length}/500</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="modal-footer bg-light-subtle px-4 py-3 border-top flex-shrink-0 d-flex justify-content-end align-items-center gap-2">
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={onClose}
                  disabled={saving}
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="btn btn-primary d-inline-flex align-items-center gap-2"
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <span className="spinner-border spinner-border-sm" aria-hidden="true"></span>
                      <span>{isEditing ? 'Đang cập nhật...' : 'Đang tạo danh mục...'}</span>
                    </>
                  ) : (
                    <>
                      <i className="bi bi-check2-circle"></i>
                      <span>{isEditing ? 'Lưu thay đổi' : 'Lưu danh mục'}</span>
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
