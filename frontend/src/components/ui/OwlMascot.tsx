import React, { memo, useEffect, useMemo, useState } from 'react';
import Lottie from 'lottie-react';
import useLowPowerMode from '../../hooks/useLowPowerMode';

type OwlMascotProps = {
  className?: string;
};

const OwlMascot: React.FC<OwlMascotProps> = memo(({ className }) => {
  const isLowPower = useLowPowerMode();
  const shouldAnimate = !isLowPower;
  const [animationData, setAnimationData] = useState<Record<string, unknown> | null>(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    if (!shouldAnimate) {
      setAnimationData(null);
      setLoadError(false);
      return;
    }

    const controller = new AbortController();

    const loadAnimation = async () => {
      try {
        const response = await fetch('/mascot/owl.json', { signal: controller.signal });
        if (!response.ok) {
          throw new Error('Falha ao carregar animacao');
        }
        const data = (await response.json()) as Record<string, unknown>;
        setAnimationData(data);
      } catch (error) {
        if (!controller.signal.aborted) {
          setLoadError(true);
        }
      }
    };

    loadAnimation();

    return () => controller.abort();
  }, [shouldAnimate]);

  // Memoizar o className para evitar recálculo
  const mascotClassName = useMemo(() => {
    return `owl-mascot ${isLowPower ? 'owl-mascot--static' : ''} ${className ?? ''}`.trim();
  }, [isLowPower, className]);

  // Memoizar o estilo para evitar re-render do Lottie
  const lottieStyle = useMemo(() => ({ width: '100%', height: '100%' }), []);

  const fallback = (
    <svg viewBox="0 0 120 120" className={mascotClassName} aria-hidden="true">
      <defs>
        <linearGradient id="owlBody" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#7c3aed" />
          <stop offset="100%" stopColor="#22d3ee" />
        </linearGradient>
        <linearGradient id="owlBelly" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#f8fafc" />
          <stop offset="100%" stopColor="#e2e8f0" />
        </linearGradient>
      </defs>
      <circle cx="60" cy="60" r="46" fill="url(#owlBody)" />
      <circle cx="60" cy="70" r="28" fill="url(#owlBelly)" />
      <circle cx="44" cy="55" r="10" fill="#0f172a" />
      <circle cx="76" cy="55" r="10" fill="#0f172a" />
      <circle cx="41" cy="52" r="3" fill="#f8fafc" />
      <circle cx="73" cy="52" r="3" fill="#f8fafc" />
      <path d="M60 62 L52 78 L68 78 Z" fill="#fbbf24" />
    </svg>
  );

  if (!shouldAnimate || loadError || !animationData) {
    return fallback;
  }

  return (
    <Lottie
      animationData={animationData}
      loop={shouldAnimate}
      autoplay={shouldAnimate}
      className={mascotClassName}
      style={lottieStyle}
      aria-hidden="true"
    />
  );
});
OwlMascot.displayName = 'OwlMascot';

export default OwlMascot;
