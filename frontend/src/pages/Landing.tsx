import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Users, Award, Megaphone } from 'lucide-react';
import { motion } from 'framer-motion';
import OwlMascot from '../components/ui/OwlMascot';
import FullscreenBackground from '../components/Layout/FullscreenBackground';

type TypewriterPhase = 'typing' | 'pausing' | 'deleting' | 'waiting';

const Landing: React.FC = () => {
  const heroPhrases = useMemo(
    () => [
      'Sua Carreira Musical Organizada',
      'Agenda inteligente para shows',
      'Conexões com outros músicos',
      'Eventos profissionalmente gerenciados',
      'Networking musical simplificado',
      'Oportunidades em um clique'
    ],
    []
  );

  const [currentPhraseIndex, setCurrentPhraseIndex] = useState(0);
  const [displayText, setDisplayText] = useState('');
  const [phase, setPhase] = useState<TypewriterPhase>('typing');
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Velocidades variáveis para efeito mais natural
  const getTypingDelay = useCallback(() => {
    // Velocidade base + variação aleatória para parecer humano
    const baseSpeed = 70;
    const variation = Math.random() * 60 - 20; // -20 a +40ms
    return Math.max(40, baseSpeed + variation);
  }, []);

  const getDeletingDelay = useCallback(() => {
    // Deletar é mais rápido e mais consistente
    return 35 + Math.random() * 20;
  }, []);

  useEffect(() => {
    const currentPhrase = heroPhrases[currentPhraseIndex];

    const runTypewriter = () => {
      switch (phase) {
        case 'typing':
          if (displayText.length < currentPhrase.length) {
            // Pausa maior depois de pontuação para efeito mais natural
            const isPunctuation = [',', '.', '!', '?'].includes(displayText.slice(-1));
            const delay = isPunctuation ? getTypingDelay() + 150 : getTypingDelay();

            timeoutRef.current = setTimeout(() => {
              setDisplayText(currentPhrase.slice(0, displayText.length + 1));
            }, delay);
          } else {
            // Frase completa - pausa antes de deletar
            setPhase('pausing');
            timeoutRef.current = setTimeout(() => {
              setPhase('deleting');
            }, 2500);
          }
          break;

        case 'deleting':
          if (displayText.length > 0) {
            // Remove caracteres mais rápido
            const charsToDelete = Math.random() > 0.7 ? 2 : 1; // Às vezes deleta 2 de uma vez
            timeoutRef.current = setTimeout(() => {
              setDisplayText(displayText.slice(0, Math.max(0, displayText.length - charsToDelete)));
            }, getDeletingDelay());
          } else {
            // Texto vazio - espera antes da próxima frase
            setPhase('waiting');
            timeoutRef.current = setTimeout(() => {
              setCurrentPhraseIndex((prev) => (prev + 1) % heroPhrases.length);
              setPhase('typing');
            }, 400);
          }
          break;

        case 'pausing':
        case 'waiting':
          // Estados de espera - nada a fazer
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
  return (
    <FullscreenBackground
      enableBlueWaves
    >
      <div className="relative z-10">
        {/* Hero Section */}
        <section className="container mx-auto px-4 py-20 text-center">
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

          {/* Título */}
          <motion.div
            className="flex items-center justify-center gap-3 mb-5"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <motion.h1
              className="relative z-20 text-5xl md:text-7xl font-bold text-white pb-1 md:pb-2 leading-[1.12] md:leading-[1.1] logo-animated"
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
                  minWidth: displayText.length > 0 ? 'auto' : '0.5em'
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
          <motion.div
            className="flex flex-col sm:flex-row gap-4 justify-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
          >
            <Link
              to="/cadastro"
              className="px-8 py-4 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all text-lg"
            >
              Começar Agora
            </Link>
            <Link
              to="/login"
              className="px-8 py-4 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl border-2 border-white/30 hover:border-white/50 transition-all text-lg"
            >
              Já Tenho Conta
            </Link>
          </motion.div>
        </section>

        {/* Features Section */}
        <section className="container mx-auto px-4 py-16">
          <motion.h2
            className="text-3xl md:text-4xl font-bold text-white text-center mb-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            Por que escolher o GigFlow?
          </motion.h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-6xl mx-auto">
            {/* Feature 1: Agenda */}
            <FeatureCard
              icon={<Calendar className="h-12 w-12" />}
              title="Gestão de Agenda e Eventos"
              description="Sistema completo de convites, propostas de datas, disponibilidade e confirmação de eventos. Organize sua carreira profissionalmente."
              delay={0.2}
            />

            {/* Feature 2: Marketplace */}
            <FeatureCard
              icon={<Megaphone className="h-12 w-12" />}
              title="Marketplace de Oportunidades"
              description="Divulgue vagas, encontre substitutos e descubra novas oportunidades de shows. Conecte-se com a comunidade musical."
              delay={0.3}
            />

            {/* Feature 3: Networking */}
            <FeatureCard
              icon={<Users className="h-12 w-12" />}
              title="Rede de Conexões Profissionais"
              description="Networking inteligente para músicos. Indique colegas, acompanhe colaborações e construa relacionamentos profissionais."
              delay={0.4}
            />

            {/* Feature 4: Badges */}
            <FeatureCard
              icon={<Award className="h-12 w-12" />}
              title="Sistema de Badges e Conquistas"
              description="Gamificação baseada em shows, avaliações e networking. Destaque-se profissionalmente e construa sua reputação."
              delay={0.5}
            />
          </div>
        </section>

        {/* Social Proof (simples) */}
        <section className="container mx-auto px-4 py-16 text-center">
          <motion.p
            className="text-2xl text-gray-300 font-semibold"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            Junte-se a centenas de músicos profissionais
          </motion.p>
        </section>

        {/* Footer CTA */}
        <section className="container mx-auto px-4 py-16 text-center border-t border-white/10">
          <motion.h3
            className="text-3xl font-bold text-white mb-6"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            Pronto para organizar sua carreira?
          </motion.h3>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/cadastro"
              className="px-8 py-4 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all text-lg"
            >
              Começar Agora
            </Link>
            <Link
              to="/login"
              className="px-8 py-4 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl border-2 border-white/30 hover:border-white/50 transition-all text-lg"
            >
              Já Tenho Conta
            </Link>
          </div>

          <p className="text-gray-400 text-sm mt-8">
            © 2026 DXM Tech. Todos os direitos reservados.
          </p>
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
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay }}
      whileHover={{ y: -5, boxShadow: '0 20px 40px rgba(0,0,0,0.3)' }}
    >
      <div className="text-primary-400 mb-4">
        {icon}
      </div>
      <h3 className="text-2xl font-bold text-white mb-3">
        {title}
      </h3>
      <p className="text-gray-300 leading-relaxed">
        {description}
      </p>
    </motion.div>
  );
};

export default Landing;
