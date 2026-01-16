// pages/PaymentSuccess.tsx
import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle, Loader2, AlertCircle } from 'lucide-react';
import { paymentService } from '../services/api';
import OwlMascot from '../components/ui/OwlMascot';
import FullscreenBackground from '../components/Layout/FullscreenBackground';

const PaymentSuccess: React.FC = () => {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sessionData, setSessionData] = useState<{
    customer_email: string;
    status: string;
  } | null>(null);

  const verifySession = useCallback(async () => {
    try {
      const data = await paymentService.getSessionStatus(sessionId!);
      setSessionData({
        customer_email: data.customer_email || '',
        status: data.payment_status || '',
      });

      if (data.payment_status !== 'paid') {
        setError('Pagamento ainda não foi confirmado. Aguarde alguns instantes.');
      }
    } catch {
      setError('Não foi possível confirmar o pagamento agora. Tente novamente em instantes.');
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId) {
      setError('ID da sessão não encontrado.');
      setLoading(false);
      return;
    }

    void verifySession();
  }, [sessionId, verifySession]);

  if (loading) {
    return (
      // Tela de loading não precisa de partículas, só do gradiente.
      <FullscreenBackground
        className="bg-gradient-to-br from-green-500 to-green-700"
        contentClassName="flex items-center justify-center"
        enableParticles={false}
      >
        <div className="text-center">
          <Loader2 className="h-12 w-12 text-white animate-spin mx-auto mb-4" />
          <p className="text-white text-lg">Confirmando pagamento...</p>
        </div>
      </FullscreenBackground>
    );
  }

  if (error) {
    return (
      // Aqui também deixo sem partículas pra evitar custo à toa.
      <FullscreenBackground
        className="bg-gradient-to-br from-yellow-500 to-yellow-700 px-4"
        contentClassName="flex items-center justify-center"
        enableParticles={false}
      >
        <div className="max-w-md w-full">
          <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
            <div className="flex justify-center mb-6">
              <div className="bg-yellow-100 p-4 rounded-full">
                <AlertCircle className="h-12 w-12 text-yellow-600" />
              </div>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Processando</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <div className="space-y-3">
              <button
                onClick={() => window.location.reload()}
                className="block w-full btn-primary text-center"
              >
                Verificar novamente
              </button>
              <Link to="/login" className="block w-full btn-secondary text-center">
                Ir para Login
              </Link>
            </div>
          </div>
        </div>
      </FullscreenBackground>
    );
  }

  return (
    // Tela final também sem partículas pra manter leve no mobile.
    <FullscreenBackground
      className="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 px-4"
      contentClassName="flex items-center justify-center"
      enableParticles={false}
    >
      <div className="max-w-md w-full">
        {/* Logo */}
        <div className="text-center mb-6">
          <div className="flex justify-center mb-2">
            <div className="h-24 w-24 sm:h-28 sm:w-28">
              <OwlMascot className="h-24 w-24 sm:h-28 sm:w-28" />
            </div>
          </div>
          <div className="flex items-center justify-center gap-2">
            <h1 className="text-2xl font-bold logo-animated">GigFlow</h1>
            <span className="text-[12px] px-1.5 py-0.5 bg-amber-500/20 text-amber-200 rounded-full border border-amber-300/40 font-medium">
              Beta
            </span>
          </div>
        </div>

        {/* Success Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
          <div className="flex justify-center mb-6">
            <div className="bg-green-100 p-4 rounded-full">
              <CheckCircle className="h-16 w-16 text-green-600" />
            </div>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Pagamento Confirmado!
          </h2>

          <p className="text-gray-600 mb-6">
            Bem-vindo à <strong>GigFlow<span className="text-[12px] px-1.5 py-0.5 bg-amber-500/20 text-amber-200 rounded-full border border-amber-300/40 font-medium ml-1">Beta</span></strong>!
            <br />
            Sua conta está ativa e pronta para uso.
          </p>

          {sessionData?.customer_email && (
            <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
              <p className="text-sm text-gray-600">
                <strong>Email:</strong> {sessionData.customer_email}
              </p>
            </div>
          )}

          <div className="space-y-3">
            <Link to="/login" className="block w-full btn-primary text-center">
              Fazer Login
            </Link>
          </div>

          <p className="text-gray-500 text-sm mt-6">
            Você receberá um email de confirmação em breve.
          </p>
        </div>
      </div>
    </FullscreenBackground>
  );
};

export default PaymentSuccess;
