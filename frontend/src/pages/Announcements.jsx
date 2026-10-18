import { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { announcementApi } from '../services/api';

const formatDate = (value) => new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  year: 'numeric'
}).format(new Date(value));

const audienceLabel = {
  all: 'Everyone',
  customer: 'Customers',
  tourProvider: 'Tour providers'
};

export default function Announcements() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    announcementApi.getAll()
      .then((response) => {
        if (active) setAnnouncements(response.data || []);
      })
      .catch((requestError) => {
        if (active) setError(requestError.message || 'Unable to load announcements.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <>
      <Navbar />
      <main className="container py-5">
        <div className="mb-4">
          <span className="text-primary text-uppercase small fw-semibold">TripMate updates</span>
          <h1 className="display-6 fw-bold mt-2 mb-2">Platform announcements</h1>
          <p className="text-muted mb-0">Stay informed about new features, service updates, and important travel notices.</p>
        </div>

        {error && <div className="alert alert-danger">{error}</div>}
        {loading && <div className="text-center py-5"><span className="spinner-border text-primary" role="status"></span></div>}
        {!loading && !error && announcements.length === 0 && (
          <div className="card border-0 shadow-sm">
            <div className="card-body text-center py-5 text-muted">There are no active announcements right now.</div>
          </div>
        )}
        <div className="row g-4">
          {announcements.map((announcement) => (
            <div className="col-12" key={announcement._id}>
              <article className="card border-0 shadow-sm h-100">
                <div className="card-body p-4">
                  <div className="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-3">
                    <div>
                      <span className="badge text-bg-primary mb-2">{audienceLabel[announcement.audience] || 'Everyone'}</span>
                      <h2 className="h4 fw-bold mb-0">{announcement.title}</h2>
                    </div>
                    <small className="text-muted">{formatDate(announcement.createdAt)}</small>
                  </div>
                  <p className="mb-0" style={{ whiteSpace: 'pre-wrap' }}>{announcement.content}</p>
                </div>
              </article>
            </div>
          ))}
        </div>
      </main>
      <Footer />
    </>
  );
}
