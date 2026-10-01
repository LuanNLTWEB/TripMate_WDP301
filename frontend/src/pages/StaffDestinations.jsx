import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { destinationApi, destinationCategoryApi } from '../services/api';
import CustomSelect from '../components/CustomSelect';

function StaffDestinations() {
  const { user } = useAuth();
  const toast = useToast();
  const [destinations, setDestinations] = useState([]);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [showUpdateConfirm, setShowUpdateConfirm] = useState(false);
  const [destinationToDelete, setDestinationToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    location: '',
    imageUrl: '',
    categoryId: '',
    isPopular: false
  });

  const [categories, setCategories] = useState([]);

  const loadDestinations = async (searchTerm = search, page = currentPage) => {
    setIsLoading(true);
    try {
      const response = await destinationApi.getAll({ search: searchTerm, page, limit: 10 });
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
    if (user?.role !== 'staff' && user?.role !== 'admin') return;
    const timer = setTimeout(() => {
      loadDestinations(search, currentPage);
    }, 300);
    return () => clearTimeout(timer);
  }, [search, currentPage, user?.role]);

  useEffect(() => {
    if (user?.role !== 'staff' && user?.role !== 'admin') return;
    destinationCategoryApi.getAll()
      .then((res) => setCategories(res.data || []))
      .catch(() => {});
  }, [user?.role]);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const handleCreateChange = (event) => {
    const { name, value, type, checked } = event.target;
    setFormData((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleCreate = async (event) => {
    event.preventDefault();
    setIsSaving(true);
    setError('');

    try {
      const response = await destinationApi.create({
        name: formData.name,
        description: formData.description,
        location: formData.location,
        images: [formData.imageUrl],
        categoryId: formData.categoryId || undefined,
        isPopular: formData.isPopular
      });
      setFormData({ name: '', description: '', location: '', imageUrl: '', categoryId: '', isPopular: false });
      setShowCreateForm(false);
      toast.success(response.message || 'Đã tạo điểm đến thành công.');
      await loadDestinations('', 1);
    } catch (requestError) {
      toast.error(requestError.message || 'Không thể tạo điểm đến.');
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

  const openEditForm = (dest) => {
    setEditingId(dest._id);
    setShowUpdateConfirm(false);
    setFormData({
      name: dest.name,
      description: dest.description,
      location: dest.location,
      imageUrl: dest.images?.[0] || '',
      categoryId: dest.categoryId?._id || dest.categoryId || '',
      isPopular: dest.isPopular
    });
    setShowCreateForm(true);
    setError('');
  };

  const handleEditSubmit = (event) => {
    event.preventDefault();
    setShowUpdateConfirm(true);
  };

  const handleConfirmUpdate = async () => {
    if (!editingId || isSaving) return;

    setIsSaving(true);
    setError('');

    try {
      const response = await destinationApi.update(editingId, {
        name: formData.name,
        description: formData.description,
        location: formData.location,
        images: [formData.imageUrl],
        categoryId: formData.categoryId || null,
        isPopular: formData.isPopular
      });
      setShowUpdateConfirm(false);
      setEditingId(null);
      setFormData({ name: '', description: '', location: '', imageUrl: '', categoryId: '', isPopular: false });
      setShowCreateForm(false);
      toast.success(response.message || 'Đã cập nhật điểm đến thành công.');
      await loadDestinations(search, currentPage);
    } catch (requestError) {
      toast.error(requestError.message || 'Không thể cập nhật điểm đến.');
      setShowUpdateConfirm(false);
    } finally {
      setIsSaving(false);
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
            onClick={() => {
              setShowCreateForm((current) => !current);
              setEditingId(null);
              setShowUpdateConfirm(false);
              setFormData({ name: '', description: '', location: '', imageUrl: '', categoryId: '', isPopular: false });
              setError('');
            }}
          >
            <i className={`bi ${showCreateForm ? 'bi-x-lg' : 'bi-plus-circle'}`}></i>
            <span>{showCreateForm ? 'Đóng biểu mẫu' : 'Thêm điểm đến'}</span>
          </button>
        </div>

        {showCreateForm && (
          <form className="card shadow-sm border-0 rounded-3 mb-4" onSubmit={editingId ? handleEditSubmit : handleCreate}>
            <div className="card-body p-4">
              <h2 className="h5 fw-bold mb-3">{editingId ? 'Chỉnh sửa điểm đến' : 'Tạo điểm đến'}</h2>
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label fw-semibold" htmlFor="destination-name">Tên điểm đến</label>
                  <input id="destination-name" name="name" className="form-control" value={formData.name} onChange={handleCreateChange} required />
                </div>
                <div className="col-md-6">
                  <label className="form-label fw-semibold" htmlFor="destination-location">Vị trí</label>
                  <input id="destination-location" name="location" className="form-control" value={formData.location} onChange={handleCreateChange} required />
                </div>
                <div className="col-12">
                  <label className="form-label fw-semibold" htmlFor="destination-description">Mô tả</label>
                  <textarea id="destination-description" name="description" className="form-control" rows="3" value={formData.description} onChange={handleCreateChange} required />
                </div>
                <div className="col-md-4">
                  <label className="form-label fw-semibold" htmlFor="destination-category">Danh mục</label>
                  <CustomSelect
                    id="destination-category"
                    name="categoryId"
                    value={formData.categoryId}
                    onChange={handleCreateChange}
                    options={[
                      { value: '', label: '— Không chọn —' },
                      ...categories.map((cat) => ({ value: cat._id, label: cat.name }))
                    ]}
                  />
                </div>
                <div className="col-md-4">
                  <label className="form-label fw-semibold" htmlFor="destination-image">URL hình ảnh</label>
                  <input id="destination-image" name="imageUrl" type="url" className="form-control" value={formData.imageUrl} onChange={handleCreateChange} required />
                </div>
                <div className="col-md-4 d-flex align-items-end">
                  <div className="form-check mb-2">
                    <input id="destination-popular" name="isPopular" type="checkbox" className="form-check-input" checked={formData.isPopular} onChange={handleCreateChange} />
                    <label className="form-check-label fw-semibold" htmlFor="destination-popular">Đánh dấu phổ biến</label>
                  </div>
                </div>
              </div>
              <div className="mt-4 d-flex gap-2">
                <button className="btn btn-primary" disabled={isSaving}>
                  {isSaving ? 'Đang lưu...' : (editingId ? 'Cập nhật điểm đến' : 'Lưu điểm đến')}
                </button>
                {editingId && (
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => {
                      setEditingId(null);
                      setShowUpdateConfirm(false);
                      setShowCreateForm(false);
                      setFormData({ name: '', description: '', location: '', imageUrl: '', categoryId: '', isPopular: false });
                    }}
                  >
                    Hủy
                  </button>
                )}
              </div>
            </div>
          </form>
        )}
        
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
                            to={`/destinations/${dest._id}`}
                            className="management-action-btn btn-view"
                            title="Xem trước trang khách"
                          >
                            <i className="bi bi-eye"></i>
                          </Link>
                          <button
                            type="button"
                            className="management-action-btn btn-edit"
                            onClick={() => openEditForm(dest)}
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

      {destinationToDelete && (
        <>
          <div
            className="modal fade show d-block"
            tabIndex="-1"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-destination-title"
          >
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content border-0 shadow">
                <div className="modal-header">
                  <h2 id="delete-destination-title" className="modal-title h5 fw-bold">
                    Xác nhận xóa điểm đến
                  </h2>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setDestinationToDelete(null)}
                    disabled={isDeleting}
                    aria-label="Đóng"
                  ></button>
                </div>
                <div className="modal-body">
                  <p className="mb-2">
                    Bạn có chắc muốn xóa <strong>{destinationToDelete.name}</strong>?
                  </p>
                  <p className="text-muted small mb-0">
                    Điểm đến sẽ bị ẩn khỏi hệ thống và danh sách yêu thích. Dữ liệu lịch trình cũ vẫn được giữ lại.
                  </p>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => setDestinationToDelete(null)}
                    disabled={isDeleting}
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={handleDelete}
                    disabled={isDeleting}
                  >
                    {isDeleting ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>
                        Đang xóa...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-trash me-2"></i>
                        Xóa điểm đến
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show"></div>
        </>
      )}

      {showUpdateConfirm && (
        <>
          <div
            className="modal fade show d-block"
            tabIndex="-1"
            role="dialog"
            aria-modal="true"
            aria-labelledby="update-destination-title"
          >
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content border-0 shadow">
                <div className="modal-header">
                  <h2 id="update-destination-title" className="modal-title h5 fw-bold">
                    Xác nhận cập nhật điểm đến
                  </h2>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setShowUpdateConfirm(false)}
                    disabled={isSaving}
                    aria-label="Đóng"
                  ></button>
                </div>
                <div className="modal-body">
                  <p className="mb-2">
                    Bạn có chắc chắn muốn lưu các thay đổi cho điểm đến <strong>{formData.name}</strong>?
                  </p>
                  <p className="text-muted small mb-0">
                    Thông tin điểm đến sau khi cập nhật sẽ được hiển thị cho khách hàng và áp dụng trên toàn hệ thống.
                  </p>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => setShowUpdateConfirm(false)}
                    disabled={isSaving}
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleConfirmUpdate}
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>
                        Đang lưu...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-check-circle me-2"></i>
                        Xác nhận cập nhật
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show"></div>
        </>
      )}

    </>
  );
}

export default StaffDestinations;
