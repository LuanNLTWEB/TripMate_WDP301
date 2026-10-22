import { lazy, useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MobileIntro from '../components/intro/MobileIntro';
import IntroFallback from '../components/intro/IntroFallback';
import './AboutExperience.css';

const DesktopIntro = lazy(() => import('../components/intro/DesktopIntro'));

function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);

  useEffect(() => {
    const mediaQuery = window.matchMedia(query);
    const onChange = (event) => setMatches(event.matches);
    mediaQuery.addEventListener('change', onChange);
    return () => mediaQuery.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}

function supportsWebGL() {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

function AboutExperience() {
  const navigate = useNavigate();
  const isMobile = useMediaQuery('(max-width: 767px)');
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const [webGLAvailable] = useState(supportsWebGL);

  useEffect(() => {
    document.body.classList.add('tm-about-active');
    return () => document.body.classList.remove('tm-about-active');
  }, []);

  const exploreDestinations = useCallback(() => {
    navigate('/destinations');
  }, [navigate]);

  if (isMobile) {
    return <MobileIntro onComplete={exploreDestinations} reducedMotion={reducedMotion} />;
  }

  if (!webGLAvailable) {
    return <IntroFallback onComplete={exploreDestinations} />;
  }

  return <DesktopIntro onComplete={exploreDestinations} reducedMotion={reducedMotion} />;
}

export default AboutExperience;
