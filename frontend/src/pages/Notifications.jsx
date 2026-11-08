import { useEffect, useState, useCallback } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { useAuth } from '../hooks/useAuth';
import { notificationApi } from '../services/api';
import CreateNotificationModal from '../components/CreateNotificationModal';

export default function Notifications() {
  const { user } = useAuth();
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
    const date = new Date(dateString);
    return date.toLocaleString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'itinerary_invite':
        return <i className="bi bi-envelope-paper-fill fs-5 text-info"></i>;
      case 'itinerary_leave':
        return <i className="bi bi-box-arrow-right fs-5 text-warning"></i>;
      case 'itinerary_transfer':
        return <i className="bi bi-arrow-left-right fs-5 text-success"></i>;
      case 'system':
      default:
        return <i className="bi bi-bell-fill fs-5 text-primary"></i>;
    }
  };

  const getTypeBadge = (type) => {
    switch (type) {
      case 'itinerary_invite':
        return <span className="badge bg-info bg-opacity-10 text-info border border-info border-opacity-25">Lời mời lịch trình</span>;
      case 'itinerary_leave':
        return <span className="badge bg-warning bg-opacity-10 text-warning border border-warning border-opacity-25">Cộng tác</span>;
      case 'itinerary_transfer':
        return <span className="badge bg-success bg-opacity-10 text-success border border-success border-opacity-25">Chuyển quyền</span>;
      case 'system':
      default:
        return <span className="badge bg-primary bg-opacity-10 text-primary border border-primary border-opacity-25">Hệ thống</span>;
    }
  };

  return (
    <>
      <Navbar />
      <main className="py-5 bg-light flex-grow-1" style={{ minHeight: 'calc(100vh - 160px)' }}>
        <div className="container">
          {/* Header */}
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
            <div>
              <div className="d-flex align-items-center gap-2 mb-1">
                <h1 className="h3 fw-bold mb-0">Hộp thư thông báo</h1>
                {unreadCount > 0 && (
                  <span className="badge bg-danger rounded-pill px-2 py-1">
                    {unreadCount} chưa đọc
                  </span>
                )}
              </div>
              <p className="text-muted small mb-0">
                Xem toàn bộ thông báo hệ thống và tương tác gửi tới tài khoản của bạn
              </p>
            </div>

            {user?.role === 'staff' && (
              <button
                type="button"
                className="btn btn-primary d-inline-flex align-items-center gap-2 align-self-start align-self-md-auto"
                onClick={() => setIsCreateModalOpen(true)}
              >
                <i className="bi bi-plus-lg"></i>
                <span>Tạo thông báo mới</span>
              </button>
            )}
          </div>

          {/* Filter Bar */}
          <div className="card shadow-sm border-0 rounded-4 mb-4">
            <div className="card-body p-3">
              <div className="row g-2 align-items-center">
                <div className="col-12 col-md-auto">
                  <div className="btn-group w-100" role="group">
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
                  <div className="d-flex align-items-center gap-2">
                    <label htmlFor="filter-type" className="small text-muted text-nowrap">Loại:</label>
                    <select
                      id="filter-type"
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
          </div>

          {/* Error Message */}
          {error && (
            <div className="alert alert-danger d-flex align-items-center gap-2 mb-4" role="alert">
              <i className="bi bi-exclamation-triangle-fill"></i>
              <div>{error}</div>
            </div>
          )}

          {/* Notifications List */}
          {isLoading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary mb-3" role="status">
                <span className="visually-hidden">Đang tải...</span>
              </div>
              <p className="text-muted small">Đang tải danh sách thông báo...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="card shadow-sm border-0 rounded-4 text-center py-5">
              <div className="card-body p-5">
                <div className="bg-light text-muted d-inline-flex p-3 rounded-circle mb-3">
                  <i className="bi bi-bell-slash fs-1"></i>
                </div>
                <h5 className="fw-semibold">Chưa có thông báo nào</h5>
                <p className="text-muted small mb-0">
                  {statusFilter === 'unread'
                    ? 'Bạn không có thông báo chưa đọc nào.'
                    : 'Hiện tại bạn chưa nhận được thông báo mới nào từ hệ thống.'}
                </p>
              </div>
            </div>
          ) : (
            <div className="d-flex flex-column gap-3 mb-4">
              {notifications.map((item) => (
                <div
                  key={item._id}
                  className={`card shadow-sm border-0 rounded-4 transition-all ${
                    !item.isRead ? 'border-start border-4 border-primary' : ''
                  }`}
                  style={{
                    backgroundColor: !item.isRead ? '#f8faff' : '#ffffff'
                  }}
                >
                  <div className="card-body p-3 p-md-4">
                    <div className="d-flex align-items-start gap-3">
                      <div className="p-2 bg-white shadow-sm rounded-circle d-flex align-items-center justify-content-center flex-shrink-0" style={{ width: '44px', height: '44px' }}>
                        {getNotificationIcon(item.notificationType)}
                      </div>

                      <div className="flex-grow-1">
                        <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-1">
                          <h6 className={`mb-0 ${!item.isRead ? 'fw-bold text-dark' : 'fw-semibold text-secondary'}`}>
                            {item.title}
                          </h6>
                          <div className="d-flex align-items-center gap-2">
                            {getTypeBadge(item.notificationType)}
                            {!item.isRead && (
                              <span className="badge bg-primary rounded-pill small" style={{ fontSize: '10px' }}>
                                Mới
                              </span>
                            )}
                          </div>
                        </div>

                        <p className="text-secondary small mb-2" style={{ whiteSpace: 'pre-wrap' }}>
                          {item.message}
                        </p>

                        <div className="d-flex flex-wrap align-items-center justify-content-between text-muted small pt-2 border-top border-light">
                          <span>
                            {item.sender?.username ? (
                              <>
                                <i className="bi bi-person-fill me-1"></i>
                                Gửi bởi: <strong>{item.sender.username}</strong>
                                {item.sender.role === 'staff' && ' (Nhân viên TripMate)'}
                              </>
                            ) : item.invitedBy?.username ? (
                              <>
                                <i className="bi bi-person-fill me-1"></i>
                                Lời mời từ: <strong>{item.invitedBy.username}</strong>
                              </>
                            ) : (
                              <>
                                <i className="bi bi-shield-check me-1"></i>
                                Hệ thống TripMate
                              </>
                            )}
                          </span>
                          <span>
                            <i className="bi bi-clock me-1"></i>
                            {formatDate(item.createdAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {!isLoading && totalPages > 1 && (
            <div className="d-flex justify-content-between align-items-center pt-3 border-top">
              <div className="small text-muted">
                Hiển thị {notifications.length} / {total} thông báo
              </div>
              <div className="btn-group">
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                >
                  <i className="bi bi-chevron-left me-1"></i> Trang trước
                </button>
                <button type="button" className="btn btn-sm btn-outline-secondary disabled">
                  {currentPage} / {totalPages}
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                >
                  Trang sau <i className="bi bi-chevron-right ms-1"></i>
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />

      {/* Staff Create Notification Modal */}
      {user?.role === 'staff' && (
        <CreateNotificationModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={() => fetchNotifications()}
        />
      )}
    </>
  );
}
