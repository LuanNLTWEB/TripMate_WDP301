import { useState, useEffect } from 'react';
import { tourApi } from '../services/api';
import { useToast } from '../hooks/useToast';
import CreateTourScheduleModal from './CreateTourScheduleModal';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal';

export default function TourScheduleModal({ open, onClose, tour, onUpdated }) {
  const toast = useToast();
  const [schedules, setSchedules] = useState([]);
  const [loadedTourId, setLoadedTourId] = useState(null);
  const [scheduleForm, setScheduleForm] = useState({ open: false, schedule: null });
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (open && tour?._id) {
      tourApi.getSchedule(tour._id)
        .then((res) => {
          setSchedules(res.data || []);
        })
        .catch((err) => {
          toast.error(err.message || 'Không thể tải lịch trình tour.');
        })
        .finally(() => {
          setLoadedTourId(tour._id);
        });
    }
  }, [open, tour?._id, toast]);

  if (!open || !tour) return null;

  const handleSaved = (savedItem, updatedItinerary) => {
    if (Array.isArray(updatedItinerary)) {
      setSchedules(updatedItinerary);
    } else if (savedItem) {
      setSchedules((current) => {
        const exists = current.some((item) => item._id === savedItem._id);
        const next = exists
          ? current.map((item) => (item._id === savedItem._id ? savedItem : item))
          : [...current, savedItem];
        return next.sort((first, second) => first.day - second.day);
      });
    }
    setScheduleForm({ open: false, schedule: null });
    if (onUpdated) {
      onUpdated();
    }
  };

  const handleDelete = async () => {
    if (!pendingDelete) return;

    setDeleting(true);
    try {
      const response = await tourApi.deleteSchedule(tour._id, pendingDelete._id);
      setSchedules(Array.isArray(response.itinerary)
        ? response.itinerary
        : (current) => current.filter((item) => item._id !== pendingDelete._id));
      toast.success(response.message || 'Đã xóa ngày lịch trình.');
      setPendingDelete(null);
      if (onUpdated) onUpdated();
    } catch (error) {
      toast.error(error.message || 'Không thể xóa ngày lịch trình.');
    } finally {
      setDeleting(false);
    }
  };

  const nextSuggestedDay = schedules.length > 0
    ? Math.max(...schedules.map((s) => s.day || 0)) + 1
    : 1;
  const loading = loadedTourId !== tour._id;

  return (
    <>
      <div className="modal-backdrop fade show" style={{ zIndex: 1040 }}></div>
      <div className="modal fade show d-block" tabIndex="-1" role="dialog" aria-modal="true" style={{ zIndex: 1050 }}>
        <div className="modal-dialog modal-dialog-centered modal-lg modal-dialog-scrollable">
          <div className="modal-content border-0 shadow-lg">
            <div className="modal-header bg-light">
              <div>
                <span className="badge text-bg-primary rounded-pill small mb-1">
                  Tour Schedule
                </span>
                <h5 className="modal-title fw-bold text-dark d-flex align-items-center gap-2">
                  <i className="bi bi-calendar-week text-primary"></i>
                  <span>Lịch trình chi tiết tour: {tour.title}</span>
                </h5>
                <small className="text-muted">
                  Thời lượng: <strong>{tour.duration}</strong> · Hiện có <strong>{schedules.length}</strong> ngày lịch trình
                </small>
              </div>
              <button
                type="button"
                className="btn-close"
                onClick={onClose}
                aria-label="Đóng"
              ></button>
            </div>

            <div className="modal-body p-4">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h6 className="fw-bold mb-0 text-secondary">
                  Danh sách các ngày trong hành trình:
                </h6>
                <button
                  type="button"
                  className="btn btn-primary btn-sm rounded-pill px-3 py-1.5 d-inline-flex align-items-center gap-1.5 shadow-sm"
                  onClick={() => setScheduleForm({ open: true, schedule: null })}
                >
                  <i className="bi bi-calendar-plus"></i>
                  <span>Tạo lịch trình ngày mới</span>
                </button>
              </div>

              {loading ? (
                <div className="text-center py-5 text-muted">
                  <div className="spinner-border spinner-border-sm text-primary me-2" role="status"></div>
                  <span>Đang tải lịch trình tour...</span>
                </div>
              ) : schedules.length === 0 ? (
                <div className="text-center py-5 border rounded-4 bg-light-subtle">
                  <i className="bi bi-calendar2-x text-muted fs-1 d-block mb-2"></i>
                  <h6 className="fw-bold text-dark mb-1">Chưa có lịch trình chi tiết</h6>
                  <p className="small text-muted mb-3">
                    Lịch trình chi tiết đang được cập nhật bởi nhà cung cấp.
                  </p>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm rounded-pill px-3"
                    onClick={() => setScheduleForm({ open: true, schedule: null })}
                  >
                    <i className="bi bi-plus-lg me-1"></i>Tạo lịch trình Ngày 1
                  </button>
                </div>
              ) : (
                <div className="d-flex flex-column gap-3">
                  {schedules.map((item, idx) => (
                    <div key={item._id || idx} className="card border rounded-3 p-3 bg-white shadow-none">
                      <div className="d-flex justify-content-between align-items-start gap-3 mb-2">
                        <div className="d-flex align-items-center gap-2 flex-wrap">
                          <span className="badge bg-primary text-white rounded-pill px-2.5 py-1">
                            Ngày {item.day}
                          </span>
                          <h6 className="fw-bold text-dark mb-0">{item.title}</h6>
                        </div>
                        <div className="d-flex align-items-center gap-1 flex-shrink-0">
                          <button
                            type="button"
                            className="management-action-btn btn-edit"
                            title={`Sửa lịch trình Ngày ${item.day}`}
                            aria-label={`Sửa lịch trình Ngày ${item.day}`}
                            onClick={() => setScheduleForm({ open: true, schedule: item })}
                          >
                            <i className="bi bi-pencil"></i>
                          </button>
                          <button
                            type="button"
                            className="management-action-btn btn-delete"
                            title={`Xóa lịch trình Ngày ${item.day}`}
                            aria-label={`Xóa lịch trình Ngày ${item.day}`}
                            onClick={() => setPendingDelete(item)}
                          >
                            <i className="bi bi-trash"></i>
                          </button>
                        </div>
                      </div>
                      {item.meals && item.meals.length > 0 && (
                        <div className="d-flex align-items-center gap-1 flex-wrap mb-2">
                          <span className="small text-muted me-1">Bữa ăn:</span>
                          {item.meals.map((m, mIdx) => (
                            <span key={mIdx} className="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle rounded-pill small">
                              {m}
                            </span>
                          ))}
                        </div>
                      )}
                      <p className="text-secondary small mb-0 lh-base" style={{ whiteSpace: 'pre-line' }}>
                        {item.description}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="modal-footer bg-light">
              <button
                type="button"
                className="btn btn-outline-secondary rounded-pill px-4"
                onClick={onClose}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      </div>

      {scheduleForm.open && (
        <CreateTourScheduleModal
          open
          onClose={() => setScheduleForm({ open: false, schedule: null })}
          tourId={tour._id}
          suggestedDay={nextSuggestedDay}
          schedule={scheduleForm.schedule}
          onSaved={handleSaved}
        />
      )}

      <ConfirmDeleteModal
        isOpen={Boolean(pendingDelete)}
        title="Xóa ngày lịch trình"
        message={(
          <p className="mb-0">
            Bạn có chắc muốn xóa <strong>Ngày {pendingDelete?.day}: {pendingDelete?.title}</strong> khỏi lịch trình tour không?
          </p>
        )}
        confirmText="Xóa ngày"
        loading={deleting}
        onConfirm={handleDelete}
        onClose={() => setPendingDelete(null)}
      />
    </>
  );
}
