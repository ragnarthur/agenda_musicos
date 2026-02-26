// pages/LoginCompany.tsx
// Login específico para contratantes
import { useCallback, useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Eye, EyeOff, LogIn, Music, Briefcase, Star } from 'lucide-react';
import { motion } from 'framer-motion';
import { googleAuthService, type ContractorProfile } from '../services/publicApi';
import FullscreenBackground from '../components/Layout/FullscreenBackground';
import { useCompanyAuth } from '../contexts/CompanyAuthContext';
import OwlMascot from '../components/ui/OwlMascot';

interface LoginForm {
  email: string;
  password: string;
}

const CONTRACTOR_DEFAULT_ROUTE = '/contratante/dashboard';

const consumeReturnToRoute = (): string => {
  const returnTo = sessionStorage.getItem('returnTo');
  sessionStorage.removeItem('returnTo');

  if (!returnTo) return CONTRACTOR_DEFAULT_ROUTE;
  if (!returnTo.startsWith('/')) return CONTRACTOR_DEFAULT_ROUTE;
  if (returnTo.startsWith('/admin')) return CONTRACTOR_DEFAULT_ROUTE;
  return returnTo;
};

export default function LoginCompany() {
  const navigate = useNavigate();
  const { login, setSession } = useCompanyAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>();

  const onSubmit = async (data: LoginForm) => {
    setIsSubmitting(true);
    try {
      await login(data.email, data.password, rememberMe);
      toast.success('Login realizado com sucesso!');
      navigate(consumeReturnToRoute(), { replace: true });
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
        const result = await googleAuthService.authenticate(response.credential, 'contractor');
        if (result.new_user) {
          // Novo usuário - redirecionar para cadastro
          toast.error('Conta não encontrada. Faça o cadastro primeiro.');
          navigate('/contratante/cadastro');
        } else if (result.user_type === 'contractor' && result.contractor) {
          setSession(
            {
              organization: result.contractor as ContractorProfile,
            },
            rememberMe
          );
          toast.success('Login realizado!');
          navigate(consumeReturnToRoute(), { replace: true });
        } else {
          toast.error('Esta conta não é de contratante');
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
    [navigate, setSession, isGoogleLoading, rememberMe]
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
        callback: handleGoogleCallback,
      });
      const buttonDiv = document.getElementById('google-signin-button');
      if (buttonDiv) {
        window.google.accounts.id.renderButton(buttonDiv, {
          theme: 'outline',
          size: 'large',
          text: 'signin_with',
          width: 400,
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

  return (
    <FullscreenBackground
      className="px-4"
      contentClassName="flex items-center justify-center py-6 sm:py-10"
      enableBlueWaves
    >
      <div className="w-full max-w-xl sm:max-w-2xl lg:max-w-5xl">
        <div className="lg:grid lg:grid-cols-[1fr_1.1fr] lg:gap-10 lg:items-center">
          {/* ── Desktop: left branding panel ── */}
          <div className="hidden lg:flex lg:flex-col lg:py-6">
            <div className="flex justify-start mb-5">
              <OwlMascot className="h-24 w-24" />
            </div>
            <div className="flex items-center gap-3 mb-4">
              <h1 className="logo-animated text-5xl font-bold leading-tight text-white drop-shadow-xl">
                GigFlow
              </h1>
              <span className="rounded-full border border-amber-400/20 bg-gradient-to-r from-amber-500/10 via-amber-400/15 to-amber-500/10 px-2 py-0.5 font-light italic tracking-wider text-[12px] text-amber-100/80">
                Beta
              </span>
            </div>
            <p className="mb-10 text-lg font-medium leading-relaxed text-primary-100">
              Plataforma profissional para contratar músicos
            </p>
            <div className="space-y-5">
              {(
                [
                  {
                    icon: Music,
                    title: 'Músicos Qualificados',
                    desc: 'Acesse um catálogo de profissionais verificados',
                  },
                  {
                    icon: Briefcase,
                    title: 'Gestão de Eventos',
                    desc: 'Organize contratações e agenda em um só lugar',
                  },
                  {
                    icon: Star,
                    title: 'Avaliação de Talentos',
                    desc: 'Encontre o músico certo para cada ocasião',
                  },
                ] as const
              ).map(({ icon: Icon, title, desc }) => (
                <div key={title} className="flex items-start gap-3">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-white/20 bg-white/15 backdrop-blur-sm">
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold leading-tight text-white">{title}</p>
                    <p className="mt-0.5 text-sm leading-relaxed text-primary-200">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Right: form column ── */}
          <div>
            {/* Mobile-only branding */}
            <div className="mb-6 text-center lg:hidden">
              <div className="mb-2 flex justify-center">
                <div className="h-24 w-24 sm:h-28 sm:w-28">
                  <OwlMascot className="h-24 w-24 sm:h-28 sm:w-28" />
                </div>
              </div>
              <div className="mb-3 flex items-center justify-center gap-2">
                <h1 className="logo-animated text-4xl font-bold leading-tight text-white drop-shadow-xl sm:text-5xl">
                  GigFlow
                </h1>
                <span className="rounded-full border border-amber-400/20 bg-gradient-to-r from-amber-500/10 via-amber-400/15 to-amber-500/10 px-2 py-0.5 font-light italic tracking-wider text-[12px] text-amber-100/80">
                  Beta
                </span>
              </div>
              <motion.p
                className="relative text-sm font-medium tracking-wide text-primary-50 sm:text-base"
                initial={{ opacity: 0, y: 10, filter: 'blur(4px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                transition={{ duration: 0.7, delay: 0.2 }}
              >
                Plataforma profissional para contratar músicos
                <motion.span
                  aria-hidden
                  className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 bg-gradient-to-r from-transparent via-white/35 to-transparent"
                  initial={{ x: 0, opacity: 0 }}
                  animate={{ x: '220%', opacity: 1 }}
                  transition={{ duration: 1.6, delay: 0.6, ease: 'easeOut' }}
                />
              </motion.p>
            </div>

            {/* Card de Login */}
            <div className="rounded-2xl bg-white p-5 shadow-2xl sm:p-8 lg:p-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
                Entrar como Contratante
              </h2>

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
                    placeholder="seu@email.com"
                  />
                  {errors.email && (
                    <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                  )}
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
                  <div className="mt-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={e => setRememberMe(e.target.checked)}
                        className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-xs text-gray-600 dark:text-gray-400">
                        Permanecer conectado
                      </span>
                    </label>
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
                  to="/contratante/cadastro"
                  className="text-indigo-600 hover:text-indigo-700 font-medium"
                >
                  Cadastre-se como contratante
                </Link>
              </p>

              <p className="mt-2 text-center text-sm text-gray-500 dark:text-gray-400">
                É músico?{' '}
                <Link to="/login" className="text-indigo-600 hover:text-indigo-700 font-medium">
                  Login de músico
                </Link>
              </p>

              <p className="mt-2 text-center text-sm text-gray-500 dark:text-gray-400">
                <Link to="/" className="text-indigo-600 hover:text-indigo-700 font-medium">
                  Voltar para a página inicial
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </FullscreenBackground>
  );
}
