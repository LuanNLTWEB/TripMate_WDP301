import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { roleApi } from '../services/api';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal';
import ManagementPagination from '../components/management/ManagementPagination';

function RoleForm({ role, onClose, onSaved }) {
  const toast = useToast();
  const [formData, setFormData] = useState({
    name: role?.name || '',
    description: role?.description || ''
  });
  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!formData.name?.trim()) {
      setErrors({ name: 'Vui lòng nhập tên vai trò.' });
      document.getElementById('role-name')?.focus();
      toast.error('Vui lòng nhập tên vai trò.');
      return;
    }

    setIsSaving(true);
    try {
      const data = { name: formData.name.trim(), description: formData.description.trim() };
      const response = await roleApi.update(role._id, data);
      onSaved(response.message);
    } catch (requestError) {
      toast.error(requestError.message || 'Không thể lưu vai trò.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="modal d-block" tabIndex="-1" role="dialog" aria-modal="true">
      <div className="modal-dialog modal-dialog-scrollable" role="document">
        <div className="modal-content">
          <form onSubmit={handleSubmit} noValidate>
            <div className="modal-header">
              <h5 className="modal-title">Sửa vai trò</h5>
              <button type="button" className="btn-close" onClick={onClose} disabled={isSaving} aria-label="Đóng"></button>
            </div>
            <div className="modal-body">
              <div className="mb-3">
                <label className="form-label small fw-medium" htmlFor="role-name">Tên vai trò</label>
                <input
                  className={`form-control ${errors.name ? 'is-invalid' : ''}`}
                  id="role-name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  disabled={isSaving}
                  placeholder="Nhập tên vai trò"
                />
                {errors.name && <div className="invalid-feedback">{errors.name}</div>}
              </div>
              <div className="mb-3">
                <label className="form-label small fw-medium" htmlFor="role-description">Mô tả</label>
                <textarea
                  className="form-control"
                  id="role-description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows="3"
                  disabled={isSaving}
                  placeholder="Nhập mô tả vai trò (không bắt buộc)"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline-secondary" onClick={onClose} disabled={isSaving}>Hủy</button>
              <button type="submit" className="btn btn-primary" disabled={isSaving}>
                {isSaving ? 'Đang lưu...' : 'Lưu vai trò'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

const PAGE_SIZE = 10;

function AdminRoles() {
  const { user } = useAuth();
  const toast = useToast();
  const [roles, setRoles] = useState([]);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedRole, setSelectedRole] = useState(null);
  const [roleToDelete, setRoleToDelete] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [processingId, setProcessingId] = useState('');

  const loadRoles = async () => {
    setIsLoading(true);
    try {
      const response = await roleApi.getAll();
      setRoles(response.roles || []);
      setError('');
    } catch (requestError) {
      setError(requestError.message || 'Không thể tải danh sách vai trò.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === 'admin') loadRoles();
  }, [user?.role]);

  const handleSearchChange = (event) => {
    setSearch(event.target.value);
    setCurrentPage(1);
  };

  const openEditForm = (role) => {
    setSelectedRole(role);
    setIsFormOpen(true);
  };

  const handleSaved = async (savedMessage) => {
    setIsFormOpen(false);
    toast.success(savedMessage || 'Đã lưu vai trò.');
    await loadRoles();
  };

  const confirmDeleteRole = async () => {
    if (!roleToDelete) return;
    setProcessingId(roleToDelete._id);
    try {
      const response = await roleApi.remove(roleToDelete._id);
      toast.success(response.message || 'Đã xóa vai trò.');
      setRoleToDelete(null);
      await loadRoles();
    } catch (requestError) {
      toast.error(requestError.message || 'Không thể xóa vai trò.');
    } finally {
      setProcessingId('');
    }
  };

  const filteredRoles = roles.filter((role) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return role.name?.toLowerCase().includes(q) || role.description?.toLowerCase().includes(q);
  });
  const totalPages = Math.ceil(filteredRoles.length / PAGE_SIZE) || 1;
  const paginatedRoles = filteredRoles.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <>
      <section className="management-page-section">
        <div className="container-fluid px-0">
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
            <div>
              <h1 className="h3 fw-bold mb-1">Quản lý vai trò</h1>
            </div>
          </div>
          {error && <div className="alert alert-danger alert-dismissible fade show" role="alert">{error}<button type="button" className="btn-close" onClick={() => setError('')} aria-label="Đóng"></button></div>}
          <div className="card shadow-sm border-0">
            <div className="card-body p-3 p-md-4">
              <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
                <div className="management-search-box" style={{ maxWidth: '400px' }}>
                  <i className="bi bi-search"></i>
                  <input
                    type="search"
                    value={search}
                    onChange={handleSearchChange}
                    placeholder="Tìm theo tên vai trò hoặc mô tả..."
                    aria-label="Tìm kiếm vai trò"
                  />
                </div>
                <div className="text-muted small">
                  Hiển thị <strong>{paginatedRoles.length}</strong> / {filteredRoles.length} vai trò
                </div>
              </div>
              <div className="table-responsive">
                <table className="table align-middle mb-0">
                  <thead><tr><th>Tên vai trò</th><th>Mô tả</th><th>Loại</th><th>Ngày tạo</th><th className="text-end">Thao tác</th></tr></thead>
                  <tbody>
                    {isLoading ? <tr><td colSpan="5" className="text-center py-5"><span className="spinner-border spinner-border-sm me-2"></span>Đang tải...</td></tr> : paginatedRoles.length === 0 ? <tr><td colSpan="5" className="text-center text-muted py-5">Chưa có vai trò nào.</td></tr> : paginatedRoles.map((role) => (
                      <tr key={role._id}>
                        <td><span className="fw-semibold">{role.name}</span></td>
                        <td className="text-muted">{role.description || '—'}</td>
                        <td><span className={`badge ${role.isDefault ? 'bg-secondary' : 'bg-info text-dark'}`}>{role.isDefault ? 'Mặc định' : 'Tùy chỉnh'}</span></td>
                        <td className="small text-muted">{new Date(role.createdAt).toLocaleDateString('vi-VN')}</td>
                        <td>
                          <div className="d-flex justify-content-end gap-2 flex-wrap">
                            {role.isDefault ? (
                              <span className="badge bg-light text-muted border">Không thể sửa/xóa</span>
                            ) : (
                              <>
                                <button className="btn btn-sm btn-outline-primary" onClick={() => openEditForm(role)} disabled={processingId === role._id}>Sửa</button>
                                <button className="btn btn-sm btn-outline-danger" onClick={() => setRoleToDelete(role)} disabled={processingId === role._id}>Xóa</button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <ManagementPagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={filteredRoles.length}
                itemLabel="vai trò"
                isLoading={isLoading}
                onPageChange={(page) => setCurrentPage(page)}
              />
            </div>
          </div>
        </div>
      </section>
      {isFormOpen && <><div className="modal-backdrop fade show"></div><RoleForm role={selectedRole} onClose={() => setIsFormOpen(false)} onSaved={handleSaved} /></>}
      <ConfirmDeleteModal
        isOpen={Boolean(roleToDelete)}
        title="Xác nhận xóa vai trò"
        message={
          <>
            Bạn có chắc muốn xóa vai trò <strong>{roleToDelete?.name}</strong>?
          </>
        }
        loading={Boolean(processingId)}
        onConfirm={confirmDeleteRole}
        onClose={() => setRoleToDelete(null)}
      />
    </>
  );
}

export default AdminRoles;
