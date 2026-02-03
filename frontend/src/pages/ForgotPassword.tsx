// pages/ForgotPassword.tsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft } from 'lucide-react';
import { authService } from '../services/api';
import { getErrorMessage, showToast } from '../utils/toast';
import { getMobileInputProps } from '../utils/mobileInputs';

const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await authService.requestPasswordReset(email);
      setSent(true);
      showToast.success(response.message || 'Confira sua caixa de entrada para redefinir a senha.');
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Não foi possível enviar o email.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100svh] bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 flex items-center justify-center px-4 py-6">
      <div className="w-full max-w-lg">
        <div className="bg-white rounded-2xl shadow-2xl p-5 sm:p-8">
          <div className="mb-6">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar ao login
            </Link>
          </div>

          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-xl bg-primary-100 flex items-center justify-center">
              <Mail className="h-5 w-5 text-primary-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Recuperar senha</h1>
              <p className="text-sm text-gray-600">Enviaremos um link para redefinir sua senha.</p>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
              {error}
            </div>
          )}

          {sent ? (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-4 rounded-lg">
              Se este email estiver cadastrado, enviamos um link de redefinição.
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  className="input-field"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  {...getMobileInputProps('email')}
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full btn-primary disabled:opacity-60"
              >
                {loading ? 'Enviando...' : 'Enviar link de recuperação'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
