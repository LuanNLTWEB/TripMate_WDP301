import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { destinationApi, destinationCategoryApi } from '../services/api';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

function StaffDestinations() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
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

  // Category list for dropdown
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

  // Protect route
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { replace: true, state: { from: { pathname: '/staff/destinations' } } });
    } else if (user?.role !== 'staff' && user?.role !== 'admin') {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate, user]);

  useEffect(() => {
    if (user?.role !== 'staff' && user?.role !== 'admin') return;
    const timer = setTimeout(() => {
      loadDestinations(search, currentPage);
    }, 300);
    return () => clearTimeout(timer);
  }, [search, currentPage, user?.role]);

  // Load categories for dropdown
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

  const handleEditSubmit = async (event) => {
    event.preventDefault();
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
      setEditingId(null);
      setFormData({ name: '', description: '', location: '', imageUrl: '', categoryId: '', isPopular: false });
      setShowCreateForm(false);
      toast.success(response.message || 'Đã cập nhật điểm đến thành công.');
      await loadDestinations(search, currentPage);
    } catch (requestError) {
      toast.error(requestError.message || 'Không thể cập nhật điểm đến.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isAuthenticated || (user?.role !== 'staff' && user?.role !== 'admin')) return null;

  return (
    <>
      <Navbar />
      <main className="py-5 bg-light flex-grow-1">
        <div className="container">
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
            <div>
              <h1 className="h3 fw-bold mb-1">Quản lý điểm đến</h1>
              <p className="text-muted mb-0">Xem danh sách các điểm đến trên hệ thống</p>
            </div>
            <button className="btn btn-primary" onClick={() => { setShowCreateForm((current) => !current); setEditingId(null); setFormData({ name: '', description: '', location: '', imageUrl: '', categoryId: '', isPopular: false }); setError(''); }}>
              <i className="bi bi-plus-circle me-2"></i>{showCreateForm ? 'Đóng biểu mẫu' : 'Thêm điểm đến'}
            </button>
          </div>

          {showCreateForm && (
            <form className="card shadow-sm border-0 rounded-3 mb-4" onSubmit={editingId ? handleEditSubmit : handleCreate}>
              <div className="card-body p-4">
                <h2 className="h5 fw-bold mb-3">{editingId ? 'Chỉnh sửa điểm đến' : 'Tạo điểm đến'}</h2>
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label" htmlFor="destination-name">Tên điểm đến</label>
                    <input id="destination-name" name="name" className="form-control" value={formData.name} onChange={handleCreateChange} required />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label" htmlFor="destination-location">Vị trí</label>
                    <input id="destination-location" name="location" className="form-control" value={formData.location} onChange={handleCreateChange} required />
                  </div>
                  <div className="col-12">
                    <label className="form-label" htmlFor="destination-description">Mô tả</label>
                    <textarea id="destination-description" name="description" className="form-control" rows="3" value={formData.description} onChange={handleCreateChange} required />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label" htmlFor="destination-category">Danh mục</label>
                    <select id="destination-category" name="categoryId" className="form-select" value={formData.categoryId} onChange={handleCreateChange}>
                      <option value="">— Không chọn —</option>
                      {categories.map((cat) => (
                        <option key={cat._id} value={cat._id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-4">
                    <label className="form-label" htmlFor="destination-image">URL hình ảnh</label>
                    <input id="destination-image" name="imageUrl" type="url" className="form-control" value={formData.imageUrl} onChange={handleCreateChange} required />
                  </div>
                  <div className="col-md-4 d-flex align-items-end">
                    <div className="form-check mb-2">
                      <input id="destination-popular" name="isPopular" type="checkbox" className="form-check-input" checked={formData.isPopular} onChange={handleCreateChange} />
                      <label className="form-check-label" htmlFor="destination-popular">Đánh dấu phổ biến</label>
                    </div>
                  </div>
                </div>
                <button className="btn btn-primary mt-3" disabled={isSaving}>
                  {isSaving ? 'Đang lưu...' : (editingId ? 'Cập nhật' : 'Lưu điểm đến')}
                </button>
                {editingId && (
                  <button type="button" className="btn btn-outline-secondary mt-3 ms-2" onClick={() => { setEditingId(null); setShowCreateForm(false); setFormData({ name: '', description: '', location: '', imageUrl: '', categoryId: '', isPopular: false }); }}>
                    Hủy
                  </button>
                )}
              </div>
            </form>
          )}
          
          {error && (
            <div className="alert alert-danger alert-dismissible fade show" role="alert">
              {error}
              <button type="button" className="btn-close" onClick={() => setError('')} aria-label="Đóng"></button>
            </div>
          )}
          
          <div className="card shadow-sm border-0 rounded-3">
            <div className="card-body p-0">
              <div className="p-4 border-bottom bg-white rounded-top">
                <div className="input-group" style={{ maxWidth: '400px' }}>
                  <span className="input-group-text bg-white border-end-0 text-muted"><i className="bi bi-search"></i></span>
                  <input 
                    type="search" 
                    className="form-control border-start-0 ps-0" 
                    value={search} 
                    onChange={(event) => {
                      setSearch(event.target.value);
                      setCurrentPage(1);
                    }}
                    placeholder="Tìm kiếm theo tên hoặc vị trí..." 
                    aria-label="Tìm kiếm điểm đến" 
                  />
                </div>
              </div>
              <div className="table-responsive">
                <table className="table align-middle table-hover mb-0">
                  <thead className="table-light text-muted small text-uppercase">
                    <tr>
                      <th className="px-4 py-3" style={{ width: '10%' }}>Hình ảnh</th>
                      <th className="py-3" style={{ width: '25%' }}>Tên điểm đến</th>
                      <th className="py-3" style={{ width: '20%' }}>Vị trí</th>
                      <th className="py-3" style={{ width: '15%' }}>Đánh giá</th>
                      <th className="py-3" style={{ width: '15%' }}>Trạng thái</th>
                      <th className="px-4 py-3 text-end" style={{ width: '15%' }}>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading ? (
                      <tr>
                        <td colSpan="6" className="text-center py-5">
                          <div className="spinner-border text-primary" role="status">
                            <span className="visually-hidden">Loading...</span>
                          </div>
                        </td>
                      </tr>
                    ) : destinations.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="text-center text-muted py-5">
                          <i className="bi bi-inbox fs-2 d-block mb-3"></i>
                          Không tìm thấy điểm đến nào.
                        </td>
                      </tr>
                    ) : destinations.map((dest) => (
                      <tr key={dest._id}>
                        <td className="px-4 py-3">
                          {dest.images?.[0] ? (
                            <img 
                              src={dest.images[0]} 
                              alt={dest.name} 
                              className="rounded shadow-sm" 
                              style={{ width: '60px', height: '60px', objectFit: 'cover' }} 
                            />
                          ) : (
                            <div className="rounded bg-light border d-flex align-items-center justify-content-center text-muted" style={{ width: '60px', height: '60px' }}>
                              <i className="bi bi-image fs-5"></i>
                            </div>
                          )}
                        </td>
                        <td className="py-3">
                          <div className="fw-bold text-dark">{dest.name}</div>
                        </td>
                        <td className="py-3">
                          <div className="text-muted"><i className="bi bi-geo-alt-fill text-danger me-1"></i>{dest.location}</div>
                        </td>
                        <td className="py-3">
                          <div className="d-inline-flex align-items-center bg-warning bg-opacity-10 text-warning px-2 py-1 rounded fw-medium">
                            <i className="bi bi-star-fill me-1"></i>{dest.averageRating}
                          </div>
                        </td>
                        <td className="py-3">
                          <span className={`badge rounded-pill ${dest.isPopular ? 'bg-success bg-opacity-10 text-success border border-success' : 'bg-secondary bg-opacity-10 text-secondary border border-secondary'}`}>
                            {dest.status === 'inactive' ? 'Tạm ẩn' : (dest.isPopular ? 'Phổ biến' : 'Đang hoạt động')}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-end">
                          <div className="d-flex justify-content-end gap-2">
                            <Link to={`/destinations/${dest._id}`} className="btn btn-sm btn-light border" title="Xem trước trang khách">
                              <i className="bi bi-eye text-info"></i>
                            </Link>
                            <button className="btn btn-sm btn-light border" onClick={() => openEditForm(dest)} title="Chỉnh sửa">
                              <i className="bi bi-pencil text-primary"></i>
                            </button>
                            <button
                              type="button"
                              className="btn btn-sm btn-light border"
                              onClick={() => setDestinationToDelete(dest)}
                              disabled={isDeleting}
                              title="Xóa điểm đến"
                            >
                              <i className="bi bi-trash text-danger"></i>
                            </button>
                            <button className="btn btn-sm btn-light border" onClick={() => handleStatusChange(dest)} title={dest.status === 'inactive' ? 'Kích hoạt' : 'Tạm ẩn'}>
                              <i className={dest.status === 'inactive' ? 'bi bi-toggle-off text-secondary' : 'bi bi-toggle-on text-success'}></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {/* Pagination */}
              {!isLoading && totalPages > 1 && (
                <div className="p-4 border-top bg-white rounded-bottom d-flex align-items-center justify-content-between flex-wrap gap-3">
                  <div className="text-muted small">
                    Trang {currentPage} trên {totalPages}
                  </div>
                  <nav aria-label="Page navigation">
                    <ul className="pagination pagination-sm mb-0">
                      <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                        <button className="page-link" onClick={() => handlePageChange(currentPage - 1)}>Trước</button>
                      </li>
                      {[...Array(totalPages)].map((_, idx) => (
                        <li key={idx} className={`page-item ${currentPage === idx + 1 ? 'active' : ''}`}>
                          <button className="page-link" onClick={() => handlePageChange(idx + 1)}>
                            {idx + 1}
                          </button>
                        </li>
                      ))}
                      <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                        <button className="page-link" onClick={() => handlePageChange(currentPage + 1)}>Sau</button>
                      </li>
                    </ul>
                  </nav>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

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

      <Footer />
    </>
  );
}

export default StaffDestinations;
