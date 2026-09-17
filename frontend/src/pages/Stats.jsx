import { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { statsApi } from '../services/api';
import { useAuth } from '../hooks/useAuth';

function byKey(entries, key, fallback = 0) {
  const entry = (entries || []).find((item) => String(item._id) === key);
  return entry ? entry.count : fallback;
}

/**
 * Staff/admin platform statistics dashboard.
 */
function Stats() {
  const { isAuthenticated } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadStats = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await statsApi.getPlatformStats();
        setStats(response.stats);
      } catch (requestError) {
        setError(requestError.message);
      } finally {
        setLoading(false);
      }
    };

    if (isAuthenticated) {
      loadStats();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated]);

  return (
    <>
      <Navbar />
      <main className="bg-light py-5 flex-grow-1">
        <div className="container">
          <div className="mb-4">
            <p className="text-primary text-uppercase fw-semibold small mb-2">Platform overview</p>
            <h1 className="fw-bold mb-2">Thống kê nền tảng</h1>
            <p className="text-muted mb-0">Tổng quan về người dùng, điểm đến, tour và lịch trình.</p>
          </div>

          {!isAuthenticated ? (
            <div className="alert alert-info">Vui lòng đăng nhập để xem thống kê nền tảng.</div>
          ) : loading ? (
            <div className="text-center py-5"><div className="spinner-border text-primary" role="status"></div></div>
          ) : error ? (
            <div className="alert alert-danger">{error}</div>
          ) : stats ? (
            <>
              <div className="row g-3 mb-4">
                <div className="col-md-3">
                  <div className="card border-0 shadow-sm text-center"><div className="card-body">
                    <div className="display-6 fw-bold text-primary">{stats.users.total}</div>
                    <div className="text-muted small">Người dùng</div>
                  </div></div>
                </div>
                <div className="col-md-3">
                  <div className="card border-0 shadow-sm text-center"><div className="card-body">
                    <div className="display-6 fw-bold text-success">{stats.destinations.total}</div>
                    <div className="text-muted small">Điểm đến</div>
                  </div></div>
                </div>
                <div className="col-md-3">
                  <div className="card border-0 shadow-sm text-center"><div className="card-body">
                    <div className="display-6 fw-bold text-warning">{stats.tours.total}</div>
                    <div className="text-muted small">Tour du lịch</div>
                  </div></div>
                </div>
                <div className="col-md-3">
                  <div className="card border-0 shadow-sm text-center"><div className="card-body">
                    <div className="display-6 fw-bold text-info">{stats.itineraries.total}</div>
                    <div className="text-muted small">Lịch trình</div>
                  </div></div>
                </div>
              </div>

              <div className="row g-4 mb-4">
                <div className="col-md-4">
                  <div className="card border-0 shadow-sm h-100">
                    <div className="card-body p-4">
                      <h2 className="h6 fw-bold text-uppercase text-muted mb-3">Người dùng theo vai trò</h2>
                      {[
                        { key: 'customer', label: 'Khách hàng', color: 'bg-primary' },
                        { key: 'staff', label: 'Nhân viên', color: 'bg-success' },
                        { key: 'admin', label: 'Quản trị viên', color: 'bg-warning' }
                      ].map((role) => (
                        <div className="d-flex justify-content-between align-items-center mb-2" key={role.key}>
                          <span>{role.label}</span>
                          <span className={`badge ${role.color} rounded-pill`}>{byKey(stats.users.byRole, role.key)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="card border-0 shadow-sm h-100">
                    <div className="card-body p-4">
                      <h2 className="h6 fw-bold text-uppercase text-muted mb-3">Điểm đến theo trạng thái</h2>
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <span>Hoạt động</span>
                        <span className="badge bg-success rounded-pill">{byKey(stats.destinations.byStatus, 'active')}</span>
                      </div>
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <span>Ngừng hoạt động</span>
                        <span className="badge bg-secondary rounded-pill">{byKey(stats.destinations.byStatus, 'inactive')}</span>
                      </div>
                      <hr />
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <span>Danh mục</span>
                        <span className="badge bg-info rounded-pill">{stats.categories}</span>
                      </div>
                      <div className="d-flex justify-content-between align-items-center">
                        <span>Điểm đến phổ biến</span>
                        <span className="badge bg-danger rounded-pill">{stats.destinations.popularCount}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="card border-0 shadow-sm h-100">
                    <div className="card-body p-4">
                      <h2 className="h6 fw-bold text-uppercase text-muted mb-3">Lịch trình</h2>
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <span>Tổng lịch trình</span>
                        <span className="badge bg-info rounded-pill">{stats.itineraries.total}</span>
                      </div>
                      <div className="d-flex justify-content-between align-items-center">
                        <span>Hoạt động đã lên kế hoạch</span>
                        <span className="badge bg-primary rounded-pill">{stats.itineraries.activitiesTotal}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="row g-4">
                <div className="col-md-4">
                  <div className="card border-0 shadow-sm">
                    <div className="card-body p-4">
                      <h2 className="h6 fw-bold text-uppercase text-muted mb-3">Người dùng mới nhất</h2>
                      <div className="vstack gap-2">
                        {stats.recent.users.length === 0 ? <p className="text-muted small mb-0">Chưa có dữ liệu.</p> : stats.recent.users.map((entry) => (
                          <div className="d-flex justify-content-between align-items-center border rounded p-2" key={entry._id}>
                            <span className="fw-semibold">{entry.username}</span>
                            <span className="badge bg-primary rounded-pill">{entry.role}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="card border-0 shadow-sm">
                    <div className="card-body p-4">
                      <h2 className="h6 fw-bold text-uppercase text-muted mb-3">Điểm đến mới nhất</h2>
                      <div className="vstack gap-2">
                        {stats.recent.destinations.length === 0 ? <p className="text-muted small mb-0">Chưa có dữ liệu.</p> : stats.recent.destinations.map((entry) => (
                          <div className="d-flex justify-content-between align-items-center border rounded p-2" key={entry._id}>
                            <span className="fw-semibold">{entry.name}</span>
                            <span className="badge bg-success rounded-pill">{entry.status}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="card border-0 shadow-sm">
                    <div className="card-body p-4">
                      <h2 className="h6 fw-bold text-uppercase text-muted mb-3">Lịch trình mới nhất</h2>
                      <div className="vstack gap-2">
                        {stats.recent.itineraries.length === 0 ? <p className="text-muted small mb-0">Chưa có dữ liệu.</p> : stats.recent.itineraries.map((entry) => (
                          <div className="d-flex justify-content-between align-items-center border rounded p-2" key={entry._id}>
                            <span className="fw-semibold">{entry.title}</span>
                            <span className="small text-muted">{entry.owner?.username || '—'}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center text-muted py-5">Không có dữ liệu thống kê.</div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}

export default Stats;