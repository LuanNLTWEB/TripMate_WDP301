import { useEffect } from 'react';

// START UC-24 Duplicate Tour
/**
 * Hộp thoại xác nhận nhân bản tour.
 * Dùng lại cấu trúc/spacing của ConfirmDeleteModal nhưng theo tông primary vì đây là
 * thao tác tạo mới (không phải thao tác xóa phá hủy dữ liệu).
 */
export default function DuplicateTourModal({
  isOpen,
  tourTitle = '',
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
              <h5 className="modal-title fw-bold text-primary d-flex align-items-center mb-0">
                <i className="bi bi-files me-2"></i>
                Xác nhận nhân bản tour
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
              <p className="mb-2 text-dark">
                Bạn có chắc muốn nhân bản tour{' '}
                <strong className="text-primary">{tourTitle}</strong>?
              </p>
              <small className="text-muted d-block">
                Hệ thống sẽ tạo một tour mới ở trạng thái <strong>Bản nháp</strong> thuộc quyền sở hữu
                của bạn, sao chép thông tin mô tả và lịch trình khung. Lịch khởi hành, đặt tour và đánh
                giá của tour gốc sẽ không được sao chép.
              </small>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={onClose}
                disabled={loading}
              >
                Hủy
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={onConfirm}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                    Đang nhân bản...
                  </>
                ) : (
                  <>
                    <i className="bi bi-files me-1"></i>
                    Xác nhận nhân bản
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
// END UC-24 Duplicate Tour
