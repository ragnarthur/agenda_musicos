import React from 'react';
import { motion } from 'framer-motion';

interface AdminCardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
}

export const AdminCard: React.FC<AdminCardProps> = ({
  children,
  className = '',
  hover = false,
  onClick,
}) => {
  const hoverClasses = hover ? 'cursor-pointer admin-card-hover' : '';

  return (
    <motion.div
      className={`admin-card p-4 sm:p-5 ${hoverClasses} ${className}`}
      onClick={onClick}
      whileHover={hover ? { y: -2 } : undefined}
      transition={{ duration: 0.2 }}
    >
      {children}
    </motion.div>
  );
};
