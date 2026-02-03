import React from 'react';
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

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  accent,
  className,
  icon: Icon,
  iconColor = 'text-primary-500',
}) => {
  return (
    <motion.div
      className={`
        rounded-xl p-4 border shadow-sm
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
      <motion.p
        className={`text-2xl sm:text-3xl font-bold break-words min-w-0 ${accent ? 'text-amber-600' : 'text-primary-600'}`}
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}
      >
        {value}
      </motion.p>
    </motion.div>
  );
};
