import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { tourApi, bookingApi } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';

const formatPrice = (price) => new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND'
}).format(price || 0);

const formatDate = (dateString) => new Date(dateString).toLocaleDateString('vi-VN', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric'
});

const isValidVietnamesePhone = (value) => {
  return /^0[35789][0-9]{8}$/.test(value.trim());
};

const isValidEmail = (value) => {
  return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.(com|vn|edu|edu\.vn)$/i.test(value.trim());
};

const validateForm = (fields, availableSeats) => {
  const newErrors = {};

  if (!fields.fullName.trim()) {
    newErrors.fullName = 'Vui lòng nhập họ và tên';
  } else if (fields.fullName.trim().length < 2) {
    newErrors.fullName = 'Họ và tên phải có ít nhất 2 ký tự';
  }

  if (!fields.phone.trim()) {
    newErrors.phone = 'Vui lòng nhập số điện thoại';
  } else if (!isValidVietnamesePhone(fields.phone.trim())) {
    newErrors.phone = 'Số điện thoại không hợp lệ (ví dụ: 0901234567)';
  }

  if (!fields.email.trim()) {
    newErrors.email = 'Vui lòng nhập email';
  } else if (!isValidEmail(fields.email.trim())) {
    newErrors.email = 'Email không hợp lệ (chỉ chấp nhận đuôi .com, .vn, .edu, .edu.vn)';
  }

  if (fields.address && fields.address.trim()) {
    const trimmedAddress = fields.address.trim();
    if (trimmedAddress.length < 5) {
      newErrors.address = 'Địa chỉ phải có ít nhất 5 ký tự';
    } else if (!/[a-zA-ZÀ-ỹ]{2,}/.test(trimmedAddress)) {
      newErrors.address = 'Địa chỉ không hợp lệ (không được chỉ chứa số hoặc ký tự đặc biệt)';
    }
  }

  const peopleCount = Number(fields.numberOfPeople);
  if (!fields.numberOfPeople || isNaN(peopleCount) || !Number.isInteger(peopleCount)) {
    newErrors.numberOfPeople = 'Vui lòng nhập số lượng người hợp lệ';
  } else if (peopleCount < 1) {
    newErrors.numberOfPeople = 'Số lượng người phải ít nhất là 1';
  } else if (peopleCount > availableSeats) {
    newErrors.numberOfPeople = `Tour chỉ còn ${availableSeats} chỗ trống`;
  }

  if (!fields.departureDate) {
    newErrors.departureDate = 'Vui lòng chọn ngày khởi hành';
  } else {
    const selected = new Date(fields.departureDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (selected < today) {
      newErrors.departureDate = 'Ngày khởi hành phải là ngày trong tương lai';
    }
  }

  return newErrors;
};

const BookingPage = () => {
  const { tourId } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const toast = useToast();

  const [tour, setTour] = useState(null);
  const [tourLoading, setTourLoading] = useState(true);
  const [tourError, setTourError] = useState('');

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [numberOfPeople, setNumberOfPeople] = useState(1);
  const [departureDate, setDepartureDate] = useState('');
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState('');

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    let isMounted = true;
    setTourLoading(true);

    tourApi.getById(tourId)
      .then((response) => {
        if (isMounted) {
          setTour(response.data);
          if (user) {
            setEmail(user.email || '');
            setPhone(user.phone || '');
            setFullName(user.username || '');
          }
        }
      })
      .catch((err) => {
        if (isMounted) setTourError(err.message || 'Không thể tải thông tin tour.');
      })
      .finally(() => {
        if (isMounted) setTourLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [tourId, user]);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    } else if (user && user.role !== 'customer') {
      navigate(`/tours/${tourId}`);
    }
  }, [isAuthenticated, user, navigate, tourId]);

  const totalPrice = tour ? tour.price * Number(numberOfPeople) : 0;

  const clearError = (fieldName) => {
    if (errors[fieldName]) {
      setErrors((prev) => ({ ...prev, [fieldName]: '' }));
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setApiError('');

    const formErrors = validateForm(
      { fullName, phone, email, address, numberOfPeople, departureDate },
      tour.availableSeats
    );

    if (Object.keys(formErrors).length > 0) {
      setErrors(formErrors);
      return;
    }

    if (submitting) return;
    setSubmitting(true);

    try {
      await bookingApi.create(tourId, {
        fullName: fullName.trim(),
        phone: phone.trim(),
        email: email.trim(),
        address: address.trim(),
        numberOfPeople: Number(numberOfPeople),
        departureDate,
        note: note.trim()
      });

      toast.success('Đặt tour thành công! Chúng tôi sẽ liên hệ xác nhận với bạn sớm nhất.');
      navigate('/my-bookings');
    } catch (err) {
      const errorMessage = err.message || 'Không thể đặt tour. Vui lòng thử lại.';
      setApiError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  if (tourLoading) {
    return (
      <>
        <Navbar />
        <main className="container py-5 text-center" style={{ minHeight: '80vh' }}>
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Đang tải...</span>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  if (tourError || !tour) {
    return (
      <>
        <Navbar />
        <main className="container py-5" style={{ minHeight: '80vh' }}>
          <div className="alert alert-danger">{tourError || 'Không tìm thấy tour.'}</div>
          <Link to="/tours" className="btn btn-outline-primary">
            <i className="bi bi-arrow-left me-2"></i>Quay lại danh sách tour
          </Link>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="bg-light py-4 py-md-5" style={{ minHeight: '80vh' }}>
        <div className="container">

          <div className="mb-4">
            <Link
              to={`/tours/${tourId}`}
              className="btn btn-white bg-white border shadow-sm rounded-pill px-3 py-1.5 d-inline-flex align-items-center gap-2 text-decoration-none text-dark fw-medium"
              style={{ fontSize: '0.9rem' }}
            >
              <i className="bi bi-arrow-left text-primary"></i>
              <span>Quay lại chi tiết tour</span>
            </Link>
          </div>

          <div className="row g-4">
            <div className="col-lg-7">
              <div className="card border-0 shadow-sm rounded-4">
                <div className="card-body p-4 p-md-5">
                  <h1 className="h3 fw-bold mb-1">Thông tin đặt tour</h1>
                  <p className="text-muted mb-4">Vui lòng điền đầy đủ thông tin để đặt tour</p>

                  {apiError && (
                    <div className="alert alert-danger d-flex align-items-center gap-2 mb-4">
                      <i className="bi bi-exclamation-circle-fill"></i>
                      <span>{apiError}</span>
                    </div>
                  )}

                  <form onSubmit={handleSubmit} noValidate>
                    <div className="row g-3 mb-3">
                      <div className="col-md-6">
                        <label htmlFor="fullName" className="form-label fw-medium text-dark">
                          Họ tên <span className="text-danger">(*)</span>
                        </label>
                        <input
                          id="fullName"
                          type="text"
                          className={`form-control rounded-pill px-3 py-2.5 ${errors.fullName ? 'is-invalid' : ''}`}
                          style={{ backgroundColor: '#f8f9fa', border: errors.fullName ? '1px solid #dc3545' : '1px solid #eef0f3' }}
                          placeholder="Ví dụ: Nguyễn Văn A"
                          value={fullName}
                          onChange={(e) => { setFullName(e.target.value); clearError('fullName'); }}
                          maxLength={100}
                          disabled={submitting}
                        />
                        {errors.fullName && (
                          <div className="invalid-feedback">{errors.fullName}</div>
                        )}
                      </div>

                      <div className="col-md-6">
                        <label htmlFor="phone" className="form-label fw-medium text-dark">
                          Số điện thoại <span className="text-danger">(*)</span>
                        </label>
                        <input
                          id="phone"
                          type="tel"
                          className={`form-control rounded-pill px-3 py-2.5 ${errors.phone ? 'is-invalid' : ''}`}
                          style={{ backgroundColor: '#f8f9fa', border: errors.phone ? '1px solid #dc3545' : '1px solid #eef0f3' }}
                          placeholder="Ví dụ: 0901234567"
                          value={phone}
                          onChange={(e) => { setPhone(e.target.value); clearError('phone'); }}
                          maxLength={10}
                          disabled={submitting}
                        />
                        {errors.phone && (
                          <div className="invalid-feedback">{errors.phone}</div>
                        )}
                      </div>

                      <div className="col-md-6">
                        <label htmlFor="email" className="form-label fw-medium text-dark">
                          Email <span className="text-danger">(*)</span>
                        </label>
                        <input
                          id="email"
                          type="text"
                          className={`form-control rounded-pill px-3 py-2.5 ${errors.email ? 'is-invalid' : ''}`}
                          style={{ backgroundColor: '#f8f9fa', border: errors.email ? '1px solid #dc3545' : '1px solid #eef0f3' }}
                          placeholder="Ví dụ: email@example.com"
                          value={email}
                          onChange={(e) => { setEmail(e.target.value); clearError('email'); }}
                          disabled={submitting}
                        />
                        {errors.email && (
                          <div className="invalid-feedback">{errors.email}</div>
                        )}
                      </div>

                      <div className="col-md-6">
                        <label htmlFor="address" className="form-label fw-medium text-dark">
                          Địa chỉ
                        </label>
                        <input
                          id="address"
                          type="text"
                          className={`form-control rounded-pill px-3 py-2.5 ${errors.address ? 'is-invalid' : ''}`}
                          style={{ backgroundColor: '#f8f9fa', border: errors.address ? '1px solid #dc3545' : '1px solid #eef0f3' }}
                          placeholder="Ví dụ: 190 Pasteur, Phường Xuân Hoà, TP.HCM"
                          value={address}
                          onChange={(e) => { setAddress(e.target.value); clearError('address'); }}
                          maxLength={200}
                          disabled={submitting}
                        />
                        {errors.address && (
                          <div className="invalid-feedback">{errors.address}</div>
                        )}
                      </div>
                    </div>

                    <div className="row g-3 mb-3">
                      <div className="col-md-6">
                        <label className="form-label fw-medium text-dark">
                          Hành khách <span className="text-danger">(*)</span>
                        </label>
                        <div
                          className={`d-flex align-items-center justify-content-between rounded-pill px-3 py-1.5 ${errors.numberOfPeople ? 'border-danger' : ''}`}
                          style={{
                            backgroundColor: '#f8f9fa',
                            border: errors.numberOfPeople ? '1px solid #dc3545' : '1px solid #eef0f3',
                            minHeight: '42px'
                          }}
                        >
                          <div>
                            <div className="fw-bold text-dark" style={{ fontSize: '0.95rem', lineHeight: '1.2' }}>Số lượng người</div>
                            <div className="text-secondary" style={{ fontSize: '0.72rem', marginTop: '2px', lineHeight: '1' }}>Còn {tour.availableSeats} chỗ trống</div>
                          </div>
                          <div className="d-flex align-items-center gap-2">
                            <button
                              type="button"
                              className="btn btn-outline-secondary rounded-circle d-flex align-items-center justify-content-center p-0"
                              style={{ width: '28px', height: '28px', fontSize: '0.9rem' }}
                              onClick={() => {
                                if (numberOfPeople > 1) {
                                  setNumberOfPeople(numberOfPeople - 1);
                                  clearError('numberOfPeople');
                                }
                              }}
                              disabled={submitting || numberOfPeople <= 1}
                            >
                              <i className="bi bi-dash"></i>
                            </button>
                            <span className="fw-bold text-dark" style={{ minWidth: '18px', textAlign: 'center', fontSize: '0.95rem' }}>
                              {numberOfPeople}
                            </span>
                            <button
                              type="button"
                              className="btn btn-outline-primary rounded-circle d-flex align-items-center justify-content-center p-0"
                              style={{ width: '28px', height: '28px', fontSize: '0.9rem' }}
                              onClick={() => {
                                if (numberOfPeople < tour.availableSeats) {
                                  setNumberOfPeople(numberOfPeople + 1);
                                  clearError('numberOfPeople');
                                }
                              }}
                              disabled={submitting || numberOfPeople >= tour.availableSeats}
                            >
                              <i className="bi bi-plus"></i>
                            </button>
                          </div>
                        </div>
                        {errors.numberOfPeople && (
                          <div className="text-danger small mt-1">{errors.numberOfPeople}</div>
                        )}
                      </div>

                      <div className="col-md-6">
                        <label htmlFor="departureDate" className="form-label fw-medium text-dark">
                          Ngày khởi hành <span className="text-danger">(*)</span>
                        </label>
                        <input
                          id="departureDate"
                          type="date"
                          className={`form-control rounded-pill px-3 py-2 ${errors.departureDate ? 'is-invalid' : ''}`}
                          style={{
                            backgroundColor: '#f8f9fa',
                            border: errors.departureDate ? '1px solid #dc3545' : '1px solid #eef0f3',
                            minHeight: '42px'
                          }}
                          min={today}
                          value={departureDate}
                          onChange={(e) => { setDepartureDate(e.target.value); clearError('departureDate'); }}
                          disabled={submitting}
                        />
                        {errors.departureDate && (
                          <div className="invalid-feedback">{errors.departureDate}</div>
                        )}
                      </div>
                    </div>

                    <div className="mb-4">
                      <label htmlFor="note" className="form-label fw-bold fs-5 text-dark mb-1">
                        Ghi chú
                      </label>
                      <p className="text-secondary small mb-2">
                        Vui lòng cho chúng tôi biết nếu Quý khách có ghi chú hoặc yêu cầu đặc biệt.
                      </p>
                      <textarea
                        id="note"
                        className="form-control rounded-4 p-3"
                        style={{ backgroundColor: '#f8f9fa', border: '1px solid #eef0f3' }}
                        rows={4}
                        placeholder="Ví dụ: Bữa ăn chay, đến muộn, ..."
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        maxLength={500}
                        disabled={submitting}
                      />
                    </div>

                    <div className="pt-2">
                      <button
                        type="submit"
                        className="btn btn-primary rounded-pill w-100 py-2.5 fw-semibold shadow-sm d-flex align-items-center justify-content-center gap-2"
                        disabled={submitting}
                      >
                        {submitting ? (
                          <>
                            <span className="spinner-border spinner-border-sm" aria-hidden="true"></span>
                            <span>Đang xử lý...</span>
                          </>
                        ) : (
                          <>
                            <i className="bi bi-calendar-check"></i>
                            <span>Xác nhận đặt tour</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>

            <div className="col-lg-5">
              <div className="card border-0 shadow-sm rounded-4">
                <div className="card-body p-4">
                  <h2 className="h5 fw-bold mb-3">Tóm tắt đơn đặt</h2>

                  {tour.images && tour.images[0] && (
                    <img
                      src={tour.images[0]}
                      alt={tour.title}
                      className="w-100 rounded-3 mb-3"
                      style={{ height: '160px', objectFit: 'cover' }}
                    />
                  )}

                  <h3 className="h6 fw-bold text-dark mb-1">{tour.title}</h3>
                  <p className="text-muted small mb-3">
                    <i className="bi bi-geo-alt-fill text-danger me-1"></i>
                    {tour.departureLocation
                      ? `${tour.departureLocation} → ${tour.destinationLocation || tour.location}`
                      : (tour.destinationLocation || tour.location)}
                  </p>

                  <hr />

                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <span className="text-muted small">Giá mỗi người</span>
                    <span className="fw-medium">{formatPrice(tour.price)}</span>
                  </div>
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <span className="text-muted small">Số lượng người</span>
                    <span className="fw-medium">{numberOfPeople} người</span>
                  </div>
                  {departureDate && (
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <span className="text-muted small">Ngày khởi hành</span>
                      <span className="fw-medium">{formatDate(departureDate)}</span>
                    </div>
                  )}

                  <hr />

                  <div className="d-flex justify-content-between align-items-center">
                    <span className="fw-bold">Tổng cộng</span>
                    <span className="fw-bold text-primary fs-5">{formatPrice(totalPrice)}</span>
                  </div>

                  <div className="mt-3 p-3 bg-light rounded-3">
                    <p className="small text-muted mb-0">
                      <i className="bi bi-info-circle me-1"></i>
                      Đây là đơn đặt chỗ. Nhân viên sẽ liên hệ xác nhận và hướng dẫn thanh toán trong thời gian sớm nhất.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
};

export default BookingPage;
