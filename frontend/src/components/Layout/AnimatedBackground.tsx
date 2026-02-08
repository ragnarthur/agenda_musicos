import React, { useMemo, memo } from 'react';
import useLowPowerMode from '../../hooks/useLowPowerMode';
import DustParticles3D from './DustParticles3D';

interface AnimatedBackgroundProps {
  className?: string;
  enableBlueWaves?: boolean;
  enableParticles?: boolean;
}

// Mesh Gradient animado com blobs de cor - memoizado para evitar re-renders
const MeshGradient = memo<{ isStatic?: boolean }>(({ isStatic = false }) => (
  <div className="mesh-gradient-container" aria-hidden="true">
    {/* Base background gradient */}
    <div className="mesh-gradient-base" />

    {/* Animated blobs */}
    <div className={`mesh-blob mesh-blob-1 ${isStatic ? 'mesh-blob-static' : ''}`} />
    <div className={`mesh-blob mesh-blob-2 ${isStatic ? 'mesh-blob-static' : ''}`} />
    <div className={`mesh-blob mesh-blob-3 ${isStatic ? 'mesh-blob-static' : ''}`} />
    <div className={`mesh-blob mesh-blob-4 ${isStatic ? 'mesh-blob-static' : ''}`} />
    <div className={`mesh-blob mesh-blob-5 ${isStatic ? 'mesh-blob-static' : ''}`} />

    {/* SVG filter for blur/fusion effect */}
    <svg className="mesh-blur-filter" aria-hidden="true">
      <defs>
        <filter id="mesh-goo">
          <feGaussianBlur in="SourceGraphic" stdDeviation="40" result="blur" />
          <feColorMatrix
            in="blur"
            mode="matrix"
            values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7"
            result="goo"
          />
          <feBlend in="SourceGraphic" in2="goo" />
        </filter>
      </defs>
    </svg>
  </div>
));
MeshGradient.displayName = 'MeshGradient';

const AnimatedBackground: React.FC<AnimatedBackgroundProps> = memo(
  ({ className = '', enableBlueWaves = false, enableParticles = true }) => {
    const isLowPower = useLowPowerMode();

    // Memoizar resultado do matchMedia para evitar recálculo em cada render
    const isMobile = useMemo(() => {
      return typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches;
    }, []);

    const isTinyMobile = useMemo(() => {
      return typeof window !== 'undefined' && window.matchMedia('(max-width: 360px)').matches;
    }, []);

    const enableEffects = !isLowPower && !isTinyMobile;

    return (
      <div
        className={`animated-bg pointer-events-none absolute inset-0 z-0 overflow-hidden ${className}`}
      >
        {enableBlueWaves &&
          (enableEffects ? (
            isMobile ? (
              // Mobile: mesh gradient estático (sem animação para economizar bateria)
              <MeshGradient isStatic />
            ) : (
              // Desktop: mesh gradient animado completo
              <MeshGradient />
            )
          ) : (
            // Tiny/low-power: fundo estático simples para evitar filtros pesados (especialmente no iPhone SE)
            <div className="absolute inset-0 mesh-gradient-fallback" />
          ))}
        {!enableBlueWaves && <div className="fabric-static" aria-hidden="true" />}
        {enableEffects && enableParticles && <DustParticles3D />}
      </div>
    );
  }
);
AnimatedBackground.displayName = 'AnimatedBackground';

export default AnimatedBackground;
