import { useEffect, useState } from 'react';
import CustomSelect from '../components/CustomSelect';
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
        toast.error(err.message || 'Không thể tải danh sách thông báo');
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
      <div className="management-page-section">
        <div>
          {/* Header */}
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
            <div>
              <div className="d-flex flex-wrap align-items-center gap-2 mb-1">
                <h1 className="fw-bold mb-1 display-6">Hộp thư thông báo</h1>
                {unreadCount > 0 && (
                  <>
                    <span className="badge bg-danger rounded-pill px-2 py-1">
                      {unreadCount} chưa đọc
                    </span>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-primary rounded-pill d-inline-flex align-items-center gap-1 ms-2"
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
              <div className="row g-3 align-items-center justify-content-between">
                <div className="col-12 col-md-auto">
                  <div className="d-flex flex-wrap gap-1 p-1 bg-light rounded-3 border">
                    <button
                      type="button"
                      className={`btn btn-sm rounded-2 px-3 fw-medium ${statusFilter === 'all' ? 'btn-primary shadow-sm' : 'btn-light text-muted border-0'}`}
                      onClick={() => { setStatusFilter('all'); setCurrentPage(1); }}
                    >
                      Tất cả
                    </button>
                    <button
                      type="button"
                      className={`btn btn-sm rounded-2 px-3 fw-medium d-inline-flex align-items-center gap-1.5 ${statusFilter === 'unread' ? 'btn-primary shadow-sm' : 'btn-light text-muted border-0'}`}
                      onClick={() => { setStatusFilter('unread'); setCurrentPage(1); }}
                    >
                      <span>Chưa đọc</span>
                      {unreadCount > 0 && (
                        <span className={`badge rounded-pill ${statusFilter === 'unread' ? 'bg-white text-primary' : 'bg-danger text-white'}`} style={{ fontSize: '0.72rem' }}>
                          {unreadCount}
                        </span>
                      )}
                    </button>
                    <button
                      type="button"
                      className={`btn btn-sm rounded-2 px-3 fw-medium ${statusFilter === 'read' ? 'btn-primary shadow-sm' : 'btn-light text-muted border-0'}`}
                      onClick={() => { setStatusFilter('read'); setCurrentPage(1); }}
                    >
                      Đã đọc
                    </button>
                  </div>
                </div>

                <div className="col-12 col-md-auto ms-md-auto">
                  <div className="d-flex align-items-center gap-2">
                    <label htmlFor="filter-type" className="small text-muted text-nowrap fw-medium d-flex align-items-center gap-1">
                      <i className="bi bi-funnel text-primary"></i>
                      <span>Loại:</span>
                    </label>
                    <CustomSelect
                      id="filter-type"
                      value={typeFilter}
                      options={typeFilterOptions}
                      onChange={(e, val) => {
                        setTypeFilter(val ?? e.target.value);
                        setCurrentPage(1);
                      }}
                      style={{ width: '230px' }}
                      triggerStyle={{ height: '38px', borderRadius: '10px', fontSize: '0.88rem' }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

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
                      !item.isRead ? 'border-start border-4 border-primary' : 'border border-light-subtle'
                    }`}
                    style={{
                      backgroundColor: !item.isRead ? '#f8faff' : '#ffffff'
                    }}
                  >
                    <div className="card-body p-3 p-md-4">
                      <div className="d-flex align-items-start gap-3">
                        <div
                          className="rounded-3 d-flex align-items-center justify-content-center flex-shrink-0 mt-0.5 shadow-sm"
                          style={{
                            width: '46px',
                            height: '46px',
                            backgroundColor: !item.isRead ? 'rgba(37, 99, 235, 0.12)' : 'rgba(100, 116, 139, 0.08)'
                          }}
                        >
                          <i className={`bi ${typeMeta.iconClass} fs-5`}></i>
                        </div>

                        <div className="flex-grow-1">
                          <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-1.5">
                            <h6 className={`mb-0 ${!item.isRead ? 'fw-bold text-dark' : 'fw-semibold text-secondary'}`}>
                              {item.title}
                            </h6>
                            <div className="d-flex align-items-center gap-2">
                              <span className={`badge ${typeMeta.badgeClass}`}>
                                {typeMeta.label}
                              </span>
                              {!item.isRead && (
                                <span className="badge bg-danger rounded-pill px-2 py-0.5" style={{ fontSize: '10px' }}>
                                  Mới
                                </span>
                              )}
                            </div>
                          </div>

                          <p className="text-secondary small mb-3" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                            {item.message}
                          </p>

                          <div className="d-flex flex-wrap align-items-center justify-content-between text-muted small pt-2 border-top border-light gap-2">
                            <div className="d-flex flex-wrap align-items-center gap-3">
                              <span>
                                {item.sender?.username ? (
                                  <>
                                    <i className="bi bi-person-fill me-1 text-primary"></i>
                                    Gửi bởi: <strong>{item.sender.username}</strong>
                                    {item.sender.role === 'staff' && ' (Nhân viên TripMate)'}
                                    {item.sender.role === 'tourProvider' && ' (Nhà cung cấp tour)'}
                                  </>
                                ) : item.invitedBy?.username ? (
                                  <>
                                    <i className="bi bi-person-fill me-1 text-info"></i>
                                    Lời mời từ: <strong>{item.invitedBy.username}</strong>
                                  </>
                                ) : (
                                  <>
                                    <i className="bi bi-shield-check me-1 text-success"></i>
                                    Hệ thống TripMate
                                  </>
                                )}
                              </span>
                              <span className="font-monospace">
                                <i className="bi bi-clock me-1 text-muted"></i>
                                {formatNotificationDateTime(item.createdAt)}
                              </span>
                            </div>

                            {!item.isRead && (
                              <div className="d-flex align-items-center gap-2 ms-auto">
                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline-primary rounded-pill px-3 py-1 d-inline-flex align-items-center gap-1.5 shadow-sm"
                                  style={{ fontSize: '0.8rem' }}
                                  onClick={() => handleMarkAsRead(item._id)}
                                  disabled={actionLoadingId === item._id || isMarkingAll}
                                  title="Đánh dấu đã đọc"
                                >
                                  {actionLoadingId === item._id ? (
                                    <>
                                      <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                                      <span>Đang xử lý...</span>
                                    </>
                                  ) : (
                                    <>
                                      <i className="bi bi-check2"></i>
                                      <span>Đánh dấu đã đọc</span>
                                    </>
                                  )}
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
            <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 pt-3 border-top mt-4">
              <div className="small text-muted fw-medium">
                Hiển thị <strong>{notifications.length}</strong> / <strong>{total}</strong> thông báo · Trang <strong>{currentPage}</strong> / {totalPages}
              </div>
              <nav aria-label="Phân trang thông báo">
                <ul className="pagination pagination-sm mb-0 shadow-sm">
                  <li className={`page-item ${currentPage <= 1 ? 'disabled' : ''}`}>
                    <button
                      type="button"
                      className="page-link"
                      disabled={currentPage <= 1}
                      onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                    >
                      <i className="bi bi-chevron-left me-1"></i>Trước
                    </button>
                  </li>
                  {Array.from({ length: totalPages }, (_, index) => index + 1)
                    .filter((pageNum) => (
                      pageNum === 1 ||
                      pageNum === totalPages ||
                      Math.abs(pageNum - currentPage) <= 1
                    ))
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
                      onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                    >
                      Sau<i className="bi bi-chevron-right ms-1"></i>
                    </button>
                  </li>
                </ul>
              </nav>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
