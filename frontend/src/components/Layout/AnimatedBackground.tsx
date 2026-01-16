import React from 'react';
import useLowPowerMode from '../../hooks/useLowPowerMode';
import DustParticles3D from './DustParticles3D';

interface AnimatedBackgroundProps {
  className?: string;
  enableBlueWaves?: boolean;
  enableParticles?: boolean;
}

const SkyBackground: React.FC = () => (
  <svg
    className="absolute inset-0 w-full h-full"
    preserveAspectRatio="xMidYMid slice"
    aria-hidden="true"
  >
    <defs>
      {/* Sky gradient */}
      <linearGradient id="sky-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#1E3A8A" stopOpacity="0.9" />
        <stop offset="30%" stopColor="#2E5F8A" stopOpacity="0.8" />
        <stop offset="60%" stopColor="#3B82F6" stopOpacity="0.7" />
        <stop offset="100%" stopColor="#4682B4" stopOpacity="0.5" />
      </linearGradient>
      
      {/* Cloud gradient */}
      <radialGradient id="cloud-gradient">
        <stop offset="0%" stopColor="rgba(224, 247, 250, 0.9)" />
        <stop offset="100%" stopColor="rgba(186, 230, 253, 0.4)" />
      </radialGradient>
      
      {/* Soft cloud filter */}
      <filter id="cloud-blur">
        <feGaussianBlur stdDeviation="4" />
      </filter>
      
      {/* Subtle atmospheric movement */}
      <filter id="atmosphere">
        <feTurbulence
          type="turbulence"
          baseFrequency="0.001 0.001"
          numOctaves="1"
          seed="10"
          result="turbulence"
        >
          <animate
            attributeName="baseFrequency"
            dur="60s"
            values="0.001 0.0015;0.0015 0.002;0.002 0.001"
            repeatCount="indefinite"
          />
        </feTurbulence>
        <feDisplacementMap
          in="SourceGraphic"
          in2="turbulence"
          scale="2"
          xChannelSelector="R"
          yChannelSelector="G"
        />
      </filter>
    </defs>
    
    {/* Sky background */}
    <rect
      width="100%"
      height="100%"
      fill="url(#sky-gradient)"
    />
    
    {/* Cloud layers with natural movement */}
    <g filter="url(#atmosphere)">
      {/* Background clouds */}
      <ellipse
        cx="25%"
        cy="15%"
        rx="40%"
        ry="20%"
        fill="url(#cloud-gradient)"
        filter="url(#cloud-blur)"
        opacity="0.6"
      >
        <animate
          attributeName="cx"
          dur="80s"
          values="25%;30%;35%;30%;25%"
          repeatCount="indefinite"
        />
        <animate
          attributeName="opacity"
          dur="40s"
          values="0.6;0.7;0.6;0.5;0.6"
          repeatCount="indefinite"
        />
      </ellipse>
      
      <ellipse
        cx="70%"
        cy="25%"
        rx="35%"
        ry="18%"
        fill="url(#cloud-gradient)"
        filter="url(#cloud-blur)"
        opacity="0.5"
      >
        <animate
          attributeName="cx"
          dur="90s"
          values="70%;65%;60%;65%;70%"
          repeatCount="indefinite"
        />
        <animate
          attributeName="cy"
          dur="70s"
          values="25%;22%;20%;22%;25%"
          repeatCount="indefinite"
        />
      </ellipse>
      
      {/* Mid-level clouds */}
      <ellipse
        cx="15%"
        cy="40%"
        rx="25%"
        ry="12%"
        fill="url(#cloud-gradient)"
        filter="url(#cloud-blur)"
        opacity="0.4"
      >
        <animate
          attributeName="cx"
          dur="100s"
          values="15%;20%;18%;20%;15%"
          repeatCount="indefinite"
        />
      </ellipse>
      
      <ellipse
        cx="80%"
        cy="45%"
        rx="30%"
        ry="15%"
        fill="url(#cloud-gradient)"
        filter="url(#cloud-blur)"
        opacity="0.3"
      >
        <animate
          attributeName="cx"
          dur="85s"
          values="80%;75%;70%;75%;80%"
          repeatCount="indefinite"
        />
      </ellipse>
      
      {/* Foreground clouds */}
      <ellipse
        cx="50%"
        cy="60%"
        rx="35%"
        ry="10%"
        fill="url(#cloud-gradient)"
        filter="url(#cloud-blur)"
        opacity="0.7"
      >
        <animate
          attributeName="cx"
          dur="60s"
          values="50%;45%;40%;45%;50%"
          repeatCount="indefinite"
        />
        <animate
          attributeName="opacity"
          dur="30s"
          values="0.7;0.5;0.7;0.6;0.7"
          repeatCount="indefinite"
        />
      </ellipse>
      
      <ellipse
        cx="65%"
        cy="70%"
        rx="20%"
        ry="8%"
        fill="url(#cloud-gradient)"
        filter="url(#cloud-blur)"
        opacity="0.5"
      >
        <animate
          attributeName="cx"
          dur="70s"
          values="65%;60%;55%;60%;65%"
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
            // Mobile: céu estático com nuvens (sem animação)
            <div className="sky-static" aria-hidden="true" />
          ) : (
            // Desktop: animação de céu completa
            <SkyBackground />
          )
        ) : (
          <div className="sky-static" aria-hidden="true" />
        )
      )}
      {!enableBlueWaves && <div className="fabric-static" aria-hidden="true" />}
      {enableEffects && enableParticles && <DustParticles3D />}
    </div>
  );
};

export default AnimatedBackground;
