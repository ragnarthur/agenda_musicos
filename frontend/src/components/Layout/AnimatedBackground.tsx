import React, { useEffect, useRef } from 'react';

interface AnimatedBackgroundProps {
  className?: string;
  enableParallax?: boolean;
}

const AnimatedBackground: React.FC<AnimatedBackgroundProps> = ({ className = '', enableParallax = true }) => {
  const blobPrimaryRef = useRef<HTMLDivElement | null>(null);
  const blobSecondaryRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const blobPrimary = blobPrimaryRef.current;
    const blobSecondary = blobSecondaryRef.current;

    if (!enableParallax || !blobPrimary || !blobSecondary) return;
    if (!window.matchMedia('(pointer: fine)').matches) return;

    let rafId: number | null = null;
    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;

    const update = () => {
      currentX += (targetX - currentX) * 0.08;
      currentY += (targetY - currentY) * 0.08;

      const offsetX = currentX * 14;
      const offsetY = currentY * 12;

      blobPrimary.style.transform = `translate3d(${offsetX}px, ${offsetY}px, 0)`;
      blobSecondary.style.transform = `translate3d(${-offsetX}px, ${-offsetY}px, 0)`;

      if (Math.abs(currentX - targetX) > 0.001 || Math.abs(currentY - targetY) > 0.001) {
        rafId = requestAnimationFrame(update);
      } else {
        rafId = null;
      }
    };

    const onMove = (event: MouseEvent) => {
      const { innerWidth, innerHeight } = window;
      targetX = (event.clientX / innerWidth) * 2 - 1;
      targetY = (event.clientY / innerHeight) * 2 - 1;

      if (rafId === null) {
        rafId = requestAnimationFrame(update);
      }
    };

    window.addEventListener('mousemove', onMove);

    return () => {
      window.removeEventListener('mousemove', onMove);
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
    };
  }, [enableParallax]);

  return (
    <div className={`animated-bg pointer-events-none absolute inset-0 z-0 overflow-hidden ${className}`}>
      <svg
        className="fabric-wave"
        viewBox="0 0 1200 1200"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="fabricGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0b1220" />
            <stop offset="45%" stopColor="#0f1b2d" />
            <stop offset="100%" stopColor="#111827" />
          </linearGradient>
          <linearGradient id="fabricSheen" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#1f2937" />
            <stop offset="45%" stopColor="#243b55" />
            <stop offset="100%" stopColor="#111827" />
          </linearGradient>
          <filter id="fabricDisplace" x="-20%" y="-20%" width="140%" height="140%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.015 0.04"
              numOctaves="3"
              seed="2"
              result="noise"
            >
              <animate
                attributeName="baseFrequency"
                dur="20s"
                values="0.012 0.03;0.02 0.05;0.012 0.03"
                repeatCount="indefinite"
              />
            </feTurbulence>
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="30" xChannelSelector="R" yChannelSelector="G">
              <animate attributeName="scale" dur="14s" values="22;38;22" repeatCount="indefinite" />
            </feDisplacementMap>
          </filter>
        </defs>
        <rect width="1200" height="1200" fill="url(#fabricGradient)" filter="url(#fabricDisplace)" />
        <rect width="1200" height="1200" fill="url(#fabricSheen)" filter="url(#fabricDisplace)" opacity="0.45" />
      </svg>
      <div className="dust-layer" />
      <div className="dust-layer dust-layer--secondary" />

      <div
        ref={blobPrimaryRef}
        className="parallax-blob absolute top-20 -left-20 h-96 w-96 rounded-full bg-primary-500/20 blur-[100px]"
      />
      <div
        ref={blobSecondaryRef}
        className="parallax-blob absolute bottom-20 right-0 h-80 w-80 rounded-full bg-indigo-500/15 blur-[80px]"
      />
    </div>
  );
};

export default AnimatedBackground;
