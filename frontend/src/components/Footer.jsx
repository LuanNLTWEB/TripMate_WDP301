import { Link } from 'react-router-dom';
const logo = 'https://res.cloudinary.com/fkjcxcyn/image/upload/v1789823913/tripmate_assets/d4gczttux14p0fwdvxst.png';

function Footer() {
  return (
    <footer className="footer-dark pt-5 mt-auto">
      <div className="container">
        <div className="row g-4 mb-5">
          <div className="col-lg-4 col-md-6">
            <div className="d-flex align-items-center gap-2 mb-3">
              <img src={logo} alt="TripMate Logo" style={{ height: '36px', width: 'auto' }} />
              <span className="footer-brand-title">TripMate</span>
            </div>
            <p className="text-secondary small mb-4" style={{ lineHeight: '1.7', maxWidth: '340px' }}>
              Nền tảng đồng hành khám phá và lên kế hoạch du lịch thông minh hàng đầu Việt Nam. Kết nối bạn với những hành trình trọn vẹn và đáng nhớ nhất.
            </p>
            <div className="d-flex align-items-center gap-2">
              <a href="https://facebook.com" target="_blank" rel="noreferrer" className="footer-social-btn" aria-label="Facebook">
                <i className="bi bi-facebook"></i>
              </a>
              <a href="https://instagram.com" target="_blank" rel="noreferrer" className="footer-social-btn" aria-label="Instagram">
                <i className="bi bi-instagram"></i>
              </a>
              <a href="https://youtube.com" target="_blank" rel="noreferrer" className="footer-social-btn" aria-label="YouTube">
                <i className="bi bi-youtube"></i>
              </a>
              <a href="https://tiktok.com" target="_blank" rel="noreferrer" className="footer-social-btn" aria-label="TikTok">
                <i className="bi bi-tiktok"></i>
              </a>
            </div>
          </div>

          <div className="col-lg-2 col-md-6 col-6">
            <h6 className="footer-heading">Khám phá</h6>
            <ul className="list-unstyled mb-0">
              <li><Link to="/" className="footer-link">Trang chủ</Link></li>
              <li><Link to="/destinations" className="footer-link">Điểm đến</Link></li>
              <li><Link to="/tours" className="footer-link">Tour du lịch</Link></li>
              <li><Link to="/itinerary" className="footer-link">Lịch trình cá nhân</Link></li>
              <li><Link to="/about" className="footer-link">Về Việt Nam</Link></li>
            </ul>
          </div>

          <div className="col-lg-3 col-md-6 col-6">
            <h6 className="footer-heading">Dịch vụ & Tiện ích</h6>
            <ul className="list-unstyled mb-0">
              <li><Link to="/itinerary" className="footer-link">Lập kế hoạch thông minh</Link></li>
              <li><Link to="/destinations" className="footer-link">Gợi ý danh lam thắng cảnh</Link></li>
              <li><Link to="/tours" className="footer-link">Tour trọn gói ưu đãi</Link></li>
              <li><Link to="/about" className="footer-link">Cẩm nang du lịch</Link></li>
              <li><Link to="/about" className="footer-link">Chính sách bảo mật</Link></li>
            </ul>
          </div>

          <div className="col-lg-3 col-md-6">
            <h6 className="footer-heading">Liên hệ & Hỗ trợ</h6>
            <div className="footer-contact-item">
              <i className="bi bi-telephone-fill footer-contact-icon"></i>
              <div>
                <span className="text-white fw-semibold d-block">1900 3636</span>
                <span className="small text-secondary">Tư vấn miễn phí 24/7</span>
              </div>
            </div>
            <div className="footer-contact-item">
              <i className="bi bi-envelope-fill footer-contact-icon"></i>
              <div>
                <span className="text-white fw-semibold d-block">ayano123@tripmate.vn</span>
                <span className="small text-secondary">Phản hồi trong 30 phút</span>
              </div>
            </div>
            <div className="footer-contact-item">
              <i className="bi bi-geo-alt-fill footer-contact-icon"></i>
              <div>
                <span className="small text-secondary">Khu Công Nghệ Cao, TP. Thanh Hóa, TP. Thanh Hóa</span>
              </div>
            </div>
          </div>
        </div>

        <div className="footer-bottom d-flex flex-column flex-md-row align-items-center justify-content-between gap-2">
          <div>
            &copy; {new Date().getFullYear()} TripMate Vietnam. Bảo lưu mọi quyền.
          </div>
          <div className="text-secondary small d-flex align-items-center gap-1">
            <span>Tự hào lan tỏa vẻ đẹp danh thắng Việt Nam</span>
            <span role="img" aria-label="Vietnam Flag">🇻🇳</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
