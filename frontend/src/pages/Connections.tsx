// pages/Connections.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  Star,
  Heart,
  ThumbsUp,
  Music,
  Trophy,
  Search,
  X,
  Filter,
  Trash2,
  CheckCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Layout from '../components/Layout/Layout';
import Loading from '../components/common/Loading';
import { StatCard } from '../components/ui/StatCard';
import TiltCard from '../components/common/TiltCard';
import { connectionService } from '../services/connectionService';
import { useConnectionsPage, useConnectionsPaginated } from '../hooks/useConnections';
import type { Connection, ConnectionType } from '../types';
import {
  INSTRUMENT_LABELS,
  formatInstrumentLabel,
  getMusicianInstruments,
  normalizeInstrumentKey,
} from '../utils/formatting';
import InstrumentIcon from '../components/common/InstrumentIcon';
import { showToast } from '../utils/toast';
import { logError } from '../utils/logger';
import VirtualList from '../components/common/VirtualList';

const connectionLabels: Record<string, string> = {
  follow: 'Favoritar',
  recommend: 'Indicar',
  played_with: 'Já toquei',
};

const connectionLabelsActive: Record<string, string> = {
  follow: 'Favoritado',
  recommend: 'Indicado',
  played_with: 'Tocamos juntos',
};

const connectionIcons: Record<string, React.FC<{ className?: string }>> = {
  follow: Heart,
  recommend: ThumbsUp,
  played_with: Music,
};

// Tipos de conexão ativos (sem call_later)
const activeConnectionTypes = ['follow', 'recommend', 'played_with'] as const;

const getInstrumentLabel = (instrument: string): string => {
  const normalized = normalizeInstrumentKey(instrument);
  return formatInstrumentLabel(normalized) || instrument;
};

// Progress Ring SVG Component
const ProgressRing: React.FC<{ percentage: number; size?: number; strokeWidth?: number }> = ({
  percentage,
  size = 48,
  strokeWidth = 4,
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <svg className="progress-ring" width={size} height={size}>
      <circle
        className="stroke-gray-200 dark:stroke-slate-700"
        fill="transparent"
        strokeWidth={strokeWidth}
        r={radius}
        cx={size / 2}
        cy={size / 2}
      />
      <motion.circle
        className="progress-ring__circle stroke-primary-500"
        fill="transparent"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        r={radius}
        cx={size / 2}
        cy={size / 2}
        initial={{ strokeDashoffset: circumference }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        style={{
          strokeDasharray: `${circumference} ${circumference}`,
        }}
      />
    </svg>
  );
};

const Connections: React.FC = () => {
  const [loadingAction, setLoadingAction] = useState(false);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [instrumentFilter, setInstrumentFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<string>('follow');

  // Use SWR hooks for data fetching
  const {
    connections,
    badgeData,
    musicians,
    musiciansCount,
    hasMoreMusicians,
    loadMoreMusicians,
    resetMusicians,
    validatingMusicians,
    isLoading,
    mutateConnections,
  } = useConnectionsPage({
    musicianSearch: debouncedSearch || undefined,
    musicianInstrument: instrumentFilter !== 'all' ? instrumentFilter : undefined,
  });

  const instrumentOptions = useMemo(() => {
    const normalized = new Map<string, string>();
    Object.keys(INSTRUMENT_LABELS).forEach(key => {
      const normalizedKey = normalizeInstrumentKey(key);
      if (!normalizedKey) return;
      if (normalized.has(normalizedKey)) return;
      normalized.set(normalizedKey, formatInstrumentLabel(normalizedKey));
    });

    return Array.from(normalized.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, []);

  const {
    connections: connectionsPage,
    hasMore: hasMoreConnections,
    loadMore: loadMoreConnections,
    reset: resetConnectionsPage,
    isLoading: loadingConnectionsPage,
    isLoadingMore: loadingConnectionsMore,
    mutate: mutateConnectionsPage,
  } = useConnectionsPaginated({ type: activeTab });

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    resetMusicians();
  }, [debouncedSearch, instrumentFilter, resetMusicians]);

  useEffect(() => {
    resetConnectionsPage();
  }, [activeTab, resetConnectionsPage]);

  const stats = useMemo(() => {
    const totals: Record<string, number> = { follow: 0, recommend: 0, played_with: 0 };
    (connections || []).forEach(c => {
      if (c.connection_type in totals) {
        totals[c.connection_type] = (totals[c.connection_type] || 0) + 1;
      }
    });
    return totals;
  }, [connections]);

  const connectionMap = useMemo(() => {
    const map: Record<number, Partial<Record<ConnectionType, Connection>>> = {};
    (connections || []).forEach(c => {
      if (!map[c.target.id]) map[c.target.id] = {};
      map[c.target.id][c.connection_type] = c;
    });
    return map;
  }, [connections]);

  const grouped = useMemo(() => {
    const groups: Record<string, Connection[]> = { follow: [], recommend: [], played_with: [] };
    (connections || []).forEach(c => {
      if (c.connection_type in groups) {
        groups[c.connection_type].push(c);
      }
    });
    return groups;
  }, [connections]);

  const activeTabCount = grouped[activeTab]?.length ?? 0;

  const handleToggle = async (targetId: number, type: ConnectionType) => {
    const existing = connectionMap[targetId]?.[type];
    setLoadingAction(true);
    try {
      if (existing) {
        await connectionService.delete(existing.id);
      } else {
        await connectionService.create({ target_id: targetId, connection_type: type });
      }
      // Revalidate connections cache
      mutateConnections();
      mutateConnectionsPage();
    } catch (error) {
      logError('Erro ao alternar conexão:', error);
      showToast.apiError(error);
    } finally {
      setLoadingAction(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await connectionService.delete(id);
      // Revalidate connections cache
      mutateConnections();
      mutateConnectionsPage();
    } catch (error) {
      logError('Erro ao remover conexão:', error);
      showToast.apiError(error);
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="page-stack">
          <div className="hero-panel">
            <div className="h-6 w-48 rounded-full bg-gray-200 animate-pulse" />
            <div className="mt-3 h-4 w-72 rounded-full bg-gray-200 animate-pulse" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, idx) => (
                <div key={`conn-skeleton-${idx}`} className="card-contrast flex items-center gap-4">
                  <div className="h-14 w-14 rounded-full bg-gray-200 animate-pulse" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-40 rounded-full bg-gray-200 animate-pulse" />
                    <div className="h-3 w-28 rounded-full bg-gray-200 animate-pulse" />
                  </div>
                  <div className="h-8 w-20 rounded-full bg-gray-200 animate-pulse" />
                </div>
              ))}
            </div>
            <div className="space-y-4">
              <div className="card-contrast">
                <div className="h-5 w-36 rounded-full bg-gray-200 animate-pulse" />
                <div className="mt-4 grid grid-cols-2 gap-3">
                  {Array.from({ length: 4 }).map((_, idx) => (
                    <div
                      key={`badge-skeleton-${idx}`}
                      className="h-20 rounded-xl bg-gray-200 animate-pulse"
                    />
                  ))}
                </div>
              </div>
              <Loading text="Carregando rede e badges..." />
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
        <div className="page-stack overflow-x-hidden">
          {/* Hero Panel com Gradiente Animado */}
          <div className="hero-panel hero-animated fade-in-up">
          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            {/* Título e descrição */}
            <div className="flex items-center gap-4">
              <motion.div
                className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center shadow-lg"
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15 }}
              >
                <Users className="h-8 w-8 text-white" />
              </motion.div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  Rede & Badges
                </h1>
                <p className="text-gray-600 dark:text-slate-300">
                  Construa sua rede e acompanhe suas conquistas no app
                </p>
              </div>
            </div>

            {/* TiltCard com resumo */}
            <TiltCard className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-xl p-4 border border-white/50 dark:border-slate-700/50 shadow-lg max-w-xs">
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-primary-600">{stats.follow}</p>
                  <p className="text-xs text-gray-500 dark:text-slate-400">Favoritos</p>
                </div>
                <div className="h-8 w-px bg-gray-200 dark:bg-slate-600" />
                <div className="text-center">
                  <p className="text-2xl font-bold text-emerald-600">{stats.played_with}</p>
                  <p className="text-xs text-gray-500 dark:text-slate-400">Já toquei</p>
                </div>
                <div className="h-8 w-px bg-gray-200 dark:bg-slate-600" />
                <div className="text-center">
                  <p className="text-2xl font-bold text-amber-600">{badgeData.earned.length}</p>
                  <p className="text-xs text-gray-500 dark:text-slate-400">Badges</p>
                </div>
              </div>
            </TiltCard>
          </div>

            {/* Stats Cards com ícones */}
            <div className="relative z-10 grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
              <StatCard
                label={connectionLabels.follow}
                value={stats.follow || 0}
                icon={Heart}
                iconColor="text-rose-500"
              />
            <StatCard
              label={connectionLabels.recommend}
              value={stats.recommend || 0}
              icon={ThumbsUp}
              iconColor="text-emerald-500"
            />
            <StatCard
              label={connectionLabels.played_with}
              value={stats.played_with || 0}
              icon={Music}
              iconColor="text-indigo-500"
            />
              <StatCard
                label="Badges"
                value={badgeData.earned.length}
                icon={Trophy}
                iconColor="text-amber-500"
                accent
              />
            </div>

            {/* Regras rapidas para dar contexto */}
            <div className="relative z-10 mt-6 rounded-2xl border border-white/60 bg-white/85 p-4 text-sm text-gray-700 shadow-lg backdrop-blur dark:border-white/10 dark:bg-slate-900/40 dark:text-slate-200">
              <p className="font-semibold text-gray-900 dark:text-white">Como funciona</p>
              <p className="mt-1 text-xs text-gray-600 dark:text-slate-300">
                Use as conexões para organizar sua rede. Badges são conquistas automáticas conforme
                você usa o app.
              </p>
              <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="rounded-xl border border-rose-100 bg-rose-50/70 px-3 py-2 dark:border-rose-900/40 dark:bg-rose-950/20">
                  <span className="font-semibold text-rose-700 dark:text-rose-200">Favoritar</span>
                  <span className="ml-2 text-xs text-rose-700/80 dark:text-rose-200/80">
                    Salve para achar rápido
                  </span>
                </div>
                <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 px-3 py-2 dark:border-emerald-900/40 dark:bg-emerald-950/15">
                  <span className="font-semibold text-emerald-700 dark:text-emerald-200">
                    Indicar
                  </span>
                  <span className="ml-2 text-xs text-emerald-700/80 dark:text-emerald-200/80">
                    Recomendação rápida
                  </span>
                </div>
                <div className="rounded-xl border border-indigo-100 bg-indigo-50/70 px-3 py-2 dark:border-indigo-900/40 dark:bg-indigo-950/15">
                  <span className="font-semibold text-indigo-700 dark:text-indigo-200">
                    Já toquei
                  </span>
                  <span className="ml-2 text-xs text-indigo-700/80 dark:text-indigo-200/80">
                    Registre parcerias
                  </span>
                </div>
              </div>
            </div>
          </div>

        <div className="grid gap-6 lg:grid-cols-[1.6fr,1fr]">
          {/* Conexões */}
          <div className="card space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Gerenciar conexões
                </h2>
                <p className="text-sm text-gray-600 dark:text-slate-300">
                  Favorite músicos e registre colaborações
                </p>
              </div>
              <Link
                to="/musicos"
                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full border border-indigo-200 bg-white/80 px-4 py-2 text-sm font-semibold text-indigo-700 shadow-sm hover:bg-indigo-50 transition-all touch-manipulation active:scale-[0.99] dark:border-white/10 dark:bg-slate-900/40 dark:text-indigo-200 dark:hover:bg-slate-900/60"
              >
                <Users className="h-4 w-4" />
                <span>Ver músicos</span>
              </Link>
            </div>

            {/* Área de Busca/Filtro Melhorada */}
            <div className="bg-gray-50 rounded-xl p-4 dark:bg-slate-800/60">
              <div className="flex flex-col md:flex-row gap-3">
                <div className="flex-1">
                  <label className="text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1 block">
                    Buscar músico
                  </label>
                  <div className="relative">
                    <input
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      className="input-field h-12 pl-10 pr-10"
                      placeholder="Nome ou @username"
                    />
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <AnimatePresence>
                      {search && (
                        <motion.button
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          onClick={() => setSearch('')}
                          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors"
                        >
                          <X className="h-4 w-4 text-gray-500" />
                        </motion.button>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
                <div className="w-full md:w-52">
                  <label className="text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1 block">
                    Filtrar por instrumento
                  </label>
                  <div className="relative">
                    <select
                      value={instrumentFilter}
                      onChange={e => setInstrumentFilter(e.target.value)}
                      className="input-field h-12 pl-10 appearance-none cursor-pointer"
                    >
                      <option value="all">Todos instrumentos</option>
                      {instrumentOptions.map(([key, label]) => (
                        <option key={key} value={key}>
                          {label}
                        </option>
                      ))}
                    </select>
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Contador de resultados */}
              <div className="mt-3 flex items-center justify-between">
                <p className="text-sm text-gray-500 dark:text-slate-400">
                  Mostrando{' '}
                  <span className="font-semibold text-gray-700 dark:text-slate-200">
                    {musicians.length}
                  </span>{' '}
                  de{' '}
                  <span className="font-semibold text-gray-700 dark:text-slate-200">
                    {musiciansCount || musicians.length}
                  </span>{' '}
                  músicos
                </p>
              </div>

              {/* Lista de Músicos */}
              {musicians.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-8"
                >
                  <p className="text-4xl mb-2">🔍</p>
                  <p className="text-sm text-gray-500 dark:text-slate-400">
                    Nenhum músico encontrado.
                  </p>
                </motion.div>
              ) : (
                <VirtualList
                  items={musicians}
                  itemHeight={220}
                  itemGap={12}
                  containerHeight={500}
                  className="pr-1 sm:pr-2 mt-4"
                  renderItem={(m, index) => {
                    const instruments = Array.from(
                      new Set(
                        getMusicianInstruments(m)
                          .map(inst => normalizeInstrumentKey(inst))
                          .filter(Boolean)
                      )
                    );
                    const primaryInstrument = instruments[0] || normalizeInstrumentKey(m.instrument);
                    const active = connectionMap[m.id] || {};
                    const profilePhoto = m.avatar_url;

                    return (
                      <motion.div
                        key={m.id}
                        className="musician-card-enhanced overflow-hidden h-full"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.03 }}
                      >
                        {/* Shine effect element */}
                        <div className="shine-effect" />

                        <div className="flex items-center gap-4 mb-4">
                          {/* Avatar com foto ou ícone */}
                          <motion.div
                            className="relative h-14 w-14 rounded-full flex-shrink-0 overflow-hidden"
                            whileHover={{ scale: 1.08 }}
                            transition={{ type: 'spring', stiffness: 300 }}
                          >
                            {profilePhoto ? (
                              <img
                                src={profilePhoto}
                                alt={m.full_name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="h-full w-full bg-gradient-to-br from-primary-100 to-primary-50 dark:from-primary-900/40 dark:to-primary-800/30 flex items-center justify-center">
                                <InstrumentIcon instrument={primaryInstrument} size={28} />
                              </div>
                            )}
                          </motion.div>

                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-gray-900 dark:text-white truncate">
                              {m.full_name}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-slate-400">
                              @{m.user.username}
                            </p>
                            {instruments.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 mt-2">
                                {(instruments || []).map(inst => (
                                  <span
                                    key={inst}
                                    className="inline-flex items-center gap-1 rounded-full border border-primary-100 bg-primary-50/80 px-2 py-0.5 text-xs font-medium text-primary-700 dark:border-primary-800/50 dark:bg-primary-900/30 dark:text-primary-300"
                                  >
                                    <InstrumentIcon instrument={inst} size={12} />
                                    <span>{getInstrumentLabel(inst)}</span>
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Botões de Conexão Modernos */}
                        <div className="grid grid-cols-3 gap-2">
                          {activeConnectionTypes.map(type => {
                            const isOn = Boolean(active[type]);
                            const Icon = connectionIcons[type];
                            return (
                              <motion.button
                                key={type}
                                onClick={() => handleToggle(m.id, type as ConnectionType)}
                                className={`connection-pill-modern ${isOn ? `active ${type}` : ''}`}
                                disabled={loadingAction}
                                whileTap={{ scale: 0.95 }}
                                whileHover={{ scale: 1.02 }}
                              >
                                <Icon className="h-4 w-4" />
                                <span className="hidden sm:inline">
                                  {isOn ? connectionLabelsActive[type] : connectionLabels[type]}
                                </span>
                              </motion.button>
                            );
                          })}
                        </div>
                      </motion.div>
                    );
                  }}
                />
              )}
              {hasMoreMusicians && (
                <div className="mt-3 flex justify-center">
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={loadMoreMusicians}
                    disabled={validatingMusicians}
                  >
                    {validatingMusicians ? 'Carregando...' : 'Carregar mais musicos'}
                  </button>
                </div>
              )}
            </div>

            {/* Tabs de Conexões Agrupadas */}
            <div className="mt-6">
              <h3 className="text-base font-semibold text-gray-900 mb-3">Suas conexões</h3>

              {/* Tab Navigation */}
              <div className="tab-navigation mb-4">
                {activeConnectionTypes.map(type => {
                  const Icon = connectionIcons[type];
                  return (
                    <button
                      key={type}
                      onClick={() => setActiveTab(type)}
                      className={`tab-button ${activeTab === type ? 'active' : ''}`}
                    >
                      <span className="flex items-center justify-center gap-2">
                        <Icon className="h-4 w-4" />
                        <span>{connectionLabels[type]}</span>
                        <span className="text-xs opacity-60">({grouped[type].length})</span>
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Tab Content */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white/95 dark:bg-slate-900/80 p-4 min-h-[180px]"
                >
                  {loadingConnectionsPage ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <p className="text-sm text-gray-500 dark:text-slate-400">
                        Carregando conexoes...
                      </p>
                    </div>
                  ) : activeTabCount === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <p className="text-3xl mb-2">
                        {activeTab === 'follow' ? '💝' : activeTab === 'recommend' ? '👍' : '🎸'}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-slate-400">
                        Nenhuma conexão neste grupo ainda.
                      </p>
                    </div>
                  ) : (
                    <div>
                      <VirtualList
                        items={connectionsPage}
                        itemHeight={80}
                        itemGap={8}
                        containerHeight={320}
                        renderItem={(c, index) => {
                          const targetPhoto = c.target.avatar_url;
                          return (
                            <motion.div
                              key={c.id}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: index * 0.03 }}
                              className="flex h-full items-center justify-between rounded-xl border border-gray-100 dark:border-slate-700 bg-gray-50/80 dark:bg-slate-800/50 px-4 py-3 hover:bg-gray-100/80 dark:hover:bg-slate-800/80 transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                <div className="mini-avatar">
                                  {targetPhoto ? (
                                    <img src={targetPhoto} alt={c.target.full_name} />
                                  ) : (
                                    <InstrumentIcon instrument={c.target.instrument} size={16} />
                                  )}
                                </div>
                                <div>
                                  <p className="font-semibold text-gray-900 text-sm">
                                    {c.target.full_name}
                                  </p>
                                  <p className="text-xs text-gray-500 dark:text-slate-400">
                                    {formatInstrumentLabel(c.target.instrument)}
                                    {c.verified && c.connection_type === 'played_with' && (
                                      <span className="ml-2 inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                                        <CheckCircle className="h-3 w-3" />
                                        Verificado
                                      </span>
                                    )}
                                  </p>
                                </div>
                              </div>
                              <motion.button
                                onClick={() => handleDelete(c.id)}
                                className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                disabled={loadingAction}
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </motion.button>
                            </motion.div>
                          );
                        }}
                      />
                      {hasMoreConnections && (
                        <div className="mt-3 flex justify-center">
                          <button
                            type="button"
                            className="btn-primary"
                            onClick={loadMoreConnections}
                            disabled={loadingConnectionsMore}
                          >
                            {loadingConnectionsMore ? 'Carregando...' : 'Carregar mais conexoes'}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          {/* Badges */}
          <div className="space-y-4">
            {/* Badges Conquistadas */}
            <div className="card hero-animated overflow-hidden">
              <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-4">
                  <motion.div
                    className="h-10 w-10 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-md"
                    whileHover={{ scale: 1.1, rotate: 5 }}
                  >
                    <Star className="h-5 w-5 text-white" />
                  </motion.div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Badges conquistadas
                    </h2>
                    <p className="text-sm text-gray-600 dark:text-slate-300">
                      {badgeData.earned.length} conquistas
                    </p>
                  </div>
                </div>

                {badgeData.earned.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-8"
                  >
                    <p className="text-4xl mb-2">🎯</p>
                    <p className="text-sm text-gray-500 dark:text-slate-400">Nenhuma badge ainda</p>
                    <p className="text-xs text-subtle mt-1">
                      Continue progredindo para conquistar!
                    </p>
                  </motion.div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {badgeData.earned.map((badge, index) => (
                      <motion.div
                        key={badge.id}
                        className="relative rounded-xl border border-amber-200 dark:border-amber-800/50 bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-900/30 dark:to-yellow-900/20 p-4 overflow-hidden group"
                        initial={{ opacity: 0, scale: 0.8, rotate: -10 }}
                        animate={{ opacity: 1, scale: 1, rotate: 0 }}
                        transition={{ duration: 0.4, delay: index * 0.1, type: 'spring' }}
                        whileHover={{
                          scale: 1.05,
                          boxShadow: '0 8px 24px rgba(251, 191, 36, 0.3)',
                        }}
                      >
                        {/* Glow effect on hover */}
                        <div className="absolute inset-0 bg-gradient-to-br from-amber-400/0 to-yellow-400/0 group-hover:from-amber-400/10 group-hover:to-yellow-400/10 transition-all duration-300 pointer-events-none" />

                        <div className="relative text-center">
                          <motion.span
                            className="text-4xl block mb-2 badge-shake"
                            whileHover={{ scale: 1.2 }}
                          >
                            {badge.icon || '🏅'}
                          </motion.span>
                          <p className="font-semibold text-amber-900 dark:text-amber-100 text-sm truncate">
                            {badge.name}
                          </p>
                          <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                            {badge.awarded_at
                              ? new Date(badge.awarded_at).toLocaleDateString('pt-BR')
                              : '—'}
                          </p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Badges Disponíveis (com progresso) */}
            <div className="card">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-lg bg-gray-100 dark:bg-slate-800 flex items-center justify-center">
                  <span className="text-xl">🔒</span>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Próximas conquistas
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-slate-300">
                    Continue progredindo!
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {badgeData.available.map((badge, index) => (
                  <motion.div
                    key={badge.slug}
                    className="rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50/80 dark:bg-slate-800/50 p-4 group"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    whileHover={{ borderColor: 'rgba(99, 102, 241, 0.3)' }}
                  >
                    <div className="flex items-start gap-4">
                      {/* Progress Ring com Emoji */}
                      <div className="relative flex-shrink-0">
                        <ProgressRing percentage={badge.percentage} size={56} strokeWidth={4} />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-xl grayscale opacity-60 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-300">
                            {badge.icon}
                          </span>
                        </div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-semibold text-gray-700 dark:text-slate-200">
                            {badge.name}
                          </p>
                          <span className="text-sm font-bold text-primary-600 dark:text-primary-400">
                            {badge.percentage}%
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-slate-400 mb-3">
                          {badge.description}
                        </p>

                        {/* Barra de progresso com gradiente */}
                        <div className="relative h-2 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
                          <motion.div
                            className="absolute inset-y-0 left-0 rounded-full"
                            style={{
                              background: 'linear-gradient(90deg, #6366f1, #8b5cf6, #a855f7)',
                              backgroundSize: '200% 100%',
                            }}
                            initial={{ width: 0 }}
                            animate={{
                              width: `${badge.percentage}%`,
                              backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
                            }}
                            transition={{
                              width: { duration: 0.8, delay: index * 0.1 },
                              backgroundPosition: { duration: 3, repeat: Infinity, ease: 'linear' },
                            }}
                          />
                        </div>

                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-gray-500 dark:text-slate-400">
                            {badge.current}/{badge.required}
                          </span>
                          {badge.extra_condition && (
                            <span className="text-xs text-subtle italic">
                              {badge.extra_condition}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}

                {badgeData.available.length === 0 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-8"
                  >
                    <p className="text-4xl mb-2">🏆</p>
                    <p className="text-sm text-gray-500 dark:text-slate-400">
                      Todas as badges conquistadas!
                    </p>
                    <p className="text-xs text-subtle mt-1">
                      Parabéns, você é incrível!
                    </p>
                  </motion.div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Connections;
