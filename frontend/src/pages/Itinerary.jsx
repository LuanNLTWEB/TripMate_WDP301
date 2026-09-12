import { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { itineraryApi } from '../services/api';
import { useAuth } from '../hooks/useAuth';

const emptyItinerary = { title: '', budget: '' };
const emptyActivity = {
  title: '',
  date: '',
  startTime: '',
  endTime: '',
  location: '',
  estimatedCost: '',
  notes: ''
};

function Itinerary() {
  const { isAuthenticated } = useAuth();
  const [itineraries, setItineraries] = useState([]);
  const [selected, setSelected] = useState(null);
  const [itineraryForm, setItineraryForm] = useState(emptyItinerary);
  const [activityForm, setActivityForm] = useState(emptyActivity);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const loadItineraries = async () => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    try {
      const response = await itineraryApi.list();
      setItineraries(response.itineraries || []);
      setSelected((response.itineraries || [])[0] || null);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItineraries();
  }, [isAuthenticated]);

  const createItinerary = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const response = await itineraryApi.create({
        title: itineraryForm.title,
        budget: Number(itineraryForm.budget || 0)
      });
      setItineraryForm(emptyItinerary);
      setItineraries([response.itinerary, ...itineraries]);
      setSelected(response.itinerary);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  const addActivity = async (event) => {
    event.preventDefault();
    if (!selected) return;
    setSaving(true);
    setError('');
    try {
      const response = await itineraryApi.addActivity(selected._id, {
        ...activityForm,
        estimatedCost: Number(activityForm.estimatedCost || 0)
      });
      setSelected(response.itinerary);
      setItineraries(itineraries.map((item) => (
        item._id === response.itinerary._id ? response.itinerary : item
      )));
      setActivityForm(emptyActivity);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Navbar />
      <main className="bg-light py-5">
        <div className="container">
          <div className="mb-4">
            <p className="text-primary text-uppercase fw-semibold small mb-2">Personal planning</p>
            <h1 className="fw-bold mb-2">My itineraries</h1>
            <p className="text-muted mb-0">Build an editable plan before connecting it to tours or bookings.</p>
          </div>

          {!isAuthenticated ? (
            <div className="alert alert-info">Sign in to create and manage a personal itinerary.</div>
          ) : (
            <div className="row g-4">
              <div className="col-lg-4">
                <form className="card border-0 shadow-sm mb-4" onSubmit={createItinerary}>
                  <div className="card-body p-4">
                    <h2 className="h5 fw-bold mb-3">Create itinerary</h2>
                    <label className="form-label" htmlFor="itineraryTitle">Title</label>
                    <input
                      id="itineraryTitle"
                      className="form-control mb-3"
                      value={itineraryForm.title}
                      onChange={(event) => setItineraryForm({ ...itineraryForm, title: event.target.value })}
                      placeholder="Weekend in Da Nang"
                      required
                    />
                    <label className="form-label" htmlFor="itineraryBudget">Budget</label>
                    <input
                      id="itineraryBudget"
                      type="number"
                      min="0"
                      className="form-control mb-3"
                      value={itineraryForm.budget}
                      onChange={(event) => setItineraryForm({ ...itineraryForm, budget: event.target.value })}
                    />
                    <button className="btn btn-primary w-100" disabled={saving}>Create itinerary</button>
                  </div>
                </form>

                <div className="list-group shadow-sm">
                  {itineraries.map((itinerary) => (
                    <button
                      className={`list-group-item list-group-item-action ${selected?._id === itinerary._id ? 'active' : ''}`}
                      key={itinerary._id}
                      onClick={() => setSelected(itinerary)}
                    >
                      <div className="fw-semibold">{itinerary.title}</div>
                      <small>{itinerary.activities.length} activities</small>
                    </button>
                  ))}
                  {!loading && itineraries.length === 0 && (
                    <div className="list-group-item text-muted">No itinerary yet.</div>
                  )}
                </div>
              </div>

              <div className="col-lg-8">
                {error && <div className="alert alert-danger">{error}</div>}
                {!selected ? (
                  <div className="card border-0 shadow-sm text-center py-5">
                    <div className="card-body text-muted">Create an itinerary to start planning.</div>
                  </div>
                ) : (
                  <>
                    <section className="card border-0 shadow-sm mb-4">
                      <div className="card-body p-4">
                        <div className="d-flex justify-content-between align-items-start mb-3">
                          <div>
                            <h2 className="h4 fw-bold mb-1">{selected.title}</h2>
                            <p className="text-muted mb-0">Budget: {selected.budget || 0}</p>
                          </div>
                          <span className="badge text-bg-success">Editable</span>
                        </div>
                        {selected.activities.length === 0 ? (
                          <p className="text-muted mb-0">No activities added yet.</p>
                        ) : (
                          <div className="vstack gap-3">
                            {selected.activities.map((activity) => (
                              <div className="border-start border-primary border-3 ps-3" key={activity._id}>
                                <div className="fw-semibold">{activity.title}</div>
                                <div className="small text-muted">
                                  {new Date(activity.date).toLocaleDateString()} · {activity.startTime} - {activity.endTime}
                                  {activity.location ? ` · ${activity.location}` : ''}
                                </div>
                                {activity.notes && <div className="small mt-1">{activity.notes}</div>}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </section>

                    <form className="card border-0 shadow-sm" onSubmit={addActivity}>
                      <div className="card-body p-4">
                        <h2 className="h5 fw-bold mb-3">Add activity</h2>
                        <div className="row g-3">
                          <div className="col-md-6">
                            <label className="form-label" htmlFor="activityTitle">Activity</label>
                            <input id="activityTitle" className="form-control" value={activityForm.title} onChange={(event) => setActivityForm({ ...activityForm, title: event.target.value })} required />
                          </div>
                          <div className="col-md-6">
                            <label className="form-label" htmlFor="activityDate">Date</label>
                            <input id="activityDate" type="date" className="form-control" value={activityForm.date} onChange={(event) => setActivityForm({ ...activityForm, date: event.target.value })} required />
                          </div>
                          <div className="col-md-6">
                            <label className="form-label" htmlFor="activityStart">Start time</label>
                            <input id="activityStart" type="time" className="form-control" value={activityForm.startTime} onChange={(event) => setActivityForm({ ...activityForm, startTime: event.target.value })} required />
                          </div>
                          <div className="col-md-6">
                            <label className="form-label" htmlFor="activityEnd">End time</label>
                            <input id="activityEnd" type="time" className="form-control" value={activityForm.endTime} onChange={(event) => setActivityForm({ ...activityForm, endTime: event.target.value })} required />
                          </div>
                          <div className="col-md-6">
                            <label className="form-label" htmlFor="activityLocation">Location</label>
                            <input id="activityLocation" className="form-control" value={activityForm.location} onChange={(event) => setActivityForm({ ...activityForm, location: event.target.value })} />
                          </div>
                          <div className="col-md-6">
                            <label className="form-label" htmlFor="activityCost">Estimated cost</label>
                            <input id="activityCost" type="number" min="0" className="form-control" value={activityForm.estimatedCost} onChange={(event) => setActivityForm({ ...activityForm, estimatedCost: event.target.value })} />
                          </div>
                          <div className="col-12">
                            <label className="form-label" htmlFor="activityNotes">Notes</label>
                            <textarea id="activityNotes" className="form-control" rows="2" value={activityForm.notes} onChange={(event) => setActivityForm({ ...activityForm, notes: event.target.value })} />
                          </div>
                        </div>
                        <button className="btn btn-primary mt-3" disabled={saving}>Add activity</button>
                      </div>
                    </form>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}

export default Itinerary;
