import React from 'react';
import useLowPowerMode from '../../hooks/useLowPowerMode';
import DustParticles3D from './DustParticles3D';

interface AnimatedBackgroundProps {
  className?: string;
  enableBlueWaves?: boolean;
}

const AnimatedBackground: React.FC<AnimatedBackgroundProps> = ({
  className = '',
  enableBlueWaves = false,
}) => {
  const isLowPower = useLowPowerMode();
  const enableEffects = !isLowPower;

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
              <stop offset="0%" stopColor="#020612" />
              <stop offset="45%" stopColor="#04162f" />
              <stop offset="100%" stopColor="#010307" />
            </linearGradient>
            <linearGradient id="blueWaveSheen" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#1f56a8" stopOpacity="0.5" />
              <stop offset="50%" stopColor="#2a6bc7" stopOpacity="0.64" />
              <stop offset="100%" stopColor="#0a2146" stopOpacity="0.5" />
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
                baseFrequency="0.002 0.01"
                numOctaves="1"
                seed="3"
                result="noise"
              >
                <animate
                  attributeName="baseFrequency"
                  dur="30s"
                  values="0.002 0.009;0.003 0.012;0.002 0.009"
                  repeatCount="indefinite"
                />
              </feTurbulence>
              <feDisplacementMap in="SourceGraphic" in2="noise" scale="48" xChannelSelector="R" yChannelSelector="G">
                <animate attributeName="scale" dur="26s" values="36;58;36" repeatCount="indefinite" />
              </feDisplacementMap>
            </filter>
            <filter id="blueWaveLight" x="-20%" y="-20%" width="140%" height="140%">
              <feTurbulence
                type="fractalNoise"
                baseFrequency="0.0025 0.012"
                numOctaves="1"
                seed="7"
                result="heightMap"
              >
                <animate
                  attributeName="baseFrequency"
                  dur="32s"
                  values="0.0025 0.011;0.004 0.014;0.0025 0.011"
                  repeatCount="indefinite"
                />
              </feTurbulence>
              <feDiffuseLighting in="heightMap" lightingColor="#a6c8ff" surfaceScale="44" result="light">
                <feDistantLight azimuth="225" elevation="56" />
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
            opacity="0.78"
          />
        </svg>
      )}
      {!enableEffects && enableBlueWaves && <div className="blue-wave-static" aria-hidden="true" />}
      {!enableEffects && !enableBlueWaves && <div className="fabric-static" aria-hidden="true" />}
      {enableEffects ? (
        <>
          <DustParticles3D />
        </>
      ) : (
        <div className="fabric-static" aria-hidden="true" />
      )}
    </div>
  );
};

export default AnimatedBackground;
