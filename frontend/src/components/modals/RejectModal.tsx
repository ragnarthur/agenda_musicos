// components/modals/RejectModal.tsx
import React from 'react';
import { ThumbsDown } from 'lucide-react';

interface RejectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  reason: string;
  onReasonChange: (reason: string) => void;
  loading?: boolean;
  title?: string;
  placeholder?: string;
}

const RejectModal: React.FC<RejectModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  reason,
  onReasonChange,
  loading = false,
  title = 'Rejeitar Evento',
  placeholder = 'Explique o motivo da rejeição...',
}) => {
  if (!isOpen) return null;

  const isValid = reason.trim().length > 0;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center sm:p-4 z-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="reject-modal-title"
    >
      <div className="bg-white rounded-t-2xl sm:rounded-xl shadow-2xl max-w-md w-full p-5 sm:p-6">
        <h3
          id="reject-modal-title"
          className="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4 flex items-center gap-2"
        >
          <ThumbsDown className="h-5 w-5 text-red-600" />
          <span>{title}</span>
        </h3>

        <div className="mb-4">
          <label
            htmlFor="rejection-reason"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Motivo da rejeição
          </label>
          <textarea
            id="rejection-reason"
            value={reason}
            onChange={(e) => onReasonChange(e.target.value)}
            rows={3}
            className="input-field text-base"
            placeholder={placeholder}
            required
            aria-required="true"
          />
        </div>

        <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 sm:gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="w-full sm:w-auto px-4 py-2.5 sm:py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={!isValid || loading}
            className="w-full sm:w-auto px-4 py-2.5 sm:py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
          >
            <ThumbsDown className="h-4 w-4" />
            <span>{loading ? 'Rejeitando...' : 'Confirmar Rejeição'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default RejectModal;
