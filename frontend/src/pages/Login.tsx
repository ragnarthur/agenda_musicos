// pages/Login.tsx
import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogIn, Eye, EyeOff } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { showToast } from '../utils/toast';
import OwlMascot from '../components/ui/OwlMascot';
import FullscreenBackground from '../components/Layout/FullscreenBackground';
import { getMobileInputProps } from '../utils/mobileInputs';
import { googleAuthService } from '../services/publicApi';
import { getHttpErrorDetail, getHttpErrorStatus } from '../utils/httpError';

const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const { login, setSession } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login({ username, password }, rememberMe);
      showToast.success('Login realizado com sucesso!');
      navigate('/dashboard');
    } catch (err: unknown) {
      if (getHttpErrorStatus(err) === 401) {
        setError('Usuário ou senha incorretos');
      } else {
        setError('Erro ao fazer login. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleCallback = useCallback(
    async (response: { credential: string }) => {
      if (isGoogleLoading) return; // Prevenir múltiplas chamadas

      setIsGoogleLoading(true);
      try {
        const result = await googleAuthService.authenticate(response.credential, 'musician');
        if (result.new_user) {
          showToast.error('Conta não encontrada. Solicite acesso primeiro.');
          navigate('/solicitar-acesso', {
            state: {
              googleRegisterData: {
                email: result.email,
                firstName: result.first_name,
                lastName: result.last_name,
                picture: result.picture,
              },
            },
          });
          return;
        }

        if (result.user_type === 'musician') {
          await setSession(rememberMe);
          showToast.success('Login realizado com sucesso!');
          navigate('/dashboard');
        } else {
          showToast.error('Esta conta não é de músico');
        }
      } catch (error: unknown) {
        console.error('Google OAuth error:', error);
        const message = getHttpErrorDetail(error);
        const status = getHttpErrorStatus(error);

        if (status === 401) {
          showToast.error(message || 'Token do Google inválido ou expirado');
        } else if (status === 400) {
          showToast.error(message || 'Dados inválidos do Google');
        } else {
          showToast.error(message || 'Erro ao autenticar com Google');
        }
      } finally {
        setIsGoogleLoading(false);
      }
    },
    [navigate, setSession, isGoogleLoading, rememberMe]
  );

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
          theme: 'filled_black',
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
      <div className="w-full max-w-xl sm:max-w-2xl">
        {/* Logo e Título */}
        <div className="text-center mb-6">
          <div className="flex justify-center mb-2">
            <div className="h-24 w-24 sm:h-28 sm:w-28">
              <OwlMascot className="h-24 w-24 sm:h-28 sm:w-28" />
            </div>
          </div>
          <div className="flex items-center justify-center gap-2 mb-3">
            <h1 className="text-4xl sm:text-5xl font-bold text-white logo-animated drop-shadow-xl leading-tight">
              GigFlow
            </h1>
            <span className="text-[12px] px-2 py-0.5 bg-gradient-to-r from-amber-500/10 via-amber-400/15 to-amber-500/10 text-amber-100/80 rounded-full border border-amber-400/20 font-light italic tracking-wider">
              Beta
            </span>
          </div>
          <motion.p
            className="relative text-primary-50 font-medium text-sm sm:text-base tracking-wide"
            initial={{ opacity: 0, y: 10, filter: 'blur(4px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ duration: 0.7, delay: 0.2 }}
          >
            Plataforma profissional de agenda, disponibilidade e oportunidades para músicos
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
        <div className="bg-white rounded-2xl shadow-2xl p-5 sm:p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Entrar</h2>

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
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">ou entre com usuário</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                Usuário
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="input-field"
                placeholder="Digite seu usuário"
                required
                autoFocus
                {...getMobileInputProps('username')}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Senha
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="input-field pr-12"
                  placeholder="Digite sua senha"
                  required
                  {...getMobileInputProps('current-password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(prev => !prev)}
                  className="absolute inset-y-0 right-0 flex items-center justify-center w-12 h-12 sm:w-10 sm:h-10 text-gray-500 hover:text-gray-700 touch-manipulation"
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {showPassword ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
                </button>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={e => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-xs text-gray-600">Permanecer conectado</span>
                </label>
                <Link
                  to="/esqueci-senha"
                  className="text-xs font-medium text-primary-600 hover:text-primary-700"
                >
                  Esqueceu sua senha?
                </Link>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Entrando...</span>
                </>
              ) : (
                <>
                  <LogIn className="h-5 w-5" />
                  <span>Entrar</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-4 text-center text-sm text-gray-600">
            Ainda não tem conta?{' '}
            <Link
              to="/solicitar-acesso"
              className="text-primary-600 hover:text-primary-700 font-medium"
            >
              Solicitar Acesso
            </Link>
          </div>

          <div className="mt-2 text-center text-sm text-gray-600">
            <Link to="/" className="text-primary-600 hover:text-primary-700 font-medium">
              Voltar para a página inicial
            </Link>
          </div>

          <div className="mt-6 text-center text-xs text-gray-500">
            Powered by <span className="font-semibold text-primary-600">DXM Tech</span>
          </div>
        </div>
      </div>
    </FullscreenBackground>
  );
};

export default Login;
