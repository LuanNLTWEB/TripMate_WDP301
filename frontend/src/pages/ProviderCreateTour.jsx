import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { tourApi, tourCategoryApi } from '../services/api';
import { useToast } from '../hooks/useToast';

export default function ProviderCreateTour() {
  const navigate = useNavigate();
  const toast = useToast();

  const [categories, setCategories] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    title: '',
    categoryId: '',
    departureLocation: '',
    destinationLocation: '',
    location: '',
    duration: '3 ngày 2 đêm',
    price: '',
    availableSeats: '20',
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
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.title.trim()) {
      setError('Vui lòng nhập tên tour.');
      return;
    }
    if (!formData.departureLocation.trim()) {
      setError('Vui lòng nhập điểm khởi hành.');
      return;
    }
    if (!formData.destinationLocation.trim()) {
      setError('Vui lòng nhập điểm đến.');
      return;
    }
    const numPrice = Number(formData.price);
    if (!formData.price || isNaN(numPrice) || numPrice < 0) {
      setError('Giá tour phải là một số hợp lệ lớn hơn hoặc bằng 0.');
      return;
    }
    if (!formData.description.trim()) {
      setError('Vui lòng nhập mô tả chi tiết tour.');
      return;
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
      images: formData.imageUrl.trim() ? [formData.imageUrl.trim()] : []
    };

    setIsSubmitting(true);
    try {
      const response = await tourApi.create(payload);
      toast.success(response.message || 'Tạo tour thành công! Tour đã được gửi chờ kiểm duyệt.');
      navigate('/tours');
    } catch (err) {
      setError(err.message || 'Không thể tạo tour. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
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

          {error && (
            <div className="alert alert-danger alert-dismissible fade show" role="alert">
              <i className="bi bi-exclamation-triangle-fill me-2"></i>
              {error}
              <button type="button" className="btn-close" onClick={() => setError('')} aria-label="Đóng"></button>
            </div>
          )}

          <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
            <div className="card-body p-4 p-md-5">
              <form onSubmit={handleSubmit}>
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
                      className="form-control"
                      placeholder="Ví dụ: Tour Đà Nẵng - Bà Nà Hills - Cầu Vàng - Phố Cổ Hội An"
                      value={formData.title}
                      onChange={handleChange}
                      maxLength="100"
                      required
                    />
                    <div className="form-text text-end">{formData.title.length}/100</div>
                  </div>

                  <div className="col-md-6">
                    <label className="form-label fw-semibold" htmlFor="categoryId">
                      Danh mục tour
                    </label>
                    <select
                      id="categoryId"
                      name="categoryId"
                      className="form-select"
                      value={formData.categoryId}
                      onChange={handleChange}
                    >
                      <option value="">-- Chọn danh mục --</option>
                      {categories.map((cat) => (
                        <option key={cat._id} value={cat._id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-md-6">
                    <label className="form-label fw-semibold" htmlFor="duration">
                      Thời lượng tour <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      id="duration"
                      name="duration"
                      className="form-control"
                      placeholder="Ví dụ: 3 ngày 2 đêm, 2 ngày 1 đêm..."
                      value={formData.duration}
                      onChange={handleChange}
                      required
                    />
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
                      className="form-control"
                      placeholder="Ví dụ: Hà Nội, TP. Hồ Chí Minh..."
                      value={formData.departureLocation}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label fw-semibold" htmlFor="destinationLocation">
                      Điểm đến <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      id="destinationLocation"
                      name="destinationLocation"
                      className="form-control"
                      placeholder="Ví dụ: Đà Nẵng, Phú Quốc..."
                      value={formData.destinationLocation}
                      onChange={handleChange}
                      required
                    />
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
                        type="number"
                        id="price"
                        name="price"
                        className="form-control"
                        placeholder="Ví dụ: 3500000"
                        min="0"
                        step="10000"
                        value={formData.price}
                        onChange={handleChange}
                        required
                      />
                      <span className="input-group-text">₫</span>
                    </div>
                    {formData.price && !isNaN(Number(formData.price)) && (
                      <div className="form-text text-primary fw-medium">
                        {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(formData.price))}
                      </div>
                    )}
                  </div>

                  <div className="col-md-6">
                    <label className="form-label fw-semibold" htmlFor="availableSeats">
                      Số lượng chỗ còn trống
                    </label>
                    <input
                      type="number"
                      id="availableSeats"
                      name="availableSeats"
                      className="form-control"
                      placeholder="Ví dụ: 20"
                      min="0"
                      value={formData.availableSeats}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <hr className="my-4" />

                <h2 className="h5 fw-bold mb-3 text-primary">
                  <i className="bi bi-image me-2"></i>Hình ảnh & Giới thiệu
                </h2>

                <div className="row g-3 mb-4">
                  <div className="col-12">
                    <label className="form-label fw-semibold" htmlFor="imageUrl">
                      URL Hình ảnh đại diện
                    </label>
                    <input
                      type="url"
                      id="imageUrl"
                      name="imageUrl"
                      className="form-control"
                      placeholder="https://images.unsplash.com/..."
                      value={formData.imageUrl}
                      onChange={handleChange}
                    />
                    <div className="form-text">
                      Nhập đường dẫn ảnh trực tiếp (Unsplash, Cloudinary, Imgur...).
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
                      className="form-control"
                      rows="6"
                      placeholder="Giới thiệu điểm nổi bật của tour, lịch trình tóm tắt, chính sách dịch vụ bao gồm..."
                      value={formData.description}
                      onChange={handleChange}
                      required
                    ></textarea>
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
