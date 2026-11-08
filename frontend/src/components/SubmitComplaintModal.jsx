import { useEffect, useMemo, useRef, useState } from 'react';
import { complaintApi } from '../services/api';
import { useToast } from '../hooks/useToast';

// UC-66 – Submit Booking Complaint
// Danh mục loại khiếu nại. Value phải khớp enum trong
// backend/src/models/Complaint.js (COMPLAINT_CATEGORY_VALUES).
const COMPLAINT_TYPES = Object.freeze([
  { value: 'quality_mismatch', label: 'Chất lượng tour không giống mô tả' },
  { value: 'incorrect_cash_charge', label: 'Provider thu sai tiền mặt' },
  { value: 'wrongful_no_show', label: 'Bị đánh dấu No-Show oan' },
  { value: 'other', label: 'Khác' }
]);

const COMPLAINT_STATUS_LABELS = Object.freeze({
  open: 'Chờ xử lý',
  in_review: 'Đang xử lý',
  resolved: 'Đã giải quyết',
  rejected: 'Bị từ chối'
});

const getComplaintTypeLabel = (value) =>
  COMPLAINT_TYPES.find((item) => item.value === value)?.label || 'Khác';

const MIN_DESCRIPTION = 20;
const MAX_DESCRIPTION = 2000;
const MAX_IMAGES = 5;
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

const formatDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

const formatDateTime = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('vi-VN');
};

const bookingCode = (id) => (id ? `BK-${String(id).slice(-6).toUpperCase()}` : '—');
const complaintCode = (id) => (id ? `CP-${String(id).slice(-6).toUpperCase()}` : '—');

const getStatusLabel = (status) =>
  COMPLAINT_STATUS_LABELS[status] ||
  ({ confirmed: 'Đã xác nhận', cancelled: 'Đã hủy' }[status]) ||
  status ||
  '—';

const SubmitComplaintModal = ({ bookings = [], initialBooking = null, onClose, onSubmitted }) => {
  const toast = useToast();
  const objectUrls = useRef([]);
  // Chỉ khiếu nại được đơn đã xác nhận (backend cũng kiểm tra lại).
  const complaintBookings = useMemo(
    () => bookings.filter((booking) => booking.status === 'confirmed'),
    [bookings]
  );
  const [bookingId, setBookingId] = useState(initialBooking?._id || complaintBookings[0]?._id || '');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [images, setImages] = useState([]);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const [createdComplaint, setCreatedComplaint] = useState(null);

  const selectedBooking = useMemo(
    () => complaintBookings.find((booking) => booking._id === bookingId) || null,
    [complaintBookings, bookingId]
  );

  useEffect(() => () => {
    objectUrls.current.forEach((url) => URL.revokeObjectURL(url));
    objectUrls.current = [];
  }, []);

  const addImages = (event) => {
    const selectedFiles = Array.from(event.target.files || []);
    event.target.value = '';
    if (selectedFiles.length === 0) return;

    const nextImages = [...images];
    let nextError = '';

    for (const file of selectedFiles) {
      if (nextImages.length >= MAX_IMAGES) {
        nextError = `Chỉ được chọn tối đa ${MAX_IMAGES} ảnh minh chứng.`;
        break;
      }

      if (!ALLOWED_IMAGE_TYPES.includes(String(file.type).toLowerCase())) {
        nextError = `Ảnh "${file.name}" không hợp lệ. Chỉ chấp nhận JPG, JPEG, PNG hoặc WEBP.`;
        continue;
      }

      if (file.size > MAX_IMAGE_SIZE) {
        nextError = `Ảnh "${file.name}" vượt quá 10MB. Vui lòng chọn ảnh nhỏ hơn.`;
        continue;
      }

      const preview = URL.createObjectURL(file);
      objectUrls.current.push(preview);
      nextImages.push({
        id: `${file.name}-${file.size}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        file,
        preview
      });
    }

    setImages(nextImages);
    setError(nextError);
  };

  const removeImage = (imageId) => {
    setImages((current) => {
      const target = current.find((image) => image.id === imageId);
      if (target) URL.revokeObjectURL(target.preview);
      return current.filter((image) => image.id !== imageId);
    });
    setError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isSubmitting) return;

    const normalizedDescription = description.trim();

    if (!bookingId) {
      setError('Vui lòng chọn đơn đặt tour cần khiếu nại.');
      return;
    }
    if (!category) {
      setError('Vui lòng chọn loại khiếu nại.');
      return;
    }
    if (normalizedDescription.length < MIN_DESCRIPTION) {
      setError(`Nội dung khiếu nại phải có ít nhất ${MIN_DESCRIPTION} ký tự.`);
      return;
    }
    if (normalizedDescription.length > MAX_DESCRIPTION) {
      setError(`Nội dung khiếu nại không được vượt quá ${MAX_DESCRIPTION} ký tự.`);
      return;
    }

    setError('');
    setIsSubmitting(true);

    try {
      // Upload từng ảnh lên Cloudinary qua endpoint riêng, giống các UC khác,
      // sau đó mới gửi khiếu nại bằng JSON kèm danh sách URL.
      const evidenceImages = [];
      for (let index = 0; index < images.length; index += 1) {
        setUploadStatus(`Đang tải ảnh ${index + 1}/${images.length}...`);
        const uploadData = new FormData();
        uploadData.append('image', images[index].file);
        const uploadResponse = await complaintApi.uploadEvidence(uploadData);
        if (uploadResponse?.url) evidenceImages.push(uploadResponse.url);
      }

      setUploadStatus('Đang gửi khiếu nại...');
      const response = await complaintApi.create({
        bookingId,
        category,
        description: normalizedDescription,
        evidenceImages
      });

      toast.success(response.message || 'Gửi khiếu nại thành công.');
      setCreatedComplaint(response.data);
      setImages([]);
      if (onSubmitted) onSubmitted(response.data);
    } catch (requestError) {
      const message = requestError.message || 'Không thể gửi khiếu nại. Vui lòng thử lại.';
      setError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
      setUploadStatus('');
    }
  };

  const closeModal = () => {
    if (isSubmitting) return;
    onClose();
  };

  return (
    <>
      <div
        className="modal fade show d-block"
        tabIndex="-1"
        role="dialog"
        aria-modal="true"
        style={{ backgroundColor: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(4px)', zIndex: 1060 }}
        onClick={(event) => {
          if (event.target === event.currentTarget) closeModal();
        }}
      >
        <div className="modal-dialog modal-dialog-centered modal-lg modal-dialog-scrollable">
          <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
            <div className="modal-header bg-light px-4 py-3 border-bottom d-flex align-items-center justify-content-between">
              <div>
                <span className="badge bg-warning-subtle text-warning-emphasis text-uppercase fw-semibold mb-1">
                  Hỗ trợ khách hàng
                </span>
                <h5 className="modal-title fw-bold text-dark mb-0">
                  <i className="bi bi-flag me-2 text-warning"></i>
                  {createdComplaint ? 'Đã gửi khiếu nại' : 'Gửi khiếu nại đơn đặt tour'}
                </h5>
              </div>
              <button
                type="button"
                className="btn-close"
                onClick={closeModal}
                disabled={isSubmitting}
                aria-label="Đóng"
              ></button>
            </div>

            {createdComplaint ? (
              <div className="modal-body p-4">
                <div className="text-center mb-4">
                  <div
                    className="mx-auto mb-3 bg-success bg-opacity-10 text-success rounded-circle d-flex align-items-center justify-content-center"
                    style={{ width: 84, height: 84 }}
                  >
                    <i className="bi bi-check-circle-fill fs-1"></i>
                  </div>
                  <h4 className="fw-bold mb-2">Gửi khiếu nại thành công</h4>
                  <p className="text-muted mb-0">
                    Bộ phận hỗ trợ TripMate đã tiếp nhận khiếu nại của bạn và sẽ phản hồi trong thời gian sớm nhất.
                  </p>
                </div>

                <div className="p-3 bg-light rounded-4 mb-3">
                  <div className="row g-3">
                    <div className="col-12 col-sm-6">
                      <div className="text-muted small mb-1">Mã khiếu nại</div>
                      <div className="fw-bold text-dark font-monospace">
                        {complaintCode(createdComplaint._id)}
                      </div>
                    </div>
                    <div className="col-12 col-sm-6">
                      <div className="text-muted small mb-1">Trạng thái</div>
                      <span className="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle">
                        {getStatusLabel(createdComplaint.status)}
                      </span>
                    </div>
                    <div className="col-12 col-sm-6">
                      <div className="text-muted small mb-1">Đơn đặt tour</div>
                      <div className="fw-semibold text-dark">
                        {bookingCode(createdComplaint.bookingId?._id || bookingId)}
                      </div>
                    </div>
                    <div className="col-12 col-sm-6">
                      <div className="text-muted small mb-1">Thời gian gửi</div>
                      <div className="fw-semibold text-dark">
                        {formatDateTime(createdComplaint.createdAt)}
                      </div>
                    </div>
                    <div className="col-12">
                      <div className="text-muted small mb-1">Loại khiếu nại</div>
                      <div className="fw-semibold text-dark">
                        {getComplaintTypeLabel(createdComplaint.category)}
                      </div>
                    </div>
                    {createdComplaint.evidenceImages?.length > 0 && (
                      <div className="col-12">
                        <div className="text-muted small mb-1">
                          Ảnh minh chứng ({createdComplaint.evidenceImages.length})
                        </div>
                        <div className="d-flex flex-wrap gap-2">
                          {createdComplaint.evidenceImages.map((url, index) => (
                            <a
                              key={`${url}-${index}`}
                              href={url}
                              target="_blank"
                              rel="noreferrer"
                              className="d-inline-block rounded-3 overflow-hidden border"
                              style={{ width: 72, height: 56 }}
                            >
                              <img
                                src={url}
                                alt={`Minh chứng ${index + 1}`}
                                className="w-100 h-100 object-fit-cover"
                              />
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="alert alert-info small mb-0">
                  <i className="bi bi-info-circle me-1"></i>
                  Vui lòng lưu lại mã khiếu nại để tra cứu khi cần hỗ trợ.
                </div>
              </div>
            ) : (
              <form
                onSubmit={handleSubmit}
                className="d-flex flex-column flex-grow-1"
                style={{ minHeight: 0 }}
              >
                <div className="modal-body p-4" style={{ minHeight: 0, overflowY: 'auto' }}>
                  <div className="alert alert-light border small d-flex gap-2 mb-4">
                    <i className="bi bi-info-circle text-primary mt-1"></i>
                    <span>
                      Chọn đơn đặt tour cần khiếu nại và mô tả rõ vấn đề bạn gặp phải. Bạn có thể đính kèm tối đa{' '}
                      {MAX_IMAGES} ảnh minh chứng (JPG, JPEG, PNG, WEBP, tối đa 10MB/ảnh).
                    </span>
                  </div>

                  <div className="mb-3">
                    <label htmlFor="complaintBookingId" className="form-label fw-semibold">
                      Đơn đặt tour <span className="text-danger">*</span>
                    </label>
                    <select
                      id="complaintBookingId"
                      className="form-select"
                      value={bookingId}
                      disabled={isSubmitting || complaintBookings.length === 0}
                      onChange={(event) => {
                        setBookingId(event.target.value);
                        setError('');
                      }}
                    >
                      {complaintBookings.length === 0 && (
                        <option value="">Bạn chưa có đơn đặt tour nào đã xác nhận</option>
                      )}
                      {complaintBookings.map((booking) => (
                        <option key={booking._id} value={booking._id}>
                          {bookingCode(booking._id)} · {booking.tourId?.title || 'Tour'} · Khởi hành{' '}
                          {formatDate(booking.departureDate)} · {getStatusLabel(booking.status)}
                        </option>
                      ))}
                    </select>
                    {selectedBooking && (
                      <div className="mt-2 p-2 rounded-3 bg-light small text-muted d-flex flex-wrap gap-3">
                        <span>
                          <i className="bi bi-receipt me-1"></i>
                          {bookingCode(selectedBooking._id)}
                        </span>
                        <span>
                          <i className="bi bi-calendar-event me-1"></i>
                          {formatDate(selectedBooking.departureDate)}
                        </span>
                        <span>
                          <i className="bi bi-people me-1"></i>
                          {selectedBooking.numberOfPeople} khách
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="mb-3">
                    <label htmlFor="complaintType" className="form-label fw-semibold">
                      Loại khiếu nại <span className="text-danger">*</span>
                    </label>
                    <select
                      id="complaintType"
                      className="form-select"
                      value={category}
                      disabled={isSubmitting}
                      onChange={(event) => {
                        setCategory(event.target.value);
                        setError('');
                      }}
                    >
                      <option value="">-- Chọn loại khiếu nại --</option>
                      {COMPLAINT_TYPES.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="mb-3">
                    <label htmlFor="complaintDescription" className="form-label fw-semibold">
                      Nội dung khiếu nại <span className="text-danger">*</span>
                    </label>
                    <textarea
                      id="complaintDescription"
                      className={`form-control ${error && description.trim().length < MIN_DESCRIPTION ? 'is-invalid' : ''}`}
                      rows={5}
                      minLength={MIN_DESCRIPTION}
                      maxLength={MAX_DESCRIPTION}
                      placeholder="Vui lòng mô tả chi tiết vấn đề: thời gian, địa điểm, dịch vụ đã nhận, điều bạn mong muốn được hỗ trợ..."
                      value={description}
                      disabled={isSubmitting}
                      onChange={(event) => {
                        setDescription(event.target.value);
                        setError('');
                      }}
                    />
                    <div className="d-flex justify-content-between mt-1">
                      <span className="text-muted small">Tối thiểu {MIN_DESCRIPTION} ký tự</span>
                      <span className="text-muted small">
                        {description.length}/{MAX_DESCRIPTION}
                      </span>
                    </div>
                  </div>

                  <div className="mb-2">
                    <label htmlFor="complaintEvidence" className="form-label fw-semibold">
                      Ảnh minh chứng <span className="text-muted fw-normal">(không bắt buộc)</span>
                    </label>
                    <input
                      id="complaintEvidence"
                      type="file"
                      className="form-control"
                      accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                      multiple
                      disabled={isSubmitting || images.length >= MAX_IMAGES}
                      onChange={addImages}
                    />
                    <div className="form-text">
                      Đã chọn {images.length}/{MAX_IMAGES} ảnh. Mỗi ảnh tối đa 10MB.
                    </div>

                    {images.length > 0 && (
                      <div className="d-flex flex-wrap gap-2 mt-3">
                        {images.map((image) => (
                          <div
                            key={image.id}
                            className="position-relative rounded-3 overflow-hidden border shadow-sm"
                            style={{ width: 92, height: 72 }}
                          >
                            <img
                              src={image.preview}
                              alt={image.file.name}
                              className="w-100 h-100 object-fit-cover"
                            />
                            <button
                              type="button"
                              className="btn btn-danger btn-sm position-absolute top-0 end-0 m-1 rounded-circle d-inline-flex align-items-center justify-content-center p-0"
                              style={{ width: 22, height: 22 }}
                              onClick={() => removeImage(image.id)}
                              disabled={isSubmitting}
                              title={`Xóa ${image.file.name}`}
                              aria-label={`Xóa ${image.file.name}`}
                            >
                              <i className="bi bi-x" style={{ fontSize: 12 }}></i>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {error && (
                    <div className="alert alert-danger py-2 small mb-0 mt-3" role="alert">
                      <i className="bi bi-exclamation-circle me-2"></i>
                      {error}
                    </div>
                  )}
                </div>

                <div className="modal-footer border-0 px-4 pb-4 pt-2">
                  <button
                    type="button"
                    className="btn btn-outline-secondary rounded-pill px-4"
                    onClick={closeModal}
                    disabled={isSubmitting}
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="btn btn-warning rounded-pill px-4 fw-semibold"
                    disabled={isSubmitting || complaintBookings.length === 0}
                  >
                    {isSubmitting ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>
                        {uploadStatus || 'Đang gửi...'}
                      </>
                    ) : (
                      <>
                        <i className="bi bi-send me-2"></i>
                        Gửi khiếu nại
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {createdComplaint && (
              <div className="modal-footer border-0 px-4 pb-4 pt-0">
                <button
                  type="button"
                  className="btn btn-primary rounded-pill px-4 fw-semibold"
                  onClick={onClose}
                >
                  Đóng
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="modal-backdrop fade show"></div>
    </>
  );
};

export default SubmitComplaintModal;
