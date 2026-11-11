import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useToast } from '../hooks/useToast';

const CONFIRM_VARIANTS = {
  danger: { headerClass: 'text-danger', icon: 'bi-exclamation-triangle', buttonClass: 'btn-danger' },
  warning: { headerClass: 'text-warning', icon: 'bi-exclamation-triangle', buttonClass: 'btn-warning text-dark' },
  success: { headerClass: 'text-success', icon: 'bi-check-circle', buttonClass: 'btn-success' },
  primary: { headerClass: 'text-primary', icon: 'bi-info-circle', buttonClass: 'btn-primary' }
};

export default function ConfirmDeleteModal({
  isOpen,
  title = 'Xác nhận xóa',
  message,
  confirmText = 'Xóa',
  cancelText = 'Hủy',
  loading = false,
  confirmDisabled = false,
  variant = 'danger',
  error = '',
  reason = '',
  reasonLabel,
  reasonPlaceholder,
  onReasonChange,
  onConfirm,
  onClose
}) {
  const toast = useToast();

  useEffect(() => {
    if (error && isOpen) {
      toast.error(error);
    }
  }, [error, isOpen, toast]);
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

  const tone = CONFIRM_VARIANTS[variant] || CONFIRM_VARIANTS.danger;

  const modalMarkup = (
    <>
      <div className="modal-backdrop fade show" style={{ zIndex: 1050 }}></div>
      <div
        className="modal fade show d-block"
        tabIndex="-1"
        role="dialog"
        aria-modal="true"
        style={{ zIndex: 1055, overscrollBehavior: 'contain' }}
        onClick={(e) => {
          if (e.target === e.currentTarget && !loading) {
            onClose();
          }
        }}
      >
        <div className="modal-dialog modal-dialog-centered" style={{ overscrollBehavior: 'contain' }}>
          <div className="modal-content border-0 shadow">
            <div className="modal-header">
              <h5 className={`modal-title fw-bold ${tone.headerClass} d-flex align-items-center mb-0`}>
                <i className={`bi ${tone.icon} me-2`}></i>
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
              {onReasonChange && (
                <div className="mt-3">
                  <label className="form-label small fw-semibold" htmlFor="confirmation-reason">
                    {reasonLabel || 'Lý do'}
                  </label>
                  <textarea
                    id="confirmation-reason"
                    className="form-control"
                    rows="3"
                    maxLength={500}
                    value={reason}
                    onChange={(event) => onReasonChange(event.target.value)}
                    placeholder={reasonPlaceholder}
                    disabled={loading}
                  ></textarea>
                  <div className="form-text text-end">{reason.length}/500</div>
                </div>
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
                className={`btn ${tone.buttonClass} btn-sm`}
                onClick={onConfirm}
                disabled={loading || confirmDisabled}
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

  return typeof document !== 'undefined' ? createPortal(modalMarkup, document.body) : null;
}
