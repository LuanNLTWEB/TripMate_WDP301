import { useState, useEffect } from 'react';
import { itineraryApi } from '../services/api';
import { useToast } from '../hooks/useToast';
import CustomDatePicker from '../components/CustomDatePicker';

const toDateInputString = (value) => {
  if (!value) return '';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
};

const validate = (values) => {
  const next = {};
  const title = (values.title || '').trim();
  if (!title) next.title = 'Vui lòng nhập tên lịch trình';
  else if (title.length < 3) next.title = 'Tên lịch trình phải có ít nhất 3 ký tự';
  else if (title.length > 120) next.title = 'Tên lịch trình không được vượt quá 120 ký tự';

  if (values.budget !== '' && values.budget !== undefined) {
    const num = Number(values.budget);
    if (isNaN(num) || num < 0) next.budget = 'Ngân sách không được âm';
    else if (num > 500000000) next.budget = 'Ngân sách tối đa là 500.000.000 VNĐ';
  }

  if (values.startDate && values.endDate && new Date(values.endDate) < new Date(values.startDate)) {
    next.endDate = 'Ngày kết thúc phải sau hoặc bằng ngày bắt đầu';
  }
  return next;
};

function EditItineraryModal({ open, onClose, itinerary, onUpdated }) {
  const toast = useToast();
  const [form, setForm] = useState({
    title: '',
    startDate: '',
    endDate: '',
    budget: ''
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (itinerary && open) {
      setForm({
        title: itinerary.title || '',
        startDate: toDateInputString(itinerary.startDate),
        endDate: toDateInputString(itinerary.endDate),
        budget: itinerary.budget !== undefined && itinerary.budget !== null ? String(itinerary.budget) : ''
      });
      setErrors({});
    }
  }, [itinerary, open]);

  if (!open || !itinerary) return null;

  const update = (name, value) => {
    setForm((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: undefined }));
  };

  const submit = async (event) => {
    event.preventDefault();
    const nextErrors = validate(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0 || saving) return;

    setSaving(true);
    try {
      const response = await itineraryApi.update(itinerary._id, {
        title: form.title.trim(),
        startDate: form.startDate ? new Date(form.startDate).toISOString() : null,
        endDate: form.endDate ? new Date(form.endDate).toISOString() : null,
        budget: form.budget === '' ? 0 : Number(form.budget)
      });
      toast.success(response.message || 'Cập nhật lịch trình thành công.');
      if (onUpdated) {
        onUpdated(response.itinerary);
      }
      onClose();
    } catch (requestError) {
      toast.error(requestError.message || 'Không thể cập nhật lịch trình.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="modal-backdrop fade show"></div>
      <div className="modal fade show d-block" tabIndex="-1" role="dialog" aria-modal="true">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content border-0 shadow">
            <div className="modal-header">
              <h5 className="modal-title fw-bold d-flex align-items-center gap-2">
                <i className="bi bi-pencil-square text-primary"></i>
                <span>Chỉnh sửa thông tin lịch trình</span>
              </h5>
              <button
                type="button"
                className="btn-close"
                onClick={onClose}
                disabled={saving}
                aria-label="Đóng"
              ></button>
            </div>
            <form onSubmit={submit} noValidate>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label fw-semibold" htmlFor="itinerary-edit-title">
                    Tên lịch trình <span className="text-danger">*</span>
                  </label>
                  <input
                    id="itinerary-edit-title"
                    className={`form-control ${errors.title ? 'is-invalid' : ''}`}
                    value={form.title}
                    onChange={(event) => update('title', event.target.value)}
                    maxLength={120}
                    placeholder="VD: Khám phá Phú Quốc 4N3Đ"
                    autoFocus
                  />
                  {errors.title && <div className="invalid-feedback d-block">{errors.title}</div>}
                </div>

                <div className="row g-2">
                  <div className="col-6">
                    <label className="form-label fw-semibold" htmlFor="itinerary-edit-start">Ngày bắt đầu</label>
                    <CustomDatePicker
                      id="itinerary-edit-start"
                      name="startDate"
                      value={form.startDate}
                      onChange={(event) => update('startDate', event.target.value)}
                    />
                    {errors.startDate && <div className="invalid-feedback d-block">{errors.startDate}</div>}
                  </div>
                  <div className="col-6">
                    <label className="form-label fw-semibold" htmlFor="itinerary-edit-end">Ngày kết thúc</label>
                    <CustomDatePicker
                      id="itinerary-edit-end"
                      name="endDate"
                      value={form.endDate}
                      min={form.startDate || undefined}
                      onChange={(event) => update('endDate', event.target.value)}
                    />
                    {errors.endDate && <div className="invalid-feedback d-block">{errors.endDate}</div>}
                  </div>
                </div>

                <div className="mt-3">
                  <label className="form-label fw-semibold" htmlFor="itinerary-edit-budget">Ngân sách dự kiến (VNĐ)</label>
                  <input
                    id="itinerary-edit-budget"
                    type="number"
                    min="0"
                    max="500000000"
                    step="50000"
                    className={`form-control ${errors.budget ? 'is-invalid' : ''}`}
                    value={form.budget}
                    onChange={(event) => update('budget', event.target.value)}
                    placeholder="VD: 5000000"
                  />
                  {errors.budget && <div className="invalid-feedback d-block">{errors.budget}</div>}
                  <div className="form-text small text-muted">
                    Đặt hạn mức ngân sách giúp kiểm soát chi tiêu cho toàn bộ chuyến đi.
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={onClose}
                  disabled={saving}
                >
                  Hủy
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>
                      Đang lưu...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-check-lg me-1"></i>
                      Lưu thay đổi
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

export default EditItineraryModal;
