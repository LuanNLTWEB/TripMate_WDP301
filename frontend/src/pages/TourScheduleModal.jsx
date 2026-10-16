import { useState, useEffect } from 'react';
import { tourApi } from '../services/api';
import { useToast } from '../hooks/useToast';
import CreateTourScheduleModal from './CreateTourScheduleModal';

export default function TourScheduleModal({ open, onClose, tour, onUpdated }) {
  const toast = useToast();
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    if (open && tour?._id) {
      setLoading(true);
      tourApi.getSchedule(tour._id)
        .then((res) => {
          setSchedules(res.data || []);
        })
        .catch((err) => {
          toast.error(err.message || 'Không thể tải lịch trình tour.');
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [open, tour?._id]);

  if (!open || !tour) return null;

  const handleCreated = (newItem, updatedItinerary) => {
    if (Array.isArray(updatedItinerary)) {
      setSchedules(updatedItinerary);
    } else if (newItem) {
      setSchedules((prev) => [...prev, newItem].sort((a, b) => a.day - b.day));
    }
    if (onUpdated) {
      onUpdated();
    }
  };

  const nextSuggestedDay = schedules.length > 0
    ? Math.max(...schedules.map((s) => s.day || 0)) + 1
    : 1;

  return (
    <>
      <div className="modal-backdrop fade show" style={{ zIndex: 1040 }}></div>
      <div className="modal fade show d-block" tabIndex="-1" role="dialog" aria-modal="true" style={{ zIndex: 1050 }}>
        <div className="modal-dialog modal-dialog-centered modal-lg modal-dialog-scrollable">
          <div className="modal-content border-0 shadow-lg">
            <div className="modal-header bg-light">
              <div>
                <span className="badge text-bg-primary rounded-pill small mb-1">
                  Tour Schedule Management
                </span>
                <h5 className="modal-title fw-bold text-dark d-flex align-items-center gap-2">
                  <i className="bi bi-calendar-week text-primary"></i>
                  <span>Lịch Trình Tour: {tour.title}</span>
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
                  onClick={() => setShowCreateModal(true)}
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
                    Tour này chưa được thiết lập lịch trình từng ngày. Hãy tạo lịch trình Ngày 1 để bắt đầu!
                  </p>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm rounded-pill px-3"
                    onClick={() => setShowCreateModal(true)}
                  >
                    <i className="bi bi-plus-lg me-1"></i>Tạo lịch trình Ngày 1
                  </button>
                </div>
              ) : (
                <div className="d-flex flex-column gap-3">
                  {schedules.map((item, idx) => (
                    <div key={item._id || idx} className="card border rounded-3 p-3 bg-white shadow-none">
                      <div className="d-flex justify-content-between align-items-start gap-2 mb-2">
                        <div className="d-flex align-items-center gap-2">
                          <span className="badge bg-primary text-white rounded-pill px-2.5 py-1">
                            Ngày {item.day}
                          </span>
                          <h6 className="fw-bold text-dark mb-0">{item.title}</h6>
                        </div>
                        {item.meals && item.meals.length > 0 && (
                          <div className="d-flex align-items-center gap-1 flex-wrap">
                            <span className="small text-muted me-1">Bữa ăn:</span>
                            {item.meals.map((m, mIdx) => (
                              <span key={mIdx} className="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle rounded-pill small">
                                {m}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
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

      <CreateTourScheduleModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        tourId={tour._id}
        suggestedDay={nextSuggestedDay}
        onCreated={handleCreated}
      />
    </>
  );
}
