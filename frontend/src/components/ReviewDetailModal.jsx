import {
  ReviewActions,
  ReviewStars,
  ReviewStatusBadge
} from './ReviewPresentation';
import { formatReviewDateTime } from '../utils/reviewFormatters';

export default function ReviewDetailModal({
  review,
  actionLoading,
  onClose,
  onApprove,
  onReject,
  onFlag,
  onDelete
}) {
  if (!review) return null;

  return (
    <>
      <div className="modal-backdrop fade show"></div>
      <div
        className="modal fade show d-block"
        tabIndex="-1"
        role="dialog"
        aria-modal="true"
        onClick={(event) => {
          if (event.target === event.currentTarget && !actionLoading) onClose();
        }}
      >
        <div className="modal-dialog modal-dialog-centered modal-lg modal-dialog-scrollable">
          <div className="modal-content border-0 shadow-lg">
            <div className="modal-header bg-light">
              <div>
                <span className="small text-primary text-uppercase fw-semibold">
                  {review.isReported ? 'Reported review' : 'Review moderation'}
                </span>
                <h5 className="modal-title fw-bold mb-0">
                  {review.isReported ? 'Chi tiết báo cáo đánh giá' : 'Chi tiết đánh giá'}
                </h5>
              </div>
              <button
                type="button"
                className="btn-close"
                disabled={actionLoading}
                onClick={onClose}
                aria-label="Đóng"
              ></button>
            </div>

            <div className="modal-body p-4">
              <div className="d-flex justify-content-between align-items-start gap-3 mb-4">
                <div>
                  <div className="small text-muted">Tour được đánh giá</div>
                  <div className="fw-bold text-dark">
                    {review.tourId?.title || 'Tour không còn khả dụng'}
                  </div>
                  <div className="small text-muted mt-1">
                    <i className="bi bi-geo-alt text-danger me-1"></i>
                    {review.tourId?.departureLocation && `${review.tourId.departureLocation} → `}
                    {review.tourId?.destinationLocation || review.tourId?.location || 'Chưa cập nhật'}
                  </div>
                </div>
                <ReviewStatusBadge status={review.status} reported={review.isReported} />
              </div>

              <section className="border rounded-3 p-3 mb-4">
                <div className="d-flex justify-content-between align-items-start gap-3 mb-2">
                  <div>
                    <div className="fw-semibold">{review.userId?.username || 'Khách hàng'}</div>
                    <div className="small text-muted">{review.userId?.email || 'Không có email'}</div>
                  </div>
                  <ReviewStars rating={review.rating} />
                </div>
                <p className="mb-2 text-secondary" style={{ whiteSpace: 'pre-line' }}>
                  {review.comment || 'Đánh giá không có nội dung bình luận.'}
                </p>
                <div className="small text-muted">
                  Gửi lúc {formatReviewDateTime(review.createdAt)}
                </div>
              </section>

              {review.isReported && (
                <section className="border border-danger-subtle bg-danger-subtle rounded-3 p-3 mb-4">
                  <h6 className="fw-bold text-danger-emphasis mb-3">
                    <i className="bi bi-flag-fill me-2"></i>Nội dung báo cáo
                  </h6>
                  <dl className="row mb-0 g-2 small">
                    <dt className="col-md-3 text-muted fw-medium">Lý do</dt>
                    <dd className="col-md-9 mb-0 fw-semibold">{review.reportReason || 'Không ghi nhận'}</dd>
                    <dt className="col-md-3 text-muted fw-medium">Chi tiết</dt>
                    <dd className="col-md-9 mb-0" style={{ whiteSpace: 'pre-line' }}>
                      {review.reportDetails || 'Người báo cáo không cung cấp mô tả bổ sung.'}
                    </dd>
                    <dt className="col-md-3 text-muted fw-medium">Người báo cáo</dt>
                    <dd className="col-md-9 mb-0">
                      {review.reportedBy?.username || review.reportedBy?.email || 'Tài khoản không còn khả dụng'}
                    </dd>
                    <dt className="col-md-3 text-muted fw-medium">Thời điểm</dt>
                    <dd className="col-md-9 mb-0">{formatReviewDateTime(review.reportedAt)}</dd>
                  </dl>
                </section>
              )}

              {review.moderationReason && (
                <section className="border rounded-3 p-3 bg-light-subtle">
                  <h6 className="fw-bold mb-2">
                    <i className="bi bi-shield-check text-primary me-2"></i>Kết quả kiểm duyệt
                  </h6>
                  <p className="small mb-1">{review.moderationReason}</p>
                  <div className="small text-muted">
                    Xử lý bởi {review.moderatedBy?.username || review.moderatedBy?.email || 'nhân viên hệ thống'}
                  </div>
                </section>
              )}
            </div>

            <div className="modal-footer bg-light justify-content-between">
              <ReviewActions
                review={review}
                disabled={actionLoading}
                onApprove={onApprove}
                onReject={onReject}
                onFlag={onFlag}
                onDelete={onDelete}
              />
              <button type="button" className="btn btn-outline-secondary" disabled={actionLoading} onClick={onClose}>
                Đóng
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
