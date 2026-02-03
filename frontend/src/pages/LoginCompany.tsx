// pages/LoginCompany.tsx
// Login específico para empresas
import { useCallback, useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Building2, Eye, EyeOff, LogIn } from 'lucide-react';
import { googleAuthService, type Organization } from '../services/publicApi';
import FullscreenBackground from '../components/Layout/FullscreenBackground';
import { useCompanyAuth } from '../contexts/CompanyAuthContext';

interface LoginForm {
  email: string;
  password: string;
}

export default function LoginCompany() {
  const navigate = useNavigate();
  const { login, setSession } = useCompanyAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>();

  const onSubmit = async (data: LoginForm) => {
    setIsSubmitting(true);
    try {
      await login(data.email, data.password);
      toast.success('Login realizado com sucesso!');
      navigate('/empresa/dashboard');
    } catch (error: unknown) {
      const err = error as { response?: { data?: { detail?: string } } };
      toast.error(err.response?.data?.detail || 'Credenciais inválidas');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleCallback = useCallback(
    async (response: { credential: string }) => {
      if (isGoogleLoading) return; // Prevenir múltiplas chamadas

      setIsGoogleLoading(true);
      try {
        const result = await googleAuthService.authenticate(response.credential, 'company');
        if (result.new_user) {
          // Novo usuário - redirecionar para cadastro
          toast.error('Conta não encontrada. Faça o cadastro primeiro.');
          navigate('/cadastro-empresa');
        } else if (result.user_type === 'company' && result.organization) {
          setSession({
            organization: result.organization as Organization,
            access: result.access,
            refresh: result.refresh,
          });
          toast.success('Login realizado!');
          navigate('/empresa/dashboard');
        } else {
          toast.error('Esta conta não é de uma empresa');
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
          toast.error(message || 'Erro ao autenticar com Google');
        }
      } finally {
        setIsGoogleLoading(false);
      }
    },
    [navigate, setSession, isGoogleLoading]
  );

  // Renderiza botão do Google
  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

    if (!clientId) {
      console.warn('VITE_GOOGLE_CLIENT_ID não configurado. Login com Google desabilitado.');
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.onload = () => {
      if (window.google) {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: handleGoogleCallback,
        });
        const buttonDiv = document.getElementById('google-signin-button');
        if (buttonDiv) {
          window.google.accounts.id.renderButton(buttonDiv, {
            theme: 'outline',
            size: 'large',
            text: 'signin_with',
            width: '100%',
          });
        }
      }
    };
    script.onerror = () => {
      console.error('Erro ao carregar Google Sign-In');
    };
    document.body.appendChild(script);
    return () => {
      try {
        document.body.removeChild(script);
      } catch {
        // Script já removido
      }
    };
  }, [handleGoogleCallback]);

  return (
    <FullscreenBackground>
      <div className="min-h-[100svh] flex items-center justify-center p-4 py-6">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-5 sm:p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900 rounded-full flex items-center justify-center mx-auto mb-4">
              <Building2 className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Login Empresa</h1>
            <p className="text-gray-600 dark:text-gray-300">Acesse sua conta de empresa</p>
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

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300 dark:border-gray-600" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white dark:bg-gray-800 text-gray-500">
                ou entre com email
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Email
              </label>
              <input
                type="email"
                {...register('email', {
                  required: 'Email é obrigatório',
                  pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Email inválido' },
                })}
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                placeholder="empresa@email.com"
              />
              {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>}
            </div>

            {/* Senha */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Senha
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  {...register('password', { required: 'Senha é obrigatória' })}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white pr-10"
                  placeholder="Sua senha"
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

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Entrando...
                </>
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  Entrar
                </>
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
            Não tem uma conta?{' '}
            <Link
              to="/cadastro-empresa"
              className="text-indigo-600 hover:text-indigo-700 font-medium"
            >
              Cadastre sua empresa
            </Link>
          </p>

          <p className="mt-2 text-center text-sm text-gray-500 dark:text-gray-400">
            É músico?{' '}
            <Link to="/login" className="text-indigo-600 hover:text-indigo-700 font-medium">
              Login de músico
            </Link>
          </p>
        </div>
      </div>
    </FullscreenBackground>
  );
}
