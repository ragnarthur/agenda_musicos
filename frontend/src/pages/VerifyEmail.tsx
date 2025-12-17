// pages/VerifyEmail.tsx
import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Music, CheckCircle, XCircle, Loader2, CreditCard, AlertCircle } from 'lucide-react';
import { registrationService } from '../services/api';
import { showToast } from '../utils/toast';

const VerifyEmail: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'already_verified'>('loading');
  const [message, setMessage] = useState('');
  const [paymentToken, setPaymentToken] = useState<string | null>(null);
  const [userData, setUserData] = useState<{ email: string; first_name: string } | null>(null);

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Token de verificação não fornecido.');
      return;
    }

    verifyEmail();
  }, [token]);

  const verifyEmail = async () => {
    if (!token) return;

    try {
      const response = await registrationService.verifyEmail(token);

      if (response.status === 'email_verified' || response.payment_token) {
        setStatus('success');
        setMessage(response.message);
        setPaymentToken(response.payment_token || null);
        setUserData({
          email: response.email || '',
          first_name: response.first_name || '',
        });
        showToast.success('Email verificado com sucesso!');
      } else if (response.status === 'completed') {
        setStatus('already_verified');
        setMessage('Este cadastro já foi concluído.');
      } else {
        setStatus('success');
        setMessage(response.message);
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      setStatus('error');
      setMessage(error.response?.data?.error || 'Erro ao verificar email.');
    }
  };

  const handleContinueToPayment = () => {
    if (paymentToken) {
      navigate(`/pagamento?token=${paymentToken}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        {/* Logo */}
        <div className="text-center mb-6">
          <div className="flex justify-center mb-4">
            <div className="bg-white p-4 rounded-full shadow-lg">
              <Music className="h-10 w-10 text-primary-600" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-white">Agenda Músicos</h1>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {status === 'loading' && (
            <div className="text-center">
              <div className="flex justify-center mb-6">
                <Loader2 className="h-16 w-16 text-primary-600 animate-spin" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Verificando email...</h2>
              <p className="text-gray-600">Aguarde um momento</p>
            </div>
          )}

          {status === 'success' && (
            <div className="text-center">
              <div className="flex justify-center mb-6">
                <div className="bg-green-100 p-4 rounded-full">
                  <CheckCircle className="h-12 w-12 text-green-600" />
                </div>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Email Verificado!</h2>
              {userData && (
                <p className="text-gray-600 mb-4">
                  Olá <strong>{userData.first_name}</strong>, seu email foi confirmado com sucesso.
                </p>
              )}

              {paymentToken && (
                <>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                    <div className="flex items-start gap-3">
                      <CreditCard className="h-5 w-5 text-blue-600 mt-0.5" />
                      <div className="text-left">
                        <p className="text-sm font-medium text-blue-800">Próximo passo: Pagamento</p>
                        <p className="text-sm text-blue-700">
                          Para ativar sua conta, complete o pagamento da assinatura.
                        </p>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleContinueToPayment}
                    className="w-full btn-primary flex items-center justify-center gap-2"
                  >
                    <CreditCard className="h-5 w-5" />
                    Continuar para Pagamento
                  </button>
                </>
              )}

              {!paymentToken && (
                <Link to="/login" className="block w-full btn-primary text-center">
                  Ir para Login
                </Link>
              )}
            </div>
          )}

          {status === 'already_verified' && (
            <div className="text-center">
              <div className="flex justify-center mb-6">
                <div className="bg-yellow-100 p-4 rounded-full">
                  <AlertCircle className="h-12 w-12 text-yellow-600" />
                </div>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Cadastro já concluído</h2>
              <p className="text-gray-600 mb-6">{message}</p>
              <Link to="/login" className="block w-full btn-primary text-center">
                Ir para Login
              </Link>
            </div>
          )}

          {status === 'error' && (
            <div className="text-center">
              <div className="flex justify-center mb-6">
                <div className="bg-red-100 p-4 rounded-full">
                  <XCircle className="h-12 w-12 text-red-600" />
                </div>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Erro na verificação</h2>
              <p className="text-gray-600 mb-6">{message}</p>
              <div className="space-y-3">
                <Link to="/cadastro" className="block w-full btn-primary text-center">
                  Fazer novo cadastro
                </Link>
                <Link to="/login" className="block w-full btn-secondary text-center">
                  Ir para Login
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;
