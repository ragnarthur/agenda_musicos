import React, { memo, useMemo, useState, useEffect } from 'react';
import Lottie from 'lottie-react';
import { logger } from '../../utils/logger';

type OwlMascotProps = {
  className?: string;
  autoplay?: boolean;
};

const OwlMascot: React.FC<OwlMascotProps> = memo(({ className, autoplay = true }) => {
  const [animationData, setAnimationData] = useState<Record<string, unknown> | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // Dynamic import para não incluir no bundle principal
    let isMounted = true;

    const loadAnimation = async () => {
      try {
        // Use dynamic import com Vite para code splitting
        const module = await import('../../assets/mascot/owl.json');
        if (isMounted) {
          setAnimationData(module.default as Record<string, unknown>);
          setLoaded(true);
        }
      } catch (error) {
        logger.error('OwlMascot', 'Failed to load owl mascot animation:', error);
      }
    };

    // Carregar apenas após um pequeno delay para não bloquear render inicial
    const timer = setTimeout(loadAnimation, 100);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, []);

  const mascotClassName = useMemo(() => {
    return `owl-mascot ${className ?? ''}`.trim();
  }, [className]);

  const lottieStyle = useMemo(() => ({ width: '100%', height: '100%' }), []);

  if (!loaded || !animationData) {
    return <div className={`owl-mascot-placeholder ${mascotClassName}`} style={{ opacity: '0.5' }} />;
  }

  return (
    <Lottie
      animationData={animationData}
      loop={autoplay}
      autoplay={autoplay}
      className={mascotClassName}
      style={lottieStyle}
      aria-hidden="true"
    />
  );
});
OwlMascot.displayName = 'OwlMascot';

export default OwlMascot;
