// pages/Plans.tsx
import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { CheckCircle, CreditCard, Shield, AlertCircle, Loader2, Sparkles, Star, ArrowLeft } from 'lucide-react';
import { paymentService } from '../services/api';
import { showToast } from '../utils/toast';

type PlanType = 'monthly' | 'annual';

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
      'Convites e respostas rápidas',
      'Marketplace de vagas e conexões',
      'Suporte prioritário via email',
    ],
  },
  {
    id: 'annual',
    name: 'Anual',
    price: 'R$ 299,90',
    per: '/ano',
    highlight: true,
    features: [
      '2 meses grátis (equivale a R$ 24,99/mês)',
      'Prioridade em lançamentos e novidades',
      'Badge de apoiador anual',
      'Suporte dedicado',
    ],
  },
];

const Plans: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const paymentToken = searchParams.get('token');

  const [selectedPlan, setSelectedPlan] = useState<PlanType>('monthly');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!paymentToken) {
      setError('Token de pagamento não encontrado. Volte ao email e clique no link novamente.');
    }
  }, [paymentToken]);

  const handleSubscribe = async () => {
    if (!paymentToken) return;

    setLoading(true);
    setError('');

    try {
      const origin = window.location.origin;
      const successUrl = `${origin}/planos/sucesso`;
      const cancelUrl = `${origin}/planos?token=${paymentToken}`;

      const session = await paymentService.createCheckoutSession({
        payment_token: paymentToken,
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

  if (error && !paymentToken) {
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
    <div className="min-h-screen bg-gradient-to-br from-primary-500 to-primary-700 px-4 py-10 flex items-center justify-center">
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
                <p className="text-sm text-gray-500">Escolha seu plano</p>
                <h1 className="text-2xl font-bold text-gray-900">Acesse tudo na GigFlow</h1>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
                {error}
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
                disabled={loading || !paymentToken}
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
                    Continuar com Stripe
                  </>
                )}
              </button>
              <p className="text-xs text-gray-500 text-center mt-2">
                Você será redirecionado para um checkout seguro Stripe.
              </p>
            </div>
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
