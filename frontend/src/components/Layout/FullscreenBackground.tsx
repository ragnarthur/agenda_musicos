import React from 'react';
import AnimatedBackground from './AnimatedBackground';

interface FullscreenBackgroundProps {
  className?: string;
  contentClassName?: string;
  enableBlueWaves?: boolean;
  enableParticles?: boolean;
  children: React.ReactNode;
}

const FullscreenBackground: React.FC<FullscreenBackgroundProps> = ({
  className = '',
  contentClassName = '',
  enableBlueWaves = true,
  enableParticles = true,
  children,
}) => {
  return (
    <div className={`relative min-h-screen overflow-hidden ${className}`}>
      {/* Eu mantenho as partículas só nas telas-chave para ficar bonito e leve */}
      <AnimatedBackground enableBlueWaves={enableBlueWaves} enableParticles={enableParticles} />
      <div className={`relative z-10 min-h-screen ${contentClassName}`}>
        {children}
      </div>
    </div>
  );
};

export default FullscreenBackground;
