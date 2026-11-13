import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation, useSearchParams, Link } from 'react-router-dom';
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

const formatFullDate = (dateString) => {
  const d = new Date(dateString);
  return d.toLocaleDateString('vi-VN', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

const isValidVietnamesePhone = (value) => {
  return /^0[35789][0-9]{8}$/.test(value.trim());
};

const isValidEmail = (value) => {
  return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.(com|vn|edu|edu\.vn)$/i.test(value.trim());
};

const validateForm = (fields, selectedDeparture, availableSeats, departuresCount) => {
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

  if (departuresCount === 0) {
    newErrors.departureDate = 'Tour này hiện chưa mở lịch khởi hành, chưa thể đặt tour';
  } else if (!selectedDeparture) {
    newErrors.departureDate = 'Vui lòng chọn một trong các đợt khởi hành của tour bên dưới';
  } else if (!selectedDeparture.isAvailable) {
    newErrors.departureDate = 'Lịch khởi hành này đã hết chỗ, vui lòng chọn đợt khởi hành khác';
  }

  const peopleCount = Number(fields.numberOfPeople);
  if (!fields.numberOfPeople || isNaN(peopleCount) || !Number.isInteger(peopleCount)) {
    newErrors.numberOfPeople = 'Vui lòng nhập số lượng người hợp lệ';
  } else if (peopleCount < 1) {
    newErrors.numberOfPeople = 'Số lượng người phải ít nhất là 1';
  } else if (availableSeats > 0 && peopleCount > availableSeats) {
    newErrors.numberOfPeople = `Lịch khởi hành này chỉ còn ${availableSeats} chỗ trống`;
  }

  if (!fields.agreePolicy) {
    newErrors.agreePolicy = 'Vui lòng xác nhận đồng ý với quy định hủy chỗ trước khi đặt tour';
  }

  return newErrors;
};

const BookingPage = () => {
  const { tourId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const initialDepartureDate = location.state?.departureDate || searchParams.get('departureDate') || '';
  const initialDepartureId = location.state?.departureId || searchParams.get('departureId') || '';
  const { user, isAuthenticated } = useAuth();
  const toast = useToast();

  const [tour, setTour] = useState(null);
  const [tourLoading, setTourLoading] = useState(true);
  const [tourError, setTourError] = useState('');
  const [departures, setDepartures] = useState([]);

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [numberOfPeople, setNumberOfPeople] = useState(1);
  const [selectedDepartureId, setSelectedDepartureId] = useState(initialDepartureId);
  const [departureDate, setDepartureDate] = useState(() => initialDepartureDate);
  const [note, setNote] = useState('');
  const [agreePolicy, setAgreePolicy] = useState(false);
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

    tourApi.checkAvailability(tourId)
      .then((res) => {
        if (isMounted && res.data?.departures) {
          const deps = res.data.departures;
          setDepartures(deps);

          // Tự động đồng bộ lịch khởi hành khi vào trang
          if (initialDepartureId) {
            const found = deps.find((d) => d._id === initialDepartureId);
            if (found) {
              setSelectedDepartureId(found._id);
              setDepartureDate(found.dateKey);
            }
          } else if (initialDepartureDate) {
            const found = deps.find((d) => d.dateKey === initialDepartureDate);
            if (found) {
              setSelectedDepartureId(found._id);
              setDepartureDate(found.dateKey);
            }
          } else if (deps.length > 0) {
            const firstAvail = deps.find((d) => d.isAvailable) || deps[0];
            setSelectedDepartureId(firstAvail._id);
            setDepartureDate(firstAvail.dateKey);
          }
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [tourId, user, initialDepartureId, initialDepartureDate]);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    } else if (user && user.role !== 'customer') {
      navigate(`/tours/${tourId}`);
    }
  }, [isAuthenticated, user, navigate, tourId]);

  // Xác định lịch khởi hành đang được chọn
  const selectedDeparture = departures.find(
    (d) => (selectedDepartureId && d._id === selectedDepartureId) || (departureDate && d.dateKey === departureDate)
  ) || null;

  // Số chỗ trống tối đa của lịch khởi hành đã chọn
  const availableSeats = selectedDeparture
    ? (selectedDeparture.remainingSeats ?? selectedDeparture.capacity ?? 0)
    : (tour ? tour.availableSeats : 0);

  // Đơn giá tính theo lịch khởi hành (nếu có giá riêng) hoặc giá gốc của tour
  const unitPrice = (selectedDeparture && selectedDeparture.price && selectedDeparture.price > 0)
    ? selectedDeparture.price
    : (tour ? tour.price : 0);

  const totalPrice = unitPrice * Number(numberOfPeople);

  const clearError = (fieldName) => {
    if (errors[fieldName]) {
      setErrors((prev) => ({ ...prev, [fieldName]: '' }));
    }
  };

  const handleSelectDeparture = (dep) => {
    setSelectedDepartureId(dep._id);
    setDepartureDate(dep.dateKey);
    clearError('departureDate');

    const maxSeats = dep.remainingSeats ?? dep.capacity ?? 0;
    if (maxSeats > 0 && numberOfPeople > maxSeats) {
      setNumberOfPeople(maxSeats);
      clearError('numberOfPeople');
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setApiError('');

    const formErrors = validateForm(
      { fullName, phone, email, address, numberOfPeople, departureDate, agreePolicy },
      selectedDeparture,
      availableSeats,
      departures.length
    );

    if (Object.keys(formErrors).length > 0) {
      setErrors(formErrors);
      toast.error('Vui lòng kiểm tra và điền đầy đủ các thông tin được đánh dấu đỏ.');
      const firstField = Object.keys(formErrors)[0];
      if (firstField) document.getElementById(firstField)?.focus();
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
        departureId: selectedDeparture?._id || undefined,
        departureDate: selectedDeparture?.departureDate || departureDate,
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
                  <p className="text-muted mb-4">Vui lòng chọn lịch khởi hành và điền thông tin để đặt tour</p>

                  {apiError && (
                    <div className="alert alert-danger d-flex align-items-center gap-2 mb-4">
                      <i className="bi bi-exclamation-circle-fill"></i>
                      <span>{apiError}</span>
                    </div>
                  )}

                  <form onSubmit={handleSubmit} noValidate>
                    {/* Phần 1: Chọn lịch khởi hành tour (Bắt buộc theo nghiệp vụ) */}
                    <div className="mb-4 p-3 p-md-4 bg-white border rounded-4 shadow-sm">
                      <div className="mb-3">
                        <label className="form-label fw-bold text-dark mb-0 fs-6">
                          Lịch khởi hành tour <span className="text-danger">(*)</span>
                        </label>
                        <div className="text-muted small mt-1" style={{ fontSize: '0.8rem' }}>
                          Quý khách vui lòng chọn một trong các đợt khởi hành bên dưới:
                        </div>
                      </div>

                      {departures.length === 0 ? (
                        <div className="alert alert-warning border-0 rounded-3 p-3 mb-0 d-flex align-items-center gap-2">
                          <i className="bi bi-exclamation-triangle-fill text-warning fs-5 flex-shrink-0"></i>
                          <span className="small">Tour này hiện chưa mở lịch khởi hành mới. Quý khách vui lòng chọn tour khác hoặc quay lại sau.</span>
                        </div>
                      ) : (
                        <div className="d-flex flex-column gap-2.5">
                          {departures.map((dep) => {
                            const isSelected = selectedDeparture && (selectedDeparture._id === dep._id || selectedDeparture.dateKey === dep.dateKey);
                            const isAvail = dep.isAvailable && (dep.remainingSeats > 0);
                            const isLowSeats = isAvail && dep.remainingSeats <= 5;

                            return (
                              <div
                                key={dep._id || dep.dateKey}
                                role="button"
                                tabIndex={isAvail ? 0 : -1}
                                onClick={() => {
                                  if (isAvail) handleSelectDeparture(dep);
                                }}
                                onKeyDown={(e) => {
                                  if (isAvail && (e.key === 'Enter' || e.key === ' ')) {
                                    handleSelectDeparture(dep);
                                  }
                                }}
                                className={`p-3 rounded-3 transition-all d-flex align-items-center justify-content-between position-relative ${
                                  isSelected
                                    ? 'shadow-xs'
                                    : isAvail
                                      ? 'cursor-pointer'
                                      : 'opacity-60 cursor-not-allowed'
                                }`}
                                style={{
                                  border: isSelected ? '2px solid #0284c7' : '1px solid #e2e8f0',
                                  backgroundColor: isSelected ? '#f0f9ff' : isAvail ? '#ffffff' : '#f8fafc',
                                  cursor: isAvail ? 'pointer' : 'not-allowed',
                                  transition: 'all 0.2s ease-in-out'
                                }}
                              >
                                {/* Cột trái: Radio checkmark & Thông tin ngày */}
                                <div className="d-flex align-items-center gap-3">
                                  <div
                                    className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
                                    style={{
                                      width: '24px',
                                      height: '24px',
                                      backgroundColor: isSelected ? '#0284c7' : '#ffffff',
                                      border: isSelected ? '2px solid #0284c7' : '2px solid #cbd5e1',
                                      color: '#ffffff',
                                      transition: 'all 0.2s ease-in-out'
                                    }}
                                  >
                                    {isSelected ? (
                                      <i className="bi bi-check-lg" style={{ fontSize: '0.85rem' }}></i>
                                    ) : (
                                      <div className="rounded-circle" style={{ width: '8px', height: '8px', backgroundColor: '#e2e8f0' }}></div>
                                    )}
                                  </div>

                                  <div>
                                    <div className="d-flex align-items-center gap-2 flex-wrap">
                                      <span
                                        className={`fw-bold ${isSelected ? 'text-primary' : 'text-dark'}`}
                                        style={{ fontSize: '0.96rem' }}
                                      >
                                        {formatFullDate(dep.departureDate)}
                                      </span>
                                      {dep.note && (
                                        <span
                                          className="badge bg-light text-secondary border px-2 py-0.5 fw-normal d-inline-flex align-items-center gap-1"
                                          style={{ fontSize: '0.74rem' }}
                                        >
                                          <i className="bi bi-clock"></i>
                                          <span>{dep.note}</span>
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-muted small mt-0.5" style={{ fontSize: '0.78rem' }}>
                                      Khởi hành: {formatDate(dep.departureDate)}
                                    </div>
                                  </div>
                                </div>

                                {/* Cột phải: Đơn giá & Badge chỗ trống */}
                                <div className="d-flex align-items-center gap-3 text-end">
                                  <div className="fw-bold" style={{ color: '#0284c7', fontSize: '0.98rem' }}>
                                    {formatPrice(dep.price || tour.price)}
                                  </div>

                                  <span
                                    className={`badge rounded-pill px-2.5 py-1.5 fw-semibold ${
                                      !isAvail
                                        ? 'bg-danger-subtle text-danger border border-danger-subtle'
                                        : isLowSeats
                                          ? 'bg-warning-subtle text-warning-emphasis border border-warning-subtle'
                                          : 'bg-success-subtle text-success border border-success-subtle'
                                    }`}
                                    style={{ fontSize: '0.76rem', minWidth: '78px', textAlign: 'center' }}
                                  >
                                    {!isAvail ? 'Hết chỗ' : isLowSeats ? `Còn ${dep.remainingSeats} chỗ` : `Còn ${dep.remainingSeats} chỗ`}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {errors.departureDate && (
                        <div className="text-danger small mt-2 d-flex align-items-center gap-1">
                          <i className="bi bi-exclamation-circle-fill"></i>
                          <span>{errors.departureDate}</span>
                        </div>
                      )}
                    </div>

                    {/* Phần 2: Thông tin hành khách & Số lượng người */}
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

                    <div className="row g-3 mb-4">
                      <div className="col-md-6">
                        <label className="form-label fw-medium text-dark">
                          Số lượng người đặt <span className="text-danger">(*)</span>
                        </label>
                        <div
                          className={`d-flex align-items-center justify-content-between rounded-pill px-3 py-1.5 ${errors.numberOfPeople ? 'border-danger' : ''}`}
                          style={{
                            backgroundColor: '#f8f9fa',
                            border: errors.numberOfPeople ? '1px solid #dc3545' : '1px solid #eef0f3',
                            minHeight: '44px'
                          }}
                        >
                          <div>
                            <div className="fw-bold text-dark" style={{ fontSize: '0.92rem', lineHeight: '1.2' }}>Hành khách</div>
                            <div className="text-secondary" style={{ fontSize: '0.72rem', marginTop: '2px', lineHeight: '1' }}>
                              {selectedDeparture ? `Lịch này còn ${availableSeats} chỗ` : `Tour còn ${tour.availableSeats} chỗ`}
                            </div>
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
                              aria-label="Giảm số người"
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
                                if (availableSeats > 0 && numberOfPeople < availableSeats) {
                                  setNumberOfPeople(numberOfPeople + 1);
                                  clearError('numberOfPeople');
                                }
                              }}
                              disabled={submitting || availableSeats <= 0 || numberOfPeople >= availableSeats}
                              aria-label="Tăng số người"
                            >
                              <i className="bi bi-plus"></i>
                            </button>
                          </div>
                        </div>
                        {errors.numberOfPeople && (
                          <div className="text-danger small mt-1">{errors.numberOfPeople}</div>
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
                        rows={3}
                        placeholder="Ví dụ: Bữa ăn chay, đón tại điểm hẹn, ..."
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        maxLength={500}
                        disabled={submitting}
                      />
                    </div>

                    <div className="card border-0 rounded-4 p-3 mb-4" style={{ backgroundColor: '#f0f7ff', border: '1px solid #cce5ff' }}>
                      <div className="d-flex align-items-center gap-2 mb-2 text-primary fw-bold">
                        <i className="bi bi-shield-check fs-5"></i>
                        <span>Quy định giữ chỗ &amp; hủy tour</span>
                      </div>
                      <div className="small text-secondary mb-3 lh-base">
                        {tour.cancellationPolicy ? (
                          <p className="mb-0" style={{ whiteSpace: 'pre-line' }}>{tour.cancellationPolicy}</p>
                        ) : (
                          <ul className="mb-0 ps-3">
                            <li>Đơn đặt sẽ được chuyển tới nhà cung cấp để xác nhận giữ chỗ theo lịch khởi hành.</li>
                            <li>Quý khách có thể tự hủy đặt tour miễn phí trước thời điểm khởi hành tối thiểu 48 giờ.</li>
                            <li>Hủy trong vòng 48 giờ trước ngày khởi hành: Vui lòng liên hệ trực tiếp nhà cung cấp để được hỗ trợ.</li>
                          </ul>
                        )}
                      </div>
                      <div className="form-check">
                        <input
                          id="agreePolicy"
                          type="checkbox"
                          className={`form-check-input ${errors.agreePolicy ? 'is-invalid' : ''}`}
                          checked={agreePolicy}
                          onChange={(e) => {
                            setAgreePolicy(e.target.checked);
                            clearError('agreePolicy');
                          }}
                          disabled={submitting}
                        />
                        <label htmlFor="agreePolicy" className="form-check-label small fw-medium text-dark user-select-none">
                          Tôi đã đọc và đồng ý với các quy định hủy chỗ &amp; điều khoản đặt tour <span className="text-danger">(*)</span>
                        </label>
                        {errors.agreePolicy && (
                          <div className="invalid-feedback d-block mt-1">{errors.agreePolicy}</div>
                        )}
                      </div>
                    </div>

                    <div className="pt-2">
                      <button
                        type="submit"
                        className="btn btn-primary rounded-pill w-100 py-2.5 fw-semibold shadow-sm d-flex align-items-center justify-content-center gap-2"
                        disabled={submitting || departures.length === 0}
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

            {/* Cột phải: Tóm tắt đơn đặt */}
            <div className="col-lg-5">
              <div className="card border-0 shadow-sm rounded-4 sticky-sidebar" style={{ top: '88px', zIndex: 10 }}>
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
                    <span className="text-muted small">Đơn giá / người</span>
                    <span className="fw-medium text-dark">
                      {formatPrice(unitPrice)}
                      {selectedDeparture && selectedDeparture.price && selectedDeparture.price !== tour.price && (
                        <span className="badge bg-info-subtle text-info ms-1 small">Giá lịch</span>
                      )}
                    </span>
                  </div>

                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <span className="text-muted small">Số lượng hành khách</span>
                    <span className="fw-medium text-dark">{numberOfPeople} người</span>
                  </div>

                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <span className="text-muted small">Lịch khởi hành</span>
                    <span className="fw-semibold text-primary">
                      {selectedDeparture
                        ? formatDate(selectedDeparture.departureDate)
                        : (departureDate ? formatDate(departureDate) : 'Chưa chọn')}
                    </span>
                  </div>

                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <span className="text-muted small">Số chỗ còn trống</span>
                    <span className={`fw-medium ${availableSeats > 0 ? 'text-success' : 'text-danger'}`}>
                      {selectedDeparture ? `${availableSeats} chỗ` : 'Chưa chọn'}
                    </span>
                  </div>

                  <hr />

                  <div className="d-flex justify-content-between align-items-center">
                    <span className="fw-bold fs-6">Tổng cộng</span>
                    <span className="fw-bold text-primary fs-5">{formatPrice(totalPrice)}</span>
                  </div>

                  <div className="mt-3 p-3 bg-light rounded-3">
                    <p className="small text-muted mb-0">
                      <i className="bi bi-info-circle me-1 text-primary"></i>
                      Đơn đặt sẽ được giữ chỗ theo đợt khởi hành đã chọn. Nhà cung cấp sẽ liên hệ xác nhận trong thời gian sớm nhất.
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
