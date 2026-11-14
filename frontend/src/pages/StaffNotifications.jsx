import { useEffect, useState } from 'react';
import { notificationApi } from '../services/api';
import { useToast } from '../hooks/useToast';
import CreateNotificationModal from '../components/CreateNotificationModal';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal';
import CustomSelect from '../components/CustomSelect';
import ManagementPagination from '../components/management/ManagementPagination';
import {
  NOTIFICATION_TARGET_OPTIONS,
  formatNotificationDateTime,
  getNotificationTargetMeta
} from '../utils/notificationFormatters';

export default function StaffNotifications() {
  const toast = useToast();
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [targetFilter, setTargetFilter] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [reloadKey, setReloadKey] = useState(0);

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingNotification, setEditingNotification] = useState(null);
  const [notificationToDelete, setNotificationToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Debounce search keyword
  useEffect(() => {
    const trimmed = search.trim();
    if (trimmed === debouncedSearch) return;
    const timer = setTimeout(() => {
      setDebouncedSearch(trimmed);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search, debouncedSearch]);

  useEffect(() => {
    let active = true;

    const loadManagedNotifications = async () => {
      setIsLoading(true);
      setError('');
      try {
        const response = await notificationApi.getManaged({
          page: currentPage,
          limit: 10,
          targetType: targetFilter,
          search: debouncedSearch
        });
        if (!active) return;
        setNotifications(response.notifications || []);
        setTotal(response.total || 0);
        setTotalPages(response.totalPages || 1);
      } catch (err) {
        if (!active) return;
        toast.error(err.message || 'Không thể tải danh sách thông báo quản lý');
        setNotifications([]);
        setTotal(0);
        setTotalPages(1);
      } finally {
        if (active) setIsLoading(false);
      }
    };

    loadManagedNotifications();
    return () => {
      active = false;
    };
  }, [currentPage, targetFilter, debouncedSearch, reloadKey]);

  const openCreateModal = () => {
    setEditingNotification(null);
    setIsCreateModalOpen(true);
  };

  const openEditModal = (notification) => {
    setEditingNotification(notification);
    setIsCreateModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!notificationToDelete) return;
    setIsDeleting(true);
    try {
      const response = await notificationApi.delete(notificationToDelete._id);
      toast.success(response.message || 'Đã xóa thông báo thành công');
      setNotificationToDelete(null);
      if (notifications.length === 1 && currentPage > 1) {
        setCurrentPage((page) => page - 1);
      } else {
        setReloadKey((value) => value + 1);
      }
    } catch (err) {
      toast.error(err.message || 'Không thể xóa thông báo');
    } finally {
      setIsDeleting(false);
    }
  };

  const renderTargetBadge = (item) => {
    const meta = getNotificationTargetMeta(item.targetType);
    if (item.targetType === 'specific_user') {
      const displayTarget = item.targetEmail || item.recipient?.email || meta.shortLabel;
      return (
        <span
          className={`badge ${meta.badgeClass} px-2 py-1 text-truncate d-inline-block`}
          style={{ maxWidth: '200px' }}
          title={displayTarget}
        >
          <i className={`bi ${meta.icon} me-1`}></i>
          {displayTarget}
        </span>
      );
    }

    return (
      <span className={`badge ${meta.badgeClass} px-2 py-1`}>
        <i className={`bi ${meta.icon} me-1`}></i> {meta.shortLabel}
      </span>
    );
  };

  return (
    <>
      <section className="management-page-section">
        <div className="container-fluid px-0">
          {/* Header */}
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
            <div>
              <h1 className="h3 fw-bold mb-1">Quản lý thông báo</h1>
              <p className="text-muted small mb-0">
                Quản lý các thông báo do nhân viên phát hành và gửi tới người dùng trong hệ thống
              </p>
            </div>
            <button
              type="button"
              className="btn btn-primary d-inline-flex align-items-center gap-2"
              onClick={openCreateModal}
            >
              <i className="bi bi-bell-fill"></i>
              <span>Tạo thông báo mới</span>
            </button>
          </div>

          {/* Filter Bar */}
          <div className="card shadow-sm border-0 mb-4">
            <div className="card-body p-3">
              <div className="row g-2 align-items-center">
                <div className="col-12 col-md-5">
                  <div className="management-search-box" style={{ maxWidth: '100%' }}>
                    <i className="bi bi-search"></i>
                    <input
                      type="search"
                      placeholder="Tìm theo tiêu đề, nội dung hoặc email..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                </div>

                <div className="col-12 col-md-4 ms-md-auto">
                  <div className="d-flex align-items-center gap-2">
                    <label htmlFor="filter-target" className="small text-muted text-nowrap">
                      Đối tượng:
                    </label>
                    <CustomSelect
                      id="filter-target"
                      value={targetFilter}
                      options={[
                        { value: '', label: 'Tất cả đối tượng nhận' },
                        ...NOTIFICATION_TARGET_OPTIONS.map((option) => ({
                          value: option.value,
                          label: option.filterLabel
                        }))
                      ]}
                      onChange={(e, val) => {
                        setTargetFilter(val !== undefined ? val : e.target.value);
                        setCurrentPage(1);
                      }}
                      placeholder="Tất cả đối tượng nhận"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="card shadow-sm border-0">
            <div className="card-body p-3 p-md-4">
              <div className="table-responsive">
                <table className="table align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th style={{ width: '40px' }}>#</th>
                      <th>Tiêu đề & Nội dung</th>
                      <th>Đối tượng nhận</th>
                      <th>Người tạo</th>
                      <th>Thời gian gửi</th>
                      <th className="text-end" style={{ width: '120px' }}>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading ? (
                      <tr>
                        <td colSpan="6" className="text-center py-5">
                          <span className="spinner-border spinner-border-sm me-2"></span>
                          Đang tải danh sách thông báo...
                        </td>
                      </tr>
                    ) : notifications.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="text-center text-muted py-5">
                          <div className="py-3">
                            <i className="bi bi-bell-slash fs-2 text-muted d-block mb-2"></i>
                            Chưa có thông báo nào do nhân viên phát hành.
                          </div>
                        </td>
                      </tr>
                    ) : (
                      notifications.map((item, index) => (
                        <tr key={item._id || item.batchId}>
                          <td className="text-muted small">{(currentPage - 1) * 10 + index + 1}</td>
                          <td>
                            <div className="fw-semibold text-dark">{item.title}</div>
                            <div className="text-muted small text-truncate" style={{ maxWidth: '420px' }}>
                              {item.message}
                            </div>
                          </td>
                          <td>
                            <div className="d-flex flex-column align-items-start gap-1">
                              {renderTargetBadge(item)}
                              {item.recipientCount > 1 && (
                                <span className="text-muted" style={{ fontSize: '0.75rem' }}>
                                  ({item.recipientCount} người nhận)
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="small">
                            {item.sender?.username ? (
                              <span className="fw-medium text-dark">{item.sender.username}</span>
                            ) : (
                              <span className="text-muted">Nhân viên</span>
                            )}
                          </td>
                          <td className="small text-muted">{formatNotificationDateTime(item.createdAt)}</td>
                          <td className="text-end">
                            <div className="d-flex justify-content-end gap-1">
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-primary p-1 px-2"
                                onClick={() => openEditModal(item)}
                                disabled={isDeleting}
                                title="Chỉnh sửa thông báo"
                              >
                                <i className="bi bi-pencil"></i>
                              </button>
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-danger p-1 px-2"
                                onClick={() => setNotificationToDelete(item)}
                                disabled={isDeleting}
                                title="Xóa thông báo"
                              >
                                <i className="bi bi-trash"></i>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <ManagementPagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={total}
                itemLabel="thông báo"
                isLoading={isLoading}
                onPageChange={(page) => setCurrentPage(page)}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Create / Edit Notification Modal */}
      {isCreateModalOpen && (
        <CreateNotificationModal
          key={editingNotification?._id || 'create-notification'}
          isOpen={isCreateModalOpen}
          notification={editingNotification}
          onClose={() => {
            setIsCreateModalOpen(false);
            setEditingNotification(null);
          }}
          onSuccess={() => {
            if (!editingNotification) {
              setCurrentPage(1);
            }
            setReloadKey((value) => value + 1);
          }}
        />
      )}

      {/* Confirm Delete Modal */}
      <ConfirmDeleteModal
        isOpen={Boolean(notificationToDelete)}
        title="Xác nhận xóa thông báo"
        message={
          <>
            Bạn có chắc muốn xóa thông báo <strong>"{notificationToDelete?.title}"</strong>? Thông báo này sẽ bị thu hồi khỏi hộp thư người nhận.
          </>
        }
        confirmText="Xóa thông báo"
        loading={isDeleting}
        onConfirm={handleDeleteConfirm}
        onClose={() => !isDeleting && setNotificationToDelete(null)}
      />
    </>
  );
}
