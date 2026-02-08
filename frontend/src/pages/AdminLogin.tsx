import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ADMIN_ROUTES } from '../routes/adminRoutes';
import { Shield, Mail, Lock, LogIn } from 'lucide-react';
import { useAdminAuth } from '../contexts/AdminAuthContext';
import { showToast } from '../utils/toast';

const AdminLogin: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { login } = useAdminAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await login(email, password, rememberMe);
      navigate(ADMIN_ROUTES.dashboard);
    } catch (error: unknown) {
      console.error('Admin login error:', error);
      const err = error as { response?: { data?: { detail?: string } } } | { message?: string };
      let errorMessage = 'Erro ao fazer login. Verifique suas credenciais.';

      if ('response' in err && err.response?.data?.detail) {
        errorMessage = err.response.data.detail;
      } else if ('message' in err && err.message) {
        errorMessage = err.message;
      }

      setError(errorMessage);
      showToast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100svh] bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800 flex items-center justify-center p-4 py-6">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-amber-500/10 rounded-full mb-4">
            <Shield className="h-8 w-8 text-amber-600 dark:text-amber-400" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
            GigFlow Admin
          </h1>
          <p className="text-slate-600 dark:text-slate-400">Acesso Administrativo</p>
        </div>

        {/* Login Form */}
        <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur rounded-2xl shadow-2xl p-5 sm:p-8 border border-slate-200/70 dark:border-white/10">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email ou Username */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Email ou Usuário
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500 dark:text-slate-400" />
                <input
                  type="text"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  className="w-full pl-11 pr-4 py-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-amber-500 dark:focus:ring-amber-400 focus:border-transparent"
                  placeholder="admin_1"
                />
              </div>
              {error && <p className="mt-1 text-sm text-red-400">{error}</p>}
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Senha
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500 dark:text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  className="w-full pl-11 pr-4 py-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-amber-500 dark:focus:ring-amber-400 focus:border-transparent"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {/* Remember Me */}
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={e => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-amber-500 dark:text-amber-400 focus:ring-amber-500 dark:focus:ring-amber-400 focus:ring-offset-white dark:focus:ring-offset-slate-900"
                />
                <span className="text-sm text-slate-700 dark:text-slate-300">
                  Permanecer conectado
                </span>
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-amber-400 hover:bg-amber-500 text-gray-900 font-semibold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="animate-spin h-5 w-5 border-2 border-gray-900 border-t-transparent rounded-full"></div>
                  Entrando...
                </>
              ) : (
                <>
                  <LogIn className="h-5 w-5" />
                  Entrar
                </>
              )}
            </button>
          </form>
        </div>

        {/* Back to home */}
        <div className="text-center mt-6">
          <button
            onClick={() => navigate('/')}
            className="text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white text-sm transition-colors"
          >
            ← Voltar para o início
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
