// pages/PremiumPortalPage.tsx
import React, { useState } from 'react';
import {
  ArrowUpRight,
  Building2,
  CalendarClock,
  Clock3,
  FileText,
  Flame,
  Globe,
  Lock,
  MapPin,
  Music2,
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

const SCOPE_META: Record<
  PortalItem['scope'],
  {
    label: string;
    subtitle: string;
    icon: React.ComponentType<{ className?: string }>;
    containerClass: string;
  }
> = {
  municipal: {
    label: 'Municipal',
    subtitle: 'O que é específico da sua cidade',
    icon: MapPin,
    containerClass:
      'border-emerald-200/70 bg-emerald-50/60 dark:border-emerald-700/30 dark:bg-emerald-950/20',
  },
  estadual: {
    label: 'Estadual',
    subtitle: 'Oportunidades válidas no seu estado',
    icon: Building2,
    containerClass: 'border-cyan-200/70 bg-cyan-50/60 dark:border-cyan-700/30 dark:bg-cyan-950/20',
  },
  nacional: {
    label: 'Federal',
    subtitle: 'Programas e notícias de alcance nacional',
    icon: Globe,
    containerClass:
      'border-violet-200/70 bg-violet-50/60 dark:border-violet-700/30 dark:bg-violet-950/20',
  },
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
  aldir_blanc: Music2,
  festival: CalendarClock,
  edital: FileText,
  premio: Trophy,
  noticia: Newspaper,
};

// Gradientes de fallback quando não há thumbnail_url
const CATEGORY_GRADIENTS: Record<PortalItem['category'], string> = {
  rouanet: 'from-cyan-900 via-cyan-800 to-cyan-700',
  aldir_blanc: 'from-emerald-900 via-emerald-800 to-teal-700',
  festival: 'from-fuchsia-900 via-fuchsia-800 to-purple-700',
  edital: 'from-amber-900 via-amber-800 to-orange-700',
  premio: 'from-yellow-800 via-yellow-700 to-amber-600',
  noticia: 'from-indigo-900 via-indigo-800 to-violet-700',
  other: 'from-slate-800 via-slate-700 to-slate-600',
};

const CATEGORY_ICON_COMPONENTS: Record<
  PortalItem['category'],
  React.ComponentType<{ className?: string }>
> = {
  rouanet: ScrollText,
  aldir_blanc: Music2,
  festival: CalendarClock,
  edital: FileText,
  premio: Trophy,
  noticia: Newspaper,
  other: Star,
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

function daysUntil(deadline?: string) {
  if (!deadline) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(`${deadline}T00:00:00`);
  return Math.ceil((d.getTime() - today.getTime()) / 86400000);
}

function nearestDeadlineDays(item: PortalItem) {
  const d = daysUntil(item.deadline);
  if (d === null || d < 0) return Number.MAX_SAFE_INTEGER;
  return d;
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
// CoverArea — thumbnail ou gradiente de fallback por categoria
// ---------------------------------------------------------------------------

function CoverArea({
  item,
  aspectClass = 'aspect-video',
}: {
  item: PortalItem;
  aspectClass?: string;
}) {
  const [imgError, setImgError] = useState(false);
  const CategoryIcon = CATEGORY_ICON_COMPONENTS[item.category];
  const gradient = CATEGORY_GRADIENTS[item.category];
  const urgencyDays = daysUntil(item.deadline);
  const showUrgency = urgencyDays !== null && urgencyDays >= 0 && urgencyDays <= 30;

  return (
    <div className={`relative overflow-hidden rounded-t-2xl ${aspectClass} bg-slate-800`}>
      {item.thumbnail_url && !imgError ? (
        <img
          src={item.thumbnail_url}
          alt={item.title}
          loading="lazy"
          onError={() => setImgError(true)}
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        <div
          className={`absolute inset-0 bg-gradient-to-br ${gradient} flex items-center justify-center`}
        >
          <CategoryIcon className="w-10 h-10 text-white/25" />
        </div>
      )}
      {/* Overlay gradiente para legibilidade */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
      {/* Urgência badge */}
      {showUrgency && (
        <span
          className={`absolute top-2 right-2 text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
            urgencyDays! <= 7
              ? 'bg-red-500 text-white shadow-lg shadow-red-500/40'
              : 'bg-amber-400 text-amber-900'
          }`}
        >
          <Flame className="w-2.5 h-2.5" />
          {urgencyDays === 0 ? 'Último dia' : `${urgencyDays}d`}
        </span>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Cards do portal
// ---------------------------------------------------------------------------

function PortalCard({ item, index = 0 }: { item: PortalItem; index?: number }) {
  const location = [item.city, item.state].filter(Boolean).join(' · ') || 'Nacional';
  const sourceLabel = SOURCE_LABELS[item.source];
  const Wrapper = item.external_url ? 'a' : 'div';
  const linkProps = item.external_url
    ? { href: item.external_url, target: '_blank', rel: 'noopener noreferrer' }
    : {};

  return (
    <motion.div
      className="rounded-2xl overflow-hidden border border-slate-200/60 dark:border-white/8 bg-white dark:bg-slate-900/80 shadow-sm flex flex-col group"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, delay: index * 0.04 }}
      whileHover={{ y: -4, scale: 1.01 }}
    >
      <CoverArea item={item} />

      <Wrapper {...linkProps} className="flex flex-col flex-1 p-4 gap-2.5">
        {/* Badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${CATEGORY_COLORS[item.category]}`}
          >
            {CATEGORY_LABELS[item.category]}
          </span>
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            {SCOPE_LABELS[item.scope]}
          </span>
          <span className="ml-auto text-[10px] uppercase tracking-wider text-slate-400">
            {sourceLabel}
          </span>
        </div>

        {/* Título */}
        <h3 className="text-sm sm:text-[15px] font-bold text-slate-900 dark:text-white leading-snug tracking-tight line-clamp-2">
          {item.title}
        </h3>

        {/* Descrição */}
        {item.description && (
          <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
            {item.description}
          </p>
        )}

        {/* Rodapé */}
        <div className="mt-auto pt-2 flex items-center justify-between gap-2 border-t border-slate-100 dark:border-white/6">
          <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
            <MapPin className="h-3 w-3" />
            {location}
          </span>
          {item.external_url && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 group-hover:text-indigo-500 transition-colors">
              Saiba mais
              <ArrowUpRight className="h-3 w-3" />
            </span>
          )}
        </div>
      </Wrapper>
    </motion.div>
  );
}

function FeaturedPortalCard({ item }: { item: PortalItem }) {
  const location = [item.city, item.state].filter(Boolean).join(' · ') || 'Nacional';
  const sourceLabel = SOURCE_LABELS[item.source];
  const Wrapper = item.external_url ? 'a' : 'div';
  const linkProps = item.external_url
    ? { href: item.external_url, target: '_blank', rel: 'noopener noreferrer' }
    : {};

  return (
    <motion.article
      className="rounded-2xl overflow-hidden border border-slate-200/60 dark:border-white/8 bg-white dark:bg-slate-900/80 shadow-lg flex flex-col group"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28 }}
      whileHover={{ y: -3 }}
    >
      <CoverArea item={item} aspectClass="aspect-[16/7] sm:aspect-[16/6]" />

      <Wrapper {...linkProps} className="flex flex-col p-5 sm:p-6 gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${CATEGORY_COLORS[item.category]}`}
          >
            {CATEGORY_LABELS[item.category]}
          </span>
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            {SCOPE_LABELS[item.scope]}
          </span>
          <span className="ml-auto text-[11px] uppercase tracking-wider text-slate-400">
            {sourceLabel}
          </span>
        </div>

        <h2 className="text-lg sm:text-xl font-black leading-tight tracking-tight text-slate-900 dark:text-white">
          {item.title}
        </h2>

        {item.description && (
          <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
            {item.description}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 pt-1 border-t border-slate-100 dark:border-white/6">
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" />
            {location}
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock3 className="h-3.5 w-3.5" />
            {formatPortalDate(item.published_at) ?? 'Sem data'}
          </span>
          {deadlineChip(item.deadline)}
          {item.external_url && (
            <span className="ml-auto inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 group-hover:text-indigo-500 transition-colors">
              Acessar fonte oficial
              <ArrowUpRight className="h-3.5 w-3.5" />
            </span>
          )}
        </div>
      </Wrapper>
    </motion.article>
  );
}

function CompactPortalCard({ item }: { item: PortalItem }) {
  const Wrapper = item.external_url ? 'a' : 'div';
  const linkProps = item.external_url
    ? { href: item.external_url, target: '_blank', rel: 'noopener noreferrer' }
    : {};
  return (
    <motion.div
      className="rounded-2xl overflow-hidden border border-slate-200/60 dark:border-white/8 bg-white dark:bg-slate-900/80 flex flex-col group"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22 }}
      whileHover={{ y: -3 }}
    >
      <CoverArea item={item} aspectClass="aspect-[3/1]" />
      <Wrapper {...linkProps} className="p-4">
        <div className="flex items-center gap-2 flex-wrap mb-2">
          <span
            className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${CATEGORY_COLORS[item.category]}`}
          >
            {CATEGORY_LABELS[item.category]}
          </span>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            {SCOPE_LABELS[item.scope]}
          </span>
        </div>
        <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-snug line-clamp-2">
          {item.title}
        </h3>
        {item.description && (
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 line-clamp-2">
            {item.description}
          </p>
        )}
        <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400">
          <span>{formatPortalDate(item.published_at) ?? 'Sem data'}</span>
          {item.external_url && (
            <span className="inline-flex items-center gap-1 text-indigo-500 font-semibold group-hover:text-indigo-400">
              Ver <ArrowUpRight className="h-3 w-3" />
            </span>
          )}
        </div>
      </Wrapper>
    </motion.div>
  );
}

function ScopeLane({ scope, items }: { scope: PortalItem['scope']; items: PortalItem[] }) {
  const meta = SCOPE_META[scope];
  const ScopeIcon = meta.icon;

  return (
    <article className={`rounded-2xl border p-4 sm:p-5 ${meta.containerClass}`}>
      <header className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
            <ScopeIcon className="h-4 w-4" />
            {meta.label}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{meta.subtitle}</p>
        </div>
        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-white/70 text-slate-600 dark:bg-slate-900/70 dark:text-slate-300">
          {items.length}
        </span>
      </header>

      {items.length === 0 ? (
        <div className="mt-4 rounded-xl border border-dashed border-slate-300/60 dark:border-slate-700/60 p-3 text-xs text-slate-500 dark:text-slate-400">
          Nenhum item nesta trilha no momento.
        </div>
      ) : (
        <div className="mt-4 space-y-2.5">
          {items.slice(0, 3).map(item => {
            const urgency = daysUntil(item.deadline);
            const baseClasses =
              'block rounded-xl border border-slate-200/80 dark:border-slate-700/70 bg-white/75 dark:bg-slate-900/65 p-3 hover:shadow-sm transition-shadow';
            const content = (
              <>
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <span
                    className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${CATEGORY_COLORS[item.category]}`}
                  >
                    {CATEGORY_LABELS[item.category]}
                  </span>
                  {urgency !== null && urgency >= 0 && urgency <= 10 && (
                    <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 inline-flex items-center gap-1">
                      <Flame className="h-3 w-3" />
                      {urgency === 0 ? 'Último dia' : `${urgency} dia(s)`}
                    </span>
                  )}
                </div>
                <p className="text-sm font-semibold text-slate-900 dark:text-white line-clamp-2">
                  {item.title}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5">
                  {formatPortalDate(item.published_at) ?? 'Sem data'}
                </p>
              </>
            );

            if (!item.external_url) {
              return (
                <div key={`${scope}-${item.source}-${item.external_id}`} className={baseClasses}>
                  {content}
                </div>
              );
            }

            return (
              <a
                key={`${scope}-${item.source}-${item.external_id}`}
                href={item.external_url}
                target="_blank"
                rel="noopener noreferrer"
                className={baseClasses}
              >
                {content}
              </a>
            );
          })}
        </div>
      )}
    </article>
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

  const heroItems = React.useMemo(() => {
    if (filtered.length === 0) return [];
    const localFirst = filtered.filter(item => item.scope !== 'nacional');
    const base = localFirst.length > 0 ? localFirst : filtered;
    return base.slice(0, 3);
  }, [filtered]);

  const featuredItem = heroItems[0];
  const spotlightItems = heroItems.slice(1);
  const heroKeys = new Set(heroItems.map(item => `${item.source}-${item.external_id}`));
  const feedItems = filtered.filter(item => !heroKeys.has(`${item.source}-${item.external_id}`));

  const municipalItems = filtered.filter(item => item.scope === 'municipal');
  const estadualItems = filtered.filter(item => item.scope === 'estadual');
  const nacionalItems = filtered.filter(item => item.scope === 'nacional');
  const urgentItems = filtered.filter(item => {
    const d = daysUntil(item.deadline);
    return d !== null && d >= 0 && d <= 7;
  });
  const urgentItemsCount = urgentItems.length;
  const deadlineItems = filtered
    .filter(item => item.deadline)
    .sort((a, b) => nearestDeadlineDays(a) - nearestDeadlineDays(b));
  const nextDeadlines = deadlineItems.slice(0, 5);
  const officialLinks = filtered
    .filter(item => item.external_url)
    .slice(0, 6)
    .map(item => ({
      key: `${item.source}-${item.external_id}`,
      title: item.title,
      url: item.external_url as string,
      source: SOURCE_LABELS[item.source],
    }));

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
                <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-4 sm:gap-5">
                  <div className="space-y-4">
                    <section className="xl:hidden grid grid-cols-2 gap-2">
                      <a
                        href="#sec-destaque"
                        className="rounded-xl border border-cyan-200/70 dark:border-cyan-700/40 bg-white/85 dark:bg-slate-900/60 p-3"
                      >
                        <p className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">
                          Destaques
                        </p>
                        <p className="text-lg font-black text-slate-900 dark:text-white mt-1">
                          {heroItems.length}
                        </p>
                      </a>
                      <a
                        href="#sec-prazos"
                        className="rounded-xl border border-red-200/70 dark:border-red-700/40 bg-red-50/70 dark:bg-red-950/20 p-3"
                      >
                        <p className="text-[11px] uppercase tracking-wide text-red-600 dark:text-red-300">
                          Prazos críticos
                        </p>
                        <p className="text-lg font-black text-red-700 dark:text-red-200 mt-1">
                          {urgentItemsCount}
                        </p>
                      </a>
                    </section>

                    {featuredItem && (
                      <section id="sec-destaque" className="space-y-3 scroll-mt-24">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <h2 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white">
                            Agora na sua região
                          </h2>
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            Curadoria atualizada em tempo real
                          </span>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
                          <div className="rounded-xl border border-slate-200/70 dark:border-slate-700/50 bg-white/85 dark:bg-slate-900/65 p-3">
                            <p className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">
                              Municipal
                            </p>
                            <p className="text-xl font-black text-slate-900 dark:text-white mt-1">
                              {municipalItems.length}
                            </p>
                          </div>
                          <div className="rounded-xl border border-slate-200/70 dark:border-slate-700/50 bg-white/85 dark:bg-slate-900/65 p-3">
                            <p className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">
                              Estadual
                            </p>
                            <p className="text-xl font-black text-slate-900 dark:text-white mt-1">
                              {estadualItems.length}
                            </p>
                          </div>
                          <div className="rounded-xl border border-slate-200/70 dark:border-slate-700/50 bg-white/85 dark:bg-slate-900/65 p-3">
                            <p className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">
                              Federal
                            </p>
                            <p className="text-xl font-black text-slate-900 dark:text-white mt-1">
                              {nacionalItems.length}
                            </p>
                          </div>
                          <div className="rounded-xl border border-red-200/70 dark:border-red-700/40 bg-red-50/70 dark:bg-red-950/20 p-3">
                            <p className="text-[11px] uppercase tracking-wide text-red-600 dark:text-red-300">
                              Prazos críticos
                            </p>
                            <p className="text-xl font-black text-red-700 dark:text-red-200 mt-1">
                              {urgentItemsCount}
                            </p>
                          </div>
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

                    <section id="sec-trilhas" className="space-y-3 scroll-mt-24">
                      <h3 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-white">
                        Trilhas por alcance
                      </h3>
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
                        <ScopeLane scope="municipal" items={municipalItems} />
                        <ScopeLane scope="estadual" items={estadualItems} />
                        <ScopeLane scope="nacional" items={nacionalItems} />
                      </div>
                    </section>

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

                  <aside className="hidden xl:flex flex-col gap-4 sticky top-24 self-start">
                    <section className="rounded-2xl border border-slate-200/70 dark:border-slate-700/50 bg-white/85 dark:bg-slate-900/65 p-4">
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                        Radar rápido
                      </h3>
                      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                        <div className="rounded-lg bg-slate-100/80 dark:bg-slate-800/70 p-2">
                          <p className="text-slate-500 dark:text-slate-400">Municipal</p>
                          <p className="font-bold text-slate-900 dark:text-white">
                            {municipalItems.length}
                          </p>
                        </div>
                        <div className="rounded-lg bg-slate-100/80 dark:bg-slate-800/70 p-2">
                          <p className="text-slate-500 dark:text-slate-400">Estadual</p>
                          <p className="font-bold text-slate-900 dark:text-white">
                            {estadualItems.length}
                          </p>
                        </div>
                        <div className="rounded-lg bg-slate-100/80 dark:bg-slate-800/70 p-2">
                          <p className="text-slate-500 dark:text-slate-400">Federal</p>
                          <p className="font-bold text-slate-900 dark:text-white">
                            {nacionalItems.length}
                          </p>
                        </div>
                        <div className="rounded-lg bg-red-50 dark:bg-red-950/20 p-2">
                          <p className="text-red-600 dark:text-red-300">Prazos críticos</p>
                          <p className="font-bold text-red-700 dark:text-red-200">
                            {urgentItemsCount}
                          </p>
                        </div>
                      </div>
                    </section>

                    <section
                      id="sec-prazos"
                      className="rounded-2xl border border-slate-200/70 dark:border-slate-700/50 bg-white/85 dark:bg-slate-900/65 p-4 scroll-mt-24"
                    >
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                        Próximos prazos
                      </h3>
                      <div className="mt-3 space-y-2.5">
                        {nextDeadlines.length === 0 ? (
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            Sem prazos registrados.
                          </p>
                        ) : (
                          nextDeadlines.map(item =>
                            item.external_url ? (
                              <a
                                key={`deadline-${item.source}-${item.external_id}`}
                                href={item.external_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block rounded-xl border border-slate-200/70 dark:border-slate-700/60 p-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                              >
                                <p className="text-xs font-semibold text-slate-900 dark:text-white line-clamp-2">
                                  {item.title}
                                </p>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                                  {item.deadline && `Prazo: ${formatPortalDate(item.deadline)}`}
                                </p>
                              </a>
                            ) : (
                              <div
                                key={`deadline-${item.source}-${item.external_id}`}
                                className="rounded-xl border border-slate-200/70 dark:border-slate-700/60 p-2.5"
                              >
                                <p className="text-xs font-semibold text-slate-900 dark:text-white line-clamp-2">
                                  {item.title}
                                </p>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                                  {item.deadline && `Prazo: ${formatPortalDate(item.deadline)}`}
                                </p>
                              </div>
                            )
                          )
                        )}
                      </div>
                    </section>

                    <section className="rounded-2xl border border-slate-200/70 dark:border-slate-700/50 bg-white/85 dark:bg-slate-900/65 p-4">
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                        Fontes oficiais
                      </h3>
                      <div className="mt-3 space-y-2">
                        {officialLinks.length === 0 ? (
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            Sem links de referência no filtro atual.
                          </p>
                        ) : (
                          officialLinks.map(link => (
                            <a
                              key={`official-${link.key}`}
                              href={link.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block rounded-lg border border-slate-200/70 dark:border-slate-700/60 p-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                            >
                              <p className="text-xs font-semibold text-slate-900 dark:text-white line-clamp-2">
                                {link.title}
                              </p>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                                {link.source}
                              </p>
                            </a>
                          ))
                        )}
                      </div>
                    </section>
                  </aside>
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
