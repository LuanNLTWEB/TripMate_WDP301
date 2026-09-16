import { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { statsApi } from '../services/api';
import { useAuth } from '../hooks/useAuth';

const roleLabels = {
  user: 'User',
  customer: 'Customer',
  provider: 'Provider',
  staff: 'Staff',
  admin: 'Admin'
};

function Stats() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const canView = user?.role === 'staff' || user?.role === 'admin';

  useEffect(() => {
    if (!canView) {
      setLoading(false);
      return;
    }
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await statsApi.getPlatform();
        setStats(response.stats);
      } catch (requestError) {
        setError(requestError.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [canView]);

  return (
    <>
      <Navbar />
      <main className="bg-light py-5">
        <div className="container">
          <div className="mb-4">
            <p className="text-primary text-uppercase fw-semibold small mb-2">Platform overview</p>
            <h1 className="fw-bold mb-2">Platform statistics</h1>
            <p className="text-muted mb-0">Live overview of users, destinations, and personal itineraries.</p>
          </div>

          {!canView ? (
            <div className="alert alert-danger">Access restricted to staff and administrators.</div>
          ) : loading ? (
            <div className="text-center py-5 text-muted">Loading statistics...</div>
          ) : error ? (
            <div className="alert alert-danger">{error}</div>
          ) : (
            <>
              <div className="row g-4 mb-4">
                <div className="col-md-6 col-xl-3">
                  <article className="card h-100 border-0 shadow-sm">
                    <div className="card-body p-4">
                      <div className="d-flex align-items-center gap-3">
                        <i className="bi bi-people fs-2 text-primary" />
                        <div>
                          <div className="fs-3 fw-bold">{stats.users.total}</div>
                          <div className="text-muted small">Total users</div>
                        </div>
                      </div>
                    </div>
                  </article>
                </div>
                <div className="col-md-6 col-xl-3">
                  <article className="card h-100 border-0 shadow-sm">
                    <div className="card-body p-4">
                      <div className="d-flex align-items-center gap-3">
                        <i className="bi bi-geo-alt fs-2 text-success" />
                        <div>
                          <div className="fs-3 fw-bold">{stats.destinations.total}</div>
                          <div className="text-muted small">Destinations</div>
                        </div>
                      </div>
                    </div>
                  </article>
                </div>
                <div className="col-md-6 col-xl-3">
                  <article className="card h-100 border-0 shadow-sm">
                    <div className="card-body p-4">
                      <div className="d-flex align-items-center gap-3">
                        <i className="bi bi-calendar2-check fs-2 text-info" />
                        <div>
                          <div className="fs-3 fw-bold">{stats.itineraries.total}</div>
                          <div className="text-muted small">Personal itineraries</div>
                        </div>
                      </div>
                    </div>
                  </article>
                </div>
                <div className="col-md-6 col-xl-3">
                  <article className="card h-100 border-0 shadow-sm">
                    <div className="card-body p-4">
                      <div className="d-flex align-items-center gap-3">
                        <i className="bi bi-list-check fs-2 text-warning" />
                        <div>
                          <div className="fs-3 fw-bold">{stats.itineraries.activities}</div>
                          <div className="text-muted small">Planned activities</div>
                        </div>
                      </div>
                    </div>
                  </article>
                </div>
              </div>

              <div className="row g-4 mb-4">
                <div className="col-md-6 col-xl-4">
                  <article className="card h-100 border-0 shadow-sm">
                    <div className="card-body p-4">
                      <h2 className="h5 fw-bold mb-3">Users by role</h2>
                      <ul className="list-group list-group-flush">
                        {Object.entries(stats.users.byRole).map(([role, count]) => (
                          <li className="list-group-item d-flex justify-content-between px-0" key={role}>
                            <span>{roleLabels[role] || role}</span>
                            <span className="badge text-bg-secondary">{count}</span>
                          </li>
                        ))}
                        {Object.keys(stats.users.byRole).length === 0 && (
                          <li className="list-group-item px-0 text-muted">No users yet.</li>
                        )}
                      </ul>
                    </div>
                  </article>
                </div>
                <div className="col-md-6 col-xl-4">
                  <article className="card h-100 border-0 shadow-sm">
                    <div className="card-body p-4">
                      <h2 className="h5 fw-bold mb-3">Destinations by status</h2>
                      <ul className="list-group list-group-flush">
                        {Object.entries(stats.destinations.byStatus).map(([status, count]) => (
                          <li className="list-group-item d-flex justify-content-between px-0" key={status}>
                            <span className="text-capitalize">{status}</span>
                            <span className="badge text-bg-secondary">{count}</span>
                          </li>
                        ))}
                        {Object.keys(stats.destinations.byStatus).length === 0 && (
                          <li className="list-group-item px-0 text-muted">No destinations yet.</li>
                        )}
                      </ul>
                    </div>
                  </article>
                </div>
                <div className="col-md-6 col-xl-4">
                  <article className="card h-100 border-0 shadow-sm">
                    <div className="card-body p-4">
                      <h2 className="h5 fw-bold mb-3">Itinerary activity</h2>
                      <ul className="list-group list-group-flush">
                        <li className="list-group-item d-flex justify-content-between px-0">
                          <span>Itineraries with activities</span>
                          <span className="badge text-bg-secondary">{stats.itineraries.withActivities}</span>
                        </li>
                        <li className="list-group-item d-flex justify-content-between px-0">
                          <span>Total planned activities</span>
                          <span className="badge text-bg-secondary">{stats.itineraries.activities}</span>
                        </li>
                      </ul>
                    </div>
                  </article>
                </div>
              </div>

              <div className="row g-4">
                <div className="col-lg-4">
                  <article className="card h-100 border-0 shadow-sm">
                    <div className="card-body p-4">
                      <h2 className="h5 fw-bold mb-3">Recent users</h2>
                      {stats.recent.users.length === 0 ? (
                        <p className="text-muted small mb-0">No users yet.</p>
                      ) : (
                        <ul className="list-group list-group-flush">
                          {stats.recent.users.map((entry) => (
                            <li className="list-group-item px-0" key={entry._id}>
                              <div className="fw-semibold">{entry.username}</div>
                              <div className="small text-muted">{entry.email}</div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </article>
                </div>
                <div className="col-lg-4">
                  <article className="card h-100 border-0 shadow-sm">
                    <div className="card-body p-4">
                      <h2 className="h5 fw-bold mb-3">Recent destinations</h2>
                      {stats.recent.destinations.length === 0 ? (
                        <p className="text-muted small mb-0">No destinations yet.</p>
                      ) : (
                        <ul className="list-group list-group-flush">
                          {stats.recent.destinations.map((entry) => (
                            <li className="list-group-item px-0" key={entry._id}>
                              <div className="fw-semibold">{entry.name}</div>
                              <div className="small text-muted text-capitalize">{entry.category}</div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </article>
                </div>
                <div className="col-lg-4">
                  <article className="card h-100 border-0 shadow-sm">
                    <div className="card-body p-4">
                      <h2 className="h5 fw-bold mb-3">Recently updated itineraries</h2>
                      {stats.recent.itineraries.length === 0 ? (
                        <p className="text-muted small mb-0">No itineraries yet.</p>
                      ) : (
                        <ul className="list-group list-group-flush">
                          {stats.recent.itineraries.map((entry) => (
                            <li className="list-group-item px-0" key={entry._id}>
                              <div className="fw-semibold">{entry.title}</div>
                              <div className="small text-muted">
                                {entry.owner?.username ? `By ${entry.owner.username}` : 'By unknown user'}
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </article>
                </div>
              </div>
            </>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}

export default Stats;