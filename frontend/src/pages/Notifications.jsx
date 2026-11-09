import { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { notificationApi } from '../services/api';
import {
  formatNotificationDateTime,
  getInboxTypeFilterOptions,
  getNotificationTypeMeta
} from '../utils/notificationFormatters';

export default function Notifications() {
  const { user } = useAuth();
  const toast = useToast();
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [reloadKey, setReloadKey] = useState(0);

  // Read action states
  const [actionLoadingId, setActionLoadingId] = useState('');
  const [isMarkingAll, setIsMarkingAll] = useState(false);

  const typeFilterOptions = getInboxTypeFilterOptions(user?.role);

  useEffect(() => {
    let active = true;

    const loadNotifications = async () => {
      setIsLoading(true);
      setError('');
      try {
        const response = await notificationApi.getAll({
          page: currentPage,
          limit: 10,
          status: statusFilter,
          type: typeFilter
        });
        if (!active) return;
        setNotifications(response.notifications || []);
        setTotal(response.total || 0);
        setTotalPages(response.totalPages || 1);
        setUnreadCount(response.unreadCount || 0);
      } catch (err) {
        if (!active) return;
        setError(err.message || 'Không thể tải danh sách thông báo');
        setNotifications([]);
        setTotal(0);
        setTotalPages(1);
      } finally {
        if (active) setIsLoading(false);
      }
    };

    loadNotifications();
    return () => {
      active = false;
    };
  }, [currentPage, statusFilter, typeFilter, reloadKey]);

  const handleMarkAsRead = async (id) => {
    setActionLoadingId(id);
    try {
      const response = await notificationApi.markAsRead(id);
      toast.success(response.message || 'Đã đánh dấu thông báo là đã đọc');
      setReloadKey((value) => value + 1);
    } catch (err) {
      toast.error(err.message || 'Không thể đánh dấu thông báo là đã đọc');
    } finally {
      setActionLoadingId('');
    }
  };

  const handleMarkAllAsRead = async () => {
    setIsMarkingAll(true);
    try {
      const response = await notificationApi.markAllAsRead();
      toast.success(response.message || 'Đã đánh dấu tất cả thông báo là đã đọc');
      setReloadKey((value) => value + 1);
    } catch (err) {
      toast.error(err.message || 'Không thể đánh dấu tất cả thông báo là đã đọc');
    } finally {
      setIsMarkingAll(false);
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
              <div className="d-flex flex-wrap align-items-center gap-2 mb-1">
                <h1 className="h3 fw-bold mb-0">Hộp thư thông báo</h1>
                {unreadCount > 0 && (
                  <>
                    <span className="badge bg-danger rounded-pill px-2 py-1">
                      {unreadCount} chưa đọc
                    </span>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-primary d-inline-flex align-items-center gap-1 ms-2"
                      onClick={handleMarkAllAsRead}
                      disabled={isMarkingAll}
                      title="Đánh dấu tất cả thông báo là đã đọc"
                    >
                      <i className="bi bi-check2-all"></i>
                      <span>Đánh dấu tất cả đã đọc</span>
                    </button>
                  </>
                )}
              </div>
              <p className="text-muted small mb-0">
                Xem toàn bộ thông báo hệ thống và tương tác gửi tới tài khoản của bạn
              </p>
            </div>
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
                      {typeFilterOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
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
              {notifications.map((item) => {
                const typeMeta = getNotificationTypeMeta(item.notificationType);
                return (
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
                          <i className={`bi ${typeMeta.iconClass} fs-5`}></i>
                        </div>

                        <div className="flex-grow-1">
                          <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-1">
                            <h6 className={`mb-0 ${!item.isRead ? 'fw-bold text-dark' : 'fw-semibold text-secondary'}`}>
                              {item.title}
                            </h6>
                            <div className="d-flex align-items-center gap-2">
                              <span className={`badge ${typeMeta.badgeClass}`}>
                                {typeMeta.label}
                              </span>
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

                          <div className="d-flex flex-wrap align-items-center justify-content-between text-muted small pt-2 border-top border-light gap-2">
                            <div className="d-flex flex-wrap align-items-center gap-3">
                              <span>
                                {item.sender?.username ? (
                                  <>
                                    <i className="bi bi-person-fill me-1"></i>
                                    Gửi bởi: <strong>{item.sender.username}</strong>
                                    {item.sender.role === 'staff' && ' (Nhân viên TripMate)'}
                                    {item.sender.role === 'tourProvider' && ' (Nhà cung cấp tour)'}
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
                                {formatNotificationDateTime(item.createdAt)}
                              </span>
                            </div>

                            {!item.isRead && (
                              <div className="d-flex align-items-center gap-2 ms-auto">
                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline-primary py-0 px-2 d-inline-flex align-items-center gap-1"
                                  style={{ fontSize: '0.78rem', height: '26px' }}
                                  onClick={() => handleMarkAsRead(item._id)}
                                  disabled={actionLoadingId === item._id || isMarkingAll}
                                  title="Đánh dấu đã đọc"
                                >
                                  <i className="bi bi-check2"></i>
                                  <span>Đánh dấu đã đọc</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
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
    </>
  );
}
