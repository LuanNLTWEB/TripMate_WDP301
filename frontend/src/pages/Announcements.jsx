import { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import AnnouncementDetailModal from '../components/AnnouncementDetailModal';
import { announcementApi } from '../services/api';
import {
  formatAnnouncementDateTime,
  getAnnouncementAudience
} from '../utils/announcementFormatters';

export default function Announcements() {
  const [announcements, setAnnouncements] = useState([]);
  const [searchInput, setSearchInput] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);

  useEffect(() => {
    let active = true;

    const loadAnnouncements = async () => {
      setLoading(true);
      try {
        const response = await announcementApi.getAll({
          search: appliedSearch,
          page: currentPage,
          limit: 9
        });
        if (!active) return;
        setAnnouncements(response.data || []);
        setTotal(response.total || 0);
        setTotalPages(response.totalPages || 0);
        setError('');
      } catch (requestError) {
        if (!active) return;
        setAnnouncements([]);
        setTotal(0);
        setTotalPages(0);
        setError(requestError.message || 'Không thể tải thông báo hệ thống.');
      } finally {
        if (active) setLoading(false);
      }
    };

    loadAnnouncements();
    return () => {
      active = false;
    };
  }, [appliedSearch, currentPage]);

  const handleSearch = (event) => {
    event.preventDefault();
    setCurrentPage(1);
    setAppliedSearch(searchInput.trim());
  };

  return (
    <>
      <Navbar />
      <main className="bg-light min-vh-100 py-5">
        <div className="container">
          <header className="mb-4">
            <span className="text-primary text-uppercase small fw-bold">Cập nhật từ TripMate</span>
            <h1 className="display-6 fw-bold mt-2 mb-2">Thông báo hệ thống</h1>
            <p className="text-muted mb-0">Theo dõi những cập nhật dịch vụ và thông tin quan trọng dành cho bạn.</p>
          </header>

          <form className="card border-0 shadow-sm mb-4" onSubmit={handleSearch}>
            <div className="card-body p-3">
              <div className="input-group">
                <span className="input-group-text bg-white border-end-0"><i className="bi bi-search text-muted"></i></span>
                <input
                  type="search"
                  className="form-control border-start-0"
                  value={searchInput}
                  maxLength={100}
                  placeholder="Tìm theo tiêu đề hoặc nội dung thông báo..."
                  aria-label="Tìm kiếm thông báo"
                  onChange={(event) => setSearchInput(event.target.value)}
                />
                <button type="submit" className="btn btn-primary" disabled={loading}>Tìm kiếm</button>
              </div>
            </div>
          </form>

          {error && <div className="alert alert-danger"><i className="bi bi-exclamation-triangle-fill me-2"></i>{error}</div>}

          {loading ? (
            <div className="text-center py-5"><span className="spinner-border text-primary" role="status"></span></div>
          ) : announcements.length === 0 ? (
            <section className="card border-0 shadow-sm text-center py-5 px-3">
              <i className="bi bi-megaphone fs-1 text-muted mb-3"></i>
              <h2 className="h5 fw-bold">Chưa có thông báo phù hợp</h2>
              <p className="text-muted mb-0">Các thông báo mới từ TripMate sẽ xuất hiện tại đây.</p>
            </section>
          ) : (
            <>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h2 className="h5 fw-bold mb-0">Thông báo mới nhất</h2>
                <span className="small text-muted">Tổng cộng {total} thông báo</span>
              </div>
              <div className="row g-4">
                {announcements.map((announcement) => {
                  const audience = getAnnouncementAudience(announcement.audience);
                  return (
                    <div className="col-12 col-md-6 col-xl-4" key={announcement._id}>
                      <article className="card border-0 shadow-sm h-100">
                        <div className="card-body p-4 d-flex flex-column">
                          <div className="d-flex justify-content-between align-items-start gap-2 mb-3">
                            <span className={`management-badge ${audience.className}`}>
                              <i className={`bi ${audience.icon} me-1`}></i>{audience.label}
                            </span>
                            <small className="text-muted text-nowrap">{formatAnnouncementDateTime(announcement.createdAt)}</small>
                          </div>
                          <h3 className="h5 fw-bold text-dark">{announcement.title}</h3>
                          <p className="text-secondary small flex-grow-1 mb-4" style={{
                            display: '-webkit-box',
                            WebkitLineClamp: 4,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                            whiteSpace: 'pre-wrap'
                          }}>
                            {announcement.content}
                          </p>
                          <button type="button" className="btn btn-outline-primary align-self-start" onClick={() => setSelectedAnnouncement(announcement)}>
                            Xem chi tiết <i className="bi bi-arrow-right ms-1"></i>
                          </button>
                        </div>
                      </article>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {!loading && totalPages > 1 && (
            <nav className="d-flex justify-content-center mt-4" aria-label="Phân trang thông báo">
              <ul className="pagination mb-0">
                <li className={`page-item ${currentPage <= 1 ? 'disabled' : ''}`}>
                  <button type="button" className="page-link" disabled={currentPage <= 1} onClick={() => setCurrentPage((page) => page - 1)}>Trước</button>
                </li>
                <li className="page-item active"><span className="page-link">{currentPage} / {totalPages}</span></li>
                <li className={`page-item ${currentPage >= totalPages ? 'disabled' : ''}`}>
                  <button type="button" className="page-link" disabled={currentPage >= totalPages} onClick={() => setCurrentPage((page) => page + 1)}>Sau</button>
                </li>
              </ul>
            </nav>
          )}
        </div>
      </main>
      <Footer />
      <AnnouncementDetailModal announcement={selectedAnnouncement} onClose={() => setSelectedAnnouncement(null)} />
    </>
  );
}
