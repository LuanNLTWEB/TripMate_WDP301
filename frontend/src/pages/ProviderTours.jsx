import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { tourApi } from '../services/api';
import CustomSelect from '../components/CustomSelect';
import TourScheduleModal from './TourScheduleModal';
import EditTourPriceModal from './EditTourPriceModal';
import TourFormModal from './TourFormModal';

const formatCurrency = (value) => new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0
}).format(value || 0);

const getStatusBadge = (status) => {
  switch (status) {
    case 'active':
      return {
        label: 'Đang hoạt động',
        variant: 'badge-success'
      };
    case 'pending':
      return {
        label: 'Chờ kiểm duyệt',
        variant: 'badge-warning'
      };
    case 'needs_revision':
      return {
        label: 'Cần chỉnh sửa',
        variant: 'badge-info'
      };
    case 'rejected':
      return {
        label: 'Bị từ chối',
        variant: 'badge-danger'
      };
    case 'suspended':
      return {
        label: 'Tạm ngưng',
        variant: 'badge-secondary'
      };
    default:
      return {
        label: status,
        variant: 'badge-secondary'
      };
  }
};

export default function ProviderTours() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Modal state for Creating a Tour
  const [showCreateModal, setShowCreateModal] = useState(
    searchParams.get('action') === 'create' || searchParams.get('tab') === 'create'
  );

  // --- List State ---
  const [tours, setTours] = useState([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [listError, setListError] = useState('');
  const [selectedTourForSchedule, setSelectedTourForSchedule] = useState(null);
  const [selectedTourForPrice, setSelectedTourForPrice] = useState(null);
  const [selectedTourForEdit, setSelectedTourForEdit] = useState(null);

  // Load tours list
  const loadTours = async (searchTerm = search, selectedStatus = status, page = currentPage) => {
    setIsLoading(true);
    try {
      const response = await tourApi.getProviderTours({
        search: searchTerm,
        status: selectedStatus,
        page,
        limit: 10
      });
      setTours(response.data || []);
      setCurrentPage(response.currentPage || 1);
      setTotalPages(response.totalPages || 1);
      setListError('');
    } catch (requestError) {
      setListError(requestError.message || 'Không thể tải danh sách tour của bạn.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadTours(search, status, currentPage);
    }, 300);
    return () => clearTimeout(timer);
  }, [search, status, currentPage]);

  const handleFilterChange = (e) => {
    setStatus(e.target.value);
    setCurrentPage(1);
  };

  const handlePageChange = (page) => {
    if (page < 1 || page > totalPages || page === currentPage) return;
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCloseCreateModal = () => {
    setShowCreateModal(false);
    if (searchParams.get('action') || searchParams.get('tab')) {
      setSearchParams({});
    }
  };

  const handleCreated = async () => {
    setSearch('');
    setStatus('all');
    setCurrentPage(1);
    await loadTours('', 'all', 1);
  };

  return (
    <section className="management-page-section">
      {/* Page Heading & Nút Tạo Tour Mới */}
      <div className="management-page-heading d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
        <div>
          <span className="management-page-kicker">Tour Provider</span>
          <h1>Quản lý tour</h1>
          <p>Xem danh sách, quản lý và đăng tải các tour du lịch của bạn trên hệ thống.</p>
        </div>

        <button
          type="button"
          className="btn btn-primary d-inline-flex align-items-center gap-2"
          onClick={() => setShowCreateModal(true)}
        >
          <i className="bi bi-plus-circle"></i>
          <span>Tạo tour mới</span>
        </button>
      </div>

      {listError && (
        <div className="alert alert-danger alert-dismissible fade show" role="alert">
          {listError}
          <button type="button" className="btn-close" onClick={() => setListError('')} aria-label="Đóng"></button>
        </div>
      )}

      {/* Bảng danh sách tour chuẩn Staff UI */}
      <div className="management-table-card">
        <div className="management-table-toolbar">
          <div className="management-search-box">
            <i className="bi bi-search"></i>
            <input
              type="search"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Tìm theo tên tour, điểm đi hoặc điểm đến..."
              aria-label="Tìm kiếm tour"
            />
          </div>

          <div className="d-flex align-items-center gap-2">
            <label htmlFor="provider-status-filter" className="small text-muted fw-semibold mb-0 text-nowrap">
              <i className="bi bi-funnel me-1"></i>Trạng thái:
            </label>
            <CustomSelect
              id="provider-status-filter"
              style={{ width: '190px' }}
              triggerStyle={{ height: '36px', fontSize: '0.86rem' }}
              value={status}
              onChange={handleFilterChange}
              options={[
                { value: 'all', label: 'Tất cả trạng thái' },
                { value: 'active', label: 'Đang hoạt động', icon: 'bi bi-check-circle text-success' },
                { value: 'pending', label: 'Chờ kiểm duyệt', icon: 'bi bi-hourglass-split text-warning' },
                { value: 'needs_revision', label: 'Cần chỉnh sửa', icon: 'bi bi-pencil-square text-info' },
                { value: 'rejected', label: 'Bị từ chối', icon: 'bi bi-x-circle text-danger' },
                { value: 'suspended', label: 'Tạm ngưng', icon: 'bi bi-slash-circle text-secondary' }
              ]}
            />
          </div>
        </div>

        <div className="table-responsive">
          <table className="management-table">
            <thead>
              <tr>
                <th style={{ width: '30%' }}>Tour</th>
                <th style={{ width: '25%' }}>Hành trình</th>
                <th style={{ width: '18%' }}>Giá và chỗ</th>
                <th style={{ width: '15%' }}>Trạng thái</th>
                <th className="text-end" style={{ width: '12%' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan="5" className="text-center py-5 text-muted">
                    <div className="spinner-border spinner-border-sm text-primary me-2" role="status"></div>
                    Đang tải danh sách tour...
                  </td>
                </tr>
              ) : tours.length === 0 ? (
                <tr>
                  <td colSpan="5">
                    <div className="management-empty-state">
                      <div className="management-empty-icon">
                        <i className="bi bi-map fs-2"></i>
                      </div>
                      <h6 className="fw-bold text-dark mb-1">Không tìm thấy tour phù hợp</h6>
                      <p className="small text-muted mb-0">Thử tìm kiếm với từ khóa khác hoặc điều chỉnh bộ lọc trạng thái.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                tours.map((tour) => {
                  const badge = getStatusBadge(tour.status);

                  return (
                    <tr key={tour._id}>
                      <td>
                        <div className="d-flex align-items-center gap-3">
                          {tour.images?.[0] ? (
                            <img
                              src={tour.images[0]}
                              alt={tour.title}
                              className="management-table-thumb"
                            />
                          ) : (
                            <div className="management-table-thumb-empty">
                              <i className="bi bi-image"></i>
                            </div>
                          )}
                          <div>
                            <div className="fw-bold text-dark">{tour.title}</div>
                            <div className="small text-muted">
                              <i className="bi bi-clock me-1"></i>
                              {tour.duration}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td>
                        <div className="d-flex align-items-center gap-2 small">
                          <span className="text-dark fw-medium">{tour.departureLocation || 'Chưa cập nhật'}</span>
                          <i className="bi bi-arrow-right text-muted"></i>
                          <span className="text-primary fw-medium">{tour.destinationLocation || tour.location}</span>
                        </div>
                      </td>

                      <td>
                        <div className="fw-bold text-dark">{formatCurrency(tour.price)}</div>
                        <div className="small text-muted">
                          <i className="bi bi-people me-1"></i>
                          Còn {tour.availableSeats || 0} chỗ
                        </div>
                      </td>

                      <td>
                        <span className={`management-badge ${badge.variant}`}>
                          <span className="management-badge-dot"></span>
                          {badge.label}
                        </span>

                        {tour.status === 'needs_revision' && tour.revisionNote && (
                          <div className="small text-muted mt-1 text-truncate" style={{ maxWidth: '200px' }} title={tour.revisionNote}>
                            <i className="bi bi-info-circle me-1"></i>{tour.revisionNote}
                          </div>
                        )}

                        {tour.status === 'rejected' && tour.rejectionReason && (
                          <div className="small text-muted mt-1 text-truncate" style={{ maxWidth: '200px' }} title={tour.rejectionReason}>
                            <i className="bi bi-exclamation-circle me-1"></i>{tour.rejectionReason}
                          </div>
                        )}
                      </td>

                      <td className="text-end">
                        <div className="management-actions justify-content-end">
                          <button
                            type="button"
                            className="management-action-btn btn-edit"
                            title="Cập nhật thông tin tour"
                            aria-label={`Cập nhật ${tour.title}`}
                            onClick={() => setSelectedTourForEdit(tour)}
                          >
                            <i className="bi bi-pencil-square"></i>
                          </button>
                          <button
                            type="button"
                            className="management-action-btn text-primary border-0 bg-transparent px-2"
                            title="Xem lịch trình"
                            aria-label={`Xem lịch trình ${tour.title}`}
                            onClick={() => setSelectedTourForSchedule(tour)}
                          >
                            <i className="bi bi-calendar-week fs-5"></i>
                          </button>
                          <button
                            type="button"
                            className="management-action-btn text-success border-0 bg-transparent px-2"
                            title="Cập nhật giá"
                            aria-label={`Cập nhật giá ${tour.title}`}
                            onClick={() => setSelectedTourForPrice(tour)}
                          >
                            <i className="bi bi-tag fs-5"></i>
                          </button>
                          <Link
                            className="management-action-btn btn-view"
                            to={`/tours/${tour._id}`}
                            title="Xem chi tiết tour"
                            aria-label={`Xem ${tour.title}`}
                          >
                            <i className="bi bi-eye"></i>
                          </Link>
                          <Link
                            className="management-action-btn btn-edit"
                            to={`/management/my-tours/${tour._id}/details`}
                            title="Thiết lập chi tiết tour (Dịch vụ, chính sách)"
                            aria-label={`Thiết lập chi tiết ${tour.title}`}
                          >
                            <i className="bi bi-sliders"></i>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {!isLoading && totalPages > 1 && (
          <div className="management-pagination-bar">
            <div>
              Trang <strong>{currentPage}</strong> trên <strong>{totalPages}</strong>
            </div>
            <nav aria-label="Phân trang">
              <ul className="pagination pagination-sm mb-0">
                <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                  <button
                    className="page-link"
                    onClick={() => handlePageChange(Math.max(currentPage - 1, 1))}
                    disabled={currentPage === 1}
                  >
                    <i className="bi bi-chevron-left me-1"></i>Trước
                  </button>
                </li>
                {[...Array(totalPages)].map((_, idx) => (
                  <li key={idx} className={`page-item ${currentPage === idx + 1 ? 'active' : ''}`}>
                    <button
                      className="page-link"
                      onClick={() => handlePageChange(idx + 1)}
                    >
                      {idx + 1}
                    </button>
                  </li>
                ))}
                <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                  <button
                    className="page-link"
                    onClick={() => handlePageChange(Math.min(currentPage + 1, totalPages))}
                    disabled={currentPage === totalPages}
                  >
                    Sau<i className="bi bi-chevron-right ms-1"></i>
                  </button>
                </li>
              </ul>
            </nav>
          </div>
        )}
      </div>

      {showCreateModal && (
        <TourFormModal
          mode="create"
          onClose={handleCloseCreateModal}
          onSaved={handleCreated}
        />
      )}

      <TourScheduleModal
        open={Boolean(selectedTourForSchedule)}
        onClose={() => setSelectedTourForSchedule(null)}
        tour={selectedTourForSchedule}
        onUpdated={loadTours}
      />

      <EditTourPriceModal
        open={Boolean(selectedTourForPrice)}
        onClose={() => setSelectedTourForPrice(null)}
        tour={selectedTourForPrice}
        onUpdated={(newPrice) => {
          setTours((prev) =>
            prev.map((t) =>
              t._id === selectedTourForPrice?._id
                ? { ...t, price: newPrice }
                : t
            )
          );
        }}
      />

      {selectedTourForEdit && (
        <TourFormModal
          mode="update"
          tour={selectedTourForEdit}
          onClose={() => setSelectedTourForEdit(null)}
          onSaved={() => loadTours(search, status, currentPage)}
        />
      )}
    </section>
  );
}
