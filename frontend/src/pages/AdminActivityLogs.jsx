import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { activityLogApi } from '../services/api';
import CustomSelect from '../components/CustomSelect';
import ManagementPagination from '../components/management/ManagementPagination';
import { formatAdminDateTime } from '../utils/adminFormatters';

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
  CREATE_ACCOUNT: 'badge-success',
  CREATE_ROLE: 'badge-success',
  UPDATE_ACCOUNT_ROLE: 'badge-info',
  UPDATE_ROLE: 'badge-info',
  ACTIVATE_ACCOUNT: 'badge-primary',
  DEACTIVATE_ACCOUNT: 'badge-warning',
  DELETE_ACCOUNT: 'badge-danger',
  DELETE_ROLE: 'badge-danger',
  MODERATE_REVIEW: 'badge-primary',
  DELETE_REVIEW: 'badge-danger'
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

function AdminActivityLogs() {
  const { user } = useAuth();
  const toast = useToast();
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [targetTypeFilter, setTargetTypeFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);

  const loadLogs = useCallback(async (page, searchKeyword, action, targetType) => {
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
    } catch (requestError) {
      toast.error(requestError.message || 'Không thể tải nhật ký hoạt động.');
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // Debounced search & filter trigger
  useEffect(() => {
    if (user?.role !== 'admin') return undefined;
    let active = true;
    const timer = setTimeout(() => {
      setIsLoading(true);
      activityLogApi.getAll({
        page: 1,
        limit: 15,
        search: search.trim(),
        action: actionFilter,
        targetType: targetTypeFilter
      })
        .then((response) => {
          if (!active) return;
          setLogs(response.logs || []);
          setTotal(response.pagination?.total || 0);
          setTotalPages(response.pagination?.totalPages || 1);
          setCurrentPage(response.pagination?.page || 1);
        })
        .catch((requestError) => {
          if (active) {
            toast.error(requestError.message || 'Không thể tải nhật ký hoạt động.');
          }
        })
        .finally(() => {
          if (active) setIsLoading(false);
        });
    }, 300);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [search, actionFilter, targetTypeFilter, user?.role, toast]);

  const handleResetFilters = () => {
    setSearch('');
    setActionFilter('all');
    setTargetTypeFilter('all');
  };

  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > totalPages || newPage === currentPage) return;
    loadLogs(newPage, search, actionFilter, targetTypeFilter);
  };

  const hasActiveFilter = Boolean(search) || actionFilter !== 'all' || targetTypeFilter !== 'all';

  return (
    <section className="management-page-section">
      <div className="management-page-heading d-flex flex-column flex-md-row justify-content-between align-items-md-start gap-3">
        <div>
          <h1>Nhật ký hoạt động</h1>
          <p>Theo dõi toàn bộ lịch sử thao tác của quản trị viên trên hệ thống.</p>
        </div>
        <button
          type="button"
          className="btn btn-outline-secondary d-inline-flex align-items-center justify-content-center gap-2 flex-shrink-0 text-nowrap mt-md-1"
          style={{ minWidth: '122px' }}
          onClick={() => loadLogs(currentPage, search, actionFilter, targetTypeFilter)}
          disabled={isLoading}
        >
          <i className={`bi bi-arrow-clockwise ${isLoading ? 'spin-icon' : ''}`}></i>
          <span>Làm mới</span>
        </button>
      </div>

      <div className="management-table-card">
        <div className="management-table-toolbar flex-wrap gap-3">
          <div className="management-search-box">
            <i className="bi bi-search"></i>
            <input
              type="search"
              placeholder="Tìm theo tên quản trị viên, email, chi tiết..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Tìm kiếm nhật ký"
            />
          </div>

          <div className="d-flex align-items-center gap-2 flex-wrap">
            <CustomSelect
              id="action-filter-select"
              style={{ width: '210px' }}
              triggerStyle={{ height: '40px', fontSize: '0.88rem' }}
              value={actionFilter}
              options={ACTION_OPTIONS}
              onChange={(e, val) => setActionFilter(val !== undefined ? val : e.target.value)}
              placeholder="Lọc theo hành động"
            />
            <CustomSelect
              id="target-type-filter-select"
              style={{ width: '175px' }}
              triggerStyle={{ height: '40px', fontSize: '0.88rem' }}
              value={targetTypeFilter}
              options={TARGET_OPTIONS}
              onChange={(e, val) => setTargetTypeFilter(val !== undefined ? val : e.target.value)}
              placeholder="Lọc theo đối tượng"
            />
            <button
              type="button"
              className="btn btn-outline-secondary d-inline-flex align-items-center gap-1"
              style={{ height: '40px', visibility: hasActiveFilter ? 'visible' : 'hidden' }}
              onClick={handleResetFilters}
              disabled={!hasActiveFilter}
              aria-hidden={!hasActiveFilter}
              tabIndex={hasActiveFilter ? 0 : -1}
              title="Đặt lại bộ lọc"
            >
              <i className="bi bi-x-circle"></i>
              <span>Đặt lại</span>
            </button>
          </div>
        </div>

        <div className="table-responsive">
          <table
            className={`management-table ${isLoading && logs.length > 0 ? 'is-fetching' : ''}`}
            style={{ tableLayout: 'fixed', minWidth: '920px' }}
          >
            <thead>
              <tr>
                <th style={{ width: '16%', minWidth: '170px' }}>Thời gian</th>
                <th style={{ width: '20%', minWidth: '180px' }}>Quản trị viên</th>
                <th style={{ width: '18%', minWidth: '175px' }}>Hành động</th>
                <th style={{ width: '13%', minWidth: '125px' }}>Đối tượng</th>
                <th style={{ width: '33%', minWidth: '280px' }}>Chi tiết thao tác</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && logs.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center py-5 text-muted">
                    <div className="spinner-border spinner-border-sm text-primary me-2" role="status"></div>
                    Đang tải nhật ký hoạt động...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan="5">
                    <div className="management-empty-state">
                      <div className="management-empty-icon">
                        <i className="bi bi-clock-history fs-2"></i>
                      </div>
                      <h6 className="fw-bold text-dark mb-1">Chưa có hoạt động phù hợp</h6>
                      <p className="small text-muted mb-0">
                        Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc hành động, đối tượng.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id}>
                    <td className="small text-muted">
                      {formatAdminDateTime(log.createdAt)}
                    </td>
                    <td>
                      <div className="fw-semibold text-dark">{log.adminUsername}</div>
                      {log.adminEmail && <div className="small text-muted">{log.adminEmail}</div>}
                    </td>
                    <td>
                      <span className={`management-badge ${ACTION_BADGES[log.action] || 'badge-secondary'}`}>
                        <span className="management-badge-dot"></span>
                        {ACTION_LABELS[log.action] || log.action}
                      </span>
                    </td>
                    <td>
                      <span className="management-badge badge-secondary">
                        <span className="management-badge-dot"></span>
                        {TARGET_LABELS[log.targetType] || log.targetType}
                      </span>
                    </td>
                    <td className="small text-secondary">
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
    </section>
  );
}

export default AdminActivityLogs;
