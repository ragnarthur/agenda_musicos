// pages/RegisterInvite.tsx
// Cadastro via convite (token) com opção Google ou senha
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, Lock, Mail, MapPin, Music2 } from 'lucide-react';
import FullscreenBackground from '../components/Layout/FullscreenBackground';
import OwlMascot from '../components/ui/OwlMascot';
import { showToast } from '../utils/toast';
import {
  musicianRequestService,
  googleAuthService,
  inviteRegisterService,
} from '../services/publicApi';
import { authService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const RegisterInvite: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { setSession } = useAuth();

  const queryParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const inviteToken = queryParams.get('token') || '';

  const [loading, setLoading] = useState(true);
  const [inviteData, setInviteData] = useState<null | {
    email: string;
    full_name: string;
    phone: string;
    instrument: string;
    instruments: string[];
    bio: string | null;
    city: string;
    state: string;
    instagram: string | null;
  }>(null);
  const [error, setError] = useState<string | null>(null);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  useEffect(() => {
    if (!inviteToken) {
      setError('Token de convite não encontrado.');
      setLoading(false);
      return;
    }

    const loadInvite = async () => {
      try {
        setLoading(true);
        const data = await musicianRequestService.validateInvite(inviteToken);
        setInviteData(data);
        setError(null);
      } catch (err: unknown) {
        const error = err as { response?: { data?: { detail?: string } } };
        setError(error.response?.data?.detail || 'Convite inválido.');
      } finally {
        setLoading(false);
      }
    };

    loadInvite();
  }, [inviteToken]);

  const handleGoogleCallback = useCallback(
    async (response: { credential: string }) => {
      if (isGoogleLoading) return; // Prevenir múltiplas chamadas

      setIsGoogleLoading(true);
      try {
        const result = await googleAuthService.registerMusician(response.credential, inviteToken);
        if (result.user_type === 'musician') {
          await setSession();
          showToast.success('Cadastro concluído com Google!');
          navigate('/dashboard');
        } else {
          showToast.error('Cadastro inválido para músico.');
        }
      } catch (error: any) {
        console.error('Google OAuth error:', error);
        const message = error?.response?.data?.detail;

        if (error?.response?.status === 401) {
          showToast.error(message || 'Token do Google inválido ou expirado');
        } else if (error?.response?.status === 400) {
          showToast.error(message || 'Dados inválidos do Google');
        } else {
          showToast.error(message || 'Erro ao concluir cadastro com Google');
        }
      } finally {
        setIsGoogleLoading(false);
      }
    },
    [inviteToken, navigate, setSession, isGoogleLoading]
  );

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
        const buttonDiv = document.getElementById('google-signin-invite');
        if (buttonDiv) {
          window.google.accounts.id.renderButton(buttonDiv, {
            theme: 'outline',
            size: 'large',
            text: 'signup_with',
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
      } catch (e) {
        // Script já removido
      }
    };
  }, [handleGoogleCallback]);

  const handlePasswordRegister = async (event: React.FormEvent) => {
    event.preventDefault();
    if (password.length < 8) {
      showToast.error('A senha deve ter pelo menos 8 caracteres.');
      return;
    }
    if (password !== confirmPassword) {
      showToast.error('As senhas não coincidem.');
      return;
    }

    try {
      setSubmitting(true);
      const response = await inviteRegisterService.register({
        invite_token: inviteToken,
        password,
      });

      await authService.login({ username: response.username, password });
      await setSession();
      showToast.success('Cadastro concluído com sucesso!');
      navigate('/dashboard');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      showToast.error(error.response?.data?.error || 'Erro ao concluir cadastro.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <FullscreenBackground>
        <div className="min-h-screen flex items-center justify-center p-6">
          <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
            <div className="mx-auto mb-4 h-12 w-12 rounded-full border-2 border-amber-400 border-t-transparent animate-spin" />
            <p className="text-gray-600">Validando convite...</p>
          </div>
        </div>
      </FullscreenBackground>
    );
  }

  if (error || !inviteData) {
    return (
      <FullscreenBackground>
        <div className="min-h-screen flex items-center justify-center p-6">
          <div className="bg-white rounded-2xl shadow-2xl p-8 text-center max-w-md">
            <h1 className="text-xl font-bold text-gray-900 mb-2">Convite inválido</h1>
            <p className="text-gray-600 mb-6">{error || 'Não foi possível validar seu convite.'}</p>
            <Link to="/solicitar-acesso" className="btn-primary w-full inline-block text-center">
              Solicitar acesso
            </Link>
          </div>
        </div>
      </FullscreenBackground>
    );
  }

  return (
    <FullscreenBackground
      className="px-4 py-10"
      contentClassName="flex items-center justify-center"
      enableBlueWaves
    >
      <div className="max-w-4xl w-full grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="h-14 w-14 rounded-full bg-amber-100 flex items-center justify-center">
              <CheckCircle className="h-7 w-7 text-amber-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Convite aprovado 🎉</h1>
              <p className="text-gray-600 text-sm">Finalize seu cadastro para começar.</p>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <Mail className="h-4 w-4 text-amber-500" />
              {inviteData.email}
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <Music2 className="h-4 w-4 text-amber-500" />
              {inviteData.full_name} • {inviteData.instrument}
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <MapPin className="h-4 w-4 text-amber-500" />
              {inviteData.city}, {inviteData.state}
            </div>
          </div>

          <div className="mt-6">
            <div className="relative mb-4">
              <div
                id="google-signin-invite"
                className={`flex justify-center items-center transition-opacity min-h-[44px] ${isGoogleLoading ? 'opacity-50 pointer-events-none' : ''}`}
              />
              {isGoogleLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600" />
                </div>
              )}
            </div>
            <div className="relative mb-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">ou crie uma senha</span>
              </div>
            </div>

            <form onSubmit={handlePasswordRegister} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
                <div className="relative">
                  <input
                    type="password"
                    value={password}
                    onChange={event => setPassword(event.target.value)}
                    className="w-full input-field pr-10"
                    placeholder="Crie sua senha"
                    required
                  />
                  <Lock className="h-4 w-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirmar senha
                </label>
                <div className="relative">
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={event => setConfirmPassword(event.target.value)}
                    className="w-full input-field pr-10"
                    placeholder="Repita a senha"
                    required
                  />
                  <Lock className="h-4 w-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" />
                </div>
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full btn-primary flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Concluindo...' : 'Concluir cadastro'}
              </button>
            </form>
          </div>
        </div>

        <motion.div
          className="bg-white/10 border border-white/10 rounded-2xl p-8 text-white flex flex-col justify-between"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div>
            <div className="flex items-center gap-3 mb-4">
              <OwlMascot className="h-12 w-12" />
              <div>
                <p className="font-semibold text-lg">GigFlow</p>
                <p className="text-xs text-amber-200/80">Cadastro aprovado</p>
              </div>
            </div>
            <p className="text-sm text-slate-200">
              Seu acesso foi liberado. Ao concluir, você já pode receber convites, organizar sua
              agenda e aparecer para empresas da sua região.
            </p>
          </div>
          <Link to="/" className="mt-6 text-sm text-amber-200 hover:text-amber-100">
            Voltar para a página inicial
          </Link>
        </motion.div>
      </div>
    </FullscreenBackground>
  );
};

export default RegisterInvite;
