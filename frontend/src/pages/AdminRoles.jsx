import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { roleApi } from '../services/api';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal';
import ManagementPagination from '../components/management/ManagementPagination';
import { formatAdminDate } from '../utils/adminFormatters';

const emptyForm = { name: '', description: '' };
const PAGE_SIZE = 10;

/**
 * Standardized Create & Update Role Modal aligned with system form modals.
 */
function RoleFormModal({ role, onClose, onSaved }) {
  const toast = useToast();
  const isEditing = Boolean(role);
  const [formData, setFormData] = useState(
    role ? { name: role.name, description: role.description || '' } : emptyForm
  );
  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !isSaving) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isSaving, onClose]);

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
      const response = isEditing
        ? await roleApi.update(role._id, data)
        : await roleApi.create(data);
      onSaved(response.message);
    } catch (requestError) {
      toast.error(requestError.message || 'Không thể lưu vai trò.');
    } finally {
      setIsSaving(false);
    }
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="modal fade show d-block"
      tabIndex="-1"
      role="dialog"
      aria-modal="true"
      style={{ backgroundColor: 'rgba(15, 23, 42, 0.6)', zIndex: 1055 }}
      onClick={(event) => {
        if (event.target === event.currentTarget && !isSaving) onClose();
      }}
    >
      <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable" role="document">
        <div
          className="modal-content border-0 shadow-lg rounded-4 overflow-hidden"
          style={{ maxHeight: 'calc(100dvh - 2rem)' }}
        >
          <form onSubmit={handleSubmit} noValidate className="d-flex flex-column overflow-hidden h-100">
            <div className="modal-header bg-light-subtle px-4 py-3 border-bottom flex-shrink-0 d-flex align-items-center justify-content-between">
              <div>
                <h2 className="modal-title h5 fw-bold text-dark mb-0 d-flex align-items-center gap-2">
                  <i className={`bi ${isEditing ? 'bi-pencil-square' : 'bi-shield-plus'} text-primary`}></i>
                  <span>{isEditing ? 'Cập nhật vai trò' : 'Tạo Vai Trò Mới'}</span>
                </h2>
                <p className="small text-muted mb-0 mt-0.5">
                  {isEditing
                    ? `Điều chỉnh thông tin vai trò ${role?.name || ''}.`
                    : 'Đặt tên và mô tả cho nhóm vai trò phân quyền mới.'}
                </p>
              </div>
              <button type="button" className="btn-close" onClick={onClose} disabled={isSaving} aria-label="Đóng"></button>
            </div>

            <div className="modal-body p-4 overflow-auto">
              <div className="mb-3">
                <label className="form-label small fw-semibold text-dark" htmlFor="role-name">
                  Tên vai trò <span className="text-danger">*</span>
                </label>
                <input
                  className={`form-control ${errors.name ? 'is-invalid' : ''}`}
                  id="role-name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  disabled={isSaving}
                  placeholder="Ví dụ: contentModerator"
                />
                {errors.name && <div className="invalid-feedback">{errors.name}</div>}
              </div>

              <div className="mb-0">
                <label className="form-label small fw-semibold text-dark" htmlFor="role-description">
                  Mô tả
                </label>
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

            <div className="modal-footer bg-light-subtle px-4 py-3 border-top flex-shrink-0 d-flex justify-content-end gap-2">
              <button type="button" className="btn btn-outline-secondary px-4" onClick={onClose} disabled={isSaving}>
                Hủy
              </button>
              <button
                type="submit"
                className="btn btn-primary px-4 d-inline-flex align-items-center gap-2"
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <span className="spinner-border spinner-border-sm" aria-hidden="true"></span>
                    <span>Đang lưu...</span>
                  </>
                ) : (
                  <>
                    <i className="bi bi-check2-circle"></i>
                    <span>{isEditing ? 'Lưu thay đổi' : 'Tạo vai trò'}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>,
    document.body
  );
}

function AdminRoles() {
  const { user } = useAuth();
  const toast = useToast();
  const [roles, setRoles] = useState([]);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRole, setSelectedRole] = useState(null);
  const [roleToDelete, setRoleToDelete] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [processingId, setProcessingId] = useState('');

  const loadRoles = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await roleApi.getAll();
      setRoles(response.roles || []);
    } catch (requestError) {
      toast.error(requestError.message || 'Không thể tải danh sách vai trò.');
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (user?.role !== 'admin') return undefined;
    let active = true;
    roleApi.getAll()
      .then((response) => {
        if (active) setRoles(response.roles || []);
      })
      .catch((requestError) => {
        if (active) toast.error(requestError.message || 'Không thể tải danh sách vai trò.');
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [user?.role, toast]);

  const handleSearchChange = (event) => {
    setSearch(event.target.value);
    setCurrentPage(1);
  };

  const openCreateForm = () => {
    setSelectedRole(null);
    setIsFormOpen(true);
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
        <div className="management-page-heading d-flex flex-column flex-md-row justify-content-between align-items-md-start gap-3">
          <div>
            <h1>Quản lý vai trò</h1>
            <p>Xem, tạo mới và cấu hình các nhóm vai trò phân quyền trên hệ thống.</p>
          </div>
          <button
            type="button"
            className="btn btn-primary d-inline-flex align-items-center justify-content-center gap-2 flex-shrink-0 text-nowrap mt-md-1"
            style={{ minWidth: '156px' }}
            onClick={openCreateForm}
          >
            <i className="bi bi-plus-lg"></i>
            <span>Tạo vai trò</span>
          </button>
        </div>

        <div className="management-table-card">
          <div className="management-table-toolbar">
            <div className="management-search-box">
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
            <table
              className={`management-table ${isLoading && roles.length > 0 ? 'is-fetching' : ''}`}
              style={{ tableLayout: 'fixed', minWidth: '800px' }}
            >
              <thead>
                <tr>
                  <th style={{ width: '22%', minWidth: '160px' }}>Tên vai trò</th>
                  <th style={{ minWidth: '220px' }}>Mô tả</th>
                  <th style={{ width: '16%', minWidth: '130px' }}>Loại</th>
                  <th style={{ width: '15%', minWidth: '120px' }}>Ngày tạo</th>
                  <th className="text-end" style={{ width: '180px', minWidth: '180px' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {isLoading && roles.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="text-center py-5 text-muted">
                      <div className="spinner-border spinner-border-sm text-primary me-2" role="status"></div>
                      Đang tải danh sách vai trò...
                    </td>
                  </tr>
                ) : paginatedRoles.length === 0 ? (
                  <tr>
                    <td colSpan="5">
                      <div className="management-empty-state">
                        <div className="management-empty-icon">
                          <i className="bi bi-shield-lock fs-2"></i>
                        </div>
                        <h6 className="fw-bold text-dark mb-1">Chưa có vai trò phù hợp</h6>
                        <p className="small text-muted mb-0">
                          Thử tìm kiếm với từ khóa khác hoặc bấm "Tạo vai trò" để thêm mới.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedRoles.map((role) => (
                    <tr key={role._id}>
                      <td>
                        <div className="fw-bold text-dark">{role.name}</div>
                      </td>
                      <td className="text-muted">
                        {role.description || <span className="fst-italic">Không có mô tả</span>}
                      </td>
                      <td>
                        <span className={`management-badge ${role.isDefault ? 'badge-secondary' : 'badge-info'}`}>
                          <span className="management-badge-dot"></span>
                          {role.isDefault ? 'Mặc định' : 'Tùy chỉnh'}
                        </span>
                      </td>
                      <td className="small text-muted">{formatAdminDate(role.createdAt)}</td>
                      <td className="text-end">
                        <div className="management-actions">
                          {role.isDefault ? (
                            <span className="management-badge badge-secondary" title="Vai trò mặc định được hệ thống bảo vệ">
                              <i className="bi bi-lock-fill"></i>
                              Hệ thống bảo vệ
                            </span>
                          ) : (
                            <>
                              <button
                                type="button"
                                className="management-action-btn btn-edit"
                                onClick={() => openEditForm(role)}
                                disabled={processingId === role._id}
                                title="Chỉnh sửa vai trò"
                                aria-label={`Sửa ${role.name}`}
                              >
                                <i className="bi bi-pencil"></i>
                              </button>
                              <button
                                type="button"
                                className="management-action-btn btn-delete"
                                onClick={() => setRoleToDelete(role)}
                                disabled={processingId === role._id}
                                title="Xóa vai trò"
                                aria-label={`Xóa ${role.name}`}
                              >
                                <i className="bi bi-trash"></i>
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
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
      </section>

      {isFormOpen && (
        <RoleFormModal
          role={selectedRole}
          onClose={() => setIsFormOpen(false)}
          onSaved={handleSaved}
        />
      )}

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
