import React from 'react';
import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';

export type StatCardColor = 'indigo' | 'amber' | 'green' | 'blue' | 'red' | 'purple';

interface AdminStatCardProps {
  label: string;
  value: number | string;
  icon: LucideIcon;
  color?: StatCardColor;
  className?: string;
}

const getColorClasses = (color: StatCardColor): { bg: string; icon: string; text: string } => {
  switch (color) {
    case 'indigo':
      return { bg: 'bg-indigo-500/20', icon: 'text-indigo-400', text: 'text-indigo-400' };
    case 'amber':
      return { bg: 'bg-amber-500/20', icon: 'text-amber-400', text: 'text-amber-400' };
    case 'green':
      return { bg: 'bg-emerald-500/20', icon: 'text-emerald-400', text: 'text-emerald-400' };
    case 'blue':
      return { bg: 'bg-blue-500/20', icon: 'text-blue-400', text: 'text-blue-400' };
    case 'red':
      return { bg: 'bg-red-500/20', icon: 'text-red-400', text: 'text-red-400' };
    case 'purple':
      return { bg: 'bg-purple-500/20', icon: 'text-purple-400', text: 'text-purple-400' };
    default:
      return { bg: 'bg-indigo-500/20', icon: 'text-indigo-400', text: 'text-indigo-400' };
  }
};

export const AdminStatCard: React.FC<AdminStatCardProps> = ({
  label,
  value,
  icon: Icon,
  color = 'indigo',
  className = '',
}) => {
  const colors = getColorClasses(color);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={{
        y: -2,
        transition: { duration: 0.2 },
      }}
      whileTap={{ scale: 0.98 }}
      className={`admin-card p-4 sm:p-5 ${className}`}
    >
      <div className="flex items-center gap-3">
        <motion.div
          initial={{ scale: 0, rotate: -45 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 200, delay: 0.15 }}
          className={`p-2.5 rounded-xl ${colors.bg}`}
        >
          <Icon className={`h-5 w-5 ${colors.icon}`} />
        </motion.div>
        <div className="flex-1">
          <motion.p
            className={`text-xs font-medium ${colors.text} mb-1`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            {label}
          </motion.p>
          <motion.p
            className="text-3xl font-bold text-white"
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}
          >
            {value}
          </motion.p>
        </div>
      </div>
    </motion.div>
  );
};
