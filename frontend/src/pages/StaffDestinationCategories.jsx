import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { destinationCategoryApi } from '../services/api';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

function StaffDestinationCategories() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const toast = useToast();
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({ name: '', description: '' });

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
    if (!isAuthenticated) {
      navigate('/login', { replace: true, state: { from: { pathname: '/staff/destination-categories' } } });
    } else if (user?.role !== 'staff' && user?.role !== 'admin') {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate, user]);

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

  if (!isAuthenticated || (user?.role !== 'staff' && user?.role !== 'admin')) return null;

  return (
    <>
      <Navbar />
      <main className="py-5 bg-light flex-grow-1">
        <div className="container">
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
            <div>
              <h1 className="h3 fw-bold mb-1">Quản lý danh mục điểm đến</h1>
              <p className="text-muted mb-0">Xem và quản lý các danh mục phân loại điểm đến</p>
            </div>
            <button className="btn btn-primary" onClick={showForm ? handleCancel : openCreateForm}>
              <i className="bi bi-plus-circle me-2"></i>{showForm ? 'Đóng biểu mẫu' : 'Thêm danh mục'}
            </button>
          </div>

          {showForm && (
            <form className="card shadow-sm border-0 rounded-3 mb-4" onSubmit={handleSubmit}>
              <div className="card-body p-4">
                <h2 className="h5 fw-bold mb-3">{editingId ? 'Chỉnh sửa danh mục' : 'Tạo danh mục'}</h2>
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label" htmlFor="category-name">Tên danh mục</label>
                    <input
                      id="category-name"
                      name="name"
                      className="form-control"
                      value={formData.name}
                      onChange={handleFormChange}
                      required
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label" htmlFor="category-description">Mô tả</label>
                    <input
                      id="category-description"
                      name="description"
                      className="form-control"
                      value={formData.description}
                      onChange={handleFormChange}
                    />
                  </div>
                </div>
                <div className="d-flex gap-2 mt-3">
                  <button className="btn btn-primary" type="submit" disabled={isSaving}>
                    {isSaving ? 'Đang lưu...' : 'Lưu danh mục'}
                  </button>
                  {editingId && (
                    <button className="btn btn-outline-secondary" type="button" onClick={handleCancel}>
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

          <div className="card shadow-sm border-0 rounded-3">
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table align-middle table-hover mb-0">
                  <thead className="table-light text-muted small text-uppercase">
                    <tr>
                      <th className="px-4 py-3" style={{ width: '15%' }}>ID</th>
                      <th className="py-3" style={{ width: '25%' }}>Tên danh mục</th>
                      <th className="py-3" style={{ width: '40%' }}>Mô tả</th>
                      <th className="px-4 py-3 text-end" style={{ width: '20%' }}>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading ? (
                      <tr>
                        <td colSpan="4" className="text-center py-5">
                          <div className="spinner-border text-primary" role="status">
                            <span className="visually-hidden">Loading...</span>
                          </div>
                        </td>
                      </tr>
                    ) : categories.length === 0 ? (
                      <tr>
                        <td colSpan="4" className="text-center text-muted py-5">
                          <i className="bi bi-inbox fs-2 d-block mb-3"></i>
                          Chưa có danh mục nào.
                        </td>
                      </tr>
                    ) : categories.map((category) => (
                      <tr key={category._id}>
                        <td className="px-4 py-3 text-muted small font-monospace">{category._id.slice(-8)}</td>
                        <td className="py-3">
                          <div className="fw-bold text-dark">{category.name}</div>
                        </td>
                        <td className="py-3 text-muted">{category.description || '—'}</td>
                        <td className="px-4 py-3 text-end">
                          <div className="d-flex justify-content-end gap-2">
                            <button
                              className="btn btn-sm btn-light border"
                              onClick={() => openEditForm(category)}
                              title="Chỉnh sửa"
                            >
                              <i className="bi bi-pencil text-primary"></i>
                            </button>
                            <button
                              className="btn btn-sm btn-light border"
                              onClick={() => handleDelete(category)}
                              title="Xóa"
                            >
                              <i className="bi bi-trash text-danger"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

export default StaffDestinationCategories;
