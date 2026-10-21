import { Suspense, useCallback, useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { Link, useNavigate } from 'react-router-dom';
import * as THREE from 'three';
import IntroScene from './IntroScene';
import IntroLoader from './IntroLoader';
import IntroFallback from './IntroFallback';
import IntroErrorBoundary from './IntroErrorBoundary';
import { ABOUT_CHAPTERS, ABOUT_CHAPTER_COUNT } from './aboutStory';
import useJourneyProgress from './useJourneyProgress';
import { useToast } from '../../hooks/useToast';
import { TRIPMATE_LOGO_URL } from '../../constants/brand';

function ChapterPreview({ feature, chapterRoute }) {
  const navigate = useNavigate();
  const toast = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [isSaved, setIsSaved] = useState(true);
  const [activeStar, setActiveStar] = useState(5);
  const [activeTimelineIdx, setActiveTimelineIdx] = useState(null);

  if (!feature) return null;

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      navigate(`/destinations?search=${encodeURIComponent(searchTerm.trim())}`);
    } else {
      navigate('/destinations');
    }
  };

  const handleTagClick = (tag, e) => {
    e.stopPropagation();
    toast.info(`Đang lọc điểm đến theo: ${tag}`);
    navigate(`/destinations?search=${encodeURIComponent(tag)}`);
  };

  const handleToggleBookmark = (e) => {
    e.stopPropagation();
    setIsSaved((prev) => {
      const next = !prev;
      if (next) {
        toast.success('Đã lưu Vịnh Hạ Long vào danh sách yêu thích!');
      } else {
        toast.info('Đã xóa Vịnh Hạ Long khỏi danh sách yêu thích.');
      }
      return next;
    });
  };

  const handleCardClick = () => {
    if (chapterRoute) {
      navigate(chapterRoute);
    }
  };

  return (
    <div
      className={`tm-about-feature tm-about-feature--${feature.kind} tm-about-feature--interactive`}
      onClick={handleCardClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && e.target === e.currentTarget) handleCardClick();
      }}
      title="Bấm để chuyển tới trang tương ứng"
    >
      <div className="tm-about-feature__eyebrow">
        <span>{feature.eyebrow}</span>
        {feature.badge && (
          <strong className="tm-about-feature__badge-pulse">{feature.badge}</strong>
        )}
      </div>

      {feature.kind === 'search' && (
        <>
          <form
            className="tm-about-feature__search"
            onSubmit={handleSearchSubmit}
            onClick={(e) => e.stopPropagation()}
          >
            <svg
              className="tm-about-feature__search-icon"
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              fill="currentColor"
              viewBox="0 0 16 16"
              aria-hidden="true"
            >
              <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z" />
            </svg>
            <input
              type="text"
              className="tm-about-feature__search-input"
              placeholder={feature.hint || 'Bạn muốn đi đâu?'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              aria-label="Tìm kiếm điểm đến"
            />
            <button
              type="submit"
              className="tm-about-feature__search-btn"
              title="Tìm kiếm điểm đến"
              aria-label="Tìm kiếm điểm đến"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="15"
                height="15"
                fill="currentColor"
                viewBox="0 0 16 16"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M1 8a.5.5 0 0 1 .5-.5h11.793l-3.147-3.146a.5.5 0 0 1 .708-.708l4 4a.5.5 0 0 1 0 .708l-4 4a.5.5 0 0 1-.708-.708L13.293 8.5H1.5A.5.5 0 0 1 1 8z"
                />
              </svg>
            </button>
          </form>
          <div className="tm-about-feature__tags">
            {feature.tags.map((tag) => (
              <button
                type="button"
                key={tag}
                className="tm-about-feature__tag-chip"
                onClick={(e) => handleTagClick(tag, e)}
                title={`Khám phá điểm đến ${tag}`}
              >
                <i className="bi bi-compass" /> {tag}
              </button>
            ))}
          </div>
        </>
      )}

      {feature.kind === 'destination' && (
        <div className="tm-about-feature__destination">
          <span className="tm-about-feature__icon">
            <i className="bi bi-geo-alt-fill" />
          </span>
          <div className="tm-about-feature__text-col">
            <strong>{feature.title}</strong>
            <small>{feature.meta}</small>
          </div>
          <div className="tm-about-feature__dest-actions">
            <span className="tm-about-feature__rating">
              <i className="bi bi-star-fill" /> {feature.rating}
              {feature.reviewCount && <small className="ms-1 text-white-50">({feature.reviewCount})</small>}
            </span>
            <button
              type="button"
              className={`tm-about-feature__bookmark-btn ${isSaved ? 'is-saved' : ''}`}
              onClick={handleToggleBookmark}
              title={isSaved ? 'Đã lưu (Bấm để bỏ lưu)' : 'Bấm để lưu vào danh sách yêu thích'}
              aria-label="Lưu vào danh sách yêu thích"
            >
              <i className={`bi ${isSaved ? 'bi-bookmark-check-fill' : 'bi-bookmark'}`} />
            </button>
          </div>
        </div>
      )}

      {feature.kind === 'tour' && (
        <div className="tm-about-feature__tour">
          <div className="tm-about-feature__text-col">
            <strong>{feature.title}</strong>
            <small><i className="bi bi-clock me-1" />{feature.meta}</small>
          </div>
          <div className="tm-about-feature__tour-meta">
            <span className="tm-about-feature__seats-tag">
              <span className="tm-about-feature__pulse-dot" /> {feature.badge}
            </span>
            <strong>{feature.price}</strong>
          </div>
        </div>
      )}

      {feature.kind === 'itinerary' && (
        <>
          <div className="tm-about-feature__timeline">
            {feature.items.map((item, idx) => {
              const time = typeof item === 'object' ? item.time : item[0];
              const label = typeof item === 'object' ? item.label : item[1];
              const type = typeof item === 'object' ? item.type : '';
              return (
                <div
                  key={`${time}-${label}`}
                  className={`tm-about-feature__timeline-item ${activeTimelineIdx === idx ? 'is-hovered' : ''}`}
                  onMouseEnter={() => setActiveTimelineIdx(idx)}
                  onMouseLeave={() => setActiveTimelineIdx(null)}
                >
                  <time>{time}</time>
                  <i />
                  <span className="tm-about-feature__timeline-text">{label}</span>
                  {type && <span className="tm-about-feature__timeline-tag">{type}</span>}
                </div>
              );
            })}
          </div>
          <div className="tm-about-feature__budget">
            <span><i className="bi bi-wallet2 me-1" /> {feature.budget}</span>
            <div className="tm-about-feature__people">
              {feature.collaborators.map((person) => {
                const initial = typeof person === 'object' ? person.initial : person;
                const name = typeof person === 'object' ? person.name : person;
                return (
                  <i key={initial} title={name} aria-label={name}>
                    {initial}
                  </i>
                );
              })}
              <small>Cùng chỉnh sửa</small>
            </div>
          </div>
        </>
      )}

      {feature.kind === 'complete' && (
        <div className="tm-about-feature__complete">
          <span className="tm-about-feature__check">
            <i className="bi bi-check2" />
          </span>
          <div className="tm-about-feature__text-col">
            <strong>{feature.title}</strong>
            <small>{feature.meta}</small>
          </div>
          <div className="tm-about-feature__stars-group">
            {[1, 2, 3, 4, 5].map((star) => (
              <i
                key={star}
                className={`bi ${star <= activeStar ? 'bi-star-fill' : 'bi-star'} tm-about-feature__star-interactive`}
                onMouseEnter={() => setActiveStar(star)}
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveStar(star);
                  toast.success(`Cảm ơn bạn đã đánh giá ${star}/5 sao!`);
                }}
                role="button"
                tabIndex={0}
                title={`${star}/5 sao`}
                aria-label={`Đánh giá ${star} sao`}
              />
            ))}
          </div>
        </div>
      )}

      <div className="tm-about-feature__action-hint">
        <span>{feature.actionLabel || 'Khám phá ngay'}</span>
        <i className="bi bi-arrow-right" />
      </div>
    </div>
  );
}

function DesktopIntro({ onComplete, reducedMotion }) {
  const { pageRef, sectionRefs, progressRef, activeChapter } = useJourneyProgress(ABOUT_CHAPTER_COUNT);
  const [isSceneReady, setIsSceneReady] = useState(false);

  const scrollToChapter = useCallback((index) => {
    if (!isSceneReady) return;
    const targetIdx = Math.max(0, Math.min(index, ABOUT_CHAPTER_COUNT - 1));
    const targetSection = sectionRefs.current[targetIdx];
    if (targetSection) {
      targetSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [sectionRefs, isSceneReady]);

  // Support Arrow keys for smooth navigation between chapters
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isSceneReady) return;
      // Don't hijack if typing in input
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;

      if (e.key === 'ArrowDown' || e.key === 'PageDown') {
        e.preventDefault();
        scrollToChapter(activeChapter + 1);
      } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
        e.preventDefault();
        scrollToChapter(activeChapter - 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeChapter, scrollToChapter, isSceneReady]);

  const fallback = (
    <IntroFallback
      onComplete={onComplete}
      message="Thiết bị chưa thể mở không gian 3D. Bạn vẫn có thể tiếp tục khám phá các điểm đến Việt Nam."
    />
  );

  return (
    <main ref={pageRef} className={`tm-about-page tm-about-desktop tm-about-tone-${activeChapter}`}>
      <div className="tm-about-canvas" aria-hidden="true">
        <IntroErrorBoundary fallback={fallback}>
          <Canvas
            shadows={!reducedMotion}
            dpr={[1, 1.5]}
            camera={{ position: [0, 3.4, 13.5], fov: 43, near: 0.08, far: 1000 }}
            gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
            onCreated={({ gl }) => {
              gl.toneMapping = THREE.ACESFilmicToneMapping;
              gl.toneMappingExposure = 0.92;
            }}
          >
            <Suspense fallback={null}>
              <IntroScene progressRef={progressRef} reducedMotion={reducedMotion} />
            </Suspense>
          </Canvas>
        </IntroErrorBoundary>
      </div>

      <div className="tm-about-horizon-mist" aria-hidden="true" />
      <div className="tm-about-film" aria-hidden="true" />

      <header className="tm-about-header">
        <Link to="/" className="tm-about-brand" aria-label="TripMate - Trang chủ">
          <img src={TRIPMATE_LOGO_URL} alt="" />
          <span>TRIPMATE<sup>®</sup></span>
        </Link>
        <span className="tm-about-edition">WONDERS OF VIETNAM · 2026</span>
        <nav aria-label="Điều hướng trang giới thiệu">
          <Link to="/destinations">Điểm đến</Link>
          <Link to="/tours">Tour</Link>
          <Link to="/itinerary">Lịch trình</Link>
        </nav>
      </header>

      {/* Enhanced Sidebar Rail with smooth scroll & hover tooltip */}
      <aside className="tm-about-rail" aria-label={`Chương ${activeChapter + 1} trên ${ABOUT_CHAPTER_COUNT}`}>
        <span className="tm-about-rail__line"><i /></span>
        {ABOUT_CHAPTERS.map((chapter, index) => (
          <div key={chapter.number} className="tm-about-rail__item-wrap">
            <button
              type="button"
              onClick={() => scrollToChapter(index)}
              className={`tm-about-rail__btn ${index === activeChapter ? 'is-active' : ''}`}
              aria-label={`Đến chương ${index + 1}: ${chapter.railLabel || chapter.title}`}
            >
              {chapter.number}
            </button>
            <span className="tm-about-rail__tooltip" aria-hidden="true">
              <strong>{chapter.number}</strong> · {chapter.railLabel || chapter.kicker}
            </span>
          </div>
        ))}
      </aside>

      {/* Narrative Section */}
      <div className="tm-about-narrative" aria-live="polite">
        {ABOUT_CHAPTERS.map((chapter, index) => (
          <article
            key={chapter.number}
            className={`tm-about-copy tm-about-copy--${chapter.align} ${index === activeChapter ? 'is-active' : ''}`}
            aria-hidden={index !== activeChapter}
          >
            <div className="tm-about-copy__meta">
              <span>CHƯƠNG {chapter.number}</span>
              <span>{chapter.kicker}</span>
            </div>
            <h1>{chapter.title}<br /><em>{chapter.accent}</em></h1>
            <div className="tm-about-copy__footer">
              <p>{chapter.description}</p>
              <div className="tm-about-place">
                <span>{chapter.location}</span>
                <span>{chapter.coordinates}</span>
              </div>
            </div>

            {/* Interactive Feature Preview */}
            <ChapterPreview feature={chapter.feature} chapterRoute={chapter.route} />

            {chapter.final ? (
              <div className="tm-about-actions">
                <button type="button" className="tm-about-primary" onClick={onComplete}>
                  Khám phá điểm đến <i className="bi bi-arrow-up-right ms-1" />
                </button>
                <Link to="/tours" className="tm-about-secondary">Xem tour</Link>
              </div>
            ) : (
              <div className="tm-about-chapter-links">
                <Link to={chapter.route} className="tm-about-feature-link">
                  {chapter.routeLabel} <i className="bi bi-arrow-up-right ms-1" />
                </Link>
                <button
                  type="button"
                  onClick={() => scrollToChapter(index + 1)}
                  className="tm-about-scroll-cue tm-about-scroll-cue--btn"
                >
                  Tiếp tục câu chuyện <i className="bi bi-arrow-down ms-1" />
                </button>
              </div>
            )}
          </article>
        ))}
      </div>

      {/* Invisible Story Scroll Sections */}
      <div className="tm-about-story" aria-hidden="true">
        {ABOUT_CHAPTERS.map((chapter, index) => (
          <section
            id={`about-chapter-${index + 1}`}
            key={chapter.number}
            ref={(node) => { sectionRefs.current[index] = node; }}
            className="tm-about-chapter"
          />
        ))}
      </div>

      {/* Floating Bottom Navigation for 1-Click Chapter Switch */}
      <div className="tm-about-floating-nav" aria-label="Điều hướng nhanh các chương">
        <button
          type="button"
          onClick={() => scrollToChapter(activeChapter - 1)}
          disabled={activeChapter === 0}
          title="Chương trước (Phím ↑)"
          aria-label="Chương trước"
        >
          <i className="bi bi-chevron-up" />
        </button>
        <span className="tm-about-floating-nav__count">
          <strong>{String(activeChapter + 1).padStart(2, '0')}</strong>
          <small>/{String(ABOUT_CHAPTER_COUNT).padStart(2, '0')}</small>
        </span>
        <button
          type="button"
          onClick={() => scrollToChapter(activeChapter + 1)}
          disabled={activeChapter === ABOUT_CHAPTER_COUNT - 1}
          title="Chương tiếp theo (Phím ↓)"
          aria-label="Chương tiếp theo"
        >
          <i className="bi bi-chevron-down" />
        </button>
      </div>

      <div className="tm-about-progress" aria-hidden="true"><span /></div>
      <IntroLoader onReady={() => setIsSceneReady(true)} />
    </main>
  );
}

export default DesktopIntro;
