import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { complaintApi, bookingApi } from '../services/api';
import { useToast } from '../hooks/useToast';

const STATUS_LABELS = { open: 'Mới', in_review: 'Đang xử lý', resolved: 'Đã giải quyết', rejected: 'Đã từ chối' };
const CATEGORY_LABELS = {
  quality_mismatch: 'Chất lượng tour',
  incorrect_cash_charge: 'Thu sai tiền',
  wrongful_no_show: 'No-Show oan',
  other: 'Khác'
};

export default function StaffComplaints() {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [resettingNoShow, setResettingNoShow] = useState(false);

  // START STT 156 Reset No-Show Count (Staff)
  const handleResetNoShow = async (userId) => {
    if (!userId) return;
    setResettingNoShow(true);
    try {
      const res = await bookingApi.resetNoShow(userId, `Gỡ phạt No-Show theo khiếu nại #${selected?._id}`);
      toast.success(res.message || 'Đã đặt lại số lần vắng mặt của khách về 0 thành công.');
      setNote((current) => current && current.trim().length >= 5 ? current : 'Đã chấp thuận giải trình và xóa điểm vi phạm No-Show cho khách hàng.');
    } catch (err) {
      toast.error(err.message || 'Không thể đặt lại số lần vắng mặt.');
    } finally {
      setResettingNoShow(false);
    }
  };
  // END STT 156 Reset No-Show Count (Staff)

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await complaintApi.getManaged({ search, status, page: 1, limit: 50 });
      setItems(response.data || []);
    } catch (error) {
      toast.error(error.message || 'Không thể tải khiếu nại.');
    } finally {
      setLoading(false);
    }
  }, [search, status, toast]);

  useEffect(() => { load(); // eslint-disable-line react/set-state-in-effect
  }, [load]);

  const resolve = async (nextStatus) => {
    if (!selected || note.trim().length < 5) {
      toast.error('Vui lòng nhập phản hồi xử lý ít nhất 5 ký tự.');
      return;
    }
    try {
      await complaintApi.resolve(selected._id, { status: nextStatus, resolutionNote: note });
      toast.success('Đã cập nhật khiếu nại.');
      setSelected(null);
      setNote('');
      await load();
    } catch (error) {
      toast.error(error.message || 'Không thể cập nhật khiếu nại.');
    }
  };

  return (
    <section className="management-page-section">
      <div className="management-page-heading">
        <span className="management-page-kicker">Complaint Handling</span>
        <h1>Quản lý khiếu nại khách hàng</h1>
        <p>Tra cứu, xem chi tiết và xử lý các khiếu nại liên quan đến đơn đặt tour.</p>
      </div>
      <div className="management-table-card">
        <div className="management-table-toolbar flex-wrap gap-3">
          <form className="management-search-box" onSubmit={(e) => { e.preventDefault(); load(); }}>
            <i className="bi bi-search"></i>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm khách, email, số điện thoại hoặc nội dung..." />
          </form>
          <select className="form-select" style={{ maxWidth: 190 }} value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="all">Tất cả trạng thái</option>
            {Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </div>
        <div className="table-responsive">
          <table className="management-table align-middle">
            <thead><tr><th>Khách hàng</th><th>Tour</th><th>Loại</th><th>Trạng thái</th><th></th></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan="5" className="text-center py-5">Đang tải...</td></tr> : items.length === 0 ? <tr><td colSpan="5" className="text-center py-5 text-muted">Không có khiếu nại phù hợp.</td></tr> : items.map((item) => (
                <tr key={item._id}>
                  <td>{item.customerId?.username || item.bookingId?.fullName}<div className="small text-muted">{item.customerId?.email}</div></td>
                  <td>{item.tourId?.title || 'Tour'}</td>
                  <td>{CATEGORY_LABELS[item.category]}</td>
                  <td><span className="badge text-bg-secondary">{STATUS_LABELS[item.status]}</span></td>
                  <td><button className="btn btn-sm btn-outline-primary" onClick={() => { setSelected(item); setNote(item.resolutionNote || ''); }}>Xem</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {selected && typeof document !== 'undefined' && createPortal(
        <>
          <div className="modal-backdrop fade show" style={{ zIndex: 1060 }} onClick={() => setSelected(null)}></div>
          <div className="modal fade show d-block" style={{ zIndex: 1065 }} tabIndex="-1" role="dialog" aria-modal="true" onClick={(e) => { if (e.target === e.currentTarget) setSelected(null); }}>
            <div className="modal-dialog modal-dialog-centered modal-lg">
              <div className="modal-content shadow-lg border-0">
                <div className="modal-header"><h5 className="modal-title">Chi tiết khiếu nại</h5><button className="btn-close" onClick={() => setSelected(null)} aria-label="Đóng"></button></div>
                <div className="modal-body">
                  <p><strong>Khách:</strong> {selected.customerId?.username} · {selected.customerId?.email}</p>
                  <p><strong>Tour:</strong> {selected.tourId?.title}</p>
                  <p><strong>Loại:</strong> {CATEGORY_LABELS[selected.category]}</p>
                  <div className="border rounded p-3 mb-3">{selected.description}</div>

                  {/* START STT 156 Reset No-Show Count (Staff) */}
                  {selected.category === 'wrongful_no_show' && (
                    <div className="alert alert-warning p-3 mb-3 rounded-3 d-flex flex-wrap align-items-center justify-content-between gap-2 border border-warning-subtle">
                      <div>
                        <div className="fw-bold text-dark"><i className="bi bi-shield-exclamation me-1 text-warning"></i>Khách khiếu nại bị đánh dấu No-Show oan</div>
                        <div className="small text-muted">Nếu chấp thuận giải trình, nhân viên có thể xóa điểm vi phạm No-Show để khôi phục quyền đặt tour cho khách.</div>
                      </div>
                      <button
                        type="button"
                        className="btn btn-warning btn-sm fw-semibold rounded-pill px-3 shadow-sm d-inline-flex align-items-center gap-1"
                        onClick={() => handleResetNoShow(selected.customerId?._id || selected.customerId)}
                        disabled={resettingNoShow}
                      >
                        {resettingNoShow ? <span className="spinner-border spinner-border-sm"></span> : <i className="bi bi-arrow-counterclockwise"></i>}
                        <span>Reset điểm No-Show</span>
                      </button>
                    </div>
                  )}
                  {/* END STT 156 Reset No-Show Count (Staff) */}
                  {selected.evidenceImages?.length > 0 && (
                    <div className="mb-3">
                      <div className="text-muted small mb-1">Ảnh minh chứng ({selected.evidenceImages.length})</div>
                      <div className="d-flex flex-wrap gap-2">
                        {selected.evidenceImages.map((url, index) => (
                          <a key={`${url}-${index}`} href={url} target="_blank" rel="noreferrer" className="d-inline-block rounded-3 overflow-hidden border" style={{ width: 96, height: 72 }}>
                            <img src={url} alt={`Minh chứng ${index + 1}`} className="w-100 h-100 object-fit-cover" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                  {['open', 'in_review'].includes(selected.status) && (
                    <div className="mb-3">
                      <label className="form-label small fw-semibold text-muted mb-1">Kết quả / Phản hồi xử lý <span className="text-danger">*</span></label>
                      <textarea
                        className="form-control"
                        rows="4"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="Nhập nội dung phản hồi xử lý cho khách hàng (tối thiểu 5 ký tự)..."
                      ></textarea>
                      <div className="d-flex justify-content-between align-items-center mt-1">
                        <small className={note.trim().length >= 5 ? 'text-success' : 'text-danger'}>
                          {note.trim().length >= 5 ? (
                            <><i className="bi bi-check-circle me-1"></i>Hợp lệ để giải quyết/từ chối</>
                          ) : (
                            <><i className="bi bi-exclamation-circle me-1"></i>Cần tối thiểu 5 ký tự ({note.trim().length}/5)</>
                          )}
                        </small>
                      </div>
                    </div>
                  )}
                  {selected.resolutionNote && <div className="alert alert-info">{selected.resolutionNote}</div>}
                </div>
                <div className="modal-footer">
                  <button className="btn btn-secondary" onClick={() => setSelected(null)}>Đóng</button>
                  {['open', 'in_review'].includes(selected.status) && <><button className="btn btn-danger" onClick={() => resolve('rejected')}>Từ chối</button><button className="btn btn-success" onClick={() => resolve('resolved')}>Đánh dấu đã giải quyết</button></>}
                </div>
              </div>
            </div>
          </div>
        </>,
        document.body
      )}
    </section>
  );
}
