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
  threshold: propThreshold = 100,
  swipeDirection = 'y',
  disabled = false,
}) => {
  const getThreshold = () => {
    if (typeof window !== 'undefined') {
      return Math.min(propThreshold, window.innerHeight * 0.15);
    }
    return propThreshold;
  };
  const threshold = getThreshold();

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
      if (swipeY > threshold || swipePower > 1) {
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
      return { top: 0, bottom: 50 };
    }
    if (swipeDirection === 'x') {
      return { left: -50, right: 50 };
    }
    return { top: 0, bottom: 50, left: -50, right: 50 };
  };

  return (
    <motion.div
      drag={swipeDirection === 'xy' ? true : swipeDirection}
      dragConstraints={getDragConstraints()}
      dragElastic={0.1}
      dragMomentum={false}
      dragPropagation={false}
      onDragEnd={handleDragEnd}
      initial={{ opacity: 0, y: swipeDirection === 'y' ? 0 : undefined }}
      animate={{ opacity: isOpen ? 1 : 0, y: isOpen ? 0 : swipeDirection === 'y' ? 50 : undefined }}
      exit={{ opacity: 0, y: swipeDirection === 'y' ? 50 : undefined }}
      transition={{ duration: 0.25, type: 'spring' }}
      className="relative"
    >
      {children}
    </motion.div>
  );
};

export default SwipeToDismissWrapper;
