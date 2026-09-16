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
const emptyShareForm = { email: '', permission: 'view' };

function Itinerary() {
  const { user, isAuthenticated } = useAuth();
  const [tab, setTab] = useState('mine');
  const [itineraries, setItineraries] = useState([]);
  const [sharedItineraries, setSharedItineraries] = useState([]);
  const [selected, setSelected] = useState(null);
  const [itineraryForm, setItineraryForm] = useState(emptyItinerary);
  const [editForm, setEditForm] = useState(emptyItinerary);
  const [activityForm, setActivityForm] = useState(emptyActivity);
  const [shareForm, setShareForm] = useState(emptyShareForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const updateInLists = (updated) => {
    setItineraries((items) => items.map((item) => (
      item._id === updated._id ? updated : item
    )));
    setSharedItineraries((items) => items.map((item) => (
      item._id === updated._id ? updated : item
    )));
    setSelected(updated);
    setEditForm({
      title: updated.title || '',
      budget: updated.budget || ''
    });
  };

  const syncEditForm = (itinerary) => {
    setEditForm({
      title: itinerary.title || '',
      budget: itinerary.budget || ''
    });
  };

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    const load = async () => {
      try {
        const [mineResponse, sharedResponse] = await Promise.all([
          itineraryApi.list(),
          itineraryApi.listShared()
        ]);
        const myItems = mineResponse.itineraries || [];
        const sharedItems = sharedResponse.itineraries || [];
        setItineraries(myItems);
        setSharedItineraries(sharedItems);
        const initial = myItems[0] || null;
        setSelected(initial);
        syncEditForm(initial || emptyItinerary);
      } catch (requestError) {
        setError(requestError.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [isAuthenticated]);

  const switchTab = (nextTab) => {
    setTab(nextTab);
    setError('');
    setMessage('');
    const next = nextTab === 'mine'
      ? (itineraries[0] || null)
      : (sharedItineraries[0] || null);
    setSelected(next);
    if (next) syncEditForm(next);
  };

  const selectItinerary = (itinerary) => {
    setSelected(itinerary);
    syncEditForm(itinerary);
    setError('');
    setMessage('');
  };

  const currentPermission = selected && user
    ? (selected.collaborators || []).find((entry) => (
      String(entry.user?._id || entry.user) === String(user.id)
    ))?.permission
    : undefined;

  const isOwned = tab === 'mine';
  const canEdit = isOwned || currentPermission === 'edit';
  const ownerName = selected?.owner?.username || '';

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
      syncEditForm(response.itinerary);
      setTab('mine');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  const saveEdits = async (event) => {
    event.preventDefault();
    if (!selected?.owner) return;
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const response = await itineraryApi.update(selected._id, {
        title: editForm.title,
        budget: editForm.budget ? Number(editForm.budget) : 0
      });
      updateInLists(response.itinerary);
      setMessage('Itinerary updated successfully.');
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
    setMessage('');
    try {
      const response = await itineraryApi.addActivity(selected._id, {
        ...activityForm,
        estimatedCost: Number(activityForm.estimatedCost || 0)
      });
      updateInLists(response.itinerary);
      setActivityForm(emptyActivity);
      setMessage('Activity added successfully.');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  const shareItinerary = async (event) => {
    event.preventDefault();
    if (!selected) return;
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const response = await itineraryApi.addCollaborator(selected._id, shareForm);
      updateInLists(response.itinerary);
      setShareForm(emptyShareForm);
      setMessage(response.message || 'Itinerary shared successfully.');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  const changePermission = async (collaborator, permission) => {
    if (!selected) return;
    setError('');
    setMessage('');
    try {
      const response = await itineraryApi.updateCollaboratorPermission(
        selected._id,
        collaborator.user?._id || collaborator.user,
        permission
      );
      updateInLists(response.itinerary);
      setMessage('Collaborator permission updated successfully.');
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const removeCollaborator = async (collaborator) => {
    if (!selected) return;
    setError('');
    setMessage('');
    try {
      const response = await itineraryApi.removeCollaborator(
        selected._id,
        collaborator.user?._id || collaborator.user
      );
      updateInLists(response.itinerary);
      setMessage('Collaborator removed successfully.');
    } catch (requestError) {
      setError(requestError.message);
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
            <p className="text-muted mb-0">Build an editable plan, share it, and collaborate with other travellers.</p>
          </div>

          {!isAuthenticated ? (
            <div className="alert alert-info">Sign in to create, manage, and view shared itineraries.</div>
          ) : (
            <>
              <ul className="nav nav-pills mb-4">
                <li className="nav-item">
                  <button
                    type="button"
                    className={`nav-link ${tab === 'mine' ? 'active' : 'text-dark'}`}
                    onClick={() => switchTab('mine')}
                  >
                    My itineraries
                  </button>
                </li>
                <li className="nav-item">
                  <button
                    type="button"
                    className={`nav-link ${tab === 'shared' ? 'active' : 'text-dark'}`}
                    onClick={() => switchTab('shared')}
                  >
                    Shared with me
                  </button>
                </li>
              </ul>

              <div className="row g-4">
                <div className="col-lg-4">
                  {isOwned && (
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
                  )}

                  <div className="list-group shadow-sm">
                    {(tab === 'mine' ? itineraries : sharedItineraries).map((itinerary) => (
                      <button
                        className={`list-group-item list-group-item-action ${selected?._id === itinerary._id ? 'active' : ''}`}
                        key={itinerary._id}
                        onClick={() => selectItinerary(itinerary)}
                      >
                        <div className="fw-semibold">{itinerary.title}</div>
                        <small>
                          {itinerary.activities.length} activities
                          {tab === 'shared' && itinerary.owner?.username ? ` · ${itinerary.owner.username}` : ''}
                        </small>
                      </button>
                    ))}
                    {!loading && (tab === 'mine' ? itineraries : sharedItineraries).length === 0 && (
                      <div className="list-group-item text-muted">
                        {tab === 'mine' ? 'No itinerary yet.' : 'No itineraries shared with you yet.'}
                      </div>
                    )}
                  </div>
                </div>

                <div className="col-lg-8">
                  {error && <div className="alert alert-danger">{error}</div>}
                  {message && <div className="alert alert-success">{message}</div>}
                  {!selected ? (
                    <div className="card border-0 shadow-sm text-center py-5">
                      <div className="card-body text-muted">
                        {tab === 'mine'
                          ? 'Create an itinerary to start planning.'
                          : 'Select a shared itinerary to view it.'}
                      </div>
                    </div>
                  ) : (
                    <>
                      <section className="card border-0 shadow-sm mb-4">
                        <div className="card-body p-4">
                          <div className="d-flex justify-content-between align-items-start mb-3">
                            <div>
                              <h2 className="h4 fw-bold mb-1">{selected.title}</h2>
                              <p className="text-muted mb-0">
                                Budget: {selected.budget || 0}
                                {tab === 'shared' && ownerName
                                  ? ` · Shared by ${ownerName}`
                                  : ''}
                              </p>
                            </div>
                            <div className="d-flex gap-2">
                              {!isOwned && currentPermission && (
                                <span className={`badge ${canEdit ? 'text-bg-success' : 'text-bg-secondary'}`}>
                                  {canEdit ? 'Can edit' : 'View only'}
                                </span>
                              )}
                              {isOwned && <span className="badge text-bg-success">Owned</span>}
                            </div>
                          </div>

                          {isOwned && (
                            <>
                              <div className="d-flex flex-wrap gap-2 mb-4">
                                {(selected.collaborators || []).map((collaborator) => (
                                  <span
                                    className="badge text-bg-secondary d-inline-flex align-items-center gap-1 mb-1"
                                    key={String(collaborator.user?._id || collaborator.user)}
                                  >
                                    {collaborator.user?.username || 'Unknown user'}
                                    <button
                                      type="button"
                                      className="btn btn-sm btn-link p-0 text-decoration-none text-warning"
                                      title={collaborator.permission === 'edit' ? 'Reduce to view' : 'Allow editing'}
                                      onClick={() => changePermission(
                                        collaborator,
                                        collaborator.permission === 'edit' ? 'view' : 'edit'
                                      )}
                                    >
                                      {collaborator.permission === 'edit' ? 'edit' : 'view'}
                                    </button>
                                    <button
                                      type="button"
                                      className="btn btn-sm btn-link p-0 text-decoration-none text-danger"
                                      title="Remove collaborator"
                                      onClick={() => removeCollaborator(collaborator)}
                                    >
                                      <i className="bi bi-x" />
                                    </button>
                                  </span>
                                ))}
                                {(selected.collaborators || []).length === 0 && (
                                  <span className="text-muted small">Not shared yet.</span>
                                )}
                              </div>

                              <form className="d-flex flex-column flex-md-row gap-2 mb-4" onSubmit={shareItinerary}>
                                <input
                                  type="email"
                                  className="form-control"
                                  placeholder="Collaborator email"
                                  value={shareForm.email}
                                  onChange={(event) => setShareForm({ ...shareForm, email: event.target.value })}
                                  required
                                />
                                <select
                                  className="form-select"
                                  style={{ maxWidth: '180px' }}
                                  value={shareForm.permission}
                                  onChange={(event) => setShareForm({ ...shareForm, permission: event.target.value })}
                                >
                                  <option value="view">View only</option>
                                  <option value="edit">Can edit</option>
                                </select>
                                <button className="btn btn-outline-primary" disabled={saving}>
                                  <i className="bi bi-share me-2" />Share
                                </button>
                              </form>
                            </>
                          )}

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

                      {canEdit && (
                        <>
                          <form className="card border-0 shadow-sm mb-4" onSubmit={saveEdits}>
                            <div className="card-body p-4">
                              <h2 className="h5 fw-bold mb-3">Edit itinerary</h2>
                              <div className="row g-3">
                                <div className="col-md-8">
                                  <label className="form-label" htmlFor="editTitle">Title</label>
                                  <input
                                    id="editTitle"
                                    className="form-control"
                                    value={editForm.title}
                                    onChange={(event) => setEditForm({ ...editForm, title: event.target.value })}
                                    required
                                  />
                                </div>
                                <div className="col-md-4">
                                  <label className="form-label" htmlFor="editBudget">Budget</label>
                                  <input
                                    id="editBudget"
                                    type="number"
                                    min="0"
                                    className="form-control"
                                    value={editForm.budget}
                                    onChange={(event) => setEditForm({ ...editForm, budget: event.target.value })}
                                  />
                                </div>
                              </div>
                              <button className="btn btn-primary mt-3" disabled={saving}>Save changes</button>
                            </div>
                          </form>

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
                    </>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}

export default Itinerary;