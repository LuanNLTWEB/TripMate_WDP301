import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AnnouncementFormModal from '../components/AnnouncementFormModal';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal';
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

  // Modals state
  const [formModalState, setFormModalState] = useState({ open: false, announcement: null });
  const [announcementToDelete, setAnnouncementToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
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

  const handleClearSearch = () => {
    setSearchInput('');
    setAppliedSearch('');
    setCurrentPage(1);
  };

  const handleFilterChange = (setter) => (event, selectedValue) => {
    setter(selectedValue ?? event.target.value);
    setCurrentPage(1);
  };

  const openCreateModal = () => {
    setFormError('');
    setFormModalState({ open: true, announcement: null });
  };

  const openEditModal = (announcement) => {
    setFormError('');
    setFormModalState({ open: true, announcement });
  };

  const closeFormModal = () => {
    if (!saving) {
      setFormModalState({ open: false, announcement: null });
    }
  };

  const handleFormSubmit = async (payload) => {
    setSaving(true);
    setFormError('');
    const isEditing = Boolean(formModalState.announcement?._id);

    try {
      if (isEditing) {
        const response = await announcementApi.update(formModalState.announcement._id, payload);
        toast.success(response.message || 'Cập nhật thông báo hệ thống thành công.');
      } else {
        const response = await announcementApi.create(payload);
        toast.success(response.message || 'Đã tạo thông báo hệ thống.');
      }

      setFormModalState({ open: false, announcement: null });
      if (!isEditing) {
        setCurrentPage(1);
      }
      setReloadKey((value) => value + 1);
    } catch (requestError) {
      setFormError(requestError.message || 'Không thể lưu thông báo hệ thống.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!announcementToDelete) return;
    setIsDeleting(true);

    try {
      const response = await announcementApi.delete(announcementToDelete._id);
      toast.success(response.message || 'Đã xóa thông báo hệ thống thành công.');

      if (announcements.length === 1 && currentPage > 1) {
        setCurrentPage((page) => page - 1);
      }
      setAnnouncementToDelete(null);
      setReloadKey((value) => value + 1);
    } catch (requestError) {
      toast.error(requestError.message || 'Không thể xóa thông báo hệ thống.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <section className="management-page-section">
      {/* Page Header */}
      <div className="management-page-heading d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
        <div>
          <span className="management-page-kicker">System Announcements</span>
          <h1>Quản lý thông báo hệ thống</h1>
          <p>Tạo, cập nhật và phát hành thông báo chính thức tới khách hàng và đối tác du lịch TripMate.</p>
        </div>
        <button
          type="button"
          className="btn btn-primary d-inline-flex align-items-center gap-2 shadow-sm flex-shrink-0"
          onClick={openCreateModal}
        >
          <i className="bi bi-plus-lg fs-6"></i>
          <span className="fw-semibold">Tạo thông báo mới</span>
        </button>
      </div>

      {/* Metrics Row */}
      <div className="row g-3 mb-4">
        <div className="col-12 col-sm-6 col-xl-3">
          <div className="announcement-stat-card">
            <div className="announcement-stat-icon bg-primary bg-opacity-10 text-primary">
              <i className="bi bi-megaphone-fill"></i>
            </div>
            <div>
              <div className="small text-muted fw-semibold">Tổng thông báo</div>
              <div className="h4 fw-bold text-dark mb-0">{total}</div>
            </div>
          </div>
        </div>

        <div className="col-12 col-sm-6 col-xl-3">
          <div className="announcement-stat-card">
            <div className="announcement-stat-icon bg-success bg-opacity-10 text-success">
              <i className="bi bi-broadcast"></i>
            </div>
            <div>
              <div className="small text-muted fw-semibold">Đang phát hành</div>
              <div className="h4 fw-bold text-success mb-0">
                {statusFilter === 'active' ? total : announcements.filter((a) => a.isActive).length}
                <small className="fs-6 fw-normal text-muted ms-1">/ trang</small>
              </div>
            </div>
          </div>
        </div>

        <div className="col-12 col-sm-6 col-xl-3">
          <div className="announcement-stat-card">
            <div className="announcement-stat-icon bg-secondary bg-opacity-10 text-secondary">
              <i className="bi bi-file-earmark-text-fill"></i>
            </div>
            <div>
              <div className="small text-muted fw-semibold">Bản nháp</div>
              <div className="h4 fw-bold text-secondary mb-0">
                {statusFilter === 'draft' ? total : announcements.filter((a) => !a.isActive).length}
                <small className="fs-6 fw-normal text-muted ms-1">/ trang</small>
              </div>
            </div>
          </div>
        </div>

        <div className="col-12 col-sm-6 col-xl-3">
          <div className="announcement-stat-card">
            <div className="announcement-stat-icon bg-info bg-opacity-10 text-info">
              <i className="bi bi-people-fill"></i>
            </div>
            <div>
              <div className="small text-muted fw-semibold">Đối tượng lọc</div>
              <div className="fw-bold text-dark mb-0 text-truncate" style={{ maxWidth: '140px' }}>
                {AUDIENCE_FILTER_OPTIONS.find((o) => o.value === audienceFilter)?.label || 'Tất cả'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger d-flex align-items-center mb-4 shadow-sm" role="alert">
          <i className="bi bi-exclamation-triangle-fill fs-5 me-2 flex-shrink-0"></i>
          <div>{error}</div>
        </div>
      )}

      {/* Main Table Card */}
      <div className="management-table-card">
        {/* Toolbar */}
        <div className="management-table-toolbar flex-wrap gap-3">
          <form className="management-search-box" onSubmit={handleSearch}>
            <i className="bi bi-search"></i>
            <input
              type="search"
              value={searchInput}
              maxLength={100}
              placeholder="Tìm theo tiêu đề hoặc nội dung thông báo..."
              aria-label="Tìm kiếm thông báo"
              onChange={(event) => setSearchInput(event.target.value)}
            />
            {searchInput && (
              <button
                type="button"
                className="btn btn-link position-absolute end-0 top-50 translate-middle-y text-muted text-decoration-none me-2 p-0 border-0"
                onClick={handleClearSearch}
                title="Xóa tìm kiếm"
              >
                <i className="bi bi-x-circle-fill"></i>
              </button>
            )}
          </form>

          <div className="d-flex flex-wrap gap-2 ms-lg-auto align-items-center">
            <CustomSelect
              id="announcement-status-filter"
              value={statusFilter}
              options={STATUS_OPTIONS}
              onChange={handleFilterChange(setStatusFilter)}
              style={{ width: '190px' }}
              triggerStyle={{ height: '40px', fontSize: '0.88rem' }}
            />
            <CustomSelect
              id="announcement-audience-filter"
              value={audienceFilter}
              options={AUDIENCE_FILTER_OPTIONS}
              onChange={handleFilterChange(setAudienceFilter)}
              style={{ width: '200px' }}
              triggerStyle={{ height: '40px', fontSize: '0.88rem' }}
            />
          </div>
        </div>

        {/* Table Content */}
        <div className="table-responsive">
          <table className="management-table">
            <thead>
              <tr>
                <th className="ps-4" style={{ width: '42%' }}>Thông báo</th>
                <th style={{ width: '16%' }}>Đối tượng nhận</th>
                <th style={{ width: '14%' }}>Trạng thái</th>
                <th style={{ width: '16%' }}>Cập nhật lần cuối</th>
                <th className="text-end pe-4" style={{ width: '12%' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="5" className="text-center py-5">
                    <div className="spinner-border spinner-border-sm text-primary me-2" role="status"></div>
                    <span className="text-muted">Đang tải danh sách thông báo...</span>
                  </td>
                </tr>
              ) : announcements.length === 0 ? (
                <tr>
                  <td colSpan="5">
                    <div className="management-empty-state">
                      <div className="management-empty-icon">
                        <i className="bi bi-megaphone fs-2"></i>
                      </div>
                      <h6 className="fw-bold text-dark mb-1">Không tìm thấy thông báo phù hợp</h6>
                      <p className="small text-muted mb-3">
                        {appliedSearch || statusFilter !== 'all' || audienceFilter !== 'all'
                          ? 'Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm của bạn.'
                          : 'Hiện chưa có thông báo nào trong hệ thống.'}
                      </p>
                      {(appliedSearch || statusFilter !== 'all' || audienceFilter !== 'all') && (
                        <button
                          type="button"
                          className="btn btn-outline-secondary btn-sm"
                          onClick={() => {
                            setSearchInput('');
                            setAppliedSearch('');
                            setStatusFilter('all');
                            setAudienceFilter('all');
                            setCurrentPage(1);
                          }}
                        >
                          <i className="bi bi-arrow-counterclockwise me-1"></i>Đặt lại bộ lọc
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                announcements.map((announcement) => {
                  const audience = getAnnouncementAudience(announcement.audience);
                  const status = getAnnouncementStatus(announcement.isActive);
                  return (
                    <tr key={announcement._id}>
                      <td className="ps-4">
                        <div className="fw-bold text-dark mb-1 text-truncate" style={{ maxWidth: '420px' }}>
                          {announcement.title}
                        </div>
                        <div className="small text-muted text-truncate" style={{ maxWidth: '440px' }}>
                          {announcement.content}
                        </div>
                      </td>
                      <td>
                        <span className={`management-badge ${audience.className}`}>
                          <i className={`bi ${audience.icon} me-1`}></i>
                          {audience.label}
                        </span>
                      </td>
                      <td>
                        <span className={`management-badge ${status.className}`}>
                          <span className="management-badge-dot"></span>
                          {status.label}
                        </span>
                      </td>
                      <td>
                        <div className="small text-dark font-monospace">
                          <i className="bi bi-clock me-1 text-muted"></i>
                          {formatAnnouncementDateTime(announcement.updatedAt || announcement.createdAt)}
                        </div>
                        {announcement.updatedBy?.username && (
                          <div className="text-muted" style={{ fontSize: '0.78rem' }}>
                            bởi {announcement.updatedBy.username}
                          </div>
                        )}
                      </td>
                      <td className="text-end pe-4">
                        <div className="management-actions justify-content-end">
                          <Link
                            to={`/management/announcements/${announcement._id}`}
                            className="management-action-btn btn-view"
                            title="Xem chi tiết thông báo"
                            aria-label={`Xem chi tiết thông báo ${announcement.title}`}
                          >
                            <i className="bi bi-eye"></i>
                          </Link>
                          <button
                            type="button"
                            className="management-action-btn btn-edit"
                            onClick={() => openEditModal(announcement)}
                            title="Chỉnh sửa thông báo"
                            aria-label={`Chỉnh sửa thông báo ${announcement.title}`}
                          >
                            <i className="bi bi-pencil"></i>
                          </button>
                          <button
                            type="button"
                            className="management-action-btn btn-delete"
                            onClick={() => setAnnouncementToDelete(announcement)}
                            title="Xóa thông báo"
                            aria-label={`Xóa thông báo ${announcement.title}`}
                          >
                            <i className="bi bi-trash"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {!loading && total > 0 && (
          <div className="management-pagination-bar">
            <div className="text-muted small">
              Hiển thị <strong>{announcements.length}</strong> / <strong>{total}</strong> thông báo · Trang <strong>{currentPage}</strong> / {Math.max(totalPages, 1)}
            </div>
            {totalPages > 1 && (
              <nav aria-label="Phân trang quản lý thông báo">
                <ul className="pagination pagination-sm mb-0">
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
                  {Array.from({ length: totalPages }, (_, index) => index + 1)
                    .filter((pageNum) => {
                      return (
                        pageNum === 1 ||
                        pageNum === totalPages ||
                        Math.abs(pageNum - currentPage) <= 1
                      );
                    })
                    .map((pageNum, index, arr) => {
                      const prev = arr[index - 1];
                      const hasGap = prev && pageNum - prev > 1;
                      return (
                        <span key={pageNum} className="d-inline-flex">
                          {hasGap && <li className="page-item disabled"><span className="page-link">…</span></li>}
                          <li className={`page-item ${currentPage === pageNum ? 'active' : ''}`}>
                            <button
                              type="button"
                              className="page-link"
                              onClick={() => setCurrentPage(pageNum)}
                            >
                              {pageNum}
                            </button>
                          </li>
                        </span>
                      );
                    })}
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
          </div>
        )}
      </div>


      {/* Create / Edit Form Modal */}
      {formModalState.open && (
        <AnnouncementFormModal
          key={formModalState.announcement?._id || 'new-announcement'}
          announcement={formModalState.announcement}
          saving={saving}
          requestError={formError}
          onClose={closeFormModal}
          onSubmit={handleFormSubmit}
        />
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={Boolean(announcementToDelete)}
        title="Xác nhận xóa thông báo"
        message={
          <>
            Bạn có chắc chắn muốn xóa vĩnh viễn thông báo{' '}
            <strong>"{announcementToDelete?.title}"</strong>?
            <div className="small text-muted mt-2">
              Hành động này sẽ gỡ bỏ hoàn toàn thông báo khỏi hệ thống và không thể hoàn tác.
            </div>
          </>
        }
        confirmText="Xóa thông báo"
        cancelText="Hủy"
        loading={isDeleting}
        onConfirm={handleDeleteConfirm}
        onClose={() => !isDeleting && setAnnouncementToDelete(null)}
      />
    </section>
  );
}
