// components/TrialBanner.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { Clock, CreditCard, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const TrialBanner: React.FC = () => {
  const { user } = useAuth();
  const [dismissed, setDismissed] = React.useState(false);

  // Não mostra se não há usuário ou subscription_info
  if (!user?.subscription_info) return null;

  const { is_trial, trial_days_remaining, has_active_subscription, status } = user.subscription_info;

  // Não mostra se foi dispensado nesta sessão
  if (dismissed) return null;

  // Não mostra se tem assinatura ativa (não trial)
  if (has_active_subscription && !is_trial) return null;

  // Não mostra se não está em trial e não expirou
  if (!is_trial && status !== 'expired') return null;

  // Determina estilo e mensagem baseado nos dias restantes
  const isUrgent = trial_days_remaining <= 2;
  const isExpired = status === 'expired' || trial_days_remaining === 0;

  const bannerClasses = isExpired
    ? 'bg-red-600 text-white'
    : isUrgent
    ? 'bg-amber-500 text-white'
    : 'bg-primary-600 text-white';

  const getMessage = () => {
    if (isExpired) {
      return 'Seu período de teste expirou. Assine agora para continuar usando a plataforma.';
    }
    if (trial_days_remaining === 1) {
      return 'Seu período de teste termina amanhã! Assine agora para não perder acesso.';
    }
    if (isUrgent) {
      return `Restam apenas ${trial_days_remaining} dias do seu período de teste.`;
    }
    return `Você está no período de teste gratuito. Restam ${trial_days_remaining} dias.`;
  };

  return (
    <div className={`${bannerClasses} px-4 py-2 relative`}>
      <div className="container mx-auto max-w-6xl flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1">
          <Clock className="h-5 w-5 flex-shrink-0" />
          <p className="text-sm font-medium">{getMessage()}</p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/planos"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
              isExpired
                ? 'bg-white text-red-600 hover:bg-red-50'
                : isUrgent
                ? 'bg-white text-amber-600 hover:bg-amber-50'
                : 'bg-white/20 hover:bg-white/30'
            }`}
          >
            <CreditCard className="h-4 w-4" />
            <span className="hidden sm:inline">Assinar Agora</span>
            <span className="sm:hidden">Assinar</span>
          </Link>

          {!isExpired && (
            <button
              onClick={() => setDismissed(true)}
              className="p-1 rounded hover:bg-white/20 transition-colors"
              aria-label="Dispensar"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default TrialBanner;
