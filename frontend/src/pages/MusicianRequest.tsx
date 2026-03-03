// pages/MusicianRequest.tsx
// Formulário público para músicos solicitarem acesso à plataforma
import { Fragment, useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import {
  Music,
  Send,
  CheckCircle,
  Search,
  Check,
  Disc3,
  Calendar,
  Star,
  Users,
  Plus,
  Trash2,
  Mic2,
  Guitar,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react';
import {
  musicianRequestService,
  googleAuthService,
  type MusicianRequestCreate,
} from '../services/publicApi';
import { BRAZILIAN_STATES } from '../config/cities';
import { MUSICAL_GENRES } from '../config/genres';
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

  @keyframes stepForward {
    from { opacity: 0; transform: translateX(28px); }
    to   { opacity: 1; transform: translateX(0); }
  }

  @keyframes stepBack {
    from { opacity: 0; transform: translateX(-28px); }
    to   { opacity: 1; transform: translateX(0); }
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

  .animate-step-forward {
    animation: stepForward 0.28s ease-out;
  }

  .animate-step-back {
    animation: stepBack 0.28s ease-out;
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

  .artist-card {
    transition: all 0.2s ease-in-out;
  }

  .artist-card:hover {
    transform: translateY(-2px);
  }

  .genre-error-shake {
    animation: shake 0.4s ease-in-out;
  }

  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    20%       { transform: translateX(-6px); }
    40%       { transform: translateX(6px); }
    60%       { transform: translateX(-4px); }
    80%       { transform: translateX(4px); }
  }
`;

type ArtistType = 'solo' | 'dupla' | 'banda';

type FormationMember = {
  name: string;
  instrument: string;
  role: string;
  email: string;
};

const createEmptyFormationMember = (): FormationMember => ({
  name: '',
  instrument: '',
  role: '',
  email: '',
});

const WIZARD_STEPS = [
  { id: 1 as const, label: 'Identidade' },
  { id: 2 as const, label: 'Sua Música' },
  { id: 3 as const, label: 'Detalhes' },
];

const ARTIST_TYPE_OPTIONS = [
  {
    value: 'solo' as const,
    label: 'Solo',
    desc: 'Artista individual',
    Icon: Mic2,
  },
  {
    value: 'dupla' as const,
    label: 'Dupla',
    desc: '2 integrantes',
    Icon: Users,
  },
  {
    value: 'banda' as const,
    label: 'Banda',
    desc: '3 ou mais integ.',
    Icon: Guitar,
  },
];

export default function MusicianRequest() {
  const navigate = useNavigate();
  const location = useLocation();

  // Wizard state
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [stepDirection, setStepDirection] = useState<'forward' | 'back'>('forward');
  const [genreError, setGenreError] = useState(false);

  // Existing state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isMultiInstrumentalist, setIsMultiInstrumentalist] = useState(false);
  const [selectedInstruments, setSelectedInstruments] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customInstrumentName, setCustomInstrumentName] = useState('');
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [artistType, setArtistType] = useState<ArtistType>('solo');
  const [formationMembers, setFormationMembers] = useState<FormationMember[]>([]);
  const { instruments, loading: loadingInstruments, createCustomInstrument } = useInstruments();
  const googleCallbackRef = useRef<(response: { credential: string }) => void>(() => {});
  const appliedGooglePrefillRef = useRef(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    trigger,
  } = useForm<MusicianRequestCreate>({
    defaultValues: {
      artist_type: 'solo',
      formation_members: [],
    },
  });

  const watchedPhone = watch('phone');

  useEffect(() => {
    register('artist_type');
    register('formation_members');
    register('phone', { required: 'Telefone é obrigatório' });
  }, [register]);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value);
    setValue('phone', formatted, { shouldValidate: true });
  };

  const handleArtistTypeChange = (value: ArtistType) => {
    setArtistType(value);

    if (value === 'solo') {
      setFormationMembers([]);
      setValue('stage_name', '', { shouldValidate: true });
      return;
    }

    if (value === 'dupla') {
      setFormationMembers(prev => {
        const first = prev[0] || createEmptyFormationMember();
        return [first];
      });
      return;
    }

    setFormationMembers(prev => {
      const next = [...prev];
      while (next.length < 2) {
        next.push(createEmptyFormationMember());
      }
      return next;
    });
  };

  const updateFormationMember = (index: number, field: keyof FormationMember, value: string) => {
    setFormationMembers(prev =>
      prev.map((member, memberIndex) =>
        memberIndex === index ? { ...member, [field]: value } : member
      )
    );
  };

  const addFormationMember = () => {
    setFormationMembers(prev => [...prev, createEmptyFormationMember()]);
  };

  const removeFormationMember = (index: number) => {
    setFormationMembers(prev => prev.filter((_, memberIndex) => memberIndex !== index));
  };

  // Filtrar instrumentos com base na busca
  const filteredInstruments = useMemo(() => {
    if (!searchQuery.trim()) return instruments;
    const query = searchQuery.toLowerCase();
    return instruments.filter(
      inst =>
        inst.display_name.toLowerCase().includes(query) || inst.name.toLowerCase().includes(query)
    );
  }, [instruments, searchQuery]);

  // Toggle de seleção
  const toggleInstrument = (name: string) => {
    setSelectedInstruments(prev => {
      if (!prev.includes(name) && prev.length >= 10) {
        toast.error('Máximo de 10 instrumentos permitidos');
        return prev;
      }
      return prev.includes(name) ? prev.filter(i => i !== name) : [...prev, name];
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

  // Toggle de seleção de gênero
  const toggleGenre = (genre: string) => {
    setSelectedGenres(prev => {
      if (prev.includes(genre)) {
        return prev.filter(g => g !== genre);
      }
      if (prev.length >= 5) {
        toast.error('Máximo de 5 gêneros');
        return prev;
      }
      return [...prev, genre];
    });
  };

  // Limpa erro de gênero ao selecionar um
  useEffect(() => {
    if (selectedGenres.length > 0) setGenreError(false);
  }, [selectedGenres]);

  // Sync com react-hook-form
  useEffect(() => {
    setValue('instruments', selectedInstruments, { shouldValidate: true });
  }, [selectedInstruments, setValue]);

  useEffect(() => {
    setValue('musical_genres', selectedGenres, { shouldValidate: true });
  }, [selectedGenres, setValue]);

  useEffect(() => {
    setValue('artist_type', artistType, { shouldValidate: true });
  }, [artistType, setValue]);

  useEffect(() => {
    setValue('formation_members', formationMembers, { shouldValidate: true });
  }, [formationMembers, setValue]);

  // Carregar Google Sign-In
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
          googleCallbackRef.current(response);
        },
      });

      // Renderizar botão oficial do Google
      const buttonDiv = document.getElementById('google-signin-request');
      if (buttonDiv) {
        window.google.accounts.id.renderButton(buttonDiv, {
          theme: 'outline',
          size: 'large',
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
  }, []);

  useEffect(() => {
    if (appliedGooglePrefillRef.current) return;
    const stateData = (
      location.state as
        | {
            googleRegisterData?: {
              email?: string;
              firstName?: string;
              lastName?: string;
            };
          }
        | null
        | undefined
    )?.googleRegisterData;

    if (!stateData) return;

    const fullName = [stateData.firstName, stateData.lastName].filter(Boolean).join(' ').trim();

    if (fullName) {
      setValue('full_name', fullName, { shouldDirty: true });
    }
    if (stateData.email) {
      setValue('email', stateData.email, { shouldDirty: true });
    }

    appliedGooglePrefillRef.current = true;
    showToast.success('Dados do Google carregados. Complete o formulário.');
  }, [location.state, setValue]);

  // Handler para Google Auth
  const handleGoogleCallback = async (response: { credential: string }) => {
    if (isGoogleLoading) return;

    setIsGoogleLoading(true);
    try {
      const result = await googleAuthService.authenticate(response.credential, 'musician');
      if (result.new_user) {
        const fullName = [result.first_name, result.last_name].filter(Boolean).join(' ').trim();
        if (fullName) {
          setValue('full_name', fullName, { shouldDirty: true });
        }
        if (result.email) {
          setValue('email', result.email, { shouldDirty: true });
        }

        showToast.success('Dados do Google carregados. Complete o formulário.');
        return;
      }

      showToast.error('Usuário já cadastrado. Faça login.');
      navigate('/login');
    } catch (error: unknown) {
      console.error('Google OAuth error:', error);
      const message = (error as { response?: { data?: { detail?: string } } })?.response?.data
        ?.detail;
      const status = (error as { response?: { status?: number } })?.response?.status;

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
  };

  googleCallbackRef.current = handleGoogleCallback;

  // Wizard navigation
  const goToNextStep = async () => {
    if (currentStep === 1) {
      const valid = await trigger(['full_name', 'email', 'phone']);
      if (!valid) return;
      setStepDirection('forward');
      setCurrentStep(2);
    } else if (currentStep === 2) {
      const valid = await trigger(['instrument']);
      if (selectedGenres.length === 0) {
        setGenreError(true);
        if (valid) return; // only genre is missing
        return;
      }
      setGenreError(false);
      if (!valid) return;
      setStepDirection('forward');
      setCurrentStep(3);
    }
  };

  const goToPrevStep = () => {
    setStepDirection('back');
    setCurrentStep(prev => (prev - 1) as 1 | 2 | 3);
  };

  const onSubmit = async (data: MusicianRequestCreate) => {
    // Gênero obrigatório — defesa de última instância
    if (selectedGenres.length === 0) {
      toast.error('Selecione pelo menos 1 gênero musical');
      setCurrentStep(2);
      return;
    }

    const normalizedFormationMembers = formationMembers
      .map(member => ({
        name: member.name.trim(),
        instrument: member.instrument.trim(),
        role: member.role.trim(),
        email: member.email.trim().toLowerCase(),
      }))
      .filter(member => member.name || member.instrument || member.role || member.email);

    // Validação adicional de instrumentos
    if (isMultiInstrumentalist && selectedInstruments.length === 0) {
      toast.error('Selecione pelo menos um instrumento');
      return;
    }

    if (selectedInstruments.length > 10) {
      toast.error('Máximo de 10 instrumentos permitidos');
      return;
    }

    if (artistType !== 'solo' && !data.stage_name?.trim()) {
      toast.error('Informe o nome artístico da formação');
      return;
    }

    if (artistType === 'dupla' && normalizedFormationMembers.length !== 1) {
      toast.error('Dupla deve ter exatamente 1 integrante adicional');
      return;
    }

    if (artistType === 'banda' && normalizedFormationMembers.length < 2) {
      toast.error('Banda deve ter pelo menos 2 integrantes adicionais');
      return;
    }

    if (normalizedFormationMembers.some(member => !member.name || !member.instrument)) {
      toast.error('Preencha nome e instrumento de todos os integrantes');
      return;
    }

    setIsSubmitting(true);
    try {
      await musicianRequestService.create({
        ...data,
        artist_type: artistType,
        stage_name: artistType === 'solo' ? '' : data.stage_name?.trim(),
        formation_members: artistType === 'solo' ? [] : normalizedFormationMembers,
        instruments: selectedInstruments,
        musical_genres: selectedGenres,
      });
      setSubmitted(true);
      toast.success('Solicitação enviada com sucesso!');
    } catch (error: unknown) {
      const err = error as { response?: { data?: Record<string, string | string[]> } };
      if (err.response?.data) {
        const messages = Object.values(err.response.data).flat();
        messages.forEach(msg => toast.error(String(msg)));
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
        <div className="min-h-[100svh] flex items-center justify-center p-4 py-6">
          <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-5 sm:p-8 text-center">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Solicitação Enviada!
            </h1>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Sua solicitação foi recebida e será analisada pela nossa equipe. Você receberá um
              email quando sua solicitação for aprovada.
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

  const stepAnimClass = stepDirection === 'forward' ? 'animate-step-forward' : 'animate-step-back';

  return (
    <>
      <style>{styles}</style>
      <FullscreenBackground>
        <div className="min-h-[100svh] flex items-center justify-center p-4 py-8">
          <div className="w-full max-w-lg lg:max-w-5xl">
            <div className="lg:grid lg:grid-cols-[1fr_1.2fr] lg:gap-10 lg:items-start">

              {/* ── Desktop: left branding panel ── */}
              <div className="hidden lg:flex lg:flex-col lg:py-6">
                <div className="mb-6 flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/20 bg-white/15 backdrop-blur-sm">
                    <Music className="h-7 w-7 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">Solicitar Acesso</h2>
                    <p className="text-sm text-primary-200">Para músicos profissionais</p>
                  </div>
                </div>
                <p className="mb-8 text-base font-medium leading-relaxed text-primary-100">
                  Junte-se à plataforma e conecte-se com contratantes da sua região.
                </p>
                <div className="space-y-4">
                  {(
                    [
                      {
                        icon: Calendar,
                        title: 'Agenda Inteligente',
                        desc: 'Organize seus shows e disponibilidade com facilidade',
                      },
                      {
                        icon: CheckCircle,
                        title: 'Visibilidade Local',
                        desc: 'Apareça para contratantes da sua cidade e estado',
                      },
                      {
                        icon: Star,
                        title: 'Oportunidades Reais',
                        desc: 'Receba propostas diretamente no seu perfil',
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

                {/* Step indicator — desktop sidebar */}
                <div className="mt-10 pt-8 border-t border-white/10">
                  <p className="text-xs font-semibold uppercase tracking-wider text-white/50 mb-4">
                    Progresso
                  </p>
                  <div className="space-y-3">
                    {WIZARD_STEPS.map(step => (
                      <div key={step.id} className="flex items-center gap-3">
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-all duration-300 ${
                            currentStep > step.id
                              ? 'bg-green-400 text-white'
                              : currentStep === step.id
                                ? 'bg-white text-indigo-700 ring-2 ring-white/40'
                                : 'bg-white/10 text-white/40'
                          }`}
                        >
                          {currentStep > step.id ? <Check className="w-3.5 h-3.5" /> : step.id}
                        </div>
                        <span
                          className={`text-sm font-medium transition-colors duration-300 ${
                            currentStep === step.id
                              ? 'text-white'
                              : currentStep > step.id
                                ? 'text-white/60'
                                : 'text-white/30'
                          }`}
                        >
                          {step.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* ── Right: form column ── */}
              <div>
                {/* Mobile-only header */}
                <div className="mb-6 text-center lg:hidden">
                  <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900">
                    <Music className="h-7 w-7 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <h1 className="mb-1 text-2xl font-bold text-gray-900 dark:text-white">
                    Solicitar Acesso
                  </h1>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Preencha os dados para solicitar seu acesso
                  </p>
                </div>

                <div className="rounded-2xl bg-white p-5 shadow-xl dark:bg-gray-800 sm:p-8 lg:p-10">

                  {/* ── Stepper (mobile + desktop inside card) ── */}
                  <div className="flex items-center mb-8">
                    {WIZARD_STEPS.map((step, i) => (
                      <Fragment key={step.id}>
                        <div className="flex flex-col items-center">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300 ${
                              currentStep > step.id
                                ? 'bg-indigo-600 text-white'
                                : currentStep === step.id
                                  ? 'bg-indigo-600 text-white ring-4 ring-indigo-100 dark:ring-indigo-900/60'
                                  : 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500'
                            }`}
                          >
                            {currentStep > step.id ? (
                              <Check className="w-4 h-4" />
                            ) : (
                              step.id
                            )}
                          </div>
                          <span className="mt-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 hidden sm:block whitespace-nowrap">
                            {step.label}
                          </span>
                        </div>
                        {i < WIZARD_STEPS.length - 1 && (
                          <div
                            className={`flex-1 h-0.5 mx-2 transition-colors duration-500 ${
                              currentStep > step.id
                                ? 'bg-indigo-600'
                                : 'bg-gray-200 dark:bg-gray-700'
                            }`}
                          />
                        )}
                      </Fragment>
                    ))}
                  </div>

                  <form onSubmit={handleSubmit(onSubmit)}>

                    {/* ══════════════════════════════════════════
                        ETAPA 1 — IDENTIDADE
                    ══════════════════════════════════════════ */}
                    {currentStep === 1 && (
                      <div className={`space-y-5 ${stepAnimClass}`}>
                        {/* Google Sign-In */}
                        <div
                          id="google-signin-request"
                          className="flex justify-center items-center min-h-[44px]"
                        />

                        <div className="relative">
                          <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-gray-200 dark:border-gray-700" />
                          </div>
                          <div className="relative flex justify-center text-sm">
                            <span className="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                              ou preencha o formulário
                            </span>
                          </div>
                        </div>

                        {/* Nome Completo */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Nome Completo <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            inputMode="text"
                            {...register('full_name', { required: 'Nome é obrigatório' })}
                            className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white transition-all duration-200 focus:shadow-lg min-h-[44px]"
                            placeholder="Seu nome completo"
                          />
                          {errors.full_name && (
                            <p className="mt-1 text-sm text-red-600">{errors.full_name.message}</p>
                          )}
                        </div>

                        {/* Email */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Email <span className="text-red-500">*</span>
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
                            className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white transition-all duration-200 focus:shadow-lg min-h-[44px]"
                            placeholder="seu@email.com"
                          />
                          {errors.email && (
                            <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                          )}
                        </div>

                        {/* Telefone */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Telefone/WhatsApp <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="tel"
                            inputMode="tel"
                            value={watchedPhone || ''}
                            onChange={handlePhoneChange}
                            maxLength={15}
                            {...getMobileInputProps('tel')}
                            className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white transition-all duration-200 focus:shadow-lg min-h-[44px]"
                            placeholder="(00) 00000-0000"
                          />
                          {errors.phone && (
                            <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>
                          )}
                        </div>

                        {/* Tipo de Artista — cards visuais */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                            Tipo de Cadastro <span className="text-red-500">*</span>
                          </label>
                          <div className="grid grid-cols-3 gap-3">
                            {ARTIST_TYPE_OPTIONS.map(({ value, label, desc, Icon }) => {
                              const isSelected = artistType === value;
                              return (
                                <button
                                  key={value}
                                  type="button"
                                  onClick={() => handleArtistTypeChange(value)}
                                  className={`artist-card flex flex-col items-center gap-2 rounded-xl border-2 p-3 sm:p-4 cursor-pointer text-center min-h-[44px] ${
                                    isSelected
                                      ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 shadow-sm'
                                      : 'border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-700 bg-white dark:bg-gray-800'
                                  }`}
                                >
                                  <div
                                    className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center transition-colors ${
                                      isSelected
                                        ? 'bg-indigo-600 text-white'
                                        : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                                    }`}
                                  >
                                    <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                                  </div>
                                  <div>
                                    <p
                                      className={`text-sm font-semibold leading-tight ${
                                        isSelected
                                          ? 'text-indigo-700 dark:text-indigo-400'
                                          : 'text-gray-700 dark:text-gray-300'
                                      }`}
                                    >
                                      {label}
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-0.5 hidden sm:block">
                                      {desc}
                                    </p>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                            {artistType === 'solo'
                              ? 'Cadastro individual.'
                              : artistType === 'dupla'
                                ? 'Cadastro de formação com 2 integrantes.'
                                : 'Cadastro de formação com 3 ou mais integrantes.'}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* ══════════════════════════════════════════
                        ETAPA 2 — SUA MÚSICA
                    ══════════════════════════════════════════ */}
                    {currentStep === 2 && (
                      <div className={`space-y-5 ${stepAnimClass}`}>

                        {/* Instrumento Principal */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Instrumento Principal <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            inputMode="text"
                            {...register('instrument', { required: 'Instrumento é obrigatório' })}
                            className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white transition-all duration-200 focus:shadow-lg min-h-[44px]"
                            placeholder="Ex: Guitarra, Vocal, Bateria..."
                          />
                          {errors.instrument && (
                            <p className="mt-1 text-sm text-red-600">{errors.instrument.message}</p>
                          )}
                        </div>

                        {/* Multi-instrumentista */}
                        <div className="flex items-start sm:items-center space-x-2 sm:space-x-3 py-1">
                          <input
                            type="checkbox"
                            id="multi-instrumentalist"
                            checked={isMultiInstrumentalist}
                            onChange={e => setIsMultiInstrumentalist(e.target.checked)}
                            className="w-6 h-6 sm:w-5 sm:h-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 touch-manipulation mt-0.5 sm:mt-0 flex-shrink-0"
                          />
                          <label
                            htmlFor="multi-instrumentalist"
                            className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer"
                          >
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
                                onChange={e => setSearchQuery(e.target.value)}
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
                                  {filteredInstruments.map(inst => {
                                    const isSelected = selectedInstruments.includes(inst.name);
                                    return (
                                      <button
                                        key={inst.id}
                                        type="button"
                                        onClick={() => toggleInstrument(inst.name)}
                                        className={`
                                          px-4 py-2.5 min-h-[44px] rounded-full text-sm font-medium
                                          border-2 transition-all duration-200 touch-manipulation
                                          ${
                                            isSelected
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
                                  <div className="flex gap-2 animate-fade-in">
                                    <input
                                      type="text"
                                      value={customInstrumentName}
                                      onChange={e => setCustomInstrumentName(e.target.value)}
                                      placeholder="Nome do instrumento"
                                      className="flex-1 px-3 sm:px-4 py-3 min-h-[44px] border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white text-sm"
                                      onKeyPress={e =>
                                        e.key === 'Enter' && handleAddCustomInstrument()
                                      }
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

                        {/* Gêneros Musicais — OBRIGATÓRIO */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            <div className="flex items-center gap-2">
                              <Disc3 className="h-4 w-4 text-purple-500" />
                              <span>
                                Gêneros Musicais <span className="text-red-500">*</span>
                              </span>
                              <span className="text-xs text-gray-400 font-normal">(até 5)</span>
                            </div>
                          </label>
                          <div
                            className={`flex flex-wrap gap-2 rounded-lg transition-all duration-200 ${
                              genreError
                                ? 'ring-2 ring-red-400 p-2 genre-error-shake'
                                : ''
                            }`}
                          >
                            {MUSICAL_GENRES.map(genre => (
                              <button
                                key={genre.value}
                                type="button"
                                onClick={() => toggleGenre(genre.value)}
                                className={`px-3 py-1.5 min-h-[36px] rounded-full text-sm transition-colors touch-manipulation ${
                                  selectedGenres.includes(genre.value)
                                    ? 'bg-purple-600 text-white'
                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                }`}
                              >
                                {genre.label}
                              </button>
                            ))}
                          </div>
                          {genreError && (
                            <p className="mt-1.5 text-sm text-red-600 flex items-center gap-1">
                              <span>●</span> Selecione pelo menos 1 gênero musical
                            </p>
                          )}
                          {selectedGenres.length > 0 && (
                            <p className="mt-2 text-xs text-purple-600 dark:text-purple-400 flex items-center gap-1">
                              <Check className="h-3 w-3" />
                              {selectedGenres.length} gênero{selectedGenres.length > 1 ? 's' : ''}{' '}
                              selecionado{selectedGenres.length > 1 ? 's' : ''}
                            </p>
                          )}
                        </div>

                        {/* Bio */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Mini Bio{' '}
                            <span className="text-xs font-normal text-gray-400">(opcional)</span>
                          </label>
                          <textarea
                            {...register('bio')}
                            inputMode="text"
                            rows={3}
                            className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white resize-none transition-all duration-200 focus:shadow-lg"
                            placeholder="Conte um pouco sobre você e sua experiência musical..."
                          />
                        </div>
                      </div>
                    )}

                    {/* ══════════════════════════════════════════
                        ETAPA 3 — DETALHES
                    ══════════════════════════════════════════ */}
                    {currentStep === 3 && (
                      <div className={`space-y-5 ${stepAnimClass}`}>

                        {/* Nome artístico da formação (dupla/banda) */}
                        {artistType !== 'solo' && (
                          <div className="animate-fade-in">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Nome Artístico da Formação <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              inputMode="text"
                              {...register('stage_name', {
                                required: 'Nome artístico é obrigatório para dupla/banda',
                              })}
                              className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white transition-all duration-200 focus:shadow-lg min-h-[44px]"
                              placeholder="Ex: João & Pedro ou Banda X"
                            />
                            {errors.stage_name && (
                              <p className="mt-1 text-sm text-red-600">
                                {errors.stage_name.message}
                              </p>
                            )}
                          </div>
                        )}

                        {/* Integrantes da formação */}
                        {artistType !== 'solo' && (
                          <div className="space-y-3 animate-fade-in">
                            <div className="flex items-center justify-between">
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                <span className="inline-flex items-center gap-1.5">
                                  <Users className="h-4 w-4 text-indigo-500" />
                                  Integrantes adicionais
                                </span>
                              </label>
                              {artistType === 'banda' && (
                                <button
                                  type="button"
                                  onClick={addFormationMember}
                                  className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700 min-h-[32px] px-2"
                                >
                                  <Plus className="h-3.5 w-3.5" />
                                  Adicionar
                                </button>
                              )}
                            </div>

                            {formationMembers.map((member, index) => (
                              <div
                                key={`${artistType}-member-${index}`}
                                className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-600 dark:bg-gray-700/30"
                              >
                                <div className="mb-3 flex items-center justify-between">
                                  <p className="text-xs font-semibold text-gray-600 dark:text-gray-300">
                                    Integrante {index + 2}
                                  </p>
                                  {artistType === 'banda' && formationMembers.length > 2 && (
                                    <button
                                      type="button"
                                      onClick={() => removeFormationMember(index)}
                                      className="text-red-500 hover:text-red-600 min-h-[32px] min-w-[32px] flex items-center justify-center"
                                      aria-label="Remover integrante"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  )}
                                </div>
                                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                  <input
                                    type="text"
                                    value={member.name}
                                    onChange={e =>
                                      updateFormationMember(index, 'name', e.target.value)
                                    }
                                    className="w-full px-3 py-2 min-h-[40px] border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white text-sm"
                                    placeholder="Nome do integrante"
                                  />
                                  <input
                                    type="text"
                                    value={member.instrument}
                                    onChange={e =>
                                      updateFormationMember(index, 'instrument', e.target.value)
                                    }
                                    className="w-full px-3 py-2 min-h-[40px] border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white text-sm"
                                    placeholder="Instrumento"
                                  />
                                  <input
                                    type="text"
                                    value={member.role}
                                    onChange={e =>
                                      updateFormationMember(index, 'role', e.target.value)
                                    }
                                    className="w-full px-3 py-2 min-h-[40px] border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white text-sm"
                                    placeholder="Função (opcional)"
                                  />
                                  <input
                                    type="email"
                                    value={member.email}
                                    onChange={e =>
                                      updateFormationMember(index, 'email', e.target.value)
                                    }
                                    className="w-full px-3 py-2 min-h-[40px] border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white text-sm"
                                    placeholder="Email (opcional)"
                                  />
                                </div>
                              </div>
                            ))}

                            {artistType === 'dupla' && formationMembers.length === 0 && (
                              <button
                                type="button"
                                onClick={() =>
                                  setFormationMembers([createEmptyFormationMember()])
                                }
                                className="w-full rounded-xl border border-dashed border-indigo-300 px-3 py-3 text-sm text-indigo-600 hover:bg-indigo-50 dark:border-indigo-500/50 dark:hover:bg-indigo-500/10 min-h-[44px]"
                              >
                                Adicionar integrante da dupla
                              </button>
                            )}
                          </div>
                        )}

                        {/* Cidade e Estado */}
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Cidade <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              inputMode="text"
                              {...register('city', { required: 'Cidade é obrigatória' })}
                              className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white min-h-[44px]"
                              placeholder="Sua cidade"
                            />
                            {errors.city && (
                              <p className="mt-1 text-sm text-red-600">{errors.city.message}</p>
                            )}
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Estado <span className="text-red-500">*</span>
                            </label>
                            <select
                              {...register('state', { required: 'Estado é obrigatório' })}
                              className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white min-h-[44px]"
                            >
                              <option value="">Selecione</option>
                              {BRAZILIAN_STATES.map(s => (
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
                            Instagram{' '}
                            <span className="text-xs font-normal text-gray-400">(opcional)</span>
                          </label>
                          <input
                            type="text"
                            inputMode="text"
                            {...register('instagram')}
                            className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white min-h-[44px]"
                            placeholder="@seu.usuario"
                          />
                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            Opcional — ajuda na validação do seu perfil
                          </p>
                        </div>
                      </div>
                    )}

                    {/* ── Navegação do wizard ── */}
                    <div
                      className={`flex gap-3 mt-8 pt-5 border-t border-gray-100 dark:border-gray-700 ${
                        currentStep === 1 ? 'justify-end' : ''
                      }`}
                    >
                      {currentStep > 1 && (
                        <button
                          type="button"
                          onClick={goToPrevStep}
                          className="flex-1 flex items-center justify-center gap-1.5 py-3 px-4 rounded-xl border-2 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-semibold transition-colors hover:border-gray-300 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700/50 min-h-[44px]"
                        >
                          <ChevronLeft className="w-4 h-4" />
                          Voltar
                        </button>
                      )}

                      {currentStep < 3 ? (
                        <button
                          type="button"
                          onClick={goToNextStep}
                          className="flex-1 flex items-center justify-center gap-1.5 btn-primary"
                        >
                          Continuar
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      ) : (
                        <button
                          type="submit"
                          disabled={isSubmitting}
                          className="flex-1 btn-primary flex items-center justify-center gap-2"
                        >
                          {isSubmitting ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              Enviando...
                            </>
                          ) : (
                            <>
                              <Send className="w-4 h-4" />
                              Enviar Solicitação
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </form>

                  <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
                    Já tem uma conta?{' '}
                    <Link
                      to="/login"
                      className="text-indigo-600 hover:text-indigo-700 font-medium"
                    >
                      Faça login
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
        </div>
      </FullscreenBackground>
    </>
  );
}
