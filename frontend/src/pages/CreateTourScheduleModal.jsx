import { useState } from 'react';
import { tourApi } from '../services/api';
import { useToast } from '../hooks/useToast';

const MEAL_OPTIONS = ['Sáng', 'Trưa', 'Tối'];

export default function CreateTourScheduleModal({
  open,
  onClose,
  tourId,
  suggestedDay,
  schedule = null,
  onSaved
}) {
  const toast = useToast();
  const initialDay = schedule?.day || suggestedDay || 1;
  const [day, setDay] = useState(initialDay);
  const [title, setTitle] = useState(schedule?.title || `Ngày ${initialDay}: `);
  const [description, setDescription] = useState(schedule?.description || '');
  const [meals, setMeals] = useState(schedule?.meals || ['Sáng', 'Trưa']);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  const toggleMeal = (meal) => {
    setMeals((prev) => (prev.includes(meal) ? prev.filter((m) => m !== meal) : [...prev, meal]));
  };

  const validate = () => {
    const errs = {};
    if (!title.trim()) {
      errs.title = 'Vui lòng nhập tiêu đề lịch trình ngày';
    } else if (title.trim().length < 3) {
      errs.title = 'Tiêu đề lịch trình phải có ít nhất 3 ký tự';
    } else if (title.trim().length > 150) {
      errs.title = 'Tiêu đề lịch trình không được vượt quá 150 ký tự';
    }

    if (!description.trim()) {
      errs.description = 'Vui lòng nhập mô tả hoạt động chi tiết trong ngày';
    } else if (description.trim().length < 5) {
      errs.description = 'Mô tả hoạt động phải có ít nhất 5 ký tự';
    } else if (description.trim().length > 2000) {
      errs.description = 'Mô tả hoạt động không được vượt quá 2000 ký tự';
    }

    if (!day || Number(day) < 1) {
      errs.day = 'Số ngày phải từ 1 trở lên';
    }

    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0 || submitting) return;

    setSubmitting(true);
    try {
      const payload = {
        day: Number(day),
        title: title.trim(),
        description: description.trim(),
        meals
      };

      const res = schedule?._id
        ? await tourApi.updateSchedule(tourId, schedule._id, payload)
        : await tourApi.createSchedule(tourId, payload);
      toast.success(res.message || (schedule
        ? `Đã cập nhật lịch trình Ngày ${day}!`
        : `Đã thêm lịch trình Ngày ${day} thành công!`));
      if (onSaved) {
        onSaved(res.data, res.itinerary);
      }
      onClose();
    } catch (err) {
      toast.error(err.message || `Không thể ${schedule ? 'cập nhật' : 'tạo'} lịch trình tour.`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="modal-backdrop fade show" style={{ zIndex: 1060 }}></div>
      <div className="modal fade show d-block" tabIndex="-1" role="dialog" aria-modal="true" style={{ zIndex: 1065 }}>
        <div className="modal-dialog modal-dialog-centered modal-lg">
          <div className="modal-content border-0 shadow">
            <div className="modal-header">
              <h5 className="modal-title fw-bold text-dark d-flex align-items-center gap-2">
                <i className={`bi ${schedule ? 'bi-pencil-square' : 'bi-calendar-plus'} text-primary`}></i>
                <span>{schedule ? 'Cập Nhật Ngày Lịch Trình' : 'Tạo Lịch Trình Tour'}</span>
              </h5>
              <button
                type="button"
                className="btn-close"
                onClick={onClose}
                disabled={submitting}
                aria-label="Đóng"
              ></button>
            </div>
            <form onSubmit={handleSubmit} noValidate>
              <div className="modal-body p-4">
                <div className="row g-3">
                  <div className="col-md-3">
                    <label htmlFor="schedule-day" className="form-label fw-semibold">
                      Thứ tự ngày <span className="text-danger">*</span>
                    </label>
                    <div className="input-group">
                      <span className="input-group-text bg-light fw-medium">Ngày</span>
                      <input
                        id="schedule-day"
                        type="number"
                        min="1"
                        max="30"
                        className={`form-control ${errors.day ? 'is-invalid' : ''}`}
                        value={day}
                        onChange={(e) => {
                          const val = e.target.value;
                          setDay(val);
                          if (title.startsWith('Ngày ')) {
                            setTitle(`Ngày ${val}: ${title.replace(/^Ngày \d+:\s*/, '')}`);
                          }
                        }}
                        disabled={submitting}
                      />
                    </div>
                    {errors.day && <div className="invalid-feedback d-block">{errors.day}</div>}
                  </div>

                  <div className="col-md-9">
                    <label htmlFor="schedule-title" className="form-label fw-semibold">
                      Tiêu đề chặng / ngày hành trình <span className="text-danger">*</span>
                    </label>
                    <input
                      id="schedule-title"
                      type="text"
                      className={`form-control ${errors.title ? 'is-invalid' : ''}`}
                      placeholder="VD: Ngày 1: Đón sân bay Đà Nẵng - Bán đảo Sơn Trà - Phố cổ Hội An"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      maxLength={150}
                      disabled={submitting}
                      autoFocus
                    />
                    {errors.title && <div className="invalid-feedback d-block">{errors.title}</div>}
                  </div>

                  <div className="col-12">
                    <label htmlFor="schedule-description" className="form-label fw-semibold">
                      Mô tả chi tiết hoạt động trong ngày <span className="text-danger">*</span>
                    </label>
                    <textarea
                      id="schedule-description"
                      rows={5}
                      className={`form-control ${errors.description ? 'is-invalid' : ''}`}
                      placeholder="Chi tiết lịch trình theo mốc thời gian:&#10;- 08:00: Xe và HDV đón quý khách tại điểm hẹn&#10;- 10:30: Khởi hành tham quan...&#10;- 12:00: Dùng cơm trưa tại nhà hàng&#10;- 14:30: Tự do khám phá, chụp ảnh check-in&#10;- 18:30: Thưởng thức bữa tối và nghỉ ngơi"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      maxLength={2000}
                      disabled={submitting}
                    ></textarea>
                    {errors.description && <div className="invalid-feedback d-block">{errors.description}</div>}
                    <div className="form-text small text-muted text-end">
                      {description.length}/2000 ký tự
                    </div>
                  </div>

                  <div className="col-12">
                    <label className="form-label fw-semibold d-block">
                      Chế độ ăn uống trong ngày (Bữa ăn bao gồm)
                    </label>
                    <div className="d-flex align-items-center gap-3">
                      {MEAL_OPTIONS.map((meal) => {
                        const checked = meals.includes(meal);
                        return (
                          <button
                            key={meal}
                            type="button"
                            className={`btn btn-sm d-inline-flex align-items-center gap-1 ${
                              checked ? 'btn-primary' : 'btn-outline-secondary'
                            }`}
                            onClick={() => toggleMeal(meal)}
                            disabled={submitting}
                          >
                            <i className={`bi bi-${checked ? 'check-circle-fill' : 'circle'}`}></i>
                            <span>Bữa {meal}</span>
                          </button>
                        );
                      })}
                    </div>
                    <small className="text-muted mt-1 d-block">
                      Chọn các bữa ăn đã được bao gồm trong giá tour của ngày này.
                    </small>
                  </div>
                </div>
              </div>
              <div className="modal-footer bg-light">
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={onClose}
                  disabled={submitting}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="btn btn-primary d-inline-flex align-items-center gap-2"
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <span className="spinner-border spinner-border-sm" aria-hidden="true"></span>
                      <span>Đang lưu lịch trình...</span>
                    </>
                  ) : (
                    <>
                      <i className={`bi ${schedule ? 'bi-check2-circle' : 'bi-calendar-plus'}`}></i>
                      <span>{schedule ? 'Lưu thay đổi' : 'Lưu ngày lịch trình'}</span>
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
