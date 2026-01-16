// components/Registration/AccountStep.tsx
import React, { useState } from 'react';
import { Mail, User, Eye, EyeOff, Lock } from 'lucide-react';

interface AccountStepProps {
  formData: {
    email: string;
    username: string;
    password: string;
    confirmPassword: string;
  };
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  errors: Record<string, string>;
}

const getPasswordStrength = (password: string) => {
  let score = 0;
  if (password.length >= 6) score += 1;
  if (password.length >= 8) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[a-z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  const levels = [
    { label: 'Muito fraca', color: 'bg-red-400' },
    { label: 'Fraca', color: 'bg-orange-400' },
    { label: 'Média', color: 'bg-yellow-400' },
    { label: 'Boa', color: 'bg-emerald-500' },
    { label: 'Forte', color: 'bg-emerald-600' },
  ];

  const idx = Math.min(levels.length - 1, Math.max(0, score - 1));
  return { score, ...levels[idx] };
};

const AccountStep: React.FC<AccountStepProps> = ({ formData, onChange, errors }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const passwordStrength = getPasswordStrength(formData.password);

  return (
    <div>
      <p className="text-sm text-gray-600 mb-6">
        Crie suas credenciais de acesso. Use uma senha forte para proteger sua conta.
      </p>

      <div className="space-y-4">
        {/* Email */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Mail className="h-5 w-5 text-gray-400" />
            </div>
            <input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={onChange}
              className={`
                w-full pl-10 pr-4 py-2 border rounded-md focus:ring-2 focus:ring-sky-500 focus:border-transparent
                bg-white text-gray-900 dark:bg-slate-900 dark:text-slate-200
                ${errors.email ? 'border-red-500' : 'border-gray-300 dark:border-slate-700'}
              `}
              placeholder="seu@email.com"
              autoComplete="email"
            />
          </div>
          {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
        </div>

        {/* Username */}
        <div>
          <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
            Nome de usuário
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <User className="h-5 w-5 text-gray-400" />
            </div>
            <input
              id="username"
              name="username"
              type="text"
              value={formData.username}
              onChange={onChange}
              className={`
                w-full pl-10 pr-4 py-2 border rounded-md focus:ring-2 focus:ring-sky-500 focus:border-transparent
                bg-white text-gray-900 dark:bg-slate-900 dark:text-slate-200
                ${errors.username ? 'border-red-500' : 'border-gray-300 dark:border-slate-700'}
              `}
              placeholder="seu_usuario"
              autoComplete="username"
            />
          </div>
          {errors.username && <p className="mt-1 text-sm text-red-600">{errors.username}</p>}
          <p className="mt-1 text-xs text-gray-500">
            Apenas letras, números e underscore
          </p>
        </div>

        {/* Password */}
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
            Senha
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock className="h-5 w-5 text-gray-400" />
            </div>
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              value={formData.password}
              onChange={onChange}
              className={`
                w-full pl-10 pr-12 py-2 border rounded-md focus:ring-2 focus:ring-sky-500 focus:border-transparent
                bg-white text-gray-900 dark:bg-slate-900 dark:text-slate-200
                ${errors.password ? 'border-red-500' : 'border-gray-300 dark:border-slate-700'}
              `}
              placeholder="••••••••"
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
            >
              {showPassword ? (
                <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
              ) : (
                <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
              )}
            </button>
          </div>

          {/* Password Strength Indicator */}
          {formData.password && (
            <div className="mt-2">
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${passwordStrength.color}`}
                    style={{ width: `${(passwordStrength.score / 6) * 100}%` }}
                  />
                </div>
                <span className="text-xs font-medium text-gray-600">
                  {passwordStrength.label}
                </span>
              </div>
              <div className="mt-2 text-xs text-gray-500 space-y-1">
                <p className={formData.password.length >= 8 ? 'text-green-600' : ''}>
                  ✓ Mínimo 8 caracteres
                </p>
                <p className={/[A-Z]/.test(formData.password) && /[a-z]/.test(formData.password) ? 'text-green-600' : ''}>
                  ✓ Letras maiúsculas e minúsculas
                </p>
                <p className={/\d/.test(formData.password) ? 'text-green-600' : ''}>
                  ✓ Números
                </p>
                <p className={/[^A-Za-z0-9]/.test(formData.password) ? 'text-green-600' : ''}>
                  ✓ Caracteres especiais
                </p>
              </div>
            </div>
          )}

          {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password}</p>}
        </div>

        {/* Confirm Password */}
        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
            Confirmar senha
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock className="h-5 w-5 text-gray-400" />
            </div>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              value={formData.confirmPassword}
              onChange={onChange}
              className={`
                w-full pl-10 pr-12 py-2 border rounded-md focus:ring-2 focus:ring-sky-500 focus:border-transparent
                bg-white text-gray-900 dark:bg-slate-900 dark:text-slate-200
                ${errors.confirmPassword ? 'border-red-500' : 'border-gray-300 dark:border-slate-700'}
              `}
              placeholder="••••••••"
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
            >
              {showConfirmPassword ? (
                <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
              ) : (
                <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
              )}
            </button>
          </div>
          {errors.confirmPassword && (
            <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default AccountStep;
