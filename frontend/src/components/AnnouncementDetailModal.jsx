import { useState, useEffect } from 'react';
import {
  formatAnnouncementDateTime,
  getAnnouncementAudience,
  getAnnouncementStatus
} from '../utils/announcementFormatters';

export default function AnnouncementDetailModal({ announcement, onClose, showStatus = false }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!announcement) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [announcement, onClose]);

  if (!announcement) return null;

  const audience = getAnnouncementAudience(announcement.audience);
  const status = getAnnouncementStatus(announcement.isActive);

  const handleCopyContent = async () => {
    try {
      await navigator.clipboard.writeText(`${announcement.title}\n\n${announcement.content}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback if clipboard API is unavailable
    }
  };

  return (
    <>
      <div
        className="modal-backdrop fade show"
        style={{ zIndex: 1050 }}
        onClick={onClose}
      ></div>
      <div
        className="modal fade show d-block"
        tabIndex="-1"
        role="dialog"
        aria-modal="true"
        style={{ zIndex: 1055 }}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            onClose();
          }
        }}
      >
        <div className="modal-dialog modal-dialog-centered modal-lg modal-dialog-scrollable">
          <article className="modal-content border-0 shadow-lg" style={{ borderRadius: '16px', overflow: 'hidden' }}>
            {/* Modal Header */}
            <div className="modal-header bg-light border-bottom py-3 px-4">
              <div className="pe-3">
                <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
                  <span className={`management-badge ${audience.className}`}>
                    <i className={`bi ${audience.icon} me-1`}></i>
                    {audience.label}
                  </span>
                  {showStatus && (
                    <span className={`management-badge ${status.className}`}>
                      <span className="management-badge-dot"></span>
                      {status.label}
                    </span>
                  )}
                </div>
                <h2 className="modal-title h5 fw-bold mb-0 text-dark" style={{ lineHeight: 1.4 }}>
                  {announcement.title}
                </h2>
              </div>
              <button
                type="button"
                className="btn-close"
                onClick={onClose}
                aria-label="Đóng"
              ></button>
            </div>

            {/* Modal Body */}
            <div className="modal-body p-4">
              {/* Publication metadata */}
              <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 p-3 bg-light rounded-3 mb-4 text-muted small">
                <div className="d-flex align-items-center gap-2">
                  <div className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center" style={{ width: '32px', height: '32px' }}>
                    <i className="bi bi-shield-check"></i>
                  </div>
                  <div>
                    <div className="fw-semibold text-dark">
                      {announcement.createdBy?.username || 'Ban Quản Trị TripMate'}
                    </div>
                    <div className="text-muted" style={{ fontSize: '0.78rem' }}>
                      Phát hành chính thức
                    </div>
                  </div>
                </div>

                <div className="d-flex align-items-center gap-3">
                  <div>
                    <i className="bi bi-calendar3 me-1 text-primary"></i>
                    {formatAnnouncementDateTime(announcement.createdAt)}
                  </div>
                  {announcement.updatedAt && announcement.updatedAt !== announcement.createdAt && (
                    <div className="text-secondary">
                      <i className="bi bi-pencil me-1"></i>
                      Đã sửa: {formatAnnouncementDateTime(announcement.updatedAt)}
                    </div>
                  )}
                </div>
              </div>

              {/* Main content */}
              <div
                className="text-dark mb-4"
                style={{
                  fontSize: '0.98rem',
                  lineHeight: 1.8,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word'
                }}
              >
                {announcement.content}
              </div>

              {/* Verified badge notice */}
              <div className="border rounded-3 p-3 bg-white border-light-subtle d-flex align-items-center gap-3 text-muted small">
                <i className="bi bi-info-circle-fill text-primary fs-5 flex-shrink-0"></i>
                <div>
                  Đây là thông báo chính thức từ ban điều hành hệ thống TripMate. Nếu cần hỗ trợ thêm, vui lòng liên hệ bộ phận chăm sóc khách hàng.
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="modal-footer bg-light border-top px-4 py-3 d-flex justify-content-between">
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm d-inline-flex align-items-center gap-1"
                onClick={handleCopyContent}
              >
                <i className={`bi ${copied ? 'bi-check-lg text-success' : 'bi-clipboard'}`}></i>
                <span>{copied ? 'Đã sao chép!' : 'Sao chép nội dung'}</span>
              </button>
              <button type="button" className="btn btn-secondary px-4" onClick={onClose}>
                Đóng
              </button>
            </div>
          </article>
        </div>
      </div>
    </>
  );
}
