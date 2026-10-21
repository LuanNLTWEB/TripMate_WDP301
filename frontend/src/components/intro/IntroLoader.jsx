import { useEffect, useState } from 'react';
import { useProgress } from '@react-three/drei';
import { TRIPMATE_LOGO_URL } from '../../constants/brand';

function IntroLoader({ compact = false, onReady }) {
  const { active, progress } = useProgress();
  const [visible, setVisible] = useState(true);
  const [isDone, setIsDone] = useState(false);

  // Lock scroll completely while loading to avoid lag/stutter before 3D world is ready
  useEffect(() => {
    if (visible) {
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
      if (onReady) onReady();
    }
    return () => {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    };
  }, [visible, onReady]);

  // Smoothly track progress and transition out only when fully loaded (progress >= 100)
  useEffect(() => {
    if (active || progress < 100) return undefined;

    setIsDone(true);
    // Hold 100% briefly so user sees full load confirmation and shaders warm up
    const timer = window.setTimeout(() => {
      setVisible(false);
    }, compact ? 400 : 750);

    return () => window.clearTimeout(timer);
  }, [active, compact, progress]);

  // Safety fallback: prevent hanging if WebGL takes too long or network stalls
  useEffect(() => {
    const safetyTimer = window.setTimeout(() => {
      setIsDone(true);
      window.setTimeout(() => {
        setVisible(false);
      }, 500);
    }, 6500);

    return () => window.clearTimeout(safetyTimer);
  }, []);

  if (!visible) return null;

  const displayProgress = Math.max(5, Math.min(100, Math.round(progress || 5)));

  let statusText = 'Đang nạp dữ liệu kỳ quan Việt Nam...';
  if (displayProgress >= 40 && displayProgress < 75) {
    statusText = 'Khởi tạo không gian 3D & hiệu ứng ánh sáng...';
  } else if (displayProgress >= 75 && displayProgress < 100) {
    statusText = 'Tối ưu hóa tài nguyên đồ họa...';
  } else if (displayProgress >= 100 || isDone) {
    statusText = 'Không gian đã sẵn sàng! Bắt đầu hành trình...';
  }

  return (
    <div
      className={`tm-about-loader ${isDone ? 'is-complete' : ''}`}
      role="status"
      aria-live="polite"
      aria-label="Đang tải trải nghiệm TripMate"
    >
      <div className="tm-about-loader__backdrop" aria-hidden="true" />
      <div className="tm-about-loader__ambient-ring" aria-hidden="true" />

      <div className="tm-about-loader__center">
        <div className="tm-about-loader__logo-wrap">
          <img src={TRIPMATE_LOGO_URL} alt="TripMate" />
          <div className="tm-about-loader__logo-glow" aria-hidden="true" />
        </div>

        <span className="tm-about-loader__eyebrow">WONDERS OF VIETNAM · 2026</span>
        <strong className="tm-about-loader__brand">TRIPMATE</strong>

        <div className="tm-about-loader__track" aria-hidden="true">
          <span
            className="tm-about-loader__fill"
            style={{ width: `${displayProgress}%` }}
          />
        </div>

        <div className="tm-about-loader__meta">
          <span className="tm-about-loader__status">{statusText}</span>
          <span className="tm-about-loader__percent">{displayProgress}%</span>
        </div>

        <div className="tm-about-loader__note">
          <i className="bi bi-shield-check me-1" /> Hệ thống đang chuẩn bị đồ họa mượt mà nhất cho bạn
        </div>
      </div>
    </div>
  );
}

export default IntroLoader;
