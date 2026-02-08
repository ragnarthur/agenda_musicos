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
        className="pointer-events-none absolute inset-0 z-0 bg-gradient-to-b from-slate-950/70 via-slate-950/45 to-slate-950/70 dark:from-slate-950/55 dark:via-slate-950/30 dark:to-slate-950/55"
      />
      <div className={`relative z-10 min-h-[100svh] ${contentClassName}`}>{children}</div>
    </div>
  );
};

export default FullscreenBackground;
