// pages/MusicianRequest.tsx
// Formulário público para músicos solicitarem acesso à plataforma
import { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Music, Send, CheckCircle, Search, Check } from 'lucide-react';
import { musicianRequestService, googleAuthService, type MusicianRequestCreate } from '../services/publicApi';
import { BRAZILIAN_STATES } from '../config/cities';
import FullscreenBackground from '../components/Layout/FullscreenBackground';
import { showToast } from '../utils/toast';
import { useInstruments } from '../hooks/useInstruments';
import { formatPhone } from '../utils/formatting';
import { getMobileInputProps } from '../utils/mobileInputs';

// Animações CSS
const styles = `
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(-10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  
  @keyframes slideDown {
    from { opacity: 0; max-height: 0; }
    to { opacity: 1; max-height: 400px; }
  }
  
  @keyframes scaleIn {
    from { transform: scale(0.95); opacity: 0; }
    to { transform: scale(1); opacity: 1; }
  }
  
  .animate-fade-in {
    animation: fadeIn 0.3s ease-out;
  }
  
  .animate-slide-down {
    animation: slideDown 0.3s ease-out;
  }
  
  .animate-scale-in {
    animation: scaleIn 0.2s ease-out;
  }
  
  .instrument-card {
    transition: all 0.2s ease-in-out;
  }
  
  .instrument-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }
  
  .instrument-card.selected {
    transform: scale(1.02);
    box-shadow: 0 4px 12px rgba(79, 70, 229, 0.15);
  }
  
  .toggle-switch {
    transition: all 0.3s ease-in-out;
  }
  
  .toggle-knob {
    transition: transform 0.3s ease-in-out;
  }
  
  .checkbox-check {
    transition: all 0.15s ease-in-out;
  }
`;

export default function MusicianRequest() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isMultiInstrumentalist, setIsMultiInstrumentalist] = useState(false);
  const [selectedInstruments, setSelectedInstruments] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customInstrumentName, setCustomInstrumentName] = useState('');
  const { instruments, loading: loadingInstruments, createCustomInstrument } = useInstruments();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<MusicianRequestCreate>();

  const watchedPhone = watch('phone');

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value);
    setValue('phone', formatted);
  };

  // Filtrar instrumentos com base na busca
  const filteredInstruments = useMemo(() => {
    if (!searchQuery.trim()) return instruments;
    const query = searchQuery.toLowerCase();
    return instruments.filter(inst =>
      inst.display_name.toLowerCase().includes(query) ||
      inst.name.toLowerCase().includes(query)
    );
  }, [instruments, searchQuery]);

  // Toggle de seleção
  const toggleInstrument = (name: string) => {
    setSelectedInstruments((prev) => {
      if (!prev.includes(name) && prev.length >= 10) {
        toast.error('Máximo de 10 instrumentos permitidos');
        return prev;
      }
      return prev.includes(name)
        ? prev.filter((i) => i !== name)
        : [...prev, name];
    });
  };

  // Adicionar instrumento customizado
  const handleAddCustomInstrument = async () => {
    const trimmed = customInstrumentName.trim();
    if (!trimmed) return;

    if (trimmed.length < 3) {
      toast.error('Nome do instrumento deve ter ao menos 3 caracteres');
      return;
    }

    if (instruments.some(i => i.name.toLowerCase() === trimmed.toLowerCase())) {
      toast.error('Este instrumento já existe na lista');
      return;
    }

    const newInstrument = await createCustomInstrument(trimmed);
    if (newInstrument) {
      toggleInstrument(newInstrument.name);
      setCustomInstrumentName('');
      setShowCustomInput(false);
      setSearchQuery('');
      toast.success(`Instrumento "${newInstrument.display_name}" adicionado!`);
    } else {
      toast.error('Erro ao adicionar instrumento. Tente novamente.');
    }
  };

  // Sync com react-hook-form
  useEffect(() => {
    setValue('instruments', selectedInstruments, { shouldValidate: true });
  }, [selectedInstruments, setValue]);

  // Carregar Google Sign-In
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

        // Renderizar botão oficial do Google
        const buttonDiv = document.getElementById('google-signin-request');
        if (buttonDiv) {
          window.google.accounts.id.renderButton(buttonDiv, {
            theme: 'outline',
            size: 'large',
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
  }, []);

  useEffect(() => {
    const googleData = sessionStorage.getItem('_googleRegisterData');
    if (!googleData) return;

    try {
      const data = JSON.parse(googleData);
      const fullName = [data.firstName, data.lastName].filter(Boolean).join(' ').trim();

      if (fullName) {
        setValue('full_name', fullName, { shouldDirty: true });
      }
      if (data.email) {
        setValue('email', data.email, { shouldDirty: true });
      }

      showToast.success('Dados do Google carregados. Complete o formulário.');
    } catch (error) {
      console.error('Erro ao processar dados do Google:', error);
    } finally {
      sessionStorage.removeItem('_googleRegisterData');
    }
  }, [setValue]);

  // Handler para Google Auth
  const handleGoogleCallback = async (response: { credential: string }) => {
    if (isGoogleLoading) return;

    setIsGoogleLoading(true);
    try {
      const result = await googleAuthService.authenticate(response.credential, 'musician');
      if (result.new_user) {
        // Salvar dados do Google em sessionStorage
        sessionStorage.setItem('_googleRegisterData', JSON.stringify({
          email: result.email,
          firstName: result.first_name,
          lastName: result.last_name,
          picture: result.picture,
        }));
        if (result.picture) {
          sessionStorage.setItem('_googleAvatarUrl', result.picture);
        }

        showToast.success('Dados do Google carregados. Complete o formulário.');
        window.location.reload();
        return;
      }

      showToast.error('Usuário já cadastrado. Faça login.');
      navigate('/login');
    } catch (error: any) {
      console.error('Google OAuth error:', error);
      const message = error?.response?.data?.detail;

      if (error?.response?.status === 401) {
        showToast.error(message || 'Token do Google inválido ou expirado');
      } else if (error?.response?.status === 400) {
        showToast.error(message || 'Dados inválidos do Google');
      } else {
        showToast.error(message || 'Erro ao autenticar com Google');
      }
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const onSubmit = async (data: MusicianRequestCreate) => {
    // Validação adicional de instrumentos
    if (isMultiInstrumentalist && selectedInstruments.length === 0) {
      toast.error('Selecione pelo menos um instrumento');
      return;
    }

    if (selectedInstruments.length > 10) {
      toast.error('Máximo de 10 instrumentos permitidos');
      return;
    }

    setIsSubmitting(true);
    try {
      await musicianRequestService.create({
        ...data,
        instruments: selectedInstruments,
      });
      setSubmitted(true);
      toast.success('Solicitação enviada com sucesso!');
    } catch (error: unknown) {
      const err = error as { response?: { data?: Record<string, string | string[]> } };
      if (err.response?.data) {
        const messages = Object.values(err.response.data).flat();
        messages.forEach((msg) => toast.error(String(msg)));
      } else {
        toast.error('Erro ao enviar solicitação. Tente novamente.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <FullscreenBackground>
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 text-center">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Solicitação Enviada!
            </h1>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Sua solicitação foi recebida e será analisada pela nossa equipe.
              Você receberá um email quando sua solicitação for aprovada.
            </p>
            <button
              onClick={() => navigate('/')}
              className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors"
            >
              Voltar ao Início
            </button>
          </div>
        </div>
      </FullscreenBackground>
    );
  }

  return (
    <>
      <style>{styles}</style>
      <FullscreenBackground>
      <div className="min-h-screen flex items-center justify-center p-4 py-12">
        <div className="max-w-lg w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900 rounded-full flex items-center justify-center mx-auto mb-4">
              <Music className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Solicitar Acesso
            </h1>
            <p className="text-gray-600 dark:text-gray-300">
              Preencha o formulário para solicitar seu acesso como músico
            </p>
          </div>

          {/* Google Sign-In - Botão oficial */}
          <div id="google-signin-request" className="mb-6 flex justify-center items-center min-h-[44px]" />

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">ou preencha o formulário</span>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Nome Completo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Nome Completo *
              </label>
              <input
                type="text"
                inputMode="text"
                {...register('full_name', { required: 'Nome é obrigatório' })}
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white transition-all duration-200 focus:shadow-lg"
                placeholder="Seu nome completo"
              />
              {errors.full_name && (
                <p className="mt-1 text-sm text-red-600">{errors.full_name.message}</p>
              )}
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Email *
              </label>
              <input
                type="email"
                inputMode="email"
                {...register('email', {
                  required: 'Email é obrigatório',
                  pattern: {
                    value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                    message: 'Email inválido',
                  },
                })}
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white transition-all duration-200 focus:shadow-lg"
                placeholder="seu@email.com"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
              )}
            </div>

            {/* Telefone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Telefone/WhatsApp *
              </label>
              <input
                type="tel"
                inputMode="tel"
                value={watchedPhone || ''}
                onChange={handlePhoneChange}
                maxLength={15}
                {...getMobileInputProps('tel')}
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white transition-all duration-200 focus:shadow-lg"
                placeholder="(00) 00000-0000"
              />
              {errors.phone && (
                <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>
              )}
            </div>

            {/* Instrumento Principal */}
            <div className="animate-fade-in">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Instrumento Principal *
              </label>
              <input
                type="text"
                inputMode="text"
                {...register('instrument', { required: 'Instrumento é obrigatório' })}
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white transition-all duration-200 focus:shadow-lg"
                placeholder="Ex: Guitarra, Vocal, Bateria..."
              />
              {errors.instrument && (
                <p className="mt-1 text-sm text-red-600">{errors.instrument.message}</p>
              )}
            </div>

            {/* Multi-instrumentista */}
            <div className="flex items-start sm:items-center space-x-2 sm:space-x-3 py-2">
              <input
                type="checkbox"
                id="multi-instrumentalist"
                checked={isMultiInstrumentalist}
                onChange={(e) => setIsMultiInstrumentalist(e.target.checked)}
                className="w-6 h-6 sm:w-5 sm:h-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 touch-manipulation mt-0.5 sm:mt-0 flex-shrink-0"
              />
              <label htmlFor="multi-instrumentalist" className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
                Sou multi-instrumentista (toco mais de um instrumento)
              </label>
            </div>

            {/* Seleção de instrumentos com Pills */}
            {isMultiInstrumentalist && (
              <div className="space-y-3">
                <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
                  Selecione seus instrumentos <span className="text-red-500">*</span>
                </label>

                {/* Campo de busca */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar instrumento..."
                    className="w-full pl-9 pr-4 py-2 min-h-[44px] border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white text-sm"
                  />
                </div>

                {loadingInstruments ? (
                  <div className="text-center py-4">
                    <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600" />
                    <p className="mt-2 text-xs text-gray-500">Carregando...</p>
                  </div>
                ) : (
                  <>
                    {/* Pills de instrumentos */}
                    <div className="flex flex-wrap gap-2">
                      {filteredInstruments.map((inst) => {
                        const isSelected = selectedInstruments.includes(inst.name);
                        return (
                          <button
                            key={inst.id}
                            type="button"
                            onClick={() => toggleInstrument(inst.name)}
                            className={`
                              px-4 py-2.5 min-h-[44px] rounded-full text-sm font-medium
                              border-2 transition-all duration-200 touch-manipulation
                              ${isSelected
                                ? 'bg-indigo-600 border-indigo-600 text-white shadow-md'
                                : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-indigo-300'
                              }
                            `}
                          >
                            {inst.display_name}
                            {inst.type === 'community' && ' ✨'}
                          </button>
                        );
                      })}

                      {/* Pill "Outro" */}
                      <button
                        type="button"
                        onClick={() => setShowCustomInput(!showCustomInput)}
                        className="px-4 py-2.5 min-h-[44px] rounded-full border-2 border-dashed border-gray-400 dark:border-gray-500 text-gray-600 dark:text-gray-400 hover:border-indigo-400 hover:text-indigo-600 transition-all text-sm font-medium touch-manipulation"
                      >
                        + Outro
                      </button>
                    </div>

                    {/* Input customizado */}
                    {showCustomInput && (
                      <div className="flex gap-2 animate-fadeIn">
                        <input
                          type="text"
                          value={customInstrumentName}
                          onChange={(e) => setCustomInstrumentName(e.target.value)}
                          placeholder="Nome do instrumento"
                          className="flex-1 px-3 sm:px-4 py-3 min-h-[44px] border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white text-sm"
                          onKeyPress={(e) => e.key === 'Enter' && handleAddCustomInstrument()}
                        />
                        <button
                          type="button"
                          onClick={handleAddCustomInstrument}
                          disabled={!customInstrumentName.trim()}
                          className="px-4 py-3 min-h-[44px] bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg transition-all text-sm font-medium touch-manipulation"
                        >
                          Adicionar
                        </button>
                      </div>
                    )}

                    {/* Contador de selecionados */}
                    {selectedInstruments.length > 0 && (
                      <p className="text-xs sm:text-sm text-green-600 dark:text-green-400 flex items-center gap-1">
                        <Check className="h-3 w-3 sm:h-4 sm:w-4" />
                        {selectedInstruments.length} instrumento(s) selecionado(s)
                        {selectedInstruments.length >= 10 && ' (máximo atingido)'}
                      </p>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Cidade e Estado */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Cidade *
                </label>
                <input
                  type="text"
                  inputMode="text"
                  {...register('city', { required: 'Cidade é obrigatória' })}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Sua cidade"
                />
                {errors.city && (
                  <p className="mt-1 text-sm text-red-600">{errors.city.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Estado *
                </label>
                <select
                  {...register('state', { required: 'Estado é obrigatório' })}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                  inputMode="text"
                >
                  <option value="">Selecione</option>
                  {BRAZILIAN_STATES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.value}
                    </option>
                  ))}
                </select>
                {errors.state && (
                  <p className="mt-1 text-sm text-red-600">{errors.state.message}</p>
                )}
              </div>
            </div>

            {/* Instagram */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Instagram
              </label>
              <input
                type="text"
                inputMode="text"
                {...register('instagram')}
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                placeholder="@seu.usuario"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Opcional - ajuda na validação do seu perfil
              </p>
            </div>

            {/* Bio */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Mini Bio
              </label>
              <textarea
                {...register('bio')}
                inputMode="text"
                rows={3}
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white resize-none transition-all duration-200 focus:shadow-lg"
                placeholder="Conte um pouco sobre você e sua experiência musical..."
              />
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
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  Enviar Solicitação
                </>
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
            Já tem uma conta?{' '}
            <Link to="/login" className="text-indigo-600 hover:text-indigo-700 font-medium">
              Faça login
            </Link>
          </p>
        </div>
      </div>
    </FullscreenBackground>
    </>
  );
}
