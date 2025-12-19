// pages/PlanSuccess.tsx
import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle, Loader2, AlertTriangle, CreditCard } from 'lucide-react';
import { paymentService } from '../services/api';
import { showToast } from '../utils/toast';

const PlanSuccess: React.FC = () => {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');

  const [status, setStatus] = useState<'loading' | 'success' | 'processing' | 'error'>('loading');
  const [message, setMessage] = useState('Estamos confirmando seu pagamento...');

  useEffect(() => {
    if (!sessionId) {
      setStatus('error');
      setMessage('Sessão de pagamento não encontrada.');
      return;
    }

    checkStatus(sessionId);
  }, [sessionId]);

  const checkStatus = async (id: string) => {
    setStatus('loading');
    try {
      const result = await paymentService.getSessionStatus(id);

      if (result.payment_status === 'paid') {
        setStatus('success');
        setMessage('Pagamento confirmado! Sua assinatura está ativa.');
        showToast.success('Pagamento confirmado!');
      } else if (result.payment_status === 'unpaid' || result.status === 'open') {
        setStatus('processing');
        setMessage('Pagamento ainda está sendo processado pelo provedor.');
      } else {
        setStatus('error');
        setMessage('Não foi possível confirmar o pagamento. Verifique sua fatura.');
      }
    } catch (err) {
      setStatus('error');
      setMessage('Erro ao consultar status do pagamento.');
    }
  };

  const renderContent = () => {
    if (status === 'loading' || status === 'processing') {
      return (
        <>
          <Loader2 className="h-16 w-16 text-primary-600 animate-spin mx-auto mb-6" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            {status === 'processing' ? 'Processando pagamento...' : 'Verificando pagamento...'}
          </h2>
          <p className="text-gray-600">{message}</p>
          <button
            onClick={() => sessionId && checkStatus(sessionId)}
            className="mt-6 btn-secondary"
          >
            Atualizar status
          </button>
        </>
      );
    }

    if (status === 'success') {
      return (
        <>
          <div className="flex justify-center mb-6">
            <div className="bg-green-100 p-4 rounded-full">
              <CheckCircle className="h-16 w-16 text-green-600" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Pagamento aprovado!</h2>
          <p className="text-gray-600 mb-6">{message}</p>
          <Link to="/login" className="btn-primary w-full text-center">
            Acessar plataforma
          </Link>
        </>
      );
    }

    return (
      <>
        <div className="flex justify-center mb-6">
          <div className="bg-amber-100 p-4 rounded-full">
            <AlertTriangle className="h-16 w-16 text-amber-600" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Pagamento não confirmado</h2>
        <p className="text-gray-600 mb-6">{message}</p>
        <div className="space-y-3">
          <Link to="/login" className="btn-primary w-full text-center">
            Voltar para login
          </Link>
          <Link to="/" className="btn-secondary w-full text-center">
            Ir para dashboard
          </Link>
        </div>
      </>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-6">
          <div className="flex justify-center mb-4">
            <div className="bg-white p-4 rounded-full shadow-lg">
              <CreditCard className="h-10 w-10 text-primary-600" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-white">GigFlow</h1>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default PlanSuccess;
