// pages/PlanSelection.tsx
import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import {
  Check,
  Loader2,
  AlertCircle,
  Calendar,
  Users,
  Star,
  Shield,
  Zap,
} from 'lucide-react';
import { registrationService, paymentService, type RegistrationStatus } from '../services/api';
import { getErrorMessage, showToast } from '../utils/toast';
import OwlMascot from '../components/ui/OwlMascot';
import FullscreenBackground from '../components/Layout/FullscreenBackground';

interface Plan {
  id: 'monthly' | 'annual';
  name: string;
  price: string;
  priceValue: number;
  period: string;
  description: string;
  savings?: string;
  popular?: boolean;
}

const PLANS: Plan[] = [
  {
    id: 'monthly',
    name: 'Mensal',
    price: 'R$ 29,90',
    priceValue: 29.9,
    period: '/mês',
    description: 'Ideal para iniciar com organização profissional',
  },
  {
    id: 'annual',
    name: 'Anual',
    price: 'R$ 299,00',
    priceValue: 299,
    period: '/ano',
    description: 'Melhor custo-benefício anual',
    savings: 'Economize R$ 59,80',
    popular: true,
  },
];

const FEATURES = [
  { icon: Calendar, text: 'Gestão profissional de agenda' },
  { icon: Users, text: 'Rede de músicos profissionais' },
  { icon: Star, text: 'Vagas de shows' },
  { icon: Shield, text: 'Proteção de dados' },
  { icon: Zap, text: 'Notificações em tempo real' },
];

const PlanSelection: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [status, setStatus] = useState<RegistrationStatus | null>(null);
  const [error, setError] = useState('');
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'annual'>('monthly');

  const loadStatus = useCallback(async () => {
    if (!token) return;

    try {
      const data = await registrationService.getStatus(token);
      setStatus(data);

      if (data.status === 'completed') {
        navigate('/login');
        showToast.success('Cadastro já concluído! Faça login.');
      } else if (data.status === 'pending_email') {
        setError('Email ainda não foi verificado. Verifique sua caixa de entrada.');
      } else if (data.is_expired) {
        setError('Este cadastro expirou. Faça o cadastro novamente.');
      }
    } catch {
      setError('Cadastro não encontrado ou expirado.');
    } finally {
      setLoading(false);
    }
  }, [navigate, token]);

  useEffect(() => {
    if (!token) {
      setError('Token de pagamento não fornecido.');
      setLoading(false);
      return;
    }

    void loadStatus();
  }, [token, loadStatus]);

  const handleSelectPlan = async () => {
    if (!token) return;

    setProcessing(true);
    setError('');

    try {
      const response = await paymentService.createCheckoutSession({
        payment_token: token,
        plan: selectedPlan,
        success_url: `${window.location.origin}/pagamento/sucesso`,
        cancel_url: `${window.location.origin}/planos?token=${token}`,
      });

      // Redireciona para o Stripe Checkout
      window.location.href = response.checkout_url;
    } catch (err: unknown) {
      const message = getErrorMessage(err);
      setError(message);
      showToast.error(message);
      setProcessing(false);
    }
  };

  // Loading
  if (loading) {
    return (
      // Loading rápido, sem partículas pra deixar leve.
      <FullscreenBackground
        className="bg-gradient-to-br from-primary-500 to-primary-700 dark:from-slate-950 dark:to-slate-800"
        contentClassName="flex items-center justify-center"
        enableParticles={false}
      >
        <Loader2 className="h-12 w-12 text-white animate-spin" />
      </FullscreenBackground>
    );
  }

  // Erro
  if (error && !status) {
    return (
      // Erro já é uma tela simples, então deixei sem partículas.
      <FullscreenBackground
        className="bg-gradient-to-br from-primary-500 to-primary-700 dark:from-slate-950 dark:to-slate-800 px-4"
        contentClassName="flex items-center justify-center"
        enableParticles={false}
      >
        <div className="max-w-md w-full">
          <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
            <div className="flex justify-center mb-6">
              <div className="bg-red-100 p-4 rounded-full">
                <AlertCircle className="h-12 w-12 text-red-600" />
              </div>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Erro</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <Link to="/cadastro" className="block w-full btn-primary text-center">
              Fazer novo cadastro
            </Link>
          </div>
        </div>
      </FullscreenBackground>
    );
  }

  return (
    // Aqui é uma tela intermediária de escolha, então deixei leve.
    <FullscreenBackground
      className="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 px-4 py-8"
      contentClassName="flex items-center justify-center"
      enableParticles={false}
    >
      <div className="max-w-4xl w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="h-16 w-16 flex items-center justify-center">
              <OwlMascot className="h-16 w-16" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm text-primary-100 uppercase tracking-wide">GigFlow</p>
                <span className="text-[10px] px-2 py-0.5 bg-gradient-to-r from-amber-500/8 via-amber-400/12 to-amber-500/8 text-amber-100/70 rounded-full border border-amber-400/15 font-light italic tracking-wider">
                  Beta
                </span>
              </div>
              <h1 className="text-3xl font-bold text-white leading-tight">Escolha seu plano</h1>
              {status && (
                <p className="text-primary-100 text-sm">
                  Olá <strong>{status.first_name}</strong>, escolha o melhor plano para você.
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/cadastro"
              className="hidden sm:inline-block text-white/80 hover:text-white text-sm underline-offset-4 hover:underline"
            >
              Voltar ao cadastro
            </Link>
            <Link
              to="/login"
              className="text-white/90 border border-white/40 px-4 py-2 rounded-lg text-sm hover:bg-white/10 transition"
            >
              Ir para login
            </Link>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 text-center">
            {error}
          </div>
        )}

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              onClick={() => setSelectedPlan(plan.id)}
              className={`relative bg-white rounded-2xl p-6 cursor-pointer transition-all duration-200 ${
                selectedPlan === plan.id
                  ? 'ring-4 ring-primary-500 shadow-xl scale-[1.02]'
                  : 'shadow-lg hover:shadow-xl'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-primary-600 text-white text-xs font-medium px-3 py-1 rounded-full">
                    Mais Popular
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-gray-900">{plan.name}</h3>
                <div
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                    selectedPlan === plan.id
                      ? 'bg-primary-600 border-primary-600'
                      : 'border-gray-300'
                  }`}
                >
                  {selectedPlan === plan.id && <Check className="h-4 w-4 text-white" />}
                </div>
              </div>

              <div className="mb-4">
                <span className="text-3xl font-bold text-gray-900">{plan.price}</span>
                <span className="text-gray-500">{plan.period}</span>
              </div>

              <p className="text-gray-600 mb-4">{plan.description}</p>

              {plan.savings && (
                <div className="bg-green-50 text-green-700 text-sm font-medium px-3 py-2 rounded-lg">
                  {plan.savings}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Features */}
        <div className="bg-white/10 backdrop-blur rounded-2xl p-6 mb-8">
          <h3 className="text-white font-semibold mb-4 text-center">
            Todos os planos incluem:
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((feature, index) => (
              <div key={index} className="flex items-center gap-3 text-white/90">
                <div className="bg-white/20 p-2 rounded-lg">
                  <feature.icon className="h-5 w-5" />
                </div>
                <span className="text-sm">{feature.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Action Button */}
        <div className="text-center">
          <button
            onClick={handleSelectPlan}
            disabled={processing}
            className="btn-primary px-12 py-4 text-lg font-semibold inline-flex items-center gap-3"
          >
            {processing ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Redirecionando...
              </>
            ) : (
              <>
                Continuar com {PLANS.find((p) => p.id === selectedPlan)?.name}
              </>
            )}
          </button>

          <p className="text-white/70 text-sm mt-4">
            Pagamento seguro processado pelo Stripe. Cancele quando quiser.
          </p>
        </div>
      </div>
    </FullscreenBackground>
  );
};

export default PlanSelection;
