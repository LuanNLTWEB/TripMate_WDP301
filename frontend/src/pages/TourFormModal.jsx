import { useEffect, useState } from 'react';
import CustomSelect from '../components/CustomSelect';
import { tourApi, tourCategoryApi, uploadApi } from '../services/api';
import { useToast } from '../hooks/useToast';

const createFormData = (tour) => ({
  title: tour?.title || '',
  categoryId: tour?.categoryId?._id || tour?.categoryId || '',
  departureLocation: tour?.departureLocation || '',
  destinationLocation: tour?.destinationLocation || '',
  location: tour?.location || tour?.destinationLocation || '',
  duration: tour?.duration || '',
  price: String(tour?.price ?? ''),
  availableSeats: String(tour?.availableSeats ?? ''),
  imageUrl: Array.isArray(tour?.images) ? tour.images[0] || '' : '',
  description: tour?.description || ''
});

const validateForm = (formData, imageFile, mode) => {
  if (!formData.title.trim()) return 'Vui lòng nhập tên tour.';
  if (!formData.duration.trim()) return 'Vui lòng nhập thời lượng chuyến đi.';
  if (!formData.departureLocation.trim()) return 'Vui lòng nhập điểm khởi hành.';
  if (!formData.destinationLocation.trim()) return 'Vui lòng nhập điểm đến.';

  const price = Number(formData.price);
  if (formData.price === '' || Number.isNaN(price) || price < 0) {
    return 'Giá tour phải là một số hợp lệ lớn hơn hoặc bằng 0.';
  }

  const availableSeats = Number(formData.availableSeats);
  const minimumSeats = mode === 'create' ? 1 : 0;
  if (!Number.isInteger(availableSeats) || availableSeats < minimumSeats) {
    return mode === 'create'
      ? 'Vui lòng nhập số lượng chỗ hợp lệ (lớn hơn 0).'
      : 'Số lượng chỗ phải là số nguyên không âm.';
  }

  const descriptionLength = formData.description.trim().length;
  if (descriptionLength < 10 || descriptionLength > 5000) {
    return 'Giới thiệu chuyến đi phải từ 10 đến 5000 ký tự.';
  }
  if (!imageFile && !formData.imageUrl.trim()) {
    return 'Vui lòng tải lên hoặc dán URL hình ảnh đại diện của tour.';
  }
  if (!imageFile && !/^https?:\/\//i.test(formData.imageUrl.trim())) {
    return 'URL hình ảnh phải bắt đầu bằng http:// hoặc https://.';
  }
  return '';
};

export default function TourFormModal({ mode = 'create', tour = null, onClose, onSaved }) {
  const toast = useToast();
  const isUpdate = mode === 'update';
  const [categories, setCategories] = useState([]);
  const [formData, setFormData] = useState(() => createFormData(tour));
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [imageLoadError, setImageLoadError] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const additionalImages = Array.isArray(tour?.images) ? tour.images.slice(1) : [];

  useEffect(() => {
    let active = true;
    tourCategoryApi.getAll()
      .then((response) => {
        if (active) setCategories(response.data || []);
      })
      .catch(() => {
        if (active) setError('Không thể tải danh mục tour.');
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => () => {
    if (imagePreview.startsWith('blob:')) URL.revokeObjectURL(imagePreview);
  }, [imagePreview]);

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => {
      const next = { ...current, [name]: value };
      if (
        name === 'destinationLocation' &&
        (!current.location || current.location === current.destinationLocation)
      ) {
        next.location = value;
      }
      return next;
    });
    setError('');
  };

  const handlePriceChange = (event) => {
    const price = event.target.value.replace(/\D/g, '');
    setFormData((current) => ({ ...current, price }));
    setError('');
  };

  const handleImageFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Vui lòng chọn đúng định dạng hình ảnh.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Kích thước ảnh không được vượt quá 5MB.');
      return;
    }

    if (imagePreview.startsWith('blob:')) URL.revokeObjectURL(imagePreview);
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setImageLoadError(false);
    setError('');
  };

  const handleImageUrlChange = (event) => {
    if (imagePreview.startsWith('blob:')) URL.revokeObjectURL(imagePreview);
    setImageFile(null);
    setImagePreview('');
    setImageLoadError(false);
    setFormData((current) => ({ ...current, imageUrl: event.target.value }));
    setError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isSubmitting) return;

    const validationMessage = validateForm(formData, imageFile, mode);
    if (validationMessage) {
      setError(validationMessage);
      return;
    }

    setIsSubmitting(true);
    setError('');
    try {
      let primaryImage = formData.imageUrl.trim();
      if (imageFile) {
        const uploadData = new FormData();
        uploadData.append('image', imageFile);
        const uploadResponse = await uploadApi.uploadImage(uploadData);
        primaryImage = uploadResponse.url;
      }

      const images = [
        primaryImage,
        ...additionalImages.filter((image) => image !== primaryImage)
      ];
      const payload = {
        title: formData.title.trim(),
        categoryId: formData.categoryId || null,
        departureLocation: formData.departureLocation.trim(),
        destinationLocation: formData.destinationLocation.trim(),
        location: (formData.location || formData.destinationLocation).trim(),
        duration: formData.duration.trim(),
        price: Number(formData.price),
        availableSeats: Number(formData.availableSeats),
        description: formData.description.trim(),
        images
      };

      const response = isUpdate
        ? await tourApi.update(tour._id, payload)
        : await tourApi.create(payload);
      toast.success(response.message || (isUpdate
        ? 'Cập nhật tour thành công.'
        : 'Tạo tour mới thành công.'));
      if (onSaved) await onSaved(response.data);
      setIsSubmitting(false);
      onClose();
    } catch (requestError) {
      setError(requestError.message || (isUpdate
        ? 'Không thể cập nhật tour. Vui lòng thử lại.'
        : 'Không thể tạo tour. Vui lòng thử lại.'));
      setIsSubmitting(false);
    }
  };

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
          if (event.target === event.currentTarget && !isSubmitting) onClose();
        }}
      >
        <div className="modal-dialog modal-dialog-centered modal-xl modal-dialog-scrollable">
          <div
            className="modal-content border-0 shadow-lg rounded-4 overflow-hidden"
            style={{ maxHeight: 'calc(100dvh - 2rem)' }}
          >
            <div className="modal-header bg-light-subtle px-4 py-3 border-bottom flex-shrink-0 d-flex align-items-center justify-content-between">
              <div>
                <h2 className="modal-title h5 fw-bold text-dark mb-0 d-flex align-items-center gap-2">
                  <i className={`bi ${isUpdate ? 'bi-pencil-square' : 'bi-plus-circle-fill'} text-primary`}></i>
                  <span>{isUpdate ? 'Cập nhật thông tin tour' : 'Tạo Tour Du Lịch Mới'}</span>
                </h2>
                <p className="small text-muted mb-0 mt-0.5">
                  {isUpdate
                    ? `Điều chỉnh thông tin công khai của ${tour.title}.`
                    : 'Điền thông tin chi tiết để gửi nhân viên kiểm duyệt trước khi mở bán tour.'}
                </p>
              </div>
              <button
                type="button"
                className="btn-close"
                onClick={onClose}
                disabled={isSubmitting}
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
                  <div className="alert alert-danger alert-dismissible fade show mb-4 rounded-3" role="alert">
                    <i className="bi bi-exclamation-triangle-fill me-2"></i>
                    {error}
                    <button type="button" className="btn-close" onClick={() => setError('')} aria-label="Đóng"></button>
                  </div>
                )}

                <div className="row g-4">
                  <div className="col-12 col-lg-8">
                    <div className="card border rounded-4 p-4 shadow-none bg-light-subtle mb-0">
                      <h6 className="fw-bold text-dark mb-3 d-flex align-items-center gap-2">
                        <i className="bi bi-info-circle text-primary"></i>
                        <span>Thông tin cơ bản</span>
                      </h6>

                      <div className="mb-3">
                        <label className="form-label small fw-semibold text-secondary" htmlFor={`${mode}-tour-title`}>
                          Tên Tour Du Lịch <span className="text-danger">*</span>
                        </label>
                        <input
                          id={`${mode}-tour-title`}
                          type="text"
                          name="title"
                          maxLength={100}
                          className="form-control rounded-3"
                          placeholder="Ví dụ: Nghỉ dưỡng Đảo Ngọc Phú Quốc 4N3Đ - Chuẩn 5 Sao"
                          value={formData.title}
                          onChange={handleInputChange}
                          required
                        />
                      </div>

                      <div className="row g-3 mb-3">
                        <div className="col-md-6">
                          <label className="form-label small fw-semibold text-secondary">Danh mục phân loại</label>
                          <CustomSelect
                            id={`${mode}-tour-category`}
                            value={formData.categoryId}
                            onChange={(event) => {
                              setFormData((current) => ({ ...current, categoryId: event.target.value }));
                              setError('');
                            }}
                            options={[
                              { value: '', label: 'Chọn danh mục phù hợp' },
                              ...categories.map((category) => ({ value: category._id, label: category.name }))
                            ]}
                            triggerStyle={{ height: '42px', borderRadius: '10px' }}
                          />
                        </div>
                        <div className="col-md-6">
                          <label className="form-label small fw-semibold text-secondary" htmlFor={`${mode}-tour-duration`}>
                            Thời lượng chuyến đi <span className="text-danger">*</span>
                          </label>
                          <input
                            id={`${mode}-tour-duration`}
                            type="text"
                            name="duration"
                            maxLength={100}
                            className="form-control rounded-3"
                            placeholder="Ví dụ: 3 ngày 2 đêm, 4 ngày 3 đêm..."
                            value={formData.duration}
                            onChange={handleInputChange}
                            required
                          />
                        </div>
                      </div>

                      <div className="row g-3 mb-3">
                        <div className="col-md-6">
                          <label className="form-label small fw-semibold text-secondary" htmlFor={`${mode}-tour-departure`}>
                            Điểm khởi hành <span className="text-danger">*</span>
                          </label>
                          <input
                            id={`${mode}-tour-departure`}
                            type="text"
                            name="departureLocation"
                            maxLength={150}
                            className="form-control rounded-3"
                            placeholder="Ví dụ: Hà Nội, TP. Hồ Chí Minh, Đà Nẵng..."
                            value={formData.departureLocation}
                            onChange={handleInputChange}
                            required
                          />
                        </div>
                        <div className="col-md-6">
                          <label className="form-label small fw-semibold text-secondary" htmlFor={`${mode}-tour-destination`}>
                            Điểm đến chính <span className="text-danger">*</span>
                          </label>
                          <input
                            id={`${mode}-tour-destination`}
                            type="text"
                            name="destinationLocation"
                            maxLength={150}
                            className="form-control rounded-3"
                            placeholder="Ví dụ: Phú Quốc, Sapa, Nha Trang, Hạ Long..."
                            value={formData.destinationLocation}
                            onChange={handleInputChange}
                            required
                          />
                        </div>
                      </div>

                      <div className="row g-3 mb-3">
                        <div className="col-md-6">
                          <label className="form-label small fw-semibold text-secondary" htmlFor={`${mode}-tour-price`}>
                            Giá vé trọn gói (VNĐ) <span className="text-danger">*</span>
                          </label>
                          <div className="input-group">
                            <input
                              id={`${mode}-tour-price`}
                              type="text"
                              name="price"
                              className="form-control rounded-start-3"
                              placeholder="Ví dụ: 4500000"
                              value={formData.price ? Number(formData.price).toLocaleString('vi-VN') : ''}
                              onChange={handlePriceChange}
                              required
                            />
                            <span className="input-group-text rounded-end-3 bg-white text-muted">đ / khách</span>
                          </div>
                        </div>
                        <div className="col-md-6">
                          <label className="form-label small fw-semibold text-secondary" htmlFor={`${mode}-tour-seats`}>
                            Số lượng chỗ tối đa <span className="text-danger">*</span>
                          </label>
                          <div className="input-group">
                            <input
                              id={`${mode}-tour-seats`}
                              type="number"
                              name="availableSeats"
                              min={isUpdate ? 0 : 1}
                              className="form-control rounded-start-3"
                              placeholder="Ví dụ: 25"
                              value={formData.availableSeats}
                              onChange={handleInputChange}
                              required
                            />
                            <span className="input-group-text rounded-end-3 bg-white text-muted">chỗ</span>
                          </div>
                        </div>
                      </div>

                      <div className="mb-0">
                        <label className="form-label small fw-semibold text-secondary" htmlFor={`${mode}-tour-description`}>
                          Giới thiệu tổng quan chuyến đi <span className="text-danger">*</span>
                        </label>
                        <textarea
                          id={`${mode}-tour-description`}
                          name="description"
                          rows={4}
                          maxLength={5000}
                          className="form-control rounded-3 overflow-y-auto"
                          style={{ height: 104, resize: 'none' }}
                          placeholder="Mô tả tóm tắt điểm nổi bật, trải nghiệm đáng nhớ và nét đặc sắc của chuyến đi này..."
                          value={formData.description}
                          onChange={handleInputChange}
                          required
                        ></textarea>
                        <div className="form-text text-end">{formData.description.length}/5000</div>
                      </div>
                    </div>
                  </div>

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
                            alt="Ảnh đại diện tour"
                            className="w-100 h-100 object-fit-cover d-block"
                            onError={() => setImageLoadError(true)}
                          />
                        ) : (
                          <div className="text-center p-3">
                            <i className={`bi ${imageLoadError ? 'bi-image' : 'bi-cloud-arrow-up'} fs-2 text-primary opacity-50 mb-1 d-block`}></i>
                            <span className="small text-muted">
                              {imageLoadError ? 'Không thể tải ảnh preview' : 'Chưa có ảnh preview'}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="mb-3">
                        <label className="form-label small fw-semibold text-secondary" htmlFor={`${mode}-tour-image-file`}>
                          Tải ảnh từ máy tính (tối đa 5MB)
                        </label>
                        <input
                          id={`${mode}-tour-image-file`}
                          type="file"
                          accept="image/*"
                          className="form-control form-control-sm rounded-3"
                          onChange={handleImageFileChange}
                        />
                      </div>

                      <div>
                        <label className="form-label small fw-semibold text-secondary" htmlFor={`${mode}-tour-image-url`}>
                          Hoặc dán trực tiếp URL ảnh:
                        </label>
                        <input
                          id={`${mode}-tour-image-url`}
                          type="url"
                          name="imageUrl"
                          className="form-control form-control-sm rounded-3"
                          placeholder="https://images.unsplash.com/..."
                          value={formData.imageUrl}
                          onChange={handleImageUrlChange}
                        />
                        {isUpdate && additionalImages.length > 0 && (
                          <div className="form-text">
                            {additionalImages.length} ảnh bổ sung hiện có sẽ được giữ nguyên.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="modal-footer bg-light-subtle px-4 py-3 border-top flex-shrink-0 d-flex justify-content-end align-items-center gap-2">
                <button type="button" className="btn btn-outline-secondary" onClick={onClose} disabled={isSubmitting}>
                  Hủy bỏ
                </button>
                <button type="submit" className="btn btn-primary d-inline-flex align-items-center gap-2" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <span className="spinner-border spinner-border-sm" aria-hidden="true"></span>
                      <span>{isUpdate ? 'Đang cập nhật...' : 'Đang tạo tour...'}</span>
                    </>
                  ) : (
                    <>
                      <i className="bi bi-check2-circle"></i>
                      <span>{isUpdate ? 'Lưu thay đổi' : 'Lưu & Gửi kiểm duyệt'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
      <div className="modal-backdrop fade show" style={{ zIndex: 1050 }}></div>
    </>
  );
}
