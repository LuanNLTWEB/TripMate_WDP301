import { useEffect, useState, useCallback } from 'react';
import { notificationApi } from '../services/api';
import CreateNotificationModal from '../components/CreateNotificationModal';
import ManagementPagination from '../components/management/ManagementPagination';

export default function StaffNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const fetchNotifications = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await notificationApi.getAll({
        page: currentPage,
        limit: 10,
        status: statusFilter,
        type: typeFilter
      });
      setNotifications(response.notifications || []);
      setTotal(response.total || 0);
      setTotalPages(response.totalPages || 1);
      setUnreadCount(response.unreadCount || 0);
    } catch (err) {
      setError(err.message || 'Không thể tải danh sách thông báo');
      setNotifications([]);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, statusFilter, typeFilter]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
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
                Gửi thông báo tới người dùng và theo dõi thông báo trong hệ thống
              </p>
            </div>
            <button
              type="button"
              className="btn btn-primary d-inline-flex align-items-center gap-2"
              onClick={() => setIsCreateModalOpen(true)}
            >
              <i className="bi bi-bell-fill"></i>
              <span>Tạo thông báo mới</span>
            </button>
          </div>

          {/* Filter Card */}
          <div className="card shadow-sm border-0 mb-4">
            <div className="card-body p-3">
              <div className="row g-2 align-items-center">
                <div className="col-12 col-md-auto">
                  <div className="btn-group" role="group">
                    <button
                      type="button"
                      className={`btn btn-sm ${statusFilter === 'all' ? 'btn-primary' : 'btn-outline-secondary'}`}
                      onClick={() => { setStatusFilter('all'); setCurrentPage(1); }}
                    >
                      Tất cả
                    </button>
                    <button
                      type="button"
                      className={`btn btn-sm ${statusFilter === 'unread' ? 'btn-primary' : 'btn-outline-secondary'}`}
                      onClick={() => { setStatusFilter('unread'); setCurrentPage(1); }}
                    >
                      Chưa đọc {unreadCount > 0 && `(${unreadCount})`}
                    </button>
                    <button
                      type="button"
                      className={`btn btn-sm ${statusFilter === 'read' ? 'btn-primary' : 'btn-outline-secondary'}`}
                      onClick={() => { setStatusFilter('read'); setCurrentPage(1); }}
                    >
                      Đã đọc
                    </button>
                  </div>
                </div>

                <div className="col-12 col-md-auto ms-md-auto">
                  <select
                    className="form-select form-select-sm"
                    value={typeFilter}
                    onChange={(e) => { setTypeFilter(e.target.value); setCurrentPage(1); }}
                  >
                    <option value="all">Tất cả loại thông báo</option>
                    <option value="system">Thông báo hệ thống</option>
                    <option value="itinerary_invite">Lời mời lịch trình</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {error && (
            <div className="alert alert-danger alert-dismissible fade show" role="alert">
              {error}
              <button type="button" className="btn-close" onClick={() => setError('')} aria-label="Đóng"></button>
            </div>
          )}

          {/* Table */}
          <div className="card shadow-sm border-0">
            <div className="card-body p-3 p-md-4">
              <div className="table-responsive">
                <table className="table align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th style={{ width: '40px' }}>#</th>
                      <th>Tiêu đề & Nội dung</th>
                      <th>Loại</th>
                      <th>Người gửi</th>
                      <th>Trạng thái</th>
                      <th>Thời gian</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading ? (
                      <tr>
                        <td colSpan="6" className="text-center py-5">
                          <span className="spinner-border spinner-border-sm me-2"></span>
                          Đang tải thông báo...
                        </td>
                      </tr>
                    ) : notifications.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="text-center text-muted py-5">
                          Chưa có thông báo nào.
                        </td>
                      </tr>
                    ) : (
                      notifications.map((item, index) => (
                        <tr key={item._id} className={!item.isRead ? 'table-light fw-medium' : ''}>
                          <td className="text-muted small">{(currentPage - 1) * 10 + index + 1}</td>
                          <td>
                            <div className="fw-semibold text-dark">{item.title}</div>
                            <div className="text-muted small text-truncate" style={{ maxWidth: '400px' }}>
                              {item.message}
                            </div>
                          </td>
                          <td>
                            <span className={`badge ${item.notificationType === 'system' ? 'bg-primary' : 'bg-info text-dark'}`}>
                              {item.notificationType === 'system' ? 'Hệ thống' : item.notificationType}
                            </span>
                          </td>
                          <td className="small">
                            {item.sender?.username || item.invitedBy?.username || 'Hệ thống'}
                          </td>
                          <td>
                            <span className={`badge ${item.isRead ? 'bg-secondary' : 'bg-success'}`}>
                              {item.isRead ? 'Đã đọc' : 'Chưa đọc'}
                            </span>
                          </td>
                          <td className="small text-muted">{formatDate(item.createdAt)}</td>
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

      {/* Create Notification Modal */}
      <CreateNotificationModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => fetchNotifications()}
      />
    </>
  );
}
