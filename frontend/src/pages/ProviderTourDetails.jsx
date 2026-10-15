import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { tourApi } from '../services/api';
import { useToast } from '../hooks/useToast';

const INCLUDED_SUGGESTIONS = [
  'Xe du lịch đời mới máy lạnh theo chương trình',
  'Khách sạn tiêu chuẩn tiện nghi (2-3 khách/phòng)',
  'Các bữa ăn theo chương trình',
  'Vé tham quan tất cả các điểm trong lịch trình',
  'Hướng dẫn viên nhiệt tình, giàu kinh nghiệm',
  'Bảo hiểm du lịch mức bồi thường tối đa 50.000.000đ/vụ',
  'Nước uống tinh khiết 1 chai/người/ngày'
];

const EXCLUDED_SUGGESTIONS = [
  'Thuế VAT 8% - 10%',
  'Chi phí cá nhân ngoài chương trình (giặt ủi, điện thoại, minibar)',
  'Đồ uống có cồn, nước ngọt trong các bữa ăn',
  'Tiền bồi dưỡng (Tip) cho lái xe và hướng dẫn viên',
  'Vé cáp treo / máng trượt (nếu có ghi chú riêng)',
  'Phụ thu phòng đơn đối với khách đi một mình'
];

export default function ProviderTourDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [tour, setTour] = useState(null);

  // Form states
  const [activeTab, setActiveTab] = useState('itinerary'); // 'itinerary' | 'services' | 'policies'
  const [itinerary, setItinerary] = useState([]);
  const [includedServices, setIncludedServices] = useState([]);
  const [excludedServices, setExcludedServices] = useState([]);
  const [cancellationPolicy, setCancellationPolicy] = useState('');
  const [notes, setNotes] = useState('');

  // Service input temp
  const [newIncluded, setNewIncluded] = useState('');
  const [newExcluded, setNewExcluded] = useState('');

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    tourApi.getProviderById(id)
      .then((res) => {
        if (!isMounted) return;
        const data = res.data;
        setTour(data);
        setItinerary(data.itinerary && data.itinerary.length > 0 ? data.itinerary : [
          { day: 1, title: 'Ngày 1: Khởi hành & Đến điểm đến', description: '', meals: ['Trưa', 'Tối'] }
        ]);
        setIncludedServices(data.includedServices || []);
        setExcludedServices(data.excludedServices || []);
        setCancellationPolicy(data.cancellationPolicy || '');
        setNotes(data.notes || '');
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err.message || 'Không thể tải thông tin tour.');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [id]);

  // Itinerary handlers
  const handleAddDay = () => {
    const nextDay = itinerary.length + 1;
    setItinerary([
      ...itinerary,
      {
        day: nextDay,
        title: `Ngày ${nextDay}: Khám phá & Trải nghiệm`,
        description: '',
        meals: ['Sáng', 'Trưa']
      }
    ]);
  };

  const handleRemoveDay = (index) => {
    if (itinerary.length <= 1) {
      toast.warning('Tour phải có ít nhất lịch trình của 1 ngày.');
      return;
    }
    const updated = itinerary
      .filter((_, i) => i !== index)
      .map((item, idx) => ({ ...item, day: idx + 1 }));
    setItinerary(updated);
  };

  const handleDayChange = (index, field, value) => {
    const updated = [...itinerary];
    updated[index] = { ...updated[index], [field]: value };
    setItinerary(updated);
  };

  const handleToggleMeal = (dayIndex, meal) => {
    const currentMeals = itinerary[dayIndex].meals || [];
    const updatedMeals = currentMeals.includes(meal)
      ? currentMeals.filter((m) => m !== meal)
      : [...currentMeals, meal];
    handleDayChange(dayIndex, 'meals', updatedMeals);
  };

  // Included & Excluded services handlers
  const handleAddIncluded = (item) => {
    const trimmed = (item || newIncluded).trim();
    if (!trimmed) return;
    if (includedServices.includes(trimmed)) {
      toast.warning('Dịch vụ này đã có trong danh sách.');
      return;
    }
    setIncludedServices([...includedServices, trimmed]);
    setNewIncluded('');
  };

  const handleRemoveIncluded = (index) => {
    setIncludedServices(includedServices.filter((_, i) => i !== index));
  };

  const handleAddExcluded = (item) => {
    const trimmed = (item || newExcluded).trim();
    if (!trimmed) return;
    if (excludedServices.includes(trimmed)) {
      toast.warning('Dịch vụ này đã có trong danh sách.');
      return;
    }
    setExcludedServices([...excludedServices, trimmed]);
    setNewExcluded('');
  };

  const handleRemoveExcluded = (index) => {
    setExcludedServices(excludedServices.filter((_, i) => i !== index));
  };

  // Submit Handler
  const handleSave = async () => {
    // Validate itinerary
    for (let i = 0; i < itinerary.length; i++) {
      const day = itinerary[i];
      if (!day.title.trim()) {
        toast.error(`Vui lòng nhập tiêu đề cho Ngày ${i + 1}`);
        setActiveTab('itinerary');
        return;
      }
      if (!day.description.trim()) {
        toast.error(`Vui lòng nhập mô tả hoạt động cho Ngày ${i + 1}`);
        setActiveTab('itinerary');
        return;
      }
    }

    setSaving(true);
    try {
      const payload = {
        itinerary,
        includedServices,
        excludedServices,
        cancellationPolicy: cancellationPolicy.trim(),
        notes: notes.trim()
      };

      const res = await tourApi.setDetails(id, payload);
      toast.success(res.message || 'Đã lưu thiết lập chi tiết tour thành công!');
      navigate(`/tours/${id}`);
    } catch (err) {
      toast.error(err.message || 'Không thể lưu thiết lập chi tiết tour.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <main className="container py-5 text-center" style={{ minHeight: '70vh' }}>
          <div className="spinner-border text-primary my-5" role="status">
            <span className="visually-hidden">Đang tải...</span>
          </div>
          <p className="text-muted">Đang tải thông tin tour...</p>
        </main>
        <Footer />
      </>
    );
  }

  if (error || !tour) {
    return (
      <>
        <Navbar />
        <main className="container py-5" style={{ minHeight: '70vh' }}>
          <div className="alert alert-danger shadow-sm">{error || 'Không tìm thấy tour.'}</div>
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
      <main className="bg-light py-4 py-md-5" style={{ minHeight: '85vh' }}>
        <div className="container" style={{ maxWidth: '1000px' }}>
          
          {/* Breadcrumbs & Header */}
          <div className="mb-4">
            <Link to={`/tours/${tour._id}`} className="text-decoration-none text-muted small d-inline-flex align-items-center mb-2">
              <i className="bi bi-arrow-left me-1"></i> Quay lại chi tiết tour
            </Link>
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
              <div>
                <h1 className="h3 fw-bold mb-1">Thiết lập chi tiết Tour</h1>
                <p className="text-muted small mb-0">
                  Cấu hình lịch trình chi tiết theo từng ngày, dịch vụ bao gồm/không bao gồm và chính sách hoàn hủy.
                </p>
              </div>
              <button
                type="button"
                className="btn btn-primary rounded-pill px-4 py-2 shadow-sm d-flex align-items-center gap-2"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <>
                    <span className="spinner-border spinner-border-sm" aria-hidden="true"></span>
                    <span>Đang lưu...</span>
                  </>
                ) : (
                  <>
                    <i className="bi bi-check2-circle fs-5"></i>
                    <span>Lưu thiết lập</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Tour Summary Card */}
          <div className="card border-0 shadow-sm rounded-4 mb-4 overflow-hidden">
            <div className="card-body p-3 p-md-4">
              <div className="d-flex align-items-center gap-3">
                {tour.images?.[0] ? (
                  <img
                    src={tour.images[0]}
                    alt={tour.title}
                    className="rounded-3 shadow-sm object-fit-cover"
                    style={{ width: '85px', height: '85px' }}
                  />
                ) : (
                  <div className="bg-secondary-subtle rounded-3 d-flex align-items-center justify-content-center text-muted" style={{ width: '85px', height: '85px' }}>
                    <i className="bi bi-image fs-3"></i>
                  </div>
                )}
                <div className="flex-grow-1 min-w-0">
                  <div className="d-flex align-items-center gap-2 mb-1 flex-wrap">
                    <span className="badge text-bg-primary rounded-pill small">
                      {tour.categoryId?.name || 'Tour Du Lịch'}
                    </span>
                    <span className={`badge rounded-pill small ${
                      tour.status === 'active' ? 'text-bg-success' :
                      tour.status === 'pending' ? 'text-bg-warning' :
                      tour.status === 'needs_revision' ? 'text-bg-info' : 'text-bg-secondary'
                    }`}>
                      {tour.status === 'active' ? 'Đang hoạt động' :
                       tour.status === 'pending' ? 'Chờ kiểm duyệt' :
                       tour.status === 'needs_revision' ? 'Cần chỉnh sửa' : tour.status}
                    </span>
                  </div>
                  <h5 className="fw-bold text-dark text-truncate mb-1">{tour.title}</h5>
                  <div className="d-flex align-items-center gap-3 text-muted small flex-wrap">
                    <span>
                      <i className="bi bi-geo-alt text-danger me-1"></i>
                      {tour.departureLocation} → {tour.destinationLocation || tour.location}
                    </span>
                    <span>
                      <i className="bi bi-clock me-1"></i>
                      {tour.duration}
                    </span>
                    <span className="text-primary fw-semibold">
                      {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(tour.price)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <ul className="nav nav-pills nav-fill bg-white p-2 rounded-4 shadow-sm mb-4 border">
            <li className="nav-item">
              <button
                type="button"
                className={`nav-link rounded-3 py-2.5 fw-semibold d-flex align-items-center justify-content-center gap-2 ${activeTab === 'itinerary' ? 'active' : 'text-dark'}`}
                onClick={() => setActiveTab('itinerary')}
              >
                <i className="bi bi-calendar-range fs-5"></i>
                <span>1. Lịch trình từng ngày ({itinerary.length} ngày)</span>
              </button>
            </li>
            <li className="nav-item">
              <button
                type="button"
                className={`nav-link rounded-3 py-2.5 fw-semibold d-flex align-items-center justify-content-center gap-2 ${activeTab === 'services' ? 'active' : 'text-dark'}`}
                onClick={() => setActiveTab('services')}
              >
                <i className="bi bi-check-circle-fill fs-5"></i>
                <span>2. Dịch vụ bao gồm & Không bao gồm</span>
              </button>
            </li>
            <li className="nav-item">
              <button
                type="button"
                className={`nav-link rounded-3 py-2.5 fw-semibold d-flex align-items-center justify-content-center gap-2 ${activeTab === 'policies' ? 'active' : 'text-dark'}`}
                onClick={() => setActiveTab('policies')}
              >
                <i className="bi bi-shield-check fs-5"></i>
                <span>3. Chính sách & Lưu ý</span>
              </button>
            </li>
          </ul>

          {/* Tab 1: Itinerary Builder */}
          {activeTab === 'itinerary' && (
            <div className="card border-0 shadow-sm rounded-4 p-4 mb-4">
              <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
                <div>
                  <h4 className="fw-bold mb-1">Lịch trình chi tiết theo ngày</h4>
                  <p className="text-muted small mb-0">Mô tả cụ thể hoạt động và các bữa ăn cho từng ngày của chuyến đi.</p>
                </div>
                <button
                  type="button"
                  className="btn btn-outline-primary rounded-pill btn-sm px-3 py-2 d-inline-flex align-items-center gap-1 shadow-sm"
                  onClick={handleAddDay}
                >
                  <i className="bi bi-plus-lg"></i>
                  <span>Thêm ngày tiếp theo</span>
                </button>
              </div>

              <div className="d-flex flex-column gap-3">
                {itinerary.map((item, index) => (
                  <div key={index} className="card border rounded-4 p-3 p-md-4 bg-light-subtle">
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <div className="d-flex align-items-center gap-2">
                        <span className="badge bg-primary text-white fs-6 px-3 py-2 rounded-pill">
                          Ngày {item.day}
                        </span>
                        <span className="text-muted small fw-medium">Chặng {index + 1} của tour</span>
                      </div>
                      {itinerary.length > 1 && (
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-danger border-0 rounded-circle"
                          title={`Xóa Ngày ${item.day}`}
                          onClick={() => handleRemoveDay(index)}
                        >
                          <i className="bi bi-trash3 fs-5"></i>
                        </button>
                      )}
                    </div>

                    <div className="mb-3">
                      <label className="form-label small fw-semibold text-secondary">
                        Tiêu đề ngày <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        className="form-control rounded-3"
                        placeholder="Ví dụ: Ngày 1: Đón khách tại Hà Nội - Khám phá Bản Cát Cát"
                        value={item.title}
                        onChange={(e) => handleDayChange(index, 'title', e.target.value)}
                      />
                    </div>

                    <div className="mb-3">
                      <label className="form-label small fw-semibold text-secondary">
                        Mô tả hoạt động chi tiết trong ngày <span className="text-danger">*</span>
                      </label>
                      <textarea
                        className="form-control rounded-3"
                        rows={3}
                        placeholder="Mô tả cụ thể thời gian, các điểm tham quan, trải nghiệm và lưu ý của ngày này..."
                        value={item.description}
                        onChange={(e) => handleDayChange(index, 'description', e.target.value)}
                      ></textarea>
                    </div>

                    <div>
                      <label className="form-label small fw-semibold text-secondary d-block mb-2">
                        Bữa ăn bao gồm trong ngày:
                      </label>
                      <div className="d-flex align-items-center gap-3">
                        {['Sáng', 'Trưa', 'Tối'].map((meal) => {
                          const isChecked = (item.meals || []).includes(meal);
                          return (
                            <label
                              key={meal}
                              className={`btn btn-sm rounded-pill px-3 py-1.5 cursor-pointer d-flex align-items-center gap-1.5 ${
                                isChecked ? 'btn-primary text-white shadow-sm' : 'btn-outline-secondary'
                              }`}
                            >
                              <input
                                type="checkbox"
                                className="d-none"
                                checked={isChecked}
                                onChange={() => handleToggleMeal(index, meal)}
                              />
                              <i className={`bi ${isChecked ? 'bi-check-circle-fill' : 'bi-circle'}`}></i>
                              <span>Bữa {meal}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 pt-3 text-center border-top">
                <button
                  type="button"
                  className="btn btn-outline-primary rounded-pill px-4 py-2"
                  onClick={handleAddDay}
                >
                  <i className="bi bi-plus-lg me-1"></i> Thêm ngày tiếp theo
                </button>
              </div>
            </div>
          )}

          {/* Tab 2: Services Included & Excluded */}
          {activeTab === 'services' && (
            <div className="row g-4 mb-4">
              {/* Included Services */}
              <div className="col-lg-6">
                <div className="card border-0 shadow-sm rounded-4 p-4 h-100">
                  <div className="d-flex align-items-center gap-2 mb-3">
                    <div className="rounded-circle bg-success-subtle p-2 text-success">
                      <i className="bi bi-check-lg fs-5"></i>
                    </div>
                    <div>
                      <h5 className="fw-bold mb-0 text-success">Dịch vụ bao gồm</h5>
                      <span className="small text-muted">{includedServices.length} quyền lợi đã chọn</span>
                    </div>
                  </div>

                  <div className="input-group mb-3">
                    <input
                      type="text"
                      className="form-control rounded-start-3"
                      placeholder="Nhập dịch vụ bao gồm..."
                      value={newIncluded}
                      onChange={(e) => setNewIncluded(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddIncluded();
                        }
                      }}
                    />
                    <button
                      type="button"
                      className="btn btn-success rounded-end-3 px-3"
                      onClick={() => handleAddIncluded()}
                    >
                      <i className="bi bi-plus-lg me-1"></i> Thêm
                    </button>
                  </div>

                  {/* List of included services */}
                  <div className="d-flex flex-column gap-2 mb-3" style={{ maxHeight: '280px', overflowY: 'auto' }}>
                    {includedServices.length === 0 ? (
                      <div className="text-center py-4 text-muted small bg-light rounded-3">
                        <i className="bi bi-inbox fs-4 d-block mb-1"></i>
                        Chưa có dịch vụ bao gồm nào. Chọn gợi ý bên dưới hoặc tự nhập.
                      </div>
                    ) : (
                      includedServices.map((service, idx) => (
                        <div key={idx} className="d-flex justify-content-between align-items-center p-2.5 rounded-3 bg-success-subtle border border-success-subtle text-dark small">
                          <div className="d-flex align-items-center gap-2 min-w-0">
                            <i className="bi bi-check-circle-fill text-success flex-shrink-0"></i>
                            <span className="text-break">{service}</span>
                          </div>
                          <button
                            type="button"
                            className="btn btn-sm btn-link text-danger p-0 ms-2"
                            title="Xóa"
                            onClick={() => handleRemoveIncluded(idx)}
                          >
                            <i className="bi bi-x-lg"></i>
                          </button>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Suggestions */}
                  <div className="pt-3 border-top mt-auto">
                    <span className="small fw-semibold text-secondary d-block mb-2">
                      <i className="bi bi-lightning-charge text-warning me-1"></i> Gợi ý phổ biến (bấm để thêm):
                    </span>
                    <div className="d-flex flex-wrap gap-1.5">
                      {INCLUDED_SUGGESTIONS.map((sug, i) => (
                        <button
                          key={i}
                          type="button"
                          className="btn btn-sm btn-outline-secondary rounded-pill py-1 px-2.5 small"
                          style={{ fontSize: '0.75rem' }}
                          onClick={() => handleAddIncluded(sug)}
                        >
                          + {sug}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Excluded Services */}
              <div className="col-lg-6">
                <div className="card border-0 shadow-sm rounded-4 p-4 h-100">
                  <div className="d-flex align-items-center gap-2 mb-3">
                    <div className="rounded-circle bg-danger-subtle p-2 text-danger">
                      <i className="bi bi-x-lg fs-5"></i>
                    </div>
                    <div>
                      <h5 className="fw-bold mb-0 text-danger">Dịch vụ không bao gồm</h5>
                      <span className="small text-muted">{excludedServices.length} khoản loại trừ</span>
                    </div>
                  </div>

                  <div className="input-group mb-3">
                    <input
                      type="text"
                      className="form-control rounded-start-3"
                      placeholder="Nhập dịch vụ không bao gồm..."
                      value={newExcluded}
                      onChange={(e) => setNewExcluded(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddExcluded();
                        }
                      }}
                    />
                    <button
                      type="button"
                      className="btn btn-danger rounded-end-3 px-3"
                      onClick={() => handleAddExcluded()}
                    >
                      <i className="bi bi-plus-lg me-1"></i> Thêm
                    </button>
                  </div>

                  {/* List of excluded services */}
                  <div className="d-flex flex-column gap-2 mb-3" style={{ maxHeight: '280px', overflowY: 'auto' }}>
                    {excludedServices.length === 0 ? (
                      <div className="text-center py-4 text-muted small bg-light rounded-3">
                        <i className="bi bi-inbox fs-4 d-block mb-1"></i>
                        Chưa có dịch vụ loại trừ nào. Chọn gợi ý bên dưới hoặc tự nhập.
                      </div>
                    ) : (
                      excludedServices.map((service, idx) => (
                        <div key={idx} className="d-flex justify-content-between align-items-center p-2.5 rounded-3 bg-danger-subtle border border-danger-subtle text-dark small">
                          <div className="d-flex align-items-center gap-2 min-w-0">
                            <i className="bi bi-x-circle-fill text-danger flex-shrink-0"></i>
                            <span className="text-break">{service}</span>
                          </div>
                          <button
                            type="button"
                            className="btn btn-sm btn-link text-danger p-0 ms-2"
                            title="Xóa"
                            onClick={() => handleRemoveExcluded(idx)}
                          >
                            <i className="bi bi-x-lg"></i>
                          </button>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Suggestions */}
                  <div className="pt-3 border-top mt-auto">
                    <span className="small fw-semibold text-secondary d-block mb-2">
                      <i className="bi bi-lightning-charge text-warning me-1"></i> Gợi ý phổ biến (bấm để thêm):
                    </span>
                    <div className="d-flex flex-wrap gap-1.5">
                      {EXCLUDED_SUGGESTIONS.map((sug, i) => (
                        <button
                          key={i}
                          type="button"
                          className="btn btn-sm btn-outline-secondary rounded-pill py-1 px-2.5 small"
                          style={{ fontSize: '0.75rem' }}
                          onClick={() => handleAddExcluded(sug)}
                        >
                          + {sug}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 3: Policies & Notes */}
          {activeTab === 'policies' && (
            <div className="d-flex flex-column gap-4 mb-4">
              {/* Cancellation Policy */}
              <div className="card border-0 shadow-sm rounded-4 p-4">
                <div className="d-flex align-items-center gap-2 mb-3">
                  <i className="bi bi-arrow-repeat text-primary fs-4"></i>
                  <div>
                    <h5 className="fw-bold mb-0">Chính sách hoàn hủy tour</h5>
                    <span className="small text-muted">Quy định hoàn tiền và phí phạt khi khách hàng hủy tour</span>
                  </div>
                </div>
                <textarea
                  className="form-control rounded-3"
                  rows={5}
                  placeholder="Nhập điều khoản hoàn hủy tour chi tiết theo từng mốc thời gian..."
                  value={cancellationPolicy}
                  onChange={(e) => setCancellationPolicy(e.target.value)}
                ></textarea>
              </div>

              {/* Notes */}
              <div className="card border-0 shadow-sm rounded-4 p-4">
                <div className="d-flex align-items-center gap-2 mb-3">
                  <i className="bi bi-exclamation-triangle text-warning fs-4"></i>
                  <div>
                    <h5 className="fw-bold mb-0">Lưu ý & Quy định tham gia tour</h5>
                    <span className="small text-muted">Yêu cầu giấy tờ tùy thân, sức khỏe, thời gian tập trung</span>
                  </div>
                </div>
                <textarea
                  className="form-control rounded-3"
                  rows={5}
                  placeholder="Nhập các lưu ý quan trọng mà khách hàng cần nắm trước khi tham gia tour..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                ></textarea>
              </div>
            </div>
          )}

          {/* Bottom Save Bar */}
          <div className="card border-0 shadow-sm rounded-4 p-3 d-flex flex-row justify-content-between align-items-center bg-white sticky-bottom mb-4">
            <Link to={`/tours/${tour._id}`} className="btn btn-outline-secondary rounded-pill px-4">
              Hủy bỏ
            </Link>
            <button
              type="button"
              className="btn btn-primary rounded-pill px-4 py-2 d-flex align-items-center gap-2 shadow-sm"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? (
                <>
                  <span className="spinner-border spinner-border-sm" aria-hidden="true"></span>
                  <span>Đang lưu...</span>
                </>
              ) : (
                <>
                  <i className="bi bi-check2-circle fs-5"></i>
                  <span>Lưu tất cả chi tiết tour</span>
                </>
              )}
            </button>
          </div>

        </div>
      </main>
      <Footer />
    </>
  );
}
