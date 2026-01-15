import React from 'react';
import AnimatedBackground from './AnimatedBackground';

interface FullscreenBackgroundProps {
  className?: string;
  contentClassName?: string;
  children: React.ReactNode;
}

const FullscreenBackground: React.FC<FullscreenBackgroundProps> = ({
  className = '',
  contentClassName = '',
  children,
}) => {
  return (
    <div className={`relative min-h-screen overflow-hidden ${className}`}>
      <AnimatedBackground />
      <div className={`relative z-10 min-h-screen ${contentClassName}`}>
        {children}
      </div>
    </div>
  );
};

export default FullscreenBackground;
