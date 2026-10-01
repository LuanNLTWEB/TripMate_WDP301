import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { tourCategoryApi } from '../services/api';

function StaffTourCategories() {
  const { user } = useAuth();
  const toast = useToast();
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [search, setSearch] = useState('');
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadCategories = async () => {
    setIsLoading(true);
    try {
      const response = await tourCategoryApi.getAll();
      setCategories(response.data || []);
      setError('');
    } catch (requestError) {
      setError(requestError.message || 'Không thể tải danh sách danh mục tour.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role !== 'staff' && user?.role !== 'admin') return;
    loadCategories();
  }, [user?.role]);

  const handleFormChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  };

  const openCreateForm = () => {
    setEditingId(null);
    setShowSaveConfirm(false);
    setFormData({ name: '', description: '' });
    setShowForm(true);
    setError('');
  };

  const openEditForm = (category) => {
    setEditingId(category._id);
    setShowSaveConfirm(false);
    setFormData({ name: category.name, description: category.description || '' });
    setShowForm(true);
    setError('');
  };

  const handleCancel = () => {
    setShowForm(false);
    setShowSaveConfirm(false);
    setEditingId(null);
    setFormData({ name: '', description: '' });
    setError('');
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    setShowSaveConfirm(true);
  };

  const handleConfirmSave = async () => {
    setIsSaving(true);
    setError('');

    try {
      if (editingId) {
        await tourCategoryApi.update(editingId, formData);
      } else {
        await tourCategoryApi.create(formData);
      }
      toast.success(editingId ? 'Đã cập nhật danh mục tour.' : 'Đã tạo danh mục tour mới.');
      setShowSaveConfirm(false);
      handleCancel();
      await loadCategories();
    } catch (requestError) {
      toast.error(requestError.message || 'Không thể lưu danh mục tour.');
      setShowSaveConfirm(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!categoryToDelete || isDeleting) return;

    setIsDeleting(true);
    try {
      await tourCategoryApi.remove(categoryToDelete._id);
      toast.success(`Đã xóa danh mục "${categoryToDelete.name}".`);
      setCategoryToDelete(null);
      await loadCategories();
    } catch (requestError) {
      toast.error(requestError.message || 'Không thể xóa danh mục tour.');
      setCategoryToDelete(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredCategories = categories.filter((cat) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return cat.name?.toLowerCase().includes(q) || cat.description?.toLowerCase().includes(q);
  });

  return (
    <section className="management-page-section">
      <div className="management-page-heading d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
        <div>
          <span className="management-page-kicker">Tour Categories</span>
          <h1>Quản lý danh mục tour</h1>
          <p>Xem, tạo mới và phân loại các danh mục tour du lịch trên hệ thống.</p>
        </div>
        <button
          type="button"
          className="btn btn-primary d-inline-flex align-items-center gap-2"
          onClick={showForm ? handleCancel : openCreateForm}
        >
          <i className={`bi ${showForm ? 'bi-x-lg' : 'bi-plus-circle'}`}></i>
          <span>{showForm ? 'Đóng biểu mẫu' : 'Thêm danh mục tour'}</span>
        </button>
      </div>

      {showForm && (
        <form className="card shadow-sm border-0 rounded-3 mb-4" onSubmit={handleSubmit}>
          <div className="card-body p-4">
            <h2 className="h5 fw-bold mb-3">{editingId ? 'Chỉnh sửa danh mục tour' : 'Tạo danh mục tour mới'}</h2>
            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label fw-semibold" htmlFor="category-name">Tên danh mục tour</label>
                <input
                  id="category-name"
                  name="name"
                  className="form-control"
                  value={formData.name}
                  onChange={handleFormChange}
                  placeholder="VD: Du lịch sinh thái, Nghỉ dưỡng, Mạo hiểm..."
                  required
                />
              </div>
              <div className="col-md-6">
                <label className="form-label fw-semibold" htmlFor="category-description">Mô tả</label>
                <input
                  id="category-description"
                  name="description"
                  className="form-control"
                  value={formData.description}
                  onChange={handleFormChange}
                  placeholder="Mô tả ngắn về danh mục này..."
                />
              </div>
            </div>
            <div className="d-flex gap-2 mt-4">
              <button className="btn btn-primary" type="submit" disabled={isSaving}>
                {isSaving ? 'Đang lưu...' : (editingId ? 'Cập nhật danh mục' : 'Lưu danh mục')}
              </button>
              <button className="btn btn-outline-secondary" type="button" onClick={handleCancel}>
                Hủy
              </button>
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
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm kiếm danh mục theo tên hoặc mô tả..."
              aria-label="Tìm kiếm danh mục tour"
            />
          </div>
          <div className="text-muted small">
            Hiển thị <strong>{filteredCategories.length}</strong> / {categories.length} danh mục
          </div>
        </div>

        <div className="table-responsive">
          <table className="management-table">
            <thead>
              <tr>
                <th style={{ width: '130px' }}>Mã danh mục</th>
                <th style={{ width: '30%' }}>Tên danh mục tour</th>
                <th>Mô tả</th>
                <th className="text-end" style={{ width: '130px' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan="4" className="text-center py-5 text-muted">
                    <div className="spinner-border spinner-border-sm text-primary me-2" role="status"></div>
                    Đang tải danh mục tour...
                  </td>
                </tr>
              ) : filteredCategories.length === 0 ? (
                <tr>
                  <td colSpan="4">
                    <div className="management-empty-state">
                      <div className="management-empty-icon">
                        <i className="bi bi-bookmark fs-2"></i>
                      </div>
                      <h6 className="fw-bold text-dark mb-1">Chưa có danh mục tour nào</h6>
                      <p className="small text-muted mb-0">Thử tìm kiếm với từ khóa khác hoặc bấm "Thêm danh mục tour" để tạo mới.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredCategories.map((category) => (
                  <tr key={category._id}>
                    <td>
                      <span className="badge bg-light text-secondary border font-monospace py-1 px-2">
                        #{category._id.slice(-6).toUpperCase()}
                      </span>
                    </td>
                    <td>
                      <div className="fw-bold text-dark">{category.name}</div>
                    </td>
                    <td className="text-muted">
                      {category.description || <span className="text-muted fst-italic">Không có mô tả</span>}
                    </td>
                    <td className="text-end">
                      <div className="management-actions">
                        <button
                          type="button"
                          className="management-action-btn btn-edit"
                          onClick={() => openEditForm(category)}
                          title="Chỉnh sửa danh mục"
                        >
                          <i className="bi bi-pencil"></i>
                        </button>
                        <button
                          type="button"
                          className="management-action-btn btn-delete"
                          onClick={() => setCategoryToDelete(category)}
                          title="Xóa danh mục"
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
      </div>

      {categoryToDelete && (
        <>
          <div
            className="modal fade show d-block"
            tabIndex="-1"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-tour-category-title"
          >
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content border-0 shadow">
                <div className="modal-header">
                  <h2 id="delete-tour-category-title" className="modal-title h5 fw-bold">
                    Xác nhận xóa danh mục tour
                  </h2>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setCategoryToDelete(null)}
                    disabled={isDeleting}
                    aria-label="Đóng"
                  ></button>
                </div>
                <div className="modal-body">
                  <p className="mb-2">
                    Bạn có chắc muốn xóa danh mục <strong>{categoryToDelete.name}</strong>?
                  </p>
                  <p className="text-muted small mb-0">
                    Nếu danh mục đang được sử dụng bởi các tour du lịch, hệ thống sẽ từ chối thao tác xóa.
                  </p>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => setCategoryToDelete(null)}
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
                        Xóa danh mục
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

      {showSaveConfirm && (
        <>
          <div
            className="modal fade show d-block"
            tabIndex="-1"
            role="dialog"
            aria-modal="true"
            aria-labelledby="save-tour-category-title"
          >
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content border-0 shadow">
                <div className="modal-header">
                  <h2 id="save-tour-category-title" className="modal-title h5 fw-bold">
                    {editingId ? 'Xác nhận cập nhật danh mục tour' : 'Xác nhận thêm danh mục tour'}
                  </h2>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setShowSaveConfirm(false)}
                    disabled={isSaving}
                    aria-label="Đóng"
                  ></button>
                </div>
                <div className="modal-body">
                  <p className="mb-2">
                    {editingId ? (
                      <>Bạn có chắc muốn lưu các thay đổi cho danh mục <strong>{formData.name}</strong>?</>
                    ) : (
                      <>Bạn có chắc muốn thêm danh mục mới <strong>{formData.name}</strong> vào hệ thống?</>
                    )}
                  </p>
                  <p className="text-muted small mb-0">
                    {editingId
                      ? 'Thông tin danh mục sau khi cập nhật sẽ được hiển thị cho tất cả tour liên quan.'
                      : 'Danh mục tour mới sẽ có thể sử dụng ngay sau khi tạo.'}
                  </p>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => setShowSaveConfirm(false)}
                    disabled={isSaving}
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleConfirmSave}
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>
                        Đang lưu...
                      </>
                    ) : (
                      <>
                        <i className={`bi ${editingId ? 'bi-check-circle' : 'bi-plus-circle'} me-2`}></i>
                        {editingId ? 'Xác nhận cập nhật' : 'Xác nhận thêm'}
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
    </section>
  );
}

export default StaffTourCategories;
