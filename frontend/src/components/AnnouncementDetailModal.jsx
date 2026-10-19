import {
  formatAnnouncementDateTime,
  getAnnouncementAudience,
  getAnnouncementStatus
} from '../utils/announcementFormatters';

export default function AnnouncementDetailModal({ announcement, onClose, showStatus = false }) {
  if (!announcement) return null;

  const audience = getAnnouncementAudience(announcement.audience);
  const status = getAnnouncementStatus(announcement.isActive);

  return (
    <>
      <button
        type="button"
        className="modal-backdrop fade show border-0"
        aria-label="Đóng chi tiết thông báo"
        onClick={onClose}
      ></button>
      <div className="modal fade show d-block" tabIndex="-1" role="dialog" aria-modal="true">
        <div className="modal-dialog modal-dialog-centered modal-lg modal-dialog-scrollable">
          <article className="modal-content border-0 shadow-lg">
            <div className="modal-header bg-light">
              <div className="pe-3">
                <div className="d-flex flex-wrap gap-2 mb-2">
                  <span className={`management-badge ${audience.className}`}>
                    <i className={`bi ${audience.icon} me-1`}></i>{audience.label}
                  </span>
                  {showStatus && (
                    <span className={`management-badge ${status.className}`}>
                      <span className="management-badge-dot"></span>{status.label}
                    </span>
                  )}
                </div>
                <h2 className="modal-title h5 fw-bold mb-0">{announcement.title}</h2>
              </div>
              <button type="button" className="btn-close" onClick={onClose} aria-label="Đóng"></button>
            </div>
            <div className="modal-body p-4">
              <p className="mb-4 text-secondary lh-lg" style={{ whiteSpace: 'pre-wrap' }}>
                {announcement.content}
              </p>
              <div className="border-top pt-3 d-flex flex-wrap justify-content-between gap-2 small text-muted">
                <span>
                  <i className="bi bi-person-check me-1"></i>
                  Đăng bởi {announcement.createdBy?.username || 'Nhân viên TripMate'}
                </span>
                <span>
                  <i className="bi bi-clock me-1"></i>
                  {formatAnnouncementDateTime(announcement.updatedAt || announcement.createdAt)}
                </span>
              </div>
            </div>
            <div className="modal-footer bg-light">
              <button type="button" className="btn btn-secondary" onClick={onClose}>Đóng</button>
            </div>
          </article>
        </div>
      </div>
    </>
  );
}
