import { useEffect, useState, useRef } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import ItineraryPrintView from '../components/ItineraryPrintView';
import CustomSelect from '../components/CustomSelect';
import CustomTimePicker from '../components/CustomTimePicker';
import CustomDatePicker from '../components/CustomDatePicker';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal';
import CreateItineraryModal from './CreateItineraryModal';
import { destinationApi, itineraryApi, tourApi } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';

const initialActivity = {
  title: '', date: '', startTime: '', endTime: '', location: '', estimatedCost: '', notes: ''
};

const formatDateRange = (startDate, endDate) => {
  if (!startDate && !endDate) return '';
  const format = (value) => new Date(value).toLocaleDateString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  });
  if (startDate && endDate) return `${format(startDate)} - ${format(endDate)}`;
  return format(startDate || endDate);
};

function Itinerary() {
  const { user, isAuthenticated } = useAuth();
  const toast = useToast();
  const [itineraries, setItineraries] = useState([]);
  const [sharedItineraries, setSharedItineraries] = useState([]);
  const [activeTab, setActiveTab] = useState('mine');
  const [selected, setSelected] = useState(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [activityForm, setActivityForm] = useState(initialActivity);
  const [editingActivityId, setEditingActivityId] = useState(null);
  const activityFormRef = useRef(null);
  const [destinations, setDestinations] = useState([]);
  const [destinationId, setDestinationId] = useState('');
  const [tours, setTours] = useState([]);
  const [tourId, setTourId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [pendingDeleteId, setPendingDeleteId] = useState(null);
  const [pendingDeleteActivity, setPendingDeleteActivity] = useState(null);
  const [pendingRemoveCollaborator, setPendingRemoveCollaborator] = useState(null);
  const [duplicateModal, setDuplicateModal] = useState({ open: false, itinerary: null, title: '' });
  const [confirmModal, setConfirmModal] = useState({ open: false, destination: null });
  const [confirmTourModal, setConfirmTourModal] = useState({ open: false, tour: null });
  const [reorderMode, setReorderMode] = useState(false);
  const [reorderList, setReorderList] = useState([]);
  const [shareModal, setShareModal] = useState({
    open: false,
    email: '',
    permission: 'view',
    submitting: false,
    error: ''
  });
  const [removingCollaboratorId, setRemovingCollaboratorId] = useState(null);

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

  const handleCreated = (itinerary) => {
    setItineraries((current) => [itinerary, ...current]);
    setSelected(itinerary);
    setActiveTab('mine');
  };

  const handleStartEditActivity = (activity) => {
    setEditingActivityId(activity._id);
    const dateFormatted = activity.date ? new Date(activity.date).toISOString().split('T')[0] : '';
    setActivityForm({
      title: activity.title || '',
      date: dateFormatted,
      startTime: activity.startTime || '',
      endTime: activity.endTime || '',
      location: activity.location || '',
      estimatedCost: activity.estimatedCost !== undefined && activity.estimatedCost !== null && activity.estimatedCost !== '' ? String(activity.estimatedCost) : '',
      notes: activity.notes || ''
    });

    // Smooth scroll down to the activity form and focus title input
    setTimeout(() => {
      if (activityFormRef.current) {
        activityFormRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      const titleInput = document.getElementById('activity-title');
      if (titleInput) {
        titleInput.focus();
      }
    }, 50);
  };

  const handleCancelEditActivity = () => {
    setEditingActivityId(null);
    setActivityForm(initialActivity);
  };

  const handleActivitySubmit = async (event) => {
    event.preventDefault();
    if (!selected) return;

    if (activityForm.endTime <= activityForm.startTime) {
      toast.error('Giờ kết thúc phải sau giờ bắt đầu.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const payload = {
        title: activityForm.title.trim(),
        date: activityForm.date,
        startTime: activityForm.startTime,
        endTime: activityForm.endTime,
        location: activityForm.location ? activityForm.location.trim() : '',
        estimatedCost: activityForm.estimatedCost === '' || activityForm.estimatedCost === null ? 0 : Number(activityForm.estimatedCost),
        notes: activityForm.notes ? activityForm.notes.trim() : ''
      };

      if (editingActivityId) {
        const response = await itineraryApi.updateActivity(selected._id, editingActivityId, payload);
        applyItinerary(response.itinerary);
        setEditingActivityId(null);
        setActivityForm(initialActivity);
        toast.success(response.message || 'Đã cập nhật hoạt động thành công.');
      } else {
        const response = await itineraryApi.addActivity(selected._id, payload);
        applyItinerary(response.itinerary);
        setActivityForm(initialActivity);
        toast.success('Đã thêm hoạt động vào lịch trình.');
      }
    } catch (requestError) {
      toast.error(requestError.message || (editingActivityId ? 'Không thể cập nhật hoạt động.' : 'Không thể thêm hoạt động.'));
    } finally {
      setSaving(false);
    }
  };

  const removeActivity = async (activityId) => {
    if (!selected) return;

    setSaving(true);
    setError('');
    try {
      const response = await itineraryApi.removeActivity(selected._id, activityId);
      applyItinerary(response.itinerary);
      if (editingActivityId === activityId) {
        handleCancelEditActivity();
      }
      toast.success(response.message || 'Đã xóa hoạt động khỏi lịch trình.');
    } catch (requestError) {
      toast.error(requestError.message || 'Không thể xóa hoạt động.');
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

  const openShareModal = () => {
    setShareModal({
      open: true,
      email: '',
      permission: 'view',
      submitting: false,
      error: ''
    });
  };

  const closeShareModal = () => {
    if (shareModal.submitting) return;
    setShareModal({
      open: false,
      email: '',
      permission: 'view',
      submitting: false,
      error: ''
    });
  };

  const handleShareItinerary = async (e) => {
    e.preventDefault();
    if (!selected || !shareModal.email.trim()) return;

    setShareModal((prev) => ({ ...prev, submitting: true, error: '' }));
    try {
      const response = await itineraryApi.share(selected._id, {
        email: shareModal.email.trim().toLowerCase(),
        permission: shareModal.permission
      });
      applyItinerary(response.itinerary);
      toast.success(response.message || 'Đã chia sẻ lịch trình thành công.');
      setShareModal({
        open: false,
        email: '',
        permission: 'view',
        submitting: false,
        error: ''
      });
    } catch (err) {
      setShareModal((prev) => ({
        ...prev,
        submitting: false,
        error: err.message || 'Không thể chia sẻ lịch trình.'
      }));
    }
  };

  const handleRemoveCollaborator = async (userId) => {
    if (!selected) return;

    setRemovingCollaboratorId(userId);
    try {
      const response = await itineraryApi.removeCollaborator(selected._id, userId);
      applyItinerary(response.itinerary);
      toast.success(response.message || 'Đã hủy quyền cộng tác viên thành công.');
    } catch (err) {
      toast.error(err.message || 'Không thể hủy quyền cộng tác viên.');
    } finally {
      setRemovingCollaboratorId(null);
    }
  };

  const currentUserId = String(user?._id || user?.id || '');
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
                    <div className="card border-0 shadow-sm mb-4">
                      <div className="card-body p-4 text-center">
                        <h2 className="h5 fw-bold mb-2">Tạo lịch trình</h2>
                        <p className="text-muted small mb-3">Bắt đầu lên kế hoạch cho chuyến đi của bạn.</p>
                        <button type="button" className="btn btn-primary w-100" onClick={() => setCreateModalOpen(true)}>
                          <i className="bi bi-calendar-plus me-1"></i>Tạo lịch trình
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="list-group shadow-sm">
                    {visibleItineraries.map((itinerary) => {
                      const isItemActive = selected?._id === itinerary._id;
                      const dateRange = formatDateRange(itinerary.startDate, itinerary.endDate);
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
                              {dateRange && <span> · {dateRange}</span>}
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
                      <div className="tm-list-empty py-4 my-2">
                        <i className="bi bi-calendar2-range tm-list-empty-icon"></i>
                        {activeTab === 'shared' ? 'Chưa có lịch trình nào được chia sẻ với bạn.' : 'Chưa có lịch trình nào.'}
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
                          <div className="mb-3">
                            <div className="d-flex align-items-center gap-2 flex-wrap mb-2">
                              <h2 className="h4 fw-bold mb-0 text-dark text-break">{selected.title}</h2>
                              <span className={`badge rounded-pill ${isOwner ? 'text-bg-primary' : canEditSelected ? 'text-bg-success' : 'text-bg-secondary'}`} style={{ fontSize: '0.75rem', padding: '0.35em 0.7em' }}>
                                {isOwner ? 'Chủ sở hữu' : canEditSelected ? 'Có thể chỉnh sửa' : 'Chỉ xem'}
                              </span>
                            </div>
                            <div className="d-flex align-items-center flex-wrap gap-2">
                              {isOwner && (
                                <button
                                  type="button"
                                  className="btn btn-outline-success btn-sm text-nowrap d-inline-flex align-items-center"
                                  onClick={openShareModal}
                                  title="Chia sẻ lịch trình với người khác"
                                >
                                  <i className="bi bi-share me-1"></i>
                                  <span>Chia sẻ</span>
                                </button>
                              )}
                              <button
                                type="button"
                                className="btn btn-outline-primary btn-sm text-nowrap d-inline-flex align-items-center"
                                onClick={exportItinerary}
                                title="Xuất lịch trình ra bản in hoặc PDF"
                              >
                                <i className="bi bi-printer me-1"></i>
                                <span>Xuất lịch trình</span>
                              </button>
                              <button
                                type="button"
                                className="btn btn-outline-secondary btn-sm text-nowrap d-inline-flex align-items-center"
                                onClick={() => setDuplicateModal({
                                  open: true,
                                  itinerary: selected,
                                  title: `${selected.title} (Bản sao)`
                                })}
                                title="Tạo bản sao lịch trình"
                              >
                                <i className="bi bi-copy me-1"></i>
                                <span>Nhân bản</span>
                              </button>
                              {isOwner && (
                                <button
                                  type="button"
                                  className="btn btn-outline-danger btn-sm text-nowrap d-inline-flex align-items-center"
                                  onClick={() => setPendingDeleteId(selected._id)}
                                  title="Xóa lịch trình này"
                                >
                                  <i className="bi bi-trash me-1"></i>
                                  <span>Xóa lịch trình</span>
                                </button>
                              )}
                            </div>
                          </div>

                          <div className="d-flex align-items-center flex-wrap gap-2 pb-3 mb-3 border-bottom text-muted small">
                            <span className="badge bg-light text-secondary border fw-normal py-1 px-2 d-inline-flex align-items-center">
                              <i className="bi bi-wallet2 text-success me-1"></i>
                              <span>Ngân sách: <strong className="text-dark ms-1">{Number(selected.budget || 0).toLocaleString('vi-VN')} ₫</strong></span>
                            </span>
                            <span className="badge bg-light text-secondary border fw-normal py-1 px-2 d-inline-flex align-items-center">
                              <i className="bi bi-geo-alt text-danger me-1"></i>
                              <span>Điểm đến: <strong className="text-dark ms-1">{(selected.destinations || []).length}</strong></span>
                            </span>
                            <span className="badge bg-light text-secondary border fw-normal py-1 px-2 d-inline-flex align-items-center">
                              <i className="bi bi-calendar-check text-primary me-1"></i>
                              <span>Hoạt động: <strong className="text-dark ms-1">{selected.activities.length}</strong></span>
                            </span>
                            {formatDateRange(selected.startDate, selected.endDate) && (
                              <span className="badge bg-light text-secondary border fw-normal py-1 px-2 d-inline-flex align-items-center">
                                <i className="bi bi-calendar3 text-info me-1"></i>
                                <span>Thời gian: <strong className="text-dark ms-1">{formatDateRange(selected.startDate, selected.endDate)}</strong></span>
                              </span>
                            )}
                          </div>

                          {(selected.collaborators || []).length > 0 && (
                            <div className="d-flex align-items-center flex-wrap gap-2 mb-3 p-2 bg-light rounded border">
                              <small className="text-muted fw-semibold">
                                <i className="bi bi-people me-1"></i>Người tham gia ({selected.collaborators.length}):
                              </small>
                              {selected.collaborators.map((c) => {
                                const collabId = c.user?._id || c.user;
                                return (
                                  <span key={collabId} className="badge bg-white text-dark border d-flex align-items-center gap-1 py-1 px-2">
                                    <i className="bi bi-person-fill text-primary"></i>
                                    <span>{c.user?.username || c.user?.email || 'Người dùng'}</span>
                                    <span className={`badge ${c.permission === 'edit' ? 'text-bg-warning' : 'text-bg-secondary'}`} style={{ fontSize: '0.65rem' }}>
                                      {c.permission === 'edit' ? 'Sửa' : 'Xem'}
                                    </span>
                                    {isOwner && (
                                      <button
                                        type="button"
                                        className="btn btn-link p-0 text-danger ms-1"
                                        style={{ fontSize: '0.75rem', lineHeight: 1 }}
                                        title="Hủy chia sẻ"
                                        disabled={removingCollaboratorId === collabId}
                                        onClick={() => setPendingRemoveCollaborator(c)}
                                      >
                                        <i className="bi bi-x"></i>
                                      </button>
                                    )}
                                  </span>
                                );
                              })}
                            </div>
                          )}

                          {(selected.conflicts || []).length > 0 && (
                            <div className="alert alert-warning mb-3 border border-warning-subtle">
                              <div className="d-flex align-items-center mb-2">
                                <i className="bi bi-exclamation-triangle-fill me-2 text-warning fs-5"></i>
                                <div className="fw-semibold">
                                  <strong>Xung đột lịch trình:</strong> phát hiện {(selected.conflicts || []).length} cặp hoạt động trùng thời gian:
                                </div>
                              </div>
                              <div className="vstack gap-2">
                                {selected.conflicts.map((conflict, index) => (
                                  <div
                                    key={index}
                                    className="bg-white bg-opacity-75 border border-warning rounded p-2 px-3 small d-flex align-items-center flex-wrap gap-2 text-dark"
                                  >
                                    <i className="bi bi-clock-history text-warning"></i>
                                    <strong>{conflict.first.title}</strong>
                                    <span className="badge text-bg-light border">
                                      {conflict.first.startTime} - {conflict.first.endTime}
                                    </span>
                                    <span className="text-muted fw-semibold">trùng với</span>
                                    <strong>{conflict.second.title}</strong>
                                    <span className="badge text-bg-light border">
                                      {conflict.second.startTime} - {conflict.second.endTime}
                                    </span>
                                  </div>
                                ))}
                              </div>
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
                                  const isEditingThis = editingActivityId === activity._id;
                                  return (
                                    <div
                                      className={`border rounded p-3 transition-all ${
                                        isEditingThis
                                          ? 'border-primary border-2 shadow-sm bg-primary-subtle bg-opacity-10'
                                          : reorderMode
                                            ? 'bg-white'
                                            : 'border-start border-primary border-3'
                                      }`}
                                      key={activity._id}
                                    >
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
                                          <div className="d-flex justify-content-between align-items-start">
                                            <div className="fw-semibold d-flex align-items-center gap-2 flex-wrap">
                                              {reorderMode && <span className="text-muted small me-1">{index + 1}.</span>}
                                              <span>{activity.title}</span>
                                              {conflicted && <span className="badge text-bg-warning">Xung đột</span>}
                                              {isEditingThis && (
                                                <span className="badge bg-primary">
                                                  <i className="bi bi-pencil-fill me-1"></i>Đang sửa bên dưới
                                                </span>
                                              )}
                                              {activity.estimatedCost !== undefined && activity.estimatedCost !== null && activity.estimatedCost > 0 ? (
                                                <span className="badge bg-success-subtle text-success border border-success-subtle fw-semibold">
                                                  <i className="bi bi-wallet2 me-1"></i>
                                                  {Number(activity.estimatedCost).toLocaleString('vi-VN')} ₫
                                                </span>
                                              ) : null}
                                            </div>

                                            {canEditSelected && !reorderMode && (
                                              <div className="d-flex align-items-center gap-1 ms-2">
                                                <button
                                                  type="button"
                                                  className={`btn btn-sm ${isEditingThis ? 'btn-primary text-white shadow-sm' : 'btn-outline-primary border-0'} p-1`}
                                                  onClick={() => handleStartEditActivity(activity)}
                                                  title={isEditingThis ? 'Đang chỉnh sửa ở form bên dưới' : 'Chỉnh sửa hoạt động'}
                                                  disabled={saving}
                                                >
                                                  <i className="bi bi-pencil-square"></i>
                                                </button>
                                                <button
                                                  type="button"
                                                  className="btn btn-sm btn-outline-danger border-0 p-1"
                                                  onClick={() => setPendingDeleteActivity(activity)}
                                                  title="Xóa hoạt động"
                                                  disabled={saving}
                                                >
                                                  <i className="bi bi-trash"></i>
                                                </button>
                                              </div>
                                            )}
                                          </div>

                                          <div className="small text-muted mt-1">
                                            <i className="bi bi-calendar-event me-1"></i>
                                            {new Date(activity.date).toLocaleDateString('vi-VN')} · <i className="bi bi-clock me-1"></i>{activity.startTime} - {activity.endTime}
                                            {activity.location ? ` · ${activity.location}` : ''}
                                          </div>
                                          {activity.notes && <div className="small text-secondary mt-1 bg-light p-2 rounded">{activity.notes}</div>}
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
                                          className="btn btn-sm btn-outline-danger border-0 p-1"
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
                                <CustomSelect
                                  id="itinerary-destination"
                                  value={destinationId}
                                  onChange={(e, val) => setDestinationId(val || e.target.value)}
                                  disabled={saving || selectableDestinations.length === 0}
                                  placeholder="Chọn điểm đến"
                                  options={[
                                    { value: '', label: 'Chọn điểm đến' },
                                    ...selectableDestinations.map((destination) => ({
                                      value: destination._id,
                                      label: `${destination.name} — ${destination.location}`,
                                      icon: 'bi bi-geo-alt'
                                    }))
                                  ]}
                                />
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
                                          className="btn btn-sm btn-outline-danger border-0 p-1"
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
                                <CustomSelect
                                  id="itinerary-tour"
                                  value={tourId}
                                  onChange={(e, val) => setTourId(val || e.target.value)}
                                  disabled={saving || selectableTours.length === 0}
                                  placeholder="Chọn tour"
                                  options={[
                                    { value: '', label: 'Chọn tour' },
                                    ...selectableTours.map((tour) => ({
                                      value: tour._id,
                                      label: tour.title,
                                      icon: 'bi bi-compass'
                                    }))
                                  ]}
                                />
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
                        <form
                          ref={activityFormRef}
                          className={`card border-0 shadow-sm transition-all ${editingActivityId ? 'border border-2 border-primary shadow' : ''}`}
                          onSubmit={handleActivitySubmit}
                        >
                          <div className="card-body p-4">
                            <div className="d-flex align-items-center justify-content-between mb-3">
                              <h2 className="h5 fw-bold mb-0 d-flex align-items-center gap-2">
                                {editingActivityId ? (
                                  <>
                                    <i className="bi bi-pencil-square text-primary"></i>
                                    <span>Chỉnh sửa hoạt động</span>
                                    <span className="badge bg-primary-subtle text-primary border border-primary-subtle ms-2 fw-normal small">
                                      Đang chỉnh sửa
                                    </span>
                                  </>
                                ) : (
                                  <>
                                    <i className="bi bi-plus-circle text-primary"></i>
                                    <span>Thêm hoạt động</span>
                                  </>
                                )}
                              </h2>
                              {editingActivityId && (
                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline-secondary"
                                  onClick={handleCancelEditActivity}
                                  disabled={saving}
                                >
                                  <i className="bi bi-x me-1"></i>Hủy chỉnh sửa
                                </button>
                              )}
                            </div>

                            <div className="row g-3">
                              <div className="col-md-6">
                                <label className="form-label" htmlFor="activity-title">
                                  Hoạt động <span className="text-danger">*</span>
                                </label>
                                <input
                                  id="activity-title"
                                  className="form-control"
                                  value={activityForm.title}
                                  onChange={(event) => setActivityForm({ ...activityForm, title: event.target.value })}
                                  placeholder="Ví dụ: Đi cáp treo Fansipan..."
                                  required
                                  disabled={saving}
                                />
                              </div>
                              <div className="col-md-6">
                                <label className="form-label" htmlFor="activity-date">
                                  Ngày <span className="text-danger">*</span>
                                </label>
                                <CustomDatePicker
                                  id="activity-date"
                                  name="date"
                                  value={activityForm.date}
                                  onChange={(event) => setActivityForm({ ...activityForm, date: event.target.value })}
                                  required
                                  disabled={saving}
                                />
                              </div>
                              <div className="col-md-6">
                                <label className="form-label" htmlFor="activity-start">
                                  Giờ bắt đầu <span className="text-danger">*</span>
                                </label>
                                <CustomTimePicker
                                  id="activity-start"
                                  name="startTime"
                                  value={activityForm.startTime}
                                  onChange={(event) => setActivityForm({ ...activityForm, startTime: event.target.value })}
                                  required
                                  disabled={saving}
                                />
                              </div>
                              <div className="col-md-6">
                                <label className="form-label" htmlFor="activity-end">
                                  Giờ kết thúc <span className="text-danger">*</span>
                                </label>
                                <CustomTimePicker
                                  id="activity-end"
                                  name="endTime"
                                  value={activityForm.endTime}
                                  onChange={(event) => setActivityForm({ ...activityForm, endTime: event.target.value })}
                                  required
                                  disabled={saving}
                                />
                              </div>
                              <div className="col-md-6">
                                <label className="form-label" htmlFor="activity-location">Địa điểm</label>
                                <input
                                  id="activity-location"
                                  className="form-control"
                                  value={activityForm.location}
                                  onChange={(event) => setActivityForm({ ...activityForm, location: event.target.value })}
                                  placeholder="Ví dụ: Sa Pa, Lào Cai"
                                  disabled={saving}
                                />
                              </div>
                              <div className="col-md-6">
                                <label className="form-label" htmlFor="activity-cost">Chi phí dự kiến (₫)</label>
                                <input
                                  id="activity-cost"
                                  type="number"
                                  min="0"
                                  step="1000"
                                  className="form-control"
                                  value={activityForm.estimatedCost}
                                  onChange={(event) => setActivityForm({ ...activityForm, estimatedCost: event.target.value })}
                                  placeholder="Ví dụ: 150000"
                                  disabled={saving}
                                />
                              </div>
                              <div className="col-12">
                                <label className="form-label" htmlFor="activity-notes">Ghi chú</label>
                                <textarea
                                  id="activity-notes"
                                  className="form-control"
                                  rows="2"
                                  value={activityForm.notes}
                                  onChange={(event) => setActivityForm({ ...activityForm, notes: event.target.value })}
                                  placeholder="Thêm ghi chú nếu có..."
                                  disabled={saving}
                                />
                              </div>
                            </div>

                            <div className="d-flex align-items-center gap-2 mt-3">
                              <button className="btn btn-primary" disabled={saving}>
                                {saving ? (
                                  <>
                                    <span className="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>
                                    Đang lưu...
                                  </>
                                ) : editingActivityId ? (
                                  <>
                                    <i className="bi bi-check2-circle me-1"></i>
                                    Lưu thay đổi
                                  </>
                                ) : (
                                  <>
                                    <i className="bi bi-plus-lg me-1"></i>
                                    Thêm hoạt động
                                  </>
                                )}
                              </button>

                              {editingActivityId && (
                                <button
                                  type="button"
                                  className="btn btn-outline-secondary"
                                  onClick={handleCancelEditActivity}
                                  disabled={saving}
                                >
                                  Hủy bỏ
                                </button>
                              )}
                            </div>
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

      <CreateItineraryModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onCreated={handleCreated}
      />

      <ConfirmDeleteModal
        isOpen={Boolean(pendingDeleteId)}
        title="Xác nhận xóa lịch trình"
        message={
          <>
            Bạn có chắc muốn xóa lịch trình <strong>{itineraries.find((it) => it._id === pendingDeleteId)?.title}</strong> không? Hành động này không thể hoàn tác.
          </>
        }
        loading={saving}
        onConfirm={() => deleteItinerary(pendingDeleteId)}
        onClose={() => setPendingDeleteId(null)}
      />

      <ConfirmDeleteModal
        isOpen={Boolean(pendingDeleteActivity)}
        title="Xác nhận xóa hoạt động"
        message={
          <>
            Bạn có chắc muốn xóa hoạt động <strong>{pendingDeleteActivity?.title || 'này'}</strong> khỏi lịch trình? Hành động này không thể hoàn tác.
          </>
        }
        loading={saving}
        onConfirm={async () => {
          if (pendingDeleteActivity) {
            const id = pendingDeleteActivity._id;
            setPendingDeleteActivity(null);
            await removeActivity(id);
          }
        }}
        onClose={() => setPendingDeleteActivity(null)}
      />

      <ConfirmDeleteModal
        isOpen={Boolean(pendingRemoveCollaborator)}
        title="Xác nhận hủy quyền cộng tác viên"
        confirmText="Hủy quyền"
        message={
          <>
            Bạn có chắc muốn hủy chia sẻ lịch trình với người dùng{' '}
            <strong>{pendingRemoveCollaborator?.user?.username || pendingRemoveCollaborator?.user?.email || 'này'}</strong> không?
          </>
        }
        loading={Boolean(removingCollaboratorId)}
        onConfirm={async () => {
          if (pendingRemoveCollaborator) {
            const collabId = pendingRemoveCollaborator.user?._id || pendingRemoveCollaborator.user;
            setPendingRemoveCollaborator(null);
            await handleRemoveCollaborator(collabId);
          }
        }}
        onClose={() => setPendingRemoveCollaborator(null)}
      />

      <ConfirmDeleteModal
        isOpen={confirmModal.open}
        title="Xác nhận xóa điểm đến"
        message={
          <>
            Bạn có chắc muốn xóa <strong>{confirmModal.destination?.name}</strong> khỏi lịch trình?
          </>
        }
        loading={saving}
        onConfirm={removeDestination}
        onClose={() => setConfirmModal({ open: false, destination: null })}
      />

      <ConfirmDeleteModal
        isOpen={confirmTourModal.open}
        title="Xác nhận xóa tour"
        message={
          <>
            Bạn có chắc muốn xóa <strong>{confirmTourModal.tour?.title}</strong> khỏi lịch trình?
          </>
        }
        loading={saving}
        onConfirm={removeTour}
        onClose={() => setConfirmTourModal({ open: false, tour: null })}
      />

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

      {shareModal.open && (
        <>
          <div className="modal-backdrop fade show"></div>
          <div className="modal fade show d-block" tabIndex="-1" role="dialog" aria-modal="true">
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content border-0 shadow">
                <div className="modal-header">
                  <h5 className="modal-title fw-bold">
                    <i className="bi bi-share me-2 text-primary"></i>
                    Chia sẻ lịch trình cá nhân
                  </h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={closeShareModal}
                    disabled={shareModal.submitting}
                    aria-label="Đóng"
                  ></button>
                </div>
                <form onSubmit={handleShareItinerary}>
                  <div className="modal-body">
                    <p className="text-muted small mb-3">
                      Chia sẻ lịch trình <strong>{selected?.title}</strong> với người dùng khác qua địa chỉ email đã đăng ký trên hệ thống.
                    </p>

                    {shareModal.error && (
                      <div className="alert alert-danger py-2 small mb-3">
                        <i className="bi bi-exclamation-circle me-1"></i>
                        {shareModal.error}
                      </div>
                    )}

                    <div className="mb-3">
                      <label className="form-label fw-semibold" htmlFor="share-email">
                        Email người nhận <span className="text-danger">*</span>
                      </label>
                      <div className="input-group">
                        <span className="input-group-text"><i className="bi bi-envelope"></i></span>
                        <input
                          id="share-email"
                          type="email"
                          className="form-control"
                          placeholder="nguoidung@example.com"
                          value={shareModal.email}
                          onChange={(e) => setShareModal((prev) => ({ ...prev, email: e.target.value, error: '' }))}
                          required
                          disabled={shareModal.submitting}
                        />
                      </div>
                    </div>

                    <div className="mb-4">
                      <label className="form-label fw-semibold" htmlFor="share-permission">
                        Quyền truy cập
                      </label>
                      <CustomSelect
                        id="share-permission"
                        value={shareModal.permission}
                        onChange={(e, val) => setShareModal((prev) => ({ ...prev, permission: val || e.target.value }))}
                        disabled={shareModal.submitting}
                        options={[
                          { value: 'view', label: 'Chỉ xem (View)', icon: 'bi bi-eye' },
                          { value: 'edit', label: 'Chỉnh sửa (Edit)', icon: 'bi bi-pencil-square' }
                        ]}
                      />
                    </div>

                    <div className="border-top pt-3">
                      <h6 className="fw-semibold small text-uppercase text-muted mb-2">
                        Người tham gia hiện tại ({(selected?.collaborators || []).length})
                      </h6>
                      {(!selected?.collaborators || selected.collaborators.length === 0) ? (
                        <div className="tm-list-empty py-3">
                          <i className="bi bi-people tm-list-empty-icon" style={{ fontSize: '1.4rem' }}></i>
                          Chưa có người nào được chia sẻ lịch trình này.
                        </div>
                      ) : (
                        <div className="tm-collaborator-list">
                          {selected.collaborators.map((c) => {
                            const collabUserId = c.user?._id || c.user;
                            const isRemoving = removingCollaboratorId === collabUserId;
                            const displayName = c.user?.username || 'Người dùng';
                            const initial = displayName.charAt(0).toUpperCase();
                            return (
                              <div key={collabUserId} className="tm-collaborator-item">
                                <div className="d-flex align-items-center min-w-0 flex-grow-1">
                                  <div className="tm-collaborator-avatar">{initial}</div>
                                  <div className="tm-collaborator-meta">
                                    <div className="tm-collaborator-name">{displayName}</div>
                                    {c.user?.email && <div className="tm-collaborator-email">{c.user.email}</div>}
                                  </div>
                                </div>
                                <div className="d-flex align-items-center gap-2 ms-2">
                                  <span className={`tm-collaborator-badge ${c.permission === 'edit' ? 'badge-edit' : 'badge-view'}`}>
                                    {c.permission === 'edit' ? 'Chỉnh sửa' : 'Chỉ xem'}
                                  </span>
                                  {isOwner && (
                                    <button
                                      type="button"
                                      className="btn btn-outline-danger btn-sm py-1 px-2 border-0"
                                      title="Hủy chia sẻ"
                                      disabled={isRemoving || shareModal.submitting}
                                      onClick={() => handleRemoveCollaborator(collabUserId)}
                                    >
                                      {isRemoving ? (
                                        <span className="spinner-border spinner-border-sm" aria-hidden="true"></span>
                                      ) : (
                                        <i className="bi bi-trash3 text-danger"></i>
                                      )}
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={closeShareModal}
                      disabled={shareModal.submitting}
                    >
                      Đóng
                    </button>
                    <button type="submit" className="btn btn-primary" disabled={shareModal.submitting}>
                      {shareModal.submitting ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>
                          Đang lưu...
                        </>
                      ) : (
                        <>
                          <i className="bi bi-share me-1"></i>
                          Chia sẻ ngay
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
