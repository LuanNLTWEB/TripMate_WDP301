import { useEffect, useState } from 'react';
import { tourApi } from '../services/api';
import { useToast } from '../hooks/useToast';

const formatDate = (value) => new Date(value).toLocaleDateString('vi-VN');

export default function TourDeparturesModal({ open, onClose, tour }) {
  const toast = useToast();
  const [departures, setDepartures] = useState([]);
  const [departureDate, setDepartureDate] = useState('');
  const [capacity, setCapacity] = useState('');
  const [reason, setReason] = useState('');
  const [cancelling, setCancelling] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadDepartures = async () => {
    if (!tour?._id) return;
    setLoading(true);
    try {
      const response = await tourApi.getDepartures(tour._id);
      setDepartures(response.data || []);
    } catch (error) {
      toast.error(error.message || 'Unable to load tour departures.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      setDepartureDate('');
      setCapacity(String(tour?.availableSeats || 1));
      setReason('');
      setCancelling(null);
      loadDepartures();
    }
  }, [open, tour?._id]);

  if (!open || !tour) return null;

  const handleCreate = async (event) => {
    event.preventDefault();
    if (!departureDate || Number(capacity) < 1 || saving) return;
    setSaving(true);
    try {
      const response = await tourApi.createDeparture(tour._id, {
        departureDate: `${departureDate}T00:00:00.000Z`,
        capacity: Number(capacity)
      });
      setDepartures((current) => [...current, response.data].sort((a, b) => new Date(a.departureDate) - new Date(b.departureDate)));
      setDepartureDate('');
      toast.success(response.message || 'Tour departure created successfully.');
    } catch (error) {
      toast.error(error.message || 'Unable to create tour departure.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = async (departure) => {
    const cleanReason = reason.trim();
    if (cleanReason.length < 5 || cancelling) return;
    setCancelling(departure._id);
    try {
      const response = await tourApi.cancelDeparture(tour._id, departure._id, cleanReason);
      setDepartures((current) => current.map((item) => item._id === departure._id ? response.data : item));
      setReason('');
      setCancelling(null);
      toast.success(response.message || 'Tour departure cancelled successfully.');
    } catch (error) {
      toast.error(error.message || 'Unable to cancel tour departure.');
      setCancelling(null);
    }
  };

  return (
    <>
      <div className="modal-backdrop fade show" style={{ zIndex: 1040 }}></div>
      <div className="modal fade show d-block" tabIndex="-1" role="dialog" aria-modal="true" style={{ zIndex: 1050 }}>
        <div className="modal-dialog modal-dialog-centered modal-lg modal-dialog-scrollable">
          <div className="modal-content border-0 shadow-lg">
            <div className="modal-header">
              <div>
                <h2 className="modal-title h5 fw-bold mb-1">Manage tour departures</h2>
                <small className="text-muted">{tour.title}</small>
              </div>
              <button type="button" className="btn-close" onClick={onClose} aria-label="Close"></button>
            </div>
            <div className="modal-body">
              <form className="row g-3 align-items-end border rounded-3 p-3 mb-4 bg-light" onSubmit={handleCreate}>
                <div className="col-md-5">
                  <label className="form-label fw-semibold" htmlFor="departure-date">Departure date</label>
                  <input id="departure-date" type="date" className="form-control" value={departureDate} min={new Date().toISOString().split('T')[0]} onChange={(event) => setDepartureDate(event.target.value)} required />
                </div>
                <div className="col-md-4">
                  <label className="form-label fw-semibold" htmlFor="departure-capacity">Capacity</label>
                  <input id="departure-capacity" type="number" min="1" className="form-control" value={capacity} onChange={(event) => setCapacity(event.target.value)} required />
                </div>
                <div className="col-md-3">
                  <button type="submit" className="btn btn-primary w-100" disabled={saving}>{saving ? 'Saving...' : 'Add departure'}</button>
                </div>
              </form>

              {loading ? (
                <div className="text-center py-4 text-muted"><span className="spinner-border spinner-border-sm me-2"></span>Loading departures...</div>
              ) : departures.length === 0 ? (
                <div className="text-center py-4 text-muted border rounded-3">No departures have been created.</div>
              ) : (
                <div className="vstack gap-3">
                  {departures.map((departure) => (
                    <div className={`border rounded-3 p-3 ${departure.status === 'cancelled' ? 'bg-danger-subtle' : 'bg-white'}`} key={departure._id}>
                      <div className="d-flex justify-content-between align-items-start gap-3">
                        <div>
                          <div className="fw-bold">{formatDate(departure.departureDate)}</div>
                          <div className="small text-muted">Capacity: {departure.capacity}</div>
                          {departure.status === 'cancelled' && <div className="small text-danger mt-1">Reason: {departure.cancellationReason}</div>}
                        </div>
                        {departure.status === 'cancelled' ? (
                          <span className="badge text-bg-danger">Cancelled</span>
                        ) : (
                          <span className="badge text-bg-success">Scheduled</span>
                        )}
                      </div>
                      {departure.status !== 'cancelled' && (
                        <div className="mt-3">
                          {cancelling === departure._id ? (
                            <div className="d-flex gap-2 align-items-end flex-wrap">
                              <div className="flex-grow-1">
                                <label className="form-label small fw-semibold" htmlFor={`cancel-reason-${departure._id}`}>Cancellation reason</label>
                                <input id={`cancel-reason-${departure._id}`} className="form-control form-control-sm" value={reason} onChange={(event) => setReason(event.target.value)} minLength="5" />
                              </div>
                              <button type="button" className="btn btn-sm btn-danger" onClick={() => handleCancel(departure)} disabled={reason.trim().length < 5}>Confirm cancel</button>
                              <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => { setCancelling(null); setReason(''); }}>Keep</button>
                            </div>
                          ) : (
                            <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => setCancelling(departure._id)}>Cancel departure</button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline-secondary" onClick={onClose}>Close</button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
