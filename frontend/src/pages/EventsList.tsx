// pages/EventsList.tsx
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus,
  Calendar as CalendarIcon,
  Search,
  X,
  Users,
  Clock,
  Sparkles,
  Filter,
  Coins,
} from 'lucide-react';
import Layout from '../components/Layout/Layout';
import PullToRefresh from '../components/common/PullToRefresh';
import { SkeletonCard } from '../components/common/Skeleton';
import { useEvents } from '../hooks/useEvents';
import type { Availability, Event } from '../types';
import { format, parseISO, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getEventComputedStatus } from '../utils/events';
import { formatCurrency, formatInstrumentLabel, getMusicianDisplayName } from '../utils/formatting';

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
  const [filter, setFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('upcoming');

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
    if (timeFilter === 'upcoming') {
      p.upcoming = true;
    } else if (timeFilter === 'past') {
      p.past = true;
    }
    return p;
  }, [filter, debouncedSearch, timeFilter]);

  const { events, count, isLoading, isLoadingMore, hasMore, loadMore, mutate } = useEvents(params);

  const handleRefresh = useCallback(async () => {
    await mutate();
  }, [mutate]);

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

        const tone =
          diffDays < 0
            ? { bg: 'bg-gray-50', ring: 'from-gray-200 to-gray-300' }
            : diffDays <= 7
              ? { bg: 'bg-emerald-50', ring: 'from-emerald-200 to-emerald-300' }
              : diffDays <= 30
                ? { bg: 'bg-blue-50', ring: 'from-blue-200 to-blue-300' }
                : { bg: 'bg-indigo-50', ring: 'from-indigo-200 to-indigo-300' };

        return {
          dateKey,
          label: format(dateObj, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR }),
          tone,
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

  const renderEventCard = useCallback((event: Event) => {
    const lineup = event.availabilities ? extractLineup(event) : [event.created_by_name];
    const startLabel = event.start_time ? event.start_time.slice(0, 5) : '--:--';
    const endLabel = event.end_time ? event.end_time.slice(0, 5) : '--:--';
    const computedStatus = getEventComputedStatus(event);
    const statusClass = `status-chip ${computedStatus.status || 'default'}`;
    const statusLabel = computedStatus.label;
    return (
      <Link
        key={event.id}
        to={`/eventos/${event.id}`}
        className="block rounded-xl border border-white/70 bg-white/90 backdrop-blur p-4 shadow-lg hover:shadow-xl transition-all"
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wide">
              <span className={statusClass}>{statusLabel}</span>
              {event.is_solo && <span className="status-chip default">Solo</span>}
            </div>
            <h3 className="mt-1 text-lg font-semibold text-gray-900">{event.title}</h3>
            <p className="text-sm text-gray-600">{event.location}</p>
            <div className="mt-2 flex items-center gap-3 text-sm text-gray-700">
              <Clock className="h-4 w-4 text-gray-500" />
              <span>
                {startLabel} - {endLabel}
              </span>
            </div>
            {event.payment_amount !== null && event.payment_amount !== undefined && (
              <div className="mt-2 flex items-center gap-2 text-sm text-gray-700">
                <Coins className="h-4 w-4 text-emerald-500" />
                <span>Cachê: {formatCurrency(event.payment_amount)}</span>
              </div>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-gray-700">
              <Users className="h-4 w-4 text-gray-500" />
              {lineup.map(name => (
                <span
                  key={name}
                  className="inline-flex items-center gap-1 rounded-full bg-gray-50 border border-gray-200 px-3 py-1 font-medium text-gray-700"
                >
                  {name}
                </span>
              ))}
            </div>
          </div>
        </div>
      </Link>
    );
  }, []);

  return (
    <Layout>
      <PullToRefresh onRefresh={handleRefresh} disabled={isLoading}>
      <div className="page-stack">
        <section className="hero-panel">
          <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/60 px-3 py-1 text-xs font-semibold text-primary-700 shadow-sm">
                <Sparkles className="h-4 w-4" />
                Painel de Eventos
              </div>
              <h1 className="mt-3 text-3xl font-bold text-gray-900">Meus eventos</h1>
              <p className="mt-1 text-sm text-gray-700">
                Total • {statistics.confirmed} confirmados
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <div className="rounded-2xl border border-primary-100/70 bg-gradient-to-br from-primary-50/80 via-white/90 to-white/70 px-4 py-3 text-sm font-semibold text-gray-800 shadow-lg backdrop-blur dark:border-primary-800/60 dark:from-primary-900/40 dark:via-slate-900/70 dark:to-slate-900/60">
                  <p className="text-xs uppercase tracking-wide text-gray-500">Total</p>
                  <p className="text-2xl text-primary-700">{statistics.total}</p>
                </div>
                <div className="rounded-2xl border border-emerald-100/70 bg-gradient-to-br from-emerald-50/80 via-white/90 to-white/70 px-4 py-3 text-sm font-semibold text-gray-800 shadow-lg backdrop-blur dark:border-emerald-800/60 dark:from-emerald-900/40 dark:via-slate-900/70 dark:to-slate-900/60">
                  <p className="text-xs uppercase tracking-wide text-gray-500">Confirmados</p>
                  <p className="text-2xl text-emerald-600">{statistics.confirmed}</p>
                </div>
              </div>
            </div>
            <Link
              to="/eventos/novo"
              className="btn-primary flex items-center justify-center gap-2 self-start"
            >
              <Plus className="h-5 w-5" />
              <span>Novo Evento</span>
            </Link>
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
                  className="absolute right-3.5 top-3 text-gray-400 hover:text-gray-600"
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
            {(
              [
                { value: 'upcoming', label: 'Próximos' },
                { value: 'past', label: 'Histórico' },
                { value: 'all', label: 'Todos' },
              ] as { value: TimeFilter; label: string }[]
            ).map(item => (
              <button
                key={item.value}
                onClick={() => setTimeFilter(item.value)}
                className={`inline-flex items-center gap-2 rounded-full border px-5 py-2 text-sm font-semibold transition-all touch-manipulation min-h-[44px] whitespace-nowrap ${
                  timeFilter === item.value
                    ? 'border-primary-500 bg-primary-600 text-white shadow-lg shadow-primary-200/60'
                    : 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-white hover:border-primary-200'
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
                    ? 'border-emerald-500 bg-emerald-600 text-white shadow-lg shadow-emerald-200/60'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-emerald-200'
                }`}
              >
                <span className="h-2 w-2 rounded-full bg-current opacity-80" />
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
                  className={`rounded-xl p-[1px] bg-gradient-to-br ${group.tone.ring} shadow-xl`}
                >
                  <div
                    className={`rounded-[14px] border border-white/70 dark:border-white/10 p-4 shadow-lg backdrop-blur ${group.tone.bg}`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <div className="pill-date">
                          <CalendarIcon className="h-4 w-4 text-primary-600" />
                          {group.label}
                        </div>
                      </div>
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
      </div>
      </PullToRefresh>
    </Layout>
  );
};

export default EventsList;
