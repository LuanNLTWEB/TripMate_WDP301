import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import CustomSelect from '../components/CustomSelect';
import { tourApi, tourSubmissionApi } from '../services/api';
import { useToast } from '../hooks/useToast';

const formatCurrency = (value) => new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0
}).format(value || 0);

// Chỉ tour nháp hoặc tour vừa được trả lại mới gửi duyệt được.
const SUBMITTABLE_STATUSES = ['draft', 'needs_revision', 'rejected'];

const statusHint = (status) => {
  switch (status) {
    case 'needs_revision':
      return 'Tour đang chờ bạn chỉnh sửa theo phản hồi của nhân viên.';
    case 'rejected':
      return 'Tour từng bị từ chối, hãy kiểm tra lại nội dung trước khi gửi lại.';
    default:
      return 'Tour nháp chỉ hiển thị với bạn cho tới khi được duyệt.';
  }
};

// START UC-128 Create Tour Submission
/**
 * Modal gửi yêu cầu duyệt cho một tour nháp (UC-128) và cập nhật ghi chú gửi lại (UC-129).
 *
 * Phức tạp:
 *  - Nội dung tour nằm ở collection Tour, nên form chỉ chọn tour + ghi chú; danh sách
 *    tour được lọc client-side về các trạng thái còn gửi duyệt được (draft/needs_revision/rejected).
 *  - Nếu mở từ nút "Gửi duyệt" ở trang quản lý tour (`?tour=<id>`), tour đó được chọn sẵn.
 *  - Chế độ sửa chỉ cho đổi ghi chú; tour đã duyệt thì nút gửi đã bị vô hiệu ở danh sách.
 */
export default function TourSubmissionFormModal({
  open,
  mode = 'create',
  submission = null,
  preselectedTourId = '',
  onClose,
  onSaved
}) {
  const toast = useToast();
  const isEdit = mode === 'edit';

  const [tours, setTours] = useState([]);
  const [isLoadingTours, setIsLoadingTours] = useState(false);
  const [tourId, setTourId] = useState(preselectedTourId || '');
  const [providerNote, setProviderNote] = useState(submission?.providerNote || '');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTourId(preselectedTourId || '');
    setProviderNote(submission?.providerNote || '');
    setError('');
  }, [open, submission, preselectedTourId]);

  useEffect(() => {
    if (!open || isEdit) return;
    setIsLoadingTours(true);
    tourApi.getProviderTours({ limit: 100 })
      .then((response) => {
        const submittable = (response.data || []).filter((tour) => SUBMITTABLE_STATUSES.includes(tour.status));
        setTours(submittable);
      })
      .catch(() => setTours([]))
      .finally(() => setIsLoadingTours(false));
  }, [open, isEdit]);

  const selectedTour = useMemo(() => {
    if (isEdit) return submission?.tourId || null;
    return tours.find((tour) => tour._id === tourId) || null;
  }, [isEdit, submission, tours, tourId]);

  if (!open) return null;

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isSubmitting) return;

    if (!isEdit && !tourId) {
      setError('Vui lòng chọn tour cần gửi duyệt.');
      document.getElementById('submission-tour')?.focus();
      toast.error('Vui lòng chọn tour cần gửi duyệt.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const response = isEdit
        ? await tourSubmissionApi.update(submission._id, { providerNote: providerNote.trim() })
        : await tourSubmissionApi.create({ tourId, providerNote: providerNote.trim() });

      toast.success(response.message || 'Đã gửi duyệt tour.');
      if (onSaved) await onSaved(response.data);
      onClose();
    } catch (requestError) {
      toast.error(requestError.message || 'Không thể gửi duyệt tour.');
      setError(requestError.message || 'Không thể gửi duyệt tour.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="modal-backdrop fade show" style={{ zIndex: 1040 }}></div>
      <div
        className="modal fade show d-block"
        tabIndex="-1"
        role="dialog"
        aria-modal="true"
        style={{ zIndex: 1050 }}
        onClick={(event) => {
          if (event.target === event.currentTarget && !isSubmitting) onClose();
        }}
      >
        <div className="modal-dialog modal-dialog-centered modal-lg modal-dialog-scrollable">
          <div className="modal-content border-0 shadow-lg rounded-4">
            <div className="modal-header bg-light px-4 py-3">
              <div>
                <span className="badge text-bg-primary rounded-pill small mb-1">Tour Submission</span>
                <h5 className="modal-title fw-bold text-dark d-flex align-items-center gap-2">
                  <i className={`bi ${isEdit ? 'bi-arrow-repeat' : 'bi-send-plus-fill'} text-primary`}></i>
                  <span>{isEdit ? 'Cập nhật yêu cầu duyệt' : 'Gửi duyệt tour'}</span>
                </h5>
                <small className="text-muted">
                  Tour chỉ hiển thị với khách hàng sau khi nhân viên duyệt yêu cầu này.
                </small>
              </div>
              <button type="button" className="btn-close" onClick={onClose} disabled={isSubmitting} aria-label="Đóng"></button>
            </div>

            <form onSubmit={handleSubmit} noValidate>
              <div className="modal-body px-4 py-3">
                {error && (
                  <div className="alert alert-danger py-2 small" role="alert">{error}</div>
                )}

                {isEdit ? (
                  <div className="mb-3">
                    <label className="form-label small fw-semibold text-secondary">Tour đang gửi duyệt</label>
                    <input
                      type="text"
                      className="form-control rounded-3"
                      value={selectedTour?.title || 'Tour không còn tồn tại'}
                      disabled
                      readOnly
                    />
                  </div>
                ) : (
                  <div className="mb-3">
                    <label className="form-label small fw-semibold text-secondary" htmlFor="submission-tour">
                      Chọn tour nháp cần gửi duyệt <span className="text-danger">*</span>
                    </label>
                    <CustomSelect
                      id="submission-tour"
                      value={tourId}
                      onChange={(event) => {
                        setTourId(event.target.value);
                        if (error) setError('');
                      }}
                      disabled={isLoadingTours || tours.length === 0}
                      options={[
                        {
                          value: '',
                          label: isLoadingTours
                            ? 'Đang tải danh sách tour...'
                            : tours.length === 0
                              ? 'Không có tour nháp nào để gửi duyệt'
                              : 'Chọn tour nháp cần gửi duyệt'
                        },
                        ...tours.map((tour) => ({
                          value: tour._id,
                          label: `${tour.title}${tour.status === 'needs_revision' ? ' (cần chỉnh sửa)' : tour.status === 'rejected' ? ' (bị từ chối)' : ''}`
                        }))
                      ]}
                      triggerStyle={{ height: '42px', borderRadius: '10px' }}
                    />
                    <div className="form-text">
                      Chưa có tour nháp?{' '}
                      <Link to="/management/my-tours?action=create">Tạo tour mới</Link>{' '}
                      rồi quay lại gửi duyệt.
                    </div>
                  </div>
                )}

                {selectedTour && (
                  <div className="border rounded-3 p-3 mb-3 bg-light-subtle">
                    <div className="d-flex gap-3">
                      {selectedTour.images?.[0] ? (
                        <img
                          src={selectedTour.images[0]}
                          alt={selectedTour.title}
                          className="rounded-3 border"
                          style={{ width: '96px', height: '72px', objectFit: 'cover' }}
                        />
                      ) : (
                        <div className="rounded-3 border bg-white d-flex align-items-center justify-content-center" style={{ width: '96px', height: '72px' }}>
                          <i className="bi bi-image text-muted"></i>
                        </div>
                      )}
                      <div className="flex-grow-1">
                        <div className="fw-bold text-dark">{selectedTour.title}</div>
                        <div className="small text-muted mb-1">
                          <i className="bi bi-clock me-1"></i>{selectedTour.duration}
                          {selectedTour.destinationLocation && (
                            <>
                              <span className="mx-1">·</span>
                              <i className="bi bi-geo-alt me-1"></i>{selectedTour.destinationLocation}
                            </>
                          )}
                        </div>
                        <div className="small">
                          <span className="fw-semibold text-dark">{formatCurrency(selectedTour.price)}</span>
                          <span className="text-muted ms-2">
                            <i className="bi bi-people me-1"></i>{selectedTour.availableSeats || 0} chỗ
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="small text-muted mt-2">
                      <i className="bi bi-info-circle me-1"></i>
                      {statusHint(selectedTour.status)}
                    </div>
                  </div>
                )}

                <div className="mb-2">
                  <label className="form-label small fw-semibold text-secondary" htmlFor="submission-note">
                    Ghi chú gửi nhân viên kiểm duyệt
                  </label>
                  <textarea
                    id="submission-note"
                    rows="3"
                    maxLength={500}
                    className="form-control rounded-3"
                    placeholder="Ví dụ: Tour mới soạn, mong được duyệt trước ngày 20/11..."
                    value={providerNote}
                    onChange={(event) => {
                      setProviderNote(event.target.value);
                      if (error) setError('');
                    }}
                  ></textarea>
                </div>
              </div>

              <div className="modal-footer bg-light px-4 py-3">
                <button type="button" className="btn btn-outline-secondary rounded-pill px-4" onClick={onClose} disabled={isSubmitting}>
                  Hủy
                </button>
                <button
                  type="submit"
                  className="btn btn-primary rounded-pill px-4 d-inline-flex align-items-center gap-2"
                  disabled={isSubmitting || (!isEdit && (isLoadingTours || tours.length === 0))}
                >
                  {isSubmitting ? (
                    <>
                      <span className="spinner-border spinner-border-sm" role="status"></span>
                      Đang gửi...
                    </>
                  ) : (
                    <>
                      <i className={`bi ${isEdit ? 'bi-send-check' : 'bi-send'}`}></i>
                      {isEdit ? 'Lưu và gửi lại' : 'Gửi duyệt'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
// END UC-128 Create Tour Submission
