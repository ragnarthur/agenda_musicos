import React from 'react';
import { AdminModal } from './AdminModal';
import { AdminButton } from './AdminButton';
import { AlertTriangle, Trash2 } from 'lucide-react';

interface AdminConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  variant?: 'danger' | 'warning';
  loading?: boolean;
}

export const AdminConfirmModal: React.FC<AdminConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirmar',
  variant = 'danger',
  loading = false,
}) => {
  const Icon = variant === 'danger' ? Trash2 : AlertTriangle;
  const iconColor = variant === 'danger' ? 'text-red-400' : 'text-amber-400';
  const iconBg = variant === 'danger' ? 'bg-red-500/20' : 'bg-amber-500/20';

  return (
    <AdminModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <AdminButton variant="secondary" onClick={onClose} disabled={loading}>
            Cancelar
          </AdminButton>
          <AdminButton
            variant={variant === 'danger' ? 'danger' : 'primary'}
            onClick={onConfirm}
            loading={loading}
          >
            {confirmLabel}
          </AdminButton>
        </>
      }
    >
      <div className="flex items-start gap-4">
        <div className={`p-3 rounded-xl ${iconBg} flex-shrink-0`}>
          <Icon className={`h-6 w-6 ${iconColor}`} />
        </div>
        <p className="text-sm text-slate-300 leading-relaxed">{message}</p>
      </div>
    </AdminModal>
  );
};
