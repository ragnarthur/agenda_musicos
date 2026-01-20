import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import type { PanInfo } from 'framer-motion';

interface SwipeToDismissWrapperProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  threshold?: number;
  swipeDirection?: 'y' | 'x' | 'xy';
  disabled?: boolean;
}

const SwipeToDismissWrapper: React.FC<SwipeToDismissWrapperProps> = ({
  isOpen,
  onClose,
  children,
  threshold = 100,
  swipeDirection = 'y',
  disabled = false,
}) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (disabled) {
    return <>{children}</>;
  }

  const handleDragEnd = (_event: unknown, { offset }: PanInfo) => {
    const swipePower = Math.abs(offset.y || offset.x || 0) / threshold;

    if (swipeDirection === 'y' || swipeDirection === 'xy') {
      const swipeY = offset.y as number;
      if (swipeY < -threshold || swipePower > 1) {
        onClose();
      }
    }

    if (swipeDirection === 'x' || swipeDirection === 'xy') {
      const swipeX = offset.x as number;
      if (Math.abs(swipeX) > threshold || swipePower > 1) {
        onClose();
      }
    }
  };

  const getDragConstraints = () => {
    if (swipeDirection === 'y') {
      return { top: 0, bottom: 200 };
    }
    if (swipeDirection === 'x') {
      return { left: -200, right: 200 };
    }
    return { top: 0, bottom: 200, left: -200, right: 200 };
  };

  return (
    <motion.div
      drag={swipeDirection === 'xy' ? true : swipeDirection}
      dragConstraints={getDragConstraints()}
      dragElastic={0.2}
      onDragEnd={handleDragEnd}
      initial={{ opacity: 0 }}
      animate={{ opacity: isOpen ? 1 : 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="relative"
    >
      {children}
    </motion.div>
  );
};

export default SwipeToDismissWrapper;
