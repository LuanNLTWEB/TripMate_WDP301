import { Link } from 'react-router-dom';
import { useTourCompare } from '../hooks/useTourCompare';

export default function FloatingCompareBar() {
  const { compareIds, count, maxCompare, clearAll } = useTourCompare();

  if (count === 0) return null;

  return (
    <div
      className="position-fixed bottom-0 start-50 translate-middle-x mb-4 shadow-lg rounded-pill px-4 py-2 bg-dark text-white d-flex align-items-center gap-3"
      style={{ zIndex: 1050, border: '1px solid rgba(255,255,255,0.2)', backdropFilter: 'blur(10px)' }}
      role="region"
      aria-label="Thanh so sánh tour"
    >
      <div className="d-flex align-items-center gap-2">
        <span className="badge bg-primary rounded-pill px-2 py-1">
          <i className="bi bi-arrow-left-right me-1"></i>
          {count}/{maxCompare}
        </span>
        <span className="small fw-semibold d-none d-sm-inline">
          Đã chọn {count} tour để so sánh
        </span>
      </div>

      <div className="d-flex align-items-center gap-2">
        {count >= 2 ? (
          <Link
            to="/tours/compare"
            className="btn btn-primary btn-sm rounded-pill px-3 fw-semibold d-flex align-items-center gap-1 shadow-sm"
          >
            <i className="bi bi-columns-gap"></i>
            <span>So sánh ngay</span>
          </Link>
        ) : (
          <button
            type="button"
            className="btn btn-secondary btn-sm rounded-pill px-3 fw-semibold opacity-75"
            disabled
            title="Vui lòng chọn thêm ít nhất 1 tour nữa để so sánh"
          >
            <span>Chọn thêm 1 tour nữa</span>
          </button>
        )}

        <button
          type="button"
          className="btn btn-outline-light btn-sm rounded-pill px-2 py-1"
          onClick={clearAll}
          title="Xóa tất cả tour đã chọn"
        >
          <i className="bi bi-x-lg"></i>
          <span className="d-none d-md-inline ms-1 small">Bỏ chọn</span>
        </button>
      </div>
    </div>
  );
}

