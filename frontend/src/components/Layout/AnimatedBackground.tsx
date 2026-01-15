import React, { useEffect, useRef } from 'react';
import useLowPowerMode from '../../hooks/useLowPowerMode';
import DustParticles3D from './DustParticles3D';

interface AnimatedBackgroundProps {
  className?: string;
  enableParallax?: boolean;
  enableBlueWaves?: boolean;
}

const AnimatedBackground: React.FC<AnimatedBackgroundProps> = ({
  className = '',
  enableParallax = true,
  enableBlueWaves = false,
}) => {
  const blobPrimaryRef = useRef<HTMLDivElement | null>(null);
  const blobSecondaryRef = useRef<HTMLDivElement | null>(null);
  const isLowPower = useLowPowerMode();
  const enableEffects = !isLowPower;

  useEffect(() => {
    const blobPrimary = blobPrimaryRef.current;
    const blobSecondary = blobSecondaryRef.current;

    if (!enableParallax || !blobPrimary || !blobSecondary || isLowPower) return;
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
  }, [enableParallax, isLowPower]);

  return (
    <div className={`animated-bg pointer-events-none absolute inset-0 z-0 overflow-hidden ${className}`}>
      {enableBlueWaves && enableEffects && (
        <svg
          className="blue-wave-bg"
          viewBox="0 0 1200 1200"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="blueWaveGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0b1a3a" />
              <stop offset="50%" stopColor="#0e3f7a" />
              <stop offset="100%" stopColor="#0a2d5e" />
            </linearGradient>
            <linearGradient id="blueWaveSheen" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#1c5fb8" stopOpacity="0.6" />
              <stop offset="50%" stopColor="#3b7bd6" stopOpacity="0.75" />
              <stop offset="100%" stopColor="#0b2f66" stopOpacity="0.6" />
            </linearGradient>
            <filter id="blueWaveDisplace" x="-20%" y="-20%" width="140%" height="140%">
              <feTurbulence
                type="fractalNoise"
                baseFrequency="0.01 0.04"
                numOctaves="2"
                seed="3"
                result="noise"
              >
                <animate
                  attributeName="baseFrequency"
                  dur="16s"
                  values="0.01 0.035;0.015 0.05;0.01 0.035"
                  repeatCount="indefinite"
                />
              </feTurbulence>
              <feDisplacementMap in="SourceGraphic" in2="noise" scale="28" xChannelSelector="R" yChannelSelector="G">
                <animate attributeName="scale" dur="14s" values="18;32;18" repeatCount="indefinite" />
              </feDisplacementMap>
            </filter>
            <filter id="blueWaveLight" x="-20%" y="-20%" width="140%" height="140%">
              <feTurbulence
                type="fractalNoise"
                baseFrequency="0.015 0.05"
                numOctaves="2"
                seed="7"
                result="heightMap"
              >
                <animate
                  attributeName="baseFrequency"
                  dur="18s"
                  values="0.012 0.045;0.02 0.055;0.012 0.045"
                  repeatCount="indefinite"
                />
              </feTurbulence>
              <feDiffuseLighting in="heightMap" lightingColor="#7fb6ff" surfaceScale="18" result="light">
                <feDistantLight azimuth="220" elevation="48" />
              </feDiffuseLighting>
              <feComposite in="light" in2="SourceGraphic" operator="in" />
            </filter>
          </defs>
          <rect width="1200" height="1200" fill="url(#blueWaveGradient)" filter="url(#blueWaveDisplace)" />
          <rect width="1200" height="1200" fill="url(#blueWaveSheen)" filter="url(#blueWaveLight)" opacity="0.5" />
        </svg>
      )}
      {enableBlueWaves && !enableEffects && <div className="blue-wave-static" aria-hidden="true" />}
      {enableEffects ? (
        <>
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
                  baseFrequency="0.02 0.05"
                  numOctaves="3"
                  seed="2"
                  result="noise"
                >
                  <animate
                    attributeName="baseFrequency"
                    dur="18s"
                    values="0.015 0.04;0.03 0.06;0.015 0.04"
                    repeatCount="indefinite"
                  />
                </feTurbulence>
                <feDisplacementMap in="SourceGraphic" in2="noise" scale="40" xChannelSelector="R" yChannelSelector="G">
                  <animate attributeName="scale" dur="12s" values="28;48;28" repeatCount="indefinite" />
                </feDisplacementMap>
              </filter>
            </defs>
            <rect width="1200" height="1200" fill="url(#fabricGradient)" filter="url(#fabricDisplace)" />
            <rect width="1200" height="1200" fill="url(#fabricSheen)" filter="url(#fabricDisplace)" opacity="0.45" />
          </svg>
          <DustParticles3D />

          <div
            ref={blobPrimaryRef}
            className="parallax-blob absolute top-20 -left-20 h-96 w-96 rounded-full bg-primary-500/20 blur-[100px]"
          />
          <div
            ref={blobSecondaryRef}
            className="parallax-blob absolute bottom-20 right-0 h-80 w-80 rounded-full bg-indigo-500/15 blur-[80px]"
          />
        </>
      ) : (
        <div className="fabric-static" aria-hidden="true" />
      )}
    </div>
  );
};

export default AnimatedBackground;
