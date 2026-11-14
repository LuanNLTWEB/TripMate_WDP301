import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import CustomSelect from '../components/CustomSelect';
import { tourApi, tourCategoryApi, uploadApi } from '../services/api';
import { useToast } from '../hooks/useToast';

export default function ProviderCreateTour() {
  const navigate = useNavigate();
  const toast = useToast();

  const [categories, setCategories] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [imageFile, setImageFile] = useState(null);
  const [fileName, setFileName] = useState('Chưa có tệp nào được chọn');

  const [formData, setFormData] = useState({
    title: '',
    categoryId: '',
    departureLocation: '',
    destinationLocation: '',
    location: '',
    duration: '',
    price: '',
    availableSeats: '',
    imageUrl: '',
    description: ''
  });

  useEffect(() => {
    tourCategoryApi.getAll()
      .then((res) => setCategories(res.data || []))
      .catch(() => {});
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const updated = { ...prev, [name]: value };
      if (name === 'destinationLocation' && (!prev.location || prev.location === prev.destinationLocation)) {
        updated.location = value;
      }
      return updated;
    });
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const handlePriceChange = (e) => {
    const rawValue = e.target.value.replace(/\D/g, '');
    setFormData((prev) => ({ ...prev, price: rawValue }));
    if (errors.price) setErrors((prev) => ({ ...prev, price: '' }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Kích thước ảnh không được vượt quá 5MB.');
        return;
      }
      if (imageFile && formData.imageUrl.startsWith('blob:')) {
        URL.revokeObjectURL(formData.imageUrl);
      }
      setImageFile(file);
      setFileName(file.name);
      const previewUrl = URL.createObjectURL(file);
      setFormData(prev => ({ ...prev, imageUrl: previewUrl }));
      if (errors.image) setErrors((prev) => ({ ...prev, image: '' }));
    } else {
      setFileName('Chưa có tệp nào được chọn');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const fieldErrors = {};
    if (!formData.title.trim()) fieldErrors.title = 'Vui lòng nhập tên tour.';
    if (!formData.duration.trim()) fieldErrors.duration = 'Vui lòng nhập thời lượng tour (VD: 3N2Đ).';
    if (!formData.departureLocation.trim()) fieldErrors.departureLocation = 'Vui lòng nhập điểm khởi hành.';
    if (!formData.destinationLocation.trim()) fieldErrors.destinationLocation = 'Vui lòng nhập điểm đến.';
    
    const numPrice = Number(formData.price);
    if (!formData.price || isNaN(numPrice) || numPrice < 0) {
      fieldErrors.price = 'Giá tour phải là một số hợp lệ lớn hơn hoặc bằng 0.';
    }
    const numSeats = Number(formData.availableSeats);
    if (!formData.availableSeats || isNaN(numSeats) || numSeats <= 0) {
      fieldErrors.availableSeats = 'Vui lòng nhập số lượng chỗ hợp lệ (lớn hơn 0).';
    }
    if (!formData.description.trim()) {
      fieldErrors.description = 'Vui lòng nhập mô tả chi tiết tour.';
    }
    if (!imageFile && !formData.imageUrl) {
      fieldErrors.image = 'Vui lòng chọn hình ảnh đại diện cho tour.';
    }

    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      toast.error('Vui lòng kiểm tra và điền đầy đủ các thông tin được đánh dấu đỏ.');
      const firstField = Object.keys(fieldErrors)[0];
      if (firstField) document.getElementById(firstField)?.focus();
      return;
    }

    setIsSubmitting(true);
    let uploadedImageUrl = formData.imageUrl;

    try {
      if (imageFile) {
        const uploadData = new FormData();
        uploadData.append('image', imageFile);
        const uploadRes = await uploadApi.uploadImage(uploadData);
        uploadedImageUrl = uploadRes.url;
      }

      const payload = {
        title: formData.title.trim(),
        categoryId: formData.categoryId || null,
        departureLocation: formData.departureLocation.trim(),
        destinationLocation: formData.destinationLocation.trim(),
        location: (formData.location || formData.destinationLocation).trim(),
        duration: formData.duration.trim(),
        price: numPrice,
        availableSeats: Number(formData.availableSeats) || 0,
        description: formData.description.trim(),
        images: uploadedImageUrl.trim() ? [uploadedImageUrl.trim()] : []
      };

      const response = await tourApi.create(payload);
      toast.success(response.message || 'Tạo tour thành công! Tour đã được gửi chờ kiểm duyệt.');
      navigate('/tours');
    } catch (err) {
      const msg = err.message || 'Không thể tạo tour. Vui lòng thử lại.';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
      if (imageFile && formData.imageUrl.startsWith('blob:')) {
        URL.revokeObjectURL(formData.imageUrl);
      }
    }
  };

  return (
    <>
      <Navbar />
      <main className="bg-light py-5">
        <div className="container" style={{ maxWidth: '860px' }}>
          <div className="mb-4">
            <Link to="/tours" className="text-decoration-none text-muted small d-inline-flex align-items-center mb-2">
              <i className="bi bi-arrow-left me-1"></i> Quay lại danh sách tour
            </Link>
            <h1 className="h3 fw-bold mb-1">Tạo Tour Du Lịch Mới</h1>
            <p className="text-muted small mb-0">
              Đăng ký tour của bạn lên hệ thống TripMate. Tour sẽ được gửi đến nhân viên để duyệt trước khi hiển thị công khai.
            </p>
          </div>

          <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
            <div className="card-body p-4 p-md-5">
              <form onSubmit={handleSubmit} noValidate>
                <h2 className="h5 fw-bold mb-3 text-primary">
                  <i className="bi bi-info-circle me-2"></i>Thông tin cơ bản
                </h2>

                <div className="row g-3 mb-4">
                  <div className="col-12">
                    <label className="form-label fw-semibold" htmlFor="title">
                      Tên tour du lịch <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      id="title"
                      name="title"
                      className={`form-control ${errors.title ? 'is-invalid' : ''}`}
                      placeholder="Ví dụ: Tour Đà Nẵng - Bà Nà Hills - Cầu Vàng - Phố Cổ Hội An"
                      value={formData.title}
                      onChange={handleChange}
                      maxLength="100"
                      required
                    />
                    {errors.title && <div className="invalid-feedback">{errors.title}</div>}
                    <div className="form-text text-end">{formData.title.length}/100</div>
                  </div>

                  <div className="col-md-6">
                    <label className="form-label fw-semibold" htmlFor="categoryId">
                      Danh mục tour
                    </label>
                    <CustomSelect
                      id="categoryId"
                      name="categoryId"
                      value={formData.categoryId}
                      options={[
                        { value: '', label: '-- Chọn danh mục --' },
                        ...categories.map((cat) => ({ value: cat._id, label: cat.name }))
                      ]}
                      onChange={(e, val) => {
                        const nextVal = val !== undefined ? val : e.target.value;
                        setFormData((prev) => ({ ...prev, categoryId: nextVal }));
                      }}
                      placeholder="-- Chọn danh mục --"
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label fw-semibold" htmlFor="duration">
                      Thời lượng tour <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      id="duration"
                      name="duration"
                      className={`form-control ${errors.duration ? 'is-invalid' : ''}`}
                      placeholder="Ví dụ: 3 ngày 2 đêm, 2 ngày 1 đêm..."
                      value={formData.duration}
                      onChange={handleChange}
                      required
                    />
                    {errors.duration && <div className="invalid-feedback">{errors.duration}</div>}
                  </div>
                </div>

                <hr className="my-4" />

                <h2 className="h5 fw-bold mb-3 text-primary">
                  <i className="bi bi-geo-alt me-2"></i>Hành trình & Địa điểm
                </h2>

                <div className="row g-3 mb-4">
                  <div className="col-md-6">
                    <label className="form-label fw-semibold" htmlFor="departureLocation">
                      Điểm khởi hành <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      id="departureLocation"
                      name="departureLocation"
                      className={`form-control ${errors.departureLocation ? 'is-invalid' : ''}`}
                      placeholder="Ví dụ: Hà Nội, TP. Hồ Chí Minh..."
                      value={formData.departureLocation}
                      onChange={handleChange}
                      required
                    />
                    {errors.departureLocation && <div className="invalid-feedback">{errors.departureLocation}</div>}
                  </div>

                  <div className="col-md-6">
                    <label className="form-label fw-semibold" htmlFor="destinationLocation">
                      Điểm đến <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      id="destinationLocation"
                      name="destinationLocation"
                      className={`form-control ${errors.destinationLocation ? 'is-invalid' : ''}`}
                      placeholder="Ví dụ: Đà Nẵng, Phú Quốc..."
                      value={formData.destinationLocation}
                      onChange={handleChange}
                      required
                    />
                    {errors.destinationLocation && <div className="invalid-feedback">{errors.destinationLocation}</div>}
                  </div>
                </div>

                <hr className="my-4" />

                <h2 className="h5 fw-bold mb-3 text-primary">
                  <i className="bi bi-tag me-2"></i>Giá vé & Số chỗ
                </h2>

                <div className="row g-3 mb-4">
                  <div className="col-md-6">
                    <label className="form-label fw-semibold" htmlFor="price">
                      Giá tour (VND / khách) <span className="text-danger">*</span>
                    </label>
                    <div className="input-group">
                      <input
                        type="text"
                        id="price"
                        name="price"
                        className={`form-control ${errors.price ? 'is-invalid' : ''}`}
                        placeholder="Ví dụ: 3.500.000"
                        value={formData.price ? new Intl.NumberFormat('vi-VN').format(Number(formData.price)) : ''}
                        onChange={handlePriceChange}
                        required
                      />
                      <span className="input-group-text">₫</span>
                      {errors.price && <div className="invalid-feedback">{errors.price}</div>}
                    </div>
                  </div>

                  <div className="col-md-6">
                    <label className="form-label fw-semibold" htmlFor="availableSeats">
                      Số lượng chỗ còn trống <span className="text-danger">*</span>
                    </label>
                    <input
                      type="number"
                      id="availableSeats"
                      name="availableSeats"
                      className={`form-control ${errors.availableSeats ? 'is-invalid' : ''}`}
                      placeholder="Ví dụ: 20"
                      min="1"
                      value={formData.availableSeats}
                      onChange={handleChange}
                      required
                    />
                    {errors.availableSeats && <div className="invalid-feedback">{errors.availableSeats}</div>}
                  </div>
                </div>

                <hr className="my-4" />

                <h2 className="h5 fw-bold mb-3 text-primary">
                  <i className="bi bi-image me-2"></i>Hình ảnh & Giới thiệu
                </h2>

                <div className="row g-3 mb-4">
                  <div className="col-12">
                    <label className="form-label fw-semibold d-block">
                      Hình ảnh đại diện <span className="text-danger">*</span>
                    </label>
                    <div className="d-flex align-items-center gap-3">
                      <label htmlFor="imageFile" className={`btn btn-outline-primary mb-0 ${errors.image ? 'border-danger text-danger' : ''}`}>
                        <i className="bi bi-upload me-2"></i>Chọn tệp
                      </label>
                      <span className="text-muted small">{fileName}</span>
                    </div>
                    {errors.image && <div className="text-danger small mt-1.5">{errors.image}</div>}
                    <input
                      type="file"
                      id="imageFile"
                      name="imageFile"
                      className="d-none"
                      accept="image/jpeg, image/png, image/webp"
                      onChange={handleImageChange}
                    />
                    <div className="form-text mt-2">
                      Chọn file ảnh từ thiết bị của bạn (tối đa 5MB, định dạng JPG, PNG, WEBP).
                    </div>

                    {formData.imageUrl && (
                      <div className="mt-3 rounded-3 overflow-hidden border" style={{ maxHeight: '240px' }}>
                        <img
                          src={formData.imageUrl}
                          alt="Preview"
                          className="w-100 h-100 object-fit-cover"
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                      </div>
                    )}
                  </div>

                  <div className="col-12">
                    <label className="form-label fw-semibold" htmlFor="description">
                      Mô tả chi tiết tour <span className="text-danger">*</span>
                    </label>
                    <textarea
                      id="description"
                      name="description"
                      className={`form-control ${errors.description ? 'is-invalid' : ''}`}
                      rows="6"
                      placeholder="Giới thiệu điểm nổi bật của tour, lịch trình tóm tắt, chính sách dịch vụ bao gồm..."
                      value={formData.description}
                      onChange={handleChange}
                      required
                    ></textarea>
                    {errors.description && <div className="invalid-feedback">{errors.description}</div>}
                  </div>
                </div>

                <div className="p-3 bg-light rounded-3 border small text-muted mb-4">
                  <i className="bi bi-info-circle me-1 text-primary"></i>
                  Tour sau khi gửi sẽ chuyển sang trạng thái <strong>Chờ duyệt (Pending)</strong>. Ban quản lý TripMate sẽ tiến hành kiểm duyệt trước khi tour được hiển thị trên hệ thống tìm kiếm cho khách hàng.
                </div>

                <div className="d-flex justify-content-end gap-3">
                  <Link to="/tours" className="btn btn-outline-secondary px-4">
                    Hủy
                  </Link>
                  <button
                    type="submit"
                    className="btn btn-primary px-4 fw-medium"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>
                        Đang gửi duyệt...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-send me-2"></i>
                        Gửi duyệt tour
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
