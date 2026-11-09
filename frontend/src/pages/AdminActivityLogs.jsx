import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { activityLogApi } from '../services/api';
import CustomSelect from '../components/CustomSelect';
import ManagementPagination from '../components/management/ManagementPagination';

const ACTION_LABELS = {
  CREATE_ACCOUNT: 'Tạo tài khoản',
  UPDATE_ACCOUNT_ROLE: 'Đổi vai trò',
  ACTIVATE_ACCOUNT: 'Kích hoạt tài khoản',
  DEACTIVATE_ACCOUNT: 'Vô hiệu hóa tài khoản',
  DELETE_ACCOUNT: 'Xóa tài khoản',
  CREATE_ROLE: 'Tạo vai trò',
  UPDATE_ROLE: 'Cập nhật vai trò',
  DELETE_ROLE: 'Xóa vai trò',
  MODERATE_REVIEW: 'Kiểm duyệt đánh giá',
  DELETE_REVIEW: 'Xóa đánh giá'
};

const ACTION_BADGES = {
  CREATE_ACCOUNT: 'management-badge badge-success',
  CREATE_ROLE: 'management-badge badge-success',
  UPDATE_ACCOUNT_ROLE: 'management-badge badge-info',
  UPDATE_ROLE: 'management-badge badge-info',
  ACTIVATE_ACCOUNT: 'management-badge badge-primary',
  DEACTIVATE_ACCOUNT: 'management-badge badge-warning',
  DELETE_ACCOUNT: 'management-badge badge-danger',
  DELETE_ROLE: 'management-badge badge-danger',
  MODERATE_REVIEW: 'management-badge badge-primary',
  DELETE_REVIEW: 'management-badge badge-danger'
};

const TARGET_LABELS = {
  Account: 'Tài khoản',
  Role: 'Vai trò',
  Review: 'Đánh giá'
};

const ACTION_OPTIONS = [
  { value: 'all', label: 'Tất cả hành động' },
  ...Object.entries(ACTION_LABELS).map(([value, label]) => ({ value, label }))
];

const TARGET_OPTIONS = [
  { value: 'all', label: 'Tất cả đối tượng' },
  ...Object.entries(TARGET_LABELS).map(([value, label]) => ({ value, label }))
];

const formatDateTime = (dateString) => {
  if (!dateString) return '—';
  const date = new Date(dateString);
  return date.toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

function AdminActivityLogs() {
  const { user } = useAuth();
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [targetTypeFilter, setTargetTypeFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const loadLogs = useCallback(async (page = 1, searchKeyword = search, action = actionFilter, targetType = targetTypeFilter) => {
    setIsLoading(true);
    try {
      const response = await activityLogApi.getAll({
        page,
        limit: 15,
        search: searchKeyword.trim(),
        action,
        targetType
      });
      setLogs(response.logs || []);
      setTotal(response.pagination?.total || 0);
      setTotalPages(response.pagination?.totalPages || 1);
      setCurrentPage(response.pagination?.page || 1);
      setError('');
    } catch (requestError) {
      setError(requestError.message || 'Không thể tải nhật ký hoạt động.');
    } finally {
      setIsLoading(false);
    }
  }, [search, actionFilter, targetTypeFilter]);

  // Debounced search & filter trigger
  useEffect(() => {
    if (user?.role !== 'admin') return;
    const timer = setTimeout(() => {
      loadLogs(1, search, actionFilter, targetTypeFilter);
    }, 300);
    return () => clearTimeout(timer);
  }, [search, actionFilter, targetTypeFilter, user?.role, loadLogs]);

  const handleResetFilters = () => {
    setSearch('');
    setActionFilter('all');
    setTargetTypeFilter('all');
  };

  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > totalPages || newPage === currentPage) return;
    loadLogs(newPage, search, actionFilter, targetTypeFilter);
  };

  return (
    <section className="management-page-section">
      <div className="container-fluid px-0">
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
          <div>
            <h1 className="h3 fw-bold mb-1">Nhật ký hoạt động</h1>
            <p className="text-muted mb-0 small">Theo dõi toàn bộ lịch sử thao tác của các quản trị viên trên hệ thống</p>
          </div>
          <button
            type="button"
            className="btn btn-outline-secondary btn-sm"
            onClick={() => loadLogs(currentPage, search, actionFilter, targetTypeFilter)}
            disabled={isLoading}
          >
            <i className="bi bi-arrow-clockwise me-1"></i>Làm mới
          </button>
        </div>

        {error && (
          <div className="alert alert-danger alert-dismissible fade show" role="alert">
            {error}
            <button type="button" className="btn-close" onClick={() => setError('')} aria-label="Đóng"></button>
          </div>
        )}

        <div className="card shadow-sm border-0 mb-4">
          <div className="card-body p-3">
            <div className="row g-2 align-items-center">
              <div className="col-12 col-md-5">
                <div className="management-search-box" style={{ maxWidth: '100%' }}>
                  <i className="bi bi-search"></i>
                  <input
                    type="search"
                    placeholder="Tìm theo tên quản trị viên, email, chi tiết..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    aria-label="Tìm kiếm nhật ký"
                  />
                </div>
              </div>
              <div className="col-6 col-md-3">
                <CustomSelect
                  id="action-filter-select"
                  value={actionFilter}
                  options={ACTION_OPTIONS}
                  onChange={(e, val) => setActionFilter(val !== undefined ? val : e.target.value)}
                  placeholder="Lọc theo hành động"
                />
              </div>
              <div className="col-6 col-md-2">
                <CustomSelect
                  id="target-type-filter-select"
                  value={targetTypeFilter}
                  options={TARGET_OPTIONS}
                  onChange={(e, val) => setTargetTypeFilter(val !== undefined ? val : e.target.value)}
                  placeholder="Lọc theo đối tượng"
                />
              </div>
              <div className="col-12 col-md-2 text-md-end">
                {(search || actionFilter !== 'all' || targetTypeFilter !== 'all') && (
                  <button
                    type="button"
                    className="btn btn-outline-secondary w-100"
                    onClick={handleResetFilters}
                  >
                    <i className="bi bi-x-circle me-1"></i>Đặt lại
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="card shadow-sm border-0">
          <div className="card-body p-3 p-md-4">
            <div className="table-responsive">
              <table className="table align-middle mb-0">
                <thead>
                  <tr>
                    <th style={{ minWidth: '170px' }}>Thời gian</th>
                    <th style={{ minWidth: '180px' }}>Quản trị viên</th>
                    <th style={{ minWidth: '160px' }}>Hành động</th>
                    <th style={{ minWidth: '110px' }}>Đối tượng</th>
                    <th style={{ minWidth: '320px' }}>Chi tiết thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan="5" className="text-center py-5">
                        <span className="spinner-border spinner-border-sm me-2"></span>Đang tải nhật ký...
                      </td>
                    </tr>
                  ) : logs.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="text-center py-5 text-muted">
                        <i className="bi bi-clock-history d-block mb-2 fs-2 text-secondary"></i>
                        Chưa có hoạt động quản trị nào phù hợp.
                      </td>
                    </tr>
                  ) : (
                    logs.map((log) => (
                      <tr key={log.id}>
                        <td className="small text-muted">
                          {formatDateTime(log.createdAt)}
                        </td>
                        <td>
                          <div className="fw-semibold">{log.adminUsername}</div>
                          {log.adminEmail && <div className="small text-muted">{log.adminEmail}</div>}
                        </td>
                        <td>
                          <span className={ACTION_BADGES[log.action] || 'management-badge badge-secondary'}>
                            <span className="management-badge-dot"></span>
                            {ACTION_LABELS[log.action] || log.action}
                          </span>
                        </td>
                        <td>
                          <span className="badge bg-light text-dark border">
                            {TARGET_LABELS[log.targetType] || log.targetType}
                          </span>
                        </td>
                        <td className="small">
                          {log.details}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <ManagementPagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={total}
              itemLabel="hoạt động"
              isLoading={isLoading}
              onPageChange={handlePageChange}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

export default AdminActivityLogs;
