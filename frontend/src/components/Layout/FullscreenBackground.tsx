import React from 'react';
import AnimatedBackground from './AnimatedBackground';

interface FullscreenBackgroundProps {
  className?: string;
  contentClassName?: string;
  enableBlueWaves?: boolean;
  children: React.ReactNode;
}

const FullscreenBackground: React.FC<FullscreenBackgroundProps> = ({
  className = '',
  contentClassName = '',
  enableBlueWaves = false,
  children,
}) => {
  return (
    <div className={`relative min-h-screen overflow-hidden ${className}`}>
      <AnimatedBackground enableBlueWaves={enableBlueWaves} />
      <div className={`relative z-10 min-h-screen ${contentClassName}`}>
        {children}
      </div>
    </div>
  );
};

export default FullscreenBackground;
