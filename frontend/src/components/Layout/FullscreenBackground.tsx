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
    <div className={`relative min-h-[100svh] overflow-hidden ${className}`}>
      {/* Eu mantenho as partículas só nas telas-chave para ficar bonito e leve */}
      <AnimatedBackground enableBlueWaves={enableBlueWaves} enableParticles={enableParticles} />
      {/* Scrim para garantir contraste no modo claro e manter legibilidade (especialmente com texto branco). */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(circle_at_20%_18%,rgba(129,140,248,0.25),transparent_44%),radial-gradient(circle_at_82%_16%,rgba(34,211,238,0.18),transparent_42%),linear-gradient(180deg,rgba(2,6,23,0.78),rgba(2,6,23,0.58),rgba(2,6,23,0.8))]"
      />
      <div className={`relative z-10 min-h-[100svh] ${contentClassName}`}>{children}</div>
    </div>
  );
};

export default FullscreenBackground;
