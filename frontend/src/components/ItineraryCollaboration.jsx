import { useState } from 'react';
import { itineraryApi } from '../services/api';
import { useToast } from '../hooks/useToast';
import CustomSelect from './CustomSelect';

/**
 * Collaboration state & handlers for the itinerary page.
 * Covers: Invite Collaborator, Respond to Itinerary Invitation,
 * View Collaborator List, Change Collaborator Role.
 *
 * @param {object} params
 * @param {object|null} params.selected - currently selected itinerary
 * @param {Function} params.setSelected - parent setter for selected itinerary
 * @param {Function} params.setActiveTab - parent setter for the active tab
 * @param {Function} params.applyItinerary - apply an updated itinerary to parent state
 * @param {Function} params.setSharedItineraries - parent setter for shared itineraries
 */
export default function useCollaboration({
  selected,
  setSelected,
  setActiveTab,
  applyItinerary,
  setSharedItineraries
}) {
  const toast = useToast();

  const [removingCollaboratorId, setRemovingCollaboratorId] = useState(null);
  const [deletingInvitationId, setDeletingInvitationId] = useState(null);
  const [changingRoleId, setChangingRoleId] = useState(null);
  const [inviteForm, setInviteForm] = useState({
    email: '',
    permission: 'view',
    submitting: false,
    error: ''
  });
  const [receivedInvites, setReceivedInvites] = useState([]);
  const [respondingId, setRespondingId] = useState(null);
  const [membersModal, setMembersModal] = useState({
    open: false,
    loading: false,
    owner: null,
    collaborators: [],
    invitations: []
  });

  const handleRemoveCollaborator = async (userId) => {
    if (!selected) return;

    setRemovingCollaboratorId(userId);
    try {
      const response = await itineraryApi.removeCollaborator(selected._id, userId);
      applyItinerary(response.itinerary);
      toast.success(response.message || 'Đã hủy quyền cộng tác viên thành công.');
      if (membersModal.open) {
        await reloadMembers();
      }
    } catch (err) {
      toast.error(err.message || 'Không thể hủy quyền cộng tác viên.');
    } finally {
      setRemovingCollaboratorId(null);
    }
  };

  const handleChangeRole = async (userId, permission) => {
    if (!selected) return;

    setChangingRoleId(userId);
    try {
      const response = await itineraryApi.changeCollaboratorRole(selected._id, userId, permission);
      toast.success(response.message || 'Đã đổi quyền cộng tác viên.');
    } catch (err) {
      toast.error(err.message || 'Không thể đổi quyền cộng tác viên.');
    } finally {
      if (membersModal.open) {
        await reloadMembers();
      }
      setChangingRoleId(null);
    }
  };

  const handleDeleteSentInvitation = async (invitation) => {
    if (!selected || deletingInvitationId === invitation._id) return;

    const invitee = invitation.recipient?.username || invitation.recipient?.email || 'người dùng này';
    const isPending = invitation.status === 'pending';
    const confirmed = window.confirm(
      isPending
        ? `Hủy lời mời cộng tác gửi cho ${invitee}?`
        : `Xóa lịch sử lời mời của ${invitee}?`
    );
    if (!confirmed) return;

    setDeletingInvitationId(invitation._id);
    try {
      const response = await itineraryApi.deleteSentInvitation(selected._id, invitation._id);
      toast.success(response.message || (isPending ? 'Đã hủy lời mời.' : 'Đã xóa lịch sử lời mời.'));
      await reloadMembers();
    } catch (err) {
      toast.error(err.message || 'Không thể xóa lời mời.');
    } finally {
      setDeletingInvitationId(null);
    }
  };

  const handleRespondInvitation = async (notificationId, action) => {
    const received = receivedInvites.find((invite) => invite._id === notificationId);
    const acceptedItineraryId = received?.itinerary?._id;

    setRespondingId(notificationId);
    try {
      const response = await itineraryApi.respondInvitation(notificationId, action);
      toast.success(response.message || (action === 'accept' ? 'Đã chấp nhận lời mời.' : 'Đã từ chối lời mời.'));

      const [inviteResponse, sharedResponse] = await Promise.all([
        itineraryApi.listReceivedInvitations('pending'),
        itineraryApi.listShared()
      ]);
      setReceivedInvites(inviteResponse.invitations || []);
      setSharedItineraries(sharedResponse.itineraries || []);

      if (action === 'accept' && acceptedItineraryId) {
        const accepted = (sharedResponse.itineraries || []).find(
          (itinerary) => itinerary._id === acceptedItineraryId
        );
        if (accepted) {
          setSelected(accepted);
          setActiveTab('shared');
        }
      }
    } catch (err) {
      toast.error(err.message || 'Không thể xử lý lời mời.');
    } finally {
      setRespondingId(null);
    }
  };

  const reloadMembers = async () => {
    if (!selected) return;
    try {
      const response = await itineraryApi.listCollaborators(selected._id);
      setMembersModal({
        open: true,
        loading: false,
        owner: response.owner || null,
        collaborators: response.collaborators || [],
        invitations: response.invitations || []
      });
    } catch {
      // giữ dữ liệu hiện tại nếu làm mới thất bại
    }
  };

  const openMembersModal = async () => {
    if (!selected) return;

    setInviteForm({ email: '', permission: 'view', submitting: false, error: '' });
    setMembersModal({ open: true, loading: true, owner: null, collaborators: [], invitations: [] });
    try {
      const response = await itineraryApi.listCollaborators(selected._id);
      setMembersModal({
        open: true,
        loading: false,
        owner: response.owner || null,
        collaborators: response.collaborators || [],
        invitations: response.invitations || []
      });
    } catch (err) {
      toast.error(err.message || 'Không thể tải danh sách cộng tác viên.');
      setMembersModal({ open: false, loading: false, owner: null, collaborators: [], invitations: [] });
    }
  };

  const closeMembersModal = () => {
    if (membersModal.loading || inviteForm.submitting) return;
    setMembersModal({ open: false, loading: false, owner: null, collaborators: [], invitations: [] });
    setInviteForm({ email: '', permission: 'view', submitting: false, error: '' });
  };

  const handleInviteCollaborator = async (e) => {
    e.preventDefault();
    if (!selected || !inviteForm.email.trim()) return;

    setInviteForm((prev) => ({ ...prev, submitting: true, error: '' }));
    try {
      const response = await itineraryApi.invite(selected._id, {
        email: inviteForm.email.trim().toLowerCase(),
        permission: inviteForm.permission
      });
      toast.success(response.message || 'Đã gửi lời mời cộng tác.');
      setInviteForm((prev) => ({ ...prev, email: '', submitting: false }));
      await reloadMembers();
    } catch (err) {
      setInviteForm((prev) => ({
        ...prev,
        submitting: false,
        error: err.message || 'Không thể gửi lời mời cộng tác.'
      }));
    }
  };

  return {
    receivedInvites,
    setReceivedInvites,
    respondingId,
    membersModal,
    inviteForm,
    setInviteForm,
    removingCollaboratorId,
    deletingInvitationId,
    changingRoleId,
    handleRemoveCollaborator,
    handleDeleteSentInvitation,
    handleChangeRole,
    handleRespondInvitation,
    handleInviteCollaborator,
    openMembersModal,
    closeMembersModal
  };
}

export function CollaborationBanner({ collab }) {
  const { receivedInvites, respondingId, handleRespondInvitation } = collab;

  if (!receivedInvites || receivedInvites.length === 0) return null;

  return (
                <div className="card border-0 shadow-sm mb-4 border-start border-primary border-3">
                  <div className="card-body p-4">
                    <h2 className="h5 fw-bold mb-1">
                      <i className="bi bi-envelope-paper me-2 text-primary"></i>
                      Lời mời cộng tác ({receivedInvites.length})
                    </h2>
                    <p className="text-muted small mb-3">
                      Bạn được mời tham gia lịch trình nhóm. Chấp nhận để bắt đầu cộng tác cùng mọi người.
                    </p>
                    <div className="vstack gap-2">
                      {receivedInvites.map((invitation) => {
                        const inviterName = invitation.invitedBy?.username
                          || invitation.invitedBy?.email
                          || 'Người dùng';
                        const isResponding = respondingId === invitation._id;
                        return (
                          <div
                            key={invitation._id}
                            className="border rounded p-3 d-flex flex-wrap justify-content-between align-items-center gap-2 bg-light"
                          >
                            <div className="min-w-0">
                              <div className="fw-semibold text-dark text-truncate">
                                {invitation.itinerary?.title || 'Lịch trình đã bị xóa'}
                                <span className={`badge ms-2 ${invitation.permission === 'edit' ? 'text-bg-warning' : 'text-bg-secondary'}`}>
                                  {invitation.permission === 'edit' ? 'Chỉnh sửa' : 'Chỉ xem'}
                                </span>
                              </div>
                              <small className="text-muted">
                                <i className="bi bi-person me-1"></i>
                                {inviterName}
                                {invitation.createdAt && (
                                  <span> · {new Date(invitation.createdAt).toLocaleString('vi-VN')}</span>
                                )}
                              </small>
                            </div>
                            <div className="d-flex gap-2 flex-shrink-0">
                              <button
                                type="button"
                                className="btn btn-success btn-sm"
                                disabled={isResponding}
                                onClick={() => handleRespondInvitation(invitation._id, 'accept')}
                              >
                                {isResponding ? (
                                  <span className="spinner-border spinner-border-sm" aria-hidden="true"></span>
                                ) : (
                                  <i className="bi bi-check2 me-1"></i>
                                )}
                                Chấp nhận
                              </button>
                              <button
                                type="button"
                                className="btn btn-outline-secondary btn-sm"
                                disabled={isResponding}
                                onClick={() => handleRespondInvitation(invitation._id, 'decline')}
                              >
                                <i className="bi bi-x-lg me-1"></i>
                                Từ chối
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
  );
}


export function CollaboratorModal({ collab, selected, isOwner }) {
  const {
    membersModal,
    inviteForm,
    setInviteForm,
    handleInviteCollaborator,
    handleRemoveCollaborator,
    handleDeleteSentInvitation,
    handleChangeRole,
    closeMembersModal,
    removingCollaboratorId,
    deletingInvitationId,
    changingRoleId
  } = collab;

  if (!membersModal.open) return null;

  return (
    <>
          <div className="modal-backdrop fade show"></div>
          <div className="modal fade show d-block" tabIndex="-1" role="dialog" aria-modal="true">
            <div className="modal-dialog modal-dialog-centered modal-lg tm-collaborator-modal-dialog">
              <div className="modal-content border-0 shadow tm-collaborator-modal">
                <div className="modal-header">
                  <h5 className="modal-title fw-bold">
                    <i className="bi bi-people me-2 text-primary"></i>
                    Cộng tác viên
                  </h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={closeMembersModal}
                    disabled={membersModal.loading}
                    aria-label="Đóng"
                  ></button>
                </div>
                <div className="modal-body">
                  <p className="text-muted small mb-3">
                    Lịch trình <strong>{selected?.title}</strong> có{' '}
                    <strong>{1 + membersModal.collaborators.length}</strong> người tham gia.
                  </p>

                  {membersModal.loading ? (
                    <div className="text-center py-4">
                      <span className="spinner-border spinner-border-sm text-muted" aria-hidden="true"></span>
                    </div>
                  ) : (
                    <>
                      {isOwner && (
                        <form onSubmit={handleInviteCollaborator} className="border rounded p-3 mb-3 bg-light">
                          <h6 className="fw-semibold small text-uppercase text-muted mb-2">
                            <i className="bi bi-person-plus me-1"></i>
                            Gửi lời mời
                          </h6>
                          {inviteForm.error && (
                            <div className="alert alert-danger py-2 small mb-2">
                              <i className="bi bi-exclamation-circle me-1"></i>
                              {inviteForm.error}
                            </div>
                          )}
                          <div className="row g-2 align-items-end">
                            <div className="col">
                              <label className="form-label small fw-semibold mb-1" htmlFor="invite-email">
                                Email người được mời
                              </label>
                              <input
                                id="invite-email"
                                type="email"
                                className="form-control"
                                style={{ minHeight: '42px' }}
                                placeholder="nguoidung@example.com"
                                value={inviteForm.email}
                                onChange={(e) => setInviteForm((prev) => ({ ...prev, email: e.target.value, error: '' }))}
                                required
                                disabled={inviteForm.submitting}
                              />
                            </div>
                            <div className="col">
                              <label className="form-label small fw-semibold mb-1" htmlFor="invite-permission">
                                Vai trò
                              </label>
                              <CustomSelect
                                id="invite-permission"
                                value={inviteForm.permission}
                                onChange={(e, val) => setInviteForm((prev) => ({ ...prev, permission: val || e.target.value }))}
                                disabled={inviteForm.submitting}
                                options={[
                                  { value: 'view', label: 'Chỉ xem', icon: 'bi bi-eye' },
                                  { value: 'edit', label: 'Chỉnh sửa', icon: 'bi bi-pencil-square' }
                                ]}
                              />
                            </div>
                            <div className="col-auto">
                              <button
                                type="submit"
                                className="btn btn-primary btn-sm"
                                disabled={inviteForm.submitting}
                                title="Gửi lời mời"
                              >
                                {inviteForm.submitting ? (
                                  <span className="spinner-border spinner-border-sm" aria-hidden="true"></span>
                                ) : (
                                  <i className="bi bi-send"></i>
                                )}
                              </button>
                            </div>
                          </div>
                        </form>
                      )}

                      <h6 className="fw-semibold small text-uppercase text-muted mb-2">Chủ sở hữu</h6>
                      <div className="tm-collaborator-list mb-3">
                        <div className="tm-collaborator-item">
                          <div className="d-flex align-items-center min-w-0 flex-grow-1">
                            <div className="tm-collaborator-avatar">
                              {(membersModal.owner?.username || 'O').charAt(0).toUpperCase()}
                            </div>
                            <div className="tm-collaborator-meta">
                              <div className="tm-collaborator-name">
                                {membersModal.owner?.username || 'Người dùng'}
                              </div>
                              {membersModal.owner?.email && (
                                <div className="tm-collaborator-email">{membersModal.owner.email}</div>
                              )}
                            </div>
                          </div>
                          <div className="d-flex align-items-center gap-2 ms-2 flex-shrink-0">
                            <span className="tm-collaborator-badge badge-owner">Chủ sở hữu</span>
                          </div>
                        </div>
                      </div>

                      <h6 className="fw-semibold small text-uppercase text-muted mb-2">
                        Thành viên ({membersModal.collaborators.length})
                      </h6>
                      {membersModal.collaborators.length === 0 ? (
                        <div className="tm-list-empty py-3 mb-3">
                          <i className="bi bi-people tm-list-empty-icon" style={{ fontSize: '1.4rem' }}></i>
                          Chưa có cộng tác viên nào tham gia lịch trình này.
                        </div>
                      ) : (
                        <div className="tm-collaborator-list mb-3" style={{ maxHeight: '260px', overflowY: 'auto', overflowX: 'hidden' }}>
                          {membersModal.collaborators.map((c) => {
                            const collabUserId = c.user?._id || c.user;
                            const displayName = c.user?.username || 'Người dùng';
                            const joinedLabel = c.joinedAt
                              ? new Date(c.joinedAt).toLocaleDateString('vi-VN')
                              : '';
                            return (
                              <div key={collabUserId} className="tm-collaborator-item">
                                <div className="d-flex align-items-center min-w-0 flex-grow-1">
                                  <div className="tm-collaborator-avatar">{displayName.charAt(0).toUpperCase()}</div>
                                  <div className="tm-collaborator-meta">
                                    <div className="tm-collaborator-name">{displayName}</div>
                                    <div className="tm-collaborator-email">
                                      {c.user?.email || ''}
                                      {joinedLabel && <span> · Tham gia {joinedLabel}</span>}
                                    </div>
                                  </div>
                                </div>
                                <div className="d-flex align-items-center gap-2 ms-2 flex-shrink-0">
                                  {isOwner ? (
                                    <div className="btn-group btn-group-sm" role="group" aria-label="Quyền cộng tác viên">
                                      <button
                                        type="button"
                                        className={`btn ${c.permission === 'view' ? 'btn-primary' : 'btn-outline-secondary'}`}
                                        title="Chỉ xem"
                                        disabled={changingRoleId === collabUserId || removingCollaboratorId === collabUserId}
                                        onClick={() => handleChangeRole(collabUserId, 'view')}
                                      >
                                        Chỉ xem
                                      </button>
                                      <button
                                        type="button"
                                        className={`btn ${c.permission === 'edit' ? 'btn-primary' : 'btn-outline-secondary'}`}
                                        title="Chỉnh sửa"
                                        disabled={changingRoleId === collabUserId || removingCollaboratorId === collabUserId}
                                        onClick={() => handleChangeRole(collabUserId, 'edit')}
                                      >
                                        Chỉnh sửa
                                      </button>
                                    </div>
                                  ) : (
                                    <span className={`tm-collaborator-badge ${c.permission === 'edit' ? 'badge-edit' : 'badge-view'}`}>
                                      {c.permission === 'edit' ? 'Chỉnh sửa' : 'Chỉ xem'}
                                    </span>
                                  )}
                                  {isOwner && (
                                    <button
                                      type="button"
                                      className="btn btn-outline-danger btn-sm py-1 px-2 border-0"
                                      title="Hủy quyền cộng tác viên"
                                      disabled={removingCollaboratorId === collabUserId || inviteForm.submitting || changingRoleId === collabUserId}
                                      onClick={() => handleRemoveCollaborator(collabUserId)}
                                    >
                                      {removingCollaboratorId === collabUserId ? (
                                        <span className="spinner-border spinner-border-sm" aria-hidden="true"></span>
                                      ) : (
                                        <i className="bi bi-trash3 text-danger"></i>
                                      )}
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {isOwner && (
                        <>
                          <h6 className="fw-semibold small text-uppercase text-muted mb-2">
                            Lời mời đã gửi ({membersModal.invitations.length})
                          </h6>
                          {membersModal.invitations.length === 0 ? (
                            <div className="tm-list-empty py-3">
                              <i className="bi bi-envelope-paper tm-list-empty-icon" style={{ fontSize: '1.4rem' }}></i>
                              Chưa có lời mời nào được gửi cho lịch trình này.
                            </div>
                          ) : (
                            <div className="tm-collaborator-list" style={{ maxHeight: '260px', overflowY: 'auto', overflowX: 'hidden' }}>
                              {membersModal.invitations.map((invitation) => {
                                const invitee = invitation.recipient || {};
                                const displayName = invitee.username || invitee.email || 'Người dùng';
                                const statusLabel = {
                                  pending: 'Chờ xác nhận',
                                  accepted: 'Đã chấp nhận',
                                  declined: 'Đã từ chối'
                                }[invitation.status] || invitation.status;
                                const statusClass = {
                                  pending: 'text-bg-warning',
                                  accepted: 'text-bg-success',
                                  declined: 'text-bg-secondary'
                                }[invitation.status] || 'text-bg-secondary';
                                return (
                                  <div key={invitation._id} className="tm-collaborator-item">
                                    <div className="d-flex align-items-center min-w-0 flex-grow-1">
                                      <div className="tm-collaborator-avatar">{displayName.charAt(0).toUpperCase()}</div>
                                      <div className="tm-collaborator-meta">
                                        <div className="tm-collaborator-name">{displayName}</div>
                                        <div className="tm-collaborator-email">
                                          {invitee.email && <span>{invitee.email}</span>}
                                          {invitation.createdAt && (
                                            <span>
                                              {invitee.email ? ' · ' : ''}
                                              Gửi {new Date(invitation.createdAt).toLocaleDateString('vi-VN')}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                    <div className="d-flex align-items-center gap-2 ms-2 flex-shrink-0">
                                      <span className={`tm-collaborator-badge ${invitation.permission === 'edit' ? 'badge-edit' : 'badge-view'}`}>
                                        {invitation.permission === 'edit' ? 'Chỉnh sửa' : 'Chỉ xem'}
                                      </span>
                                      <span className={`badge ${statusClass}`} style={{ fontSize: '0.65rem' }}>
                                        {statusLabel}
                                      </span>
                                      <button
                                        type="button"
                                        className="btn btn-outline-danger btn-sm py-1 px-2 border-0"
                                        title={invitation.status === 'pending' ? 'Hủy lời mời' : 'Xóa lịch sử lời mời'}
                                        disabled={deletingInvitationId === invitation._id || inviteForm.submitting}
                                        onClick={() => handleDeleteSentInvitation(invitation)}
                                      >
                                        {deletingInvitationId === invitation._id ? (
                                          <span className="spinner-border spinner-border-sm" aria-hidden="true"></span>
                                        ) : (
                                          <i className="bi bi-trash3 text-danger"></i>
                                        )}
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </>
                      )}
                    </>
                  )}
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={closeMembersModal}
                    disabled={membersModal.loading}
                  >
                    Đóng
                  </button>
                </div>
              </div>
            </div>
          </div>
    </>
  );
}
