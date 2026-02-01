import React from 'react';

export const AdminLoading: React.FC<{ count?: number }> = ({ count = 1 }) => {
  return (
    <>
      {/* Skeleton Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="admin-card animate-pulse">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 bg-gray-200 rounded-xl" />
              <div className="flex-1">
                <div className="h-3 bg-gray-200 rounded w-16 mb-2" />
                <div className="h-8 bg-gray-200 rounded w-12" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Skeleton Cards */}
      <div className="space-y-4">
        {[...Array(count)].map((_, i) => (
          <div key={i} className="admin-card animate-pulse">
            <div className="flex items-start justify-between mb-4">
              <div className="h-6 bg-gray-200 rounded w-1/3" />
              <div className="h-6 bg-gray-200 rounded w-24" />
            </div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded w-full" />
              <div className="h-4 bg-gray-200 rounded w-full" />
              <div className="h-4 bg-gray-200 rounded w-2/3" />
            </div>
            <div className="h-10 bg-gray-200 rounded-lg mt-4" />
          </div>
        ))}
      </div>
    </>
  );
};
