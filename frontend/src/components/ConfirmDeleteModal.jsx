import { useEffect } from 'react';

export default function ConfirmDeleteModal({
  isOpen,
  title = 'Xác nhận xóa',
  message,
  confirmText = 'Xóa',
  cancelText = 'Hủy',
  loading = false,
  onConfirm,
  onClose
}) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !loading) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, loading, onClose]);

  if (!isOpen) return null;

  return (
    <>
      <div className="modal-backdrop fade show" style={{ zIndex: 1050 }}></div>
      <div
        className="modal fade show d-block"
        tabIndex="-1"
        role="dialog"
        aria-modal="true"
        style={{ zIndex: 1055 }}
        onClick={(e) => {
          if (e.target === e.currentTarget && !loading) {
            onClose();
          }
        }}
      >
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content border-0 shadow">
            <div className="modal-header">
              <h5 className="modal-title fw-bold text-danger d-flex align-items-center mb-0">
                <i className="bi bi-exclamation-triangle me-2"></i>
                {title}
              </h5>
              <button
                type="button"
                className="btn-close"
                onClick={onClose}
                disabled={loading}
                aria-label="Đóng"
              ></button>
            </div>
            <div className="modal-body py-3">
              {typeof message === 'string' ? (
                <p className="mb-0 text-dark">{message}</p>
              ) : (
                message
              )}
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={onClose}
                disabled={loading}
              >
                {cancelText}
              </button>
              <button
                type="button"
                className="btn btn-danger btn-sm"
                onClick={onConfirm}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                    Đang xử lý...
                  </>
                ) : (
                  confirmText
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
