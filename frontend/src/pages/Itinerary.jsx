import { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { itineraryApi } from '../services/api';
import { useAuth } from '../hooks/useAuth';

const initialItinerary = { title: '', budget: '' };
const initialActivity = {
  title: '', date: '', startTime: '', endTime: '', location: '', estimatedCost: '', notes: ''
};
const initialShare = { email: '', permission: 'view' };
const initialEdit = { title: '', budget: '' };

/**
 * Customer-facing personal itinerary workspace.
 * Own itineraries, shared itineraries, collaborator sharing, and conflict alerts.
 */
function Itinerary() {
  const { user, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState('mine');
  const [itineraries, setItineraries] = useState([]);
  const [selected, setSelected] = useState(null);
  const [itineraryForm, setItineraryForm] = useState(initialItinerary);
  const [activityForm, setActivityForm] = useState(initialActivity);
  const [shareForm, setShareForm] = useState(initialShare);
  const [editForm, setEditForm] = useState(initialEdit);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const isCustomer = isAuthenticated && user?.role === 'customer';

  const isOwner = selected && user
    && String(selected.owner?._id || selected.owner) === String(user?._id);
  const collaboratorEntry = selected?.collaborators?.find(
    (c) => String(c.user?._id || c.user) === String(user?._id)
  );
  const currentPermission = isOwner ? 'owner' : (collaboratorEntry?.permission || null);
  const canEdit = isOwner || currentPermission === 'edit';

  const loadItineraries = async () => {
    if (!isCustomer) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const response = activeTab === 'mine'
        ? await itineraryApi.list()
        : await itineraryApi.listShared();
      setItineraries(response.itineraries || []);
      setSelected(response.itineraries?.[0] || null);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItineraries();
  }, [activeTab, isAuthenticated, user?.role]);

  const select = (itinerary) => {
    setSelected(itinerary);
    setEditForm({ title: itinerary.title, budget: itinerary.budget || '' });
    setError('');
  };

  const switchTab = (tab) => {
    setActiveTab(tab);
    setSelected(null);
    setError('');
  };

  const replaceItinerary = (updated) => {
    setSelected(updated);
    setItineraries((current) => current.map((itinerary) => (
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
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  const saveEdit = async (event) => {
    event.preventDefault();
    if (!selected) return;
    setSaving(true);
    setError('');
    try {
      const response = await itineraryApi.update(selected._id, {
        title: editForm.title,
        budget: Number(editForm.budget || 0)
      });
      replaceItinerary(response.itinerary);
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
      replaceItinerary(response.itinerary);
      setActivityForm(initialActivity);
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
        email: shareForm.email.trim(),
        permission: shareForm.permission
      });
      replaceItinerary(response.itinerary);
      setShareForm(initialShare);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  const togglePermission = async (collaborator, newPermission) => {
    setError('');
    try {
      const response = await itineraryApi.updateCollaboratorPermission(
        selected._id,
        collaborator.user?._id || collaborator.user,
        newPermission
      );
      replaceItinerary(response.itinerary);
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const removeCollaborator = async (collaborator) => {
    setError('');
    try {
      const response = await itineraryApi.removeCollaborator(
        selected._id,
        collaborator.user?._id || collaborator.user
      );
      replaceItinerary(response.itinerary);
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const renderPermissionBadge = () => {
    if (isOwner) return <span className="badge text-bg-primary">Chủ sở hữu</span>;
    if (currentPermission === 'edit') return <span className="badge text-bg-success">Chỉnh sửa</span>;
    if (currentPermission === 'view') return <span className="badge text-bg-secondary">Chỉ xem</span>;
    return null;
  };

  const renderConflictBadge = (activity) => {
    if (!selected?.conflicts?.length) return null;
    const involved = selected.conflicts.some(
      (conflict) => conflict.first._id === activity._id || conflict.second._id === activity._id
    );
    return involved ? <span className="badge text-bg-danger ms-2">Xung đột</span> : null;
  };

  return (
    <>
      <Navbar />
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
                  <button
                    type="button"
                    className={`nav-link ${activeTab === 'mine' ? 'active' : ''}`}
                    onClick={() => switchTab('mine')}
                  >
                    Lịch trình của tôi
                  </button>
                </li>
                <li className="nav-item">
                  <button
                    type="button"
                    className={`nav-link ${activeTab === 'shared' ? 'active' : ''}`}
                    onClick={() => switchTab('shared')}
                  >
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
                    {itineraries.map((itinerary) => (
                      <button key={itinerary._id} type="button" className={`list-group-item list-group-item-action ${selected?._id === itinerary._id ? 'active' : ''}`} onClick={() => select(itinerary)}>
                        <span className="fw-semibold d-block">{itinerary.title}</span>
                        <small>
                          {itinerary.activities?.length || 0} hoạt động
                          {itinerary.conflicts?.length ? ` · ${itinerary.conflicts.length} xung đột` : ''}
                        </small>
                      </button>
                    ))}
                    {!loading && itineraries.length === 0 && (
                      <div className="list-group-item text-muted">
                        {activeTab === 'mine' ? 'Chưa có lịch trình.' : 'Không có lịch trình được chia sẻ.'}
                      </div>
                    )}
                  </div>
                </div>

                <div className="col-lg-8">
                  {!selected ? (
                    <div className="card border-0 shadow-sm text-center py-5">
                      <div className="card-body text-muted">
                        {activeTab === 'mine' ? 'Tạo lịch trình để bắt đầu thêm hoạt động.' : 'Chọn một lịch trình để xem chi tiết.'}
                      </div>
                    </div>
                  ) : (
                    <>
                      <section className="card border-0 shadow-sm mb-4">
                        <div className="card-body p-4">
                          <div className="d-flex justify-content-between align-items-start mb-3">
                            <div>
                              <h2 className="h4 fw-bold mb-1">{selected.title}</h2>
                              <p className="text-muted mb-1">Ngân sách: {selected.budget?.toLocaleString() || 0}</p>
                              <p className="mb-0">{renderPermissionBadge()}</p>
                            </div>
                          </div>

                          {selected.conflicts?.length > 0 && (
                            <div className="alert alert-warning py-2 mb-3">
                              <i className="bi bi-exclamation-triangle me-1"></i>
                              <strong>Lịch trình có xung đột:</strong>
                              <ul className="mb-0 mt-1 small">
                                {selected.conflicts.map((conflict, index) => (
                                  <li key={index}>
                                    <strong>{conflict.first.title}</strong> ({conflict.first.startTime}-{conflict.first.endTime})
                                    {' '}trùng lịch với <strong>{conflict.second.title}</strong> ({conflict.second.startTime}-{conflict.second.endTime})
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {selected.activities?.length === 0 ? <p className="text-muted mb-0">Chưa có hoạt động.</p> : (
                            <div className="vstack gap-3">
                              {selected.activities.map((activity) => (
                                <div className="border-start border-primary border-3 ps-3" key={activity._id}>
                                  <div className="fw-semibold">{activity.title}{renderConflictBadge(activity)}</div>
                                  <div className="small text-muted">{new Date(activity.date).toLocaleDateString()} · {activity.startTime} - {activity.endTime}{activity.location ? ` · ${activity.location}` : ''}</div>
                                  {activity.notes && <div className="small mt-1">{activity.notes}</div>}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </section>

                      {canEdit && (
                        <>
                          <section className="card border-0 shadow-sm mb-4">
                            <div className="card-body p-4">
                              <h2 className="h5 fw-bold mb-3">Chỉnh sửa lịch trình</h2>
                              <form onSubmit={saveEdit}>
                                <div className="row g-3">
                                  <div className="col-md-8">
                                    <label className="form-label" htmlFor="edit-title">Tên lịch trình</label>
                                    <input id="edit-title" className="form-control" value={editForm.title} onChange={(event) => setEditForm({ ...editForm, title: event.target.value })} required />
                                  </div>
                                  <div className="col-md-4">
                                    <label className="form-label" htmlFor="edit-budget">Ngân sách</label>
                                    <input id="edit-budget" type="number" min="0" className="form-control" value={editForm.budget} onChange={(event) => setEditForm({ ...editForm, budget: event.target.value })} />
                                  </div>
                                </div>
                                <button className="btn btn-outline-primary mt-3" disabled={saving}>Lưu thay đổi</button>
                              </form>
                            </div>
                          </section>

                          <form className="card border-0 shadow-sm mb-4" onSubmit={addActivity}>
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
                        </>
                      )}

                      {!canEdit && (
                        <div className="alert alert-secondary">Bạn chỉ có quyền xem lịch trình này.</div>
                      )}

                      {isOwner && (
                        <section className="card border-0 shadow-sm mb-4">
                          <div className="card-body p-4">
                            <h2 className="h5 fw-bold mb-3">Chia sẻ lịch trình</h2>
                            <form className="row g-2 align-items-end" onSubmit={shareItinerary}>
                              <div className="col-md-5">
                                <label className="form-label" htmlFor="share-email">Email người nhận</label>
                                <input id="share-email" type="email" className="form-control" placeholder="user@example.com" value={shareForm.email} onChange={(event) => setShareForm({ ...shareForm, email: event.target.value })} required />
                              </div>
                              <div className="col-md-4">
                                <label className="form-label" htmlFor="share-permission">Quyền</label>
                                <select id="share-permission" className="form-select" value={shareForm.permission} onChange={(event) => setShareForm({ ...shareForm, permission: event.target.value })}>
                                  <option value="view">Chỉ xem</option>
                                  <option value="edit">Chỉnh sửa</option>
                                </select>
                              </div>
                              <div className="col-md-3"><button className="btn btn-primary w-100" disabled={saving}>Chia sẻ</button></div>
                            </form>

                            {selected.collaborators?.length > 0 && (
                              <div className="vstack gap-2 mt-3">
                                {selected.collaborators.map((collaborator) => (
                                  <div key={String(collaborator.user?._id || collaborator.user)} className="d-flex align-items-center justify-content-between bg-light rounded p-3">
                                    <div>
                                      <span className="fw-semibold d-block">{collaborator.user?.username}</span>
                                      <span className="text-muted small">{collaborator.user?.email} · {collaborator.permission === 'edit' ? 'Chỉnh sửa' : 'Chỉ xem'}</span>
                                    </div>
                                    <div className="d-flex gap-2">
                                      <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => togglePermission(collaborator, collaborator.permission === 'edit' ? 'view' : 'edit')}>
                                        {collaborator.permission === 'edit' ? 'Chuyển sang xem' : 'Chuyển sang sửa'}
                                      </button>
                                      <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => removeCollaborator(collaborator)}>
                                        Gỡ chia sẻ
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </section>
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