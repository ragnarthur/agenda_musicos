// components/common/TiltCard.tsx
import React, { useRef, useState, useCallback, memo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

type Props = {
  children: React.ReactNode;
  className?: string;
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const TiltCard: React.FC<Props> = memo(({ children, className }) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const lastMoveTime = useRef<number>(0);
  const prefersReducedMotion = useReducedMotion();
  const [style, setStyle] = useState<Record<string, string | number>>({
    transform: 'perspective(800px) rotateX(0deg) rotateY(0deg) translateZ(0)',
    boxShadow: '0 10px 30px rgba(0,0,0,0.12)',
  });

  // Debounce de 16ms no mousemove para melhor performance
  const handleMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (prefersReducedMotion || !ref.current) return;

    const now = Date.now();
    if (now - lastMoveTime.current < 16) return;
    lastMoveTime.current = now;

    const rect = ref.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 2; // -1 a 1
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
    const rotateX = clamp(-y * 6, -8, 8);
    const rotateY = clamp(x * 6, -8, 8);
    setStyle({
      transform: `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(6px)`,
      boxShadow: `0 15px 35px rgba(0,0,0,0.14), 0 6px 18px rgba(0,0,0,0.08)`,
    });
  }, [prefersReducedMotion]);

  const handleLeave = useCallback(() => {
    if (prefersReducedMotion) return;
    setStyle({
      transform: 'perspective(800px) rotateX(0deg) rotateY(0deg) translateZ(0)',
      boxShadow: '0 10px 30px rgba(0,0,0,0.12)',
    });
  }, [prefersReducedMotion]);

  return (
    <motion.div
      ref={ref}
      className={className}
      style={prefersReducedMotion ? undefined : style}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 120, damping: 18 }}
    >
      {children}
    </motion.div>
  );
});
TiltCard.displayName = 'TiltCard';

export default memo(TiltCard);
