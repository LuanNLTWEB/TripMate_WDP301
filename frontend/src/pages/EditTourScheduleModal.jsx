import { useEffect, useState } from 'react';
import { tourApi } from '../services/api';
import { useToast } from '../hooks/useToast';

const MEAL_OPTIONS = ['Sáng', 'Trưa', 'Tối'];

export default function EditTourScheduleModal({ open, onClose, tourId, schedule, onUpdated }) {
  const toast = useToast();
  const [form, setForm] = useState({ day: 1, title: '', description: '', meals: [] });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open && schedule) {
      setForm({
        day: schedule.day || 1,
        title: schedule.title || '',
        description: schedule.description || '',
        meals: schedule.meals || []
      });
      setErrors({});
    }
  }, [open, schedule]);

  if (!open || !schedule) return null;

  const toggleMeal = (meal) => {
    setForm((current) => ({
      ...current,
      meals: current.meals.includes(meal)
        ? current.meals.filter((item) => item !== meal)
        : [...current.meals, meal]
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const nextErrors = {};
    if (!Number.isInteger(Number(form.day)) || Number(form.day) < 1) nextErrors.day = 'Day must be a positive integer.';
    if (!form.title.trim()) nextErrors.title = 'Title is required.';
    if (!form.description.trim()) nextErrors.description = 'Description is required.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0 || submitting) return;

    setSubmitting(true);
    try {
      const response = await tourApi.updateSchedule(tourId, schedule._id, {
        day: Number(form.day),
        title: form.title.trim(),
        description: form.description.trim(),
        meals: form.meals
      });
      toast.success(response.message || 'Tour schedule updated successfully.');
      onUpdated?.(response.itinerary || []);
      onClose();
    } catch (error) {
      toast.error(error.message || 'Unable to update tour schedule.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="modal-backdrop fade show" style={{ zIndex: 1060 }}></div>
      <div className="modal fade show d-block" tabIndex="-1" role="dialog" aria-modal="true" style={{ zIndex: 1070 }}>
        <div className="modal-dialog modal-dialog-centered modal-lg">
          <div className="modal-content border-0 shadow">
            <div className="modal-header">
              <h2 className="modal-title h5 fw-bold">Update tour schedule</h2>
              <button type="button" className="btn-close" onClick={onClose} disabled={submitting} aria-label="Close"></button>
            </div>
            <form onSubmit={handleSubmit} noValidate>
              <div className="modal-body">
                <div className="row g-3">
                  <div className="col-md-3">
                    <label className="form-label fw-semibold" htmlFor="edit-schedule-day">Day</label>
                    <input id="edit-schedule-day" type="number" min="1" className={`form-control ${errors.day ? 'is-invalid' : ''}`} value={form.day} onChange={(event) => setForm((current) => ({ ...current, day: event.target.value }))} disabled={submitting} />
                    {errors.day && <div className="invalid-feedback">{errors.day}</div>}
                  </div>
                  <div className="col-md-9">
                    <label className="form-label fw-semibold" htmlFor="edit-schedule-title">Title</label>
                    <input id="edit-schedule-title" className={`form-control ${errors.title ? 'is-invalid' : ''}`} value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} disabled={submitting} />
                    {errors.title && <div className="invalid-feedback">{errors.title}</div>}
                  </div>
                  <div className="col-12">
                    <label className="form-label fw-semibold" htmlFor="edit-schedule-description">Description</label>
                    <textarea id="edit-schedule-description" rows="4" className={`form-control ${errors.description ? 'is-invalid' : ''}`} value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} disabled={submitting}></textarea>
                    {errors.description && <div className="invalid-feedback">{errors.description}</div>}
                  </div>
                  <div className="col-12">
                    <label className="form-label fw-semibold d-block">Meals</label>
                    <div className="d-flex gap-3 flex-wrap">
                      {MEAL_OPTIONS.map((meal) => (
                        <label className="form-check" key={meal}>
                          <input className="form-check-input" type="checkbox" checked={form.meals.includes(meal)} onChange={() => toggleMeal(meal)} disabled={submitting} />
                          <span className="form-check-label">{meal}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline-secondary" onClick={onClose} disabled={submitting}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? 'Saving...' : 'Save changes'}</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
