// pages/EventsList.tsx
import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Plus,
  Calendar as CalendarIcon,
  Search,
  X,
  Users,
  Clock,
  Sparkles,
  Zap,
  Filter,
  Coins,
  Edit,
  Trash2,
  Ban,
} from 'lucide-react';
import Layout from '../components/Layout/Layout';
import PullToRefresh from '../components/common/PullToRefresh';
import { SkeletonCard } from '../components/common/Skeleton';
import { useEvents, usePendingResponsesCount } from '../hooks/useEvents';
import { useAuth } from '../contexts/AuthContext';
import ConfirmModal from '../components/modals/ConfirmModal';
import type { Availability, Event } from '../types';
import { format, parseISO, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getEventComputedStatus } from '../utils/events';
import { formatCurrency, formatInstrumentLabel, getMusicianDisplayName } from '../utils/formatting';
import { eventService } from '../services/eventService';
import { showToast } from '../utils/toast';

type TimeFilter = 'upcoming' | 'past' | 'all';

const toName = (availability: Availability): string => {
  const musician = availability.musician;
  const name = getMusicianDisplayName(musician);
  const instrument = formatInstrumentLabel(musician?.instrument);
  return instrument ? `${name} (${instrument})` : name;
};

const extractLineup = (event: Event): string[] => {
  const names = new Set<string>();
  const availList = event.availabilities || [];
  if (availList.length) {
    availList.forEach(a => {
      const label = toName(a);
      if (label) names.add(label);
    });
  }
  if (event.created_by_name) {
    names.add(event.is_solo ? `${event.created_by_name} (Solo)` : event.created_by_name);
  }
  return Array.from(names);
};

const summarizeLineup = (names: string[], max = 2): { visible: string[]; remaining: number } => {
  const cleaned = names.filter(Boolean);
  if (cleaned.length <= max) return { visible: cleaned, remaining: 0 };
  return { visible: cleaned.slice(0, max), remaining: cleaned.length - max };
};

const getStartDateTime = (event: Event): number => {
  try {
    if (event.start_datetime) {
      return parseISO(event.start_datetime).getTime();
    }
    if (event.event_date && event.start_time) {
      return parseISO(`${event.event_date}T${event.start_time}`).getTime();
    }
  } catch {
    // ignore parse errors
  }
  return 0;
};

const EventsList: React.FC = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const didInitFromUrl = useRef(false);
  const [filter, setFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('upcoming');
  const [showPendingResponses, setShowPendingResponses] = useState(false);
  const [pendingAction, setPendingAction] = useState<null | { type: 'cancel' | 'delete'; event: Event }>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const { count: pendingResponsesCount } = usePendingResponsesCount();

  useEffect(() => {
    if (didInitFromUrl.current) return;
    didInitFromUrl.current = true;

    const pending = searchParams.get('pending_responses');
    if (pending === 'true' || pending === '1') {
      setShowPendingResponses(true);
      setTimeFilter('all');
      setFilter('all');
    }
  }, [searchParams]);

  // Debounce search term - single effect, no duplicate calls
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Build params for SWR hook
  const params = useMemo(() => {
    const p: Record<string, string | boolean> = {};
    if (filter !== 'all') {
      p.status = filter === 'confirmed' ? 'confirmed,approved' : filter;
    }
    if (debouncedSearch) {
      p.search = debouncedSearch;
    }
    if (showPendingResponses) {
      p.pending_responses = true;
      p.my_proposals = true;
    } else {
      if (timeFilter === 'upcoming') {
        p.upcoming = true;
      } else if (timeFilter === 'past') {
        p.past = true;
      }
    }
    return p;
  }, [filter, debouncedSearch, timeFilter, showPendingResponses]);

  const { events, count, isLoading, isLoadingMore, hasMore, loadMore, mutate } = useEvents(params);

  const handleRefresh = useCallback(async () => {
    await mutate();
  }, [mutate]);

  const currentUserId = user?.user?.id;

  const closeActionModal = useCallback(() => {
    if (actionLoading) return;
    setPendingAction(null);
  }, [actionLoading]);

  const handleConfirmAction = useCallback(async () => {
    if (!pendingAction) return;
    try {
      setActionLoading(true);
      if (pendingAction.type === 'cancel') {
        await eventService.cancel(pendingAction.event.id);
        showToast.eventCancelled();
      } else {
        await eventService.delete(pendingAction.event.id);
        showToast.eventDeleted();
      }
      setPendingAction(null);
      await mutate();
    } catch (error) {
      showToast.apiError(error);
    } finally {
      setActionLoading(false);
    }
  }, [pendingAction, mutate]);

  const groups = useMemo(() => {
    const byDate = new Map<string, Event[]>();
    events.forEach(event => {
      try {
        const key = format(parseISO(event.event_date), 'yyyy-MM-dd');
        if (!byDate.has(key)) byDate.set(key, []);
        byDate.get(key)!.push(event);
      } catch {
        // Skip events with invalid dates
      }
    });

    return Array.from(byDate.entries())
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([dateKey, list]) => {
        const dateObj = parseISO(dateKey);
        const today = startOfDay(new Date());
        const diffDays = Math.floor((dateObj.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        const relative =
          diffDays === 0 ? 'Hoje' : diffDays === 1 ? 'Amanhã' : diffDays === -1 ? 'Ontem' : null;

        const ring =
          diffDays < 0
            ? 'from-slate-200/70 via-slate-100/60 to-white/70 dark:from-white/10 dark:via-white/5 dark:to-white/5'
            : diffDays <= 7
              ? 'from-indigo-200/80 via-purple-200/70 to-white/70 dark:from-indigo-500/25 dark:via-purple-500/15 dark:to-white/5'
              : diffDays <= 30
                ? 'from-purple-200/70 via-fuchsia-200/60 to-white/70 dark:from-purple-500/25 dark:via-fuchsia-500/15 dark:to-white/5'
                : 'from-indigo-200/70 via-sky-200/50 to-white/70 dark:from-indigo-500/20 dark:via-sky-500/10 dark:to-white/5';

        return {
          dateKey,
          label: format(dateObj, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR }),
          relative,
          ring,
          count: list.length,
          events: list.sort((a, b) => getStartDateTime(a) - getStartDateTime(b)),
        };
      });
  }, [events]);

  const statistics = useMemo(() => {
    const confirmed = events.filter(ev => ev.status === 'confirmed' || ev.status === 'approved');
    return {
      total: count || events.length,
      confirmed: confirmed.length,
    };
  }, [events, count]);

  const clearSearch = useCallback(() => {
    setSearchTerm('');
  }, []);

  const togglePendingResponses = useCallback(() => {
    const next = !showPendingResponses;
    setShowPendingResponses(next);

    const nextParams = new URLSearchParams(searchParams);
    if (next) {
      nextParams.set('pending_responses', 'true');
      setTimeFilter('all');
      setFilter('all');
    } else {
      nextParams.delete('pending_responses');
    }
    setSearchParams(nextParams, { replace: true });
  }, [searchParams, setSearchParams, showPendingResponses]);

  const getStatusBorderClass = (status?: string) => {
    switch (status) {
      case 'proposed':
        return 'border-amber-200 dark:border-amber-700/60';
      case 'confirmed':
        return 'border-emerald-200 dark:border-emerald-700/60';
      case 'approved':
        return 'border-blue-200 dark:border-blue-700/60';
      case 'completed':
        return 'border-purple-200 dark:border-purple-700/60';
      case 'rejected':
        return 'border-rose-200 dark:border-rose-700/60';
      case 'cancelled':
        return 'border-gray-200 dark:border-slate-700';
      default:
        return 'border-slate-200 dark:border-slate-700';
    }
  };

  const getStatusSurfaceClass = (status?: string) => {
    switch (status) {
      case 'proposed':
        return 'bg-gradient-to-br from-amber-50/85 via-white/90 to-white/85 dark:from-amber-950/20 dark:via-slate-900/70 dark:to-slate-900/65';
      case 'confirmed':
        return 'bg-gradient-to-br from-emerald-50/85 via-white/90 to-white/85 dark:from-emerald-950/15 dark:via-slate-900/70 dark:to-slate-900/65';
      case 'approved':
        return 'bg-gradient-to-br from-blue-50/85 via-white/90 to-white/85 dark:from-blue-950/15 dark:via-slate-900/70 dark:to-slate-900/65';
      case 'completed':
        return 'bg-gradient-to-br from-purple-50/85 via-white/90 to-white/85 dark:from-purple-950/20 dark:via-slate-900/70 dark:to-slate-900/65';
      case 'rejected':
        return 'bg-gradient-to-br from-rose-50/85 via-white/90 to-white/85 dark:from-rose-950/15 dark:via-slate-900/70 dark:to-slate-900/65';
      case 'cancelled':
        return 'bg-gradient-to-br from-slate-50/85 via-white/90 to-white/85 dark:from-slate-950/20 dark:via-slate-900/70 dark:to-slate-900/65';
      default:
        return 'bg-white/90 dark:bg-slate-900/70';
    }
  };

  const renderEventCard = useCallback((event: Event) => {
    const lineup = extractLineup(event);
    const lineupSummary = summarizeLineup(lineup, 2);
    const startLabel = event.start_time ? event.start_time.slice(0, 5) : '--:--';
    const endLabel = event.end_time ? event.end_time.slice(0, 5) : '--:--';
    const computedStatus = getEventComputedStatus(event);
    const statusClass = `status-chip ${computedStatus.status || 'default'}`;
    const statusLabel = computedStatus.label;
    const borderClass = getStatusBorderClass(computedStatus.status);
    const surfaceClass = getStatusSurfaceClass(computedStatus.status);

    const canManage = Boolean(currentUserId && event.created_by === currentUserId && event.status !== 'cancelled');
    const destructiveType = event.status === 'confirmed' || event.status === 'approved' ? 'cancel' : 'delete';
    const destructiveLabel = destructiveType === 'cancel' ? 'Cancelar evento' : 'Excluir evento';

    return (
      <div key={event.id} className="relative">
        <Link
          to={`/eventos/${event.id}`}
          className={`group block rounded-2xl border border-l-4 ${borderClass} ${surfaceClass} backdrop-blur p-4 pr-24 shadow-lg hover:shadow-xl transition-all touch-manipulation active:scale-[0.99] hover:-translate-y-0.5`}
        >
          <div className="flex items-start gap-4">
            <div className="min-w-[70px] pr-3 border-r border-slate-200/70 dark:border-slate-700/60">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Início
              </div>
              <div className="mt-0.5 text-xl font-extrabold tabular-nums text-slate-900 dark:text-white">
                {startLabel}
              </div>
              <div className="text-[11px] font-semibold tabular-nums text-slate-500 dark:text-slate-400">
                até {endLabel}
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className={statusClass}>{statusLabel}</span>
                {event.is_solo && <span className="status-chip default">Solo</span>}
                {event.payment_amount !== null && event.payment_amount !== undefined && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-white/40 bg-white/70 px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm dark:border-white/10 dark:bg-slate-900/50 dark:text-slate-200">
                    <Coins className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-300" />
                    {formatCurrency(event.payment_amount)}
                  </span>
                )}
              </div>

              <h3 className="mt-1 text-lg font-semibold text-gray-900 dark:text-white truncate">
                {event.title}
              </h3>

              {event.location && (
                <p className="text-sm text-gray-600 dark:text-slate-300 truncate">
                  {event.location}
                </p>
              )}

              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-gray-700 dark:text-slate-200">
                <Users className="h-4 w-4 text-gray-500 dark:text-slate-400" />
                {lineupSummary.visible.map(name => (
                  <span
                    key={name}
                    className="inline-flex max-w-[240px] items-center gap-1 rounded-full bg-white/70 border border-slate-200/70 px-3 py-1 font-semibold text-slate-700 shadow-sm truncate dark:bg-slate-900/50 dark:border-slate-700/60 dark:text-slate-200"
                    title={name}
                  >
                    {name}
                  </span>
                ))}
                {lineupSummary.remaining > 0 && (
                  <span className="inline-flex items-center rounded-full bg-slate-100 border border-slate-200 px-3 py-1 font-semibold text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200">
                    +{lineupSummary.remaining}
                  </span>
                )}
              </div>

              <div className="mt-2 hidden sm:flex items-center gap-2 text-sm text-gray-700 dark:text-slate-200">
                <Clock className="h-4 w-4 text-gray-500 dark:text-slate-400" />
                <span className="tabular-nums">
                  {startLabel} - {endLabel}
                </span>
              </div>
            </div>
          </div>
        </Link>

        {canManage && (
          <div className="absolute right-3 top-3 z-10 flex items-center gap-2">
            <Link
              to={`/eventos/${event.id}/editar`}
              aria-label="Editar evento"
              title="Editar evento"
              className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-white/50 bg-white/70 text-indigo-700 shadow-sm backdrop-blur transition-all touch-manipulation active:scale-[0.99] hover:bg-white dark:border-white/10 dark:bg-slate-900/50 dark:text-indigo-200 dark:hover:bg-slate-900/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400/60"
            >
              <Edit className="h-5 w-5" />
            </Link>
            <button
              type="button"
              aria-label={destructiveLabel}
              title={destructiveLabel}
              disabled={actionLoading}
              onClick={() => setPendingAction({ type: destructiveType, event })}
              className={`inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-white/50 bg-white/70 shadow-sm backdrop-blur transition-all touch-manipulation active:scale-[0.99] hover:bg-white disabled:opacity-60 dark:border-white/10 dark:bg-slate-900/50 dark:hover:bg-slate-900/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400/60 ${
                destructiveType === 'cancel'
                  ? 'text-orange-700 hover:bg-orange-50/70 dark:text-orange-200 dark:hover:bg-orange-950/20'
                  : 'text-rose-700 hover:bg-rose-50/70 dark:text-rose-200 dark:hover:bg-rose-950/20'
              }`}
            >
              {destructiveType === 'cancel' ? <Ban className="h-5 w-5" /> : <Trash2 className="h-5 w-5" />}
            </button>
          </div>
        )}
      </div>
    );
  }, [actionLoading, currentUserId]);

  return (
    <Layout>
      <PullToRefresh onRefresh={handleRefresh} disabled={isLoading}>
      <div className="page-stack py-6 sm:py-8">
        <section className="hero-panel hero-animated">
          <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1 text-xs font-semibold text-indigo-700 shadow-sm border border-white/50 dark:bg-slate-900/40 dark:text-indigo-200 dark:border-white/10">
                <Sparkles className="h-4 w-4" />
                Painel de Eventos
              </div>
              <h1 className="mt-3 text-2xl sm:text-3xl font-bold text-gray-900">Meus eventos</h1>
              <p className="mt-1 text-sm text-gray-700">
                Total • {statistics.confirmed} confirmados
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <div className="rounded-2xl border border-indigo-200/70 bg-gradient-to-br from-indigo-50/80 via-white/90 to-white/70 px-4 py-3 text-sm font-semibold text-gray-800 shadow-lg backdrop-blur dark:border-indigo-800/60 dark:from-indigo-900/30 dark:via-slate-900/70 dark:to-slate-900/60">
                  <p className="text-xs uppercase tracking-wide text-gray-500">Total</p>
                  <p className="text-2xl text-indigo-700 dark:text-indigo-200">{statistics.total}</p>
                </div>
                <div className="rounded-2xl border border-emerald-100/70 bg-gradient-to-br from-emerald-50/80 via-white/90 to-white/70 px-4 py-3 text-sm font-semibold text-gray-800 shadow-lg backdrop-blur dark:border-emerald-800/60 dark:from-emerald-900/40 dark:via-slate-900/70 dark:to-slate-900/60">
                  <p className="text-xs uppercase tracking-wide text-gray-500">Confirmados</p>
                  <p className="text-2xl text-emerald-600">{statistics.confirmed}</p>
                </div>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 self-start">
              <Link
                to="/eventos/agenda"
                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full border border-indigo-200 bg-white/80 px-4 py-2 text-sm font-semibold text-indigo-700 shadow-sm hover:bg-indigo-50 transition-all touch-manipulation active:scale-[0.99] dark:border-white/10 dark:bg-slate-900/40 dark:text-indigo-200 dark:hover:bg-slate-900/60"
              >
                <CalendarIcon className="h-4 w-4" />
                <span>Ver Agenda</span>
              </Link>
              <Link
                to="/eventos/novo"
                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-200/50 hover:shadow-xl hover:-translate-y-0.5 transition-all touch-manipulation active:scale-[0.99]"
              >
                <Plus className="h-5 w-5" />
                <span>Novo Evento</span>
              </Link>
            </div>
          </div>
        </section>

        <div className="rounded-2xl border border-white/60 bg-white/90 p-4 sm:p-5 shadow-xl backdrop-blur">
          <div className="grid gap-3 sm:gap-4 sm:grid-cols-[2fr,1fr]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-3.5 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full rounded-2xl border border-gray-200 bg-gray-50/50 pl-12 pr-12 py-3 text-sm text-gray-800 shadow-inner focus:border-primary-500 focus:bg-white focus:ring-2 focus:ring-primary-200"
                placeholder="Busque por título, local ou contato..."
              />
              {searchTerm && (
                <button
                  onClick={clearSearch}
                  className="absolute right-2.5 top-2.5 flex items-center justify-center text-gray-400 hover:text-gray-600 min-h-[44px] min-w-[44px]"
                  aria-label="Limpar busca"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>
            <div className="hidden sm:flex items-center gap-2 rounded-2xl border border-gray-200 px-4 py-3 text-sm text-gray-600">
              <Filter className="h-4 w-4 text-primary-500" />
              Ajuste filtros e visualize apenas o que importa
            </div>
          </div>

          <div className="mt-5 flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 no-scrollbar sm:flex-wrap sm:overflow-visible sm:pb-0 sm:mx-0 sm:px-0">
            <button
              type="button"
              onClick={togglePendingResponses}
              className={`inline-flex items-center gap-2 rounded-full border px-5 py-2 text-sm font-extrabold transition-all touch-manipulation min-h-[44px] whitespace-nowrap ${
                showPendingResponses
                  ? 'border-transparent bg-gradient-to-r from-amber-500 via-rose-500 to-fuchsia-600 text-white shadow-lg shadow-amber-200/50 hover:shadow-xl hover:-translate-y-0.5'
                  : pendingResponsesCount > 0
                    ? 'border-amber-200 bg-gradient-to-br from-amber-50/80 via-white/90 to-white/70 text-amber-900 shadow-md hover:shadow-lg hover:-translate-y-0.5'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-amber-200'
              }`}
              aria-pressed={showPendingResponses}
              title="Mostra apenas eventos criados por você com respostas de músicos pendentes"
            >
              <span className="relative inline-flex h-2.5 w-2.5">
                <span
                  className={`absolute inline-flex h-full w-full rounded-full ${
                    pendingResponsesCount > 0 ? 'animate-ping bg-amber-400 opacity-60' : 'bg-slate-300 opacity-40'
                  }`}
                />
                <span
                  className={`relative inline-flex h-2.5 w-2.5 rounded-full ${
                    pendingResponsesCount > 0
                      ? showPendingResponses
                        ? 'bg-white'
                        : 'bg-amber-600'
                      : 'bg-slate-400'
                  }`}
                />
              </span>
              <Zap className={`h-4 w-4 ${showPendingResponses ? 'text-white' : 'text-amber-600'}`} />
              <span>Respostas pendentes</span>
              {pendingResponsesCount > 0 && (
                <span
                  className={`ml-1 inline-flex min-w-[26px] items-center justify-center rounded-full px-2 py-0.5 text-xs font-black tabular-nums ${
                    showPendingResponses
                      ? 'bg-white/20 text-white border border-white/20'
                      : 'bg-amber-100 text-amber-800 border border-amber-200'
                  }`}
                >
                  {pendingResponsesCount}
                </span>
              )}
              {showPendingResponses && (
                <span className="ml-1 rounded-full bg-white/15 px-2 py-0.5 text-[11px] font-black tracking-wide border border-white/15">
                  ATIVO
                </span>
              )}
            </button>

            {(
              [
                { value: 'upcoming', label: 'Próximos' },
                { value: 'past', label: 'Histórico' },
                { value: 'all', label: 'Todos' },
              ] as { value: TimeFilter; label: string }[]
            ).map(item => (
              <button
                key={item.value}
                disabled={showPendingResponses}
                onClick={() => setTimeFilter(item.value)}
                className={`inline-flex items-center gap-2 rounded-full border px-5 py-2 text-sm font-semibold transition-all touch-manipulation min-h-[44px] whitespace-nowrap disabled:opacity-60 disabled:cursor-not-allowed ${
                  timeFilter === item.value
                    ? 'border-indigo-500 bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-200/60'
                    : 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-white hover:border-indigo-200'
                }`}
              >
                <span className="h-2 w-2 rounded-full bg-current opacity-80" />
                <span>{item.label}</span>
              </button>
            ))}
          </div>
          <div className="mt-4 flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 no-scrollbar sm:flex-wrap sm:overflow-visible sm:pb-0 sm:mx-0 sm:px-0">
            {[
              { value: 'all', label: 'Todos' },
              { value: 'proposed', label: 'Propostas' },
              { value: 'confirmed', label: 'Confirmados' },
            ].map(item => (
              <button
                key={item.value}
                onClick={() => setFilter(item.value)}
                className={`inline-flex items-center gap-2 rounded-full border px-5 py-2 text-sm font-semibold transition-all touch-manipulation min-h-[44px] whitespace-nowrap ${
                  filter === item.value
                    ? 'border-indigo-500 bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-200/60'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-indigo-200'
                }`}
              >
                <span
                  className={`h-2 w-2 rounded-full ${
                    item.value === 'proposed'
                      ? 'bg-amber-500'
                      : item.value === 'confirmed'
                        ? 'bg-emerald-500'
                        : 'bg-slate-400'
                  }`}
                />
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <SkeletonCard count={3} />
        ) : (
          <div className="space-y-4">
            {groups.map(group => {
              return (
                <div
                  key={group.dateKey}
                  className={`rounded-2xl p-[1px] bg-gradient-to-br ${group.ring} shadow-xl`}
                >
                  <div
                    className="rounded-[18px] border border-white/70 dark:border-white/10 p-4 shadow-lg backdrop-blur bg-white/80 dark:bg-slate-900/40"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                      <div className="flex items-center gap-2">
                        <div className="pill-date">
                          <CalendarIcon className="h-4 w-4 text-indigo-600 dark:text-indigo-300" />
                          {group.label}
                        </div>
                        {group.relative && (
                          <span className="inline-flex items-center rounded-full bg-indigo-100 border border-indigo-200 px-3 py-1 text-xs font-semibold text-indigo-800 dark:bg-indigo-900/30 dark:border-indigo-700/50 dark:text-indigo-100">
                            {group.relative}
                          </span>
                        )}
                      </div>
                      <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                        {group.count} {group.count === 1 ? 'evento' : 'eventos'}
                      </span>
                    </div>
                    <div className="space-y-3">{group.events.map(renderEventCard)}</div>
                  </div>
                </div>
              );
            })}
            {hasMore && (
              <div className="flex justify-center pt-2">
                <button
                  type="button"
                  className="btn-primary"
                  onClick={loadMore}
                  disabled={isLoadingMore}
                >
                  {isLoadingMore ? 'Carregando...' : 'Carregar mais eventos'}
                </button>
              </div>
            )}
          </div>
        )}

        <ConfirmModal
          isOpen={Boolean(pendingAction)}
          onClose={closeActionModal}
          onConfirm={handleConfirmAction}
          title={pendingAction?.type === 'cancel' ? 'Cancelar evento' : 'Excluir evento'}
          message={
            pendingAction?.type === 'cancel'
              ? 'Cancelar este evento? Ele deixará de aparecer como confirmado.'
              : 'Excluir este evento? Esta ação é permanente.'
          }
          confirmText={pendingAction?.type === 'cancel' ? 'Cancelar evento' : 'Excluir evento'}
          confirmVariant={pendingAction?.type === 'cancel' ? 'warning' : 'danger'}
          loading={actionLoading}
          icon={pendingAction?.type === 'cancel' ? <Ban className="h-5 w-5" /> : <Trash2 className="h-5 w-5" />}
        />
      </div>
      </PullToRefresh>
    </Layout>
  );
};

export default EventsList;
