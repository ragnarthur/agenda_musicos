// pages/Payment.tsx
import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Music,
  CreditCard,
  CheckCircle,
  Lock,
  AlertCircle,
  Loader2,
  Shield,
  Star,
  Users,
  Calendar,
} from 'lucide-react';
import { registrationService, type RegistrationStatus } from '../services/api';
import { showToast } from '../utils/toast';

const Payment: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [status, setStatus] = useState<RegistrationStatus | null>(null);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [createdUser, setCreatedUser] = useState<{ username: string; email: string } | null>(null);

  const [formData, setFormData] = useState({
    card_number: '',
    card_holder: '',
    card_expiry: '',
    card_cvv: '',
  });

  useEffect(() => {
    if (!token) {
      setError('Token de pagamento não fornecido.');
      setLoading(false);
      return;
    }

    loadStatus();
  }, [token]);

  const loadStatus = async () => {
    if (!token) return;

    try {
      const data = await registrationService.getStatus(token);
      setStatus(data);

      if (data.status === 'completed') {
        setSuccess(true);
      } else if (data.status === 'pending_email') {
        setError('Email ainda não foi verificado. Verifique sua caixa de entrada.');
      } else if (data.is_expired) {
        setError('Este cadastro expirou. Faça o cadastro novamente.');
      }
    } catch (err) {
      setError('Cadastro não encontrado ou expirado.');
    } finally {
      setLoading(false);
    }
  };

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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token) return;

    // Validações básicas
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

    setProcessing(true);
    setError('');

    try {
      const response = await registrationService.processPayment({
        payment_token: token,
        card_number: cardNum,
        card_holder: formData.card_holder,
        card_expiry: formData.card_expiry,
        card_cvv: formData.card_cvv,
      });

      setSuccess(true);
      setCreatedUser({
        username: response.username,
        email: response.email,
      });
      showToast.success('Pagamento aprovado! Cadastro concluído.');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      setError(error.response?.data?.error || 'Erro ao processar pagamento.');
      showToast.error('Erro ao processar pagamento');
    } finally {
      setProcessing(false);
    }
  };

  // Loading
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center">
        <Loader2 className="h-12 w-12 text-white animate-spin" />
      </div>
    );
  }

  // Sucesso
  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-500 to-green-700 flex items-center justify-center px-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
            <div className="flex justify-center mb-6">
              <div className="bg-green-100 p-4 rounded-full">
                <CheckCircle className="h-16 w-16 text-green-600" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Cadastro Concluído!</h2>
            <p className="text-gray-600 mb-6">
              Bem-vindo à <strong>GigFlow</strong>!
              <br />
              Sua conta está ativa e pronta para uso.
            </p>

            {createdUser && (
              <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
                <p className="text-sm text-gray-600">
                  <strong>Usuário:</strong> {createdUser.username}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Email:</strong> {createdUser.email}
                </p>
              </div>
            )}

            <Link to="/login" className="block w-full btn-primary text-center">
              Fazer Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Erro
  if (error && !status) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center px-4">
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
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 flex items-center justify-center px-4 py-8">
      <div className="max-w-4xl w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Coluna da esquerda - Benefícios */}
          <div className="bg-white/10 backdrop-blur rounded-2xl p-6 text-white">
            <div className="flex items-center gap-3 mb-6">
              <Music className="h-8 w-8 text-white" />
              <h2 className="text-2xl font-bold logo-animated">GigFlow</h2>
            </div>

            <h3 className="text-xl font-semibold mb-4">Plano Profissional</h3>

            <div className="mb-6">
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold">R$ 29,90</span>
                <span className="text-white/70">/mês</span>
              </div>
              <p className="text-white/70 text-sm mt-1">Cancele quando quiser</p>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="bg-white/20 p-2 rounded-lg">
                  <Calendar className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-medium">Gestão de Agenda</h4>
                  <p className="text-white/70 text-sm">Organize seus shows e disponibilidades</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="bg-white/20 p-2 rounded-lg">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-medium">Rede de Músicos</h4>
                  <p className="text-white/70 text-sm">Conecte-se com outros profissionais</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="bg-white/20 p-2 rounded-lg">
                  <Star className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-medium">Vagas de Shows</h4>
                  <p className="text-white/70 text-sm">Encontre oportunidades de shows</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="bg-white/20 p-2 rounded-lg">
                  <Shield className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-medium">Proteção de Dados</h4>
                  <p className="text-white/70 text-sm">Suas informações seguras e privadas</p>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-white/20">
              <div className="flex items-center gap-2 text-white/70 text-sm">
                <Lock className="h-4 w-4" />
                <span>Pagamento seguro e criptografado</span>
              </div>
            </div>
          </div>

          {/* Coluna da direita - Formulário de Pagamento */}
          <div className="bg-white rounded-2xl shadow-2xl p-6">
            <div className="flex items-center gap-2 mb-6">
              <CreditCard className="h-6 w-6 text-primary-600" />
              <h3 className="text-xl font-semibold text-gray-900">Dados do Cartão</h3>
            </div>

            {status && (
              <div className="bg-gray-50 rounded-lg p-3 mb-6">
                <p className="text-sm text-gray-600">
                  Cadastrando: <strong>{status.first_name}</strong>
                </p>
                <p className="text-sm text-gray-500">{status.email}</p>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="card_number" className="block text-sm font-medium text-gray-700 mb-1">
                  Número do cartão
                </label>
                <input
                  id="card_number"
                  name="card_number"
                  type="text"
                  value={formData.card_number}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="0000 0000 0000 0000"
                  autoComplete="cc-number"
                />
              </div>

              <div>
                <label htmlFor="card_holder" className="block text-sm font-medium text-gray-700 mb-1">
                  Nome no cartão
                </label>
                <input
                  id="card_holder"
                  name="card_holder"
                  type="text"
                  value={formData.card_holder}
                  onChange={handleChange}
                  className="input-field uppercase"
                  placeholder="NOME COMO NO CARTÃO"
                  autoComplete="cc-name"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="card_expiry" className="block text-sm font-medium text-gray-700 mb-1">
                    Validade
                  </label>
                  <input
                    id="card_expiry"
                    name="card_expiry"
                    type="text"
                    value={formData.card_expiry}
                    onChange={handleChange}
                    className="input-field"
                    placeholder="MM/AA"
                    autoComplete="cc-exp"
                  />
                </div>
                <div>
                  <label htmlFor="card_cvv" className="block text-sm font-medium text-gray-700 mb-1">
                    CVV
                  </label>
                  <input
                    id="card_cvv"
                    name="card_cvv"
                    type="text"
                    value={formData.card_cvv}
                    onChange={handleChange}
                    className="input-field"
                    placeholder="123"
                    autoComplete="cc-csc"
                  />
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm">
                <p className="text-yellow-800">
                  <strong>Ambiente de teste:</strong> Use qualquer número de cartão válido.
                  Para simular recusa, use número começando com 0000.
                </p>
              </div>

              <button
                type="submit"
                disabled={processing}
                className="w-full btn-primary flex items-center justify-center gap-2 py-3"
              >
                {processing ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    <Lock className="h-5 w-5" />
                    Pagar R$ 29,90
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 flex items-center justify-center gap-4 text-gray-400 text-sm">
              <Lock className="h-4 w-4" />
              <span>SSL Seguro</span>
              <span>|</span>
              <span>PCI Compliant</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Payment;
