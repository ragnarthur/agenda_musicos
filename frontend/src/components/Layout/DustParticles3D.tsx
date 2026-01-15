import React, { useEffect, useRef } from 'react';
import useLowPowerMode from '../../hooks/useLowPowerMode';

type Cluster = {
  baseX: number;
  baseY: number;
  driftX: number;
  driftY: number;
  phase: number;
};

type Particle = {
  clusterIndex: number;
  radius: number;
  angle: number;
  spin: number;
  z: number;
  size: number;
};

const CLUSTER_COUNT = 3;
const PARTICLES_PER_CLUSTER = 7;

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
    const area = { x: 0, y: 0, w: 0, h: 0 };
    const clusters: Cluster[] = [];
    const particles: Particle[] = [];

    const resetArea = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      dpr = window.devicePixelRatio || 1;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      area.x = width * 0.4;
      area.y = height * 0.22;
      area.w = width * 0.6;
      area.h = height * 0.5;
    };

    const makeCluster = () => ({
      baseX: area.x + area.w * (0.7 + Math.random() * 0.15),
      baseY: area.y + area.h * (0.35 + Math.random() * 0.2),
      driftX: area.w * (0.02 + Math.random() * 0.02),
      driftY: area.h * (0.02 + Math.random() * 0.03),
      phase: Math.random() * Math.PI * 2,
    });

    const init = () => {
      resetArea();
      clusters.length = 0;
      particles.length = 0;

      for (let i = 0; i < CLUSTER_COUNT; i += 1) {
        clusters.push(makeCluster());
      }

      for (let i = 0; i < CLUSTER_COUNT; i += 1) {
        for (let j = 0; j < PARTICLES_PER_CLUSTER; j += 1) {
          particles.push({
            clusterIndex: i,
            radius: 10 + Math.random() * 16,
            angle: Math.random() * Math.PI * 2,
            spin: (Math.random() * 0.25 + 0.15) * (Math.random() < 0.5 ? -1 : 1),
            z: 0.25 + Math.random() * 0.75,
            size: 1 + Math.random() * 0.7,
          });
        }
      }
    };

    init();

    let lastTime = performance.now();
    const render = (time: number) => {
      const delta = Math.min(0.04, (time - lastTime) / 1000);
      lastTime = time;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
      ctx.globalCompositeOperation = 'lighter';

      ctx.save();
      ctx.beginPath();
      ctx.rect(area.x, area.y, area.w, area.h);
      ctx.clip();

      clusters.forEach((cluster) => {
        const wave = Math.sin(time * 0.00025 + cluster.phase);
        const sway = Math.cos(time * 0.0002 + cluster.phase * 1.3);
        cluster.baseX = cluster.baseX + wave * cluster.driftX * delta * 6;
        cluster.baseY = cluster.baseY + sway * cluster.driftY * delta * 6;

        cluster.baseX = Math.min(Math.max(cluster.baseX, area.x + area.w * 0.6), area.x + area.w * 0.9);
        cluster.baseY = Math.min(Math.max(cluster.baseY, area.y + area.h * 0.3), area.y + area.h * 0.7);
      });

      particles.forEach((particle) => {
        const cluster = clusters[particle.clusterIndex];
        particle.angle += particle.spin * delta * (0.6 + particle.z * 0.5);

        const radius = particle.radius * (0.7 + particle.z * 0.6);
        const offsetX = Math.cos(particle.angle + time * 0.00012) * radius;
        const offsetY = Math.sin(particle.angle + time * 0.00016) * radius * 0.8;
        const x = cluster.baseX + offsetX;
        const y = cluster.baseY + offsetY;

        const depth = particle.z;
        const scale = 0.6 + depth * 0.6;
        const size = particle.size * scale;
        const alpha = 0.2 + depth * 0.35;

        ctx.shadowBlur = 8 + depth * 14;
        ctx.shadowColor = `rgba(255, 255, 255, ${alpha})`;
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.restore();
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
