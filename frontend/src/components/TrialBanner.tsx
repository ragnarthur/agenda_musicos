// components/TrialBanner.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { Clock, CreditCard, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const TrialBanner: React.FC = () => {
  const { user } = useAuth();
  const [dismissed, setDismissed] = React.useState(false);

  const renewalWindowDays = 5;
  
  const paidDaysRemaining = React.useMemo(() => {
    const subscriptionEndsAt = user?.subscription_info?.subscription_ends_at;
    if (!subscriptionEndsAt) return null;
    const now = new Date();
    return Math.ceil((new Date(subscriptionEndsAt).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  }, [user?.subscription_info?.subscription_ends_at]);

  // Não mostra se não há usuário ou subscription_info
  if (!user?.subscription_info) return null;

  const { is_trial, trial_days_remaining, status } = user.subscription_info;

  // Não mostra se foi dispensado nesta sessão
  if (dismissed) return null;
  const isPaidExpiringSoon =
    status === 'active' &&
    !is_trial &&
    paidDaysRemaining !== null &&
    paidDaysRemaining <= renewalWindowDays &&
    paidDaysRemaining >= 0;
  const isPaidExpired =
    !is_trial &&
    (status === 'expired' ||
      status === 'past_due' ||
      (paidDaysRemaining !== null && paidDaysRemaining < 0));

  // Não mostra se não está em trial e não está expirando/expirado
  if (!is_trial && !isPaidExpiringSoon && !isPaidExpired) return null;

  // Determina estilo e mensagem baseado nos dias restantes
  const isTrialUrgent = is_trial && trial_days_remaining <= 2;
  const isTrialEndingToday = is_trial && trial_days_remaining <= 0;
  const isExpired = isPaidExpired;
  const isWarning = isPaidExpiringSoon || isTrialUrgent || isTrialEndingToday;

  const bannerClasses = isExpired
    ? 'bg-red-600 text-white'
    : isWarning
    ? 'bg-amber-500 text-white'
    : 'bg-primary-600 text-white';

  const getMessage = () => {
    if (isPaidExpiringSoon) {
      if (paidDaysRemaining === 0) {
        return 'Seu plano vence hoje. Renove para manter o acesso.';
      }
      if (paidDaysRemaining === 1) {
        return 'Seu plano vence amanhã. Renove para manter o acesso.';
      }
      return `Seu plano vence em ${paidDaysRemaining} dias. Renove agora para manter o acesso.`;
    }
    if (isPaidExpired) {
      return 'Seu acesso expirou. Renove para continuar usando a plataforma.';
    }
    if (isTrialEndingToday) {
      return 'Seu período gratuito termina hoje. Assine agora para continuar com acesso.';
    }
    if (trial_days_remaining === 1) {
      return 'Seu período gratuito termina amanhã! Assine agora para não perder acesso.';
    }
    if (isTrialUrgent) {
      return `Restam apenas ${trial_days_remaining} dias do seu período gratuito.`;
    }
    return `Você está no período gratuito. Restam ${trial_days_remaining} dias.`;
  };

  const actionLabel = isPaidExpiringSoon || isPaidExpired ? 'Renovar agora' : 'Assinar agora';

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
                : isWarning
                ? 'bg-white text-amber-600 hover:bg-amber-50'
                : 'bg-white/20 hover:bg-white/30'
            }`}
          >
            <CreditCard className="h-4 w-4" />
            <span className="hidden sm:inline">{actionLabel}</span>
            <span className="sm:hidden">{isPaidExpiringSoon || isPaidExpired ? 'Renovar' : 'Assinar'}</span>
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
