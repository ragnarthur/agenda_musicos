import { useMemo } from 'react';

interface PerformanceConfig {
  reducedMotion: boolean;
  isMobile: boolean;
  isLowEndDevice: boolean;
  prefersHighContrast: boolean;
}

export const usePerformanceConfig = (): PerformanceConfig => {
  const config = useMemo((): PerformanceConfig => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isMobile = window.matchMedia('(max-width: 768px)').matches;
    const isLowEndDevice = window.matchMedia('(max-width: 480px)').matches;
    const prefersHighContrast = window.matchMedia('(prefers-contrast: high)').matches;

    return {
      reducedMotion,
      isMobile,
      isLowEndDevice,
      prefersHighContrast,
    };
  }, []);

  return config;
};

export const getAnimationProps = (config: PerformanceConfig) => {
  const { reducedMotion, isMobile, isLowEndDevice } = config;

  if (reducedMotion) {
    return {
      initial: false,
      animate: false,
      transition: { duration: 0 },
    };
  }

  if (isLowEndDevice) {
    return {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      transition: { duration: 0.2 },
    };
  }

  if (isMobile) {
    return {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      transition: { duration: 0.3, ease: 'easeOut' },
    };
  }

  return {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    transition: { type: 'spring', stiffness: 120, damping: 18 },
  };
};

export const getStaggerChildren = (config: PerformanceConfig) => {
  const { reducedMotion, isMobile } = config;

  if (reducedMotion) {
    return 0;
  }

  if (isMobile) {
    return 0.05;
  }

  return 0.1;
};
