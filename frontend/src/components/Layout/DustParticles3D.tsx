import React, { useEffect, useRef } from 'react';
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

const DustParticles3D: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isLowPower = useLowPowerMode();

  useEffect(() => {
    if (isLowPower) return undefined;

    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;

    let rafId = 0;
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
      // No mobile: usa apenas pluma leve (sem partículas complexas)
      dpr = isSmallScreen ? 1 : rawDpr;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
    };

    const init = () => {
      resetArea();
      particles.length = 0;
      
      // No mobile: efeito de pluma simplificado (muito menos partículas)
      if (isSmallScreen) {
        const simpleCount = 8;
        for (let i = 0; i < simpleCount; i += 1) {
          particles.push({
            x: Math.random() * width,
            y: Math.random() * height,
            z: 0.3,
            size: 0.8,
            speed: 2,
            sway: 6,
            phase: Math.random() * Math.PI * 2,
          });
        }
        return;
      }

      // Desktop: sistema completo de partículas
      const density = {
        min: 30,
        max: 70,
        factor: 0.00003,
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
          size: 0.3 + depth * 0.5,
          speed: 5 + depth * 12,
          sway: 10 + depth * 16,
          phase: Math.random() * Math.PI * 2,
        });
      }
    };

    init();

    let lastTime = performance.now();
    const render = (time: number) => {
      // No mobile: delta muito menor para movimento de pluma ultra leve
      const delta = isSmallScreen ? 0.008 : Math.min(0.04, (time - lastTime) / 1000);
      lastTime = time;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
      ctx.globalCompositeOperation = isSmallScreen ? 'source-over' : 'lighter';

      particles.forEach((particle) => {
        if (isSmallScreen) {
          // Mobile: efeito de pluma simplificado
          const driftX = Math.sin(time * 0.0001 + particle.phase) * particle.sway;
          const driftY = Math.cos(time * 0.00008 + particle.phase) * particle.sway;
          
          particle.x += driftX * delta;
          particle.y += driftY * delta;

          // Wrap simples
          if (particle.x < -20) particle.x = width + 20;
          if (particle.x > width + 20) particle.x = -20;
          if (particle.y < -20) particle.y = height + 20;
          if (particle.y > height + 20) particle.y = -20;

          // Pluma simples sem shadow
          ctx.shadowBlur = 0;
          ctx.fillStyle = 'rgba(147, 197, 253, 0.2)';
          ctx.beginPath();
          ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Desktop: movimento complexo completo
          const driftX = Math.sin(time * 0.0006 + particle.phase) * particle.sway;
          const driftY = Math.cos(time * 0.0005 + particle.phase * 1.3) * particle.sway;
          const flowX = Math.sin(time * 0.00022 + particle.phase * 1.1) * particle.speed;
          const flowY = Math.cos(time * 0.00018 + particle.phase * 0.9) * particle.speed;

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
          const scale = 0.4 + depth * 0.5;
          const size = particle.size * scale;
          const alpha = 0.10 + depth * 0.20;

          ctx.shadowBlur = 4 + depth * 8;
          ctx.shadowColor = `rgba(255, 255, 255, ${alpha})`;
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

  if (isLowPower) return null;

  return <canvas ref={canvasRef} className="dust-canvas" aria-hidden="true" />;
};

export default DustParticles3D;
