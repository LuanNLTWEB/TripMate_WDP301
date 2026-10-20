function getPaginationRange(currentPage, totalPages) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  if (currentPage <= 4) {
    return [1, 2, 3, 4, 5, '...', totalPages];
  }

  if (currentPage >= totalPages - 3) {
    return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  }

  return [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
}

export default function ManagementPagination({
  currentPage = 1,
  totalPages = 1,
  totalItems,
  itemLabel = 'mục',
  isLoading = false,
  onPageChange
}) {
  if (totalPages <= 1) {
    return null;
  }

  const paginationRange = getPaginationRange(currentPage, totalPages);

  return (
    <div className="management-pagination-bar">
      <div>
        Trang <strong>{currentPage}</strong> trên <strong>{totalPages}</strong>
        {typeof totalItems === 'number' && (
          <span className="ms-1">
            (Tổng <strong>{totalItems}</strong> {itemLabel})
          </span>
        )}
      </div>
      <nav aria-label="Phân trang danh sách">
        <ul className="pagination pagination-sm mb-0">
          <li className={`page-item ${currentPage <= 1 ? 'disabled' : ''}`}>
            <button
              type="button"
              className="page-link"
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage <= 1 || isLoading}
              aria-label="Trang trước"
            >
              <i className="bi bi-chevron-left me-1"></i>Trước
            </button>
          </li>

          {paginationRange.map((page, index) => {
            if (page === '...') {
              return (
                <li key={`ellipsis-${index}`} className="page-item disabled">
                  <span className="page-link">…</span>
                </li>
              );
            }

            return (
              <li
                key={page}
                className={`page-item ${currentPage === page ? 'active' : ''}`}
              >
                <button
                  type="button"
                  className="page-link"
                  onClick={() => onPageChange(page)}
                  disabled={isLoading}
                  aria-label={`Trang ${page}`}
                  aria-current={currentPage === page ? 'page' : undefined}
                >
                  {page}
                </button>
              </li>
            );
          })}

          <li className={`page-item ${currentPage >= totalPages ? 'disabled' : ''}`}>
            <button
              type="button"
              className="page-link"
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage >= totalPages || isLoading}
              aria-label="Trang sau"
            >
              Sau<i className="bi bi-chevron-right ms-1"></i>
            </button>
          </li>
        </ul>
      </nav>
    </div>
  );
}
