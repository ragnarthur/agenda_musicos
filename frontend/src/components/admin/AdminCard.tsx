import React from 'react';
import { motion } from 'framer-motion';

interface AdminCardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  glassmorphism?: boolean;
  onClick?: () => void;
}

export const AdminCard: React.FC<AdminCardProps> = ({
  children,
  className = '',
  hover = true,
  glassmorphism = true,
  onClick,
}) => {
  const baseClasses = glassmorphism
    ? 'bg-white/95 backdrop-blur-sm rounded-xl border border-gray-100 shadow-lg'
    : 'bg-white rounded-xl border border-gray-100 shadow-lg';

  const hoverClasses = hover ? 'cursor-pointer admin-card-hover' : '';

  return (
    <motion.div
      className={`${baseClasses} ${hoverClasses} ${className}`}
      onClick={onClick}
      whileHover={hover ? { scale: 1.02, y: -2 } : undefined}
      transition={{ duration: 0.2 }}
    >
      {children}
    </motion.div>
  );
};
