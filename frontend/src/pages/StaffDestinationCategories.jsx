import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { destinationCategoryApi } from '../services/api';
import CategoryFormModal from '../components/CategoryFormModal';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal';
import ManagementPagination from '../components/management/ManagementPagination';

const PAGE_SIZE = 10;

function StaffDestinationCategories() {
  const { user } = useAuth();
  const toast = useToast();
  const [categories, setCategories] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalState, setModalState] = useState({ open: false, category: null });
  const [isSaving, setIsSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [categoryToDelete, setCategoryToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

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
    if (user?.role !== 'staff') return;
    loadCategories();
  }, [user?.role]);

  const handleSearchChange = (e) => {
    setSearch(e.target.value);
    setCurrentPage(1);
  };

  const openCreateModal = () => {
    setModalState({ open: true, category: null });
  };

  const openEditModal = (category) => {
    setModalState({ open: true, category });
  };

  const closeModal = () => {
    if (!isSaving) {
      setModalState({ open: false, category: null });
    }
  };

  const handleFormSubmit = async (payload) => {
    setIsSaving(true);
    const isEditing = Boolean(modalState.category?._id);

    try {
      if (isEditing) {
        await destinationCategoryApi.update(modalState.category._id, payload);
        toast.success('Đã cập nhật danh mục điểm đến.');
      } else {
        await destinationCategoryApi.create(payload);
        toast.success('Đã tạo danh mục điểm đến mới.');
      }
      setModalState({ open: false, category: null });
      await loadCategories();
    } catch (requestError) {
      toast.error(requestError.message || 'Không thể lưu danh mục.');
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDeleteCategory = async () => {
    if (!categoryToDelete) return;
    setIsDeleting(true);
    try {
      await destinationCategoryApi.remove(categoryToDelete._id);
      toast.success(`Đã xóa danh mục "${categoryToDelete.name}".`);
      setCategoryToDelete(null);
      await loadCategories();
    } catch (requestError) {
      toast.error(requestError.message || 'Không thể xóa danh mục.');
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredCategories = categories.filter((cat) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return cat.name?.toLowerCase().includes(q) || cat.description?.toLowerCase().includes(q);
  });
  const totalPages = Math.ceil(filteredCategories.length / PAGE_SIZE) || 1;
  const paginatedCategories = filteredCategories.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

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
          onClick={openCreateModal}
        >
          <i className="bi bi-plus-lg"></i>
          <span>Thêm danh mục</span>
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
              onChange={handleSearchChange}
              placeholder="Tìm kiếm danh mục theo tên hoặc mô tả..."
              aria-label="Tìm kiếm danh mục"
            />
          </div>
          <div className="text-muted small">
            Hiển thị <strong>{paginatedCategories.length}</strong> / {filteredCategories.length} danh mục
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
              ) : paginatedCategories.length === 0 ? (
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
                paginatedCategories.map((category) => (
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
                          onClick={() => openEditModal(category)}
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

        <ManagementPagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filteredCategories.length}
          itemLabel="danh mục"
          isLoading={isLoading}
          onPageChange={(page) => setCurrentPage(page)}
        />
      </div>

      <CategoryFormModal
        isOpen={modalState.open}
        category={modalState.category}
        type="destination"
        saving={isSaving}
        onClose={closeModal}
        onSubmit={handleFormSubmit}
      />

      <ConfirmDeleteModal
        isOpen={Boolean(categoryToDelete)}
        title="Xác nhận xóa danh mục điểm đến"
        message={
          <>
            Bạn có chắc chắn muốn xóa danh mục <strong>{categoryToDelete?.name}</strong>?
          </>
        }
        loading={isDeleting}
        onConfirm={confirmDeleteCategory}
        onClose={() => setCategoryToDelete(null)}
      />
    </section>
  );
}

export default StaffDestinationCategories;
