import { useEffect, useState } from 'react';
import { tourApi, tourCategoryApi, uploadApi } from '../services/api';
import { useToast } from '../hooks/useToast';

const createInitialForm = (tour) => ({
  title: tour?.title || '',
  categoryId: tour?.categoryId?._id || tour?.categoryId || '',
  departureLocation: tour?.departureLocation || '',
  destinationLocation: tour?.destinationLocation || '',
  location: tour?.location || tour?.destinationLocation || '',
  duration: tour?.duration || '',
  price: String(tour?.price ?? ''),
  availableSeats: String(tour?.availableSeats ?? ''),
  description: tour?.description || '',
  images: Array.isArray(tour?.images) ? tour.images : []
});

const validateForm = (form) => {
  const errors = {};
  if (!form.title.trim()) errors.title = 'Vui lòng nhập tên tour.';
  if (!form.departureLocation.trim()) errors.departureLocation = 'Vui lòng nhập điểm khởi hành.';
  if (!form.destinationLocation.trim()) errors.destinationLocation = 'Vui lòng nhập điểm đến.';
  if (!form.location.trim()) errors.location = 'Vui lòng nhập địa điểm.';
  if (!form.duration.trim()) errors.duration = 'Vui lòng nhập thời lượng tour.';
  if (form.description.trim().length < 10) errors.description = 'Giới thiệu tour phải có ít nhất 10 ký tự.';
  if (form.price === '' || Number.isNaN(Number(form.price)) || Number(form.price) < 0) {
    errors.price = 'Giá tour phải là số không âm.';
  }
  if (!Number.isInteger(Number(form.availableSeats)) || Number(form.availableSeats) < 0) {
    errors.availableSeats = 'Số chỗ phải là số nguyên không âm.';
  }
  if (form.images.length === 0) errors.images = 'Tour phải có ít nhất một hình ảnh.';
  if (form.images.length > 10) errors.images = 'Tour chỉ được có tối đa 10 hình ảnh.';
  if (form.images.some((image) => !/^https?:\/\//i.test(image))) {
    errors.images = 'Mỗi hình ảnh phải là URL http hoặc https hợp lệ.';
  }
  return errors;
};

export default function EditTourModal({ tour, onClose, onUpdated }) {
  const toast = useToast();
  const [form, setForm] = useState(() => createInitialForm(tour));
  const [categories, setCategories] = useState([]);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadPreview, setUploadPreview] = useState('');
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    tourCategoryApi.getAll()
      .then((response) => {
        if (active) setCategories(response.data || []);
      })
      .catch(() => {
        if (active) toast.error('Không thể tải danh mục tour.');
      });
    return () => {
      active = false;
    };
  }, [toast]);

  useEffect(() => () => {
    if (uploadPreview.startsWith('blob:')) URL.revokeObjectURL(uploadPreview);
  }, [uploadPreview]);

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    if (errors[field]) {
      setErrors((current) => ({ ...current, [field]: '' }));
    }
  };

  const addImageUrl = () => {
    const normalized = newImageUrl.trim();
    if (!normalized) return;
    if (!/^https?:\/\//i.test(normalized)) {
      setErrors((current) => ({ ...current, images: 'URL hình ảnh phải bắt đầu bằng http:// hoặc https://.' }));
      return;
    }
    if (form.images.includes(normalized)) {
      setErrors((current) => ({ ...current, images: 'Hình ảnh này đã có trong danh sách.' }));
      return;
    }
    if (form.images.length >= 10) {
      setErrors((current) => ({ ...current, images: 'Tour chỉ được có tối đa 10 hình ảnh.' }));
      return;
    }
    updateField('images', [...form.images, normalized]);
    setNewImageUrl('');
  };

  const removeImage = (index) => {
    updateField('images', form.images.filter((_, imageIndex) => imageIndex !== index));
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setErrors((current) => ({ ...current, images: 'Vui lòng chọn đúng định dạng hình ảnh.' }));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setErrors((current) => ({ ...current, images: 'Kích thước ảnh không được vượt quá 5MB.' }));
      return;
    }
    if (uploadPreview.startsWith('blob:')) URL.revokeObjectURL(uploadPreview);
    setUploadFile(file);
    setUploadPreview(URL.createObjectURL(file));
    setErrors((current) => ({ ...current, images: '' }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting) return;

    let images = [...form.images];
    const nextErrors = validateForm({
      ...form,
      images: uploadFile ? [...images, 'https://pending-upload.tripmate/image'] : images
    });
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setSubmitting(true);
    try {
      if (uploadFile) {
        const uploadData = new FormData();
        uploadData.append('image', uploadFile);
        const uploadResponse = await uploadApi.uploadImage(uploadData);
        images = [...images, uploadResponse.url];
      }

      const response = await tourApi.update(tour._id, {
        title: form.title.trim(),
        categoryId: form.categoryId || null,
        departureLocation: form.departureLocation.trim(),
        destinationLocation: form.destinationLocation.trim(),
        location: form.location.trim(),
        duration: form.duration.trim(),
        price: Number(form.price),
        availableSeats: Number(form.availableSeats),
        description: form.description.trim(),
        images
      });
      toast.success(response.message || 'Cập nhật tour thành công.');
      if (onUpdated) onUpdated(response.data);
      onClose();
    } catch (error) {
      setErrors((current) => ({
        ...current,
        submit: error.message || 'Không thể cập nhật tour.'
      }));
    } finally {
      setSubmitting(false);
    }
  };

  const requiresReview = ['active', 'needs_revision', 'rejected'].includes(tour.status);

  return (
    <>
      <div className="modal-backdrop fade show"></div>
      <div className="modal fade show d-block" tabIndex="-1" role="dialog" aria-modal="true">
        <div className="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
          <div className="modal-content border-0 shadow-lg">
            <div className="modal-header bg-light">
              <div>
                <span className="badge text-bg-primary rounded-pill small mb-1">Update Tour</span>
                <h5 className="modal-title fw-bold">Cập nhật thông tin tour</h5>
                <small className="text-muted">{tour.title}</small>
              </div>
              <button type="button" className="btn-close" onClick={onClose} disabled={submitting} aria-label="Đóng"></button>
            </div>

            <form onSubmit={handleSubmit} noValidate>
              <div className="modal-body p-4">
                {requiresReview && (
                  <div className="alert alert-warning d-flex gap-2 align-items-start">
                    <i className="bi bi-info-circle-fill mt-1"></i>
                    <div>
                      <strong>Tour sẽ được gửi lại để kiểm duyệt.</strong>
                      <div className="small">Các thay đổi thông tin công khai cần được nhân viên duyệt trước khi tour hoạt động trở lại.</div>
                    </div>
                  </div>
                )}
                {tour.status === 'suspended' && (
                  <div className="alert alert-danger small">
                    <i className="bi bi-slash-circle me-2"></i>
                    Việc cập nhật không tự động kích hoạt tour đang bị tạm ngưng.
                  </div>
                )}
                {errors.submit && <div className="alert alert-danger">{errors.submit}</div>}

                <div className="row g-4">
                  <div className="col-lg-8">
                    <div className="row g-3">
                      <div className="col-12">
                        <label htmlFor="edit-tour-title" className="form-label fw-semibold">Tên tour <span className="text-danger">*</span></label>
                        <input id="edit-tour-title" className={`form-control ${errors.title ? 'is-invalid' : ''}`} value={form.title} maxLength={100} onChange={(event) => updateField('title', event.target.value)} />
                        {errors.title && <div className="invalid-feedback">{errors.title}</div>}
                      </div>
                      <div className="col-md-6">
                        <label htmlFor="edit-tour-category" className="form-label fw-semibold">Danh mục</label>
                        <select id="edit-tour-category" className="form-select" value={form.categoryId} onChange={(event) => updateField('categoryId', event.target.value)}>
                          <option value="">Chưa phân loại</option>
                          {categories.map((category) => <option key={category._id} value={category._id}>{category.name}</option>)}
                        </select>
                      </div>
                      <div className="col-md-6">
                        <label htmlFor="edit-tour-duration" className="form-label fw-semibold">Thời lượng <span className="text-danger">*</span></label>
                        <input id="edit-tour-duration" className={`form-control ${errors.duration ? 'is-invalid' : ''}`} value={form.duration} maxLength={100} onChange={(event) => updateField('duration', event.target.value)} />
                        {errors.duration && <div className="invalid-feedback">{errors.duration}</div>}
                      </div>
                      <div className="col-md-6">
                        <label htmlFor="edit-tour-departure" className="form-label fw-semibold">Điểm khởi hành <span className="text-danger">*</span></label>
                        <input id="edit-tour-departure" className={`form-control ${errors.departureLocation ? 'is-invalid' : ''}`} value={form.departureLocation} maxLength={150} onChange={(event) => updateField('departureLocation', event.target.value)} />
                        {errors.departureLocation && <div className="invalid-feedback">{errors.departureLocation}</div>}
                      </div>
                      <div className="col-md-6">
                        <label htmlFor="edit-tour-destination" className="form-label fw-semibold">Điểm đến <span className="text-danger">*</span></label>
                        <input id="edit-tour-destination" className={`form-control ${errors.destinationLocation ? 'is-invalid' : ''}`} value={form.destinationLocation} maxLength={150} onChange={(event) => {
                          const destination = event.target.value;
                          setForm((current) => ({
                            ...current,
                            destinationLocation: destination,
                            location: current.location === current.destinationLocation ? destination : current.location
                          }));
                        }} />
                        {errors.destinationLocation && <div className="invalid-feedback">{errors.destinationLocation}</div>}
                      </div>
                      <div className="col-12">
                        <label htmlFor="edit-tour-location" className="form-label fw-semibold">Địa điểm hiển thị <span className="text-danger">*</span></label>
                        <input id="edit-tour-location" className={`form-control ${errors.location ? 'is-invalid' : ''}`} value={form.location} maxLength={150} onChange={(event) => updateField('location', event.target.value)} />
                        {errors.location && <div className="invalid-feedback">{errors.location}</div>}
                      </div>
                      <div className="col-md-6">
                        <label htmlFor="edit-tour-price-full" className="form-label fw-semibold">Giá mỗi khách (VNĐ) <span className="text-danger">*</span></label>
                        <input id="edit-tour-price-full" type="number" min="0" className={`form-control ${errors.price ? 'is-invalid' : ''}`} value={form.price} onChange={(event) => updateField('price', event.target.value)} />
                        {errors.price && <div className="invalid-feedback">{errors.price}</div>}
                      </div>
                      <div className="col-md-6">
                        <label htmlFor="edit-tour-seats" className="form-label fw-semibold">Số chỗ <span className="text-danger">*</span></label>
                        <input id="edit-tour-seats" type="number" min="0" max="10000" className={`form-control ${errors.availableSeats ? 'is-invalid' : ''}`} value={form.availableSeats} onChange={(event) => updateField('availableSeats', event.target.value)} />
                        {errors.availableSeats && <div className="invalid-feedback">{errors.availableSeats}</div>}
                      </div>
                      <div className="col-12">
                        <label htmlFor="edit-tour-description" className="form-label fw-semibold">Giới thiệu tour <span className="text-danger">*</span></label>
                        <textarea id="edit-tour-description" rows={7} maxLength={5000} className={`form-control ${errors.description ? 'is-invalid' : ''}`} value={form.description} onChange={(event) => updateField('description', event.target.value)}></textarea>
                        {errors.description && <div className="invalid-feedback">{errors.description}</div>}
                        <div className="form-text text-end">{form.description.length}/5000</div>
                      </div>
                    </div>
                  </div>

                  <div className="col-lg-4">
                    <div className="border rounded-3 p-3 h-100 bg-light-subtle">
                      <h6 className="fw-bold"><i className="bi bi-images text-primary me-2"></i>Hình ảnh tour</h6>
                      <div className="vstack gap-2 mb-3">
                        {form.images.map((image, index) => (
                          <div key={`${image}-${index}`} className="position-relative rounded-3 overflow-hidden border bg-white">
                            <img src={image} alt={`Tour ${index + 1}`} className="w-100 object-fit-cover" style={{ height: 110 }} />
                            <button type="button" className="btn btn-danger btn-sm position-absolute top-0 end-0 m-2" onClick={() => removeImage(index)} aria-label={`Xóa ảnh ${index + 1}`}>
                              <i className="bi bi-trash"></i>
                            </button>
                          </div>
                        ))}
                        {uploadPreview && (
                          <div className="rounded-3 overflow-hidden border border-primary bg-white">
                            <img src={uploadPreview} alt="Ảnh sắp tải lên" className="w-100 object-fit-cover" style={{ height: 110 }} />
                            <div className="small text-primary p-2"><i className="bi bi-cloud-arrow-up me-1"></i>Ảnh mới chờ tải lên</div>
                          </div>
                        )}
                      </div>

                      <label className="form-label small fw-semibold" htmlFor="edit-tour-image-url">Thêm bằng URL</label>
                      <div className="input-group input-group-sm mb-3">
                        <input id="edit-tour-image-url" type="url" className="form-control" value={newImageUrl} placeholder="https://..." onChange={(event) => setNewImageUrl(event.target.value)} />
                        <button type="button" className="btn btn-outline-primary" onClick={addImageUrl}>Thêm</button>
                      </div>

                      <label className="form-label small fw-semibold" htmlFor="edit-tour-image-file">Hoặc tải ảnh mới</label>
                      <input id="edit-tour-image-file" type="file" accept="image/*" className="form-control form-control-sm" onChange={handleFileChange} />
                      <div className="form-text">Tối đa 5MB; toàn bộ tour tối đa 10 ảnh.</div>
                      {errors.images && <div className="text-danger small mt-2">{errors.images}</div>}
                    </div>
                  </div>
                </div>
              </div>

              <div className="modal-footer bg-light">
                <button type="button" className="btn btn-outline-secondary" onClick={onClose} disabled={submitting}>Hủy</button>
                <button type="submit" className="btn btn-primary d-inline-flex align-items-center gap-2" disabled={submitting}>
                  {submitting ? <><span className="spinner-border spinner-border-sm"></span>Đang cập nhật...</> : <><i className="bi bi-check2-circle"></i>Lưu thay đổi</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
