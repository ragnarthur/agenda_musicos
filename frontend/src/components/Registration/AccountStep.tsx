// components/Registration/AccountStep.tsx
import React, { useState, useEffect } from 'react';
import { Mail, User, Eye, EyeOff, Lock, Check, X, Loader2, AlertCircle } from 'lucide-react';
import { registrationService } from '../../services/api';
import { getMobileInputProps } from '../../utils/mobileInputs';

type EmailStatus = 'idle' | 'checking' | 'available' | 'taken' | 'pending';

interface AccountStepProps {
  formData: {
    email: string;
    username: string;
    password: string;
    confirmPassword: string;
  };
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  errors: Record<string, string>;
  onEmailValidation?: (isValid: boolean, isDuplicate: boolean) => void;
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

const AccountStep: React.FC<AccountStepProps> = ({ formData, onChange, errors, onEmailValidation }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [emailStatus, setEmailStatus] = useState<EmailStatus>('idle');
  const handleInput = (e: React.FormEvent<HTMLInputElement>) =>
    onChange({ target: { name: e.currentTarget.name, value: e.currentTarget.value } } as React.ChangeEvent<HTMLInputElement>);

  const passwordStrength = getPasswordStrength(formData.password);

  // Debounced email verification
  useEffect(() => {
    const email = formData.email.trim().toLowerCase();
    const isValidFormat = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

    if (!email || !isValidFormat) {
      onEmailValidation?.(isValidFormat, false);
      const idleTimeout = setTimeout(() => setEmailStatus('idle'), 0);
      return () => clearTimeout(idleTimeout);
    }

    const timeoutId = setTimeout(async () => {
      setEmailStatus('checking');
      try {
        const response = await registrationService.checkEmail(email);
        if (response.available) {
          setEmailStatus('available');
          onEmailValidation?.(true, false);
        } else if (response.reason === 'pending_verification') {
          setEmailStatus('pending');
          onEmailValidation?.(false, true);
        } else {
          setEmailStatus('taken');
          onEmailValidation?.(false, true);
        }
      } catch {
        // On error, don't block user - backend will validate on submit
        setEmailStatus('idle');
        onEmailValidation?.(true, false);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [formData.email, onEmailValidation]);

  const renderEmailFeedback = () => {
    if (errors.email) {
      return <p className="mt-1 text-sm text-red-600">{errors.email}</p>;
    }

    if (!formData.email) return null;

    const isValidFormat = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email);

    if (!isValidFormat) {
      return (
        <p className="mt-1 text-xs text-amber-600">
          Digite um email válido (ex: nome@email.com)
        </p>
      );
    }

    switch (emailStatus) {
      case 'checking':
        return (
          <p className="mt-1 text-xs text-blue-600 flex items-center gap-1">
            <Loader2 className="h-3 w-3 animate-spin" /> Verificando disponibilidade...
          </p>
        );
      case 'available':
        return (
          <p className="mt-1 text-xs text-green-600 flex items-center gap-1">
            <Check className="h-3 w-3" /> Email disponível
          </p>
        );
      case 'taken':
        return (
          <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
            <X className="h-3 w-3" /> Este email já está cadastrado
          </p>
        );
      case 'pending':
        return (
          <p className="mt-1 text-xs text-amber-600 flex items-center gap-1">
            <AlertCircle className="h-3 w-3" /> Email com cadastro pendente de verificação
          </p>
        );
      default:
        return (
          <p className="mt-1 text-xs text-green-600 flex items-center gap-1">
            <Check className="h-3 w-3" /> Email válido
          </p>
        );
    }
  };

  const getEmailInputBorderClass = () => {
    if (errors.email) return 'border-red-500';
    if (emailStatus === 'taken' || emailStatus === 'pending') return 'border-red-500';
    if (emailStatus === 'available') return 'border-green-500';
    return 'border-gray-300 dark:border-slate-700';
  };

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
              onInput={handleInput}
              className={`
                w-full pl-10 pr-4 py-2 border rounded-md focus:ring-2 focus:ring-sky-500 focus:border-transparent
                bg-white text-gray-900 dark:bg-slate-900 dark:text-slate-200
                ${getEmailInputBorderClass()}
              `}
              placeholder="seu@email.com"
              {...getMobileInputProps('email')}
            />
          </div>
          {renderEmailFeedback()}
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
              onInput={handleInput}
              className={`
                w-full pl-10 pr-4 py-2 border rounded-md focus:ring-2 focus:ring-sky-500 focus:border-transparent
                bg-white text-gray-900 dark:bg-slate-900 dark:text-slate-200
                ${errors.username ? 'border-red-500' : 'border-gray-300 dark:border-slate-700'}
              `}
              placeholder="seu_usuario"
              {...getMobileInputProps('username')}
            />
          </div>
          {errors.username && <p className="mt-1 text-sm text-red-600">{errors.username}</p>}
          {!errors.username && formData.username && (
            formData.username.length >= 3 && /^[a-zA-Z0-9_]+$/.test(formData.username) ? (
              <p className="mt-1 text-xs text-green-600 flex items-center gap-1">
                <Check className="h-3 w-3" /> Nome de usuário válido
              </p>
            ) : (
              <p className="mt-1 text-xs text-amber-600">
                {formData.username.length < 3
                  ? 'Mínimo 3 caracteres'
                  : 'Use este nome de usuário para login. Apenas letras, números e underscore (_)'}
              </p>
            )
          )}
          {!formData.username && (
            <p className="mt-1 text-xs text-gray-500">
              Use este nome de usuário para fazer login. Apenas letras, números e underscore.
            </p>
          )}
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
              onInput={handleInput}
              className={`
                w-full pl-10 pr-12 py-2 border rounded-md focus:ring-2 focus:ring-sky-500 focus:border-transparent
                bg-white text-gray-900 dark:bg-slate-900 dark:text-slate-200
                ${errors.password ? 'border-red-500' : 'border-gray-300 dark:border-slate-700'}
              `}
              placeholder="••••••"
              {...getMobileInputProps('password')}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 flex items-center justify-center w-12 h-12 sm:w-10 sm:h-10 touch-manipulation"
              aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
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
              onInput={handleInput}
              className={`
                w-full pl-10 pr-12 py-2 border rounded-md focus:ring-2 focus:ring-sky-500 focus:border-transparent
                bg-white text-gray-900 dark:bg-slate-900 dark:text-slate-200
                ${errors.confirmPassword ? 'border-red-500' : 'border-gray-300 dark:border-slate-700'}
              `}
              placeholder="•••••"
              {...getMobileInputProps('password')}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute inset-y-0 right-0 flex items-center justify-center w-12 h-12 sm:w-10 sm:h-10 touch-manipulation"
              aria-label={showConfirmPassword ? 'Ocultar senha' : 'Mostrar senha'}
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
          {!errors.confirmPassword && formData.confirmPassword && formData.password && (
            formData.password === formData.confirmPassword ? (
              <p className="mt-1 text-xs text-green-600 flex items-center gap-1">
                <Check className="h-3 w-3" /> Senhas conferem
              </p>
            ) : (
              <p className="mt-1 text-xs text-amber-600">
                As senhas não conferem
              </p>
            )
          )}
        </div>
      </div>
    </div>
  );
};

export default AccountStep;
