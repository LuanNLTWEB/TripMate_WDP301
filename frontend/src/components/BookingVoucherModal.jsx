import { useEffect, useRef, useState } from 'react';
import { bookingApi } from '../services/api';
import { useToast } from '../hooks/useToast';

const formatCurrency = (val) => new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0
}).format(Number(val) || 0);

const formatDate = (val) => {
  if (!val) return '—';
  const d = new Date(val);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  });
};

export default function BookingVoucherModal({ bookingId, initialBooking = null, onClose }) {
  const toast = useToast();
  const voucherRef = useRef(null);
  const [loading, setLoading] = useState(!initialBooking);
  const [voucherData, setVoucherData] = useState(() => (initialBooking ? {
    booking: initialBooking,
    shortCode: `BK-${String(initialBooking._id).slice(-6).toUpperCase()}`,
    issuedAt: new Date()
  } : null));
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !downloading) onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [downloading, onClose]);

  useEffect(() => {
    let active = true;
    const loadVoucher = async () => {
      try {
        const res = await bookingApi.getVoucher(bookingId);
        if (active) {
          setVoucherData(res.data);
          setLoading(false);
        }
      } catch (err) {
        if (active) {
          toast.error(err.message || 'Không thể tạo phiếu xác nhận đặt chỗ.');
          setLoading(false);
          onClose();
        }
      }
    };

    if (bookingId) {
      loadVoucher();
    }
    return () => { active = false; };
  }, [bookingId, onClose, toast]);

  const booking = voucherData?.booking;
  const tour = booking?.tourId;
  const shortCode = voucherData?.shortCode || (booking?._id ? `BK-${String(booking._id).slice(-6).toUpperCase()}` : '—');

  const handleDownloadPng = async () => {
    if (!voucherRef.current || downloading) return;
    setDownloading(true);

    try {
      const canvas = document.createElement('canvas');
      const scale = 2; // High-DPI
      canvas.width = 680 * scale;
      canvas.height = 460 * scale;
      const ctx = canvas.getContext('2d');
      ctx.scale(scale, scale);

      // Background card
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 680, 460);

      // Header background
      const grad = ctx.createLinearGradient(0, 0, 680, 0);
      grad.addColorStop(0, '#0284c7');
      grad.addColorStop(1, '#0369a1');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 680, 84);

      // Header title
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 20px "Segoe UI", Roboto, sans-serif';
      ctx.fillText('TripMate — PHIẾU XÁC NHẬN ĐẶT TOUR', 24, 38);
      ctx.font = '13px "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = '#e0f2fe';
      ctx.fillText(`Mã đơn: ${shortCode} · ĐÃ XÁC NHẬN GIỮ CHỖ`, 24, 62);

      // Tour info
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 16px "Segoe UI", Roboto, sans-serif';
      ctx.fillText(tour?.title || 'Tour Du Lịch TripMate', 24, 120);

      ctx.fillStyle = '#475569';
      ctx.font = '13px "Segoe UI", Roboto, sans-serif';
      ctx.fillText(`Khởi hành: ${formatDate(booking?.departureDate)}`, 24, 146);
      ctx.fillText(`Hành trình: ${tour?.departureLocation || 'Điểm đón'} → ${tour?.destinationLocation || tour?.location || 'Điểm đến'}`, 24, 168);
      ctx.fillText(`Thời lượng: ${tour?.duration || 'Theo lịch trình'}`, 24, 190);

      // Divider
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(24, 210);
      ctx.lineTo(656, 210);
      ctx.stroke();

      // Customer details
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 14px "Segoe UI", Roboto, sans-serif';
      ctx.fillText('THÔNG TIN HÀNH KHÁCH & THANH TOÁN', 24, 236);

      ctx.font = '13px "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = '#334155';
      ctx.fillText(`Họ và tên: ${booking?.fullName || '—'}`, 24, 262);
      ctx.fillText(`Số điện thoại: ${booking?.phone || '—'}`, 340, 262);
      ctx.fillText(`Email: ${booking?.email || '—'}`, 24, 286);
      ctx.fillText(`Số lượng khách: ${booking?.numberOfPeople || 1} người`, 340, 286);

      // Total price box
      ctx.fillStyle = '#f8fafc';
      ctx.strokeStyle = '#cbd5e1';
      ctx.strokeRect(24, 310, 632, 56);
      ctx.fillRect(24, 310, 632, 56);
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 13px "Segoe UI", Roboto, sans-serif';
      ctx.fillText('Tổng tiền thanh toán:', 36, 334);
      ctx.fillStyle = '#0284c7';
      ctx.font = 'bold 18px "Segoe UI", Roboto, sans-serif';
      ctx.fillText(formatCurrency(booking?.totalPrice), 36, 356);

      // Badge on right of price box
      ctx.fillStyle = '#16a34a';
      ctx.font = 'bold 12px "Segoe UI", Roboto, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText('✓ ĐÃ XÁC NHẬN GIỮ CHỖ', 640, 344);
      ctx.textAlign = 'left';

      // Footer note
      ctx.fillStyle = '#64748b';
      ctx.font = 'italic 11px "Segoe UI", Roboto, sans-serif';
      ctx.fillText('Vui lòng xuất trình voucher này cho Hướng dẫn viên tại điểm hẹn ít nhất 15 phút trước giờ khởi hành.', 24, 396);
      ctx.fillText('TripMate chúc quý khách một chuyến đi an toàn và trọn vẹn niềm vui!', 24, 414);

      const link = document.createElement('a');
      link.download = `TripMate-Voucher-${shortCode}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      toast.success('Đã tải ảnh Voucher thành công!');
    } catch {
      toast.error('Không thể tạo file ảnh. Vui lòng thử chức năng In / Lưu PDF.');
    } finally {
      setDownloading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      <div className="modal-backdrop fade show" style={{ zIndex: 1050 }} onClick={onClose}></div>
      <div
        className="modal fade show d-block"
        tabIndex="-1"
        role="dialog"
        aria-modal="true"
        style={{
          zIndex: 1055,
          overscrollBehavior: 'contain'
        }}
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <div
          className="modal-dialog modal-dialog-centered modal-lg modal-dialog-scrollable"
          style={{ overscrollBehavior: 'contain' }}
        >
          <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
            <div className="modal-header bg-light px-4 py-3 border-bottom d-flex align-items-center justify-content-between">
              <div>
                <span className="badge bg-success-subtle text-success text-uppercase fw-semibold mb-1">
                  Xác nhận giữ chỗ · Booking Voucher
                </span>
                <h5 className="modal-title fw-bold text-dark mb-0">
                  <i className="bi bi-ticket-perforated me-2 text-primary"></i>
                  Phiếu xác nhận đặt tour
                </h5>
              </div>
              <button type="button" className="btn-close" onClick={onClose} aria-label="Đóng"></button>
            </div>

            <div className="modal-body p-4" style={{ backgroundColor: '#f8fafc', overscrollBehavior: 'contain' }}>
              {loading ? (
                <div className="text-center py-5">
                  <div className="spinner-border text-primary" role="status"></div>
                  <p className="text-muted mt-2 mb-0">Đang khởi tạo Booking Voucher...</p>
                </div>
              ) : (
                /* Ticket Card */
                <div
                  ref={voucherRef}
                  id="tripmate-booking-voucher-card"
                  className="card border-0 shadow-sm rounded-4 overflow-hidden bg-white mx-auto"
                  style={{ maxWidth: 720 }}
                >
                  {/* Voucher Header Banner */}
                  <div
                    className="p-4 text-white d-flex flex-wrap align-items-center justify-content-between gap-3"
                    style={{ background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)' }}
                  >
                    <div>
                      <div className="d-flex align-items-center gap-2 mb-1">
                        <span className="badge bg-white text-primary font-monospace fw-bold px-2.5 py-1">
                          {shortCode}
                        </span>
                        <span className="badge bg-emerald-500 bg-opacity-25 text-white border border-white border-opacity-25">
                          ✓ ĐÃ XÁC NHẬN GIỮ CHỖ
                        </span>
                      </div>
                      <h4 className="fw-bold mb-0 text-white">TripMate Official Booking Voucher</h4>
                    </div>
                    <div className="text-end small text-white-50">
                      <div>Khởi hành: <strong>{formatDate(booking?.departureDate)}</strong></div>
                      <div>Khách: <strong>{booking?.numberOfPeople} người</strong></div>
                    </div>
                  </div>

                  {/* Voucher Content */}
                  <div className="p-4">
                    {/* Thông tin tour */}
                    <div className="mb-3">
                      <div className="mb-1">
                        <span className="small text-muted text-uppercase fw-semibold">Thông tin tour</span>
                      </div>
                      <h5 className="fw-bold text-dark mb-1">{tour?.title || 'Tour Du Lịch TripMate'}</h5>
                      <div className="small text-muted d-flex flex-wrap gap-3">
                        <span>
                          <i className="bi bi-geo-alt me-1 text-danger"></i>
                          {tour?.departureLocation || 'Điểm đón'} → {tour?.destinationLocation || tour?.location || 'Điểm đến'}
                        </span>
                        {tour?.duration && (
                          <span>
                            <i className="bi bi-clock me-1 text-primary"></i>
                            {tour.duration}
                          </span>
                        )}
                        <span>
                          <i className="bi bi-calendar3 me-1 text-success"></i>
                          Khởi hành: {formatDate(booking?.departureDate)}
                        </span>
                      </div>
                    </div>

                    <hr className="my-3 opacity-25" />

                    {/* Thông tin hành khách */}
                    <div>
                      <span className="small text-muted text-uppercase fw-semibold d-block mb-2">
                        Thông tin hành khách & thanh toán
                      </span>
                      <div className="row g-3 small">
                        <div className="col-12 col-sm-6 col-md-3">
                          <span className="text-muted d-block">Họ và tên:</span>
                          <strong className="text-dark">{booking?.fullName || '—'}</strong>
                        </div>
                        <div className="col-12 col-sm-6 col-md-3">
                          <span className="text-muted d-block">Số điện thoại:</span>
                          <strong className="text-dark">{booking?.phone || '—'}</strong>
                        </div>
                        <div className="col-12 col-sm-6 col-md-3">
                          <span className="text-muted d-block">Email liên hệ:</span>
                          <span className="text-dark text-break">{booking?.email || '—'}</span>
                        </div>
                        <div className="col-12 col-sm-6 col-md-3">
                          <span className="text-muted d-block">Hình thức:</span>
                          <span className="badge bg-light text-dark border">Thanh toán trả sau</span>
                        </div>
                      </div>
                    </div>

                    {/* Chi phí thanh toán */}
                    <div className="mt-4 p-3 rounded-3 bg-light border d-flex justify-content-between align-items-center">
                      <div>
                        <span className="text-muted small d-block">Tổng chi phí thanh toán</span>
                        <span className="h4 fw-bold text-primary mb-0">{formatCurrency(booking?.totalPrice)}</span>
                      </div>
                      <div>
                        <span className="badge bg-primary-subtle text-primary border border-primary-subtle px-3 py-2">
                          <i className="bi bi-people me-1"></i>{booking?.numberOfPeople || 1} khách
                        </span>
                      </div>
                    </div>

                    <div className="alert alert-info py-2 px-3 small mt-3 mb-0 rounded-3">
                      <i className="bi bi-info-circle me-1"></i>
                      Vui lòng có mặt tại điểm đón trước giờ khởi hành ít nhất 15 phút và xuất trình phiếu này kèm giấy tờ tùy thân.
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer border-0 px-4 pb-4 pt-2 d-flex justify-content-between">
              <button type="button" className="btn btn-outline-secondary rounded-pill px-4" onClick={onClose}>
                Đóng
              </button>
              <div className="d-flex gap-2">
                <button
                  type="button"
                  className="btn btn-outline-primary rounded-pill px-4 fw-semibold"
                  onClick={handlePrint}
                  disabled={loading}
                >
                  <i className="bi bi-printer me-2"></i>In / Lưu PDF
                </button>
                <button
                  type="button"
                  className="btn btn-primary rounded-pill px-4 fw-semibold"
                  onClick={handleDownloadPng}
                  disabled={loading || downloading}
                >
                  {downloading ? (
                    <><span className="spinner-border spinner-border-sm me-2" role="status"></span>Đang tạo ảnh...</>
                  ) : (
                    <><i className="bi bi-download me-2"></i>Tải ảnh Voucher (.PNG)</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
