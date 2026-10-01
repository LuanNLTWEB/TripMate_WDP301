import { useState } from 'react';
import { itineraryApi } from '../services/api';
import { useToast } from '../hooks/useToast';

const initialForm = { title: '', startDate: '', endDate: '', budget: '' };

const validate = (values) => {
  const next = {};
  const title = values.title.trim();
  if (!title) next.title = 'Vui lòng nhập tên lịch trình';
  else if (title.length < 3) next.title = 'Tên lịch trình phải có ít nhất 3 ký tự';
  if (values.budget && Number(values.budget) < 0) next.budget = 'Ngân sách không được âm';
  if (values.startDate && values.endDate && new Date(values.endDate) < new Date(values.startDate)) {
    next.endDate = 'Ngày kết thúc phải sau ngày bắt đầu';
  }
  return next;
};

function CreateItineraryModal({ open, onClose, onCreated }) {
  const toast = useToast();
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  if (!open) return null;

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
      const response = await itineraryApi.create({
        title: form.title.trim(),
        startDate: form.startDate || undefined,
        endDate: form.endDate || undefined,
        budget: form.budget === '' ? undefined : Number(form.budget)
      });
      onCreated(response.itinerary);
      setForm(initialForm);
      setErrors({});
      toast.success('Đã tạo lịch trình mới.');
      onClose();
    } catch (requestError) {
      toast.error(requestError.message || 'Không thể tạo lịch trình.');
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
              <h5 className="modal-title fw-bold">Tạo lịch trình mới</h5>
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
                  <label className="form-label fw-semibold" htmlFor="itinerary-create-title">Tên lịch trình</label>
                  <input
                    id="itinerary-create-title"
                    className={`form-control ${errors.title ? 'is-invalid' : ''}`}
                    value={form.title}
                    onChange={(event) => update('title', event.target.value)}
                    maxLength={120}
                    placeholder="VD: Đà Nẵng 3 ngày"
                    autoFocus
                  />
                  {errors.title && <div className="invalid-feedback d-block">{errors.title}</div>}
                </div>

                <div className="row g-2">
                  <div className="col-6">
                    <label className="form-label" htmlFor="itinerary-create-start">Ngày bắt đầu</label>
                    <input
                      id="itinerary-create-start"
                      type="date"
                      className="form-control"
                      value={form.startDate}
                      onChange={(event) => update('startDate', event.target.value)}
                    />
                  </div>
                  <div className="col-6">
                    <label className="form-label" htmlFor="itinerary-create-end">Ngày kết thúc</label>
                    <input
                      id="itinerary-create-end"
                      type="date"
                      className={`form-control ${errors.endDate ? 'is-invalid' : ''}`}
                      value={form.endDate}
                      onChange={(event) => update('endDate', event.target.value)}
                    />
                    {errors.endDate && <div className="invalid-feedback d-block">{errors.endDate}</div>}
                  </div>
                </div>

                <div className="mt-3">
                  <label className="form-label" htmlFor="itinerary-create-budget">Ngân sách dự kiến (VNĐ)</label>
                  <input
                    id="itinerary-create-budget"
                    type="number"
                    min="0"
                    className={`form-control ${errors.budget ? 'is-invalid' : ''}`}
                    value={form.budget}
                    onChange={(event) => update('budget', event.target.value)}
                    placeholder="2000000"
                  />
                  {errors.budget && <div className="invalid-feedback d-block">{errors.budget}</div>}
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
                      Đang tạo...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-calendar-plus me-1"></i>
                      Tạo lịch trình
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

export default CreateItineraryModal;
