import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { statsApi } from '../services/api';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

/**
 * Staff/admin platform statistics dashboard.
 */
function Stats() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { replace: true, state: { from: { pathname: '/stats' } } });
    } else if (user?.role !== 'staff' && user?.role !== 'admin') {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate, user]);

  useEffect(() => {
    if (user?.role !== 'staff' && user?.role !== 'admin') return;
    const loadStats = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await statsApi.platform();
        setStats(response.stats);
      } catch (requestError) {
        setError(requestError.message);
      } finally {
        setLoading(false);
      }
    };
    loadStats();
  }, [user?.role]);

  const summaryCards = stats ? [
    { label: 'Người dùng', value: stats.users?.total || 0, icon: 'bi-people-fill', color: 'primary' },
    { label: 'Điểm đến', value: stats.destinations?.total || 0, icon: 'bi-geo-alt-fill', color: 'success' },
    { label: 'Lịch trình', value: stats.itineraries?.total || 0, icon: 'bi-calendar3', color: 'info' },
    { label: 'Hoạt động đã lên kế hoạch', value: stats.itineraries?.totalActivities || 0, icon: 'bi-list-task', color: 'warning' }
  ] : [];

  return (
    <>
      <Navbar />
      <main className="bg-light py-5 flex-grow-1">
        <div className="container">
          <div className="mb-4">
            <p className="text-primary text-uppercase fw-semibold small mb-2">Staff dashboard</p>
            <h1 className="fw-bold mb-2">Thống kê nền tảng</h1>
            <p className="text-muted mb-0">Tổng quan hoạt động trên TripMate.</p>
          </div>

          {loading ? (
            <div className="text-center py-5"><div className="spinner-border text-primary" role="status"></div></div>
          ) : error ? (
            <div className="alert alert-danger">{error}</div>
          ) : stats ? (
            <>
              <div className="row g-3 mb-4">
                {summaryCards.map((card) => (
                  <div className="col-md-3" key={card.label}>
                    <div className="card border-0 shadow-sm h-100">
                      <div className="card-body p-3">
                        <div className="d-flex align-items-center gap-3">
                          <i className={`bi ${card.icon} fs-3 text-${card.color}`}></i>
                          <div>
                            <p className="text-muted small mb-0">{card.label}</p>
                            <p className="fw-bold mb-0 fs-5">{card.value.toLocaleString()}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="row g-4">
                <div className="col-md-4">
                  <div className="card border-0 shadow-sm h-100">
                    <div className="card-body p-4">
                      <h2 className="h6 fw-bold mb-3">Người dùng theo vai trò</h2>
                      {Object.entries(stats.users?.byRole || {}).map(([role, count]) => (
                        <div key={role} className="d-flex justify-content-between border-bottom py-2">
                          <span className="text-capitalize small">{role}</span>
                          <span className="fw-semibold">{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="col-md-4">
                  <div className="card border-0 shadow-sm h-100">
                    <div className="card-body p-4">
                      <h2 className="h6 fw-bold mb-3">Điểm đến theo trạng thái</h2>
                      {Object.entries(stats.destinations?.byStatus || {}).map(([status, count]) => (
                        <div key={status} className="d-flex justify-content-between border-bottom py-2">
                          <span className="text-capitalize small">{status}</span>
                          <span className="fw-semibold">{count}</span>
                        </div>
                      ))}
                      <div className="d-flex justify-content-between border-bottom py-2">
                        <span className="small"><i className="bi bi-star-fill text-warning me-1"></i>Nổi bật</span>
                        <span className="fw-semibold">{stats.destinations?.popular || 0}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="col-md-4">
                  <div className="card border-0 shadow-sm h-100">
                    <div className="card-body p-4">
                      <h2 className="h6 fw-bold mb-3">Người dùng mới nhất</h2>
                      {stats.recent?.users?.length ? (
                        <div className="vstack gap-2">
                          {stats.recent.users.map((account) => (
                            <div key={account._id} className="d-flex justify-content-between align-items-center small">
                              <div>
                                <span className="fw-semibold d-block">{account.username}</span>
                                <span className="text-muted text-capitalize">{account.role}</span>
                              </div>
                              <span className="text-muted">{new Date(account.createdAt).toLocaleDateString()}</span>
                            </div>
                          ))}
                        </div>
                      ) : <p className="text-muted small mb-0">Chưa có dữ liệu.</p>}
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </div>
      </main>
      <Footer />
    </>
  );
}

export default Stats;