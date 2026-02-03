import React from 'react';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
}

const Skeleton: React.FC<SkeletonProps> = ({ className = '', variant = 'rectangular' }) => {
  const baseClasses = 'animate-pulse bg-gray-200 dark:bg-gray-700';
  const variantClasses = {
    text: 'h-4 w-full rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-md',
  };

  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]} ${className}`.trim()}
      role="status"
      aria-label="Carregando..."
    />
  );
};

interface SkeletonTextProps {
  lines?: number;
  className?: string;
}

export const SkeletonText: React.FC<SkeletonTextProps> = ({ lines = 1, className = '' }) => {
  return (
    <div className={`space-y-2 ${className}`.trim()}>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton key={index} variant="text" className={index === lines - 1 ? 'w-3/4' : ''} />
      ))}
    </div>
  );
};

interface SkeletonCardProps {
  count?: number;
  className?: string;
}

export const SkeletonCard: React.FC<SkeletonCardProps> = ({ count = 1, className = '' }) => {
  return (
    <div className={`grid grid-cols-1 gap-4 ${className}`.trim()}>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <Skeleton className="h-6 w-3/4 mb-3" />
          <SkeletonText lines={2} />
        </div>
      ))}
    </div>
  );
};

interface SkeletonListProps {
  items?: number;
  showAvatar?: boolean;
  className?: string;
}

export const SkeletonList: React.FC<SkeletonListProps> = ({ items = 5, showAvatar = false, className = '' }) => {
  return (
    <div className={`space-y-4 ${className}`.trim()}>
      {Array.from({ length: items }).map((_, index) => (
        <div key={index} className="flex items-center gap-3">
          {showAvatar && <Skeleton variant="circular" className="w-10 h-10 flex-shrink-0" />}
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
};

export default Skeleton;
