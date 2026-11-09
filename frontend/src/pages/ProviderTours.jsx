import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { tourApi } from '../services/api';
import CustomSelect from '../components/CustomSelect';
import ManagementPagination from '../components/management/ManagementPagination';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal';
import DuplicateTourModal from '../components/DuplicateTourModal';
import { useToast } from '../hooks/useToast';
import TourScheduleModal from './TourScheduleModal';
import EditTourPriceModal from './EditTourPriceModal';
import TourFormModal from './TourFormModal';

const formatCurrency = (value) => new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0
}).format(value || 0);

// START UC-35 View Approval Status
/**
 * Ánh xạ trạng thái duyệt của tour sang nhãn + màu badge.
 * Phức tạp: 'needs_revision' và 'rejected' là hai trạng thái cần provider xử lý,
 * nên được tách màu riêng để không bị nhầm với 'active'/'suspended'.
 * 'draft' là tour nháp chưa gửi duyệt nên phải hiện khác 'pending' để provider biết
 * cần bấm "Gửi duyệt" thì tour mới tới được hàng đợi của staff.
 */
const getStatusBadge = (status) => {
  switch (status) {
    case 'draft':
      return {
        label: 'Bản nháp',
        variant: 'badge-secondary'
      };
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
// END UC-35 View Approval Status

export default function ProviderTours() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

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
  const [tourToDelete, setTourToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  // START UC-24 Duplicate Tour
  const [tourToDuplicate, setTourToDuplicate] = useState(null);
  const [isDuplicating, setIsDuplicating] = useState(false);
  const [duplicatedTour, setDuplicatedTour] = useState(null);
  // END UC-24 Duplicate Tour
  const toast = useToast();

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
      toast.error(requestError.message || 'Không thể tải danh sách tour của bạn.');
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

  // START UC-24 Duplicate Tour
  /**
   * Nhân bản tour đang chọn. `isDuplicating` vừa khóa nút xác nhận vừa chặn request
   * thứ hai khi provider bấm liên tục.
   */
  const handleDuplicate = async () => {
    if (!tourToDuplicate || isDuplicating) return;

    const sourceTitle = tourToDuplicate.title;
    setIsDuplicating(true);
    try {
      const response = await tourApi.duplicate(tourToDuplicate._id);
      setTourToDuplicate(null);
      setDuplicatedTour(response.data || null);
      toast.success(`Nhân bản tour "${sourceTitle}" thành công.`);

      // Tour mới là bản nháp và nằm đầu danh sách: bỏ bộ lọc để chắc chắn nhìn thấy nó.
      setSearch('');
      setStatus('all');
      setCurrentPage(1);
      await loadTours('', 'all', 1);
    } catch (requestError) {
      toast.error(requestError.message || 'Không thể nhân bản tour.');
    } finally {
      setIsDuplicating(false);
    }
  };
  // END UC-24 Duplicate Tour

  const handleDelete = async () => {
    if (!tourToDelete || isDeleting) return;

    setIsDeleting(true);
    try {
      await tourApi.remove(tourToDelete._id);
      toast.success(`Đã xóa tour "${tourToDelete.title}".`);
      setTourToDelete(null);

      // Tour cuối cùng của trang đang xem: lùi về trang trước để không bị trang rỗng
      if (tours.length === 1 && currentPage > 1) {
        setCurrentPage(currentPage - 1);
      } else {
        await loadTours(search, status, currentPage);
      }
    } catch (requestError) {
      toast.error(requestError.message || 'Không thể xóa tour.');
      setTourToDelete(null);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <section className="management-page-section">
      {/* Page Heading & Nút Tạo Tour Mới */}
      <div className="management-page-heading d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
        <div>
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

      {/* START UC-24 Duplicate Tour */}
      {duplicatedTour && (
        <div className="alert alert-success d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-2" role="status">
          <div>
            <i className="bi bi-check-circle me-2"></i>
            Đã nhân bản tour <strong>{duplicatedTour.title}</strong>. Tour mới đang ở trạng thái Bản nháp và chưa được gửi duyệt.
          </div>
          <div className="d-flex gap-2">
            <button
              type="button"
              className="btn btn-sm btn-primary text-nowrap"
              onClick={() => {
                setDuplicatedTour(null);
                setSelectedTourForEdit(duplicatedTour);
              }}
            >
              <i className="bi bi-pencil-square me-1"></i>
              Chỉnh sửa tour mới
            </button>
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary text-nowrap"
              onClick={() => setDuplicatedTour(null)}
            >
              Đóng
            </button>
          </div>
        </div>
      )}
      {/* END UC-24 Duplicate Tour */}

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
                { value: 'draft', label: 'Bản nháp', icon: 'bi bi-file-earmark text-secondary' },
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

                        {/* START UC-35 View Approval Status */}
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
                        {/* END UC-35 View Approval Status */}
                      </td>

                      <td className="text-end">
                        <div className="management-actions justify-content-end">
                          {['draft', 'needs_revision', 'rejected'].includes(tour.status) && (
                            <button
                              type="button"
                              className="management-action-btn text-primary border-0 bg-transparent px-2"
                              title="Gửi duyệt tour để mở bán"
                              aria-label={`Gửi duyệt ${tour.title}`}
                              onClick={() => navigate(`/management/my-submissions?tour=${tour._id}`)}
                            >
                              <i className="bi bi-send fs-5"></i>
                            </button>
                          )}
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
                          {/* START UC-24 Duplicate Tour */}
                          <button
                            type="button"
                            className="management-action-btn btn-duplicate"
                            title="Nhân bản tour"
                            aria-label={`Nhân bản ${tour.title}`}
                            onClick={() => setTourToDuplicate(tour)}
                          >
                            <i className="bi bi-files"></i>
                          </button>
                          {/* END UC-24 Duplicate Tour */}
                          <Link
                            className="management-action-btn btn-view"
                            to={`/management/my-tours/${tour._id}`}
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
                          <button
                            type="button"
                            className="management-action-btn btn-delete"
                            title="Xóa tour"
                            aria-label={`Xóa ${tour.title}`}
                            onClick={() => setTourToDelete(tour)}
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

        <ManagementPagination
          currentPage={currentPage}
          totalPages={totalPages}
          itemLabel="tour"
          isLoading={isLoading}
          onPageChange={handlePageChange}
        />
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

      <ConfirmDeleteModal
        isOpen={Boolean(tourToDelete)}
        title="Xác nhận xóa tour"
        message={
          <>
            Bạn có chắc muốn xóa tour <strong>{tourToDelete?.title}</strong>?
            <br />
            <small className="text-muted">
              Tour sẽ bị ẩn khỏi danh sách công khai và danh sách tour của bạn. Lịch sử đặt tour,
              đánh giá và lịch trình của khách vẫn được giữ lại.
            </small>
          </>
        }
        loading={isDeleting}
        onConfirm={handleDelete}
        onClose={() => setTourToDelete(null)}
      />

      {/* START UC-24 Duplicate Tour */}
      <DuplicateTourModal
        isOpen={Boolean(tourToDuplicate)}
        tourTitle={tourToDuplicate?.title}
        loading={isDuplicating}
        onConfirm={handleDuplicate}
        onClose={() => {
          if (!isDuplicating) setTourToDuplicate(null);
        }}
      />
      {/* END UC-24 Duplicate Tour */}
    </section>
  );
}
