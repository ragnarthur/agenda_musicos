// pages/Register.tsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Music, UserPlus, Eye, EyeOff, Mail, User, Phone, FileText, CheckCircle } from 'lucide-react';
import { registrationService, type RegisterData } from '../services/api';
import { showToast } from '../utils/toast';

const INSTRUMENTS = [
  { value: 'vocal', label: 'Vocal' },
  { value: 'guitar', label: 'Guitarra/Violão' },
  { value: 'bass', label: 'Baixo' },
  { value: 'drums', label: 'Bateria' },
  { value: 'keyboard', label: 'Teclado' },
  { value: 'percussion', label: 'Percussão/Outros' },
];

const SELECT_INSTRUMENT_OPTIONS = [
  { value: '', label: 'Selecione um instrumento principal' },
  ...INSTRUMENTS,
  { value: 'other', label: 'Outro (digite)' },
];

const Register: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [success, setSuccess] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [resending, setResending] = useState(false);

  const [formData, setFormData] = useState<RegisterData & { confirmPassword: string; instrumentOther: string; instruments: string[]; isMultiInstrumentist: boolean }>({
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
    first_name: '',
    last_name: '',
    phone: '',
    instrument: '',
    instruments: [],
    instrumentOther: '',
    isMultiInstrumentist: false,
    bio: '',
  });

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 2) return digits;
    const area = digits.slice(0, 2);
    const mid = digits.slice(2, 7);
    const end = digits.slice(7);
    return end ? `(${area}) ${mid}-${end}` : `(${area}) ${digits.slice(2)}`;
  };

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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'phone') {
      setFormData(prev => ({ ...prev, phone: formatPhone(value) }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
    // Limpa erro do campo quando usuário digita
    if (errors[name] || name === 'instrument' || name === 'instrumentOther') {
      setErrors(prev => ({ ...prev, [name]: '', instrument: '' }));
    }
  };

  const toggleInstrument = (value: string) => {
    setFormData((prev) => {
      const exists = prev.instruments.includes(value);
      const instruments = exists
        ? prev.instruments.filter((inst) => inst !== value)
        : [...prev.instruments, value];
      return { ...prev, instruments };
    });
    if (errors.instrument) {
      setErrors((prev) => ({ ...prev, instrument: '' }));
    }
  };

  const toggleMultiInstrumentist = (value: boolean) => {
    setFormData((prev) => ({
      ...prev,
      isMultiInstrumentist: value,
      // se desligar o modo multi, limpa seleção múltipla
      instruments: value ? prev.instruments : [],
    }));
    if (errors.instrument) {
      setErrors((prev) => ({ ...prev, instrument: '' }));
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.email) {
      newErrors.email = 'Email é obrigatório';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email inválido';
    }

    if (!formData.username) {
      newErrors.username = 'Nome de usuário é obrigatório';
    } else if (formData.username.length < 3) {
      newErrors.username = 'Mínimo de 3 caracteres';
    } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
      newErrors.username = 'Apenas letras, números e underscore';
    }

    if (!formData.password) {
      newErrors.password = 'Senha é obrigatória';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Mínimo de 6 caracteres';
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Senhas não conferem';
    }

    if (!formData.first_name) {
      newErrors.first_name = 'Nome é obrigatório';
    }

    const extraInstrument = formData.instrumentOther.trim();

    if (formData.isMultiInstrumentist) {
      const selectedInstruments = [
        ...formData.instruments,
        ...(extraInstrument ? [extraInstrument] : []),
      ].map((inst) => inst.trim()).filter(Boolean);

      if (!selectedInstruments.length) {
        newErrors.instrument = 'Selecione ou informe pelo menos um instrumento';
      } else if (selectedInstruments.some((inst) => inst.length > 50)) {
        newErrors.instrument = 'Instrumento deve ter no máximo 50 caracteres';
      } else if (extraInstrument && extraInstrument.length < 3) {
        newErrors.instrument = 'Use pelo menos 3 caracteres para o instrumento adicional';
      }
    } else {
      const primary =
        formData.instrument === 'other' ? extraInstrument : formData.instrument.trim();

      if (!primary) {
        newErrors.instrument = 'Instrumento é obrigatório';
      } else if (primary.length > 50) {
        newErrors.instrument = 'Instrumento deve ter no máximo 50 caracteres';
      } else if (formData.instrument === 'other' && primary.length < 3) {
        newErrors.instrument = 'Use pelo menos 3 caracteres para o instrumento';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    setLoading(true);
    setErrors({});

    try {
      const { confirmPassword, instrumentOther, instruments, isMultiInstrumentist, ...data } = formData;
      const customInstrument = instrumentOther.trim();

      let allInstruments: string[] = [];
      if (isMultiInstrumentist) {
        allInstruments = [
          ...instruments,
          ...(customInstrument ? [customInstrument] : []),
        ].map((inst) => inst.trim()).filter(Boolean);
      } else {
        const primary =
          data.instrument === 'other' ? customInstrument : data.instrument.trim();
        if (primary) {
          allInstruments = [primary];
        }
      }

      const primaryInstrument = allInstruments[0] || '';

      const payload = {
        ...data,
        instrument: primaryInstrument,
        instruments: allInstruments,
      };
      const response = await registrationService.register(payload);
      setRegisteredEmail(response.email);
      setSuccess(true);
      showToast.success('Cadastro iniciado! Verifique seu email.');
    } catch (err: unknown) {
      const error = err as { response?: { data?: Record<string, string | string[]> } };
      if (error.response?.data) {
        const apiErrors: Record<string, string> = {};
        for (const [key, value] of Object.entries(error.response.data)) {
          apiErrors[key] = Array.isArray(value) ? value[0] : String(value);
        }
        setErrors(apiErrors);
      } else {
        showToast.error('Erro ao fazer cadastro. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Tela de sucesso
  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center px-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
            <div className="flex justify-center mb-6">
              <div className="bg-green-100 p-4 rounded-full">
                <CheckCircle className="h-12 w-12 text-green-600" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Verifique seu email!</h2>
            <p className="text-gray-600 mb-6">
              Enviamos um link de verificação para:
              <br />
              <strong className="text-gray-900">{registeredEmail}</strong>
            </p>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4 text-left">
              <p className="text-sm text-gray-800 font-medium">Como receber o código:</p>
              <ul className="list-disc list-inside text-sm text-gray-600 mt-2 space-y-1">
                <li>O email é enviado por <strong>catsinthegarden01@gmail.com</strong>.</li>
                <li>Procure pelo código/link na caixa de entrada e no spam.</li>
                <li>Clique no link para confirmar e seguir para o pagamento.</li>
              </ul>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-blue-800">
                Clique no link do email para confirmar sua conta e continuar para o pagamento.
              </p>
            </div>
            <button
              type="button"
              onClick={async () => {
                setResending(true);
                try {
                  await registrationService.resendVerification(registeredEmail);
                  showToast.success('Email reenviado! Verifique sua caixa de entrada.');
                } catch {
                  showToast.error('Não foi possível reenviar agora. Tente novamente.');
                } finally {
                  setResending(false);
                }
              }}
              disabled={resending}
              className="w-full btn-secondary mb-3 disabled:opacity-50"
            >
              {resending ? 'Reenviando...' : 'Reenviar email de verificação'}
            </button>
            <div className="space-y-3">
              <Link
                to="/login"
                className="block w-full btn-primary text-center"
              >
                Ir para Login
              </Link>
              <button
                onClick={() => {
                  setSuccess(false);
                  setFormData({
                    email: '',
                    username: '',
                    password: '',
                    confirmPassword: '',
                    first_name: '',
                    last_name: '',
                    phone: '',
                    instrument: '',
                    instruments: [],
                    instrumentOther: '',
                    isMultiInstrumentist: false,
                    bio: '',
                  });
                }}
                className="block w-full btn-secondary text-center"
              >
                Fazer novo cadastro
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 flex items-center justify-center px-4 py-8">
      <div className="max-w-3xl w-full">
        {/* Logo e Título */}
        <div className="text-center mb-6">
          <div className="flex justify-center mb-4">
            <div className="p-4 rounded-full shadow-lg logo-glow bg-gradient-to-br from-primary-500 via-indigo-500 to-emerald-400">
              <Music className="h-10 w-10 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Criar Conta</h1>
          <p className="text-primary-100">Junte-se à comunidade de músicos</p>
        </div>

        {/* Card de Registro */}
        <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Nome e Sobrenome */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="first_name" className="block text-sm font-medium text-gray-700 mb-1">
                  Nome{errors.first_name && <span className="text-red-500 ml-1">*</span>}
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                  <input
                    id="first_name"
                    name="first_name"
                    type="text"
                    value={formData.first_name}
                    onChange={handleChange}
                    className={`input-field pl-10 ${errors.first_name ? 'border-red-500' : ''}`}
                    placeholder="Seu nome"
                  />
                </div>
                {errors.first_name && <p className="text-red-500 text-xs mt-1">{errors.first_name}</p>}
              </div>
              <div>
                <label htmlFor="last_name" className="block text-sm font-medium text-gray-700 mb-1">
                  Sobrenome
                </label>
                <input
                  id="last_name"
                  name="last_name"
                  type="text"
                  value={formData.last_name}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="Seu sobrenome"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email{errors.email && <span className="text-red-500 ml-1">*</span>}
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={`input-field pl-10 ${errors.email ? 'border-red-500' : ''}`}
                  placeholder="seu@email.com"
                />
              </div>
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
            </div>

            {/* Username */}
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                Nome de usuário <span className="text-xs text-gray-500">(usado para login)</span>
                {errors.username && <span className="text-red-500 ml-1">*</span>}
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-gray-400">@</span>
                <input
                  id="username"
                  name="username"
                  type="text"
                  value={formData.username}
                  onChange={handleChange}
                  className={`input-field pl-8 ${errors.username ? 'border-red-500' : ''}`}
                  placeholder="usuario123"
                />
              </div>
              {errors.username && <p className="text-red-500 text-xs mt-1">{errors.username}</p>}
              {!errors.username && formData.username && (
                <p className="text-xs text-gray-500 mt-1">Seu login será @{formData.username}</p>
              )}
            </div>

            {/* Senhas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  Senha{errors.password && <span className="text-red-500 ml-1">*</span>}
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={handleChange}
                    className={`input-field pr-10 ${errors.password ? 'border-red-500' : ''}`}
                    placeholder="Min. 6 caracteres"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(prev => !prev)}
                    className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
                  </button>
                </div>
                {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
                {!errors.password && formData.password && (
                  <div className="mt-2">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="flex-1 h-2 rounded-full bg-gray-200 overflow-hidden">
                        <div
                          className={`${getPasswordStrength(formData.password).color} h-2 transition-all`}
                          style={{ width: `${(getPasswordStrength(formData.password).score / 6) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-600">{getPasswordStrength(formData.password).label}</span>
                    </div>
                    <p className="text-[11px] text-gray-500">
                      Use letras maiúsculas/minúsculas, números e símbolos para fortalecer sua senha.
                    </p>
                  </div>
                )}
              </div>
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                  Confirmar senha{errors.confirmPassword && <span className="text-red-500 ml-1">*</span>}
                </label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className={`input-field pr-10 ${errors.confirmPassword ? 'border-red-500' : ''}`}
                    placeholder="Repita a senha"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(prev => !prev)}
                    className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                  >
                    {showConfirmPassword ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
                  </button>
                </div>
                {errors.confirmPassword && <p className="text-red-500 text-xs mt-1">{errors.confirmPassword}</p>}
              </div>
            </div>

            {/* Telefone e Instrumentos */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                  Telefone
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={handleChange}
                    className="input-field pl-10"
                    placeholder="(11) 99999-9999"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Você é multi-instrumentista?
                </label>
                <div className="inline-flex rounded-xl border border-gray-200 bg-white overflow-hidden">
                  <button
                    type="button"
                    className={`px-4 py-2 text-sm font-semibold transition-colors ${!formData.isMultiInstrumentist ? 'bg-primary-600 text-white' : 'text-gray-700 hover:bg-gray-50'}`}
                    onClick={() => toggleMultiInstrumentist(false)}
                  >
                    Não
                  </button>
                  <button
                    type="button"
                    className={`px-4 py-2 text-sm font-semibold transition-colors ${formData.isMultiInstrumentist ? 'bg-primary-600 text-white' : 'text-gray-700 hover:bg-gray-50'}`}
                    onClick={() => toggleMultiInstrumentist(true)}
                  >
                    Sim
                  </button>
                </div>
              </div>
            </div>

            {/* Instrumentos */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {!formData.isMultiInstrumentist ? (
                <div>
                  <label htmlFor="instrument" className="block text-sm font-medium text-gray-700 mb-1">
                    Instrumento principal{errors.instrument && <span className="text-red-500 ml-1">*</span>}
                  </label>
                  <div className="relative">
                    <select
                      id="instrument"
                      name="instrument"
                      value={formData.instrument}
                      onChange={handleChange}
                      className={`input-field ${errors.instrument ? 'border-red-500' : ''}`}
                    >
                      {SELECT_INSTRUMENT_OPTIONS.map((inst) => (
                        <option key={inst.value} value={inst.value}>
                          {inst.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  {formData.instrument === 'other' && (
                    <div className="mt-3">
                      <label htmlFor="instrumentOther" className="block text-sm font-medium text-gray-700 mb-1">
                        Qual instrumento?
                      </label>
                      <input
                        id="instrumentOther"
                        name="instrumentOther"
                        type="text"
                        value={formData.instrumentOther}
                        onChange={handleChange}
                        className={`input-field ${errors.instrument ? 'border-red-500' : ''}`}
                        placeholder="Ex.: Violino, Trompete, Flauta..."
                      />
                    </div>
                  )}
                  {errors.instrument && <p className="text-red-500 text-xs mt-1">{errors.instrument}</p>}
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Selecione os instrumentos{errors.instrument && <span className="text-red-500 ml-1">*</span>}
                    </label>
                    <p className="text-xs text-gray-500">Marque todos que você toca/canta.</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {INSTRUMENTS.map((inst) => {
                      const checked = formData.instruments.includes(inst.value);
                      return (
                        <label
                          key={inst.value}
                          className={`flex items-center gap-2 rounded-lg border px-3 py-2 cursor-pointer transition-colors ${
                            checked ? 'border-primary-300 bg-primary-50 text-primary-800' : 'border-gray-200 hover:border-primary-200'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleInstrument(inst.value)}
                            className="sr-only"
                          />
                          <span
                            className={`h-4 w-4 rounded border flex items-center justify-center text-[10px] ${
                              checked ? 'bg-primary-600 border-primary-600 text-white' : 'border-gray-300 text-transparent'
                            }`}
                          >
                            ✓
                          </span>
                          <span className="text-sm font-medium">{inst.label}</span>
                        </label>
                      );
                    })}
                  </div>
                  <div className="mt-2">
                    <label htmlFor="instrumentOther" className="block text-sm font-medium text-gray-700 mb-1">
                      Outro instrumento (opcional)
                    </label>
                    <input
                      id="instrumentOther"
                      name="instrumentOther"
                      type="text"
                      value={formData.instrumentOther}
                      onChange={handleChange}
                      className={`input-field ${errors.instrument ? 'border-red-500' : ''}`}
                      placeholder="Ex.: Violino, Trompete, Flauta..."
                    />
                  </div>
                  {errors.instrument && <p className="text-red-500 text-xs mt-1">{errors.instrument}</p>}
                </div>
              )}
            </div>

            {/* Bio */}
            <div>
              <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-1">
                Sobre você
              </label>
              <div className="relative">
                <FileText className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                <textarea
                  id="bio"
                  name="bio"
                  value={formData.bio}
                  onChange={handleChange}
                  rows={3}
                  className="input-field pl-10 resize-none"
                  placeholder="Conte um pouco sobre sua experiência musical..."
                />
              </div>
            </div>

            {/* Botão Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Cadastrando...</span>
                </>
              ) : (
                <>
                  <UserPlus className="h-5 w-5" />
                  <span>Criar Conta</span>
                </>
              )}
            </button>
          </form>

          {/* Link para Login */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Já tem uma conta?{' '}
              <Link to="/login" className="text-primary-600 hover:text-primary-700 font-medium">
                Fazer login
              </Link>
            </p>
          </div>

          <div className="mt-4 text-center text-xs text-gray-500">
            Powered by <span className="font-semibold text-primary-600">DXM Tech</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
