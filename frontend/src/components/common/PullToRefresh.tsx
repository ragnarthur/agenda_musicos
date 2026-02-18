// components/common/PullToRefresh.tsx
// Componente wrapper para pull-to-refresh
import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Loader2, ArrowDown } from 'lucide-react';
import { usePullToRefresh } from '../../hooks/usePullToRefresh';

interface PullToRefreshProps {
  children: ReactNode;
  onRefresh: () => Promise<void>;
  disabled?: boolean;
  className?: string;
}

export default function PullToRefresh({
  children,
  onRefresh,
  disabled = false,
  className = '',
}: PullToRefreshProps) {
  const { isRefreshing, pullProgress, isPulling, onTouchStart, onTouchMove, onTouchEnd } =
    usePullToRefresh({ onRefresh, disabled });

  const indicatorY = isPulling || isRefreshing ? Math.min(pullProgress * 80, 80) : 0;
  const rotation = pullProgress * 180;
  const opacity = Math.min(pullProgress * 1.5, 1);

  return (
    <div
      className={`relative ${className}`}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Indicador de Pull */}
      <motion.div
        className="absolute left-1/2 -translate-x-1/2 z-50 pointer-events-none"
        style={{ top: -40 }}
        animate={{
          y: indicatorY,
          opacity: isPulling || isRefreshing ? opacity : 0,
        }}
        transition={{ type: 'spring', damping: 20, stiffness: 300 }}
      >
        <div className="w-10 h-10 bg-white dark:bg-gray-800 rounded-full shadow-lg flex items-center justify-center border border-gray-200 dark:border-gray-700">
          {isRefreshing ? (
            <Loader2 className="w-5 h-5 text-indigo-600 animate-spin" />
          ) : (
            <motion.div animate={{ rotate: rotation }} transition={{ type: 'spring', damping: 20 }}>
              <ArrowDown
                className={`w-5 h-5 transition-colors ${
                  pullProgress >= 1 ? 'text-indigo-600' : 'text-gray-400 dark:text-gray-500'
                }`}
              />
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* Conteúdo */}
      <motion.div
        animate={{
          y: isPulling ? Math.min(pullProgress * 40, 40) : 0,
        }}
        transition={{ type: 'spring', damping: 20, stiffness: 300 }}
      >
        {children}
      </motion.div>
    </div>
  );
}
