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
            <linearGradient id="blueWaveGradient" x1="100%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#03060f" />
              <stop offset="45%" stopColor="#061225" />
              <stop offset="100%" stopColor="#02040a" />
            </linearGradient>
            <linearGradient id="blueWaveSheen" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#0f2f5c" stopOpacity="0.42" />
              <stop offset="50%" stopColor="#1a4178" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#061226" stopOpacity="0.42" />
            </linearGradient>
            <linearGradient id="blueWaveMaskGradient" x1="100%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
              <stop offset="55%" stopColor="#ffffff" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0.1" />
            </linearGradient>
            <mask id="blueWaveMask">
              <rect width="1200" height="1200" fill="url(#blueWaveMaskGradient)" />
            </mask>
            <filter id="blueWaveDisplace" x="-20%" y="-20%" width="140%" height="140%">
              <feTurbulence
                type="fractalNoise"
                baseFrequency="0.0025 0.012"
                numOctaves="1"
                seed="3"
                result="noise"
              >
                <animate
                  attributeName="baseFrequency"
                  dur="26s"
                  values="0.0025 0.01;0.004 0.014;0.0025 0.01"
                  repeatCount="indefinite"
                />
              </feTurbulence>
              <feDisplacementMap in="SourceGraphic" in2="noise" scale="70" xChannelSelector="R" yChannelSelector="G">
                <animate attributeName="scale" dur="22s" values="54;80;54" repeatCount="indefinite" />
              </feDisplacementMap>
            </filter>
            <filter id="blueWaveLight" x="-20%" y="-20%" width="140%" height="140%">
              <feTurbulence
                type="fractalNoise"
                baseFrequency="0.003 0.014"
                numOctaves="1"
                seed="7"
                result="heightMap"
              >
                <animate
                  attributeName="baseFrequency"
                  dur="28s"
                  values="0.003 0.012;0.005 0.016;0.003 0.012"
                  repeatCount="indefinite"
                />
              </feTurbulence>
              <feDiffuseLighting in="heightMap" lightingColor="#4c6fab" surfaceScale="38" result="light">
                <feDistantLight azimuth="225" elevation="54" />
              </feDiffuseLighting>
              <feComposite in="light" in2="SourceGraphic" operator="in" />
            </filter>
          </defs>
          <rect width="1200" height="1200" fill="url(#blueWaveGradient)" filter="url(#blueWaveDisplace)" />
          <rect
            width="1200"
            height="1200"
            fill="url(#blueWaveSheen)"
            filter="url(#blueWaveLight)"
            mask="url(#blueWaveMask)"
            opacity="0.6"
          />
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
