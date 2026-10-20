import { useState, useEffect } from 'react';
import CustomSelect from './CustomSelect';
import { uploadApi } from '../services/api';

/**
 * DestinationFormModal - Standardized Large Create & Update Modal for Destinations
 * Uses the exact design system layout as TourFormModal (modal-xl, 2-column cards, clean '+' header).
 */
export default function DestinationFormModal({
  isOpen,
  destination = null,
  categories = [],
  saving = false,
  onClose,
  onSubmit
}) {
  const isEditing = Boolean(destination?._id);

  const [formData, setFormData] = useState({
    name: '',
    location: '',
    description: '',
    categoryId: '',
    imageUrl: '',
    isPopular: false
  });

  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [imageLoadError, setImageLoadError] = useState(false);
  const [error, setError] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (destination) {
        const initialImage = Array.isArray(destination.images) && destination.images.length > 0
          ? destination.images[0]
          : (destination.imageUrl || '');

        setFormData({
          name: destination.name || '',
          location: destination.location || '',
          description: destination.description || '',
          categoryId: destination.categoryId?._id || destination.categoryId || '',
          imageUrl: initialImage,
          isPopular: Boolean(destination.isPopular)
        });
        setImagePreview(initialImage);
      } else {
        setFormData({
          name: '',
          location: '',
          description: '',
          categoryId: '',
          imageUrl: '',
          isPopular: false
        });
        setImagePreview('');
      }
      setImageFile(null);
      setImageLoadError(false);
      setError('');
      setIsUploading(false);
    }
  }, [isOpen, destination]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !saving && !isUploading) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, saving, isUploading, onClose]);

  useEffect(() => {
    return () => {
      if (imagePreview && imagePreview.startsWith('blob:')) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    setError('');
  };

  const handleImageFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Vui lòng chọn đúng tệp định dạng hình ảnh (PNG, JPG, WEBP).');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Dung lượng hình ảnh không được vượt quá 5MB.');
      return;
    }

    if (imagePreview.startsWith('blob:')) {
      URL.revokeObjectURL(imagePreview);
    }

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setImageLoadError(false);
    setError('');
  };

  const handleImageUrlChange = (e) => {
    const value = e.target.value;
    if (imagePreview.startsWith('blob:')) {
      URL.revokeObjectURL(imagePreview);
    }
    setImageFile(null);
    setImagePreview(value);
    setImageLoadError(false);
    setFormData((prev) => ({ ...prev, imageUrl: value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving || isUploading) return;

    const name = formData.name.trim();
    const location = formData.location.trim();
    const description = formData.description.trim();

    if (!name) {
      setError('Vui lòng nhập tên điểm đến.');
      return;
    }
    if (name.length > 100) {
      setError('Tên điểm đến không được vượt quá 100 ký tự.');
      return;
    }
    if (!location) {
      setError('Vui lòng nhập vị trí hoặc địa danh của điểm đến.');
      return;
    }
    if (!description || description.length < 10) {
      setError('Mô tả điểm đến phải có ít nhất 10 ký tự.');
      return;
    }

    let finalImageUrl = formData.imageUrl.trim();

    if (imageFile) {
      try {
        setIsUploading(true);
        const uploadData = new FormData();
        uploadData.append('image', imageFile);
        const uploadResponse = await uploadApi.uploadImage(uploadData);
        finalImageUrl = uploadResponse.url;
      } catch (uploadError) {
        setIsUploading(false);
        setError(uploadError.message || 'Không thể tải lên hình ảnh. Vui lòng thử lại hoặc sử dụng URL trực tiếp.');
        return;
      } finally {
        setIsUploading(false);
      }
    }

    if (!finalImageUrl) {
      setError('Vui lòng tải lên ảnh hoặc dán URL hình ảnh cho điểm đến.');
      return;
    }

    if (!finalImageUrl.startsWith('http://') && !finalImageUrl.startsWith('https://')) {
      setError('URL hình ảnh phải bắt đầu bằng http:// hoặc https://.');
      return;
    }

    onSubmit({
      name,
      location,
      description,
      categoryId: formData.categoryId || null,
      images: [finalImageUrl],
      isPopular: formData.isPopular
    });
  };

  const isBusy = saving || isUploading;
  const previewSource = imagePreview || formData.imageUrl.trim();

  return (
    <>
      <div
        className="modal fade show d-block"
        tabIndex="-1"
        role="dialog"
        aria-modal="true"
        style={{ backgroundColor: 'rgba(15, 23, 42, 0.6)', zIndex: 1055 }}
        onClick={(event) => {
          if (event.target === event.currentTarget && !isBusy) onClose();
        }}
      >
        <div className="modal-dialog modal-dialog-centered modal-xl modal-dialog-scrollable">
          <div
            className="modal-content border-0 shadow-lg rounded-4 overflow-hidden"
            style={{ maxHeight: 'calc(100dvh - 2rem)' }}
          >
            {/* Header: Exact clean style matching screenshot */}
            <div className="modal-header bg-light-subtle px-4 py-3 border-bottom flex-shrink-0 d-flex align-items-center justify-content-between">
              <div>
                <h2 className="modal-title h5 fw-bold text-dark mb-0 d-flex align-items-center gap-2">
                  <i className={`bi ${isEditing ? 'bi-pencil-square' : 'bi-plus-circle-fill'} text-primary`}></i>
                  <span>{isEditing ? 'Cập nhật Điểm Đến Du Lịch' : 'Tạo Điểm Đến Du Lịch Mới'}</span>
                </h2>
                <p className="small text-muted mb-0 mt-0.5">
                  {isEditing
                    ? `Điều chỉnh thông tin chi tiết của điểm đến ${destination?.name || ''}.`
                    : 'Điền thông tin chi tiết để lưu và quản lý điểm đến trước khi hiển thị trên hệ thống.'}
                </p>
              </div>
              <button
                type="button"
                className="btn-close"
                onClick={onClose}
                disabled={isBusy}
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

                <div className="row g-4">
                  {/* Left Column: Basic Information Card */}
                  <div className="col-12 col-lg-8">
                    <div className="card border rounded-4 p-4 shadow-none bg-light-subtle mb-0">
                      <h6 className="fw-bold text-dark mb-3 d-flex align-items-center gap-2">
                        <i className="bi bi-info-circle text-primary"></i>
                        <span>Thông tin cơ bản</span>
                      </h6>

                      <div className="mb-3">
                        <label className="form-label small fw-semibold text-secondary" htmlFor="destination-modal-name">
                          Tên Điểm Đến Du Lịch <span className="text-danger">*</span>
                        </label>
                        <input
                          id="destination-modal-name"
                          name="name"
                          className="form-control rounded-3"
                          value={formData.name}
                          onChange={handleChange}
                          placeholder="Ví dụ: Phố cổ Hội An, Vịnh Hạ Long, Đảo Phú Quốc..."
                          maxLength={100}
                          disabled={isBusy}
                          autoFocus
                          required
                        />
                      </div>

                      <div className="row g-3 mb-3">
                        <div className="col-12 col-md-6">
                          <label className="form-label small fw-semibold text-secondary" htmlFor="destination-modal-category">
                            Danh mục phân loại
                          </label>
                          <CustomSelect
                            id="destination-modal-category"
                            name="categoryId"
                            value={formData.categoryId}
                            onChange={handleChange}
                            disabled={isBusy}
                            placeholder="Chọn danh mục phù hợp"
                            options={[
                              { value: '', label: '— Không chọn danh mục —' },
                              ...categories.map((cat) => ({ value: cat._id, label: cat.name }))
                            ]}
                          />
                        </div>

                        <div className="col-12 col-md-6">
                          <label className="form-label small fw-semibold text-secondary" htmlFor="destination-modal-location">
                            Vị trí / Địa danh <span className="text-danger">*</span>
                          </label>
                          <input
                            id="destination-modal-location"
                            name="location"
                            className="form-control rounded-3"
                            value={formData.location}
                            onChange={handleChange}
                            placeholder="Ví dụ: TP. Hội An, Quảng Nam"
                            maxLength={150}
                            disabled={isBusy}
                            required
                          />
                        </div>
                      </div>

                      <div className="mb-3">
                        <div className="form-check p-3 ps-5 border rounded-3 bg-white">
                          <input
                            id="destination-modal-popular"
                            name="isPopular"
                            type="checkbox"
                            className="form-check-input"
                            checked={formData.isPopular}
                            onChange={handleChange}
                            disabled={isBusy}
                          />
                          <label className="form-check-label fw-semibold text-dark small" htmlFor="destination-modal-popular">
                            Đánh dấu là điểm đến phổ biến (hiển thị nổi bật trên hệ thống)
                          </label>
                        </div>
                      </div>

                      <div className="mb-0">
                        <label className="form-label small fw-semibold text-secondary" htmlFor="destination-modal-desc">
                          Giới thiệu tổng quan điểm đến <span className="text-danger">*</span>
                        </label>
                        <textarea
                          id="destination-modal-desc"
                          name="description"
                          rows={5}
                          maxLength={5000}
                          className="form-control rounded-3"
                          style={{ resize: 'none' }}
                          placeholder="Mô tả tóm tắt nét đẹp, các hoạt động trải nghiệm đáng nhớ và nét đặc sắc của điểm đến này..."
                          value={formData.description}
                          onChange={handleChange}
                          disabled={isBusy}
                          required
                        ></textarea>
                        <div className="form-text text-end">{formData.description.length}/5000</div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Representative Image Card */}
                  <div className="col-12 col-lg-4">
                    <div className="card border rounded-4 p-4 shadow-none bg-light-subtle mb-0">
                      <h6 className="fw-bold text-dark mb-3 d-flex align-items-center gap-2">
                        <i className="bi bi-image text-primary"></i>
                        <span>Hình ảnh đại diện</span>
                      </h6>

                      <div
                        className="border rounded-4 overflow-hidden mb-3 bg-white d-flex align-items-center justify-content-center text-muted position-relative shadow-sm"
                        style={{ height: 180 }}
                      >
                        {previewSource && !imageLoadError ? (
                          <img
                            src={previewSource}
                            alt="Ảnh đại diện điểm đến"
                            className="w-100 h-100 object-fit-cover d-block"
                            onError={() => setImageLoadError(true)}
                          />
                        ) : (
                          <div className="text-center p-3">
                            <i className="bi bi-cloud-arrow-up fs-2 text-primary opacity-50 mb-1 d-block"></i>
                            <span className="small text-muted">
                              {imageLoadError ? 'Không thể tải ảnh preview' : 'Chưa có ảnh preview'}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="mb-3">
                        <label className="form-label small fw-semibold text-secondary" htmlFor="destination-modal-file">
                          Tải ảnh từ máy tính (tối đa 5MB)
                        </label>
                        <input
                          id="destination-modal-file"
                          type="file"
                          accept="image/*"
                          className="form-control form-control-sm rounded-3"
                          onChange={handleImageFileChange}
                          disabled={isBusy}
                        />
                      </div>

                      <div>
                        <label className="form-label small fw-semibold text-secondary" htmlFor="destination-modal-url">
                          Hoặc dán trực tiếp URL ảnh:
                        </label>
                        <input
                          id="destination-modal-url"
                          type="url"
                          name="imageUrl"
                          className="form-control form-control-sm rounded-3"
                          placeholder="https://images.unsplash.com/..."
                          value={formData.imageUrl}
                          onChange={handleImageUrlChange}
                          disabled={isBusy}
                        />
                      </div>
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
                  disabled={isBusy}
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="btn btn-primary d-inline-flex align-items-center gap-2"
                  disabled={isBusy}
                >
                  {isBusy ? (
                    <>
                      <span className="spinner-border spinner-border-sm" aria-hidden="true"></span>
                      <span>{isUploading ? 'Đang tải ảnh...' : (isEditing ? 'Đang cập nhật...' : 'Đang tạo điểm đến...')}</span>
                    </>
                  ) : (
                    <>
                      <i className="bi bi-check2-circle"></i>
                      <span>{isEditing ? 'Lưu thay đổi' : 'Lưu điểm đến'}</span>
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
