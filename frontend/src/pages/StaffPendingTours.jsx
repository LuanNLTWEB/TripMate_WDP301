import React, { useState } from 'react';

const DUMMY_PENDING_TOURS = [
  {
    _id: 'pending1',
    title: 'Khám phá Mộc Châu mùa hoa mận',
    duration: '2 ngày 1 đêm',
    departureLocation: 'Hà Nội',
    destinationLocation: 'Mộc Châu',
    price: 1500000,
    availableSeats: 20,
    customerName: 'Nguyễn Văn A',
    submittedAt: '2026-09-19T10:00:00Z',
    images: ['https://res.cloudinary.com/fkjcxcyn/image/upload/c_fill,w_100,h_100/v1726599187/demo/sa-pa.webp']
  },
  {
    _id: 'pending2',
    title: 'Tour nghỉ dưỡng biển Phú Quốc',
    duration: '3 ngày 2 đêm',
    departureLocation: 'Hồ Chí Minh',
    destinationLocation: 'Phú Quốc',
    price: 4500000,
    availableSeats: 15,
    customerName: 'Trần Thị B',
    submittedAt: '2026-09-18T14:30:00Z',
    images: ['https://res.cloudinary.com/fkjcxcyn/image/upload/c_fill,w_100,h_100/v1726599187/demo/phu-quoc.webp']
  }
];

export default function StaffPendingTours() {
  const [tours, setTours] = useState(DUMMY_PENDING_TOURS);

  const formatCurrency = (value) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);

  return (
    <section className="management-page-section">
      <div className="management-page-heading staff-tour-heading">
        <span className="management-page-kicker">Tour Approvals</span>
        <h1>Duyệt Tour Chờ</h1>
        <p>Kiểm tra và phê duyệt các tour do khách hàng đề xuất lên hệ thống.</p>
      </div>

      <div className="card border-0 shadow-sm staff-tour-card">
        <div className="table-responsive">
          <table className="table align-middle table-hover mb-0 staff-tour-table">
            <colgroup>
              <col className="staff-tour-col-main" />
              <col style={{ width: '20%' }} />
              <col style={{ width: '15%' }} />
              <col style={{ width: '20%' }} />
              <col className="staff-tour-col-actions" />
            </colgroup>
            <thead className="table-light text-muted small text-uppercase">
              <tr>
                <th className="px-4 py-3">Thông tin Tour</th>
                <th className="py-3">Hành trình</th>
                <th className="py-3">Giá & Chỗ</th>
                <th className="py-3">Người đề xuất</th>
                <th className="px-4 py-3 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {tours.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center text-muted py-5">
                    <i className="bi bi-inbox fs-2 d-block mb-2 text-muted"></i>
                    Không có tour nào đang chờ duyệt.
                  </td>
                </tr>
              ) : tours.map((tour) => (
                <tr key={tour._id}>
                  <td className="px-4 py-3">
                    <div className="d-flex align-items-center gap-3">
                      {tour.images?.[0] ? (
                        <img
                          src={tour.images[0]}
                          alt={tour.title}
                          className="rounded shadow-sm"
                          style={{ width: '60px', height: '60px', objectFit: 'cover' }}
                        />
                      ) : (
                        <div className="rounded bg-light border d-flex align-items-center justify-content-center text-muted" style={{ width: '60px', height: '60px' }}>
                          <i className="bi bi-image fs-5"></i>
                        </div>
                      )}
                      <div>
                        <div className="fw-bold text-dark mb-1">{tour.title}</div>
                        <div className="text-muted small">
                          <i className="bi bi-clock me-1"></i>
                          {tour.duration}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3">
                    <div className="staff-tour-route">
                      <span>{tour.departureLocation}</span>
                      <i className="bi bi-arrow-right"></i>
                      <span>{tour.destinationLocation}</span>
                    </div>
                  </td>
                  <td className="py-3">
                    <div className="staff-tour-price">{formatCurrency(tour.price)}</div>
                    <div className="staff-tour-seats">
                      <i className="bi bi-people"></i>
                      {tour.availableSeats} chỗ
                    </div>
                  </td>
                  <td className="py-3">
                    <div className="fw-semibold text-primary">{tour.customerName}</div>
                    <div className="small text-muted">
                      Ngày gửi: {new Date(tour.submittedAt).toLocaleDateString('vi-VN')}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="d-flex justify-content-center align-items-center gap-2">
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-success border-0 px-2"
                        title="Duyệt"
                      >
                        <i className="bi bi-check-lg fs-5"></i>
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-danger border-0 px-2"
                        title="Từ chối"
                      >
                        <i className="bi bi-x-lg fs-5"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
