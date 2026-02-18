// pages/RegisterCompany.tsx
// Cadastro de contratante (gratuito, sem aprovação)
import { useCallback, useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Building2, CheckCircle, Eye, EyeOff } from 'lucide-react';
import {
  contractorService,
  googleAuthService,
  type ContractorRegisterData,
  type ContractorProfile,
} from '../services/publicApi';
import { BRAZILIAN_STATES } from '../config/cities';
import FullscreenBackground from '../components/Layout/FullscreenBackground';
import { useCompanyAuth } from '../contexts/CompanyAuthContext';
import { formatPhone } from '../utils/formatting';
import { getMobileInputProps } from '../utils/mobileInputs';

export default function RegisterCompany() {
  const navigate = useNavigate();
  const { setSession } = useCompanyAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [googleUserInfo, setGoogleUserInfo] = useState<{
    email: string;
    first_name: string;
    last_name: string;
    picture?: string;
  } | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<ContractorRegisterData & { confirm_password: string }>();

  const watchedPhone = watch('phone');

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value);
    setValue('phone', formatted);
  };

  const onSubmit = async (data: ContractorRegisterData & { confirm_password: string }) => {
    if (data.password !== data.confirm_password) {
      toast.error('As senhas não coincidem');
      return;
    }

    setIsSubmitting(true);
    try {
      if (googleUserInfo) {
        // Registro via Google - usa email validado do Google
        await contractorService.register({
          ...data,
          email: googleUserInfo.email, // Email já validado pelo Google
        });
      } else {
        // Registro normal
        await contractorService.register(data);
      }
      setSuccess(true);
      toast.success('Contratante cadastrado com sucesso!');
    } catch (error: unknown) {
      const err = error as { response?: { data?: Record<string, string | string[]> } };
      if (err.response?.data) {
        const messages = Object.values(err.response.data).flat();
        messages.forEach(msg => toast.error(String(msg)));
      } else {
        toast.error('Erro ao cadastrar. Tente novamente.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleCallback = useCallback(
    async (response: { credential: string }) => {
      if (isGoogleLoading) return; // Prevenir múltiplas chamadas

      setIsGoogleLoading(true);
      try {
        const result = await googleAuthService.authenticate(response.credential, 'contractor');
        if (result.new_user) {
          // Novo usuário - salvar apenas os DADOS (não o credential que expira)
          setGoogleUserInfo({
            email: result.email || '',
            first_name: result.first_name || '',
            last_name: result.last_name || '',
            picture: result.picture,
          });

          toast.success('Conta Google conectada! Complete seus dados de contratante.');
        } else if (result.user_type === 'contractor' && result.contractor) {
          // Usuário já existe - fazer login
          setSession({
            organization: result.contractor as ContractorProfile,
          });
          toast.success('Login realizado!');
          navigate('/contratante/dashboard');
        } else {
          toast.error('Esta conta Google não é de contratante');
        }
      } catch (error: unknown) {
        console.error('Google OAuth error:', error);
        const message = (error as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail;
        const status = (error as { response?: { status?: number } })?.response?.status;

        if (status === 401) {
          toast.error(message || 'Token do Google inválido ou expirado');
        } else if (status === 400) {
          toast.error(message || 'Dados inválidos do Google');
        } else {
          toast.error(message || 'Erro ao conectar com Google. Tente novamente.');
        }
      } finally {
        setIsGoogleLoading(false);
      }
    },
    [navigate, setSession, isGoogleLoading]
  );

  // Renderiza botão do Google
  useEffect(() => {
    let isMounted = true;
    let timerId: number | null = null;
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

    if (!clientId) {
      console.warn('VITE_GOOGLE_CLIENT_ID não configurado. Login com Google desabilitado.');
      return;
    }

    const initializeGoogle = () => {
      if (!isMounted) return;
      if (!window.google) {
        timerId = window.setTimeout(initializeGoogle, 150);
        return;
      }

      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: (response: { credential: string }) => {
          if (!isMounted) return;
          handleGoogleCallback(response);
        },
      });
      const buttonDiv = document.getElementById('google-signin-button');
      if (buttonDiv) {
        window.google.accounts.id.renderButton(buttonDiv, {
          theme: 'outline',
          size: 'large',
          text: 'signup_with',
          width: '100%',
        });
      }
    };

    initializeGoogle();

    return () => {
      isMounted = false;
      if (timerId !== null) {
        window.clearTimeout(timerId);
      }
    };
  }, [handleGoogleCallback]);

  if (success) {
    return (
      <FullscreenBackground>
        <div className="min-h-[100svh] flex items-center justify-center p-4 py-6">
          <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-5 sm:p-8 text-center">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Cadastro Realizado!
            </h1>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Seu cadastro foi concluído. Faça login para solicitar orçamentos.
            </p>
            <button
              onClick={() => navigate('/contratante/login')}
              className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors"
            >
              Fazer Login
            </button>
            <Link
              to="/"
              className="mt-4 inline-flex w-full items-center justify-center text-sm font-medium text-indigo-600 hover:text-indigo-700"
            >
              Voltar para a página inicial
            </Link>
          </div>
        </div>
      </FullscreenBackground>
    );
  }

  return (
    <FullscreenBackground>
      <div className="min-h-[100svh] flex items-center justify-center p-4 py-8">
        <div className="max-w-lg w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-5 sm:p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900 rounded-full flex items-center justify-center mx-auto mb-4">
              <Building2 className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Cadastro de Contratante
            </h1>
            <p className="text-gray-600 dark:text-gray-300">Cadastre-se para contratar músicos</p>
          </div>

          {/* Google Sign In */}
          <div className="relative mb-6">
            <div
              id="google-signin-button"
              className={`flex justify-center items-center transition-opacity min-h-[44px] ${isGoogleLoading ? 'opacity-50 pointer-events-none' : ''}`}
            />
            {isGoogleLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600" />
              </div>
            )}
          </div>

          {googleUserInfo && (
            <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
              <p className="text-sm text-green-700 dark:text-green-400">
                Autenticado como: <strong>{googleUserInfo.email}</strong>
              </p>
            </div>
          )}

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300 dark:border-gray-600" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white dark:bg-gray-800 text-gray-500">
                ou preencha o formulário
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Nome */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Nome completo *
              </label>
              <input
                type="text"
                {...register('name', { required: 'Nome é obrigatório' })}
                defaultValue={
                  googleUserInfo ? `${googleUserInfo.first_name} ${googleUserInfo.last_name}` : ''
                }
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                placeholder="Seu nome completo"
              />
              {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>}
            </div>

            {/* Email */}
            {!googleUserInfo && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  {...register('email', {
                    required: 'Email é obrigatório',
                    pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Email inválido' },
                  })}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                  placeholder="seu@email.com"
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                )}
              </div>
            )}

            {/* Senha */}
            {!googleUserInfo && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Senha *
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      {...register('password', {
                        required: 'Senha é obrigatória',
                        minLength: { value: 8, message: 'Senha deve ter no mínimo 8 caracteres' },
                      })}
                      className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white pr-10"
                      placeholder="Mínimo 8 caracteres"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Confirmar Senha *
                  </label>
                  <input
                    type="password"
                    {...register('confirm_password', { required: 'Confirme a senha' })}
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                    placeholder="Repita a senha"
                  />
                </div>
              </>
            )}

            {/* Telefone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Telefone
              </label>
              <input
                type="tel"
                inputMode="tel"
                value={watchedPhone || ''}
                onChange={handlePhoneChange}
                maxLength={15}
                {...getMobileInputProps('tel')}
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                placeholder="(00) 00000-0000"
              />
            </div>

            {/* Cidade e Estado */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Cidade *
                </label>
                <input
                  type="text"
                  {...register('city', { required: 'Cidade é obrigatória' })}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Sua cidade"
                />
                {errors.city && <p className="mt-1 text-sm text-red-600">{errors.city.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Estado *
                </label>
                <select
                  {...register('state', { required: 'Estado é obrigatório' })}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">UF</option>
                  {BRAZILIAN_STATES.map(s => (
                    <option key={s.value} value={s.value}>
                      {s.value}
                    </option>
                  ))}
                </select>
                {errors.state && (
                  <p className="mt-1 text-sm text-red-600">{errors.state.message}</p>
                )}
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Cadastrando...
                </>
              ) : (
                'Cadastrar Contratante'
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
            Já tem uma conta?{' '}
            <Link
              to="/contratante/login"
              className="text-indigo-600 hover:text-indigo-700 font-medium"
            >
              Faça login
            </Link>
          </p>

          <p className="mt-2 text-center text-sm text-gray-500 dark:text-gray-400">
            É músico?{' '}
            <Link
              to="/solicitar-acesso"
              className="text-indigo-600 hover:text-indigo-700 font-medium"
            >
              Solicite acesso
            </Link>
          </p>

          <p className="mt-2 text-center text-sm text-gray-500 dark:text-gray-400">
            <Link to="/" className="text-indigo-600 hover:text-indigo-700 font-medium">
              Voltar para a página inicial
            </Link>
          </p>
        </div>
      </div>
    </FullscreenBackground>
  );
}
