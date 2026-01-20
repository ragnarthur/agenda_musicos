// components/modals/ConfirmModal.tsx
import React from 'react';
import SwipeToDismissWrapper from './SwipeToDismissWrapper';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string | React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: 'danger' | 'primary' | 'warning';
  loading?: boolean;
  icon?: React.ReactNode;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  confirmVariant = 'danger',
  loading = false,
  icon,
}) => {
  if (!isOpen) return null;

  const variantClasses = {
    danger: 'bg-red-600 hover:bg-red-700 text-white',
    primary: 'bg-primary-600 hover:bg-primary-700 text-white',
    warning: 'bg-orange-600 hover:bg-orange-700 text-white',
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center sm:p-4 z-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <SwipeToDismissWrapper isOpen={isOpen} onClose={onClose} disabled={!isOpen}>
        <div className="bg-white rounded-t-2xl sm:rounded-xl shadow-2xl max-w-md w-full p-5 sm:p-6 pb-safe pt-safe">
          <h3
            id="modal-title"
            className={`text-lg sm:text-xl font-bold mb-3 sm:mb-4 flex items-center gap-2 ${
              confirmVariant === 'danger' ? 'text-red-600' : 'text-gray-900'
            }`}
          >
            {icon && <span>{icon}</span>}
            <span>{title}</span>
          </h3>

          <div className="text-sm sm:text-base text-gray-600 mb-5 sm:mb-6">{message}</div>

          <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 sm:gap-3">
            <button
              onClick={onClose}
              disabled={loading}
              className="w-full sm:w-auto px-4 py-2.5 sm:py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              disabled={loading}
              className={`w-full sm:w-auto px-4 py-2.5 sm:py-2 rounded-lg disabled:opacity-50 transition-colors flex items-center justify-center gap-2 ${variantClasses[confirmVariant]}`}
            >
              {icon && <span>{icon}</span>}
              <span>{loading ? 'Processando...' : confirmText}</span>
            </button>
          </div>
        </div>
      </SwipeToDismissWrapper>
    </div>
  );
};

export default ConfirmModal;
