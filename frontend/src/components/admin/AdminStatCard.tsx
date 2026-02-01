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
      return { bg: 'bg-indigo-100', icon: 'text-indigo-600', text: 'text-indigo-600' };
    case 'amber':
      return { bg: 'bg-amber-100', icon: 'text-amber-600', text: 'text-amber-600' };
    case 'green':
      return { bg: 'bg-green-100', icon: 'text-green-600', text: 'text-green-600' };
    case 'blue':
      return { bg: 'bg-blue-100', icon: 'text-blue-600', text: 'text-blue-600' };
    case 'red':
      return { bg: 'bg-red-100', icon: 'text-red-600', text: 'text-red-600' };
    case 'purple':
      return { bg: 'bg-purple-100', icon: 'text-purple-600', text: 'text-purple-600' };
    default:
      return { bg: 'bg-indigo-100', icon: 'text-indigo-600', text: 'text-indigo-600' };
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
        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
        transition: { duration: 0.2 },
      }}
      whileTap={{ scale: 0.98 }}
      className={`admin-card ${className}`}
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
            className="text-3xl font-bold text-gray-900"
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
