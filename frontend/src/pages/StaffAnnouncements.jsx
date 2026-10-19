import { useEffect, useState } from 'react';
import AnnouncementDetailModal from '../components/AnnouncementDetailModal';
import AnnouncementFormModal from '../components/AnnouncementFormModal';
import CustomSelect from '../components/CustomSelect';
import { useToast } from '../hooks/useToast';
import { announcementApi } from '../services/api';
import {
  ANNOUNCEMENT_AUDIENCE_OPTIONS,
  formatAnnouncementDateTime,
  getAnnouncementAudience,
  getAnnouncementStatus
} from '../utils/announcementFormatters';

const STATUS_OPTIONS = [
  { value: 'all', label: 'Tất cả trạng thái', icon: 'bi-collection' },
  { value: 'active', label: 'Đang phát hành', icon: 'bi-broadcast' },
  { value: 'draft', label: 'Bản nháp', icon: 'bi-file-earmark' }
];

const AUDIENCE_FILTER_OPTIONS = [
  { value: 'all', label: 'Tất cả đối tượng', icon: 'bi-people' },
  ...ANNOUNCEMENT_AUDIENCE_OPTIONS.filter((option) => option.value !== 'all')
];

export default function StaffAnnouncements() {
  const toast = useToast();
  const [announcements, setAnnouncements] = useState([]);
  const [searchInput, setSearchInput] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [audienceFilter, setAudienceFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;

    const loadAnnouncements = async () => {
      setLoading(true);
      try {
        const response = await announcementApi.getManaged({
          search: appliedSearch,
          status: statusFilter,
          audience: audienceFilter,
          page: currentPage,
          limit: 10
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
        setError(requestError.message || 'Không thể tải danh sách thông báo.');
      } finally {
        if (active) setLoading(false);
      }
    };

    loadAnnouncements();
    return () => {
      active = false;
    };
  }, [appliedSearch, audienceFilter, currentPage, reloadKey, statusFilter]);

  const handleSearch = (event) => {
    event.preventDefault();
    setCurrentPage(1);
    setAppliedSearch(searchInput.trim());
  };

  const handleFilterChange = (setter) => (event, selectedValue) => {
    setter(selectedValue ?? event.target.value);
    setCurrentPage(1);
  };

  const handleCreate = async (payload) => {
    setSaving(true);
    setFormError('');
    try {
      const response = await announcementApi.create(payload);
      toast.success(response.message || 'Đã tạo thông báo hệ thống.');
      setShowCreateModal(false);
      setCurrentPage(1);
      setReloadKey((value) => value + 1);
    } catch (requestError) {
      setFormError(requestError.message || 'Không thể tạo thông báo hệ thống.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="management-page-section">
      <div className="management-page-heading d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
        <div>
          <span className="management-page-kicker">System Announcements</span>
          <h1>Quản lý thông báo hệ thống</h1>
          <p>Theo dõi các thông báo được phát hành tới khách hàng và nhà cung cấp tour.</p>
        </div>
        <button type="button" className="btn btn-primary flex-shrink-0" onClick={() => {
          setFormError('');
          setShowCreateModal(true);
        }}>
          <i className="bi bi-plus-circle me-2"></i>Tạo thông báo
        </button>
      </div>

      {error && <div className="alert alert-danger"><i className="bi bi-exclamation-triangle-fill me-2"></i>{error}</div>}

      <div className="management-table-card">
        <div className="management-table-toolbar flex-wrap gap-3">
          <form className="management-search" onSubmit={handleSearch}>
            <i className="bi bi-search"></i>
            <input
              type="search"
              value={searchInput}
              maxLength={100}
              placeholder="Tìm tiêu đề hoặc nội dung..."
              aria-label="Tìm kiếm thông báo"
              onChange={(event) => setSearchInput(event.target.value)}
            />
            <button type="submit" className="btn btn-primary btn-sm" disabled={loading}>Tìm</button>
          </form>
          <div className="d-flex flex-wrap gap-2 ms-lg-auto">
            <CustomSelect
              id="announcement-status-filter"
              value={statusFilter}
              options={STATUS_OPTIONS}
              onChange={handleFilterChange(setStatusFilter)}
              style={{ width: '190px' }}
              triggerStyle={{ height: '38px', fontSize: '0.86rem' }}
            />
            <CustomSelect
              id="announcement-audience-filter"
              value={audienceFilter}
              options={AUDIENCE_FILTER_OPTIONS}
              onChange={handleFilterChange(setAudienceFilter)}
              style={{ width: '200px' }}
              triggerStyle={{ height: '38px', fontSize: '0.86rem' }}
            />
          </div>
        </div>

        <div className="table-responsive">
          <table className="table align-middle mb-0">
            <thead>
              <tr>
                <th className="ps-4">Thông báo</th>
                <th>Đối tượng</th>
                <th>Trạng thái</th>
                <th>Cập nhật</th>
                <th className="text-end pe-4">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="5" className="text-center py-5"><span className="spinner-border spinner-border-sm text-primary me-2"></span>Đang tải thông báo...</td></tr>
              ) : announcements.length === 0 ? (
                <tr><td colSpan="5" className="text-center py-5 text-muted"><i className="bi bi-megaphone fs-3 d-block mb-2"></i>Không tìm thấy thông báo phù hợp.</td></tr>
              ) : announcements.map((announcement) => {
                const audience = getAnnouncementAudience(announcement.audience);
                const status = getAnnouncementStatus(announcement.isActive);
                return (
                  <tr key={announcement._id}>
                    <td className="ps-4" style={{ minWidth: 280 }}>
                      <div className="fw-semibold text-dark">{announcement.title}</div>
                      <div className="small text-muted text-truncate" style={{ maxWidth: 420 }}>{announcement.content}</div>
                    </td>
                    <td><span className={`management-badge ${audience.className}`}><i className={`bi ${audience.icon} me-1`}></i>{audience.label}</span></td>
                    <td><span className={`management-badge ${status.className}`}><span className="management-badge-dot"></span>{status.label}</span></td>
                    <td className="small text-muted text-nowrap">{formatAnnouncementDateTime(announcement.updatedAt || announcement.createdAt)}</td>
                    <td className="text-end pe-4">
                      <button type="button" className="btn btn-sm btn-outline-info" onClick={() => setSelectedAnnouncement(announcement)} title="Xem chi tiết">
                        <i className="bi bi-eye"></i>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {!loading && (
          <div className="management-pagination-bar">
            <div>Trang <strong>{currentPage}</strong>/{Math.max(totalPages, 1)} · Tổng <strong>{total}</strong> thông báo</div>
            {totalPages > 1 && (
              <nav aria-label="Phân trang quản lý thông báo">
                <ul className="pagination pagination-sm mb-0">
                  <li className={`page-item ${currentPage <= 1 ? 'disabled' : ''}`}>
                    <button type="button" className="page-link" disabled={currentPage <= 1} onClick={() => setCurrentPage((page) => page - 1)}>Trước</button>
                  </li>
                  <li className={`page-item ${currentPage >= totalPages ? 'disabled' : ''}`}>
                    <button type="button" className="page-link" disabled={currentPage >= totalPages} onClick={() => setCurrentPage((page) => page + 1)}>Sau</button>
                  </li>
                </ul>
              </nav>
            )}
          </div>
        )}
      </div>

      <AnnouncementDetailModal announcement={selectedAnnouncement} onClose={() => setSelectedAnnouncement(null)} showStatus />
      {showCreateModal && (
        <AnnouncementFormModal
          key="create-announcement"
          saving={saving}
          requestError={formError}
          onClose={() => !saving && setShowCreateModal(false)}
          onSubmit={handleCreate}
        />
      )}
    </section>
  );
}
