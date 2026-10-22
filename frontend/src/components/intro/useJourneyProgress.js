import { useEffect, useRef, useState } from 'react';

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export default function useJourneyProgress(chapterCount) {
  const pageRef = useRef(null);
  const sectionRefs = useRef([]);
  const progressRef = useRef(0);
  const activeRef = useRef(0);
  const frameRef = useRef(0);
  const [activeChapter, setActiveChapter] = useState(0);

  useEffect(() => {
    const requestedSection = window.location.hash
      ? document.getElementById(window.location.hash.slice(1))
      : null;

    if (requestedSection) {
      requestedSection.scrollIntoView({ block: 'start', behavior: 'auto' });
    } else {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    }

    const update = () => {
      frameRef.current = 0;
      const sections = sectionRefs.current.filter(Boolean);
      if (!sections.length) return;

      const probe = window.scrollY + window.innerHeight * 0.48;
      let nextChapter = 0;

      for (let index = 0; index < sections.length; index += 1) {
        if (probe >= sections[index].offsetTop) nextChapter = index;
      }

      const section = sections[nextChapter];
      const localProgress = clamp(
        (probe - section.offsetTop) / Math.max(section.offsetHeight, 1),
        0,
        1
      );
      const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      const atEnd = window.scrollY >= maxScroll - 2;
      const storyProgress = atEnd ? 1 : (nextChapter + localProgress) / chapterCount;

      progressRef.current = clamp(storyProgress, 0, 1);
      pageRef.current?.style.setProperty('--tm-story-progress', progressRef.current.toFixed(4));
      pageRef.current?.style.setProperty('--tm-scene-local', localProgress.toFixed(4));

      if (nextChapter !== activeRef.current) {
        activeRef.current = nextChapter;
        setActiveChapter(nextChapter);
      }
    };

    const requestUpdate = () => {
      if (frameRef.current) return;
      frameRef.current = window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener('scroll', requestUpdate, { passive: true });
    window.addEventListener('resize', requestUpdate);

    return () => {
      if (frameRef.current) window.cancelAnimationFrame(frameRef.current);
      window.removeEventListener('scroll', requestUpdate);
      window.removeEventListener('resize', requestUpdate);
    };
  }, [chapterCount]);

  return { pageRef, sectionRefs, progressRef, activeChapter };
}
