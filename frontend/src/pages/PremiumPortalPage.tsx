// pages/PremiumPortalPage.tsx
import React, { useState } from 'react';
import {
  ArrowUpRight,
  CalendarClock,
  Clock3,
  ExternalLink,
  Lock,
  MapPin,
  Newspaper,
  ScrollText,
  Sparkles,
  Star,
  Trophy,
} from 'lucide-react';
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
  noticia: 'Notícia',
  other: 'Cultural',
};

const CATEGORY_COLORS: Record<PortalItem['category'], string> = {
  rouanet: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300',
  aldir_blanc: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  festival: 'bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-900/30 dark:text-fuchsia-300',
  edital: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  premio: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  noticia: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
  other: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
};

const CATEGORY_CARD_STYLES: Record<PortalItem['category'], string> = {
  rouanet: 'border-cyan-200/70 dark:border-cyan-700/40',
  aldir_blanc: 'border-emerald-200/70 dark:border-emerald-700/40',
  festival: 'border-fuchsia-200/70 dark:border-fuchsia-700/40',
  edital: 'border-amber-200/70 dark:border-amber-700/40',
  premio: 'border-yellow-200/70 dark:border-yellow-700/40',
  noticia: 'border-indigo-200/70 dark:border-indigo-700/40',
  other: 'border-slate-200/70 dark:border-slate-700/40',
};

const SOURCE_LABELS: Record<PortalItem['source'], string> = {
  salic: 'SALIC',
  mapas_culturais: 'Mapas Culturais',
  curadoria_admin: 'Curadoria',
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
  { key: 'noticia', label: 'Notícias' },
];

const FILTER_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  all: Sparkles,
  rouanet: ScrollText,
  aldir_blanc: Sparkles,
  festival: CalendarClock,
  edital: ScrollText,
  premio: Trophy,
  noticia: Newspaper,
};

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

function formatPortalDate(value?: string) {
  if (!value) return null;
  return new Date(`${value}T00:00:00`).toLocaleDateString('pt-BR');
}

// ---------------------------------------------------------------------------
// Gate — tela para usuários não-premium
// ---------------------------------------------------------------------------

const MOCK_ITEMS: Partial<PortalItem>[] = [
  {
    title: 'Edital de Apoio a Projetos Musicais 2025',
    category: 'edital',
    scope: 'estadual',
    state: 'MG',
  },
  {
    title: 'Festival de Música de Câmara — Inscrições Abertas',
    category: 'festival',
    scope: 'municipal',
    state: 'MG',
  },
  {
    title: 'Chamada Pública Lei Aldir Blanc — Fase 2',
    category: 'aldir_blanc',
    scope: 'municipal',
    state: 'MG',
  },
];

function PremiumGate() {
  return (
    <div className="rounded-3xl border border-amber-200/70 dark:border-amber-700/30 bg-gradient-to-br from-amber-50 via-white to-cyan-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950 p-5 sm:p-7">
      <div className="flex flex-col items-center text-center gap-3">
        <div className="h-14 w-14 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-300 border border-amber-400/30 flex items-center justify-center">
          <Star className="h-8 w-8" strokeWidth={1.75} />
        </div>
        <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
          Portal Cultural Premium
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-300 max-w-xl leading-relaxed">
          Editais, festivais, prêmios e notícias culturais da sua cidade e do seu estado em um feed
          filtrado para músicos.
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Solicite a ativação com um administrador do app.
        </p>
      </div>

      {/* Preview desfocado */}
      <div className="w-full max-w-2xl mt-6 mx-auto relative select-none pointer-events-none">
        <div className="absolute inset-0 z-10 flex items-center justify-center">
          <span className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
            <Lock className="h-4 w-4" />
            Conteúdo bloqueado
          </span>
        </div>
        <div className="blur-sm space-y-3">
          {MOCK_ITEMS.map((item, i) => (
            <div
              key={i}
              className="rounded-2xl border border-slate-200/70 dark:border-slate-700/40 bg-white/90 dark:bg-slate-900/60 p-4"
            >
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded-full ${CATEGORY_COLORS[item.category!]}`}
                >
                  {CATEGORY_LABELS[item.category!]}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {item.scope && SCOPE_LABELS[item.scope]}
                </span>
              </div>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                {item.title}
              </p>
              <p className="text-xs text-slate-500 mt-1">MG · Prazo: 30/06/2025</p>
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
  const sourceLabel = SOURCE_LABELS[item.source];
  const accentBorder = CATEGORY_CARD_STYLES[item.category];

  return (
    <motion.div
      className={`rounded-2xl border bg-white/90 dark:bg-slate-900/65 backdrop-blur-sm p-4 sm:p-5 flex flex-col gap-3 shadow-sm hover:shadow-md transition-shadow ${accentBorder}`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22 }}
      whileHover={{ y: -2 }}
    >
      {/* Badges */}
      <div className="flex items-center gap-2 flex-wrap">
        <span
          className={`text-xs font-medium px-2 py-0.5 rounded-full ${CATEGORY_COLORS[item.category]}`}
        >
          {CATEGORY_LABELS[item.category]}
        </span>
        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300">
          {SCOPE_LABELS[item.scope]}
        </span>
        <span className="ml-auto text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">
          {sourceLabel}
        </span>
      </div>

      {/* Título */}
      <h3 className="text-sm sm:text-[15px] font-bold text-gray-900 dark:text-white leading-snug tracking-tight">
        {item.title}
      </h3>

      {/* Descrição */}
      {item.description && (
        <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-3">{item.description}</p>
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
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-700 dark:text-cyan-300 hover:underline self-start"
        >
          Saiba mais
          <ExternalLink className="h-3 w-3" />
        </a>
      )}
    </motion.div>
  );
}

function FeaturedPortalCard({ item }: { item: PortalItem }) {
  const location = [item.city, item.state].filter(Boolean).join(' · ') || 'Nacional';
  const sourceLabel = SOURCE_LABELS[item.source];

  return (
    <motion.article
      className="rounded-3xl border border-cyan-300/30 bg-gradient-to-br from-slate-900 via-slate-900 to-cyan-950 text-white p-5 sm:p-6 shadow-xl shadow-cyan-900/20"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24 }}
    >
      <div className="flex items-center gap-2 flex-wrap mb-3">
        <span
          className={`text-xs font-medium px-2 py-0.5 rounded-full ${CATEGORY_COLORS[item.category]}`}
        >
          {CATEGORY_LABELS[item.category]}
        </span>
        <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-slate-100">
          {SCOPE_LABELS[item.scope]}
        </span>
        <span className="ml-auto text-[11px] uppercase tracking-wide text-cyan-200">
          {sourceLabel}
        </span>
      </div>

      <h2 className="text-lg sm:text-xl font-black leading-tight tracking-tight">{item.title}</h2>
      {item.description && (
        <p className="text-sm text-slate-200/90 mt-3 line-clamp-3 leading-relaxed">
          {item.description}
        </p>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-3 text-xs text-slate-200/90">
        <span className="inline-flex items-center gap-1">
          <MapPin className="h-3.5 w-3.5" />
          {location}
        </span>
        <span className="inline-flex items-center gap-1">
          <Clock3 className="h-3.5 w-3.5" />
          {formatPortalDate(item.published_at) ?? 'Sem data'}
        </span>
        {deadlineChip(item.deadline)}
      </div>

      {item.external_url && (
        <a
          href={item.external_url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-cyan-200 hover:text-cyan-100 transition-colors"
        >
          Acessar fonte oficial
          <ArrowUpRight className="h-4 w-4" />
        </a>
      )}
    </motion.article>
  );
}

function CompactPortalCard({ item }: { item: PortalItem }) {
  return (
    <motion.div
      className="rounded-2xl border border-slate-200/70 dark:border-slate-700/40 bg-white/85 dark:bg-slate-900/65 p-4"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22 }}
    >
      <div className="flex items-center gap-2 flex-wrap mb-2">
        <span
          className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${CATEGORY_COLORS[item.category]}`}
        >
          {CATEGORY_LABELS[item.category]}
        </span>
        <span className="text-[11px] text-slate-500 dark:text-slate-400">
          {SCOPE_LABELS[item.scope]}
        </span>
      </div>

      <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-snug">
        {item.title}
      </h3>
      {item.description && (
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 line-clamp-2">
          {item.description}
        </p>
      )}

      <div className="mt-3 text-[11px] text-slate-500 dark:text-slate-400">
        {formatPortalDate(item.published_at) ?? 'Sem data'}
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Skeletons
// ---------------------------------------------------------------------------

function CardSkeleton() {
  return (
    <div className="rounded-2xl border border-slate-200/70 dark:border-slate-700/40 bg-white/90 dark:bg-slate-900/65 p-4 flex flex-col gap-3">
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

  const {
    data: items,
    isLoading,
    error,
  } = useSWR(isPremium ? '/premium/portal' : null, () => premiumService.getPortal(), {
    revalidateOnFocus: false,
  });

  const filtered = React.useMemo(() => {
    if (!items) return [];
    const base =
      activeFilter === 'all' ? [...items] : items.filter(item => item.category === activeFilter);
    return base.sort((a, b) => {
      const aDeadline = a.deadline
        ? new Date(`${a.deadline}T00:00:00`).getTime()
        : Number.MAX_SAFE_INTEGER;
      const bDeadline = b.deadline
        ? new Date(`${b.deadline}T00:00:00`).getTime()
        : Number.MAX_SAFE_INTEGER;
      if (aDeadline !== bDeadline) return aDeadline - bDeadline;
      return (
        new Date(`${b.published_at}T00:00:00`).getTime() -
        new Date(`${a.published_at}T00:00:00`).getTime()
      );
    });
  }, [items, activeFilter]);

  const featuredItem = filtered[0];
  const spotlightItems = filtered.slice(1, 3);
  const feedItems = filtered.slice(3);

  const locationLabel = [user?.city, user?.state].filter(Boolean).join(' · ');
  const totalItems = items?.length ?? 0;

  return (
    <Layout>
      <div className="page-shell relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -top-16 -left-24 h-72 w-72 rounded-full bg-emerald-300/20 dark:bg-emerald-700/10 blur-3xl" />
          <div className="absolute top-4 right-0 h-80 w-80 rounded-full bg-amber-300/25 dark:bg-amber-700/10 blur-3xl" />
          <div className="absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-cyan-300/20 dark:bg-cyan-700/10 blur-3xl" />
        </div>

        <div className="page-stack">
          {/* Header */}
          <div className="rounded-3xl border border-slate-200/70 dark:border-slate-700/40 bg-white/85 dark:bg-slate-900/65 backdrop-blur-sm p-5 sm:p-7">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                  <Star className="h-6 w-6 text-amber-500 dark:text-amber-300" />
                  Portal Cultural
                </h1>
                <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 mt-2 max-w-2xl">
                  Oportunidades culturais curadas para músicos da sua localidade.
                </p>
                {locationLabel && (
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" />
                    {locationLabel}
                  </p>
                )}
              </div>

              {isPremium && (
                <div className="rounded-2xl border border-cyan-200/70 dark:border-cyan-700/40 bg-cyan-50/70 dark:bg-cyan-950/30 px-4 py-3 min-w-[170px]">
                  <p className="text-[11px] uppercase tracking-wider text-cyan-700 dark:text-cyan-300 font-semibold">
                    Itens no feed
                  </p>
                  <p className="text-2xl font-black text-slate-900 dark:text-white">{totalItems}</p>
                </div>
              )}
            </div>
          </div>

          {!isPremium ? (
            <PremiumGate />
          ) : (
            <>
              {/* Filtros */}
              <div className="flex gap-1.5 sm:gap-2 overflow-x-auto pb-1 -mx-1 px-1 no-scrollbar">
                {FILTER_OPTIONS.map(opt => {
                  const FilterIcon = FILTER_ICONS[opt.key] ?? Sparkles;
                  return (
                    <button
                      key={opt.key}
                      onClick={() => setActiveFilter(opt.key)}
                      className={`flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs sm:text-sm font-semibold transition-colors min-h-[36px] ${
                        activeFilter === opt.key
                          ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                          : 'bg-white/80 text-slate-600 border border-slate-200/70 hover:bg-slate-50 dark:bg-slate-900/60 dark:text-slate-300 dark:border-slate-700/50 dark:hover:bg-slate-800'
                      }`}
                    >
                      <FilterIcon className="h-3.5 w-3.5" />
                      {opt.label}
                    </button>
                  );
                })}
              </div>

              {/* Conteúdo */}
              {isLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <CardSkeleton key={i} />
                  ))}
                </div>
              ) : error ? (
                <div className="text-center py-12 text-sm text-slate-500 dark:text-slate-400">
                  Não foi possível carregar o conteúdo. Tente novamente mais tarde.
                </div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-12">
                  <Star className="h-10 w-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {activeFilter === 'all'
                      ? 'Nenhum conteúdo disponível para sua região no momento.'
                      : 'Nenhum item nesta categoria no momento.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {featuredItem && (
                    <section className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h2 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-white">
                          Destaque da sua localidade
                        </h2>
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          Atualizado hoje
                        </span>
                      </div>
                      <div className="grid grid-cols-1 xl:grid-cols-[1.4fr_1fr] gap-3 sm:gap-4">
                        <FeaturedPortalCard item={featuredItem} />
                        {spotlightItems.length > 0 && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-3 sm:gap-4">
                            {spotlightItems.map(item => (
                              <CompactPortalCard
                                key={`${item.source}-${item.external_id}`}
                                item={item}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    </section>
                  )}

                  {feedItems.length > 0 && (
                    <section className="space-y-3">
                      <h3 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-white">
                        Mais oportunidades e notícias
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                        {feedItems.map(item => (
                          <PortalCard key={`${item.source}-${item.external_id}`} item={item} />
                        ))}
                      </div>
                    </section>
                  )}
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
