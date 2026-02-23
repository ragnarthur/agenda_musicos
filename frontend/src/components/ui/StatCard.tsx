import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: number | string;
  accent?: boolean;
  className?: string;
  icon?: LucideIcon;
  iconColor?: string;
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function useCountUp(target: number, duration = 800): number {
  const [current, setCurrent] = useState(0);
  const startRef = useRef<number | null>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    startRef.current = null;

    const animate = (timestamp: number) => {
      if (startRef.current === null) startRef.current = timestamp;
      const elapsed = timestamp - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      setCurrent(Math.round(easeOutCubic(progress) * target));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);

  return current;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  accent,
  className,
  icon: Icon,
  iconColor = 'text-primary-500',
}) => {
  const isNumeric = typeof value === 'number';
  const displayValue = useCountUp(isNumeric ? value : 0);

  return (
    <motion.div
      className={`
        rounded-xl p-3 xs:p-4 border shadow-sm
        ${accent ? 'bg-amber-50 border-amber-100' : 'bg-white/95 border-gray-100'}
        ${className || ''}
      `}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={{
        y: -2,
        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
        transition: { duration: 0.2 },
      }}
      whileTap={{ scale: 0.98 }}
    >
      <div className="flex items-center justify-between mb-1">
        <p className={`text-sm font-medium ${accent ? 'text-amber-700' : 'text-gray-600'}`}>
          {label}
        </p>
        {Icon && (
          <motion.div
            initial={{ scale: 0, rotate: -45 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 200, delay: 0.15 }}
          >
            <Icon className={`h-5 w-5 ${iconColor}`} />
          </motion.div>
        )}
      </div>
      <p
        className={`text-2xl sm:text-3xl font-bold break-words min-w-0 ${accent ? 'text-amber-600' : 'text-primary-600'}`}
      >
        {isNumeric ? displayValue : value}
      </p>
    </motion.div>
  );
};
