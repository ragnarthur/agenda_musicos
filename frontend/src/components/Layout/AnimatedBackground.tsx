import React from 'react';
import useLowPowerMode from '../../hooks/useLowPowerMode';
import DustParticles3D from './DustParticles3D';

interface AnimatedBackgroundProps {
  className?: string;
  enableBlueWaves?: boolean;
  enableParticles?: boolean;
}

const AnimatedBackground: React.FC<AnimatedBackgroundProps> = ({
  className = '',
  enableBlueWaves = false,
  enableParticles = true,
}) => {
  const isLowPower = useLowPowerMode();
  const enableEffects = !isLowPower;

  return (
    <div className={`animated-bg pointer-events-none absolute inset-0 z-0 overflow-hidden ${className}`}>
      {enableBlueWaves && <div className="blue-wave-static" aria-hidden="true" />}
      {!enableBlueWaves && <div className="fabric-static" aria-hidden="true" />}
      {enableEffects && enableParticles && <DustParticles3D />}
    </div>
  );
};

export default AnimatedBackground;
