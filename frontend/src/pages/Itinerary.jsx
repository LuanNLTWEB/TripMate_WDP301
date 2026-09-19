import { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import ItineraryPrintView from '../components/ItineraryPrintView';
import { destinationApi, itineraryApi, tourApi } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';

const initialItinerary = { title: '', budget: '' };
const initialActivity = {
  title: '', date: '', startTime: '', endTime: '', location: '', estimatedCost: '', notes: ''
};

function Itinerary() {
  const { user, isAuthenticated } = useAuth();
  const toast = useToast();
  const [itineraries, setItineraries] = useState([]);
  const [sharedItineraries, setSharedItineraries] = useState([]);
  const [activeTab, setActiveTab] = useState('mine');
  const [selected, setSelected] = useState(null);
  const [itineraryForm, setItineraryForm] = useState(initialItinerary);
  const [activityForm, setActivityForm] = useState(initialActivity);
  const [destinations, setDestinations] = useState([]);
  const [destinationId, setDestinationId] = useState('');
  const [tours, setTours] = useState([]);
  const [tourId, setTourId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [pendingDeleteId, setPendingDeleteId] = useState(null);
  const [duplicateModal, setDuplicateModal] = useState({ open: false, itinerary: null, title: '' });
  const [confirmModal, setConfirmModal] = useState({ open: false, destination: null });
  const [confirmTourModal, setConfirmTourModal] = useState({ open: false, tour: null });
  const [reorderMode, setReorderMode] = useState(false);
  const [reorderList, setReorderList] = useState([]);

  const loadItineraries = async () => {
    if (!isAuthenticated || user?.role !== 'customer') {
      setLoading(false);
      return;
    }

    try {
      const [itineraryResponse, sharedResponse, destinationResponse, tourResponse] = await Promise.all([
        itineraryApi.list(),
        itineraryApi.listShared(),
        destinationApi.getAll({ limit: 100 }),
        tourApi.getAll({ limit: 100, status: 'active' })
      ]);
      setItineraries(itineraryResponse.itineraries || []);
      setSharedItineraries(sharedResponse.itineraries || []);
      setSelected(itineraryResponse.itineraries?.[0] || null);
      setDestinations((destinationResponse.data || []).filter((destination) => destination.status !== 'inactive'));
      setTours((tourResponse.data || []).filter((tour) => tour.status !== 'suspended'));
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
      toast.success('Đã tạo lịch trình mới.');
    } catch (requestError) {
      toast.error(requestError.message || 'Không thể tạo lịch trình.');
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
      toast.success('Đã thêm hoạt động vào lịch trình.');
    } catch (requestError) {
      toast.error(requestError.message || 'Không thể thêm hoạt động.');
    } finally {
      setSaving(false);
    }
  };

  const deleteItinerary = async (id) => {
    setSaving(true);
    try {
      await itineraryApi.delete(id);
      setItineraries((current) => {
        const updated = current.filter((it) => it._id !== id);
        if (selected?._id === id) {
          setSelected(updated[0] || null);
        }
        return updated;
      });
      setPendingDeleteId(null);
      toast.success('Đã xóa lịch trình.');
    } catch (requestError) {
      toast.error(requestError.message || 'Không thể xóa lịch trình.');
      setPendingDeleteId(null);
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
      toast.success(response.message || 'Đã thêm điểm đến vào lịch trình.');
    } catch (requestError) {
      toast.error(requestError.message || 'Không thể thêm điểm đến vào lịch trình.');
    } finally {
      setSaving(false);
    }
  };

  const removeDestination = async () => {
    const destination = confirmModal.destination;
    if (!selected || !destination) return;

    setConfirmModal({ open: false, destination: null });
    setSaving(true);
    setError('');
    try {
      const response = await itineraryApi.removeDestination(selected._id, destination._id);
      applyItinerary(response.itinerary);
      toast.success(response.message || 'Đã xóa điểm đến khỏi lịch trình.');
    } catch (requestError) {
      toast.error(requestError.message || 'Không thể xóa điểm đến khỏi lịch trình.');
    } finally {
      setSaving(false);
    }
  };

  const addTour = async (event) => {
    event.preventDefault();
    if (!selected || !tourId) return;

    setSaving(true);
    setError('');
    try {
      const response = await itineraryApi.addTour(selected._id, tourId);
      applyItinerary(response.itinerary);
      setTourId('');
      toast.success(response.message || 'Đã thêm tour vào lịch trình.');
    } catch (requestError) {
      toast.error(requestError.message || 'Không thể thêm tour vào lịch trình.');
    } finally {
      setSaving(false);
    }
  };

  const removeTour = async () => {
    const tour = confirmTourModal.tour;
    if (!selected || !tour) return;

    setConfirmTourModal({ open: false, tour: null });
    setSaving(true);
    setError('');
    try {
      const response = await itineraryApi.removeTour(selected._id, tour._id);
      applyItinerary(response.itinerary);
      toast.success(response.message || 'Đã xóa tour khỏi lịch trình.');
    } catch (requestError) {
      toast.error(requestError.message || 'Không thể xóa tour khỏi lịch trình.');
    } finally {
      setSaving(false);
    }
  };

  const exportItinerary = () => {
    if (!selected) return;

    const previousTitle = document.title;
    const safeTitle = selected.title?.trim().replace(/[\\/:*?"<>|]+/g, '-') || 'itinerary';
    document.title = `${safeTitle} - TripMate`;

    try {
      window.print();
      toast.info('Đã mở bản xem trước để bạn in hoặc lưu thành PDF.');
    } finally {
      document.title = previousTitle;
    }
  };

  const startReorder = () => {
    setReorderList(selected.activities.map((a) => a._id));
    setReorderMode(true);
  };

  const cancelReorder = () => {
    setReorderMode(false);
    setReorderList([]);
  };

  const moveActivity = (index, direction) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= reorderList.length) return;
    const updated = [...reorderList];
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    setReorderList(updated);
  };

  const saveReorder = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const response = await itineraryApi.reorderActivities(selected._id, reorderList);
      applyItinerary(response.itinerary);
      setReorderMode(false);
      setReorderList([]);
      toast.success(response.message || 'Đã sắp xếp lại hoạt động.');
    } catch (requestError) {
      toast.error(requestError.message || 'Không thể sắp xếp lại hoạt động.');
    } finally {
      setSaving(false);
    }
  };

  const duplicateItinerary = async () => {
    if (!duplicateModal.itinerary || saving) return;

    setSaving(true);
    setError('');
    try {
      const response = await itineraryApi.duplicate(duplicateModal.itinerary._id, {
        title: duplicateModal.title.trim() || undefined
      });
      const newItinerary = response.itinerary;
      setItineraries((current) => [newItinerary, ...current]);
      setSelected(newItinerary);
      setActiveTab('mine');
      setDuplicateModal({ open: false, itinerary: null, title: '' });
      toast.success(response.message || 'Đã nhân bản lịch trình thành công.');
    } catch (requestError) {
      toast.error(requestError.message || 'Không thể sao chép lịch trình.');
    } finally {
      setSaving(false);
    }
  };

  const currentUserId = String(user?.id || '');
  const isOwner = selected && String(selected.owner?._id || selected.owner) === currentUserId;
  const myPermission = selected?.collaborators?.find(
    (collaborator) => String(collaborator.user?._id || collaborator.user) === currentUserId
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

  const addedTourIds = new Set(
    (selected?.tours || []).map((tour) => String(tour._id || tour))
  );
  const selectableTours = tours.filter(
    (tour) => !addedTourIds.has(String(tour._id))
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
      <main className="bg-light py-5 flex-grow-1" style={{ minHeight: 'calc(100vh - 160px)' }}>
        <div className="container">
          <div className="mb-4">
            <p className="text-primary text-uppercase fw-semibold small mb-2">Personal planning</p>
            <h1 className="fw-bold mb-2">Lịch trình của tôi</h1>
            <p className="text-muted mb-0">Tạo và quản lý lịch trình cá nhân, xem lịch trình được chia sẻ với bạn.</p>
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
                    {visibleItineraries.map((itinerary) => {
                      const isItemActive = selected?._id === itinerary._id;
                      return (
                        <div
                          key={itinerary._id}
                          className={`list-group-item list-group-item-action d-flex justify-content-between align-items-center ${isItemActive ? 'active' : ''}`}
                          style={{ cursor: 'pointer' }}
                          onClick={() => { setSelected(itinerary); setDestinationId(''); }}
                        >
                          <div className="flex-grow-1 text-truncate pe-2">
                            <span className="fw-semibold d-block text-truncate">{itinerary.title}</span>
                            <small className={isItemActive ? 'text-white-50' : 'text-muted'}>
                              {itinerary.activities?.length || 0} hoạt động
                            </small>
                            {activeTab === 'shared' && itinerary.owner?.username && (
                              <small className={`d-block ${isItemActive ? 'text-white' : 'text-primary'}`}>
                                chia sẻ bởi {itinerary.owner.username}
                              </small>
                            )}
                          </div>
                          <div className="d-flex align-items-center">
                            <button
                              type="button"
                              className={`btn btn-sm ${isItemActive ? 'btn-outline-light' : 'btn-outline-secondary'} border-0 me-1`}
                              title="Nhân bản lịch trình"
                              onClick={(event) => {
                                event.stopPropagation();
                                setDuplicateModal({
                                  open: true,
                                  itinerary,
                                  title: `${itinerary.title} (Bản sao)`
                                });
                              }}
                            >
                              <i className="bi bi-copy"></i>
                            </button>
                            {activeTab === 'mine' && (
                              <button
                                type="button"
                                className={`btn btn-sm ${isItemActive ? 'btn-outline-light' : 'btn-outline-danger'} border-0`}
                                title="Xóa lịch trình"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setPendingDeleteId(itinerary._id);
                                }}
                              >
                                <i className="bi bi-trash"></i>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
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
                              <button
                                type="button"
                                className="btn btn-outline-secondary btn-sm"
                                onClick={() => setDuplicateModal({
                                  open: true,
                                  itinerary: selected,
                                  title: `${selected.title} (Bản sao)`
                                })}
                              >
                                <i className="bi bi-copy me-1"></i>
                                Nhân bản
                              </button>
                              {isOwner && (
                                <button
                                  type="button"
                                  className="btn btn-outline-danger btn-sm"
                                  onClick={() => setPendingDeleteId(selected._id)}
                                >
                                  <i className="bi bi-trash me-1"></i>
                                  Xóa lịch trình
                                </button>
                              )}
                            </div>
                          </div>

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
                            <>
                              {canEditSelected && !reorderMode && (
                                <div className="d-flex justify-content-end mb-3">
                                  <button type="button" className="btn btn-outline-secondary btn-sm" onClick={startReorder}>
                                    <i className="bi bi-arrows-move me-1"></i>
                                    Sắp xếp lại
                                  </button>
                                </div>
                              )}
                              {reorderMode && (
                                <div className="d-flex justify-content-end gap-2 mb-3">
                                  <button type="button" className="btn btn-secondary btn-sm" disabled={saving} onClick={cancelReorder}>Hủy</button>
                                  <button type="button" className="btn btn-primary btn-sm" disabled={saving} onClick={saveReorder}>
                                    {saving ? 'Đang lưu...' : 'Lưu thứ tự'}
                                  </button>
                                </div>
                              )}
                              <div className="vstack gap-2">
                                {(reorderMode ? reorderList.map((id) => selected.activities.find((a) => a._id === id)).filter(Boolean) : selected.activities).map((activity, index) => {
                                  const conflicted = conflictedActivityIds.has(String(activity._id));
                                  return (
                                    <div className={`border rounded p-3 ${reorderMode ? 'bg-white' : 'border-start border-primary border-3'}`} key={activity._id}>
                                      <div className="d-flex align-items-center gap-2">
                                        {reorderMode && (
                                          <div className="d-flex flex-column gap-1">
                                            <button type="button" className="btn btn-sm btn-outline-secondary py-0" disabled={saving || index === 0} onClick={() => moveActivity(index, -1)} title="Di chuyển lên">
                                              <i className="bi bi-chevron-up"></i>
                                            </button>
                                            <button type="button" className="btn btn-sm btn-outline-secondary py-0" disabled={saving || index === reorderList.length - 1} onClick={() => moveActivity(index, 1)} title="Di chuyển xuống">
                                              <i className="bi bi-chevron-down"></i>
                                            </button>
                                          </div>
                                        )}
                                        <div className="flex-grow-1">
                                          <div className="fw-semibold d-flex align-items-center gap-2">
                                            {reorderMode && <span className="text-muted small me-1">{index + 1}.</span>}
                                            {activity.title}
                                            {conflicted && <span className="badge text-bg-warning">Xung đột</span>}
                                          </div>
                                          <div className="small text-muted">{new Date(activity.date).toLocaleDateString()} · {activity.startTime} - {activity.endTime}{activity.location ? ` · ${activity.location}` : ''}</div>
                                          {activity.notes && <div className="small mt-1">{activity.notes}</div>}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </>
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
                                    <div className="d-flex justify-content-between align-items-start">
                                      <div className="fw-semibold">{destination.name}</div>
                                      {canEditSelected && (
                                        <button
                                          type="button"
                                          className="btn btn-sm btn-outline-danger"
                                          disabled={saving}
                                          onClick={() => setConfirmModal({ open: true, destination })}
                                          title="Xóa điểm đến khỏi lịch trình"
                                        >
                                          <i className="bi bi-trash"></i>
                                        </button>
                                      )}
                                    </div>
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

                      <section className="card border-0 shadow-sm mb-4">
                        <div className="card-body p-4">
                          <h2 className="h5 fw-bold mb-3">Tour trong lịch trình</h2>
                          {(selected.tours || []).length === 0 ? (
                            <p className="text-muted">Chưa có tour trong lịch trình.</p>
                          ) : (
                            <div className="row g-3 mb-4">
                              {selected.tours.map((tour) => (
                                <div className="col-md-6" key={tour._id || tour}>
                                  <div className="border rounded p-3 h-100">
                                    <div className="d-flex justify-content-between align-items-start">
                                      <div className="fw-semibold">{tour.title}</div>
                                      {isOwner && (
                                        <button
                                          type="button"
                                          className="btn btn-sm btn-outline-danger"
                                          disabled={saving}
                                          onClick={() => setConfirmTourModal({ open: true, tour })}
                                          title="Xóa tour khỏi lịch trình"
                                        >
                                          <i className="bi bi-trash"></i>
                                        </button>
                                      )}
                                    </div>
                                    <div className="small text-muted">
                                      <i className="bi bi-geo-alt me-1"></i>
                                      {tour.departureLocation && tour.destinationLocation
                                        ? `${tour.departureLocation} → ${tour.destinationLocation}`
                                        : tour.location || ''}
                                    </div>
                                    {tour.price !== undefined && (
                                      <div className="small text-primary fw-semibold mt-1">
                                        {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(tour.price)}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {isOwner ? (
                            <form className="row g-2 align-items-end" onSubmit={addTour}>
                              <div className="col-md-9">
                                <label className="form-label" htmlFor="itinerary-tour">Thêm tour</label>
                                <select
                                  id="itinerary-tour"
                                  className="form-select"
                                  value={tourId}
                                  onChange={(event) => setTourId(event.target.value)}
                                  disabled={saving || selectableTours.length === 0}
                                  required
                                >
                                  <option value="">Chọn tour</option>
                                  {selectableTours.map((tour) => (
                                    <option value={tour._id} key={tour._id}>
                                      {tour.title}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div className="col-md-3">
                                <button className="btn btn-outline-primary w-100" disabled={saving || !tourId}>
                                  Thêm
                                </button>
                              </div>
                            </form>
                          ) : (
                            <p className="small text-muted mb-0">Chỉ chủ sở hữu mới có thể thêm tour.</p>
                          )}
                          {isOwner && selectableTours.length === 0 && (selected.tours || []).length > 0 && (
                            <p className="small text-muted mt-2 mb-0">Không còn tour khả dụng để thêm.</p>
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

      {pendingDeleteId && (
        <>
          <div className="modal-backdrop fade show"></div>
          <div className="modal fade show d-block" tabIndex="-1" role="dialog">
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Xác nhận xóa</h5>
                  <button type="button" className="btn-close" onClick={() => setPendingDeleteId(null)} aria-label="Close"></button>
                </div>
                <div className="modal-body">
                  Bạn có chắc muốn xóa lịch trình <strong>{itineraries.find((it) => it._id === pendingDeleteId)?.title}</strong> không? Hành động này không thể hoàn tác.
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setPendingDeleteId(null)}>Hủy</button>
                  <button type="button" className="btn btn-danger" onClick={() => deleteItinerary(pendingDeleteId)}>Xóa</button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
      {confirmModal.open && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Xác nhận xóa</h5>
                <button type="button" className="btn-close" onClick={() => setConfirmModal({ open: false, destination: null })}></button>
              </div>
              <div className="modal-body">
                Bạn có chắc muốn xóa <strong>{confirmModal.destination?.name}</strong> khỏi lịch trình?
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setConfirmModal({ open: false, destination: null })}>Hủy</button>
                <button type="button" className="btn btn-danger" disabled={saving} onClick={removeDestination}>
                  {saving ? 'Đang xóa...' : 'Xóa'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {confirmTourModal.open && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Xác nhận xóa</h5>
                <button type="button" className="btn-close" onClick={() => setConfirmTourModal({ open: false, tour: null })}></button>
              </div>
              <div className="modal-body">
                Bạn có chắc muốn xóa <strong>{confirmTourModal.tour?.title}</strong> khỏi lịch trình?
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setConfirmTourModal({ open: false, tour: null })}>Hủy</button>
                <button type="button" className="btn btn-danger" disabled={saving} onClick={removeTour}>
                  {saving ? 'Đang xóa...' : 'Xóa'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {duplicateModal.open && (
        <>
          <div className="modal-backdrop fade show"></div>
          <div className="modal fade show d-block" tabIndex="-1" role="dialog" aria-modal="true">
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content border-0 shadow">
                <div className="modal-header">
                  <h5 className="modal-title fw-bold">Nhân bản lịch trình</h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setDuplicateModal({ open: false, itinerary: null, title: '' })}
                    disabled={saving}
                    aria-label="Đóng"
                  ></button>
                </div>
                <form onSubmit={(e) => { e.preventDefault(); duplicateItinerary(); }}>
                  <div className="modal-body">
                    <p className="text-muted small mb-3">
                      Tạo bản sao mới từ lịch trình <strong>{duplicateModal.itinerary?.title}</strong>. Bản sao sẽ thuộc sở hữu của bạn và có thể tùy ý chỉnh sửa.
                    </p>
                    <label className="form-label fw-semibold" htmlFor="duplicate-itinerary-title">Tên lịch trình mới</label>
                    <input
                      id="duplicate-itinerary-title"
                      className="form-control"
                      value={duplicateModal.title}
                      onChange={(e) => setDuplicateModal((prev) => ({ ...prev, title: e.target.value }))}
                      maxLength={120}
                      required
                    />
                  </div>
                  <div className="modal-footer">
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={() => setDuplicateModal({ open: false, itinerary: null, title: '' })}
                      disabled={saving}
                    >
                      Hủy
                    </button>
                    <button type="submit" className="btn btn-primary" disabled={saving}>
                      {saving ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>
                          Đang nhân bản...
                        </>
                      ) : (
                        <>
                          <i className="bi bi-copy me-1"></i>
                          Xác nhận nhân bản
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}

export default Itinerary;
