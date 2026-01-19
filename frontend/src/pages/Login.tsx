// pages/Login.tsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogIn, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { showToast } from '../utils/toast';
import OwlMascot from '../components/ui/OwlMascot';
import FullscreenBackground from '../components/Layout/FullscreenBackground';

const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login({ username, password });
      showToast.success('Login realizado com sucesso!');
      navigate('/dashboard');
    } catch (err: unknown) {
      const error = err as { response?: { status?: number } };
      if (error.response?.status === 401) {
        setError('Usuário ou senha incorretos');
      } else {
        setError('Erro ao fazer login. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <FullscreenBackground
      className="px-4"
      contentClassName="flex items-center justify-center"
      enableBlueWaves
    >
      <div className="w-full max-w-xl">
        {/* Logo e Título */}
        <div className="text-center mb-6">
          <div className="flex justify-center mb-2">
            <div className="h-24 w-24 sm:h-28 sm:w-28">
              <OwlMascot className="h-24 w-24 sm:h-28 sm:w-28" />
            </div>
          </div>
          <div className="flex items-center justify-center gap-2 mb-3">
            <h1 className="text-5xl font-bold text-white logo-animated drop-shadow-xl leading-tight">GigFlow</h1>
            <span className="text-[12px] px-2 py-0.5 bg-gradient-to-r from-amber-500/10 via-amber-400/15 to-amber-500/10 text-amber-100/80 rounded-full border border-amber-400/20 font-light italic tracking-wider">
              Beta
            </span>
          </div>
          <motion.p
            className="relative text-primary-50 font-medium text-base tracking-wide"
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
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Entrar</h2>

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
                onChange={(e) => setUsername(e.target.value)}
                className="input-field"
                placeholder="Digite seu usuário"
                required
                autoFocus
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
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field pr-12"
                  placeholder="Digite sua senha"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute inset-y-0 right-3 flex items-center text-gray-500 hover:text-gray-700"
                  aria-label={showPassword ? 'Mostrar senha' : 'Ocultar senha'}
                >
                  {showPassword ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
                </button>
              </div>
              <div className="mt-2 text-right">
                <Link to="/esqueci-senha" className="text-xs font-medium text-primary-600 hover:text-primary-700">
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
            <Link to="/cadastro" className="text-primary-600 hover:text-primary-700 font-medium">
              Criar conta
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
