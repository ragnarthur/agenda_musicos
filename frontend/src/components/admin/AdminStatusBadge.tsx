import React from 'react';
import { Clock, CheckCircle, XCircle, AlertCircle, Ban } from 'lucide-react';

type StatusType =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'cancelled'
  | 'responded'
  | 'reserved'
  | 'confirmed'
  | 'completed'
  | 'declined';

interface AdminStatusBadgeProps {
  status: string;
  label?: string;
}

const statusConfig: Record<
  StatusType,
  { icon: React.ElementType; classes: string; defaultLabel: string }
> = {
  pending: { icon: Clock, classes: 'bg-amber-500/20 text-amber-400', defaultLabel: 'Pendente' },
  approved: {
    icon: CheckCircle,
    classes: 'bg-emerald-500/20 text-emerald-400',
    defaultLabel: 'Aprovado',
  },
  rejected: { icon: XCircle, classes: 'bg-red-500/20 text-red-400', defaultLabel: 'Rejeitado' },
  cancelled: { icon: Ban, classes: 'bg-slate-600/40 text-slate-400', defaultLabel: 'Cancelado' },
  responded: {
    icon: CheckCircle,
    classes: 'bg-emerald-500/20 text-emerald-400',
    defaultLabel: 'Respondido',
  },
  reserved: { icon: Clock, classes: 'bg-blue-500/20 text-blue-400', defaultLabel: 'Reservado' },
  confirmed: {
    icon: CheckCircle,
    classes: 'bg-indigo-500/20 text-indigo-400',
    defaultLabel: 'Confirmado',
  },
  completed: {
    icon: CheckCircle,
    classes: 'bg-emerald-500/20 text-emerald-400',
    defaultLabel: 'Concluído',
  },
  declined: { icon: XCircle, classes: 'bg-red-500/20 text-red-400', defaultLabel: 'Recusado' },
};

export const AdminStatusBadge: React.FC<AdminStatusBadgeProps> = ({ status, label }) => {
  const config = statusConfig[status as StatusType] || {
    icon: AlertCircle,
    classes: 'bg-slate-600/40 text-slate-400',
    defaultLabel: status,
  };

  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.classes}`}
    >
      <Icon className="w-3.5 h-3.5" />
      {label || config.defaultLabel}
    </span>
  );
};
