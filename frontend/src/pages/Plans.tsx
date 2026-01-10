// pages/Plans.tsx
import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { CheckCircle, CreditCard, Shield, AlertCircle, Loader2, Sparkles, Star, ArrowLeft } from 'lucide-react';
import { paymentService, registrationService, billingService } from '../services/api';
import { showToast } from '../utils/toast';
import { useAuth } from '../contexts/AuthContext';

type PlanType = 'monthly';

const plans: Array<{
  id: PlanType;
  name: string;
  price: string;
  per: string;
  highlight?: boolean;
  features: string[];
}> = [
  {
    id: 'monthly',
    name: 'Mensal',
    price: 'R$ 29,90',
    per: '/mês',
    features: [
      'Agenda completa para shows',
      'Convites e respostas com agilidade',
      'Vagas de shows e conexões profissionais',
      'Suporte prioritário via email',
    ],
  },
];

const Plans: React.FC = () => {
  const useStripe = import.meta.env.VITE_USE_STRIPE === 'true';
  const allowFakePayment = import.meta.env.VITE_ALLOW_FAKE_PAYMENT === 'true';
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const paymentToken = searchParams.get('token');
  const { user, loading: authLoading, refreshUser } = useAuth();
  const subscriptionInfo = user?.subscription_info;

  const [selectedPlan, setSelectedPlan] = useState<PlanType>('monthly');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [registrationComplete, setRegistrationComplete] = useState(false);
  const [completedUser, setCompletedUser] = useState<{email?: string; first_name?: string} | null>(null);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [upgradeMode, setUpgradeMode] = useState(false);
  const [showFakeCheckout, setShowFakeCheckout] = useState(false);
  const [upgradeSuccess, setUpgradeSuccess] = useState(false);
  const [formData, setFormData] = useState({
    card_number: '',
    card_holder: '',
    card_expiry: '',
    card_cvv: '',
  });

  useEffect(() => {
    const checkToken = async () => {
      if (!paymentToken) {
        if (authLoading) {
          return;
        }
        if (subscriptionInfo && (subscriptionInfo.is_trial || subscriptionInfo.status === 'expired')) {
          setUpgradeMode(true);
        } else {
          setError('Token de pagamento não encontrado. Volte ao email e clique no link novamente.');
        }
        setCheckingStatus(false);
        return;
      }

      // Verificar status do registro
      try {
        const status = await registrationService.getStatus(paymentToken);
        if (status.status === 'completed' || status.payment_completed) {
          setRegistrationComplete(true);
          setCompletedUser({ email: status.email, first_name: status.first_name });
        }
      } catch {
        // Token invalido - manter erro original
      }
      setCheckingStatus(false);
    };
    checkToken();
  }, [paymentToken, authLoading, subscriptionInfo]);

  const formatCardNumber = (value: string) => {
    const nums = value.replace(/\D/g, '').slice(0, 16);
    return nums.replace(/(\d{4})(?=\d)/g, '$1 ');
  };

  const formatExpiry = (value: string) => {
    const nums = value.replace(/\D/g, '').slice(0, 4);
    if (nums.length > 2) {
      return `${nums.slice(0, 2)}/${nums.slice(2)}`;
    }
    return nums;
  };

  const handleCardChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    if (name === 'card_number') {
      setFormData(prev => ({ ...prev, card_number: formatCardNumber(value) }));
    } else if (name === 'card_expiry') {
      setFormData(prev => ({ ...prev, card_expiry: formatExpiry(value) }));
    } else if (name === 'card_cvv') {
      setFormData(prev => ({ ...prev, card_cvv: value.replace(/\D/g, '').slice(0, 4) }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubscribe = async () => {
    if (!paymentToken && !upgradeMode) return;

    if (!useStripe || allowFakePayment) {
      setShowFakeCheckout(true);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const origin = window.location.origin;
      const successUrl = `${origin}/planos/sucesso`;
      const cancelUrl = upgradeMode
        ? `${origin}/planos`
        : `${origin}/planos?token=${paymentToken}`;

      const session = upgradeMode
        ? await billingService.createUpgradeSession({
          plan: selectedPlan,
          success_url: successUrl,
          cancel_url: cancelUrl,
        })
        : await paymentService.createCheckoutSession({
          payment_token: paymentToken as string,
          plan: selectedPlan,
          success_url: successUrl,
          cancel_url: cancelUrl,
        });

      window.location.href = session.checkout_url;
    } catch (err: unknown) {
      const apiError = err as { response?: { data?: { error?: string } } };
      const message = apiError.response?.data?.error || 'Não foi possível iniciar o pagamento.';
      setError(message);
      showToast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleFakePayment = async (e: React.FormEvent) => {
    e.preventDefault();

    const cardNum = formData.card_number.replace(/\s/g, '');
    if (cardNum.length < 13) {
      showToast.error('Número do cartão inválido');
      return;
    }

    if (!formData.card_holder.trim()) {
      showToast.error('Nome do titular é obrigatório');
      return;
    }

    if (formData.card_expiry.length < 5) {
      showToast.error('Data de validade inválida');
      return;
    }

    if (formData.card_cvv.length < 3) {
      showToast.error('CVV inválido');
      return;
    }

    setLoading(true);
    setError('');

    try {
      if (upgradeMode) {
        await billingService.activateFakeSubscription({ plan: selectedPlan });
        await refreshUser();
        setUpgradeSuccess(true);
        showToast.success('Assinatura ativada com sucesso!');
        return;
      }

      if (!paymentToken) {
        setError('Token de pagamento não encontrado. Volte ao email e clique no link novamente.');
        return;
      }

      const response = await registrationService.processPayment({
        payment_token: paymentToken,
        card_number: cardNum,
        card_holder: formData.card_holder,
        card_expiry: formData.card_expiry,
        card_cvv: formData.card_cvv,
      });

      setRegistrationComplete(true);
      setCompletedUser({ email: response.email });
      showToast.success('Pagamento aprovado! Cadastro concluído.');
    } catch (err: unknown) {
      const apiError = err as { response?: { data?: { error?: string } } };
      const message = apiError.response?.data?.error || 'Erro ao processar pagamento.';
      setError(message);
      showToast.error(message);
    } finally {
      setLoading(false);
    }
  };

  // Loading enquanto verifica status
  if (checkingStatus) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-white animate-spin" />
      </div>
    );
  }

  // Cadastro já foi completado - mostrar sucesso
  if (registrationComplete) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-500 to-green-700 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8 text-center">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Cadastro Concluído!</h2>
          <p className="text-gray-600 mb-6">
            Bem-vindo à <strong>GigFlow</strong>!
            Sua conta está ativa e pronta para uso.
          </p>
          {completedUser && (
            <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
              <p className="text-sm text-gray-600">
                <strong>Email:</strong> {completedUser.email}
              </p>
            </div>
          )}
          <Link to="/login" className="btn-primary w-full block text-center">
            Fazer Login
          </Link>
        </div>
      </div>
    );
  }

  if (upgradeSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-500 to-green-700 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8 text-center">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Assinatura ativada!</h2>
          <p className="text-gray-600 mb-6">
            Seu plano mensal está ativo e o acesso total foi liberado.
          </p>
          <Link to="/dashboard" className="btn-primary w-full block text-center">
            Ir para o app
          </Link>
        </div>
      </div>
    );
  }

  if (error && !paymentToken && !upgradeMode) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8 text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Erro</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <Link to="/cadastro" className="btn-primary w-full block text-center">
            Fazer novo cadastro
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 px-4 py-10 flex items-center justify-center">
      <div className="w-full max-w-5xl">
        <div className="mb-6">
          <button
            onClick={() => navigate(-1)}
            className="text-white/80 hover:text-white inline-flex items-center gap-2 text-sm"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-3xl shadow-2xl p-6 sm:p-8">
            <div className="flex items-center gap-3 mb-6">
              <Sparkles className="h-6 w-6 text-primary-600" />
              <div>
                <p className="text-sm text-gray-500">GigFlow · para músicos</p>
                <h1 className="text-2xl font-bold text-gray-900">Acesse tudo na GigFlow</h1>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
                {error}
              </div>
            )}

            {upgradeMode && subscriptionInfo && (
              <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-lg mb-4">
                <strong>Status atual:</strong>{' '}
                {subscriptionInfo.is_trial
                  ? `Trial · ${subscriptionInfo.trial_days_remaining} dias restantes`
                  : 'Plano expirado'}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {plans.map(plan => (
                <div
                  key={plan.id}
                  className={`rounded-2xl border p-5 cursor-pointer transition-all ${
                    selectedPlan === plan.id
                      ? 'border-primary-500 ring-2 ring-primary-200 shadow-lg'
                      : 'border-gray-200 hover:border-primary-200'
                  } ${plan.highlight ? 'bg-gradient-to-br from-primary-50 to-purple-50' : 'bg-white'}`}
                  onClick={() => setSelectedPlan(plan.id)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{plan.name}</h3>
                    {plan.highlight && (
                      <span className="text-xs font-semibold text-primary-700 bg-primary-100 px-2 py-1 rounded-full">
                        Mais vantajoso
                      </span>
                    )}
                  </div>
                  <div className="flex items-baseline gap-2 mb-3">
                    <span className="text-3xl font-bold text-gray-900">{plan.price}</span>
                    <span className="text-gray-500">{plan.per}</span>
                  </div>
                  <ul className="space-y-2 text-sm text-gray-700">
                    {plan.features.map(feature => (
                      <li key={feature} className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-primary-600" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <div className="mt-6">
              <button
                onClick={handleSubscribe}
                disabled={loading || (!paymentToken && !upgradeMode)}
                className="w-full btn-primary flex items-center justify-center gap-2 py-3 disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Redirecionando para pagamento...
                  </>
                ) : (
                  <>
                    <CreditCard className="h-5 w-5" />
                    {useStripe && !allowFakePayment ? 'Continuar com Stripe' : 'Continuar para pagamento'}
                  </>
                )}
              </button>
              <p className="text-xs text-gray-500 text-center mt-2">
                {useStripe && !allowFakePayment
                  ? 'Você será redirecionado para um checkout seguro Stripe.'
                  : 'Use os dados fictícios para concluir o teste.'}
              </p>
            </div>

            {showFakeCheckout && (!useStripe || allowFakePayment) && (
              <form onSubmit={handleFakePayment} className="mt-6 space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Número do cartão</label>
                  <input
                    name="card_number"
                    value={formData.card_number}
                    onChange={handleCardChange}
                    placeholder="4242 4242 4242 4242"
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Nome no cartão</label>
                  <input
                    name="card_holder"
                    value={formData.card_holder}
                    onChange={handleCardChange}
                    placeholder="Nome completo"
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Validade</label>
                    <input
                      name="card_expiry"
                      value={formData.card_expiry}
                      onChange={handleCardChange}
                      placeholder="MM/AA"
                      className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">CVV</label>
                    <input
                      name="card_cvv"
                      value={formData.card_cvv}
                      onChange={handleCardChange}
                      placeholder="123"
                      className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      required
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full btn-primary py-3 disabled:opacity-60"
                >
                  {loading ? 'Processando pagamento...' : 'Finalizar pagamento mensal'}
                </button>
                <p className="text-xs text-gray-500 text-center">
                  Use qualquer cartão, exceto números iniciando com 0000.
                </p>
              </form>
            )}
          </div>

          <div className="bg-white/10 backdrop-blur rounded-3xl p-6 text-white border border-white/20">
            <div className="flex items-center gap-3 mb-4">
              <Shield className="h-6 w-6" />
              <div>
                <p className="text-sm text-white/80">Segurança</p>
                <h3 className="text-lg font-semibold">Pagamento Protegido</h3>
              </div>
            </div>
            <ul className="space-y-3 text-sm text-white/80">
              <li className="flex gap-2">
                <CheckCircle className="h-5 w-5 text-emerald-300 mt-0.5" />
                <span>Checkout hospedado pelo Stripe (PCI DSS).</span>
              </li>
              <li className="flex gap-2">
                <CheckCircle className="h-5 w-5 text-emerald-300 mt-0.5" />
                <span>Sem salvar dados de cartão na GigFlow.</span>
              </li>
              <li className="flex gap-2">
                <CheckCircle className="h-5 w-5 text-emerald-300 mt-0.5" />
                <span>Cancelamento a qualquer momento.</span>
              </li>
              <li className="flex gap-2">
                <Star className="h-5 w-5 text-amber-200 mt-0.5" />
                <span>Suporte prioritário para assinantes.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Plans;
