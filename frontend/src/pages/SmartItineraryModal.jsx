import { useState } from 'react';
import { itineraryApi } from '../services/api';
import { useToast } from '../hooks/useToast';

export default function SmartItineraryModal({ open, onClose, onCreated }) {
  const toast = useToast();
  const [form, setForm] = useState({ title: '', destination: '', budget: '', startDate: '', endDate: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!open) return null;

  const updateField = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.title.trim() || submitting) return;
    setSubmitting(true);
    setError('');
    try {
      const response = await itineraryApi.generateSmart({
        title: form.title.trim(),
        destination: form.destination.trim() || undefined,
        budget: form.budget === '' ? undefined : Number(form.budget),
        startDate: form.startDate || undefined,
        endDate: form.endDate || undefined
      });
      onCreated?.(response.itinerary);
      toast.success(response.message || 'Smart itinerary generated successfully.');
      setForm({ title: '', destination: '', budget: '', startDate: '', endDate: '' });
      onClose();
    } catch (requestError) {
      setError(requestError.message || 'Unable to generate smart itinerary.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="modal-backdrop fade show"></div>
      <div className="modal fade show d-block" tabIndex="-1" role="dialog" aria-modal="true">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content border-0 shadow">
            <div className="modal-header">
              <h2 className="modal-title h5 fw-bold">Generate smart itinerary</h2>
              <button type="button" className="btn-close" onClick={onClose} disabled={submitting} aria-label="Close"></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {error && <div className="alert alert-danger small">{error}</div>}
                <label className="form-label fw-semibold" htmlFor="smart-title">Itinerary title</label>
                <input id="smart-title" name="title" className="form-control mb-3" value={form.title} onChange={updateField} required disabled={submitting} />
                <label className="form-label fw-semibold" htmlFor="smart-destination">Destination preference</label>
                <input id="smart-destination" name="destination" className="form-control mb-3" value={form.destination} onChange={updateField} placeholder="Optional city or destination" disabled={submitting} />
                <label className="form-label fw-semibold" htmlFor="smart-budget">Budget</label>
                <input id="smart-budget" name="budget" type="number" min="0" className="form-control mb-3" value={form.budget} onChange={updateField} placeholder="Optional budget in VND" disabled={submitting} />
                <div className="row g-3">
                  <div className="col-6"><label className="form-label fw-semibold" htmlFor="smart-start">Start date</label><input id="smart-start" name="startDate" type="date" className="form-control" value={form.startDate} onChange={updateField} disabled={submitting} /></div>
                  <div className="col-6"><label className="form-label fw-semibold" htmlFor="smart-end">End date</label><input id="smart-end" name="endDate" type="date" className="form-control" value={form.endDate} onChange={updateField} disabled={submitting} /></div>
                </div>
                <div className="form-text mt-3">Recommendations use active destinations and tours already stored in TripMate.</div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline-secondary" onClick={onClose} disabled={submitting}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? 'Generating...' : 'Generate itinerary'}</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
