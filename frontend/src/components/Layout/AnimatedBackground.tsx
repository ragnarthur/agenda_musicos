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
      {/* Dark sky gradient */}
      <linearGradient id="sky-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#0A0E27" stopOpacity="1" />
        <stop offset="30%" stopColor="#151932" stopOpacity="1" />
        <stop offset="60%" stopColor="#1A1F3A" stopOpacity="1" />
        <stop offset="100%" stopColor="#1E293B" stopOpacity="1" />
      </linearGradient>
      
      {/* Subtle cloud gradient */}
      <radialGradient id="cloud-gradient">
        <stop offset="0%" stopColor="rgba(30, 41, 59, 0.8)" />
        <stop offset="100%" stopColor="rgba(30, 41, 59, 0.3)" />
      </radialGradient>
      
      {/* Interactive scroll-based filter */}
      <filter id="scroll-atmosphere">
        <feTurbulence
          type="turbulence"
          baseFrequency="0.002 0.003"
          numOctaves="2"
          seed="15"
          result="turbulence"
        >
          <animate
            attributeName="baseFrequency"
            dur="20s"
            values="0.002 0.003;0.003 0.004;0.004 0.003;0.003 0.002"
            repeatCount="indefinite"
          />
        </feTurbulence>
        <feDisplacementMap
          in="SourceGraphic"
          in2="turbulence"
          scale="3"
          xChannelSelector="R"
          yChannelSelector="G"
        />
      </filter>
    </defs>
    
    {/* Dark sky background */}
    <rect
      width="100%"
      height="100%"
      fill="url(#sky-gradient)"
    />
    
    {/* Few interactive clouds */}
    <g filter="url(#scroll-atmosphere)">
      {/* Large background cloud */}
      <ellipse
        cx="20%"
        cy="25%"
        rx="35%"
        ry="15%"
        fill="url(#cloud-gradient)"
        filter="blur(2px)"
        opacity="0.3"
      >
        <animate
          attributeName="cx"
          dur="120s"
          values="20%;28%;35%;28%;20%"
          repeatCount="indefinite"
        />
        <animate
          attributeName="opacity"
          dur="80s"
          values="0.3;0.4;0.3;0.25;0.3"
          repeatCount="indefinite"
        />
      </ellipse>
      
      {/* Medium cloud */}
      <ellipse
        cx="75%"
        cy="40%"
        rx="25%"
        ry="12%"
        fill="url(#cloud-gradient)"
        filter="blur(1.5px)"
        opacity="0.4"
      >
        <animate
          attributeName="cx"
          dur="150s"
          values="75%;65%;55%;65%;75%"
          repeatCount="indefinite"
        />
        <animate
          attributeName="cy"
          dur="100s"
          values="40%;35%;30%;35%;40%"
          repeatCount="indefinite"
        />
      </ellipse>
      
      {/* Small foreground cloud */}
      <ellipse
        cx="50%"
        cy="70%"
        rx="20%"
        ry="8%"
        fill="url(#cloud-gradient)"
        filter="blur(1px)"
        opacity="0.5"
      >
        <animate
          attributeName="cx"
          dur="90s"
          values="50%;45%;40%;45%;50%"
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
