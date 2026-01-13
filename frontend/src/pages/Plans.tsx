// pages/Plans.tsx
import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { CheckCircle, CreditCard, Shield, AlertCircle, Loader2, Sparkles, Star, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
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

const revealParent = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.12 } },
};

const revealItem = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45 } },
};

const Plans: React.FC = () => {
  const useStripe = import.meta.env.VITE_USE_STRIPE === 'true';
  const allowFakePayment = import.meta.env.VITE_ALLOW_FAKE_PAYMENT === 'true';
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const paymentToken = searchParams.get('token');
  const { user, loading: authLoading, refreshUser } = useAuth();
  const subscriptionInfo = user?.subscription_info;

  const selectedPlan: PlanType = 'monthly';
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
  const selectedPlanInfo = plans.find(plan => plan.id === selectedPlan);
  const isTestMode = !useStripe || allowFakePayment;
  const flowSteps = [
    {
      title: 'Plano mensal',
      description: 'Assinatura única com acesso completo ao app.',
    },
    {
      title: 'Pagamento seguro',
      description: 'Checkout protegido com autenticação e criptografia.',
    },
    {
      title: 'Acesso imediato',
      description: 'Liberação do app e da agenda em segundos.',
    },
  ];

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
      <div className="min-h-screen bg-gradient-to-br from-primary-500 to-primary-700 dark:from-slate-950 dark:to-slate-800 flex items-center justify-center px-4">
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
    <div className="min-h-screen bg-slate-950 text-white">
      <motion.div
        className="max-w-6xl mx-auto px-4 py-10 space-y-8"
        variants={revealParent}
        initial="hidden"
        animate="show"
      >
        <motion.div variants={revealItem} className="flex items-center justify-between gap-3 text-sm">
          <button
            onClick={() => navigate(-1)}
            className="text-white/80 hover:text-white inline-flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </button>
          <span className="hidden sm:inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/10 text-white/70">
            <Shield className="h-4 w-4" />
            Suporte humano em horário comercial
          </span>
        </motion.div>

        <motion.section
          variants={revealItem}
          className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-primary-500/10 via-slate-900 to-slate-950 p-6 md:p-8"
        >
          <div
            className="pointer-events-none absolute inset-0 opacity-35"
            style={{
              backgroundImage:
                'radial-gradient(circle at 10% 20%, rgba(99,102,241,0.35), transparent 40%), radial-gradient(circle at 85% 15%, rgba(16,185,129,0.35), transparent 42%), radial-gradient(circle at 70% 80%, rgba(14,165,233,0.25), transparent 45%)',
            }}
          />
          <motion.div
            className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-primary-500/20 blur-3xl"
            animate={{ y: [0, -10, 0], x: [0, 6, 0] }}
            transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="absolute -left-10 bottom-0 h-32 w-32 rounded-full bg-emerald-400/10 blur-2xl"
            animate={{ y: [0, 8, 0], x: [0, -6, 0] }}
            transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
          />

          <div className="relative grid gap-6 md:grid-cols-3 items-start">
            <div className="md:col-span-2 space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-xs uppercase tracking-wide text-primary-100">
                <Sparkles className="h-4 w-4" />
                Nova experiência de checkout
              </div>
              <div className="space-y-2">
                <h1 className="text-3xl md:text-4xl font-bold leading-tight">
                  Ative sua assinatura com um fluxo mais claro
                </h1>
                <p className="text-white/70 max-w-2xl">
                  Organize agendas, convites e pagamentos num só lugar. Escolha o plano, finalize o pagamento e entre
                  direto no painel.
                </p>
              </div>

              <div className="grid sm:grid-cols-3 gap-3">
                {flowSteps.map(step => (
                  <motion.div
                    key={step.title}
                    variants={revealItem}
                    className="rounded-2xl border border-white/10 bg-white/5 p-3 transition-all duration-300 hover:-translate-y-1 hover:border-primary-400/40 hover:bg-white/10"
                  >
                    <p className="text-xs text-primary-200 font-semibold uppercase">{step.title}</p>
                    <p className="text-sm text-white/80 mt-1 leading-relaxed">{step.description}</p>
                  </motion.div>
                ))}
              </div>
            </div>

            <motion.div variants={revealItem} className="bg-white text-slate-900 rounded-2xl shadow-2xl p-5 space-y-3 border border-white/20">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold text-primary-600 uppercase">Plano mensal</p>
                {upgradeMode ? (
                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 border border-amber-200">
                    Upgrade
                  </span>
                ) : (
                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                    Checkout seguro
                  </span>
                )}
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold">{selectedPlanInfo?.price ?? 'R$ --'}</span>
                <span className="text-sm text-slate-600">{selectedPlanInfo?.per}</span>
              </div>
              <p className="text-sm text-slate-600">
                {selectedPlanInfo?.name} com acesso completo a agenda, convites e marketplace.
              </p>

              {upgradeMode && subscriptionInfo && (
                <div className="rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-800">
                  Status atual:{' '}
                  {subscriptionInfo.is_trial
                    ? `período gratuito com ${subscriptionInfo.trial_days_remaining} dias restantes`
                    : 'plano expirado'}
                  .
                </div>
              )}

              <div className="flex items-center gap-2 text-sm text-slate-700">
                <CheckCircle className="h-4 w-4 text-emerald-500" />
                Cancelamento simples, sem multa.
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-700">
                <CheckCircle className="h-4 w-4 text-emerald-500" />
                Confirmação por email após o pagamento.
              </div>
            </motion.div>
          </div>
        </motion.section>

        <motion.div variants={revealItem} className="grid lg:grid-cols-3 gap-6 items-start">
          <div className="lg:col-span-2 space-y-6">
            <motion.div variants={revealItem} className="bg-white text-slate-900 rounded-3xl shadow-2xl p-6 md:p-7 border border-white/5">
              <div className="flex items-start justify-between gap-4 mb-6">
                <div>
                  <p className="text-sm text-slate-500">Plano simples, sem surpresa</p>
                  <h2 className="text-xl font-semibold text-slate-900">Plano mensal disponível</h2>
                </div>
                <span className="px-3 py-1 rounded-full bg-slate-100 text-xs font-semibold text-slate-700 border border-slate-200">
                  Único plano
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {plans.map(plan => (
                  <motion.div
                    key={plan.id}
                    variants={revealItem}
                    whileHover={{ y: -8, scale: 1.015 }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ type: 'spring', stiffness: 260, damping: 18 }}
                    className="group relative cursor-default"
                  >
                    <span className="pointer-events-none absolute -inset-px rounded-2xl bg-gradient-to-r from-primary-400/30 via-emerald-300/20 to-sky-300/20 opacity-0 blur-sm transition-opacity duration-300 group-hover:opacity-100" />
                    <span className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
                      <span className="absolute -left-1/2 top-0 h-full w-1/2 bg-gradient-to-r from-transparent via-white/45 to-transparent opacity-0 transition-all duration-700 group-hover:opacity-100 group-hover:translate-x-[180%]" />
                    </span>
                    <div
                      className="absolute inset-0 rounded-2xl opacity-100 transition-opacity duration-300 pointer-events-none"
                      style={{
                        background:
                          'linear-gradient(135deg, rgba(59,130,246,0.25), rgba(16,185,129,0.15), transparent 70%)',
                      }}
                    />
                    <div
                      className="relative rounded-2xl border p-5 transition-all bg-gradient-to-br from-primary-50 to-white border-primary-200 ring-2 ring-primary-100 shadow-lg dark:from-slate-900 dark:to-slate-800 dark:border-primary-500/50 dark:ring-primary-400/30"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="text-xs uppercase tracking-wide text-slate-500">Plano</p>
                          <h3 className="text-lg font-semibold text-slate-900 transition-colors duration-300 group-hover:text-primary-700">
                            {plan.name}
                          </h3>
                        </div>
                        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-primary-50 text-primary-700 border border-primary-100 transition-transform duration-300 group-hover:-translate-y-0.5">
                          Plano único
                        </span>
                      </div>
                      <div className="flex items-baseline gap-2 mb-3">
                        <span className="text-3xl font-bold text-slate-900 transition-transform duration-300 group-hover:-translate-y-0.5">
                          {plan.price}
                        </span>
                        <span className="text-sm text-slate-500">{plan.per}</span>
                      </div>
                      <ul className="space-y-2 text-sm text-slate-700">
                        {plan.features.map(feature => (
                          <li key={feature} className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-primary-600 transition-transform duration-300 group-hover:scale-110" />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </motion.div>
                ))}
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="flex items-start gap-3 rounded-2xl bg-slate-50 border border-slate-200 p-3">
                  <Star className="h-5 w-5 text-amber-500 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Visibilidade extra</p>
                    <p className="text-sm text-slate-600">Apareça no marketplace e receba convites mais rápido.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-2xl bg-slate-50 border border-slate-200 p-3">
                  <Shield className="h-5 w-5 text-emerald-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Pagamento protegido</p>
                    <p className="text-sm text-slate-600">Checkout com autenticação e dados criptografados.</p>
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div variants={revealItem} className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <div className="flex items-center gap-3">
                <Star className="h-6 w-6 text-amber-300" />
                <div>
                  <p className="text-sm text-white/70">Benefícios da assinatura</p>
                  <h3 className="text-lg font-semibold text-white">Pensado para líderes e músicos</h3>
                </div>
              </div>
              <ul className="mt-4 grid sm:grid-cols-2 gap-3 text-white/80 text-sm">
                <li className="flex gap-2">
                  <CheckCircle className="h-5 w-5 text-emerald-300 mt-0.5" />
                  <span>Agenda com convites, confirmações e buffers de segurança.</span>
                </li>
                <li className="flex gap-2">
                  <CheckCircle className="h-5 w-5 text-emerald-300 mt-0.5" />
                  <span>Disponibilidades cruzadas para evitar conflitos e atrasos.</span>
                </li>
                <li className="flex gap-2">
                  <CheckCircle className="h-5 w-5 text-emerald-300 mt-0.5" />
                  <span>Marketplace para divulgar gigs e encontrar talentos.</span>
                </li>
                <li className="flex gap-2">
                  <CheckCircle className="h-5 w-5 text-emerald-300 mt-0.5" />
                  <span>Suporte dedicado para ajustes de agenda e pagamentos.</span>
                </li>
              </ul>
            </motion.div>
          </div>

          <div className="space-y-6">
            <motion.div variants={revealItem} className="bg-white text-slate-900 rounded-3xl shadow-2xl p-6 border border-white/5">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <p className="text-sm text-slate-500">Pagamento</p>
                  <h3 className="text-xl font-semibold text-slate-900">Finalize agora</h3>
                  <p className="text-sm text-slate-600">Tempo médio: menos de 2 minutos.</p>
                </div>
                <div className="px-3 py-1 rounded-full bg-slate-100 text-xs font-semibold text-slate-700 border border-slate-200">
                  Checkout seguro
                </div>
              </div>

              {error && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 px-3 py-2 rounded-lg mb-3 text-sm">
                  {error}
                </div>
              )}

              {upgradeMode && (
                <div className="bg-indigo-50 border border-indigo-200 text-indigo-700 px-3 py-2 rounded-lg mb-3 text-sm">
                  Upgrade rápido: mantemos seus dados e liberamos o plano completo após o pagamento.
                </div>
              )}

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
                    Continuar para pagamento
                  </>
                )}
              </button>
              <p className="text-xs text-slate-500 text-center mt-2">
                Pagamento protegido com confirmação imediata.
              </p>

              {showFakeCheckout && isTestMode && (
                <motion.form
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35 }}
                  onSubmit={handleFakePayment}
                  className="mt-5 space-y-4 border-t border-slate-200 pt-4"
                >
                  <div className="grid gap-3">
                    <label className="text-sm font-medium text-slate-800">Número do cartão</label>
                    <input
                      name="card_number"
                      value={formData.card_number}
                      onChange={handleCardChange}
                      placeholder="4242 4242 4242 4242"
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      required
                    />
                  </div>
                  <div className="grid gap-3">
                    <label className="text-sm font-medium text-slate-800">Nome no cartão</label>
                    <input
                      name="card_holder"
                      value={formData.card_holder}
                      onChange={handleCardChange}
                      placeholder="Nome completo"
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-3">
                      <label className="text-sm font-medium text-slate-800">Validade</label>
                      <input
                        name="card_expiry"
                        value={formData.card_expiry}
                        onChange={handleCardChange}
                        placeholder="MM/AA"
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        required
                      />
                    </div>
                    <div className="grid gap-3">
                      <label className="text-sm font-medium text-slate-800">CVV</label>
                      <input
                        name="card_cvv"
                        value={formData.card_cvv}
                        onChange={handleCardChange}
                        placeholder="123"
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary-500"
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
                  <p className="text-xs text-slate-500 text-center">
                    Após confirmar, o acesso mensal será liberado automaticamente.
                  </p>
                </motion.form>
              )}
            </motion.div>

            <motion.div variants={revealItem} className="rounded-3xl border border-white/10 bg-white/5 p-6 text-white">
              <div className="flex items-center gap-3 mb-4">
                <Shield className="h-6 w-6" />
                <div>
                  <p className="text-sm text-white/80">Segurança</p>
                  <h3 className="text-lg font-semibold">Pagamento protegido</h3>
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
            </motion.div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default Plans;
