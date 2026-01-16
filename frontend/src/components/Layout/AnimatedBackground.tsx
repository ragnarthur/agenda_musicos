import React from 'react';
import useLowPowerMode from '../../hooks/useLowPowerMode';
import DustParticles3D from './DustParticles3D';

interface AnimatedBackgroundProps {
  className?: string;
  enableBlueWaves?: boolean;
  enableParticles?: boolean;
}

const WaveFilter: React.FC = () => (
  <svg
    className="absolute inset-0 w-full h-full"
    preserveAspectRatio="xMidYMid slice"
    aria-hidden="true"
  >
    <defs>
      <linearGradient id="wave-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#0f2847" />
        <stop offset="30%" stopColor="#0a1e3a" />
        <stop offset="60%" stopColor="#071428" />
        <stop offset="100%" stopColor="#030a14" />
      </linearGradient>
      <filter id="wave-distortion" x="-20%" y="-20%" width="140%" height="140%">
        <feTurbulence
          type="fractalNoise"
          baseFrequency="0.008 0.012"
          numOctaves="3"
          seed="5"
          result="noise"
        >
          <animate
            attributeName="baseFrequency"
            dur="25s"
            values="0.008 0.012;0.012 0.016;0.008 0.012"
            repeatCount="indefinite"
          />
        </feTurbulence>
        <feDisplacementMap
          in="SourceGraphic"
          in2="noise"
          scale="35"
          xChannelSelector="R"
          yChannelSelector="G"
        />
      </filter>
      <filter id="wave-glow">
        <feGaussianBlur stdDeviation="2" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>
    <rect
      width="100%"
      height="100%"
      fill="url(#wave-gradient)"
    />
    <g filter="url(#wave-distortion)">
      <ellipse
        cx="30%"
        cy="20%"
        rx="50%"
        ry="30%"
        fill="rgba(20, 60, 120, 0.4)"
        filter="url(#wave-glow)"
      >
        <animate
          attributeName="cy"
          dur="12s"
          values="20%;25%;20%"
          repeatCount="indefinite"
        />
        <animate
          attributeName="rx"
          dur="15s"
          values="50%;55%;50%"
          repeatCount="indefinite"
        />
      </ellipse>
      <ellipse
        cx="70%"
        cy="60%"
        rx="45%"
        ry="25%"
        fill="rgba(15, 50, 100, 0.35)"
        filter="url(#wave-glow)"
      >
        <animate
          attributeName="cy"
          dur="18s"
          values="60%;55%;60%"
          repeatCount="indefinite"
        />
        <animate
          attributeName="cx"
          dur="20s"
          values="70%;75%;70%"
          repeatCount="indefinite"
        />
      </ellipse>
      <ellipse
        cx="50%"
        cy="80%"
        rx="60%"
        ry="35%"
        fill="rgba(10, 40, 90, 0.3)"
        filter="url(#wave-glow)"
      >
        <animate
          attributeName="cy"
          dur="14s"
          values="80%;85%;80%"
          repeatCount="indefinite"
        />
      </ellipse>
    </g>
  </svg>
);

const AnimatedBackground: React.FC<AnimatedBackgroundProps> = ({
  className = '',
  enableBlueWaves = false,
  enableParticles = true,
}) => {
  const isLowPower = useLowPowerMode();
  const isMobile = typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches;
  const enableEffects = !isLowPower;

  return (
    <div className={`animated-bg pointer-events-none absolute inset-0 z-0 overflow-hidden ${className}`}>
      {enableBlueWaves && (
        enableEffects ? (
          isMobile ? (
            // Mobile: gradiente estático com pluma leve (sem animação SVG)
            <div className="blue-wave-static" aria-hidden="true" />
          ) : (
            // Desktop: animação SVG completa
            <WaveFilter />
          )
        ) : (
          <div className="blue-wave-static" aria-hidden="true" />
        )
      )}
      {!enableBlueWaves && <div className="fabric-static" aria-hidden="true" />}
      {enableEffects && enableParticles && <DustParticles3D />}
    </div>
  );
};

export default AnimatedBackground;
