// pages/PremiumPortalPage.tsx
import React, { useState } from 'react';
import { ExternalLink, Lock, MapPin, Star } from 'lucide-react';
import { motion } from 'framer-motion';
import useSWR from 'swr';
import Layout from '../components/Layout/Layout';
import Skeleton from '../components/common/Skeleton';
import { useAuth } from '../contexts/AuthContext';
import { premiumService } from '../services/premiumService';
import type { PortalItem } from '../types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const CATEGORY_LABELS: Record<PortalItem['category'], string> = {
  rouanet: 'Lei Rouanet',
  aldir_blanc: 'Aldir Blanc',
  festival: 'Festival',
  edital: 'Edital',
  premio: 'Prêmio',
  other: 'Cultural',
};

const CATEGORY_COLORS: Record<PortalItem['category'], string> = {
  rouanet: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  aldir_blanc: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  festival: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  edital: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  premio: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
  other: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
};

const SCOPE_LABELS: Record<PortalItem['scope'], string> = {
  nacional: 'Nacional',
  estadual: 'Estadual',
  municipal: 'Municipal',
};

const FILTER_OPTIONS: { key: string; label: string }[] = [
  { key: 'all', label: 'Todos' },
  { key: 'rouanet', label: 'Rouanet' },
  { key: 'aldir_blanc', label: 'Aldir Blanc' },
  { key: 'festival', label: 'Festivais' },
  { key: 'edital', label: 'Editais' },
  { key: 'premio', label: 'Prêmios' },
];

function deadlineChip(deadline?: string) {
  if (!deadline) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(deadline + 'T00:00:00');
  const diffDays = Math.ceil((d.getTime() - today.getTime()) / 86400000);

  if (diffDays < 0) return null; // já expirou
  if (diffDays <= 7)
    return (
      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300">
        Prazo: {d.toLocaleDateString('pt-BR')}
      </span>
    );
  if (diffDays <= 30)
    return (
      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300">
        Prazo: {d.toLocaleDateString('pt-BR')}
      </span>
    );
  return (
    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300">
      Prazo: {d.toLocaleDateString('pt-BR')}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Gate — tela para usuários não-premium
// ---------------------------------------------------------------------------

const MOCK_ITEMS: Partial<PortalItem>[] = [
  { title: 'Edital de Apoio a Projetos Musicais 2025', category: 'edital', scope: 'estadual', state: 'MG' },
  { title: 'Festival de Música de Câmara — Inscrições Abertas', category: 'festival', scope: 'municipal', state: 'MG' },
  { title: 'Chamada Pública Lei Aldir Blanc — Fase 2', category: 'aldir_blanc', scope: 'municipal', state: 'MG' },
];

function PremiumGate() {
  return (
    <div className="flex flex-col items-center py-12 px-4 gap-6">
      <div className="flex flex-col items-center gap-3">
        <Star className="h-12 w-12 text-yellow-400" strokeWidth={1.5} />
        <h2 className="text-xl font-bold text-center text-gray-900 dark:text-white">
          Portal Cultural Premium
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center max-w-xs">
          Acompanhe editais culturais, festivais e leis de incentivo disponíveis na sua região.
          Entre em contato com o administrador para ativar.
        </p>
      </div>

      {/* Preview desfocado */}
      <div className="w-full max-w-lg relative select-none pointer-events-none">
        <div className="absolute inset-0 z-10 flex items-center justify-center">
          <span className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2 flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
            <Lock className="h-4 w-4" />
            Conteúdo bloqueado
          </span>
        </div>
        <div className="blur-sm space-y-3">
          {MOCK_ITEMS.map((item, i) => (
            <div key={i} className="card p-4 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${CATEGORY_COLORS[item.category!]}`}>
                  {CATEGORY_LABELS[item.category!]}
                </span>
                <span className="text-xs text-gray-400">{item.scope && SCOPE_LABELS[item.scope]}</span>
              </div>
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{item.title}</p>
              <p className="text-xs text-gray-500 mt-1">MG · Prazo: 30/06/2025</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Card de item do portal
// ---------------------------------------------------------------------------

function PortalCard({ item }: { item: PortalItem }) {
  const location = [item.city, item.state].filter(Boolean).join(' · ') || 'Nacional';

  return (
    <motion.div
      className="card p-4 rounded-xl flex flex-col gap-3"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      {/* Badges */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${CATEGORY_COLORS[item.category]}`}>
          {CATEGORY_LABELS[item.category]}
        </span>
        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300">
          {SCOPE_LABELS[item.scope]}
        </span>
      </div>

      {/* Título */}
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white leading-snug">
        {item.title}
      </h3>

      {/* Descrição */}
      {item.description && (
        <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-3">
          {item.description}
        </p>
      )}

      {/* Rodapé */}
      <div className="flex items-center justify-between flex-wrap gap-2 mt-auto">
        <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
          <MapPin className="h-3 w-3" />
          {location}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {deadlineChip(item.deadline)}
          {item.event_date && !item.deadline && (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {new Date(item.event_date + 'T00:00:00').toLocaleDateString('pt-BR')}
            </span>
          )}
        </div>
      </div>

      {item.external_url && (
        <a
          href={item.external_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline self-start"
        >
          Saiba mais
          <ExternalLink className="h-3 w-3" />
        </a>
      )}
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Skeletons
// ---------------------------------------------------------------------------

function CardSkeleton() {
  return (
    <div className="card p-4 rounded-xl flex flex-col gap-3">
      <div className="flex gap-2">
        <Skeleton className="h-5 w-24 rounded-full" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-32" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Página principal
// ---------------------------------------------------------------------------

const PremiumPortalPage: React.FC = () => {
  const { user } = useAuth();
  const isPremium = Boolean(user?.is_premium);
  const [activeFilter, setActiveFilter] = useState('all');

  const { data: items, isLoading, error } = useSWR(
    isPremium ? '/premium/portal' : null,
    () => premiumService.getPortal(),
    { revalidateOnFocus: false }
  );

  const filtered = React.useMemo(() => {
    if (!items) return [];
    if (activeFilter === 'all') return items;
    return items.filter(item => item.category === activeFilter);
  }, [items, activeFilter]);

  const locationLabel = [user?.city, user?.state].filter(Boolean).join(' · ');

  return (
    <Layout>
      <div className="page-shell">
        <div className="page-stack">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Star className="h-6 w-6 text-yellow-400" />
                Portal Cultural
              </h1>
              {locationLabel && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {locationLabel}
                </p>
              )}
            </div>
          </div>

          {!isPremium ? (
            <PremiumGate />
          ) : (
            <>
              {/* Filtros */}
              <div className="flex gap-1.5 sm:gap-2 overflow-x-auto pb-1 -mx-1 px-1 no-scrollbar">
                {FILTER_OPTIONS.map(opt => (
                  <button
                    key={opt.key}
                    onClick={() => setActiveFilter(opt.key)}
                    className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-colors min-h-[36px] ${
                      activeFilter === opt.key
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {/* Conteúdo */}
              {isLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <CardSkeleton key={i} />
                  ))}
                </div>
              ) : error ? (
                <div className="text-center py-12 text-sm text-gray-500 dark:text-gray-400">
                  Não foi possível carregar o conteúdo. Tente novamente mais tarde.
                </div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-12">
                  <Star className="h-10 w-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {activeFilter === 'all'
                      ? 'Nenhum conteúdo disponível para sua região no momento.'
                      : 'Nenhum item nesta categoria no momento.'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {filtered.map(item => (
                    <PortalCard key={`${item.source}-${item.external_id}`} item={item} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default PremiumPortalPage;
