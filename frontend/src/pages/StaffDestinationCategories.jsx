import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { destinationCategoryApi } from '../services/api';

function StaffDestinationCategories() {
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

  const loadCategories = async () => {
    setIsLoading(true);
    try {
      const response = await destinationCategoryApi.getAll();
      setCategories(response.data || []);
      setError('');
    } catch (requestError) {
      setError(requestError.message || 'Không thể tải danh sách danh mục.');
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
    setFormData({ name: '', description: '' });
    setShowForm(true);
    setError('');
  };

  const openEditForm = (category) => {
    setEditingId(category._id);
    setFormData({ name: category.name, description: category.description || '' });
    setShowForm(true);
    setError('');
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({ name: '', description: '' });
    setError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSaving(true);
    setError('');

    try {
      if (editingId) {
        await destinationCategoryApi.update(editingId, formData);
      } else {
        await destinationCategoryApi.create(formData);
      }
      toast.success(editingId ? 'Đã cập nhật danh mục.' : 'Đã tạo danh mục mới.');
      handleCancel();
      await loadCategories();
    } catch (requestError) {
      toast.error(requestError.message || 'Không thể lưu danh mục.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (category) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa danh mục "${category.name}"?`)) {
      return;
    }

    try {
      await destinationCategoryApi.remove(category._id);
      toast.success(`Đã xóa danh mục "${category.name}".`);
      await loadCategories();
    } catch (requestError) {
      toast.error(requestError.message || 'Không thể xóa danh mục.');
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
          <span className="management-page-kicker">Destination Categories</span>
          <h1>Quản lý danh mục điểm đến</h1>
          <p>Xem, tạo mới và sắp xếp các danh mục phân loại điểm đến du lịch.</p>
        </div>
        <button
          type="button"
          className="btn btn-primary d-inline-flex align-items-center gap-2"
          onClick={showForm ? handleCancel : openCreateForm}
        >
          <i className={`bi ${showForm ? 'bi-x-lg' : 'bi-plus-circle'}`}></i>
          <span>{showForm ? 'Đóng biểu mẫu' : 'Thêm danh mục'}</span>
        </button>
      </div>

      {showForm && (
        <form className="card shadow-sm border-0 rounded-3 mb-4" onSubmit={handleSubmit}>
          <div className="card-body p-4">
            <h2 className="h5 fw-bold mb-3">{editingId ? 'Chỉnh sửa danh mục' : 'Tạo danh mục mới'}</h2>
            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label fw-semibold" htmlFor="category-name">Tên danh mục</label>
                <input
                  id="category-name"
                  name="name"
                  className="form-control"
                  value={formData.name}
                  onChange={handleFormChange}
                  placeholder="Ví dụ: Bãi biển, Di tích lịch sử..."
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
                  placeholder="Mô tả ngắn gọn về danh mục..."
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
              aria-label="Tìm kiếm danh mục"
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
                <th style={{ width: '28%' }}>Tên danh mục</th>
                <th>Mô tả</th>
                <th className="text-end" style={{ width: '130px' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan="4" className="text-center py-5 text-muted">
                    <div className="spinner-border spinner-border-sm text-primary me-2" role="status"></div>
                    Đang tải danh mục...
                  </td>
                </tr>
              ) : filteredCategories.length === 0 ? (
                <tr>
                  <td colSpan="4">
                    <div className="management-empty-state">
                      <div className="management-empty-icon">
                        <i className="bi bi-tags fs-2"></i>
                      </div>
                      <h6 className="fw-bold text-dark mb-1">Chưa có danh mục nào</h6>
                      <p className="small text-muted mb-0">Thử tìm kiếm với từ khóa khác hoặc bấm "Thêm danh mục" để tạo mới.</p>
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
                          onClick={() => handleDelete(category)}
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
    </section>
  );
}

export default StaffDestinationCategories;
