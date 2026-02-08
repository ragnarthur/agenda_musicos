import React from 'react';
import { motion } from 'framer-motion';

interface StatCardProps {
  icon: React.ReactNode;
  value: string | number;
  label: string;
  color?: 'blue' | 'green' | 'purple' | 'orange';
}

const StatCard: React.FC<StatCardProps> = ({ icon, value, label, color = 'blue' }) => {
  const colorClasses = {
    blue: 'from-blue-500 to-blue-600 shadow-blue-500/50',
    green: 'from-green-500 to-green-600 shadow-green-500/50',
    purple: 'from-purple-500 to-purple-600 shadow-purple-500/50',
    orange: 'from-orange-500 to-orange-600 shadow-orange-500/50',
  };

  return (
    <motion.div
      whileHover={{ scale: 1.05, y: -5 }}
      transition={{ duration: 0.3 }}
      className="bg-white dark:bg-gray-800/50 backdrop-blur-md rounded-xl p-6 shadow-md hover:shadow-2xl transition-all border border-gray-100 dark:border-gray-700/50"
    >
      <div
        className={`w-12 h-12 rounded-lg bg-gradient-to-br ${colorClasses[color]} flex items-center justify-center mb-4 shadow-lg`}
      >
        {icon}
      </div>
      <div className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-1 break-words min-w-0">{value}</div>
      <div className="text-sm text-muted">{label}</div>
    </motion.div>
  );
};

export default StatCard;
