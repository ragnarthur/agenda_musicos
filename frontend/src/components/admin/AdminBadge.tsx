import React from 'react';

export type BadgeStatus = 'pending' | 'approved' | 'rejected' | 'active' | 'inactive' | 'planned';
export type BadgeSize = 'sm' | 'md';

interface AdminBadgeProps {
  status: BadgeStatus;
  size?: BadgeSize;
  className?: string;
}

const getStatusClasses = (status: BadgeStatus): string => {
  switch (status) {
    case 'pending':
      return 'admin-badge-pending';
    case 'approved':
      return 'admin-badge-approved';
    case 'active':
      return 'admin-badge-active';
    case 'rejected':
      return 'admin-badge-rejected';
    case 'inactive':
      return 'admin-badge-inactive';
    case 'planned':
      return 'admin-badge-planned';
    default:
      return 'admin-badge-pending';
  }
};

const getStatusLabel = (status: BadgeStatus): string => {
  switch (status) {
    case 'pending':
      return 'Pendente';
    case 'approved':
      return 'Aprovado';
    case 'active':
      return 'Ativo';
    case 'rejected':
      return 'Rejeitado';
    case 'inactive':
      return 'Inativo';
    case 'planned':
      return 'Planejado';
    default:
      return status;
  }
};

export const AdminBadge: React.FC<AdminBadgeProps> = ({ status, size = 'md', className = '' }) => {
  const sizeClass = size === 'sm' ? 'admin-badge-sm' : 'admin-badge-md';
  const statusClass = getStatusClasses(status);
  const label = getStatusLabel(status);

  return <span className={`admin-badge ${sizeClass} ${statusClass} ${className}`}>{label}</span>;
};
