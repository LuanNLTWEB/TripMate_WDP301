import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useToast } from '../hooks/useToast';
import { statsApi } from '../services/api';
import MonthlyRegistrationChart from '../components/charts/MonthlyRegistrationChart';
import AccountStatusDoughnutChart from '../components/charts/AccountStatusDoughnutChart';
import {
  ROLE_LABELS,
  formatAdminDate,
  getAccountStatusMeta,
  getRoleMeta
} from '../utils/adminFormatters';

const roleIcons = {
  admin: 'bi-shield-lock-fill',
  staff: 'bi-person-badge-fill',
  tourProvider: 'bi-building-fill',
  customer: 'bi-people-fill'
};

const roleBorderClasses = {
  admin: 'border-warning',
  staff: 'border-info',
  tourProvider: 'border-primary',
  customer: 'border-secondary'
};

function AdminDashboard() {
  const toast = useToast();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [monthsCount, setMonthsCount] = useState(12);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const response = await statsApi.getAdminStats({ months: monthsCount });
      if (response?.success && response?.stats) {
        setStats(response.stats);
      } else {
        throw new Error(response?.message || 'Không thể tải số liệu thống kê.');
      }
    } catch (err) {
      toast.error(err.message || 'Không thể tải số liệu thống kê từ hệ thống.');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    statsApi.getAdminStats({ months: monthsCount })
      .then((response) => {
        if (!ignore && response?.success && response?.stats) {
          setStats(response.stats);
        }
      })
      .catch((err) => {
        if (!ignore) {
          toast.error(err.message || 'Không thể tải số liệu thống kê từ hệ thống.');
        }
      })
      .finally(() => {
        if (!ignore) {
          setLoading(false);
          setIsRefreshing(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [monthsCount, toast]);

  const summary = stats?.summary || {
    totalAccounts: 0,
    activeAccounts: 0,
    disabledAccounts: 0,
    activePercentage: 0,
    disabledPercentage: 0
  };

  const roles = stats?.roles || [];
  const monthlyData = stats?.monthlyRegistrations || [];
  const recentAccounts = stats?.recentAccounts || [];
  const trend = stats?.trend;

  return (
    <section className="management-page-section">
      {/* Unified Header Matching Management System */}
      <div className="management-page-heading d-flex flex-column flex-md-row justify-content-between align-items-md-start gap-3">
        <div>
          <h1>Tổng quan hệ thống</h1>
          <p>Theo dõi số liệu thống kê tài khoản, vai trò và xu hướng đăng ký.</p>
        </div>

        <div className="d-flex align-items-center gap-2 flex-wrap flex-shrink-0 mt-md-1">
          <button
            type="button"
            className="btn btn-outline-secondary d-inline-flex align-items-center justify-content-center gap-2"
            style={{ minWidth: '122px' }}
            onClick={handleRefresh}
            disabled={loading || isRefreshing}
            title="Làm mới dữ liệu"
          >
            <i className={`bi bi-arrow-clockwise ${isRefreshing ? 'spin-icon' : ''}`}></i>
            <span>Làm mới</span>
          </button>
          <Link to="/management/accounts" className="btn btn-primary d-inline-flex align-items-center gap-2">
            <i className="bi bi-people"></i>
            <span>Quản lý tài khoản</span>
          </Link>
        </div>
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="d-flex flex-column align-items-center justify-content-center py-5" style={{ minHeight: '420px' }}>
          <div className="spinner-border text-primary mb-3" role="status" style={{ width: '3rem', height: '3rem' }}>
            <span className="visually-hidden">Đang tải dữ liệu...</span>
          </div>
          <p className="text-muted">Đang tổng hợp dữ liệu thống kê từ hệ thống...</p>
        </div>
      ) : (
        <>
          {/* 1. TOP STAT SUMMARY CARDS */}
          <div className="row g-3 mb-4">
            <div className="col-12 col-sm-6 col-xl-3">
              <div className="management-table-card h-100 p-3 p-md-4">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span className="text-uppercase fw-semibold text-muted small">Tổng số tài khoản</span>
                  <span className="p-2 rounded-3 bg-primary-subtle text-primary">
                    <i className="bi bi-people-fill fs-5"></i>
                  </span>
                </div>
                <div className="display-6 fw-bold text-primary mb-1">{summary.totalAccounts}</div>
                <div className="d-flex align-items-center justify-content-between text-muted small">
                  <span>Toàn bộ người dùng</span>
                  <span className="badge bg-primary rounded-pill">100%</span>
                </div>
              </div>
            </div>

            <div className="col-12 col-sm-6 col-xl-3">
              <div className="management-table-card h-100 p-3 p-md-4">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span className="text-uppercase fw-semibold text-muted small">Đang hoạt động</span>
                  <span className="p-2 rounded-3 bg-success-subtle text-success">
                    <i className="bi bi-check-circle-fill fs-5"></i>
                  </span>
                </div>
                <div className="display-6 fw-bold text-success mb-1">{summary.activeAccounts}</div>
                <div className="d-flex align-items-center justify-content-between text-muted small">
                  <span>Tài khoản hoạt động</span>
                  <span className="badge bg-success rounded-pill">{summary.activePercentage}%</span>
                </div>
              </div>
            </div>

            <div className="col-12 col-sm-6 col-xl-3">
              <div className="management-table-card h-100 p-3 p-md-4">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span className="text-uppercase fw-semibold text-muted small">Đã vô hiệu hóa</span>
                  <span className="p-2 rounded-3 bg-danger-subtle text-danger">
                    <i className="bi bi-slash-circle-fill fs-5"></i>
                  </span>
                </div>
                <div className="display-6 fw-bold text-danger mb-1">{summary.disabledAccounts}</div>
                <div className="d-flex align-items-center justify-content-between text-muted small">
                  <span>Tài khoản bị khóa</span>
                  <span className="badge bg-danger rounded-pill">{summary.disabledPercentage}%</span>
                </div>
              </div>
            </div>

            <div className="col-12 col-sm-6 col-xl-3">
              <div className="management-table-card h-100 p-3 p-md-4">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span className="text-uppercase fw-semibold text-muted small">Đăng ký mới ({monthsCount}T)</span>
                  <span className="p-2 rounded-3 bg-info-subtle text-info">
                    <i className="bi bi-person-plus-fill fs-5"></i>
                  </span>
                </div>
                <div className="display-6 fw-bold text-dark mb-1">{trend?.totalInPeriod ?? 0}</div>
                <div className="d-flex align-items-center justify-content-between text-muted small">
                  <span>Tháng này: <strong>{trend?.currentMonthCount ?? 0}</strong></span>
                  <span
                    className={`badge ${
                      (trend?.growthRate ?? 0) > 0
                        ? 'bg-success text-white'
                        : (trend?.growthRate ?? 0) < 0
                          ? 'bg-danger text-white'
                          : 'bg-secondary text-white'
                    } rounded-pill`}
                  >
                    {(trend?.growthRate ?? 0) > 0 ? `+${trend.growthRate}%` : `${trend?.growthRate ?? 0}%`}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 2. ROLE BREAKDOWN SECTION */}
          <div className="management-table-card mb-4 p-4">
            <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-2 mb-3">
              <div>
                <span className="badge bg-secondary-subtle text-secondary mb-1">
                  <i className="bi bi-shield-lock me-1"></i>Phân quyền hệ thống
                </span>
                <h2 className="h5 fw-bold mb-0">Tổng số tài khoản theo từng vai trò</h2>
              </div>
              <div className="text-muted small">
                Tổng cộng: <strong>{roles.length}</strong> vai trò trong hệ thống
              </div>
            </div>

            <div className="row g-3">
              {roles.map((role) => {
                const roleMeta = getRoleMeta(role.key);
                const label = ROLE_LABELS[role.key] || role.label || role.name;
                const icon = roleIcons[role.key] || 'bi-person-gear';
                const borderClass = roleBorderClasses[role.key] || 'border-secondary';

                return (
                  <div className="col-12 col-sm-6 col-md-4 col-xl" key={role.key}>
                    <div className={`p-3 bg-light rounded-3 border-start border-4 ${borderClass} h-100 d-flex flex-column justify-content-between`}>
                      <div className="d-flex justify-content-between align-items-start mb-2">
                        <span className="fw-semibold text-truncate me-1">{label}</span>
                        <i className={`bi ${icon} text-muted`}></i>
                      </div>
                      <div>
                        <div className="d-flex align-items-baseline gap-2 mb-2">
                          <span className="fs-3 fw-bold text-dark">{role.count}</span>
                          <span className="text-muted small">tài khoản</span>
                        </div>
                        <div className="d-flex justify-content-between align-items-center">
                          <span className={`management-badge ${roleMeta.badgeClass}`}>
                            <span className="management-badge-dot"></span>
                            {role.key}
                          </span>
                          <span className="fw-semibold text-muted small">{role.percentage}%</span>
                        </div>
                        <div className="progress mt-2" style={{ height: '5px' }}>
                          <div
                            className="progress-bar bg-primary"
                            role="progressbar"
                            style={{ width: `${role.percentage}%` }}
                            aria-valuenow={role.percentage}
                            aria-valuemin="0"
                            aria-valuemax="100"
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 3. CHARTS GRID (Monthly Trend & Account Status Doughnut) */}
          <div className="row g-4 mb-4">
            <div className="col-12 col-xl-8">
              <MonthlyRegistrationChart
                data={monthlyData}
                monthsCount={monthsCount}
                onMonthsChange={setMonthsCount}
                trend={trend}
              />
            </div>

            <div className="col-12 col-xl-4">
              <AccountStatusDoughnutChart summary={summary} />
            </div>
          </div>

          {/* 4. RECENT ACCOUNTS & QUICK LINKS */}
          <div className="row g-4">
            {/* Recent Accounts Table using unified .management-table-card & .management-table */}
            <div className="col-12 col-xl-8">
              <div className="management-table-card h-100">
                <div className="management-table-toolbar">
                  <div>
                    <h2 className="h5 fw-bold mb-0">Tài khoản mới tạo gần đây</h2>
                    <span className="text-muted small">5 tài khoản được đăng ký mới nhất trong hệ thống</span>
                  </div>
                  <Link
                    to="/management/accounts"
                    className="btn btn-sm btn-outline-primary d-inline-flex align-items-center gap-1"
                  >
                    <span>Xem tất cả</span>
                    <i className="bi bi-arrow-right"></i>
                  </Link>
                </div>

                <div className="table-responsive">
                  <table className="management-table">
                    <thead>
                      <tr>
                        <th>Tài khoản</th>
                        <th>Vai trò</th>
                        <th>Trạng thái</th>
                        <th>Ngày tạo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentAccounts.length === 0 ? (
                        <tr>
                          <td colSpan="4">
                            <div className="management-empty-state">
                              <div className="management-empty-icon">
                                <i className="bi bi-people fs-2"></i>
                              </div>
                              <h6 className="fw-bold text-dark mb-1">Chưa có dữ liệu tài khoản</h6>
                              <p className="small text-muted mb-0">Các tài khoản mới đăng ký sẽ hiển thị tại đây.</p>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        recentAccounts.map((account) => {
                          const roleMeta = getRoleMeta(account.role);
                          const statusMeta = getAccountStatusMeta(account.isActive);

                          return (
                            <tr key={account.id}>
                              <td>
                                <div className="d-flex align-items-center gap-2">
                                  <div
                                    className="rounded-circle bg-primary-subtle text-primary d-flex align-items-center justify-content-center fw-bold flex-shrink-0"
                                    style={{ width: '34px', height: '34px', fontSize: '13px' }}
                                  >
                                    {account.username?.charAt(0)?.toUpperCase() || 'U'}
                                  </div>
                                  <div className="min-w-0">
                                    <div className="fw-semibold text-dark text-truncate">{account.username}</div>
                                    <small className="text-muted text-truncate d-block">{account.email}</small>
                                  </div>
                                </div>
                              </td>
                              <td>
                                <span className={`management-badge ${roleMeta.badgeClass}`}>
                                  <span className="management-badge-dot"></span>
                                  {roleMeta.label}
                                </span>
                              </td>
                              <td>
                                <span className={`management-badge ${statusMeta.badgeClass}`}>
                                  <span className="management-badge-dot"></span>
                                  {statusMeta.label}
                                </span>
                              </td>
                              <td className="small text-muted">{formatAdminDate(account.createdAt)}</td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Quick Navigation Shortcuts */}
            <div className="col-12 col-xl-4">
              <div className="management-table-card h-100 p-4 d-flex flex-column justify-content-between">
                <div>
                  <h2 className="h5 fw-bold mb-1">Lối tắt quản trị</h2>
                  <p className="text-muted small mb-3">Truy cập nhanh các phân hệ chức năng dành riêng cho Admin</p>

                  <div className="vstack gap-2">
                    <Link
                      to="/management/accounts"
                      className="d-flex align-items-center justify-content-between p-3 rounded-3 border bg-white text-decoration-none text-dark hover-shadow"
                      style={{ transition: 'all 0.2s ease' }}
                    >
                      <div className="d-flex align-items-center gap-3">
                        <span className="p-2 rounded-3 bg-primary-subtle text-primary">
                          <i className="bi bi-people fs-5"></i>
                        </span>
                        <div>
                          <strong className="d-block">Quản lý tài khoản</strong>
                          <small className="text-muted">Xem, tạo, khóa và gán vai trò</small>
                        </div>
                      </div>
                      <i className="bi bi-chevron-right text-muted"></i>
                    </Link>

                    <Link
                      to="/management/roles"
                      className="d-flex align-items-center justify-content-between p-3 rounded-3 border bg-white text-decoration-none text-dark hover-shadow"
                      style={{ transition: 'all 0.2s ease' }}
                    >
                      <div className="d-flex align-items-center gap-3">
                        <span className="p-2 rounded-3 bg-warning-subtle text-warning">
                          <i className="bi bi-shield-lock fs-5"></i>
                        </span>
                        <div>
                          <strong className="d-block">Quản lý vai trò</strong>
                          <small className="text-muted">Cấu hình danh mục vai trò</small>
                        </div>
                      </div>
                      <i className="bi bi-chevron-right text-muted"></i>
                    </Link>

                    <Link
                      to="/management/activity-logs"
                      className="d-flex align-items-center justify-content-between p-3 rounded-3 border bg-white text-decoration-none text-dark hover-shadow"
                      style={{ transition: 'all 0.2s ease' }}
                    >
                      <div className="d-flex align-items-center gap-3">
                        <span className="p-2 rounded-3 bg-info-subtle text-info">
                          <i className="bi bi-clock-history fs-5"></i>
                        </span>
                        <div>
                          <strong className="d-block">Nhật ký hoạt động</strong>
                          <small className="text-muted">Lịch sử thao tác của quản trị viên</small>
                        </div>
                      </div>
                      <i className="bi bi-chevron-right text-muted"></i>
                    </Link>
                  </div>
                </div>

                <div className="pt-3 mt-3 border-top text-muted small">
                  <i className="bi bi-info-circle me-1"></i>
                  Dữ liệu thống kê được cập nhật theo thời gian thực từ hệ thống.
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </section>
  );
}

export default AdminDashboard;
