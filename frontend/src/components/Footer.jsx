import { Link } from 'react-router-dom';

function Footer() {
  return (
    <footer className="border-top py-4 mt-auto" style={{ backgroundColor: '#1a1a2e', color: '#ffffff' }}>
      <div className="container">
        <div className="row">
          <div className="col-md-4 mb-3 mb-md-0">
            <h5 className="fw-bold text-white">TripMate</h5>
            <p className="text-white-50 small mb-0">Lên kế hoạch cho chuyến đi hoàn hảo cùng TripMate.</p>
          </div>
          <div className="col-md-8">
            <div className="row">
              <div className="col-6 col-md-3 mb-3">
                <h6 className="fw-bold text-white">Liên kết nhanh</h6>
                <ul className="list-unstyled small">
                  <li><Link to="/" className="text-white-50 text-decoration-none hover-white">Trang chủ</Link></li>
                  <li><Link to="/destinations" className="text-white-50 text-decoration-none hover-white">Điểm đến</Link></li>
                  <li><Link to="/tours" className="text-white-50 text-decoration-none hover-white">Tour du lịch</Link></li>
                  <li><Link to="/about" className="text-white-50 text-decoration-none hover-white">Giới thiệu</Link></li>
                </ul>
              </div>
            </div>
          </div>
        </div>
        <hr className="my-3" style={{ borderColor: 'rgba(255,255,255,0.1)' }} />
        <p className="text-center text-white-50 small mb-0">&copy; {new Date().getFullYear()} TripMate. Bảo lưu mọi quyền.</p>
      </div>
    </footer>
  );
}

export default Footer;