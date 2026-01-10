import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Users, Award, Megaphone } from 'lucide-react';
import { motion } from 'framer-motion';
import OwlMascot from '../components/ui/OwlMascot';

const Landing: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800">
      {/* Blurs de fundo */}
      <div className="pointer-events-none absolute inset-0 z-0 opacity-40">
        <div className="absolute top-20 -left-20 h-96 w-96 rounded-full bg-primary-500/20 blur-[100px]" />
        <div className="absolute bottom-20 right-0 h-80 w-80 rounded-full bg-indigo-500/15 blur-[80px]" />
      </div>

      <div className="relative z-10">
        {/* Hero Section */}
        <section className="container mx-auto px-4 py-20 text-center">
          {/* Logo */}
          <motion.div
            className="flex justify-center mb-8"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <div className="p-6 rounded-full bg-gradient-to-br from-amber-400 via-primary-500 to-emerald-400 shadow-2xl">
              <OwlMascot className="h-16 w-16" />
            </div>
          </motion.div>

          {/* Título */}
          <motion.h1
            className="text-5xl md:text-7xl font-bold text-white mb-4 logo-animated"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            GigFlow
          </motion.h1>

          <motion.p
            className="text-xl md:text-2xl text-gray-300 mb-12 max-w-3xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            Sua Carreira Musical Organizada
          </motion.p>

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
            © 2024 GigFlow. Todos os direitos reservados.
          </p>
        </section>
      </div>
    </div>
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
