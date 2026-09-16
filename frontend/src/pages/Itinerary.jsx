import { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { itineraryApi } from '../services/api';
import { useAuth } from '../hooks/useAuth';

const initialItinerary = { title: '', budget: '' };
const initialActivity = {
  title: '', date: '', startTime: '', endTime: '', location: '', estimatedCost: '', notes: ''
};

/**
 * Customer-facing personal itinerary workspace.
 */
function Itinerary() {
  const { user, isAuthenticated } = useAuth();
  const [itineraries, setItineraries] = useState([]);
  const [selected, setSelected] = useState(null);
  const [itineraryForm, setItineraryForm] = useState(initialItinerary);
  const [activityForm, setActivityForm] = useState(initialActivity);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const loadItineraries = async () => {
    if (!isAuthenticated || user?.role !== 'customer') {
      setLoading(false);
      return;
    }

    try {
      const response = await itineraryApi.list();
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
  }, [isAuthenticated, user?.role]);

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
      setItineraries((current) => current.map((itinerary) => (
        itinerary._id === response.itinerary._id ? response.itinerary : itinerary
      )));
      setActivityForm(initialActivity);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Navbar />
      <main className="bg-light py-5 flex-grow-1">
        <div className="container">
          <div className="mb-4">
            <p className="text-primary text-uppercase fw-semibold small mb-2">Personal planning</p>
            <h1 className="fw-bold mb-2">Lịch trình của tôi</h1>
            <p className="text-muted mb-0">Tạo và quản lý lịch trình cá nhân của bạn.</p>
          </div>

          {!isAuthenticated ? (
            <div className="alert alert-info">Vui lòng đăng nhập để sử dụng lịch trình cá nhân.</div>
          ) : user?.role !== 'customer' ? (
            <div className="alert alert-warning">Chức năng lịch trình cá nhân dành cho Customer.</div>
          ) : (
            <>
              {error && <div className="alert alert-danger">{error}</div>}
              <div className="row g-4">
                <div className="col-lg-4">
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

                  <div className="list-group shadow-sm">
                    {itineraries.map((itinerary) => (
                      <button key={itinerary._id} className={`list-group-item list-group-item-action ${selected?._id === itinerary._id ? 'active' : ''}`} onClick={() => setSelected(itinerary)}>
                        <span className="fw-semibold d-block">{itinerary.title}</span>
                        <small>{itinerary.activities.length} hoạt động</small>
                      </button>
                    ))}
                    {!loading && itineraries.length === 0 && <div className="list-group-item text-muted">Chưa có lịch trình.</div>}
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
                            <div><h2 className="h4 fw-bold mb-1">{selected.title}</h2><p className="text-muted mb-0">Ngân sách: {selected.budget || 0}</p></div>
                            <span className="badge text-bg-success">Có thể chỉnh sửa</span>
                          </div>
                          {selected.activities.length === 0 ? <p className="text-muted mb-0">Chưa có hoạt động.</p> : (
                            <div className="vstack gap-3">
                              {selected.activities.map((activity) => (
                                <div className="border-start border-primary border-3 ps-3" key={activity._id}>
                                  <div className="fw-semibold">{activity.title}</div>
                                  <div className="small text-muted">{new Date(activity.date).toLocaleDateString()} · {activity.startTime} - {activity.endTime}{activity.location ? ` · ${activity.location}` : ''}</div>
                                  {activity.notes && <div className="small mt-1">{activity.notes}</div>}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </section>

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
