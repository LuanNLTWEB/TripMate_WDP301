import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { announcementApi } from '../services/api';
import {
  formatAnnouncementDateTime,
  getAnnouncementAudience
} from '../utils/announcementFormatters';

export default function Announcements() {
  const [announcements, setAnnouncements] = useState([]);
  const [searchInput, setSearchInput] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [audienceTab, setAudienceTab] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

  const handleClearSearch = () => {
    setSearchInput('');
    setAppliedSearch('');
    setCurrentPage(1);
  };

  // Client-side quick filter by audience tab if user clicks a tab
  const displayedAnnouncements = audienceTab === 'all'
    ? announcements
    : announcements.filter((a) => a.audience === 'all' || a.audience === audienceTab);

  return (
    <>
      <Navbar />

      {/* Header Section (Clean Modern Editorial Light Theme) */}
      <header className="announcements-header">
        <div className="container">
          <div className="row align-items-center justify-content-between g-4">
            <div className="col-lg-7">
              <span className="announcements-badge-kicker">
                <i className="bi bi-megaphone-fill"></i>
                Hệ thống TripMate
              </span>
              <h1 className="announcements-heading">
                Thông báo & Tin tức Hệ thống
              </h1>
              <p className="announcements-subheading">
                Theo dõi các thông tin quan trọng về dịch vụ, bảo trì định kỳ, nâng cấp hệ thống và chính sách mới nhất.
              </p>
            </div>

            <div className="col-lg-5 col-xl-4">
              <form className="announcement-search-wrapper" onSubmit={handleSearch}>
                <i className="bi bi-search text-muted fs-6 ms-2 me-1"></i>
                <input
                  type="search"
                  className="form-control border-0 shadow-none px-2 py-1"
                  value={searchInput}
                  maxLength={100}
                  placeholder="Tìm kiếm thông báo..."
                  aria-label="Tìm kiếm thông báo"
                  onChange={(event) => setSearchInput(event.target.value)}
                />
                {searchInput && (
                  <button
                    type="button"
                    className="btn btn-link text-muted p-0 me-2 text-decoration-none border-0"
                    onClick={handleClearSearch}
                    title="Xóa tìm kiếm"
                  >
                    <i className="bi bi-x-circle-fill"></i>
                  </button>
                )}
                <button
                  type="submit"
                  className="btn btn-primary btn-sm px-3 py-2 rounded-2 fw-semibold flex-shrink-0"
                  disabled={loading}
                >
                  Tìm
                </button>
              </form>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="bg-light min-vh-100 py-5">
        <div className="container">
          {/* Quick Filter Tabs & Counts */}
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
            <div className="d-flex flex-wrap gap-2 align-items-center">
              <button
                type="button"
                className={`announcement-filter-pill ${audienceTab === 'all' ? 'active' : ''}`}
                onClick={() => setAudienceTab('all')}
              >
                <i className="bi bi-collection"></i>
                Tất cả thông báo
                <span className={`badge rounded-pill ms-1 ${audienceTab === 'all' ? 'bg-white text-primary' : 'bg-light text-secondary border'}`}>
                  {announcements.length}
                </span>
              </button>
              <button
                type="button"
                className={`announcement-filter-pill ${audienceTab === 'customer' ? 'active' : ''}`}
                onClick={() => setAudienceTab('customer')}
              >
                <i className="bi bi-person"></i>
                Khách du lịch
                <span className={`badge rounded-pill ms-1 ${audienceTab === 'customer' ? 'bg-white text-primary' : 'bg-light text-secondary border'}`}>
                  {announcements.filter((a) => a.audience === 'all' || a.audience === 'customer').length}
                </span>
              </button>
              <button
                type="button"
                className={`announcement-filter-pill ${audienceTab === 'tourProvider' ? 'active' : ''}`}
                onClick={() => setAudienceTab('tourProvider')}
              >
                <i className="bi bi-building"></i>
                Nhà cung cấp tour
                <span className={`badge rounded-pill ms-1 ${audienceTab === 'tourProvider' ? 'bg-white text-primary' : 'bg-light text-secondary border'}`}>
                  {announcements.filter((a) => a.audience === 'all' || a.audience === 'tourProvider').length}
                </span>
              </button>
            </div>

            <div className="small text-muted fw-semibold d-flex align-items-center gap-2">
              <i className="bi bi-shield-check text-primary fs-5"></i>
              {loading ? (
                <span>Đang tải dữ liệu...</span>
              ) : (
                <span>
                  Hiển thị <strong>{displayedAnnouncements.length}</strong> / <strong>{total}</strong> thông báo chính thức
                </span>
              )}
            </div>
          </div>

          {error && (
            <div className="alert alert-danger d-flex align-items-center mb-4 shadow-sm" role="alert">
              <i className="bi bi-exclamation-triangle-fill fs-5 me-2 flex-shrink-0"></i>
              <div>{error}</div>
            </div>
          )}

          {loading ? (
            <div className="text-center py-5 my-5">
              <div className="spinner-border text-primary" style={{ width: '3rem', height: '3rem' }} role="status">
                <span className="visually-hidden">Đang tải...</span>
              </div>
              <div className="text-muted mt-3 fw-semibold">Đang tải danh sách thông báo hệ thống...</div>
            </div>
          ) : displayedAnnouncements.length === 0 ? (
            <section className="card border-0 shadow-sm text-center py-5 px-4 rounded-4 my-4">
              <div
                className="bg-primary bg-opacity-10 text-primary rounded-circle d-inline-flex align-items-center justify-content-center mx-auto mb-3"
                style={{ width: '80px', height: '80px' }}
              >
                <i className="bi bi-megaphone fs-1"></i>
              </div>
              <h2 className="h4 fw-bold text-dark mb-2">Chưa có thông báo phù hợp</h2>
              <p className="text-muted mb-4" style={{ maxWidth: '480px', margin: '0 auto' }}>
                {appliedSearch
                  ? `Không tìm thấy thông báo nào chứa từ khóa "${appliedSearch}". Thử tìm kiếm với cụm từ khác.`
                  : 'Hiện tại chưa có thông báo nào mới trong danh mục này. Hãy quay lại sau nhé!'}
              </p>
              {appliedSearch && (
                <div>
                  <button
                    type="button"
                    className="btn btn-outline-primary px-4 py-2 rounded-3"
                    onClick={handleClearSearch}
                  >
                    <i className="bi bi-arrow-counterclockwise me-2"></i>Xem tất cả thông báo
                  </button>
                </div>
              )}
            </section>
          ) : (
            <>
              {/* Display First / Latest announcement as a Hero Featured Announcement Banner */}
              {(() => {
                const featuredAnnouncement = displayedAnnouncements[0];
                const otherAnnouncements = displayedAnnouncements.slice(1);
                const featuredAudience = getAnnouncementAudience(featuredAnnouncement.audience);

                return (
                  <div className="mb-4">
                    {/* Featured Hero Banner */}
                    <article className={`announcement-featured-card mb-4 ${featuredAudience.theme || 'theme-all'}`}>
                      {/* Top Meta Bar */}
                      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3 pb-2 border-bottom border-light">
                        <div className="d-flex flex-wrap align-items-center gap-2">
                          <span className="announcement-featured-tag">
                            <i className="bi bi-broadcast"></i>
                            Thông báo mới nhất
                          </span>
                          <span className={`management-badge ${featuredAudience.className}`}>
                            <i className={`bi ${featuredAudience.icon} me-1`}></i>
                            {featuredAudience.label}
                          </span>
                        </div>
                        <div className="text-muted small d-flex align-items-center font-monospace gap-2">
                          <i className="bi bi-calendar3 text-primary"></i>
                          <span>{formatAnnouncementDateTime(featuredAnnouncement.createdAt)}</span>
                        </div>
                      </div>

                      {/* Hero Body */}
                      <div className="d-flex align-items-start gap-3 mb-3">
                        <div
                          className="announcement-icon-avatar d-none d-sm-flex"
                          style={{
                            backgroundColor: featuredAudience.iconBg || '#eff6ff',
                            color: featuredAudience.iconColor || '#2563eb'
                          }}
                        >
                          <i className={`bi ${featuredAudience.iconClass || 'bi-megaphone-fill'}`}></i>
                        </div>
                        <div className="flex-grow-1">
                          <h2 className="announcement-featured-title">
                            <Link to={`/announcements/${featuredAnnouncement._id}`} className="text-decoration-none text-dark">
                              {featuredAnnouncement.title}
                            </Link>
                          </h2>
                          <p className="announcement-featured-text">
                            {featuredAnnouncement.content}
                          </p>
                        </div>
                      </div>

                      {/* Hero Footer */}
                      <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 pt-3 border-top border-light">
                        <div className="d-flex align-items-center gap-2 text-muted small">
                          <i className="bi bi-shield-fill-check text-primary fs-5"></i>
                          <div>
                            <span className="fw-semibold text-dark">
                              {featuredAnnouncement.createdBy?.username || 'Ban Quản Trị Hệ Thống'}
                            </span>
                            <span className="text-muted ms-1.5">• Phát hành chính thức</span>
                          </div>
                        </div>
                        <Link
                          to={`/announcements/${featuredAnnouncement._id}`}
                          className="btn btn-primary px-4 py-2 rounded-pill fw-semibold shadow-sm d-inline-flex align-items-center gap-2"
                        >
                          <span>Xem chi tiết bài viết</span>
                          <i className="bi bi-arrow-right"></i>
                        </Link>
                      </div>
                    </article>

                    {/* Other Announcements Section (when there are 2 or more) */}
                    {otherAnnouncements.length > 0 && (
                      <div className="mt-5">
                        <div className="d-flex align-items-center justify-content-between mb-4">
                          <h2 className="h5 fw-bold text-dark mb-0 d-flex align-items-center gap-2">
                            <i className="bi bi-collection text-primary"></i>
                            Các thông báo khác ({otherAnnouncements.length})
                          </h2>
                        </div>

                        <div className="row g-4">
                          {otherAnnouncements.map((announcement) => {
                            const audience = getAnnouncementAudience(announcement.audience);
                            return (
                              <div className="col-12 col-md-6 col-lg-4" key={announcement._id}>
                                <article className={`announcement-card h-100 ${audience.theme || 'theme-all'}`}>
                                  <div className="announcement-card-body">
                                    {/* Icon & Meta Header */}
                                    <div className="d-flex align-items-center justify-content-between gap-2 mb-3">
                                      <div
                                        className="announcement-card-icon-box"
                                        style={{
                                          backgroundColor: audience.iconBg || '#eff6ff',
                                          color: audience.iconColor || '#2563eb'
                                        }}
                                      >
                                        <i className={`bi ${audience.iconClass || 'bi-megaphone-fill'}`}></i>
                                      </div>
                                      <span className="small text-muted font-monospace d-flex align-items-center gap-2">
                                        <i className="bi bi-calendar3 text-primary"></i>
                                        <span>{formatAnnouncementDateTime(announcement.createdAt)}</span>
                                      </span>
                                    </div>

                                    {/* Audience pill */}
                                    <div className="mb-2">
                                      <span className={`management-badge ${audience.className}`}>
                                        <i className={`bi ${audience.icon} me-1`}></i>
                                        {audience.label}
                                      </span>
                                    </div>

                                    {/* Title */}
                                    <h3 className="announcement-card-title h5">
                                      <Link to={`/announcements/${announcement._id}`} className="text-decoration-none text-dark">
                                        {announcement.title}
                                      </Link>
                                    </h3>

                                    {/* Content Snippet */}
                                    <p className="announcement-card-content">
                                      {announcement.content}
                                    </p>
                                  </div>

                                  {/* Card Footer */}
                                  <div className="announcement-card-footer">
                                    <div className="small text-muted d-flex align-items-center gap-1.5">
                                      <i className="bi bi-patch-check-fill text-primary"></i>
                                      <span className="text-truncate fw-medium" style={{ maxWidth: '140px' }}>
                                        {announcement.createdBy?.username || 'TripMate'}
                                      </span>
                                    </div>
                                    <Link
                                      to={`/announcements/${announcement._id}`}
                                      className="btn btn-outline-primary btn-sm px-3 rounded-pill fw-semibold d-inline-flex align-items-center gap-1"
                                    >
                                      <span>Chi tiết</span>
                                      <i className="bi bi-arrow-right"></i>
                                    </Link>
                                  </div>
                                </article>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Pagination */}
              {!loading && totalPages > 1 && (
                <nav className="d-flex justify-content-center mt-5" aria-label="Phân trang thông báo">
                  <ul className="pagination pagination-md shadow-sm mb-0">
                    <li className={`page-item ${currentPage <= 1 ? 'disabled' : ''}`}>
                      <button
                        type="button"
                        className="page-link"
                        disabled={currentPage <= 1}
                        onClick={() => setCurrentPage((page) => page - 1)}
                      >
                        <i className="bi bi-chevron-left me-1"></i>Trước
                      </button>
                    </li>
                    {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNum) => (
                      <li
                        key={pageNum}
                        className={`page-item ${currentPage === pageNum ? 'active' : ''}`}
                      >
                        <button
                          type="button"
                          className="page-link"
                          onClick={() => setCurrentPage(pageNum)}
                        >
                          {pageNum}
                        </button>
                      </li>
                    ))}
                    <li className={`page-item ${currentPage >= totalPages ? 'disabled' : ''}`}>
                      <button
                        type="button"
                        className="page-link"
                        disabled={currentPage >= totalPages}
                        onClick={() => setCurrentPage((page) => page + 1)}
                      >
                        Sau<i className="bi bi-chevron-right ms-1"></i>
                      </button>
                    </li>
                  </ul>
                </nav>
              )}
            </>
          )}
        </div>
      </main>

      <Footer />
    </>
  );
}
