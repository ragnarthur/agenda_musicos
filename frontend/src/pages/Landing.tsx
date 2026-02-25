import React, { Suspense, lazy, useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ADMIN_ROUTES } from '../routes/adminRoutes';
import {
  Calendar,
  Users,
  Award,
  Megaphone,
  Search,
  MessageSquare,
  Shield,
  Briefcase,
  Download,
  Share,
  MoreVertical,
} from 'lucide-react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import FullscreenBackground from '../components/Layout/FullscreenBackground';
import UserTypeToggle from '../components/navigation/UserTypeToggle';
import CityDisplay from '../components/CityDisplay';
import CityBadge from '../components/CityBadge';
import { useInstallPrompt } from '../hooks/useInstallPrompt';
import { usePageMeta } from '../hooks/usePageMeta';
import { trackEvent } from '../utils/analytics';

type TypewriterPhase = 'typing' | 'pausing' | 'deleting' | 'waiting';
type UserType = 'musician' | 'contractor';

interface FeatureContent {
  icon: React.ReactNode;
  title: string;
  description: string;
}

interface UserContent {
  hero: string;
  subtitle: string;
  phrases: string[];
  features: FeatureContent[];
  primaryCTA: {
    text: string;
    to: string;
  };
  secondaryCTA: {
    text: string;
    to: string;
  };
}

const TICKER_CITIES = [
  'Monte Carmelo · MG',
  'Uberlândia · MG',
  'Belo Horizonte · MG',
  'São Paulo · SP',
  'Rio de Janeiro · RJ',
  'Curitiba · PR',
  'Florianópolis · SC',
  'Goiânia · GO',
  'Brasília · DF',
  'Salvador · BA',
];

const OwlMascotLazy = lazy(() => import('../components/ui/OwlMascot'));

const MascotFallback: React.FC = () => (
  <div className="h-48 w-48 sm:h-56 sm:w-56 rounded-3xl border border-white/15 bg-white/5 backdrop-blur-sm flex items-center justify-center shadow-xl shadow-slate-900/30">
    <img
      src="/icon-192.png"
      alt="GigFlow"
      width={140}
      height={140}
      className="h-24 w-24 sm:h-28 sm:w-28 object-contain"
      loading="eager"
      decoding="async"
      fetchPriority="high"
    />
  </div>
);

const Landing: React.FC = () => {
  const navigate = useNavigate();
  const [userType, setUserType] = useState<UserType>('musician');
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [showAndroidModal, setShowAndroidModal] = useState(false);
  const [showAnimatedMascot, setShowAnimatedMascot] = useState(false);
  const { canInstall, isIOS, isMobile, promptInstall } = useInstallPrompt();
  const prefersReducedMotion = useReducedMotion();
  const hasTrackedInstallVisibleRef = useRef(false);

  usePageMeta({
    title: 'GigFlow - Encontre Músicos Profissionais',
    description:
      'Plataforma para encontrar e contratar músicos profissionais para seu evento. Gerencie agenda, eventos e conexões musicais.',
  });

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setShowAnimatedMascot(true);
    }, 650);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!canInstall || hasTrackedInstallVisibleRef.current) return;

    hasTrackedInstallVisibleRef.current = true;
    trackEvent('pwa_landing_install_visible', {
      user_type: userType,
      ios: isIOS,
      mobile: isMobile,
    });
  }, [canInstall, isIOS, isMobile, userType]);

  const handleInstall = async (placement: 'hero_strip' | 'mobile_fab') => {
    trackEvent('pwa_landing_install_click', {
      user_type: userType,
      ios: isIOS,
      mobile: isMobile,
      placement,
    });

    if (isIOS) {
      trackEvent('pwa_landing_install_ios_instructions_opened', { user_type: userType, placement });
      setShowIOSModal(true);
    } else {
      // Tenta o prompt nativo primeiro
      const success = await promptInstall();
      if (success) {
        trackEvent('pwa_landing_install_native_success', {
          user_type: userType,
          ios: false,
          placement,
        });
      }
      // Se não funcionou e é mobile, mostra instruções manuais
      if (!success && isMobile) {
        trackEvent('pwa_landing_install_manual_android_opened', {
          user_type: userType,
          placement,
        });
        setShowAndroidModal(true);
      }
    }
  };

  const musicianContent = useMemo<UserContent>(
    () => ({
      hero: 'Gestão profissional da sua carreira musical',
      subtitle: 'Planeje shows, organize contatos e acompanhe oportunidades em um único lugar',
      phrases: [
        'Gestão profissional da sua carreira musical',
        'Agenda inteligente para shows',
        'Conexões com outros músicos',
        'Eventos profissionalmente gerenciados',
        'Networking musical simplificado',
        'Oportunidades em um clique',
        'Encontre músicos para seu evento',
        'Gerencie convites e confirmações',
        'Conquiste badges e destaque-se',
        'Marketplace de vagas musicais',
        'Controle total da sua agenda',
        'Notificações em tempo real',
        'Avaliações entre músicos',
        'Seu próximo show começa aqui',
        'Construa sua reputação musical',
        'Disponibilidades sincronizadas',
      ],
      features: [
        {
          icon: <Calendar className="h-6 w-6" />,
          title: 'Gestão de Agenda e Eventos',
          description:
            'Sistema completo de convites, propostas de datas, disponibilidade e confirmação de eventos. Organize sua carreira profissionalmente.',
        },
        {
          icon: <Megaphone className="h-6 w-6" />,
          title: 'Marketplace de Oportunidades',
          description:
            'Divulgue vagas, encontre substitutos e descubra novas oportunidades de shows. Conecte-se com a comunidade musical.',
        },
        {
          icon: <Users className="h-6 w-6" />,
          title: 'Rede de Conexões Profissionais',
          description:
            'Networking inteligente para músicos. Indique colegas, acompanhe colaborações e construa relacionamentos profissionais.',
        },
        {
          icon: <Award className="h-6 w-6" />,
          title: 'Sistema de Badges e Conquistas',
          description:
            'Gamificação baseada em shows, avaliações e networking. Destaque-se profissionalmente e construa sua reputação.',
        },
      ],
      primaryCTA: {
        text: 'Solicitar Acesso',
        to: '/solicitar-acesso',
      },
      secondaryCTA: {
        text: 'Entrar',
        to: '/login',
      },
    }),
    []
  );

  const contractorContent = useMemo<UserContent>(
    () => ({
      hero: 'Contrate músicos com critério profissional',
      subtitle: 'Encontre talentos verificados para eventos, casas e projetos culturais',
      phrases: [
        'Contrate músicos com critério profissional',
        'Talentos musicais profissionais',
        'Contrate com confiança',
        'Músicos verificados e avaliados',
        'Busca inteligente por perfil',
        'Contato direto com artistas',
        'Organize seus eventos musicais',
        'Gestão simplificada de contratações',
        'Encontre o talento perfeito',
        'Evento memorável garantido',
        'Músicos selecionados por cidade',
        'Processo de contratação simples',
        'Avaliações confiáveis',
        'Comunidade musical qualificada',
        'O melhor palco para seu evento',
        'Talentos que sua audiência ama',
      ],
      features: [
        {
          icon: <Search className="h-6 w-6" />,
          title: 'Busca Avançada de Músicos',
          description:
            'Filtre por instrumento, cidade, avaliação, disponibilidade e muito mais. Encontre exatamente o talento que seu evento precisa.',
        },
        {
          icon: <MessageSquare className="h-6 w-6" />,
          title: 'Contato Direto pelo App',
          description:
            'Fale com músicos dentro do GigFlow. Negocie detalhes, tire dúvidas e feche contratações em uma plataforma só.',
        },
        {
          icon: <Shield className="h-6 w-6" />,
          title: 'Músicos Verificados e Avaliados',
          description:
            'Todos os músicos passam por validação e têm histórico de avaliações. Contrate com total segurança e confiança.',
        },
        {
          icon: <Briefcase className="h-6 w-6" />,
          title: 'Gestão Profissional de Eventos',
          description:
            'Organize todas as suas contratações em um só lugar. Histórico, feedbacks e muito mais.',
        },
      ],
      primaryCTA: {
        text: 'Cadastrar Contratante',
        to: '/contratante/cadastro',
      },
      secondaryCTA: {
        text: 'Entrar como Contratante',
        to: '/contratante/login',
      },
    }),
    []
  );

  const currentContent = useMemo(
    () => (userType === 'musician' ? musicianContent : contractorContent),
    [contractorContent, musicianContent, userType]
  );

  const heroPhrases = useMemo(() => currentContent.phrases, [currentContent]);

  const [currentPhraseIndex, setCurrentPhraseIndex] = useState(0);
  const [displayText, setDisplayText] = useState('');
  const [phase, setPhase] = useState<TypewriterPhase>('typing');
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Velocidades ajustadas para ciclo de ~4 segundos por frase
  const getTypingDelay = useCallback(() => {
    // Velocidade rápida com leve variação para parecer humano
    const baseSpeed = 65;
    const variation = Math.random() * 30 - 10; // -10 a +20ms
    return Math.max(40, baseSpeed + variation);
  }, []);

  const getDeletingDelay = useCallback(() => {
    // Deletar bem rápido
    return 32 + Math.random() * 14;
  }, []);

  useEffect(() => {
    if (prefersReducedMotion) {
      return;
    }

    const currentPhrase = heroPhrases[currentPhraseIndex];

    const runTypewriter = () => {
      switch (phase) {
        case 'typing':
          if (displayText.length < currentPhrase.length) {
            // Pausa sutil depois de pontuação
            const isPunctuation = [',', '.', '!', '?'].includes(displayText.slice(-1));
            const delay = isPunctuation ? getTypingDelay() + 60 : getTypingDelay();

            timeoutRef.current = setTimeout(() => {
              setDisplayText(currentPhrase.slice(0, displayText.length + 1));
            }, delay);
          } else {
            // Frase completa - pausa curta antes de deletar
            setPhase('pausing');
          }
          break;

        case 'deleting':
          if (displayText.length > 0) {
            // Remove caracteres rapidamente, às vezes 2-3 de uma vez
            const charsToDelete = Math.random() > 0.5 ? (Math.random() > 0.7 ? 3 : 2) : 1;
            timeoutRef.current = setTimeout(() => {
              setDisplayText(displayText.slice(0, Math.max(0, displayText.length - charsToDelete)));
            }, getDeletingDelay());
          } else {
            // Texto vazio - transição rápida para próxima frase
            setPhase('waiting');
          }
          break;

        case 'pausing':
          timeoutRef.current = setTimeout(() => {
            setPhase('deleting');
          }, 3200);
          break;
        case 'waiting':
          timeoutRef.current = setTimeout(() => {
            setCurrentPhraseIndex(prev => (prev + 1) % heroPhrases.length);
            setPhase('typing');
          }, 500);
          break;
      }
    };

    runTypewriter();

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [
    displayText,
    phase,
    currentPhraseIndex,
    heroPhrases,
    getTypingDelay,
    getDeletingDelay,
    prefersReducedMotion,
  ]);

  const animatedHeroText = prefersReducedMotion
    ? (heroPhrases[currentPhraseIndex] ?? '')
    : displayText;

  // Admin keyboard shortcut: Ctrl+Shift+A or Cmd+Shift+A
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Ctrl+Shift+A (Windows/Linux) or Cmd+Shift+A (Mac)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'A') {
        e.preventDefault();
        navigate(ADMIN_ROUTES.login);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [navigate]);

  return (
    <FullscreenBackground enableBlueWaves>
      <main
        id="main-content"
        className="relative z-10 pb-[calc(env(safe-area-inset-bottom)+88px)] sm:pb-0 overflow-hidden"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 20%, rgba(165,180,252,0.35), transparent 42%), radial-gradient(circle at 80% 15%, rgba(34,211,238,0.28), transparent 36%), repeating-linear-gradient(0deg, rgba(255,255,255,0.06) 0px, rgba(255,255,255,0.06) 1px, transparent 1px, transparent 3px)',
          }}
        />

        {/* Hero Section */}
        <section className="container mx-auto px-4 py-16 sm:py-20 text-center relative">
          {/* User Type Toggle */}
          <UserTypeToggle selected={userType} onChange={setUserType} />

          {/* Logo */}
          <motion.div
            className="flex justify-center mb-1"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            {showAnimatedMascot ? (
              <Suspense fallback={<MascotFallback />}>
                <div className="h-56 w-56 sm:h-64 sm:w-64 md:h-72 md:w-72">
                  <OwlMascotLazy
                    className="h-56 w-56 sm:h-64 sm:w-64 md:h-72 md:w-72"
                    autoplay={false}
                  />
                </div>
              </Suspense>
            ) : (
              <MascotFallback />
            )}
          </motion.div>
          <CityDisplay />

          {/* Título */}
          <motion.div
            className="flex items-center justify-center gap-2 mb-5"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <motion.h1
              className="relative z-20 text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white pb-1 md:pb-2 leading-tight logo-animated"
              initial={{ opacity: 0, y: 20, filter: 'blur(6px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              GigFlow
              <motion.span
                aria-hidden
                className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 bg-gradient-to-r from-transparent via-white/35 to-transparent"
                initial={{ x: 0, opacity: 0 }}
                animate={{ x: '220%', opacity: 1 }}
                transition={{ duration: 1.6, delay: 0.6, ease: 'easeOut' }}
              />
            </motion.h1>
            <motion.span
              className="text-[14px] md:text-[16px] px-2 py-0.5 bg-gradient-to-r from-amber-500/8 via-amber-400/12 to-amber-500/8 text-amber-100/70 rounded-full border border-amber-400/15 font-light italic tracking-wider"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              Beta
            </motion.span>
          </motion.div>
          <div className="flex justify-center mb-6">
            <CityBadge />
          </div>

          <AnimatePresence mode="wait">
            <motion.h2
              key={`hero-${userType}`}
              className="text-[clamp(1.95rem,4vw,3.4rem)] font-heading font-semibold text-white tracking-[-0.02em] leading-[1.08] max-w-3xl mx-auto mb-4"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -18 }}
              transition={{ duration: 0.35 }}
            >
              {currentContent.hero}
            </motion.h2>
          </AnimatePresence>

          <AnimatePresence mode="wait">
            <motion.div
              key={userType}
              className="text-base sm:text-xl md:text-2xl text-gray-300 mb-4 max-w-3xl mx-auto"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
            >
              {currentContent.subtitle}
            </motion.div>
          </AnimatePresence>

          <motion.div
            className="text-base sm:text-xl md:text-2xl text-gray-300 mb-10 sm:mb-12 max-w-3xl mx-auto min-h-[2.8em] flex items-center justify-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <span className="relative" aria-live="polite" aria-atomic="true">
              {/* Texto digitado com efeito de gradiente sutil */}
              <span
                className="bg-gradient-to-r from-indigo-200 via-indigo-300 to-cyan-200 bg-clip-text text-transparent"
                style={{
                  display: 'inline-block',
                  minWidth: animatedHeroText.length > 0 ? 'auto' : '0.5em',
                }}
              >
                {animatedHeroText}
              </span>
              {/* Cursor piscante estilo terminal */}
              <motion.span
                className="inline-block w-[3px] h-[1.15em] bg-primary-400 ml-0.5 align-middle rounded-sm"
                animate={{
                  opacity: prefersReducedMotion ? 1 : phase === 'pausing' ? [1, 0, 1] : 1,
                  scaleY: prefersReducedMotion ? 1 : phase === 'typing' ? [1, 1.1, 1] : 1,
                }}
                transition={{
                  opacity: {
                    duration: 0.8,
                    repeat: prefersReducedMotion ? 0 : Infinity,
                    ease: 'easeInOut',
                  },
                  scaleY: {
                    duration: 0.15,
                    repeat: prefersReducedMotion ? 0 : phase === 'typing' ? Infinity : 0,
                  },
                }}
                style={{
                  boxShadow: '0 0 8px rgba(99, 102, 241, 0.6), 0 0 16px rgba(99, 102, 241, 0.3)',
                }}
              />
            </span>
          </motion.div>

          {/* CTAs */}
          <AnimatePresence mode="wait">
            <motion.div
              key={userType}
              className="flex flex-col sm:flex-row gap-3 justify-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
            >
              <Link
                to={currentContent.primaryCTA.to}
                className="px-6 py-3.5 sm:px-8 sm:py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl shadow-[0_0_40px_rgba(99,102,241,0.4)] hover:shadow-[0_0_46px_rgba(99,102,241,0.55)] hover:-translate-y-0.5 transition-all text-base sm:text-lg"
              >
                {currentContent.primaryCTA.text}
              </Link>
              <Link
                to={currentContent.secondaryCTA.to}
                className="px-6 py-3.5 sm:px-8 sm:py-4 bg-white/10 hover:bg-white/18 text-white font-semibold rounded-xl border border-indigo-300/35 hover:border-indigo-200/55 shadow-[0_0_24px_rgba(129,140,248,0.18)] transition-all text-base sm:text-lg"
              >
                {currentContent.secondaryCTA.text}
              </Link>
            </motion.div>
          </AnimatePresence>

          {/* Install strip */}
          {canInstall && (
            <>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, duration: 0.4 }}
                className="mt-5 hidden sm:flex justify-center"
              >
                <button
                  onClick={() => {
                    void handleInstall('hero_strip');
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-white/8 hover:bg-white/14 text-white/70 hover:text-white rounded-full border border-white/15 text-sm font-medium transition-all min-h-[44px]"
                >
                  <Download className="h-4 w-4" />
                  Instalar app
                </button>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7, duration: 0.35 }}
                className="sm:hidden fixed left-3 right-3 bottom-[calc(env(safe-area-inset-bottom)+10px)] z-40"
              >
                <button
                  onClick={() => {
                    void handleInstall('mobile_fab');
                  }}
                  className="w-full flex items-center justify-center gap-2 rounded-2xl border border-cyan-300/35 bg-cyan-500/20 text-cyan-100 min-h-[52px] px-4 py-3 text-sm font-semibold shadow-lg shadow-cyan-500/20 backdrop-blur-md active:scale-[0.99] transition-transform"
                  aria-label="Instalar aplicativo"
                >
                  <Download className="h-4 w-4" />
                  Instalar aplicativo
                </button>
              </motion.div>
            </>
          )}
        </section>

        {/* Features Section */}
        <section className="container mx-auto px-4 py-12 sm:py-16">
          <AnimatePresence mode="wait">
            <motion.div
              key={userType}
              className="text-center mb-10 sm:mb-14"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
            >
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-indigo-300 mb-2">
                Recursos
              </p>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white">
                Por que escolher o GigFlow{userType === 'contractor' ? ' Contratantes' : ''}?
              </h2>
            </motion.div>
          </AnimatePresence>

          <AnimatePresence mode="wait">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 max-w-4xl mx-auto">
              {currentContent.features.map((feature, index) => (
                <FeatureCard
                  key={`${userType}-${index}`}
                  icon={feature.icon}
                  title={feature.title}
                  description={feature.description}
                  index={index}
                  delay={0.15 + index * 0.08}
                  reduceMotion={Boolean(prefersReducedMotion)}
                />
              ))}
            </div>
          </AnimatePresence>
        </section>

        {/* Social Proof */}
        <section className="container mx-auto px-4 py-10 sm:py-14 text-center">
          <AnimatePresence mode="wait">
            <motion.p
              key={userType}
              className="text-lg sm:text-2xl text-gray-300 font-semibold"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
            >
              {userType === 'musician'
                ? 'Junte-se a centenas de músicos profissionais'
                : 'Centenas de contratantes já confiam no GigFlow'}
            </motion.p>
          </AnimatePresence>
          <div className="mt-7 rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-sm py-3 overflow-hidden">
            <motion.div
              initial={{ x: 0 }}
              animate={{ x: ['0%', '-50%'] }}
              transition={{
                duration: 18,
                repeat: Infinity,
                ease: 'linear',
              }}
              className="flex items-center gap-6 w-max px-2"
            >
              {[...TICKER_CITIES, ...TICKER_CITIES].map((city, idx) => (
                <span
                  key={`${city}-${idx}`}
                  className="text-xs sm:text-sm uppercase tracking-[0.18em] text-slate-300 whitespace-nowrap"
                >
                  {city}
                </span>
              ))}
            </motion.div>
          </div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex items-center justify-center gap-3 mt-6 flex-wrap"
          >
            <Link
              to="/nossos-musicos"
              className="inline-flex items-center gap-2 px-5 py-2.5 text-indigo-300 hover:text-white hover:bg-white/10 rounded-xl transition-all duration-300"
            >
              <Users className="h-4 w-4" />
              <span className="text-sm font-medium">Conheça nossos músicos</span>
            </Link>
          </motion.div>
        </section>

        {/* Footer CTA */}
        <section className="relative container mx-auto px-4 py-12 sm:py-16 text-center border-t border-white/8 bg-gradient-to-b from-indigo-950/30 via-transparent to-transparent rounded-t-3xl">
          <AnimatePresence mode="wait">
            <motion.h3
              key={userType}
              className="text-2xl sm:text-3xl font-bold text-white mb-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
            >
              {userType === 'musician'
                ? 'Pronto para organizar sua carreira?'
                : 'Pronto para encontrar os melhores músicos?'}
            </motion.h3>
          </AnimatePresence>
          <p className="text-gray-400 text-sm mb-8">Acesso gratuito para músicos selecionados.</p>

          <AnimatePresence mode="wait">
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                key={`primary-${userType}`}
                to={currentContent.primaryCTA.to}
                className="px-6 py-3.5 sm:px-8 sm:py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl shadow-[0_0_38px_rgba(99,102,241,0.38)] hover:shadow-[0_0_46px_rgba(99,102,241,0.52)] transition-all text-base sm:text-lg"
              >
                {currentContent.primaryCTA.text}
              </Link>
              <Link
                key={`secondary-${userType}`}
                to={currentContent.secondaryCTA.to}
                className="px-6 py-3.5 sm:px-8 sm:py-4 bg-white/10 hover:bg-white/18 text-white font-semibold rounded-xl border border-white/25 hover:border-white/40 transition-all text-base sm:text-lg"
              >
                {currentContent.secondaryCTA.text}
              </Link>
            </div>
          </AnimatePresence>

          <p className="text-gray-500 text-xs mt-10">
            © 2026 GigFlow. Todos os direitos reservados.
          </p>

          {/* Admin access link - subtle */}
          <Link
            to={ADMIN_ROUTES.login}
            className="absolute bottom-4 right-4 opacity-25 hover:opacity-100 transition-all duration-300 hover:scale-110 group"
            title="Acesso Administrativo"
          >
            <Shield className="h-5 w-5 text-gray-400 group-hover:text-amber-400 transition-colors" />
          </Link>
        </section>
      </main>

      {/* Modal de instruções para iOS */}
      <AnimatePresence>
        {showIOSModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
            onClick={() => setShowIOSModal(false)}
          >
            <motion.div
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-slate-900 border border-white/10 rounded-t-3xl sm:rounded-3xl w-full max-w-md p-6 pb-safe"
              onClick={e => e.stopPropagation()}
            >
              <div className="w-10 h-1 bg-slate-700 rounded-full mx-auto mb-6 sm:hidden" />

              <h3 className="text-xl font-bold text-white mb-1 text-center">Instalar GigFlow</h3>
              <p className="text-slate-400 text-sm text-center mb-6">
                No iPhone/iPad, siga os passos abaixo:
              </p>

              <ol className="space-y-4">
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-7 h-7 bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 rounded-full flex items-center justify-center text-xs font-bold">
                    1
                  </span>
                  <p className="text-slate-300 text-sm pt-0.5">
                    Toque no botão <Share className="inline w-4 h-4 text-blue-400 mx-0.5" />{' '}
                    <strong className="text-white">Compartilhar</strong> na barra do Safari
                  </p>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-7 h-7 bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 rounded-full flex items-center justify-center text-xs font-bold">
                    2
                  </span>
                  <p className="text-slate-300 text-sm pt-0.5">
                    Role para baixo e toque em{' '}
                    <strong className="text-white">"Adicionar à Tela de Início"</strong>
                  </p>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-7 h-7 bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 rounded-full flex items-center justify-center text-xs font-bold">
                    3
                  </span>
                  <p className="text-slate-300 text-sm pt-0.5">
                    Toque em <strong className="text-white">"Adicionar"</strong> no canto superior
                    direito
                  </p>
                </li>
              </ol>

              <button
                onClick={() => setShowIOSModal(false)}
                className="w-full mt-6 px-4 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold transition-all min-h-[48px]"
              >
                Entendi
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de instruções para Android */}
      <AnimatePresence>
        {showAndroidModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
            onClick={() => setShowAndroidModal(false)}
          >
            <motion.div
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-slate-900 border border-white/10 rounded-t-3xl sm:rounded-3xl w-full max-w-md p-6 pb-safe"
              onClick={e => e.stopPropagation()}
            >
              <div className="w-10 h-1 bg-slate-700 rounded-full mx-auto mb-6 sm:hidden" />

              <h3 className="text-xl font-bold text-white mb-1 text-center">Instalar GigFlow</h3>
              <p className="text-slate-400 text-sm text-center mb-6">
                No Android, siga os passos abaixo:
              </p>

              <ol className="space-y-4">
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-7 h-7 bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 rounded-full flex items-center justify-center text-xs font-bold">
                    1
                  </span>
                  <p className="text-slate-300 text-sm pt-0.5">
                    Toque no menu <MoreVertical className="inline w-4 h-4 text-slate-400 mx-0.5" />{' '}
                    no canto superior direito do Chrome
                  </p>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-7 h-7 bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 rounded-full flex items-center justify-center text-xs font-bold">
                    2
                  </span>
                  <p className="text-slate-300 text-sm pt-0.5">
                    Toque em <strong className="text-white">"Adicionar à tela inicial"</strong> ou{' '}
                    <strong className="text-white">"Instalar aplicativo"</strong>
                  </p>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-7 h-7 bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 rounded-full flex items-center justify-center text-xs font-bold">
                    3
                  </span>
                  <p className="text-slate-300 text-sm pt-0.5">
                    Confirme tocando em <strong className="text-white">"Adicionar"</strong> ou{' '}
                    <strong className="text-white">"Instalar"</strong>
                  </p>
                </li>
              </ol>

              <button
                onClick={() => setShowAndroidModal(false)}
                className="w-full mt-6 px-4 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold transition-all min-h-[48px]"
              >
                Entendi
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </FullscreenBackground>
  );
};

// Componente FeatureCard — numerado, com accent border e icon container
interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  index: number;
  delay: number;
  reduceMotion?: boolean;
}

const FeatureCard: React.FC<FeatureCardProps> = ({
  icon,
  title,
  description,
  index,
  delay,
  reduceMotion = false,
}) => {
  const num = String(index + 1).padStart(2, '0');

  return (
    <motion.div
      className="relative bg-white/[0.03] backdrop-blur-md rounded-2xl p-6 border border-white/10 hover:border-indigo-400/60 hover:bg-white/[0.06] transition-all group overflow-hidden"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay }}
      whileHover={
        reduceMotion ? undefined : { y: -4, boxShadow: '0 18px 44px rgba(79,70,229,0.25)' }
      }
      key={`${title}-${delay}`}
    >
      <span className="pointer-events-none absolute -inset-[1px] rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity bg-[linear-gradient(120deg,rgba(99,102,241,0.65),rgba(34,211,238,0.38),rgba(99,102,241,0.65))]" />
      <span className="pointer-events-none absolute inset-[1px] rounded-2xl bg-slate-950/75" />

      {/* Number badge */}
      <span className="absolute top-5 right-5 text-sm font-mono font-bold text-white/15 group-hover:text-indigo-300/60 transition-colors select-none">
        {num}
      </span>

      {/* Icon */}
      <div className="relative z-10 w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/25 flex items-center justify-center text-indigo-300 mb-4 group-hover:bg-indigo-600/35 transition-colors">
        {icon}
      </div>

      <h3 className="relative z-10 text-lg font-bold text-white mb-2 leading-snug">{title}</h3>
      <p className="relative z-10 text-gray-400 text-sm leading-relaxed">{description}</p>
    </motion.div>
  );
};

export default Landing;
