import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { complaintApi, bookingApi } from '../services/api';
import { useToast } from '../hooks/useToast';

const CATEGORY_OPTIONS = [
  ['quality_mismatch', 'Chất lượng tour không giống mô tả'],
  ['incorrect_cash_charge', 'Provider thu sai tiền mặt'],
  ['wrongful_no_show', 'Bị đánh dấu No-Show oan'],
  ['other', 'Khác']
];

const STATUS_LABELS = {
  open: 'Mới gửi',
  in_review: 'Đang xử lý',
  resolved: 'Đã giải quyết',
  rejected: 'Đã từ chối'
};

export default function MyComplaints() {
  const toast = useToast();
  const [complaints, setComplaints] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [form, setForm] = useState({ bookingId: '', category: 'quality_mismatch', description: '' });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const [complaintResponse, bookingResponse] = await Promise.all([
        complaintApi.getMine(),
        bookingApi.getMyBookings({ status: 'confirmed' })
      ]);
      setComplaints(complaintResponse.data || []);
      setBookings(bookingResponse.data || []);
      setError('');
    } catch (requestError) {
      setError(requestError.message || 'Không thể tải khiếu nại.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); // eslint-disable-line react/set-state-in-effect
  }, []);

  const submit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      await complaintApi.create(form);
      toast.success('Đã gửi khiếu nại.');
      setForm({ bookingId: '', category: 'quality_mismatch', description: '' });
      await load();
    } catch (requestError) {
      toast.error(requestError.message || 'Không thể gửi khiếu nại.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Navbar />
      <main className="container py-5">
        <div className="mb-4">
          <h1 className="fw-bold">Khiếu nại của tôi</h1>
          <p className="text-muted">Gửi và theo dõi khiếu nại liên quan đến đơn đặt tour đã xác nhận.</p>
        </div>
        {error && <div className="alert alert-danger">{error}</div>}
        <div className="card border-0 shadow-sm mb-4">
          <div className="card-body">
            <h5 className="fw-bold mb-3">Gửi khiếu nại</h5>
            <form onSubmit={submit}>
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label">Đơn đặt tour</label>
                  <select className="form-select" required value={form.bookingId} onChange={(e) => setForm({ ...form, bookingId: e.target.value })}>
                    <option value="">Chọn đơn đã xác nhận</option>
                    {bookings.map((booking) => <option key={booking._id} value={booking._id}>{booking.tourId?.title || booking._id}</option>)}
                  </select>
                </div>
                <div className="col-md-6">
                  <label className="form-label">Loại khiếu nại</label>
                  <select className="form-select" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                    {CATEGORY_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </div>
                <div className="col-12">
                  <label className="form-label">Nội dung</label>
                  <textarea className="form-control" rows="4" minLength="20" maxLength="2000" required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}></textarea>
                  <div className="form-text">Tối thiểu 20 ký tự. Muốn đính kèm ảnh minh chứng, hãy bấm “Gửi khiếu nại” ngay tại lịch sử đặt tour.</div>
                </div>
              </div>
              <button className="btn btn-primary mt-3" disabled={submitting}>{submitting ? 'Đang gửi...' : 'Gửi khiếu nại'}</button>
            </form>
          </div>
        </div>
        <div className="card border-0 shadow-sm">
          <div className="card-body">
            <h5 className="fw-bold mb-3">Lịch sử khiếu nại</h5>
            {loading ? <p className="text-muted">Đang tải...</p> : complaints.length === 0 ? <p className="text-muted mb-0">Bạn chưa có khiếu nại nào.</p> : (
              <div className="list-group list-group-flush">
                {complaints.map((complaint) => (
                  <div className="list-group-item px-0" key={complaint._id}>
                    <div className="d-flex justify-content-between gap-3">
                      <strong>{complaint.tourId?.title || 'Tour'}</strong>
                      <span className="badge text-bg-secondary">{STATUS_LABELS[complaint.status]}</span>
                    </div>
                    <div className="small text-muted mt-1">{complaint.description}</div>
                    {complaint.evidenceImages?.length > 0 && (
                      <div className="d-flex flex-wrap gap-2 mt-2">
                        {complaint.evidenceImages.map((url, index) => (
                          <a key={`${url}-${index}`} href={url} target="_blank" rel="noreferrer" className="d-inline-block rounded-3 overflow-hidden border" style={{ width: 72, height: 56 }}>
                            <img src={url} alt={`Minh chứng ${index + 1}`} className="w-100 h-100 object-fit-cover" />
                          </a>
                        ))}
                      </div>
                    )}
                    {complaint.resolutionNote && <div className="alert alert-info py-2 mt-2 mb-0 small">{complaint.resolutionNote}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <Link className="btn btn-link px-0 mt-3" to="/my-bookings">Quay lại lịch sử đặt tour</Link>
      </main>
      <Footer />
    </>
  );
}
