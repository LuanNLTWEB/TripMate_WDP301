import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import haLongHeroImage from '../assets/about-vietnam/ha-long-hero.webp';
import haLongBoatsImage from '../assets/about-vietnam/ha-long-boats.webp';
import sonDoongImage from '../assets/about-vietnam/son-doong.webp';
import trangAnImage from '../assets/about-vietnam/trang-an.webp';
import './AboutVietnam.css';

const INTRO_SESSION_KEY = 'tripmate.aboutVietnamIntroSeen';

const shouldShowIntro = () => {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;

  try {
    return sessionStorage.getItem(INTRO_SESSION_KEY) !== 'true';
  } catch {
    return true;
  }
};

const wonders = [
  {
    number: '01',
    name: 'Vịnh Hạ Long',
    location: 'Quảng Ninh',
    coordinates: '20.9101° N · 107.1839° E',
    headline: 'Nơi đá chạm vào biển',
    description: 'Hàng nghìn đảo đá vôi trồi lên giữa mặt nước xanh, tạo nên một đường chân trời không nơi nào lặp lại. Hạ Long là ký ức địa chất được viết bằng đá, nước và sương.',
    image: haLongBoatsImage,
    source: 'https://unsplash.com/photos/boats-on-turquoise-ha-long-bay-kG7pOXbBfNs',
    credit: 'Marina Lobato / Unsplash'
  },
  {
    number: '02',
    name: 'Hang Sơn Đoòng',
    location: 'Quảng Bình',
    coordinates: '17.5469° N · 106.1432° E',
    headline: 'Một thế giới dưới lòng đất',
    description: 'Ẩn sâu trong khối núi đá vôi Phong Nha – Kẻ Bàng là không gian đủ lớn để chứa cả một khu rừng. Ánh sáng xuyên qua hố sụt, đánh thức hệ sinh thái nguyên sơ giữa lòng hang.',
    image: sonDoongImage,
    source: 'https://unsplash.com/photos/a-person-standing-on-top-of-a-rock-formation-GFKtkfg7Img',
    credit: 'Andrew Svk / Unsplash'
  },
  {
    number: '03',
    name: 'Quần thể Tràng An',
    location: 'Ninh Bình',
    coordinates: '20.2506° N · 105.9175° E',
    headline: 'Dòng nước kể chuyện ngàn năm',
    description: 'Những con thuyền nhỏ lướt qua thung nước, hang xuyên thủy và vách núi phủ xanh. Tràng An kết nối thiên nhiên, khảo cổ và dấu tích kinh đô trong một hành trình chậm giữa miền di sản.',
    image: trangAnImage,
    source: 'https://unsplash.com/photos/person-riding-on-boat-on-river-during-daytime-CDkIsx6T77U',
    credit: 'Giuliano Gabella / Unsplash'
  }
];

const AboutVietnam = () => {
  const [introVisible, setIntroVisible] = useState(shouldShowIntro);

  useEffect(() => {
    if (!introVisible) return undefined;

    try {
      sessionStorage.setItem(INTRO_SESSION_KEY, 'true');
    } catch {
      // The intro still works when browser storage is unavailable.
    }

    const introTimer = window.setTimeout(() => setIntroVisible(false), 1900);
    return () => window.clearTimeout(introTimer);
  }, [introVisible]);

  useEffect(() => {
    const elements = document.querySelectorAll('[data-reveal]');
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reduceMotion) {
      elements.forEach((element) => element.classList.add('is-visible'));
      return undefined;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.18 });

    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, []);

  return (
    <main className="vn-story">
      <div className={`vn-intro ${introVisible ? '' : 'vn-intro--leaving'}`} aria-hidden="true">
        <span className="vn-intro__eyebrow">TripMate presents</span>
        <div className="vn-intro__word">VIETNAM</div>
        <span className="vn-intro__count">01 — 03</span>
      </div>

      <nav className="vn-nav" aria-label="Điều hướng trang giới thiệu">
        <Link to="/" className="vn-nav__brand">TRIPMATE®</Link>
        <span className="vn-nav__edition">WONDERS OF VIETNAM · 2026</span>
        <div className="vn-nav__links">
          <Link to="/destinations">Điểm đến</Link>
          <Link to="/tours">Tour</Link>
        </div>
      </nav>

      <section className="vn-hero" aria-labelledby="vn-hero-title">
        <img className="vn-hero__image" src={haLongHeroImage} alt="Vịnh Hạ Long nhìn từ trên cao" />
        <div className="vn-hero__overlay"></div>
        <div className="vn-hero__topline">
          <span>20.9101° N</span>
          <span>Di sản thế giới</span>
          <span>107.1839° E</span>
        </div>
        <div className="vn-hero__title" id="vn-hero-title">
          <span className="vn-hero__title-small">VINH</span>
          <span>HA LONG</span>
        </div>
        <div className="vn-hero__footer">
          <p>Từ mặt biển đến lòng đất — một hành trình qua những cảnh quan đã định hình nên Việt Nam.</p>
          <a href="#prologue">CUỘN ĐỂ KHÁM PHÁ <i className="bi bi-arrow-down"></i></a>
        </div>
        <a className="vn-photo-credit" href="https://unsplash.com/photos/limestone-karsts-rise-from-the-water-in-a-scenic-bay-wPquuVxGqBc" target="_blank" rel="noreferrer">
          Pierre Bonvalot · Unsplash
        </a>
      </section>

      <section className="vn-prologue" id="prologue">
        <div className="vn-prologue__label" data-reveal>
          <span>PROLOGUE</span>
          <span>01 / 04</span>
        </div>
        <div className="vn-prologue__copy" data-reveal>
          <p>Việt Nam không chỉ có một cảnh quan.</p>
          <h1>Một dải đất.<br /><em>Vô vàn thế giới.</em></h1>
          <p className="vn-prologue__body">Núi gặp biển. Rừng mọc trong hang sâu. Những dòng sông len giữa thành đá. Mỗi vùng đất là một nhịp kể khác của cùng một câu chuyện.</p>
        </div>
        <div className="vn-prologue__coordinate" data-reveal>08° → 23° BẮC</div>
      </section>

      <div className="vn-marquee" aria-hidden="true">
        <div className="vn-marquee__track">
          <span>DI SẢN THIÊN NHIÊN</span><i>✦</i><span>VIỆT NAM</span><i>✦</i><span>THE LIVING LAND</span><i>✦</i>
          <span>DI SẢN THIÊN NHIÊN</span><i>✦</i><span>VIỆT NAM</span><i>✦</i><span>THE LIVING LAND</span><i>✦</i>
        </div>
      </div>

      {wonders.map((wonder, index) => (
        <section key={wonder.number} className={`vn-chapter ${index % 2 ? 'vn-chapter--reverse' : ''}`}>
          <div className="vn-chapter__visual" data-reveal>
            <img src={wonder.image} alt={`${wonder.name}, ${wonder.location}`} loading="lazy" />
            <span className="vn-chapter__number">{wonder.number}</span>
            <a href={wonder.source} target="_blank" rel="noreferrer" className="vn-chapter__credit">{wonder.credit}</a>
          </div>
          <article className="vn-chapter__content" data-reveal>
            <div className="vn-chapter__meta">
              <span>{wonder.location}</span>
              <span>{wonder.coordinates}</span>
            </div>
            <p className="vn-chapter__name">{wonder.name}</p>
            <h2>{wonder.headline}</h2>
            <p className="vn-chapter__description">{wonder.description}</p>
            <Link to="/destinations" className="vn-chapter__link">
              <span>Khám phá điểm đến</span><i className="bi bi-arrow-up-right"></i>
            </Link>
          </article>
        </section>
      ))}

      <section className="vn-epilogue">
        <div className="vn-epilogue__stamp" data-reveal>VIET<br />NAM</div>
        <div className="vn-epilogue__content" data-reveal>
          <p>EPILOGUE · 04 / 04</p>
          <h2>Đừng chỉ ngắm nhìn.<br />Hãy bước vào câu chuyện.</h2>
          <div className="vn-epilogue__actions">
            <Link to="/tours">Khám phá tour <i className="bi bi-arrow-right"></i></Link>
            <Link to="/destinations">Xem điểm đến <i className="bi bi-arrow-right"></i></Link>
          </div>
        </div>
        <div className="vn-epilogue__footer">
          <span>TRIPMATE® 2026</span>
          <Link to="/">Trở về trang chủ</Link>
          <span>MADE FOR VIETNAM</span>
        </div>
      </section>
    </main>
  );
};

export default AboutVietnam;
