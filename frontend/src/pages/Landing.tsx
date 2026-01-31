import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Calendar,
  Users,
  Award,
  Megaphone,
  Search,
  MessageSquare,
  Shield,
  Briefcase,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import OwlMascot from '../components/ui/OwlMascot';
import FullscreenBackground from '../components/Layout/FullscreenBackground';
import UserTypeToggle from '../components/navigation/UserTypeToggle';
import CityDisplay from '../components/CityDisplay';
import CityBadge from '../components/CityBadge';

type TypewriterPhase = 'typing' | 'pausing' | 'deleting' | 'waiting';
type UserType = 'musician' | 'company';

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

const Landing: React.FC = () => {
  const navigate = useNavigate();
  const [userType, setUserType] = useState<UserType>('musician');

  const musicianContent = useMemo<UserContent>(() => ({
    hero: 'Sua Carreira Musical Organizada',
    subtitle: 'Agenda inteligente para shows, networking e oportunidades profissionais',
    phrases: [
      'Sua Carreira Musical Organizada',
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
        icon: <Calendar className="h-12 w-12" />,
        title: 'Gestão de Agenda e Eventos',
        description:
          'Sistema completo de convites, propostas de datas, disponibilidade e confirmação de eventos. Organize sua carreira profissionalmente.',
      },
      {
        icon: <Megaphone className="h-12 w-12" />,
        title: 'Marketplace de Oportunidades',
        description:
          'Divulgue vagas, encontre substitutos e descubra novas oportunidades de shows. Conecte-se com a comunidade musical.',
      },
      {
        icon: <Users className="h-12 w-12" />,
        title: 'Rede de Conexões Profissionais',
        description:
          'Networking inteligente para músicos. Indique colegas, acompanhe colaborações e construa relacionamentos profissionais.',
      },
      {
        icon: <Award className="h-12 w-12" />,
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
  }), []);

  const companyContent = useMemo<UserContent>(() => ({
    hero: 'Encontre os Melhores Músicos',
    subtitle: 'Contrate talentos musicais profissionais para seus eventos',
    phrases: [
      'Encontre os Melhores Músicos',
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
        icon: <Search className="h-12 w-12" />,
        title: 'Busca Avançada de Músicos',
        description:
          'Filtre por instrumento, cidade, avaliação, disponibilidade e muito mais. Encontre exatamente o talento que seu evento precisa.',
      },
      {
        icon: <MessageSquare className="h-12 w-12" />,
        title: 'Contato Direto e Rápido',
        description:
          'Fale diretamente com músicos sem intermediários. Negocie detalhes, tire dúvidas e feche contratações em uma plataforma só.',
      },
      {
        icon: <Shield className="h-12 w-12" />,
        title: 'Músicos Verificados e Avaliados',
        description:
          'Todos os músicos passam por validação e têm histórico de avaliações. Contrate com total segurança e confiança.',
      },
      {
        icon: <Briefcase className="h-12 w-12" />,
        title: 'Gestão Profissional de Eventos',
        description:
          'Organize todas as suas contratações em um só lugar. Histórico, feedbacks e muito mais.',
      },
    ],
    primaryCTA: {
      text: 'Cadastrar Empresa',
      to: '/cadastro-empresa',
    },
    secondaryCTA: {
      text: 'Entrar',
      to: '/login-empresa',
    },
  }), []);
  const currentContent = useMemo(
    () => (userType === 'musician' ? musicianContent : companyContent),
    [companyContent, musicianContent, userType]
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
  }, [displayText, phase, currentPhraseIndex, heroPhrases, getTypingDelay, getDeletingDelay]);

  // Admin keyboard shortcut: Ctrl+Shift+A or Cmd+Shift+A
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Ctrl+Shift+A (Windows/Linux) or Cmd+Shift+A (Mac)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'A') {
        e.preventDefault();
        navigate('/admin/login');
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [navigate]);

  return (
    <FullscreenBackground enableBlueWaves>
      <div className="relative z-10">
        {/* Hero Section */}
        <section className="container mx-auto px-4 py-20 text-center">
          {/* User Type Toggle */}
          <UserTypeToggle selected={userType} onChange={setUserType} />
          {/* Logo */}
          <motion.div
            className="flex justify-center mb-1"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <div className="h-48 w-48 sm:h-56 sm:w-56">
              <OwlMascot className="h-48 w-48 sm:h-56 sm:w-56" />
            </div>
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
              className="relative z-20 text-4xl xs:text-5xl sm:text-6xl md:text-7xl font-bold text-white pb-1 md:pb-2 leading-tight logo-animated"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              GigFlow
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
            <motion.div
              key={userType}
              className="text-xl md:text-2xl text-gray-300 mb-4 max-w-3xl mx-auto"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
            >
              {currentContent.subtitle}
            </motion.div>
          </AnimatePresence>

          <motion.div
            className="text-xl md:text-2xl text-gray-300 mb-12 max-w-3xl mx-auto min-h-[2.8em] flex items-center justify-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <span className="relative">
              {/* Texto digitado com efeito de gradiente sutil */}
              <span
                className="bg-gradient-to-r from-white via-gray-200 to-white bg-clip-text"
                style={{
                  display: 'inline-block',
                  minWidth: displayText.length > 0 ? 'auto' : '0.5em',
                }}
              >
                {displayText}
              </span>
              {/* Cursor piscante estilo terminal */}
              <motion.span
                className="inline-block w-[3px] h-[1.15em] bg-primary-400 ml-0.5 align-middle rounded-sm"
                animate={{
                  opacity: phase === 'pausing' ? [1, 0, 1] : 1,
                  scaleY: phase === 'typing' ? [1, 1.1, 1] : 1,
                }}
                transition={{
                  opacity: {
                    duration: 0.8,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  },
                  scaleY: {
                    duration: 0.15,
                    repeat: phase === 'typing' ? Infinity : 0,
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
              className="flex flex-col sm:flex-row gap-4 justify-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
            >
              <Link
                to={currentContent.primaryCTA.to}
                className="px-8 py-4 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all text-lg"
              >
                {currentContent.primaryCTA.text}
              </Link>
              <Link
                to={currentContent.secondaryCTA.to}
                className="px-8 py-4 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl border-2 border-white/30 hover:border-white/50 transition-all text-lg"
              >
                {currentContent.secondaryCTA.text}
              </Link>
            </motion.div>
          </AnimatePresence>
        </section>

        {/* Features Section */}
        <section className="container mx-auto px-4 py-16">
          <AnimatePresence mode="wait">
            <motion.h2
              key={userType}
              className="text-3xl md:text-4xl font-bold text-white text-center mb-12"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
            >
              Por que escolher o GigFlow{userType === 'company' ? ' Empresas' : ''}?
            </motion.h2>
          </AnimatePresence>

          <AnimatePresence mode="wait">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-6xl mx-auto">
              {currentContent.features.map((feature, index) => (
                <FeatureCard
                  key={`${userType}-${index}`}
                  icon={feature.icon}
                  title={feature.title}
                  description={feature.description}
                  delay={0.2 + index * 0.1}
                />
              ))}
            </div>
          </AnimatePresence>
        </section>

        {/* Social Proof (simples) */}
        <section className="container mx-auto px-4 py-16 text-center">
          <AnimatePresence mode="wait">
            <motion.p
              key={userType}
              className="text-2xl text-gray-300 font-semibold"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
            >
              {userType === 'musician'
                ? 'Junte-se a centenas de músicos profissionais'
                : 'Centenas de empresas já confiam no GigFlow'}
            </motion.p>
          </AnimatePresence>
        </section>

        {/* Footer CTA */}
        <section className="relative container mx-auto px-4 py-16 text-center border-t border-white/10">
          <AnimatePresence mode="wait">
            <motion.h3
              key={userType}
              className="text-3xl font-bold text-white mb-6"
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

          <AnimatePresence mode="wait">
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                key={`primary-${userType}`}
                to={currentContent.primaryCTA.to}
                className="px-8 py-4 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all text-lg"
              >
                {currentContent.primaryCTA.text}
              </Link>
              <Link
                key={`secondary-${userType}`}
                to={currentContent.secondaryCTA.to}
                className="px-8 py-4 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl border-2 border-white/30 hover:border-white/50 transition-all text-lg"
              >
                {currentContent.secondaryCTA.text}
              </Link>
            </div>
          </AnimatePresence>

          <p className="text-gray-400 text-sm mt-8">
            © 2026 GigFlow. Todos os direitos reservados.
          </p>

          {/* Admin access link - subtle */}
          <Link
            to="/admin/login"
            className="absolute bottom-4 right-4 opacity-30 hover:opacity-100 transition-all duration-300 hover:scale-110 group"
            title="Acesso Administrativo"
          >
            <Shield className="h-5 w-5 text-gray-400 group-hover:text-amber-400 transition-colors" />
          </Link>
        </section>
      </div>
    </FullscreenBackground>
  );
};

// Componente FeatureCard
interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  delay: number;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ icon, title, description, delay }) => {
  return (
    <motion.div
      className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10 hover:border-primary-500/50 transition-all"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      whileHover={{ y: -5, boxShadow: '0 20px 40px rgba(0,0,0,0.3)' }}
      key={`${title}-${delay}`}
    >
      <div className="text-primary-400 mb-4">{icon}</div>
      <h3 className="text-2xl font-bold text-white mb-3">{title}</h3>
      <p className="text-gray-300 leading-relaxed">{description}</p>
    </motion.div>
  );
};

export default Landing;
