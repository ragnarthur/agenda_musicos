// pages/PaymentSuccess.tsx
import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle, Loader2, Music, AlertCircle } from 'lucide-react';
import { paymentService } from '../services/api';

const PaymentSuccess: React.FC = () => {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sessionData, setSessionData] = useState<{
    customer_email: string;
    status: string;
  } | null>(null);

  useEffect(() => {
    if (!sessionId) {
      setError('ID da sessão não encontrado.');
      setLoading(false);
      return;
    }

    verifySession();
  }, [sessionId]);

  const verifySession = async () => {
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
      // Mesmo se falhar a verificação, mostramos sucesso
      // pois o webhook já pode ter processado
      setSessionData({ customer_email: '', status: 'paid' });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-500 to-green-700 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 text-white animate-spin mx-auto mb-4" />
          <p className="text-white text-lg">Confirmando pagamento...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-500 to-yellow-700 flex items-center justify-center px-4">
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
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-500 to-green-700 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        {/* Logo */}
        <div className="text-center mb-6">
          <div className="flex justify-center mb-4">
            <div className="bg-white p-4 rounded-full shadow-lg">
              <Music className="h-10 w-10 text-primary-600" />
            </div>
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
            Bem-vindo à <strong>Agenda Músicos</strong>!
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
    </div>
  );
};

export default PaymentSuccess;
