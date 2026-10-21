import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { announcementApi } from '../services/api';
import { useToast } from '../hooks/useToast';
import { getAnnouncementAudience, formatAnnouncementDateTime } from '../utils/announcementFormatters';
import AnnouncementFormModal from '../components/AnnouncementFormModal';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal';

function StaffAnnouncementDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [announcement, setAnnouncement] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadAnnouncement = async () => {
    setIsLoading(true);
    try {
      const response = await announcementApi.getById(id);
      setAnnouncement(response.data);
      setError('');
    } catch (err) {
      setError(err.message || 'Không thể tải chi tiết thông báo.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAnnouncement();
  }, [id]);

  const handleUpdate = async (payload) => {
    setIsSaving(true);
    try {
      const response = await announcementApi.update(id, payload);
      toast.success(response.message || 'Đã cập nhật thông báo thành công.');
      setIsEditOpen(false);
      await loadAnnouncement();
    } catch (err) {
      toast.error(err.message || 'Không thể cập nhật thông báo.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const response = await announcementApi.delete(id);
      toast.success(response.message || 'Đã xóa thông báo thành công.');
      navigate('/management/announcements');
    } catch (err) {
      toast.error(err.message || 'Không thể xóa thông báo.');
      setShowDeleteModal(false);
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <section className="management-page-section">
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Đang tải...</span>
          </div>
          <p className="text-muted mt-2 mb-0">Đang tải thông tin thông báo...</p>
        </div>
      </section>
    );
  }

  if (error || !announcement) {
    return (
      <section className="management-page-section">
        <div className="alert alert-danger mb-4">{error || 'Không tìm thấy thông báo.'}</div>
        <Link to="/management/announcements" className="btn btn-outline-primary d-inline-flex align-items-center gap-2">
          <i className="bi bi-arrow-left"></i>
          <span>Quay lại danh sách thông báo</span>
        </Link>
      </section>
    );
  }

  const isDraft = !announcement.isActive;

  return (
    <>
      <section className="management-page-section">
        {/* Top Heading */}
        <div className="management-page-heading mb-4">
          <nav aria-label="breadcrumb" className="mb-2">
            <ol className="breadcrumb small mb-0">
              <li className="breadcrumb-item">
                <Link to="/management/announcements" className="text-decoration-none text-muted">
                  Thông báo hệ thống
                </Link>
              </li>
              <li className="breadcrumb-item active text-primary fw-semibold" aria-current="page">
                Chi tiết thông báo
              </li>
            </ol>
          </nav>
          <h1 className="text-dark fw-bold mb-2">{announcement.title}</h1>
          <div className="d-flex align-items-center gap-2 flex-wrap">
            <span className={`management-badge ${isDraft ? 'badge-secondary' : 'badge-success'}`}>
              <span className="management-badge-dot"></span>
              {isDraft ? 'Bản nháp' : 'Đang phát hành'}
            </span>
            <span className="text-muted small">•</span>
            <span className="text-muted small">
              Chi tiết thông báo hệ thống được lưu trữ và hiển thị cho người dùng.
            </span>
          </div>
        </div>

        {/* Content Layout */}
        <div className="row g-4">
          {/* Main Article Body */}
          <div className="col-12 col-lg-8">
            <div className="card border-0 shadow-sm rounded-4 p-4 p-md-5 bg-white">
              <div className="d-flex align-items-center gap-2 mb-3 flex-wrap">
                <span className={`badge ${getAnnouncementAudience(announcement.audience).className} px-2.5 py-1.5 fw-semibold`}>
                  {getAnnouncementAudience(announcement.audience).label}
                </span>
                <span className="text-muted small">
                  <i className="bi bi-calendar3 me-1"></i>
                  {new Date(announcement.createdAt).toLocaleDateString('vi-VN')}
                </span>
                {announcement.createdBy?.username && (
                  <span className="text-muted small">
                    <i className="bi bi-person me-1"></i>
                    Đăng bởi <strong>{announcement.createdBy.username}</strong>
                  </span>
                )}
              </div>

              <h2 className="h4 fw-bold text-dark mb-4 pb-3 border-bottom">
                {announcement.title}
              </h2>

              <div
                className="text-secondary lh-lg mb-0"
                style={{
                  fontSize: '1.02rem',
                  whiteSpace: 'pre-line',
                  letterSpacing: '0.01em'
                }}
              >
                {announcement.content}
              </div>
            </div>
          </div>

          {/* Sidebar Admin Details & Actions */}
          <div className="col-12 col-lg-4">
            {/* Quick Actions Card */}
            <div className="card border-0 shadow-sm rounded-4 p-4 bg-white mb-4">
              <h6 className="fw-bold text-dark mb-3 d-flex align-items-center gap-2">
                <i className="bi bi-sliders text-primary"></i>
                <span>Thao tác quản trị</span>
              </h6>
              <div className="d-flex flex-column gap-2">
                <button
                  type="button"
                  className="btn btn-primary w-100 d-inline-flex align-items-center justify-content-center gap-2 py-2 fw-semibold"
                  onClick={() => setIsEditOpen(true)}
                >
                  <i className="bi bi-pencil-square"></i>
                  <span>Chỉnh sửa thông báo</span>
                </button>
                <button
                  type="button"
                  className="btn btn-outline-danger w-100 d-inline-flex align-items-center justify-content-center gap-2 py-2 fw-semibold"
                  onClick={() => setShowDeleteModal(true)}
                >
                  <i className="bi bi-trash"></i>
                  <span>Xóa thông báo</span>
                </button>
              </div>
            </div>

            <div className="card border-0 shadow-sm rounded-4 p-4 bg-white mb-4">
              <h6 className="fw-bold text-dark mb-3 d-flex align-items-center gap-2">
                <i className="bi bi-info-circle text-primary"></i>
                <span>Thông tin quản trị</span>
              </h6>

              <div className="d-flex flex-column gap-3 small">
                <div>
                  <span className="text-muted d-block mb-1">Mã thông báo</span>
                  <code className="text-dark bg-light px-2 py-0.5 rounded font-monospace">{announcement._id}</code>
                </div>

                <div className="border-top pt-2">
                  <span className="text-muted d-block mb-1">Đối tượng tiếp nhận</span>
                  <span className={`badge ${getAnnouncementAudience(announcement.audience).className} px-2.5 py-1.5 fw-semibold`}>
                    {getAnnouncementAudience(announcement.audience).label}
                  </span>
                </div>

                <div className="border-top pt-2">
                  <span className="text-muted d-block mb-1">Trạng thái phát hành</span>
                  <span className={`management-badge ${isDraft ? 'badge-secondary' : 'badge-success'}`}>
                    <span className="management-badge-dot"></span>
                    {isDraft ? 'Bản nháp' : 'Đang phát hành'}
                  </span>
                </div>

                {announcement.createdAt && (
                  <div className="border-top pt-2">
                    <span className="text-muted d-block mb-1">Ngày tạo</span>
                    <strong className="text-dark">{new Date(announcement.createdAt).toLocaleString('vi-VN')}</strong>
                  </div>
                )}

                {announcement.updatedAt && (
                  <div className="border-top pt-2">
                    <span className="text-muted d-block mb-1">Cập nhật lần cuối</span>
                    <strong className="text-dark">{new Date(announcement.updatedAt).toLocaleString('vi-VN')}</strong>
                  </div>
                )}

                {announcement.updatedBy?.username && (
                  <div className="border-top pt-2">
                    <span className="text-muted d-block mb-1">Người sửa gần nhất</span>
                    <strong className="text-dark">{announcement.updatedBy.username}</strong>
                  </div>
                )}
              </div>
            </div>

            <div className="card border-0 shadow-sm rounded-4 p-4 bg-white">
              <h6 className="fw-bold text-dark mb-2 d-flex align-items-center gap-2">
                <i className="bi bi-eye text-primary"></i>
                <span>Xem trang công khai</span>
              </h6>
              <p className="small text-muted mb-3">
                Xem giao diện bài viết như khách hàng hoặc người dùng khi truy cập trên hệ thống.
              </p>
              <a
                href={`/announcements/${announcement._id}`}
                target="_blank"
                rel="noreferrer"
                className="btn btn-outline-secondary w-100 btn-sm d-inline-flex align-items-center justify-content-center gap-2"
              >
                <i className="bi bi-box-arrow-up-right"></i>
                <span>Mở trang bài viết</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Edit Form Modal */}
      {isEditOpen && (
        <AnnouncementFormModal
          announcement={announcement}
          saving={isSaving}
          onClose={() => setIsEditOpen(false)}
          onSubmit={handleUpdate}
        />
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={showDeleteModal}
        title="Xác nhận xóa thông báo"
        message={
          <>
            Bạn có chắc chắn muốn xóa thông báo <strong>{announcement.title}</strong>?
            <br />
            <small className="text-muted">
              Thao tác này sẽ xóa vĩnh viễn thông báo khỏi hệ thống.
            </small>
          </>
        }
        loading={isDeleting}
        onConfirm={handleDelete}
        onClose={() => setShowDeleteModal(false)}
      />
    </>
  );
}

export default StaffAnnouncementDetails;
