import { useEffect, useState } from 'react';
import { tourApi } from '../services/api';
import { useToast } from '../hooks/useToast';

const createForm = (tour) => ({
  title: tour?.title || '',
  description: tour?.description || '',
  location: tour?.location || '',
  departureLocation: tour?.departureLocation || '',
  destinationLocation: tour?.destinationLocation || '',
  duration: tour?.duration || ''
});

export default function EditTourModal({ open, onClose, tour, onUpdated }) {
  const toast = useToast();
  const [form, setForm] = useState(createForm(tour));
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(createForm(tour));
      setErrors({});
    }
  }, [open, tour]);

  if (!open || !tour) return null;

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: '' }));
  };

  const validate = () => {
    const nextErrors = {};
    ['title', 'description', 'location', 'departureLocation', 'destinationLocation', 'duration'].forEach((field) => {
      if (!form[field].trim()) nextErrors[field] = 'This field is required.';
    });
    if (form.title.trim().length > 100) nextErrors.title = 'Title cannot exceed 100 characters.';
    return nextErrors;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0 || submitting) return;

    setSubmitting(true);
    try {
      const response = await tourApi.update(tour._id, Object.fromEntries(
        Object.entries(form).map(([key, value]) => [key, value.trim()])
      ));
      toast.success(response.message || 'Tour updated successfully.');
      onUpdated?.(response.data);
      onClose();
    } catch (error) {
      toast.error(error.message || 'Unable to update tour.');
    } finally {
      setSubmitting(false);
    }
  };

  const fields = [
    ['title', 'Tour title'],
    ['location', 'Location'],
    ['departureLocation', 'Departure location'],
    ['destinationLocation', 'Destination'],
    ['duration', 'Duration']
  ];

  return (
    <>
      <div className="modal-backdrop fade show"></div>
      <div className="modal fade show d-block" tabIndex="-1" role="dialog" aria-modal="true">
        <div className="modal-dialog modal-dialog-centered modal-lg">
          <div className="modal-content border-0 shadow">
            <div className="modal-header">
              <h2 className="modal-title h5 fw-bold">Update tour</h2>
              <button type="button" className="btn-close" onClick={onClose} disabled={submitting} aria-label="Close"></button>
            </div>
            <form onSubmit={handleSubmit} noValidate>
              <div className="modal-body">
                <div className="row g-3">
                  {fields.map(([name, label]) => (
                    <div className="col-md-6" key={name}>
                      <label className="form-label fw-semibold" htmlFor={`edit-tour-${name}`}>{label}</label>
                      <input
                        id={`edit-tour-${name}`}
                        name={name}
                        className={`form-control ${errors[name] ? 'is-invalid' : ''}`}
                        value={form[name]}
                        onChange={handleChange}
                        disabled={submitting}
                      />
                      {errors[name] && <div className="invalid-feedback">{errors[name]}</div>}
                    </div>
                  ))}
                  <div className="col-12">
                    <label className="form-label fw-semibold" htmlFor="edit-tour-description">Description</label>
                    <textarea
                      id="edit-tour-description"
                      name="description"
                      rows="4"
                      className={`form-control ${errors.description ? 'is-invalid' : ''}`}
                      value={form.description}
                      onChange={handleChange}
                      disabled={submitting}
                    ></textarea>
                    {errors.description && <div className="invalid-feedback">{errors.description}</div>}
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline-secondary" onClick={onClose} disabled={submitting}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Saving...' : 'Save changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
