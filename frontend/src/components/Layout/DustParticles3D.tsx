import React, { useEffect, useRef, memo } from 'react';
import useLowPowerMode from '../../hooks/useLowPowerMode';

type Particle = {
  x: number;
  y: number;
  z: number;
  size: number;
  speed: number;
  sway: number;
  phase: number;
};

const DustParticles3D: React.FC = memo(() => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isLowPower = useLowPowerMode();

  useEffect(() => {
    if (isLowPower) return undefined;

    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;

    let rafId = 0;
    let frameCount = 0; // Frame throttling - renderizar a cada 2 frames
    let width = 0;
    let height = 0;
    let dpr = window.devicePixelRatio || 1;
    let isSmallScreen = window.matchMedia('(max-width: 768px)').matches;
    const particles: Particle[] = [];

    const resetArea = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      const rawDpr = window.devicePixelRatio || 1;
      isSmallScreen = window.matchMedia('(max-width: 768px)').matches;
      // Mobile: mantém performance
      dpr = isSmallScreen ? 1 : rawDpr;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
    };

    const init = () => {
      resetArea();
      particles.length = 0;
      
      // Mobile: partículas menores e mais rápidas
      if (isSmallScreen) {
        const featherCount = 8;
        for (let i = 0; i < featherCount; i += 1) {
          particles.push({
            x: Math.random() * width,
            y: Math.random() * height,
            z: 0.3,
            size: 0.6,
            speed: 8,
            sway: 14,
            phase: Math.random() * Math.PI * 2,
          });
        }
        return;
      }
      
      // Desktop: sistema completo de partículas (otimizado para 25 partículas)
      const density = {
        min: 20,
        max: 25,
        factor: 0.00002,
      };
      const count = Math.min(
        density.max,
        Math.max(density.min, Math.round(width * height * density.factor))
      );

      for (let i = 0; i < count; i += 1) {
        const depth = Math.random();
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          z: depth,
          size: 0.5 + depth * 0.7,
          speed: 12 + depth * 24,
          sway: 18 + depth * 28,
          phase: Math.random() * Math.PI * 2,
        });
      }
    };

    init();

    let lastTime = performance.now();
    const render = (time: number) => {
      // Frame throttling: renderizar a cada 2 frames para melhor performance
      frameCount += 1;
      if (frameCount % 2 !== 0) {
        rafId = requestAnimationFrame(render);
        return;
      }

      const delta = isSmallScreen ? 0.025 : Math.min(0.04, (time - lastTime) / 1000);
      lastTime = time;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
      ctx.globalCompositeOperation = isSmallScreen ? 'source-over' : 'lighter';

      particles.forEach((particle) => {
        if (isSmallScreen) {
          // Mobile: partículas menores com movimento mais rápido
          const driftX = Math.sin(time * 0.0008 + particle.phase) * particle.sway;
          const driftY = Math.cos(time * 0.0007 + particle.phase * 1.3) * particle.sway;
          const flowX = Math.sin(time * 0.0005 + particle.phase * 1.1) * particle.speed;
          const flowY = Math.cos(time * 0.00045 + particle.phase * 0.9) * particle.speed;

          particle.x += (flowX + driftX) * delta;
          particle.y += (flowY + driftY) * delta;

          // Wrap
          const margin = 20;
          if (particle.x < -margin) particle.x = width + margin;
          if (particle.x > width + margin) particle.x = -margin;
          if (particle.y < -margin) particle.y = height + margin;
          if (particle.y > height + margin) particle.y = -margin;

          // Ponto menor e brilhante
          ctx.shadowBlur = 4;
          ctx.shadowColor = 'rgba(200, 220, 255, 0.35)';
          ctx.fillStyle = 'rgba(220, 235, 255, 0.45)';
          ctx.beginPath();
          ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Desktop: movimento complexo completo (velocidade aumentada)
          const driftX = Math.sin(time * 0.0012 + particle.phase) * particle.sway;
          const driftY = Math.cos(time * 0.001 + particle.phase * 1.3) * particle.sway;
          const flowX = Math.sin(time * 0.00045 + particle.phase * 1.1) * particle.speed;
          const flowY = Math.cos(time * 0.00038 + particle.phase * 0.9) * particle.speed;

          particle.x += (flowX + driftX) * delta;
          particle.y += (flowY + driftY) * delta;

          if (particle.x < -40) {
            particle.x = width + 40;
          } else if (particle.x > width + 40) {
            particle.x = -40;
          }

          if (particle.y < -40) {
            particle.y = height + 40;
          } else if (particle.y > height + 40) {
            particle.y = -40;
          }

          const depth = particle.z;
          const scale = 0.65 + depth * 0.7;
          const size = particle.size * scale;
          const alpha = 0.25 + depth * 0.35;

          ctx.shadowBlur = 12 + depth * 20;
          ctx.shadowColor = `rgba(255, 255, 255, ${alpha * 1.1})`;
          ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
          ctx.beginPath();
          ctx.arc(particle.x, particle.y, size, 0, Math.PI * 2);
          ctx.fill();
        }
      });
      rafId = requestAnimationFrame(render);
    };

    rafId = requestAnimationFrame(render);

    const handleResize = () => init();
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', handleResize);
    };
  }, [isLowPower]);

  return (
    <canvas
      ref={canvasRef}
      className="dust-canvas"
      aria-hidden="true"
      style={{ willChange: 'transform' }}
    />
  );
});
DustParticles3D.displayName = 'DustParticles3D';

export default DustParticles3D;
