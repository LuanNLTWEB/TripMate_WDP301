export function ReviewStars({ rating = 0 }) {
  return (
    <span className="d-inline-flex align-items-center" aria-label={`${rating} trên 5 sao`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <i
          key={star}
          className={`bi ${star <= rating ? 'bi-star-fill text-warning' : 'bi-star text-muted'} me-1`}
        ></i>
      ))}
    </span>
  );
}

export function ReviewStatusBadge({ status, reported = false }) {
  const statuses = {
    approved: {
      label: reported ? 'Đã cho hiển thị' : 'Đã duyệt',
      className: 'badge-success'
    },
    rejected: {
      label: 'Đã từ chối',
      className: 'badge-danger'
    },
    flagged: {
      label: reported ? 'Chờ xử lý' : 'Gắn cờ',
      className: 'badge-warning'
    },
    pending: {
      label: 'Chờ duyệt',
      className: 'badge-secondary'
    }
  };
  const current = statuses[status] || statuses.pending;

  return (
    <span className={`management-badge ${current.className}`}>
      <span className="management-badge-dot"></span>
      {current.label}
    </span>
  );
}

export function ReviewActions({
  review,
  disabled = false,
  onView,
  onApprove,
  onReject,
  onFlag,
  onDelete
}) {
  return (
    <div className="management-actions justify-content-center">
      {onView && (
        <button
          type="button"
          className="management-action-btn btn-view"
          title="Xem chi tiết"
          aria-label="Xem chi tiết đánh giá"
          disabled={disabled}
          onClick={() => onView(review)}
        >
          <i className="bi bi-eye"></i>
        </button>
      )}
      {review.status !== 'approved' && onApprove && (
        <button
          type="button"
          className="management-action-btn btn-approve"
          title="Phê duyệt đánh giá"
          aria-label="Phê duyệt đánh giá"
          disabled={disabled}
          onClick={() => onApprove(review)}
        >
          <i className="bi bi-check-lg"></i>
        </button>
      )}
      {review.status !== 'rejected' && onReject && (
        <button
          type="button"
          className="management-action-btn btn-delete"
          title="Từ chối đánh giá"
          aria-label="Từ chối đánh giá"
          disabled={disabled}
          onClick={() => onReject(review)}
        >
          <i className="bi bi-x-circle"></i>
        </button>
      )}
      {review.status !== 'flagged' && onFlag && (
        <button
          type="button"
          className="management-action-btn btn-flag"
          title="Gắn cờ xem xét"
          aria-label="Gắn cờ đánh giá"
          disabled={disabled}
          onClick={() => onFlag(review)}
        >
          <i className="bi bi-flag"></i>
        </button>
      )}
      {onDelete && (
        <button
          type="button"
          className="management-action-btn btn-delete"
          title="Xóa vĩnh viễn"
          aria-label="Xóa vĩnh viễn đánh giá"
          disabled={disabled}
          onClick={() => onDelete(review)}
        >
          <i className="bi bi-trash"></i>
        </button>
      )}
    </div>
  );
}
