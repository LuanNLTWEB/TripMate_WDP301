import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { accountApi } from '../services/api';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const emptyForm = {
  username: '', email: '', password: '', phone: '', dateOfBirth: '', gender: 'other', role: 'customer'
};

const formatDate = (date) => date ? new Date(date).toLocaleDateString('vi-VN') : '—';
const genderLabels = { male: 'Nam', female: 'Nữ', other: 'Khác' };

const roleLabels = {
  admin: 'Quản trị viên',
  staff: 'Nhân viên',
  tourProvider: 'Tour Provider',
  customer: 'Khách hàng'
};

const roleBadgeClasses = {
  admin: 'bg-warning text-dark',
  staff: 'bg-info text-dark',
  tourProvider: 'bg-primary',
  customer: 'bg-secondary'
};

function AccountForm({ account, onClose, onSaved }) {
  const toast = useToast();
  const isEditing = Boolean(account);
  const [formData, setFormData] = useState(account ? {
    phone: account.phone || '',
    dateOfBirth: account.dateOfBirth?.substring(0, 10) || '',
    gender: account.gender || 'other',
    role: account.role === 'user' ? 'customer' : account.role
  } : emptyForm);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
    setError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSaving(true);
    try {
      const data = isEditing ? { role: formData.role } : {
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

  return (
    <div className="modal d-block" tabIndex="-1" role="dialog" aria-modal="true">
      <div className="modal-dialog modal-lg modal-dialog-scrollable" role="document">
        <div className="modal-content">
          <form onSubmit={handleSubmit} noValidate>
            <div className="modal-header">
              <h5 className="modal-title">{isEditing ? 'Thay đổi vai trò' : 'Tạo tài khoản'}</h5>
              <button type="button" className="btn-close" onClick={onClose} disabled={isSaving} aria-label="Đóng"></button>
            </div>
            <div className="modal-body">
              {error && <div className="alert alert-danger small mb-3">{error}</div>}
              <div className="row g-3">
                {isEditing ? (
                  <div className="col-12">
                    <p className="mb-3"><span className="fw-semibold">{account.username}</span><br /><span className="small text-muted">{account.email}</span></p>
                    <div className="row g-3 mb-3 small">
                      <div className="col-md-4"><span className="text-muted d-block">Số điện thoại</span>{account.phone || 'Chưa cập nhật'}</div>
                      <div className="col-md-4"><span className="text-muted d-block">Ngày sinh</span>{formatDate(account.dateOfBirth)}</div>
                      <div className="col-md-4"><span className="text-muted d-block">Giới tính</span>{genderLabels[account.gender] || 'Chưa cập nhật'}</div>
                    </div>
                    <label className="form-label small fw-medium" htmlFor="account-role">Vai trò</label>
                    <select className="form-select" id="account-role" name="role" value={formData.role} onChange={handleChange} disabled={isSaving}>
                      <option value="admin">Quản trị viên</option>
                      <option value="staff">Nhân viên</option>
                      <option value="tourProvider">Tour Provider</option>
                      <option value="customer">Khách hàng</option>
                    </select>
                  </div>
                ) : <>
                <div className="col-md-6">
                  <label className="form-label small fw-medium" htmlFor="account-username">Tên người dùng</label>
                  <input className="form-control" id="account-username" name="username" value={formData.username} onChange={handleChange} required disabled={isSaving} />
                </div>
                <div className="col-md-6">
                  <label className="form-label small fw-medium" htmlFor="account-email">Email</label>
                  <input type="email" className="form-control" id="account-email" name="email" value={formData.email} onChange={handleChange} required disabled={isSaving} />
                </div>
                <div className="col-md-6">
                  <label className="form-label small fw-medium" htmlFor="account-password">Mật khẩu {isEditing && '(để trống nếu không đổi)'}</label>
                  <input type="password" className="form-control" id="account-password" name="password" value={formData.password} onChange={handleChange} required={!isEditing} minLength="6" disabled={isSaving} />
                  <div className="form-text">Tối thiểu 6 ký tự, gồm chữ hoa, chữ thường và số.</div>
                </div>
                <div className="col-md-6">
                  <label className="form-label small fw-medium" htmlFor="account-phone">Số điện thoại</label>
                  <input type="tel" className="form-control" id="account-phone" name="phone" value={formData.phone} onChange={handleChange} disabled={isSaving} required />
                </div>
                <div className="col-md-6">
                  <label className="form-label small fw-medium" htmlFor="account-dob">Ngày sinh</label>
                  <input type="date" className="form-control" id="account-dob" name="dateOfBirth" value={formData.dateOfBirth} onChange={handleChange} max={new Date().toISOString().split('T')[0]} disabled={isSaving} />
                </div>
                <div className="col-md-6">
                  <label className="form-label small fw-medium" htmlFor="account-gender">Giới tính</label>
                  <select className="form-select" id="account-gender" name="gender" value={formData.gender} onChange={handleChange} disabled={isSaving}>
                    <option value="male">Nam</option><option value="female">Nữ</option><option value="other">Khác</option>
                  </select>
                </div>
                <div className="col-md-6">
                  <label className="form-label small fw-medium" htmlFor="account-role">Vai trò</label>
                  <select className="form-select" id="account-role" name="role" value={formData.role} onChange={handleChange} disabled={isSaving}>
                    <option value="admin">Quản trị viên</option>
                    <option value="staff">Nhân viên</option>
                    <option value="tourProvider">Tour Provider</option>
                    <option value="customer">Khách hàng</option>
                  </select>
                </div>
                </>}
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline-secondary" onClick={onClose} disabled={isSaving}>Hủy</button>
              <button type="submit" className="btn btn-primary" disabled={isSaving}>
                {isSaving ? 'Đang lưu...' : 'Lưu tài khoản'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function AdminAccounts() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const toast = useToast();
  const [accounts, setAccounts] = useState([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [processingId, setProcessingId] = useState('');

  const loadAccounts = async (searchTerm = search) => {
    setIsLoading(true);
    try {
      const response = await accountApi.getAll(searchTerm);
      setAccounts(response.accounts || []);
      setError('');
    } catch (requestError) {
      setError(requestError.message || 'Không thể tải danh sách tài khoản.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { replace: true, state: { from: { pathname: '/admin/accounts' } } });
    } else if (user?.role !== 'admin') {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate, user]);

  useEffect(() => {
    if (user?.role !== 'admin') return;
    const timer = setTimeout(() => loadAccounts(search), 300);
    return () => clearTimeout(timer);
  }, [search, user?.role]);

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
    await loadAccounts();
  };

  const handleStatus = async (account) => {
    setProcessingId(account.id);
    try {
      const response = await accountApi.setStatus(account.id, !account.isActive);
      toast.success(response.message || 'Đã cập nhật trạng thái tài khoản.');
      await loadAccounts();
    } catch (requestError) {
      toast.error(requestError.message || 'Không thể cập nhật trạng thái tài khoản.');
    } finally {
      setProcessingId('');
    }
  };

  const handleDelete = async (account) => {
    if (!window.confirm(`Bạn có chắc muốn xóa tài khoản ${account.username}?`)) return;
    setProcessingId(account.id);
    try {
      const response = await accountApi.remove(account.id);
      toast.success(response.message || 'Đã xóa tài khoản.');
      await loadAccounts();
    } catch (requestError) {
      toast.error(requestError.message || 'Không thể xóa tài khoản.');
    } finally {
      setProcessingId('');
    }
  };

  if (!isAuthenticated || user?.role !== 'admin') return null;

  return (
    <>
      <Navbar />
      <main className="py-5 bg-light flex-grow-1">
        <div className="container">
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
            <div>
              <h1 className="h3 fw-bold mb-1">Quản lý tài khoản</h1>
            </div>
            <button className="btn btn-primary" onClick={openCreateForm}><i className="bi bi-person-plus me-2"></i>Tạo tài khoản</button>
          </div>
          {error && <div className="alert alert-danger alert-dismissible fade show" role="alert">{error}<button type="button" className="btn-close" onClick={() => setError('')} aria-label="Đóng"></button></div>}
          <div className="card shadow-sm border-0">
            <div className="card-body p-3 p-md-4">
              <div className="input-group mb-4">
                <span className="input-group-text bg-white"><i className="bi bi-search"></i></span>
                <input type="search" className="form-control" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm theo tên người dùng hoặc email" aria-label="Tìm kiếm tài khoản" />
              </div>
              <div className="table-responsive">
                <table className="table align-middle mb-0">
                  <thead><tr><th>Tài khoản</th><th>Vai trò</th><th>Trạng thái</th><th>Ngày tạo</th><th className="text-end">Thao tác</th></tr></thead>
                  <tbody>
                    {isLoading ? <tr><td colSpan="5" className="text-center py-5"><span className="spinner-border spinner-border-sm me-2"></span>Đang tải...</td></tr> : accounts.length === 0 ? <tr><td colSpan="5" className="text-center text-muted py-5">Không tìm thấy tài khoản phù hợp.</td></tr> : accounts.map((account) => (
                      <tr key={account.id}>
                        <td><div className="fw-semibold">{account.username}</div><div className="small text-muted">{account.email}</div></td>
                        <td><span className={`badge ${roleBadgeClasses[account.role] || 'bg-secondary'}`}>{roleLabels[account.role] || account.role}</span></td>
                        <td><span className={`badge ${account.isActive ? 'bg-success' : 'bg-danger'}`}>{account.isActive ? 'Đang hoạt động' : 'Đã vô hiệu hóa'}</span></td>
                        <td className="small text-muted">{formatDate(account.createdAt)}</td>
                        <td><div className="d-flex justify-content-end gap-2 flex-wrap">
                          <button className="btn btn-sm btn-outline-primary" onClick={() => openRoleForm(account)} disabled={processingId === account.id || account.id === user.id}>Role</button>
                          <button className={`btn btn-sm ${account.isActive ? 'btn-outline-warning' : 'btn-outline-success'}`} onClick={() => handleStatus(account)} disabled={processingId === account.id || account.id === user.id}>{account.isActive ? 'Vô hiệu hóa' : 'Kích hoạt'}</button>
                          <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(account)} disabled={processingId === account.id || account.id === user.id}>Xóa</button>
                        </div></td>
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
      {isFormOpen && <><div className="modal-backdrop fade show"></div><AccountForm account={selectedAccount} onClose={() => setIsFormOpen(false)} onSaved={handleSaved} /></>}
    </>
  );
}

export default AdminAccounts;
