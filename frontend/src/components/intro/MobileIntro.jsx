import { Link } from 'react-router-dom';
import { ABOUT_MOBILE_CHAPTERS } from './aboutStory';
import useJourneyProgress from './useJourneyProgress';
import { TRIPMATE_LOGO_URL } from '../../constants/brand';

function MobileIntro({ onComplete, reducedMotion }) {
  const chapterCount = ABOUT_MOBILE_CHAPTERS.length;
  const { pageRef, sectionRefs, activeChapter } = useJourneyProgress(chapterCount);

  return (
    <main ref={pageRef} className={`tm-about-page tm-about-mobile tm-about-tone-${activeChapter} ${reducedMotion ? 'is-reduced' : ''}`}>
      <div className="tm-about-backdrops" aria-hidden="true">
        {ABOUT_MOBILE_CHAPTERS.map((chapter, index) => (
          <div className={`tm-about-backdrop ${index === activeChapter ? 'is-active' : ''}`} key={chapter.number}>
            <img
              src={chapter.background}
              alt=""
              loading={index === 0 ? 'eager' : 'lazy'}
              fetchPriority={index === 0 ? 'high' : 'auto'}
            />
          </div>
        ))}
        <div className="tm-about-backdrops__veil" />
        <div className="tm-about-backdrops__grain" />
      </div>

      <header className="tm-about-header">
        <Link to="/" className="tm-about-brand" aria-label="TripMate - Trang chủ">
          <img src={TRIPMATE_LOGO_URL} alt="" />
          <span>TRIPMATE<sup>®</sup></span>
        </Link>
        <Link to="/tours" className="tm-about-mobile-tour">Tour <i className="bi bi-arrow-up-right" /></Link>
      </header>

      <div className="tm-about-mobile-counter" aria-hidden="true">
        <span>{String(activeChapter + 1).padStart(2, '0')}</span>
        <i />
        <span>{String(chapterCount).padStart(2, '0')}</span>
      </div>

      <div className="tm-about-story">
        {ABOUT_MOBILE_CHAPTERS.map((chapter, index) => (
          <section
            id={`about-mobile-chapter-${index + 1}`}
            key={chapter.number}
            ref={(node) => { sectionRefs.current[index] = node; }}
            className={`tm-about-chapter ${index === activeChapter ? 'is-active' : ''}`}
          >
            <div className="tm-about-chapter__sticky">
              <article className="tm-about-copy">
                <div className="tm-about-copy__meta">
                  <span>{chapter.kicker}</span>
                </div>
                <h1>{chapter.title}<br /><em>{chapter.accent}</em></h1>
                <p>{chapter.description}</p>
                {chapter.final ? (
                  <div className="tm-about-actions">
                    <button type="button" className="tm-about-primary" onClick={onComplete}>
                      Khám phá <i className="bi bi-arrow-right" />
                    </button>
                    <Link to="/tours" className="tm-about-secondary">Tour</Link>
                  </div>
                ) : (
                  <span className="tm-about-scroll-cue">Cuộn để tiếp tục <i className="bi bi-arrow-down" /></span>
                )}
              </article>
            </div>
          </section>
        ))}
      </div>

      <div className="tm-about-progress" aria-hidden="true"><span /></div>
    </main>
  );
}

export default MobileIntro;
