import {
  ReviewActions,
  ReviewStars,
  ReviewStatusBadge
} from './ReviewPresentation';
import { formatReviewDateTime } from '../utils/reviewFormatters';

function EmptyTable({ reported }) {
  return (
    <div className="management-empty-state">
      <div className="management-empty-icon">
        <i className={`bi ${reported ? 'bi-flag' : 'bi-chat-square-dots'} fs-2`}></i>
      </div>
      <h6 className="fw-bold text-dark mb-1">
        {reported ? 'Không có báo cáo phù hợp' : 'Không có đánh giá nào phù hợp'}
      </h6>
      <p className="small text-muted mb-0">
        Thử thay đổi trạng thái hoặc từ khóa tìm kiếm.
      </p>
    </div>
  );
}

function AllReviewRow({ review, actionProps }) {
  return (
    <tr>
      <td>
        <div className="d-flex align-items-center">
          <div
            className="rounded-circle bg-primary bg-opacity-10 text-primary d-flex align-items-center justify-content-center me-2 fw-bold flex-shrink-0"
            style={{ width: 36, height: 36 }}
          >
            {(review.userId?.username || 'U')[0].toUpperCase()}
          </div>
          <div className="overflow-hidden">
            <div className="fw-semibold text-dark text-truncate">
              {review.userId?.username || 'Khách hàng'}
            </div>
            <small className="text-muted text-truncate d-block">
              {review.userId?.email || '—'}
            </small>
          </div>
        </div>
      </td>
      <td>
        <div className="fw-medium text-dark text-truncate" style={{ maxWidth: 240 }}>
          {review.tourId?.title || 'Tour không khả dụng'}
        </div>
        <small className="text-muted">
          <i className="bi bi-geo-alt me-1 text-danger"></i>
          {review.tourId?.departureLocation ? `${review.tourId.departureLocation} → ` : ''}
          {review.tourId?.destinationLocation || review.tourId?.location || 'Chưa cập nhật'}
        </small>
      </td>
      <td>
        <div className="mb-1"><ReviewStars rating={review.rating} /></div>
        <div className="small text-dark text-truncate" style={{ maxWidth: 280 }} title={review.comment}>
          {review.comment || <span className="text-muted fst-italic">Không có lời bình luận</span>}
        </div>
        <div className="small text-muted" style={{ fontSize: '0.75rem' }}>
          {formatReviewDateTime(review.createdAt)}
        </div>
      </td>
      <td><ReviewStatusBadge status={review.status} /></td>
      <td className="text-center"><ReviewActions review={review} {...actionProps} /></td>
    </tr>
  );
}

function ReportedReviewRow({ review, actionProps }) {
  return (
    <tr>
      <td>
        <div className="mb-1"><ReviewStars rating={review.rating} /></div>
        <div className="small text-dark text-truncate" style={{ maxWidth: 220 }} title={review.comment}>
          {review.comment || 'Không có bình luận'}
        </div>
        <div className="small text-muted">Bởi {review.userId?.username || 'Khách hàng'}</div>
      </td>
      <td>
        <div className="fw-semibold text-dark text-truncate" style={{ maxWidth: 220 }}>
          {review.tourId?.title || 'Tour không khả dụng'}
        </div>
        <div className="small text-muted mt-1">
          {review.tourId?.destinationLocation || review.tourId?.location || '—'}
        </div>
      </td>
      <td>
        <div className="fw-semibold text-danger-emphasis text-truncate" style={{ maxWidth: 240 }}>
          <i className="bi bi-flag-fill me-1"></i>
          {review.reportReason || 'Không rõ lý do'}
        </div>
        <div className="small text-muted text-truncate mt-1" style={{ maxWidth: 240 }} title={review.reportDetails}>
          {review.reportDetails || 'Không có mô tả bổ sung'}
        </div>
      </td>
      <td>
        <div className="fw-medium">{review.reportedBy?.username || 'Tài khoản không khả dụng'}</div>
        <div className="small text-muted">{formatReviewDateTime(review.reportedAt)}</div>
      </td>
      <td><ReviewStatusBadge status={review.status} reported /></td>
      <td className="text-center"><ReviewActions review={review} {...actionProps} /></td>
    </tr>
  );
}

export default function ReviewManagementTable({
  reviews,
  reported,
  loading,
  actionLoading,
  onView,
  onApprove,
  onReject,
  onFlag,
  onDelete
}) {
  const columnCount = reported ? 6 : 5;
  const actionProps = {
    disabled: actionLoading,
    onView,
    onApprove,
    onReject,
    onFlag,
    onDelete
  };

  return (
    <div className="table-responsive">
      <table className="management-table align-middle">
        <thead>
          {reported ? (
            <tr>
              <th style={{ width: '18%' }}>Đánh giá</th>
              <th style={{ width: '17%' }}>Tour</th>
              <th style={{ width: '20%' }}>Thông tin báo cáo</th>
              <th style={{ width: '15%' }}>Người báo cáo</th>
              <th style={{ width: '12%' }}>Trạng thái</th>
              <th className="text-center" style={{ width: '18%' }}>Thao tác</th>
            </tr>
          ) : (
            <tr>
              <th style={{ width: '20%' }}>Khách hàng</th>
              <th style={{ width: '20%' }}>Tour du lịch</th>
              <th style={{ width: '27%' }}>Nội dung đánh giá</th>
              <th style={{ width: '13%' }}>Trạng thái</th>
              <th className="text-center" style={{ width: '20%' }}>Thao tác</th>
            </tr>
          )}
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={columnCount} className="text-center py-5 text-muted">
                <span className="spinner-border spinner-border-sm text-primary me-2" role="status"></span>
                {reported ? 'Đang tải báo cáo...' : 'Đang tải danh sách đánh giá...'}
              </td>
            </tr>
          ) : reviews.length === 0 ? (
            <tr><td colSpan={columnCount}><EmptyTable reported={reported} /></td></tr>
          ) : reviews.map((review) => (
            reported
              ? <ReportedReviewRow key={review._id} review={review} actionProps={actionProps} />
              : <AllReviewRow key={review._id} review={review} actionProps={actionProps} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
