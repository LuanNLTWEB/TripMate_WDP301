import { useState } from 'react';
import { reviewApi } from '../services/api';
import { useToast } from '../hooks/useToast';

const STAR_LABELS = ['Rất tệ', 'Không hài lòng', 'Bình thường', 'Hài lòng', 'Tuyệt vời'];

const CreateReviewModal = ({ tourId, tourTitle, onClose, onCreated }) => {
  const toast = useToast();
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState('');
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const normalizedComment = comment.trim();
    const fieldErrors = {};

    if (!rating) {
      fieldErrors.rating = 'Vui lòng chọn số sao đánh giá.';
    }
    if (normalizedComment.length < 10) {
      fieldErrors.comment = 'Nội dung đánh giá phải có ít nhất 10 ký tự.';
    }

    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      toast.error('Vui lòng hoàn thiện đánh giá theo đúng yêu cầu.');
      if (fieldErrors.comment) document.getElementById('reviewComment')?.focus();
      return;
    }

    setErrors({});
    setError('');
    setIsSubmitting(true);
    try {
      const response = await reviewApi.create(tourId, {
        rating,
        comment: normalizedComment
      });
      toast.success(response.message || 'Đánh giá tour thành công.');
      onCreated(response);
      onClose();
    } catch (err) {
      const msg = err.message || 'Không thể tạo đánh giá tour.';
      setError(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const visibleRating = hoveredRating || rating;

  return (
    <>
      <div className="modal fade show d-block" tabIndex="-1" role="dialog" aria-modal="true">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content border-0 shadow rounded-4 overflow-hidden">
            <div className="modal-header border-0 pb-0 px-4 pt-4">
              <div>
                <span className="badge text-bg-primary-subtle text-primary mb-2">Chuyến đi đã hoàn thành</span>
                <h2 className="modal-title h5 fw-bold">Chia sẻ trải nghiệm của bạn</h2>
              </div>
              <button
                type="button"
                className="btn-close"
                onClick={onClose}
                disabled={isSubmitting}
                aria-label="Đóng"
              ></button>
            </div>

            <form onSubmit={handleSubmit} noValidate>
              <div className="modal-body px-4">
                <p className="text-muted small mb-4">
                  Đánh giá của bạn về <strong className="text-dark">{tourTitle}</strong> sẽ giúp những du khách khác lựa chọn phù hợp hơn.
                </p>

                <fieldset className="border-0 p-0 mb-4">
                  <legend className="form-label fw-semibold fs-6 mb-2">
                    Mức độ hài lòng <span className="text-danger">*</span>
                  </legend>
                  <div
                    className="d-flex align-items-center gap-2"
                    onMouseLeave={() => setHoveredRating(0)}
                  >
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        className="btn border-0 bg-transparent p-0 text-warning"
                        style={{ fontSize: '1.8rem', lineHeight: 1 }}
                        aria-label={`${star} sao - ${STAR_LABELS[star - 1]}`}
                        aria-pressed={rating === star}
                        disabled={isSubmitting}
                        onMouseEnter={() => setHoveredRating(star)}
                        onFocus={() => setHoveredRating(star)}
                        onBlur={() => setHoveredRating(0)}
                        onClick={() => {
                          setRating(star);
                          if (errors.rating) setErrors((prev) => ({ ...prev, rating: '' }));
                          setError('');
                        }}
                      >
                        <i className={`bi ${star <= visibleRating ? 'bi-star-fill' : 'bi-star'}`}></i>
                      </button>
                    ))}
                    <span className="small fw-semibold text-secondary ms-2" aria-live="polite">
                      {visibleRating ? STAR_LABELS[visibleRating - 1] : 'Chọn số sao'}
                    </span>
                  </div>
                  {errors.rating && (
                    <div className="text-danger small mt-1.5">{errors.rating}</div>
                  )}
                </fieldset>

                <div className="mb-2">
                  <label htmlFor="reviewComment" className="form-label fw-semibold">
                    Nội dung đánh giá <span className="text-danger">*</span>
                  </label>
                  <textarea
                    id="reviewComment"
                    className={`form-control ${errors.comment ? 'is-invalid' : ''}`}
                    rows={5}
                    minLength={10}
                    maxLength={1000}
                    placeholder="Chia sẻ điều bạn yêu thích, chất lượng lịch trình và trải nghiệm thực tế..."
                    value={comment}
                    disabled={isSubmitting}
                    onChange={(event) => {
                      setComment(event.target.value);
                      if (errors.comment) setErrors((prev) => ({ ...prev, comment: '' }));
                      setError('');
                    }}
                  />
                  {errors.comment && (
                    <div className="invalid-feedback">{errors.comment}</div>
                  )}
                  <div className="d-flex justify-content-between mt-1">
                    <span className="text-muted small">Tối thiểu 10 ký tự</span>
                    <span className="text-muted small">{comment.length}/1000</span>
                  </div>
                </div>

                {error && (
                  <div className="alert alert-danger py-2 small mb-0 mt-3" role="alert">
                    <i className="bi bi-exclamation-circle me-2"></i>{error}
                  </div>
                )}
              </div>

              <div className="modal-footer border-0 px-4 pb-4 pt-2">
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={onClose}
                  disabled={isSubmitting}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="btn btn-primary px-4"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>
                      Đang gửi...
                    </>
                  ) : (
                    <><i className="bi bi-send me-2"></i>Gửi đánh giá</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
      <div className="modal-backdrop fade show"></div>
    </>
  );
};

export default CreateReviewModal;
