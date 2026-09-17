import { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import ItineraryPrintView from '../components/ItineraryPrintView';
import { destinationApi, itineraryApi } from '../services/api';
import { useAuth } from '../hooks/useAuth';

const initialItinerary = { title: '', budget: '' };
const initialActivity = {
  title: '', date: '', startTime: '', endTime: '', location: '', estimatedCost: '', notes: ''
};
const initialShare = { email: '', permission: 'view' };

/**
 * Customer-facing personal itinerary workspace (own + shared, conflict detection).
 */
function Itinerary() {
  const { user, isAuthenticated } = useAuth();
  const [itineraries, setItineraries] = useState([]);
  const [sharedItineraries, setSharedItineraries] = useState([]);
  const [activeTab, setActiveTab] = useState('mine');
  const [selected, setSelected] = useState(null);
  const [itineraryForm, setItineraryForm] = useState(initialItinerary);
  const [editForm, setEditForm] = useState(initialItinerary);
  const [showEdit, setShowEdit] = useState(false);
  const [activityForm, setActivityForm] = useState(initialActivity);
  const [shareForm, setShareForm] = useState(initialShare);
  const [destinations, setDestinations] = useState([]);
  const [destinationId, setDestinationId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const loadItineraries = async () => {
    if (!isAuthenticated || user?.role !== 'customer') {
      setLoading(false);
      return;
    }

    try {
      const [itineraryResponse, sharedResponse, destinationResponse] = await Promise.all([
        itineraryApi.list(),
        itineraryApi.listShared(),
        destinationApi.getAll({ limit: 100 })
      ]);
      setItineraries(itineraryResponse.itineraries || []);
      setSharedItineraries(sharedResponse.itineraries || []);
      setSelected(itineraryResponse.itineraries?.[0] || null);
      setDestinations((destinationResponse.data || []).filter((destination) => destination.status !== 'inactive'));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItineraries();
  }, [isAuthenticated, user?.role]);

  const applyItinerary = (updated) => {
    setSelected(updated);
    setItineraries((current) => current.map((itinerary) => (
      itinerary._id === updated._id ? updated : itinerary
    )));
    setSharedItineraries((current) => current.map((itinerary) => (
      itinerary._id === updated._id ? updated : itinerary
    )));
  };

  const createItinerary = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const response = await itineraryApi.create({
        title: itineraryForm.title,
        budget: Number(itineraryForm.budget || 0)
      });
      setItineraryForm(initialItinerary);
      setItineraries((current) => [response.itinerary, ...current]);
      setSelected(response.itinerary);
      setActiveTab('mine');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  const updateItinerary = async (event) => {
    event.preventDefault();
    if (!selected) return;

    setSaving(true);
    setError('');
    try {
      const response = await itineraryApi.update(selected._id, {
        title: editForm.title,
        budget: Number(editForm.budget || 0)
      });
      applyItinerary(response.itinerary);
      setShowEdit(false);
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
      applyItinerary(response.itinerary);
      setActivityForm(initialActivity);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  const addDestination = async (event) => {
    event.preventDefault();
    if (!selected || !destinationId) return;

    setSaving(true);
    setError('');
    try {
      const response = await itineraryApi.addDestination(selected._id, destinationId);
      applyItinerary(response.itinerary);
      setDestinationId('');
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
    try {
      const response = await itineraryApi.addCollaborator(selected._id, {
        email: shareForm.email,
        permission: shareForm.permission
      });
      applyItinerary(response.itinerary);
      setShareForm(initialShare);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  const changeCollaboratorPermission = async (collaboratorId, permission) => {
    if (!selected) return;

    setError('');
    try {
      const response = await itineraryApi.updateCollaboratorPermission(selected._id, collaboratorId, permission);
      applyItinerary(response.itinerary);
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const exportItinerary = () => {
    if (!selected) return;

    const previousTitle = document.title;
    const safeTitle = selected.title?.trim().replace(/[\\/:*?"<>|]+/g, '-') || 'itinerary';
    document.title = `${safeTitle} - TripMate`;

    try {
      window.print();
    } finally {
      document.title = previousTitle;
    }
  };

  const isOwner = selected && String(selected.owner?._id || selected.owner) === String(user?._id);
  const myPermission = selected?.collaborators?.find(
    (collaborator) => String(collaborator.user?._id || collaborator.user) === String(user?._id)
  )?.permission;
  const canEditSelected = Boolean(isOwner || myPermission === 'edit');

  const conflictedActivityIds = new Set();
  (selected?.conflicts || []).forEach((conflict) => {
    conflictedActivityIds.add(String(conflict.first._id));
    conflictedActivityIds.add(String(conflict.second._id));
  });

  const addedDestinationIds = new Set(
    (selected?.destinations || []).map((destination) => String(destination._id || destination))
  );
  const selectableDestinations = destinations.filter(
    (destination) => !addedDestinationIds.has(String(destination._id))
  );

  const switchTab = (tab) => {
    setActiveTab(tab);
    const list = tab === 'shared' ? sharedItineraries : itineraries;
    setSelected((current) => current || list[0] || null);
  };

  const visibleItineraries = activeTab === 'shared' ? sharedItineraries : itineraries;

  return (
    <>
      <Navbar />
      <ItineraryPrintView itinerary={selected} />
      <main className="bg-light py-5 flex-grow-1">
        <div className="container">
          <div className="mb-4">
            <p className="text-primary text-uppercase fw-semibold small mb-2">Personal planning</p>
            <h1 className="fw-bold mb-2">Lịch trình của tôi</h1>
            <p className="text-muted mb-0">Tạo, chia sẻ và quản lý lịch trình cá nhân của bạn.</p>
          </div>

          {!isAuthenticated ? (
            <div className="alert alert-info">Vui lòng đăng nhập để sử dụng lịch trình cá nhân.</div>
          ) : user?.role !== 'customer' ? (
            <div className="alert alert-warning">Chức năng lịch trình cá nhân dành cho Customer.</div>
          ) : (
            <>
              {error && <div className="alert alert-danger">{error}</div>}
              <ul className="nav nav-tabs mb-4">
                <li className="nav-item">
                  <button type="button" className={`nav-link ${activeTab === 'mine' ? 'active' : ''}`} onClick={() => switchTab('mine')}>
                    Lịch trình của tôi
                  </button>
                </li>
                <li className="nav-item">
                  <button type="button" className={`nav-link ${activeTab === 'shared' ? 'active' : ''}`} onClick={() => switchTab('shared')}>
                    Được chia sẻ với tôi
                  </button>
                </li>
              </ul>
              <div className="row g-4">
                <div className="col-lg-4">
                  {activeTab === 'mine' && (
                    <form className="card border-0 shadow-sm mb-4" onSubmit={createItinerary}>
                      <div className="card-body p-4">
                        <h2 className="h5 fw-bold mb-3">Tạo lịch trình</h2>
                        <label className="form-label" htmlFor="itinerary-title">Tên lịch trình</label>
                        <input id="itinerary-title" className="form-control mb-3" value={itineraryForm.title} onChange={(event) => setItineraryForm({ ...itineraryForm, title: event.target.value })} required />
                        <label className="form-label" htmlFor="itinerary-budget">Ngân sách dự kiến</label>
                        <input id="itinerary-budget" type="number" min="0" className="form-control mb-3" value={itineraryForm.budget} onChange={(event) => setItineraryForm({ ...itineraryForm, budget: event.target.value })} />
                        <button className="btn btn-primary w-100" disabled={saving}>Tạo lịch trình</button>
                      </div>
                    </form>
                  )}

                  <div className="list-group shadow-sm">
                    {visibleItineraries.map((itinerary) => (
                      <button key={itinerary._id} className={`list-group-item list-group-item-action ${selected?._id === itinerary._id ? 'active' : ''}`} onClick={() => { setSelected(itinerary); setDestinationId(''); setShowEdit(false); }}>
                        <span className="fw-semibold d-block">{itinerary.title}</span>
                        <small>{itinerary.activities.length} hoạt động</small>
                        {activeTab === 'shared' && itinerary.owner?.username && (
                          <small className="d-block text-primary">chia sẻ bởi {itinerary.owner.username}</small>
                        )}
                      </button>
                    ))}
                    {!loading && visibleItineraries.length === 0 && (
                      <div className="list-group-item text-muted">
                        {activeTab === 'shared' ? 'Chưa có lịch trình nào được chia sẻ với bạn.' : 'Chưa có lịch trình.'}
                      </div>
                    )}
                  </div>
                </div>

                <div className="col-lg-8">
                  {!selected ? (
                    <div className="card border-0 shadow-sm text-center py-5"><div className="card-body text-muted">Tạo lịch trình để bắt đầu thêm hoạt động.</div></div>
                  ) : (
                    <>
                      <section className="card border-0 shadow-sm mb-4">
                        <div className="card-body p-4">
                          <div className="d-flex justify-content-between align-items-start mb-3">
                            <div>
                              <h2 className="h4 fw-bold mb-1">{selected.title}</h2>
                              <p className="text-muted mb-0">Ngân sách: {selected.budget || 0} · Điểm đến: {(selected.destinations || []).length} · Hoạt động: {selected.activities.length}</p>
                            </div>
                            <div className="d-flex align-items-center gap-2">
                              <span className={`badge ${isOwner ? 'text-bg-primary' : canEditSelected ? 'text-bg-success' : 'text-bg-secondary'}`}>
                                {isOwner ? 'Chủ sở hữu' : canEditSelected ? 'Có thể chỉnh sửa' : 'Chỉ xem'}
                              </span>
                              <button type="button" className="btn btn-outline-primary btn-sm" onClick={exportItinerary}>
                                <i className="bi bi-printer me-1"></i>
                                Xuất lịch trình
                              </button>
                            </div>
                          </div>

                          {canEditSelected && (
                            <button type="button" className="btn btn-outline-secondary btn-sm mb-3" onClick={() => { setEditForm({ title: selected.title, budget: selected.budget }); setShowEdit((current) => !current); }}>
                              <i className="bi bi-pencil me-1"></i>
                              Chỉnh sửa lịch trình
                            </button>
                          )}

                          {showEdit && canEditSelected && (
                            <form className="border rounded p-3 mb-3" onSubmit={updateItinerary}>
                              <div className="row g-2">
                                <div className="col-md-6">
                                  <label className="form-label" htmlFor="edit-title">Tên lịch trình</label>
                                  <input id="edit-title" className="form-control" value={editForm.title} onChange={(event) => setEditForm({ ...editForm, title: event.target.value })} required />
                                </div>
                                <div className="col-md-4">
                                  <label className="form-label" htmlFor="edit-budget">Ngân sách</label>
                                  <input id="edit-budget" type="number" min="0" className="form-control" value={editForm.budget} onChange={(event) => setEditForm({ ...editForm, budget: event.target.value })} />
                                </div>
                                <div className="col-md-2 d-flex align-items-end">
                                  <button className="btn btn-primary w-100" disabled={saving}>Lưu</button>
                                </div>
                              </div>
                            </form>
                          )}

                          {(selected.conflicts || []).length > 0 && (
                            <div className="alert alert-warning mb-3">
                              <i className="bi bi-exclamation-triangle-fill me-2"></i>
                              <strong>Xung đột lịch trình:</strong> phát hiện {(selected.conflicts || []).length} cặp hoạt động trùng thời gian.
                            </div>
                          )}

                          {!canEditSelected && (
                            <div className="alert alert-info py-2 small">Bạn có quyền xem lịch trình này, chỉ chủ sở hữu hoặc cộng tác viên được chỉnh sửa mới có thể thay đổi.</div>
                          )}

                          {selected.activities.length === 0 ? <p className="text-muted mb-0">Chưa có hoạt động.</p> : (
                            <div className="vstack gap-3">
                              {selected.activities.map((activity) => {
                                const conflicted = conflictedActivityIds.has(String(activity._id));
                                return (
                                  <div className="border-start border-primary border-3 ps-3" key={activity._id}>
                                    <div className="fw-semibold d-flex align-items-center gap-2">
                                      {activity.title}
                                      {conflicted && <span className="badge text-bg-warning">Xung đột</span>}
                                    </div>
                                    <div className="small text-muted">{new Date(activity.date).toLocaleDateString()} · {activity.startTime} - {activity.endTime}{activity.location ? ` · ${activity.location}` : ''}</div>
                                    {activity.notes && <div className="small mt-1">{activity.notes}</div>}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </section>

                      {selected.conflicts?.length > 0 && (
                        <section className="card border-0 shadow-sm mb-4">
                          <div className="card-body p-4">
                            <h2 className="h5 fw-bold mb-3">Cặp hoạt động trùng thời gian</h2>
                            <div className="vstack gap-2">
                              {selected.conflicts.map((conflict, index) => (
                                <div className="border rounded p-2 px-3 bg-warning-subtle" key={index}>
                                  <i className="bi bi-clock-history me-2"></i>
                                  <strong>{conflict.first.title}</strong> ({conflict.first.startTime} - {conflict.first.endTime})
                                  {' … '}
                                  <strong>{conflict.second.title}</strong> ({conflict.second.startTime} - {conflict.second.endTime})
                                </div>
                              ))}
                            </div>
                          </div>
                        </section>
                      )}

                      {isOwner && (
                        <section className="card border-0 shadow-sm mb-4">
                          <div className="card-body p-4">
                            <h2 className="h5 fw-bold mb-3">Chia sẻ lịch trình</h2>
                            <form className="row g-2 align-items-end mb-3" onSubmit={shareItinerary}>
                              <div className="col-md-5">
                                <label className="form-label" htmlFor="share-email">Email người nhận</label>
                                <input id="share-email" type="email" className="form-control" value={shareForm.email} onChange={(event) => setShareForm({ ...shareForm, email: event.target.value })} required />
                              </div>
                              <div className="col-md-4">
                                <label className="form-label" htmlFor="share-permission">Quyền</label>
                                <select id="share-permission" className="form-select" value={shareForm.permission} onChange={(event) => setShareForm({ ...shareForm, permission: event.target.value })}>
                                  <option value="view">Chỉ xem</option>
                                  <option value="edit">Chỉnh sửa</option>
                                </select>
                              </div>
                              <div className="col-md-3">
                                <button className="btn btn-primary w-100" disabled={saving}>Chia sẻ</button>
                              </div>
                            </form>

                            {(selected.collaborators || []).length === 0 ? (
                              <p className="text-muted mb-0">Chưa chia sẻ cho ai.</p>
                            ) : (
                              <div className="vstack gap-2">
                                {selected.collaborators.map((collaborator) => (
                                  <div className="d-flex justify-content-between align-items-center border rounded p-2 px-3" key={String(collaborator.user?._id || collaborator.user)}>
                                    <div>
                                      <div className="fw-semibold">{String(collaborator.user?._id || collaborator.user) === String(user?._id) ? 'Bạn' : (collaborator.user?.username || 'Người dùng')}</div>
                                      <div className="small text-muted">{collaborator.user?.email || ''}</div>
                                    </div>
                                    <div className="d-flex align-items-center gap-2">
                                      <select
                                        className="form-select form-select-sm"
                                        style={{ width: 'auto' }}
                                        value={collaborator.permission}
                                        onChange={(event) => changeCollaboratorPermission(String(collaborator.user?._id || collaborator.user), event.target.value)}
                                        disabled={String(collaborator.user?._id || collaborator.user) === String(user?._id)}
                                      >
                                        <option value="view">Chỉ xem</option>
                                        <option value="edit">Chỉnh sửa</option>
                                      </select>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </section>
                      )}

                      <section className="card border-0 shadow-sm mb-4">
                        <div className="card-body p-4">
                          <h2 className="h5 fw-bold mb-3">Điểm đến trong lịch trình</h2>
                          {(selected.destinations || []).length === 0 ? (
                            <p className="text-muted">Chưa có điểm đến trong lịch trình.</p>
                          ) : (
                            <div className="row g-3 mb-4">
                              {selected.destinations.map((destination) => (
                                <div className="col-md-6" key={destination._id || destination}>
                                  <div className="border rounded p-3 h-100">
                                    <div className="fw-semibold">{destination.name}</div>
                                    <div className="small text-muted">
                                      <i className="bi bi-geo-alt me-1"></i>
                                      {destination.location}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {canEditSelected ? (
                            <form className="row g-2 align-items-end" onSubmit={addDestination}>
                              <div className="col-md-9">
                                <label className="form-label" htmlFor="itinerary-destination">Thêm điểm đến</label>
                                <select
                                  id="itinerary-destination"
                                  className="form-select"
                                  value={destinationId}
                                  onChange={(event) => setDestinationId(event.target.value)}
                                  disabled={saving || selectableDestinations.length === 0}
                                  required
                                >
                                  <option value="">Chọn điểm đến</option>
                                  {selectableDestinations.map((destination) => (
                                    <option value={destination._id} key={destination._id}>
                                      {destination.name} — {destination.location}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div className="col-md-3">
                                <button className="btn btn-outline-primary w-100" disabled={saving || !destinationId}>
                                  Thêm
                                </button>
                              </div>
                            </form>
                          ) : (
                            <p className="small text-muted mb-0">Cần quyền chỉnh sửa để thêm điểm đến.</p>
                          )}
                          {canEditSelected && selectableDestinations.length === 0 && (
                            <p className="small text-muted mt-2 mb-0">Không còn điểm đến khả dụng để thêm.</p>
                          )}
                        </div>
                      </section>

                      {canEditSelected && (
                        <form className="card border-0 shadow-sm" onSubmit={addActivity}>
                          <div className="card-body p-4">
                            <h2 className="h5 fw-bold mb-3">Thêm hoạt động</h2>
                            <div className="row g-3">
                              <div className="col-md-6"><label className="form-label" htmlFor="activity-title">Hoạt động</label><input id="activity-title" className="form-control" value={activityForm.title} onChange={(event) => setActivityForm({ ...activityForm, title: event.target.value })} required /></div>
                              <div className="col-md-6"><label className="form-label" htmlFor="activity-date">Ngày</label><input id="activity-date" type="date" className="form-control" value={activityForm.date} onChange={(event) => setActivityForm({ ...activityForm, date: event.target.value })} required /></div>
                              <div className="col-md-6"><label className="form-label" htmlFor="activity-start">Giờ bắt đầu</label><input id="activity-start" type="time" className="form-control" value={activityForm.startTime} onChange={(event) => setActivityForm({ ...activityForm, startTime: event.target.value })} required /></div>
                              <div className="col-md-6"><label className="form-label" htmlFor="activity-end">Giờ kết thúc</label><input id="activity-end" type="time" className="form-control" value={activityForm.endTime} onChange={(event) => setActivityForm({ ...activityForm, endTime: event.target.value })} required /></div>
                              <div className="col-md-6"><label className="form-label" htmlFor="activity-location">Địa điểm</label><input id="activity-location" className="form-control" value={activityForm.location} onChange={(event) => setActivityForm({ ...activityForm, location: event.target.value })} /></div>
                              <div className="col-md-6"><label className="form-label" htmlFor="activity-cost">Chi phí dự kiến</label><input id="activity-cost" type="number" min="0" className="form-control" value={activityForm.estimatedCost} onChange={(event) => setActivityForm({ ...activityForm, estimatedCost: event.target.value })} /></div>
                              <div className="col-12"><label className="form-label" htmlFor="activity-notes">Ghi chú</label><textarea id="activity-notes" className="form-control" rows="2" value={activityForm.notes} onChange={(event) => setActivityForm({ ...activityForm, notes: event.target.value })} /></div>
                            </div>
                            <button className="btn btn-primary mt-3" disabled={saving}>Thêm hoạt động</button>
                          </div>
                        </form>
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