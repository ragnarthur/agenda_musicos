import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { AlertCircle } from 'lucide-react';
import { AdminButton } from './AdminButton';

interface AdminEmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export const AdminEmptyState: React.FC<AdminEmptyStateProps> = ({
  icon: Icon = AlertCircle,
  title,
  description,
  action,
}) => {
  return (
    <div className="admin-card p-10 text-center">
      <Icon className="h-12 w-12 text-slate-500 mx-auto mb-4" />
      <h3 className="text-lg font-medium text-white mb-2">{title}</h3>
      {description && <p className="text-slate-400 mb-4">{description}</p>}
      {action && (
        <AdminButton variant="primary" onClick={action.onClick}>
          {action.label}
        </AdminButton>
      )}
    </div>
  );
};
