// pages/company/CompanyDashboard.tsx
// Dashboard principal para empresas contratantes de músicos
import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, MessageSquare, Users, TrendingUp, Clock, Send, MapPin, Star } from 'lucide-react';
import { useCompanyAuth } from '../../contexts/CompanyAuthContext';
import CompanyNavbar from '../../components/navigation/CompanyNavbar';
import {
  companyService,
  contactRequestService,
  publicMusicianService,
} from '../../services/publicApi';
import type { CompanyDashboard, ContactRequest, MusicianPublic } from '../../services/publicApi';
import Loading from '../../components/common/Loading';

// Wrapper component para páginas de empresa com navbar
interface CompanyLayoutProps {
  children: React.ReactNode;
}

const CompanyLayout: React.FC<CompanyLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-gray-50">
      <CompanyNavbar />
      {children}
    </div>
  );
};

const CompanyDashboard: React.FC = () => {
  const { organization, loading } = useCompanyAuth();
  const [dashboardData, setDashboardData] = useState<CompanyDashboard | null>(null);
  const [recentContacts, setRecentContacts] = useState<ContactRequest[]>([]);
  const [topMusicians, setTopMusicians] = useState<MusicianPublic[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  const loadDashboardData = useCallback(async () => {
    try {
      const data = await companyService.getDashboard();
      setDashboardData(data);
    } catch (error) {
      console.error('Erro ao carregar dashboard:', error);
    }
  }, []);

  const loadRecentContacts = useCallback(async () => {
    try {
      const contacts = await contactRequestService.listSent();
      setRecentContacts(contacts.slice(0, 5)); // Apenas os 5 mais recentes
    } catch (error) {
      console.error('Erro ao carregar contatos:', error);
    }
  }, []);

  const loadTopMusicians = useCallback(async () => {
    try {
      // Buscar músicos da cidade da empresa (se disponível)
      const city = organization?.city || 'Monte Carmelo';
      const state = organization?.state || 'MG';
      const musicians = await publicMusicianService.listByCity(city, state);
      setTopMusicians(musicians.slice(0, 6)); // Top 6 músicos
    } catch (error) {
      console.error('Erro ao carregar músicos:', error);
    } finally {
      setDataLoading(false);
    }
  }, [organization?.city, organization?.state]);

  useEffect(() => {
    if (!loading && organization) {
      loadDashboardData();
      loadRecentContacts();
      loadTopMusicians();
    }
  }, [loading, organization, loadDashboardData, loadRecentContacts, loadTopMusicians]);

  if (loading || dataLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loading text="Carregando dashboard..." />
      </div>
    );
  }

  if (!organization) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Não foi possível carregar sua organização
          </h2>
          <Link to="/login-empresa" className="text-indigo-600 hover:text-indigo-700">
            Voltar para login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <CompanyLayout>
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-b-3xl">
        <div className="container mx-auto px-4 py-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Bem-vindo(a), {organization.name}!
            </h1>
            <p className="text-indigo-100 text-lg">
              Encontre os melhores músicos para seus eventos
            </p>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
              <StatCard
                label="Contatos Enviados"
                value={dashboardData?.stats.total_sent || 0}
                icon={<Send className="w-5 h-5" />}
              />
              <StatCard
                label="Respostas Pendentes"
                value={dashboardData?.stats.pending_replies || 0}
                icon={<Clock className="w-5 h-5" />}
                highlight
              />
              <StatCard
                label="Conversas Ativas"
                value={dashboardData?.stats.replied || 0}
                icon={<MessageSquare className="w-5 h-5" />}
              />
            </div>
          </motion.div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Quick Actions */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Ações Rápidas</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <QuickActionCard
              title="Encontrar Músicos"
              description="Busque por instrumento, cidade ou avaliação"
              icon={<Search className="w-6 h-6" />}
              action="Buscar Agora"
              to="/empresa/musicians"
            />
            <QuickActionCard
              title="Gerenciar Contatos"
              description="Veja suas conversas com músicos"
              icon={<MessageSquare className="w-6 h-6" />}
              action="Ver Conversas"
              to="/empresa/contatos"
              badge={dashboardData?.stats.pending_replies}
            />
          </div>
        </motion.section>

        {/* Músicos em Destaque */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Músicos em Destaque</h2>
            {organization.city && (
              <span className="text-sm text-gray-500 flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                {organization.city} - {organization.state}
              </span>
            )}
          </div>

          {topMusicians.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {topMusicians.map((musician, index) => (
                <MusicianCard key={musician.id} musician={musician} index={index} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<Users className="w-12 h-12" />}
              title="Nenhum músico encontrado"
              description="Não há músicos cadastrados na sua região ainda."
              action="Ver todas as cidades"
              to="/cidades/monte-carmelo"
            />
          )}
        </motion.section>

        {/* Contatos Recentes */}
        {recentContacts.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Contatos Recentes</h2>
              <Link
                to="/empresa/contatos"
                className="text-indigo-600 hover:text-indigo-700 font-medium"
              >
                Ver todos →
              </Link>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              {recentContacts.map(contact => (
                <ContactItem key={contact.id} contact={contact} />
              ))}
            </div>
          </motion.section>
        )}

        {/* Tips */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
            <h3 className="text-lg font-semibold text-blue-900 mb-4">
              💡 Dicas para contratar os melhores músicos
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <TipCard
                title="Seja Específico"
                description="Detalhe o tipo de evento, estilo musical e expectativas para atrair os músicos certos."
              />
              <TipCard
                title="Verifique Avaliações"
                description="Consulte o histórico e avaliações de outros contratantes para garantir qualidade."
              />
              <TipCard
                title="Negocie Claramente"
                description="Seja transparente sobre valores, horários e condições para evitar mal-entendidos."
              />
            </div>
          </div>
        </motion.section>
      </div>
    </CompanyLayout>
  );
};

// Componentes auxiliares
interface StatCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  highlight?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, icon, highlight }) => {
  return (
    <motion.div
      whileHover={{ scale: highlight ? 1.05 : 1.02 }}
      className={`bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20 ${
        highlight ? 'ring-2 ring-white/40' : ''
      }`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-indigo-100 text-sm font-medium">{label}</p>
          <p className={`text-3xl font-bold text-white`}>{value}</p>
        </div>
        <div className={`p-3 bg-white/20 rounded-lg ${highlight ? 'animate-pulse' : ''}`}>
          {icon}
        </div>
      </div>
    </motion.div>
  );
};

interface QuickActionCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  action: string;
  to: string;
  badge?: number;
}

const QuickActionCard: React.FC<QuickActionCardProps> = ({
  title,
  description,
  icon,
  action,
  to,
  badge,
}) => {
  return (
    <Link
      to={to}
      className="group block bg-white rounded-xl shadow-sm border border-gray-200 p-6 transition-all hover:border-indigo-500 hover:bg-indigo-50"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-indigo-100 text-indigo-600 group-hover:scale-110 transition-transform">
              {icon}
            </div>
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          </div>
          <p className="text-gray-600 mb-4">{description}</p>
          <span className="inline-flex items-center gap-2 font-medium text-indigo-600">
            {action}
            <TrendingUp className="w-4 h-4" />
            {badge && badge > 0 && (
              <span className="ml-2 px-2 py-1 bg-red-100 text-red-600 text-xs rounded-full font-bold">
                {badge}
              </span>
            )}
          </span>
        </div>
      </div>
    </Link>
  );
};

interface MusicianCardProps {
  musician: MusicianPublic;
  index: number;
}

const MusicianCard: React.FC<MusicianCardProps> = ({ musician, index }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.1 }}
      whileHover={{ y: -2 }}
      className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all cursor-pointer"
    >
      <div className="flex items-center gap-4 mb-4">
        {musician.avatar_url ? (
          <img
            src={musician.avatar_url}
            alt={musician.full_name}
            className="w-12 h-12 rounded-full object-cover"
          />
        ) : (
          <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
            <Users className="w-6 h-6 text-gray-400" />
          </div>
        )}
        <div className="flex-1">
          <h4 className="font-semibold text-gray-900">{musician.full_name}</h4>
          <p className="text-sm text-gray-600">{musician.instrument}</p>
        </div>
        {musician.average_rating > 0 && (
          <div className="flex items-center gap-1">
            <Star className="w-4 h-4 text-amber-400 fill-current" />
            <span className="text-sm font-medium">{musician.average_rating.toFixed(1)}</span>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {musician.instruments.slice(0, 3).map((instrument, idx) => (
          <span key={idx} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
            {instrument}
          </span>
        ))}
      </div>

      {musician.city && (
        <div className="flex items-center gap-1 text-sm text-gray-500 mb-4">
          <MapPin className="w-3 h-3" />
          {musician.city} - {musician.state}
        </div>
      )}

      <button className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors">
        Ver Perfil
      </button>
    </motion.div>
  );
};

interface ContactItemProps {
  contact: ContactRequest;
}

const ContactItem: React.FC<ContactItemProps> = ({ contact }) => {
  const statusColors = {
    pending: 'bg-amber-100 text-amber-800',
    read: 'bg-blue-100 text-blue-800',
    replied: 'bg-green-100 text-green-800',
    archived: 'bg-gray-100 text-gray-800',
  };

  return (
    <div className="p-4 border-b border-gray-200 last:border-b-0 hover:bg-gray-50 transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h4 className="font-medium text-gray-900">{contact.to_musician_name}</h4>
            <span
              className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[contact.status]}`}
            >
              {contact.status_display}
            </span>
          </div>
          <p className="text-sm text-gray-600 mt-1">{contact.subject}</p>
          <p className="text-xs text-gray-500 mt-1">
            {new Date(contact.created_at).toLocaleDateString('pt-BR')}
          </p>
        </div>
        <MessageSquare className="w-5 h-5 text-gray-400" />
      </div>
    </div>
  );
};

interface TipCardProps {
  title: string;
  description: string;
}

const TipCard: React.FC<TipCardProps> = ({ title, description }) => {
  return (
    <div className="bg-white/70 rounded-lg p-4">
      <h4 className="font-semibold text-blue-900 mb-2">{title}</h4>
      <p className="text-sm text-blue-800">{description}</p>
    </div>
  );
};

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action: string;
  to: string;
}

const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, description, action, to }) => {
  return (
    <div className="text-center py-12">
      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
        {icon}
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 mb-6">{description}</p>
      <Link
        to={to}
        className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors"
      >
        {action}
      </Link>
    </div>
  );
};

export default CompanyDashboard;
