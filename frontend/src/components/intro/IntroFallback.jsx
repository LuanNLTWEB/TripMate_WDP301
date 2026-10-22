import { Link } from 'react-router-dom';
import { TRIPMATE_LOGO_URL } from '../../constants/brand';

function IntroFallback({ onComplete, message = 'Không gian 3D chưa sẵn sàng trên thiết bị này.' }) {
  return (
    <main className="tm-about-fallback">
      <div className="tm-about-fallback__shade" />
      <header className="tm-about-header">
        <Link to="/" className="tm-about-brand">
          <img src={TRIPMATE_LOGO_URL} alt="" />
          <span>TRIPMATE<sup>®</sup></span>
        </Link>
      </header>
      <div className="tm-about-fallback__content">
        <p>WONDERS OF VIETNAM · 2026</p>
        <h1>Một dải đất.<br /><em>Vô vàn thế giới.</em></h1>
        <span>{message}</span>
        <button type="button" className="tm-about-primary" onClick={onComplete}>
          Khám phá điểm đến <i className="bi bi-arrow-right" />
        </button>
      </div>
    </main>
  );
}

export default IntroFallback;
