import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { accountApi, roleApi } from '../services/api';
import CustomSelect from '../components/CustomSelect';
import CustomDatePicker from '../components/CustomDatePicker';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal';
import ManagementPagination from '../components/management/ManagementPagination';
import {
  ROLE_LABELS,
  formatAdminDate,
  getAccountStatusMeta,
  getRoleMeta
} from '../utils/adminFormatters';

const emptyForm = {
  username: '',
  email: '',
  password: '',
  phone: '',
  dateOfBirth: '',
  gender: 'other',
  role: 'customer'
};

const genderLabels = { male: 'Nam', female: 'Nữ', other: 'Khác' };

/**
 * Standardized Create Account & Assign Role Modal aligned with system form modals.
 */
function AccountFormModal({ account, roles, onClose, onSaved }) {
  const toast = useToast();
  const isEditing = Boolean(account);
  const [formData, setFormData] = useState(
    account
      ? {
        phone: account.phone || '',
        dateOfBirth: account.dateOfBirth?.substring(0, 10) || '',
        gender: account.gender || 'other',
        role: account.role === 'user' ? 'customer' : account.role
      }
      : emptyForm
  );
  const [fieldErrors, setFieldErrors] = useState({});
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
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!isEditing) {
      const errs = {};
      if (!formData.username?.trim()) {
        errs.username = 'Vui lòng nhập tên người dùng.';
      }
      if (!formData.email?.trim()) {
        errs.email = 'Vui lòng nhập địa chỉ email.';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
        errs.email = 'Địa chỉ email không đúng định dạng.';
      }
      if (!formData.password) {
        errs.password = 'Vui lòng nhập mật khẩu.';
      } else if (formData.password.length < 6 || !/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
        errs.password = 'Mật khẩu phải có ít nhất 6 ký tự, gồm chữ hoa, chữ thường và số.';
      }
      if (!formData.phone?.trim()) {
        errs.phone = 'Vui lòng nhập số điện thoại.';
      } else if (!/^[0-9]{10,11}$/.test(formData.phone.trim())) {
        errs.phone = 'Số điện thoại không hợp lệ (10-11 số).';
      }

      if (Object.keys(errs).length > 0) {
        setFieldErrors(errs);
        const firstField = Object.keys(errs)[0];
        const el = document.getElementById(`account-${firstField}`) || document.querySelector(`[name="${firstField}"]`);
        el?.focus();
        toast.error('Vui lòng kiểm tra và điền đầy đủ các thông tin được đánh dấu đỏ.');
        return;
      }
    }

    setIsSaving(true);
    try {
      const data = isEditing
        ? { role: formData.role }
        : {
          username: formData.username.trim(),
          email: formData.email.trim(),
          password: formData.password,
          phone: formData.phone.trim(),
          dateOfBirth: formData.dateOfBirth || undefined,
          gender: formData.gender,
          role: formData.role
        };
      const response = isEditing
        ? await accountApi.update(account.id, data)
        : await accountApi.create(data);
      onSaved(response.message);
    } catch (requestError) {
      toast.error(requestError.message || 'Không thể lưu tài khoản.');
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
      <div className="modal-dialog modal-dialog-centered modal-lg modal-dialog-scrollable" role="document">
        <div
          className="modal-content border-0 shadow-lg rounded-4 overflow-hidden"
          style={{ maxHeight: 'calc(100dvh - 2rem)' }}
        >
          <form onSubmit={handleSubmit} noValidate className="d-flex flex-column overflow-hidden h-100">
            <div className="modal-header bg-light-subtle px-4 py-3 border-bottom flex-shrink-0 d-flex align-items-center justify-content-between">
              <div>
                <h2 className="modal-title h5 fw-bold text-dark mb-0 d-flex align-items-center gap-2">
                  <i className={`bi ${isEditing ? 'bi-person-gear' : 'bi-person-plus-fill'} text-primary`}></i>
                  <span>{isEditing ? 'Thay đổi vai trò tài khoản' : 'Tạo Tài Khoản Mới'}</span>
                </h2>
                <p className="small text-muted mb-0 mt-0.5">
                  {isEditing
                    ? `Điều chỉnh quyền truy cập cho người dùng ${account?.username || ''}.`
                    : 'Điền đầy đủ thông tin để cấp tài khoản mới trong hệ thống.'}
                </p>
              </div>
              <button type="button" className="btn-close" onClick={onClose} disabled={isSaving} aria-label="Đóng"></button>
            </div>

            <div className="modal-body p-4 overflow-auto">
              <div className="row g-3">
                {isEditing ? (
                  <div className="col-12">
                    <div className="p-3 bg-light rounded-3 border mb-3">
                      <div className="d-flex align-items-center gap-3 mb-3">
                        <div
                          className="rounded-circle bg-primary-subtle text-primary d-flex align-items-center justify-content-center fw-bold flex-shrink-0"
                          style={{ width: '42px', height: '42px' }}
                        >
                          {account.username?.charAt(0)?.toUpperCase() || 'U'}
                        </div>
                        <div className="min-w-0">
                          <div className="fw-bold text-dark text-truncate">{account.username}</div>
                          <div className="small text-muted text-truncate">{account.email}</div>
                        </div>
                      </div>
                      <div className="row g-3 small pt-2 border-top">
                        <div className="col-md-4">
                          <span className="text-muted d-block">Số điện thoại</span>
                          <span className="fw-medium text-dark">{account.phone || 'Chưa cập nhật'}</span>
                        </div>
                        <div className="col-md-4">
                          <span className="text-muted d-block">Ngày sinh</span>
                          <span className="fw-medium text-dark">{formatAdminDate(account.dateOfBirth)}</span>
                        </div>
                        <div className="col-md-4">
                          <span className="text-muted d-block">Giới tính</span>
                          <span className="fw-medium text-dark">{genderLabels[account.gender] || 'Chưa cập nhật'}</span>
                        </div>
                      </div>
                    </div>

                    <label className="form-label small fw-semibold text-dark" htmlFor="account-role">
                      Vai trò trong hệ thống
                    </label>
                    <CustomSelect
                      id="account-role"
                      name="role"
                      value={formData.role}
                      onChange={handleChange}
                      disabled={isSaving}
                      options={roles.map((r) => ({
                        value: r.name,
                        label: ROLE_LABELS[r.name] || r.name
                      }))}
                    />
                  </div>
                ) : (
                  <>
                    <div className="col-md-6">
                      <label className="form-label small fw-semibold text-dark" htmlFor="account-username">
                        Tên người dùng <span className="text-danger">*</span>
                      </label>
                      <input
                        className={`form-control ${fieldErrors.username ? 'is-invalid' : ''}`}
                        id="account-username"
                        name="username"
                        value={formData.username}
                        onChange={handleChange}
                        disabled={isSaving}
                        placeholder="Ví dụ: nguyenvana"
                      />
                      {fieldErrors.username && <div className="invalid-feedback">{fieldErrors.username}</div>}
                    </div>

                    <div className="col-md-6">
                      <label className="form-label small fw-semibold text-dark" htmlFor="account-email">
                        Email <span className="text-danger">*</span>
                      </label>
                      <input
                        type="email"
                        className={`form-control ${fieldErrors.email ? 'is-invalid' : ''}`}
                        id="account-email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        disabled={isSaving}
                        placeholder="email@domain.com"
                      />
                      {fieldErrors.email && <div className="invalid-feedback">{fieldErrors.email}</div>}
                    </div>

                    <div className="col-md-6">
                      <label className="form-label small fw-semibold text-dark" htmlFor="account-password">
                        Mật khẩu <span className="text-danger">*</span>
                      </label>
                      <input
                        type="password"
                        className={`form-control ${fieldErrors.password ? 'is-invalid' : ''}`}
                        id="account-password"
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        disabled={isSaving}
                      />
                      {fieldErrors.password && <div className="invalid-feedback">{fieldErrors.password}</div>}
                      <div className="form-text">Tối thiểu 6 ký tự, gồm chữ hoa, chữ thường và số.</div>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label small fw-semibold text-dark" htmlFor="account-phone">
                        Số điện thoại <span className="text-danger">*</span>
                      </label>
                      <input
                        type="tel"
                        className={`form-control ${fieldErrors.phone ? 'is-invalid' : ''}`}
                        id="account-phone"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        disabled={isSaving}
                        placeholder="0901234567"
                      />
                      {fieldErrors.phone && <div className="invalid-feedback">{fieldErrors.phone}</div>}
                    </div>

                    <div className="col-md-6">
                      <label className="form-label small fw-semibold text-dark" htmlFor="account-dob">
                        Ngày sinh
                      </label>
                      <CustomDatePicker
                        id="account-dob"
                        name="dateOfBirth"
                        value={formData.dateOfBirth}
                        onChange={handleChange}
                        max={new Date().toISOString().split('T')[0]}
                        disabled={isSaving}
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label small fw-semibold text-dark" htmlFor="account-gender">
                        Giới tính
                      </label>
                      <CustomSelect
                        id="account-gender"
                        name="gender"
                        value={formData.gender}
                        onChange={handleChange}
                        disabled={isSaving}
                        options={[
                          { value: 'male', label: 'Nam' },
                          { value: 'female', label: 'Nữ' },
                          { value: 'other', label: 'Khác' }
                        ]}
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label small fw-semibold text-dark" htmlFor="account-role">
                        Vai trò
                      </label>
                      <CustomSelect
                        id="account-role"
                        name="role"
                        value={formData.role}
                        onChange={handleChange}
                        disabled={isSaving}
                        options={roles.map((r) => ({
                          value: r.name,
                          label: ROLE_LABELS[r.name] || r.name
                        }))}
                      />
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="modal-footer bg-light-subtle px-4 py-3 border-top flex-shrink-0 d-flex justify-content-end gap-2">
              <button
                type="button"
                className="btn btn-outline-secondary px-4"
                onClick={onClose}
                disabled={isSaving}
              >
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
                    <span>{isEditing ? 'Lưu vai trò' : 'Tạo tài khoản'}</span>
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

function AdminAccounts() {
  const { user } = useAuth();
  const toast = useToast();
  const [accounts, setAccounts] = useState([]);
  const [roles, setRoles] = useState([]);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [accountToDelete, setAccountToDelete] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [processingId, setProcessingId] = useState('');
  const prevSearchRef = useRef(search);

  useEffect(() => {
    if (user?.role !== 'admin') return undefined;
    let active = true;
    roleApi.getAll()
      .then((response) => {
        if (active) setRoles(response.roles || []);
      })
      .catch((requestError) => {
        console.error('Không thể tải danh sách vai trò:', requestError);
      });
    return () => {
      active = false;
    };
  }, [user?.role]);

  const loadAccounts = useCallback(async (searchTerm = search, page = currentPage) => {
    setIsLoading(true);
    try {
      const response = await accountApi.getAll({
        search: searchTerm,
        page,
        limit: 10
      });
      setAccounts(response.accounts || []);
      setCurrentPage(response.currentPage || 1);
      setTotalPages(response.totalPages || 1);
      setTotal(typeof response.total === 'number' ? response.total : (response.accounts || []).length);
    } catch (requestError) {
      toast.error(requestError.message || 'Không thể tải danh sách tài khoản.');
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, search, toast]);

  useEffect(() => {
    if (user?.role !== 'admin') return undefined;
    let active = true;
    const isSearchChanged = prevSearchRef.current !== search;
    prevSearchRef.current = search;
    const delayMs = isSearchChanged ? 300 : 0;

    const timer = setTimeout(() => {
      setIsLoading(true);
      accountApi.getAll({
        search,
        page: currentPage,
        limit: 10
      })
        .then((response) => {
          if (!active) return;
          setAccounts(response.accounts || []);
          setCurrentPage(response.currentPage || 1);
          setTotalPages(response.totalPages || 1);
          setTotal(typeof response.total === 'number' ? response.total : (response.accounts || []).length);
        })
        .catch((requestError) => {
          if (active) {
            toast.error(requestError.message || 'Không thể tải danh sách tài khoản.');
          }
        })
        .finally(() => {
          if (active) setIsLoading(false);
        });
    }, delayMs);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [search, currentPage, user?.role, toast]);

  const handleSearchChange = (event) => {
    setSearch(event.target.value);
    setCurrentPage(1);
  };

  const openCreateForm = () => {
    setSelectedAccount(null);
    setIsFormOpen(true);
  };

  const openRoleForm = async (account) => {
    setProcessingId(account.id);
    try {
      const response = await accountApi.getById(account.id);
      setSelectedAccount(response.account);
      setIsFormOpen(true);
    } catch (requestError) {
      toast.error(requestError.message || 'Không thể tải thông tin tài khoản.');
    } finally {
      setProcessingId('');
    }
  };

  const handleSaved = async (savedMessage) => {
    setIsFormOpen(false);
    toast.success(savedMessage || 'Đã lưu tài khoản.');
    await loadAccounts(search, currentPage);
  };

  const handleStatus = async (account) => {
    setProcessingId(account.id);
    try {
      const response = await accountApi.setStatus(account.id, !account.isActive);
      toast.success(response.message || 'Đã cập nhật trạng thái tài khoản.');
      await loadAccounts(search, currentPage);
    } catch (requestError) {
      toast.error(requestError.message || 'Không thể cập nhật trạng thái tài khoản.');
    } finally {
      setProcessingId('');
    }
  };

  const confirmDeleteAccount = async () => {
    if (!accountToDelete) return;
    setProcessingId(accountToDelete.id);
    try {
      const response = await accountApi.remove(accountToDelete.id);
      toast.success(response.message || 'Đã xóa tài khoản.');
      setAccountToDelete(null);
      if (accounts.length === 1 && currentPage > 1) {
        setCurrentPage(currentPage - 1);
      } else {
        await loadAccounts(search, currentPage);
      }
    } catch (requestError) {
      toast.error(requestError.message || 'Không thể xóa tài khoản.');
    } finally {
      setProcessingId('');
    }
  };

  return (
    <>
      <section className="management-page-section">
        <div className="management-page-heading d-flex flex-column flex-md-row justify-content-between align-items-md-start gap-3">
          <div>
            <h1>Quản lý tài khoản</h1>
            <p>Quản lý danh sách, phân vai trò và trạng thái hoạt động tài khoản.</p>
          </div>
          <button
            type="button"
            className="btn btn-primary d-inline-flex align-items-center justify-content-center gap-2 flex-shrink-0 text-nowrap mt-md-1"
            style={{ minWidth: '156px' }}
            onClick={openCreateForm}
          >
            <i className="bi bi-person-plus"></i>
            <span>Tạo tài khoản</span>
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
                placeholder="Tìm theo tên người dùng hoặc email..."
                aria-label="Tìm kiếm tài khoản"
              />
            </div>
            <div className="text-muted small">
              Hiển thị <strong>{accounts.length}</strong> / {total} tài khoản
            </div>
          </div>

          <div className="table-responsive">
            <table
              className={`management-table ${isLoading && accounts.length > 0 ? 'is-fetching' : ''}`}
              style={{ tableLayout: 'fixed', minWidth: '820px' }}
            >
              <thead>
                <tr>
                  <th style={{ width: '36%', minWidth: '240px' }}>Tài khoản</th>
                  <th style={{ width: '18%', minWidth: '140px' }}>Vai trò</th>
                  <th style={{ width: '18%', minWidth: '150px' }}>Trạng thái</th>
                  <th style={{ width: '14%', minWidth: '115px' }}>Ngày tạo</th>
                  <th className="text-end" style={{ width: '150px', minWidth: '150px' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {isLoading && accounts.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="text-center py-5 text-muted">
                      <div className="spinner-border spinner-border-sm text-primary me-2" role="status"></div>
                      Đang tải danh sách tài khoản...
                    </td>
                  </tr>
                ) : accounts.length === 0 ? (
                  <tr>
                    <td colSpan="5">
                      <div className="management-empty-state">
                        <div className="management-empty-icon">
                          <i className="bi bi-people fs-2"></i>
                        </div>
                        <h6 className="fw-bold text-dark mb-1">Không tìm thấy tài khoản phù hợp</h6>
                        <p className="small text-muted mb-0">
                          Thử tìm kiếm với từ khóa khác hoặc bấm "Tạo tài khoản" để thêm mới.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  accounts.map((account) => {
                    const roleMeta = getRoleMeta(account.role);
                    const statusMeta = getAccountStatusMeta(account.isActive);
                    const isSelf = account.id === user?.id;
                    const isDisabled = processingId === account.id || isSelf;

                    return (
                      <tr key={account.id}>
                        <td>
                          <div className="d-flex align-items-center gap-3">
                            <div
                              className="rounded-circle bg-primary-subtle text-primary d-flex align-items-center justify-content-center fw-bold flex-shrink-0"
                              style={{ width: '38px', height: '38px', fontSize: '0.88rem' }}
                            >
                              {account.username?.charAt(0)?.toUpperCase() || 'U'}
                            </div>
                            <div className="min-w-0">
                              <div className="fw-bold text-dark text-truncate">
                                {account.username}
                                {isSelf && (
                                  <span className="badge bg-primary-subtle text-primary border border-primary-subtle ms-2" style={{ fontSize: '0.68rem' }}>
                                    Bạn
                                  </span>
                                )}
                              </div>
                              <div className="small text-muted text-truncate">{account.email}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className={`management-badge ${roleMeta.badgeClass}`}>
                            <span className="management-badge-dot"></span>
                            {roleMeta.label}
                          </span>
                        </td>
                        <td>
                          <span className={`management-badge ${statusMeta.badgeClass}`}>
                            <span className="management-badge-dot"></span>
                            {statusMeta.label}
                          </span>
                        </td>
                        <td className="small text-muted">{formatAdminDate(account.createdAt)}</td>
                        <td className="text-end">
                          <div className="management-actions">
                            <button
                              type="button"
                              className="management-action-btn btn-edit"
                              onClick={() => openRoleForm(account)}
                              disabled={isDisabled}
                              title={isSelf ? 'Không thể sửa tài khoản đang đăng nhập' : 'Thay đổi vai trò'}
                              aria-label={`Thay đổi vai trò ${account.username}`}
                            >
                              <i className="bi bi-person-gear"></i>
                            </button>
                            <button
                              type="button"
                              className={`management-action-btn ${account.isActive ? 'btn-flag' : 'btn-approve'}`}
                              onClick={() => handleStatus(account)}
                              disabled={isDisabled}
                              title={
                                isSelf
                                  ? 'Không thể đổi trạng thái tài khoản đang đăng nhập'
                                  : account.isActive
                                    ? 'Vô hiệu hóa tài khoản'
                                    : 'Kích hoạt lại tài khoản'
                              }
                              aria-label={account.isActive ? `Vô hiệu hóa ${account.username}` : `Kích hoạt ${account.username}`}
                            >
                              <i className={`bi ${account.isActive ? 'bi-slash-circle' : 'bi-check-circle'}`}></i>
                            </button>
                            <button
                              type="button"
                              className="management-action-btn btn-delete"
                              onClick={() => setAccountToDelete(account)}
                              disabled={isDisabled}
                              title={isSelf ? 'Không thể xóa tài khoản đang đăng nhập' : 'Xóa tài khoản'}
                              aria-label={`Xóa ${account.username}`}
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
            totalItems={total}
            itemLabel="tài khoản"
            isLoading={isLoading}
            onPageChange={(page) => {
              setIsLoading(true);
              setCurrentPage(page);
            }}
          />
        </div>
      </section>

      {isFormOpen && (
        <AccountFormModal
          account={selectedAccount}
          roles={roles}
          onClose={() => setIsFormOpen(false)}
          onSaved={handleSaved}
        />
      )}

      <ConfirmDeleteModal
        isOpen={Boolean(accountToDelete)}
        title="Xác nhận xóa tài khoản"
        message={
          <>
            Bạn có chắc muốn xóa tài khoản <strong>{accountToDelete?.username}</strong>? Hành động này không thể hoàn tác.
          </>
        }
        loading={Boolean(processingId)}
        onConfirm={confirmDeleteAccount}
        onClose={() => setAccountToDelete(null)}
      />
    </>
  );
}

export default AdminAccounts;
