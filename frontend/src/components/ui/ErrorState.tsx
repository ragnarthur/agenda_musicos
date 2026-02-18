// components/ui/ErrorState.tsx
import React from 'react';
import { AlertCircle, RefreshCw, WifiOff } from 'lucide-react';

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
  isOffline?: boolean;
  className?: string;
}

const ErrorState: React.FC<ErrorStateProps> = ({
  message = 'Ocorreu um erro ao carregar os dados',
  onRetry,
  isOffline = false,
  className = '',
}) => {
  const Icon = isOffline ? WifiOff : AlertCircle;
  const title = isOffline ? 'Sem conexão' : 'Erro';
  const description = isOffline
    ? 'Verifique sua conexão com a internet e tente novamente'
    : message;

  return (
    <div
      className={`flex flex-col items-center justify-center py-12 px-4 text-center ${className}`}
    >
      <div className="w-16 h-16 rounded-full bg-red-50 dark:bg-red-900/30 flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-red-500 dark:text-red-400" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-1">{title}</h3>
      <p className="text-sm text-gray-500 dark:text-slate-400 max-w-sm mb-4">{description}</p>
      {onRetry && (
        <button onClick={onRetry} className="inline-flex items-center gap-2 btn-secondary text-sm">
          <RefreshCw className="w-4 h-4" />
          Tentar novamente
        </button>
      )}
    </div>
  );
};

export default ErrorState;
