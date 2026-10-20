import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { destinationApi, destinationCategoryApi } from '../services/api';
import DestinationFormModal from '../components/DestinationFormModal';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal';

function StaffDestinations() {
  const { user } = useAuth();
  const toast = useToast();
  const [destinations, setDestinations] = useState([]);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalState, setModalState] = useState({ open: false, destination: null });
  const [isSaving, setIsSaving] = useState(false);
  const [destinationToDelete, setDestinationToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [categories, setCategories] = useState([]);

  const loadDestinations = async (searchTerm = search, page = currentPage) => {
    setIsLoading(true);
    try {
      const response = await destinationApi.getManaged({ search: searchTerm, page, limit: 10 });
      setDestinations(response.data || []);
      setTotalPages(response.totalPages || 1);
      setCurrentPage(response.currentPage || 1);
      setError('');
    } catch (requestError) {
      setError(requestError.message || 'Không thể tải danh sách điểm đến.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role !== 'staff') return;
    const timer = setTimeout(() => {
      loadDestinations(search, currentPage);
    }, 300);
    return () => clearTimeout(timer);
  }, [search, currentPage, user?.role]);

  useEffect(() => {
    if (user?.role !== 'staff') return;
    destinationCategoryApi.getAll()
      .then((res) => setCategories(res.data || []))
      .catch(() => {});
  }, [user?.role]);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const openCreateModal = () => {
    setModalState({ open: true, destination: null });
  };

  const openEditModal = (dest) => {
    setModalState({ open: true, destination: dest });
  };

  const closeModal = () => {
    if (!isSaving) {
      setModalState({ open: false, destination: null });
    }
  };

  const handleFormSubmit = async (payload) => {
    setIsSaving(true);
    const isEditing = Boolean(modalState.destination?._id);

    try {
      if (isEditing) {
        const response = await destinationApi.update(modalState.destination._id, payload);
        toast.success(response.message || 'Đã cập nhật điểm đến thành công.');
      } else {
        const response = await destinationApi.create(payload);
        toast.success(response.message || 'Đã tạo điểm đến thành công.');
        setCurrentPage(1);
      }
      setModalState({ open: false, destination: null });
      await loadDestinations(isEditing ? search : '', isEditing ? currentPage : 1);
    } catch (requestError) {
      toast.error(requestError.message || 'Không thể lưu điểm đến.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleStatusChange = async (destination) => {
    try {
      const response = await destinationApi.updateStatus(
        destination._id,
        destination.status === 'inactive' ? 'active' : 'inactive'
      );
      toast.success(response.message || 'Đã cập nhật trạng thái điểm đến.');
      await loadDestinations(search, currentPage);
    } catch (requestError) {
      toast.error(requestError.message || 'Không thể cập nhật trạng thái.');
    }
  };

  const handleDelete = async () => {
    if (!destinationToDelete || isDeleting) return;

    setIsDeleting(true);
    setError('');
    try {
      const response = await destinationApi.remove(destinationToDelete._id);
      const nextPage = destinations.length === 1 && currentPage > 1
        ? currentPage - 1
        : currentPage;
      setDestinationToDelete(null);
      setCurrentPage(nextPage);
      toast.success(response.message || `Đã xóa điểm đến "${destinationToDelete.name}".`);
      await loadDestinations(search, nextPage);
    } catch (requestError) {
      toast.error(requestError.message || 'Không thể xóa điểm đến.');
      setDestinationToDelete(null);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <section className="management-page-section">
        <div className="management-page-heading d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
          <div>
            <span className="management-page-kicker">Destinations Management</span>
            <h1>Quản lý điểm đến</h1>
            <p>Xem danh sách, thêm mới và quản lý các điểm đến du lịch trên hệ thống.</p>
          </div>
          <button
            type="button"
            className="btn btn-primary d-inline-flex align-items-center gap-2"
            onClick={openCreateModal}
          >
            <i className="bi bi-plus-lg"></i>
            <span>Thêm điểm đến</span>
          </button>
        </div>

        {error && (
          <div className="alert alert-danger alert-dismissible fade show" role="alert">
            {error}
            <button type="button" className="btn-close" onClick={() => setError('')} aria-label="Đóng"></button>
          </div>
        )}

        <div className="management-table-card">
          <div className="management-table-toolbar">
            <div className="management-search-box">
              <i className="bi bi-search"></i>
              <input
                type="search"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Tìm kiếm theo tên hoặc vị trí..."
                aria-label="Tìm kiếm điểm đến"
              />
            </div>
            <div className="text-muted small">
              Hiển thị <strong>{destinations.length}</strong> điểm đến
            </div>
          </div>

          <div className="table-responsive">
            <table className="management-table">
              <thead>
                <tr>
                  <th style={{ width: '80px' }}>Hình ảnh</th>
                  <th>Tên điểm đến</th>
                  <th>Vị trí</th>
                  <th style={{ width: '120px' }}>Đánh giá</th>
                  <th style={{ width: '150px' }}>Trạng thái</th>
                  <th className="text-end" style={{ width: '160px' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan="6" className="text-center py-5 text-muted">
                      <div className="spinner-border spinner-border-sm text-primary me-2" role="status"></div>
                      Đang tải danh sách điểm đến...
                    </td>
                  </tr>
                ) : destinations.length === 0 ? (
                  <tr>
                    <td colSpan="6">
                      <div className="management-empty-state">
                        <div className="management-empty-icon">
                          <i className="bi bi-geo-alt fs-2"></i>
                        </div>
                        <h6 className="fw-bold text-dark mb-1">Không tìm thấy điểm đến nào</h6>
                        <p className="small text-muted mb-0">Thử tìm kiếm với từ khóa khác hoặc bấm "Thêm điểm đến" để tạo mới.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  destinations.map((dest) => (
                    <tr key={dest._id}>
                      <td>
                        {dest.images?.[0] ? (
                          <img
                            src={dest.images[0]}
                            alt={dest.name}
                            className="management-table-thumb"
                          />
                        ) : (
                          <div className="management-table-thumb-empty">
                            <i className="bi bi-image"></i>
                          </div>
                        )}
                      </td>
                      <td>
                        <div className="fw-bold text-dark">{dest.name}</div>
                      </td>
                      <td>
                        <div className="text-muted">
                          <i className="bi bi-geo-alt-fill text-danger me-1"></i>
                          {dest.location}
                        </div>
                      </td>
                      <td>
                        <div className="d-inline-flex align-items-center bg-warning bg-opacity-10 text-warning px-2 py-1 rounded fw-semibold small">
                          <i className="bi bi-star-fill me-1"></i>
                          {dest.averageRating || 0}
                        </div>
                      </td>
                      <td>
                        <span className={`management-badge ${dest.status === 'inactive' ? 'badge-secondary' : dest.isPopular ? 'badge-success' : 'badge-primary'}`}>
                          <span className="management-badge-dot"></span>
                          {dest.status === 'inactive' ? 'Tạm ẩn' : (dest.isPopular ? 'Phổ biến' : 'Đang hoạt động')}
                        </span>
                      </td>
                      <td className="text-end">
                        <div className="management-actions">
                          <Link
                            to={`/management/destinations/${dest._id}`}
                            className="management-action-btn btn-view"
                            title="Xem chi tiết điểm đến"
                          >
                            <i className="bi bi-eye"></i>
                          </Link>
                          <button
                            type="button"
                            className="management-action-btn btn-edit"
                            onClick={() => openEditModal(dest)}
                            title="Chỉnh sửa điểm đến"
                          >
                            <i className="bi bi-pencil"></i>
                          </button>
                          <button
                            type="button"
                            className="management-action-btn btn-delete"
                            onClick={() => setDestinationToDelete(dest)}
                            disabled={isDeleting}
                            title="Xóa điểm đến"
                          >
                            <i className="bi bi-trash"></i>
                          </button>
                          <button
                            type="button"
                            className="management-action-btn"
                            onClick={() => handleStatusChange(dest)}
                            title={dest.status === 'inactive' ? 'Kích hoạt' : 'Tạm ẩn'}
                          >
                            <i className={dest.status === 'inactive' ? 'bi bi-toggle-off text-muted fs-5' : 'bi bi-toggle-on text-success fs-5'}></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {!isLoading && totalPages > 1 && (
            <div className="management-pagination-bar">
              <div>
                Trang <strong>{currentPage}</strong> trên <strong>{totalPages}</strong>
              </div>
              <nav aria-label="Page navigation">
                <ul className="pagination pagination-sm mb-0">
                  <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                    <button className="page-link" onClick={() => handlePageChange(currentPage - 1)}>
                      <i className="bi bi-chevron-left me-1"></i>Trước
                    </button>
                  </li>
                  {[...Array(totalPages)].map((_, idx) => (
                    <li key={idx} className={`page-item ${currentPage === idx + 1 ? 'active' : ''}`}>
                      <button className="page-link" onClick={() => handlePageChange(idx + 1)}>
                        {idx + 1}
                      </button>
                    </li>
                  ))}
                  <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                    <button className="page-link" onClick={() => handlePageChange(currentPage + 1)}>
                      Sau<i className="bi bi-chevron-right ms-1"></i>
                    </button>
                  </li>
                </ul>
              </nav>
            </div>
          )}
        </div>
      </section>

      <DestinationFormModal
        isOpen={modalState.open}
        destination={modalState.destination}
        categories={categories}
        saving={isSaving}
        onClose={closeModal}
        onSubmit={handleFormSubmit}
      />

      <ConfirmDeleteModal
        isOpen={Boolean(destinationToDelete)}
        title="Xác nhận xóa điểm đến"
        message={
          <>
            Bạn có chắc muốn xóa <strong>{destinationToDelete?.name}</strong>?
            <br />
            <small className="text-muted">
              Điểm đến sẽ bị ẩn khỏi hệ thống và danh sách yêu thích. Dữ liệu lịch trình cũ vẫn được giữ lại.
            </small>
          </>
        }
        loading={isDeleting}
        onConfirm={handleDelete}
        onClose={() => setDestinationToDelete(null)}
      />
    </>
  );
}

export default StaffDestinations;
