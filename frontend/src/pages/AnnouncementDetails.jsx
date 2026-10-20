import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { announcementApi } from '../services/api';
import {
  formatAnnouncementDateTime,
  getAnnouncementAudience
} from '../utils/announcementFormatters';

export default function AnnouncementDetails() {
  const { id } = useParams();
  const [announcement, setAnnouncement] = useState(null);
  const [recentAnnouncements, setRecentAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;

    const fetchDetail = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await announcementApi.getById(id);
        if (!active) return;
        setAnnouncement(response.data);

        // Fetch other announcements for the sidebar
        try {
          const recentResponse = await announcementApi.getAll({ limit: 5 });
          if (!active) return;
          const others = (recentResponse.data || []).filter((item) => item._id !== id);
          setRecentAnnouncements(others.slice(0, 4));
        } catch {
          // Ignore secondary fetch failure
        }
      } catch (err) {
        if (!active) return;
        setError(err.message || 'Không thể tải thông tin bài viết thông báo.');
      } finally {
        if (active) setLoading(false);
      }
    };

    if (id) {
      fetchDetail();
      window.scrollTo(0, 0);
    }

    return () => {
      active = false;
    };
  }, [id]);

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const audience = announcement ? getAnnouncementAudience(announcement.audience) : null;

  return (
    <>
      <Navbar />

      <main className="bg-light min-vh-100 py-4 py-lg-5">
        <div className="container">
          {/* Top Breadcrumb & Action Bar */}
          <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
            <nav aria-label="breadcrumb">
              <ol className="breadcrumb mb-0 small">
                <li className="breadcrumb-item">
                  <Link to="/announcements" className="text-decoration-none text-muted">
                    Thông báo hệ thống
                  </Link>
                </li>
                <li className="breadcrumb-item active text-primary fw-semibold" aria-current="page">
                  Chi tiết bài viết
                </li>
              </ol>
            </nav>

            <button
              type="button"
              className="btn btn-sm btn-outline-primary rounded-pill px-3 py-1.5 fw-semibold d-inline-flex align-items-center gap-1.5"
              onClick={handleShare}
              title="Sao chép liên kết bài viết"
            >
              <i className={`bi ${copied ? 'bi-check-lg text-success' : 'bi-share'}`}></i>
              <span>{copied ? 'Đã sao chép liên kết!' : 'Chia sẻ'}</span>
            </button>
          </div>

          {loading ? (
            <div className="text-center py-5 my-5">
              <div className="spinner-border text-primary" style={{ width: '3rem', height: '3rem' }} role="status">
                <span className="visually-hidden">Đang tải...</span>
              </div>
              <div className="text-muted mt-3 fw-semibold">Đang tải chi tiết bài viết thông báo...</div>
            </div>
          ) : error || !announcement ? (
            <div className="card border-0 shadow-sm text-center py-5 px-4 rounded-4 my-4">
              <div
                className="bg-danger bg-opacity-10 text-danger rounded-circle d-inline-flex align-items-center justify-content-center mx-auto mb-3"
                style={{ width: '80px', height: '80px' }}
              >
                <i className="bi bi-exclamation-triangle fs-1"></i>
              </div>
              <h1 className="h4 fw-bold text-dark mb-2">Không tìm thấy bài viết thông báo</h1>
              <p className="text-muted mb-4" style={{ maxWidth: '480px', margin: '0 auto' }}>
                {error || 'Bài viết thông báo này không tồn tại hoặc bạn không có quyền xem nội dung này.'}
              </p>
              <div>
                <Link to="/announcements" className="btn btn-primary px-4 py-2 rounded-pill fw-semibold">
                  <i className="bi bi-arrow-left me-2"></i>Quay lại trang thông báo
                </Link>
              </div>
            </div>
          ) : (
            <div className="row g-4">
              {/* Left Column: Main Article Card (col-lg-8) */}
              <div className="col-lg-8">
                <article className="announcement-article-card">
                  {/* Category & Status Pill Bar */}
                  <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3 pb-2 border-bottom border-light">
                    <div className="d-flex flex-wrap align-items-center gap-2">
                      <span className={`management-badge ${audience.className}`}>
                        <i className={`bi ${audience.icon} me-1`}></i>
                        {audience.label}
                      </span>
                      <span className="announcement-featured-tag">
                        <i className="bi bi-shield-check me-1"></i>
                        Thông báo chính thức
                      </span>
                    </div>

                    <div className="text-muted small font-monospace d-flex align-items-center gap-2">
                      <i className="bi bi-calendar3 text-primary"></i>
                      <span>{formatAnnouncementDateTime(announcement.createdAt)}</span>
                    </div>
                  </div>

                  {/* Article Title */}
                  <h1 className="announcement-article-title">
                    {announcement.title}
                  </h1>

                  {/* Author / Publisher Information Row */}
                  <div className="d-flex align-items-center gap-3 py-3 mb-4 border-bottom border-light">
                    <div
                      className="announcement-icon-avatar"
                      style={{
                        backgroundColor: audience.iconBg || '#eff6ff',
                        color: audience.iconColor || '#2563eb',
                        width: '46px',
                        height: '46px',
                        fontSize: '1.3rem'
                      }}
                    >
                      <i className={`bi ${audience.iconClass || 'bi-megaphone-fill'}`}></i>
                    </div>

                    <div className="flex-grow-1">
                      <div className="fw-bold text-dark d-flex align-items-center gap-1.5">
                        <span>{announcement.createdBy?.username || 'Ban Quản Trị Hệ Thống'}</span>
                        <i className="bi bi-patch-check-fill text-primary" title="Xác thực chính thức"></i>
                      </div>
                      <div className="text-muted small">
                        <span>Phát hành chính thức bởi Ban điều hành TripMate</span>
                        {announcement.updatedAt && announcement.updatedAt !== announcement.createdAt && (
                          <span className="text-secondary ms-2">
                            • Đã sửa: {formatAnnouncementDateTime(announcement.updatedAt)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Main Article Content */}
                  <div className="announcement-article-content">
                    {announcement.content}
                  </div>

                  {/* Official Bottom Platform Signature */}
                  <div className="mt-5 pt-4 border-top border-light">
                    <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 bg-light rounded-3 p-3">
                      <div className="d-flex align-items-center gap-2 text-muted small">
                        <i className="bi bi-shield-fill-check text-primary fs-5"></i>
                        <span>
                          Văn bản thông báo có giá trị áp dụng trên toàn bộ hệ thống <strong>TripMate Việt Nam</strong>.
                        </span>
                      </div>

                      <div className="text-muted small">
                        Hỗ trợ CSKH: <a href="mailto:support@tripmate.vn" className="text-primary text-decoration-none fw-semibold">support@tripmate.vn</a>
                      </div>
                    </div>
                  </div>
                </article>
              </div>

              {/* Right Column: Informative Sidebar Widgets (col-lg-4) */}
              <div className="col-lg-4">
                <aside className="d-flex flex-column gap-4">
                  {/* Widget 1: Publication Overview */}
                  <div className="announcement-sidebar-card">
                    <h2 className="h6 fw-bold text-dark mb-3 pb-2 border-bottom d-flex align-items-center gap-2">
                      <i className="bi bi-info-circle text-primary"></i>
                      Thông tin bài viết
                    </h2>

                    <ul className="list-unstyled mb-0 d-flex flex-column gap-3 small">
                      <li className="d-flex justify-content-between align-items-center">
                        <span className="text-muted">Đối tượng:</span>
                        <span className={`management-badge ${audience.className}`}>
                          <i className={`bi ${audience.icon} me-1`}></i>
                          {audience.label}
                        </span>
                      </li>
                      <li className="d-flex justify-content-between align-items-center">
                        <span className="text-muted">Ban hành bởi:</span>
                        <span className="fw-semibold text-dark d-flex align-items-center gap-1">
                          <span>{announcement.createdBy?.username || 'TripMate'}</span>
                          <i className="bi bi-patch-check-fill text-primary small"></i>
                        </span>
                      </li>
                      <li className="d-flex justify-content-between align-items-center">
                        <span className="text-muted">Ngày ban hành:</span>
                        <span className="fw-semibold text-dark font-monospace">
                          {formatAnnouncementDateTime(announcement.createdAt)}
                        </span>
                      </li>
                      <li className="d-flex justify-content-between align-items-center">
                        <span className="text-muted">Trạng thái:</span>
                        <span className="badge bg-success bg-opacity-10 text-success border border-success-subtle px-2.5 py-1 rounded-pill fw-semibold">
                          <i className="bi bi-check-circle-fill me-1"></i>Đang hiệu lực
                        </span>
                      </li>
                    </ul>
                  </div>

                  {/* Widget 2: Recent Other Announcements */}
                  {recentAnnouncements.length > 0 && (
                    <div className="announcement-sidebar-card">
                      <div className="d-flex align-items-center justify-content-between mb-3 pb-2 border-bottom">
                        <h2 className="h6 fw-bold text-dark mb-0 d-flex align-items-center gap-2">
                          <i className="bi bi-clock-history text-primary"></i>
                          Thông báo khác gần đây
                        </h2>
                        <Link to="/announcements" className="text-primary small text-decoration-none fw-semibold">
                          Xem tất cả <i className="bi bi-chevron-right"></i>
                        </Link>
                      </div>

                      <div className="d-flex flex-column gap-2">
                        {recentAnnouncements.map((item) => {
                          const itemAudience = getAnnouncementAudience(item.audience);
                          return (
                            <Link
                              key={item._id}
                              to={`/announcements/${item._id}`}
                              className="announcement-sidebar-item"
                            >
                              <div className="d-flex align-items-center justify-content-between gap-1 mb-1">
                                <span className={`management-badge ${itemAudience.className}`} style={{ fontSize: '0.72rem', padding: '1px 7px' }}>
                                  {itemAudience.label}
                                </span>
                                <span className="text-muted font-monospace" style={{ fontSize: '0.72rem' }}>
                                  {formatAnnouncementDateTime(item.createdAt)}
                                </span>
                              </div>
                              <h3 className="announcement-sidebar-item-title mb-0">
                                {item.title}
                              </h3>
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Widget 3: Support Contact Card */}
                  <div className="announcement-sidebar-card">
                    <div className="d-flex align-items-start gap-3">
                      <div
                        className="rounded-3 bg-primary bg-opacity-10 text-primary d-flex align-items-center justify-content-center flex-shrink-0"
                        style={{ width: '42px', height: '42px', fontSize: '1.25rem' }}
                      >
                        <i className="bi bi-headset"></i>
                      </div>
                      <div>
                        <h2 className="h6 fw-bold text-dark mb-1">Trung tâm hỗ trợ</h2>
                        <p className="text-muted small mb-2">
                          Nếu bạn có bất kỳ câu hỏi nào cần giải đáp về chính sách hoặc dịch vụ, vui lòng liên hệ chúng tôi:
                        </p>
                        <div className="small fw-semibold text-dark mb-1 d-flex align-items-center gap-2">
                          <i className="bi bi-telephone-fill text-primary"></i>
                          <span>Hotline: 1900 1234 (24/7)</span>
                        </div>
                        <div className="small fw-semibold text-dark d-flex align-items-center gap-2">
                          <i className="bi bi-envelope-fill text-primary"></i>
                          <span>support@tripmate.vn</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </aside>
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </>
  );
}
