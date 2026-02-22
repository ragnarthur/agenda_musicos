// pages/Dashboard.tsx
import React, { useMemo, memo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Plus, Zap, User, CalendarCheck, Briefcase, Star } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import useSWR from 'swr';
import Layout from '../components/Layout/Layout';
import PullToRefresh from '../components/common/PullToRefresh';
import Skeleton from '../components/common/Skeleton';
import { CompactCalendar } from '../components/calendar';
import { useAuth } from '../contexts/AuthContext';
import { usePastEvents, useUpcomingEvents } from '../hooks/useEvents';
import { useMusicianEvents } from '../hooks/useMusicianEvents';
import { useDashboardNotifications } from '../hooks/useNotifications';
import { musicianService } from '../services/api';
import type { Event } from '../types';
import { isToday, isTomorrow, parseISO } from 'date-fns';

const getStartDateTime = (event: Event): number => {
  try {
    if (event.start_datetime) return parseISO(event.start_datetime).getTime();
    if (event.event_date && event.start_time) {
      return parseISO(`${event.event_date}T${event.start_time}`).getTime();
    }
  } catch {
    return 0;
  }
  return 0;
};

const isEventToday = (event: Event): boolean => {
  if (event.event_date) {
    try {
      return isToday(parseISO(event.event_date));
    } catch {
      return false;
    }
  }
  if (event.start_datetime) {
    try {
      return isToday(parseISO(event.start_datetime));
    } catch {
      return false;
    }
  }
  return false;
};

const isEventWithin7Days = (event: Event): boolean => {
  const dateStr = event.event_date;
  if (!dateStr) return false;
  try {
    const d = parseISO(dateStr);
    const start = new Date();
    start.setHours(23, 59, 59, 999); // end of today
    const end = new Date();
    end.setDate(end.getDate() + 7);
    end.setHours(23, 59, 59, 999);
    return d > start && d <= end;
  } catch {
    return false;
  }
};

const getEventDayLabel = (event: Event): string => {
  const dateStr = event.event_date ?? event.start_datetime?.split('T')[0];
  if (!dateStr) return '';
  try {
    const d = parseISO(dateStr);
    if (isToday(d)) return 'Hoje';
    if (isTomorrow(d)) return 'Amanhã';
    return new Intl.DateTimeFormat('pt-BR', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    }).format(d);
  } catch {
    return dateStr;
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 6 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.04, duration: 0.22 },
  }),
};

const Dashboard: React.FC = memo(() => {
  const { user } = useAuth();
  const prefersReducedMotion = useReducedMotion();
  const musicianId = user?.id ?? 0;

  const {
    events: upcomingEvents,
    isLoading: loadingEvents,
    mutate: mutateUpcoming,
  } = useUpcomingEvents();
  const {
    events: pastEvents,
    isLoading: loadingPastEvents,
    mutate: mutatePast,
  } = usePastEvents({
    daysBack: 30,
  });
  const {
    events: musicianCalendarEvents,
    loading: loadingCalendar,
    mutate: mutateCalendar,
  } = useMusicianEvents({ musicianId, isOwnProfile: true });
  const {
    pendingApprovalsCount,
    pendingResponsesCount,
    isLoading: loadingNotifications,
  } = useDashboardNotifications();

  const { data: stats } = useSWR(
    musicianId ? `musician-stats-${musicianId}` : null,
    () => musicianService.getStats(musicianId),
    { revalidateOnFocus: false }
  );

  const loading = loadingEvents || loadingNotifications || loadingPastEvents || loadingCalendar;

  const handleRefresh = useCallback(async () => {
    await Promise.all([mutateUpcoming(), mutatePast(), mutateCalendar()]);
  }, [mutateUpcoming, mutatePast, mutateCalendar]);

  const sorted = useMemo(
    () => [...upcomingEvents].sort((a, b) => getStartDateTime(a) - getStartDateTime(b)),
    [upcomingEvents]
  );

  const todayEvents = useMemo(() => sorted.filter(isEventToday), [sorted]);
  const next7DaysEvents = useMemo(() => sorted.filter(isEventWithin7Days), [sorted]);
  const laterEvents = useMemo(
    () => sorted.filter(e => !isEventToday(e) && !isEventWithin7Days(e)).slice(0, 3),
    [sorted]
  );

  const fallbackCalendarEvents = useMemo(() => {
    const merged = new Map<number, Event>();
    [...upcomingEvents, ...pastEvents].forEach(e => merged.set(e.id, e));
    return Array.from(merged.values());
  }, [upcomingEvents, pastEvents]);

  const calendarEvents = useMemo(
    () => (musicianCalendarEvents.length > 0 ? musicianCalendarEvents : fallbackCalendarEvents),
    [musicianCalendarEvents, fallbackCalendarEvents]
  );

  const hasActions = pendingApprovalsCount > 0 || pendingResponsesCount > 0;
  const totalActions = pendingApprovalsCount + pendingResponsesCount;

  const greetingDate = useMemo(() => {
    const str = new Intl.DateTimeFormat('pt-BR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    }).format(new Date());
    return str.charAt(0).toUpperCase() + str.slice(1);
  }, []);

  if (loading) {
    return (
      <Layout>
        <div className="page-stack py-6">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-4 w-56" />
          <Skeleton className="h-28 w-full rounded-2xl" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <PullToRefresh onRefresh={handleRefresh} disabled={loading}>
        {/* Grid responsivo: 1 coluna mobile / 2 colunas desktop */}
        <div className="pt-2 lg:grid lg:grid-cols-[1fr_296px] xl:grid-cols-[1fr_320px] lg:gap-6 lg:items-start">
          {/* ── Coluna esquerda (conteúdo action-first) ── */}
          <div className="page-stack min-w-0">
            {/* Greeting */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={prefersReducedMotion ? { duration: 0.2 } : { duration: 0.3 }}
            >
              <p className="text-xs text-muted uppercase tracking-widest font-heading mb-1">
                {greetingDate}
              </p>
              <h1 className="text-2xl sm:text-3xl font-heading font-bold text-gray-900 dark:text-white">
                Olá, {user?.user?.first_name || user?.user?.username || 'Músico'}
              </h1>

              {/* Stats strip — mobile apenas */}
              {stats && (
                <div className="flex flex-wrap gap-2 mt-3 lg:hidden">
                  <span className="text-xs bg-white/60 dark:bg-white/10 border border-gray-200/60 dark:border-white/10 rounded-full px-2.5 py-1 font-medium text-gray-700 dark:text-gray-300">
                    {stats.total_events} eventos
                  </span>
                  <span className="text-xs bg-white/60 dark:bg-white/10 border border-gray-200/60 dark:border-white/10 rounded-full px-2.5 py-1 font-medium text-gray-700 dark:text-gray-300">
                    {stats.events_as_leader} como líder
                  </span>
                  {user?.average_rating != null && (
                    <span className="flex items-center gap-1 text-xs bg-white/60 dark:bg-white/10 border border-gray-200/60 dark:border-white/10 rounded-full px-2.5 py-1 font-medium text-gray-700 dark:text-gray-300">
                      <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                      {Number(user.average_rating).toFixed(1)}
                    </span>
                  )}
                </div>
              )}
            </motion.div>

            {/* Agir Agora */}
            {hasActions && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={
                  prefersReducedMotion ? { duration: 0.2 } : { delay: 0.06, duration: 0.3 }
                }
              >
                <div className="rounded-2xl bg-amber-50 dark:bg-amber-950/25 border border-amber-200 dark:border-amber-800/50 overflow-hidden">
                  <div className="flex items-center gap-2 px-4 pt-4 pb-2">
                    <Zap className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                    <span className="text-xs font-heading font-semibold uppercase tracking-widest text-amber-700 dark:text-amber-400">
                      Agir agora · {totalActions}
                    </span>
                  </div>

                  {pendingApprovalsCount > 0 && (
                    <Link
                      to="/eventos"
                      className="flex items-center justify-between px-4 py-3 border-t border-amber-100 dark:border-amber-900/50 hover:bg-amber-100/60 dark:hover:bg-amber-900/30 transition-colors"
                    >
                      <div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">
                          {pendingApprovalsCount === 1
                            ? '1 músico aguardando aprovação'
                            : `${pendingApprovalsCount} músicos aguardando aprovação`}
                        </p>
                        <p className="text-xs text-muted">Revise e aprove as entradas</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted flex-shrink-0" />
                    </Link>
                  )}

                  {pendingResponsesCount > 0 && (
                    <Link
                      to="/eventos?pending_responses=true"
                      className="flex items-center justify-between px-4 py-3 border-t border-amber-100 dark:border-amber-900/50 hover:bg-amber-100/60 dark:hover:bg-amber-900/30 transition-colors"
                    >
                      <div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">
                          {pendingResponsesCount === 1
                            ? '1 proposta aguardando sua resposta'
                            : `${pendingResponsesCount} propostas aguardando sua resposta`}
                        </p>
                        <p className="text-xs text-muted">Aceite ou recuse as propostas</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted flex-shrink-0" />
                    </Link>
                  )}
                </div>
              </motion.div>
            )}

            {/* Hoje */}
            {todayEvents.length > 0 && (
              <motion.section
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={
                  prefersReducedMotion ? { duration: 0.2 } : { delay: 0.1, duration: 0.3 }
                }
              >
                <p className="text-xs font-heading font-semibold uppercase tracking-widest text-muted mb-3">
                  Hoje · {todayEvents.length}
                </p>
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  {todayEvents.map((event, i) => (
                    <motion.div
                      key={event.id}
                      custom={i}
                      variants={!prefersReducedMotion ? itemVariants : undefined}
                      initial="hidden"
                      animate="visible"
                    >
                      <Link
                        to={`/eventos/${event.id}`}
                        className="flex items-center justify-between py-3 gap-3 hover:opacity-70 transition-opacity"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                            {event.title}
                          </p>
                          <p className="text-xs text-muted truncate">
                            {event.start_time ? event.start_time.slice(0, 5) + 'h' : ''}
                            {event.location ? ` · ${event.location}` : ''}
                          </p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted flex-shrink-0" />
                      </Link>
                    </motion.div>
                  ))}
                </div>
              </motion.section>
            )}

            {/* Próximos 7 dias */}
            {next7DaysEvents.length > 0 && (
              <motion.section
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={
                  prefersReducedMotion ? { duration: 0.2 } : { delay: 0.14, duration: 0.3 }
                }
              >
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-heading font-semibold uppercase tracking-widest text-muted">
                    Próximos 7 dias · {next7DaysEvents.length}
                  </p>
                  <Link
                    to="/eventos"
                    className="text-xs font-semibold text-primary-600 dark:text-primary-400 hover:underline"
                  >
                    Ver todos
                  </Link>
                </div>
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  {next7DaysEvents.map((event, i) => (
                    <motion.div
                      key={event.id}
                      custom={i}
                      variants={!prefersReducedMotion ? itemVariants : undefined}
                      initial="hidden"
                      animate="visible"
                    >
                      <Link
                        to={`/eventos/${event.id}`}
                        className="flex items-center justify-between py-3 gap-3 hover:opacity-70 transition-opacity"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                            {event.title}
                          </p>
                          {event.location && (
                            <p className="text-xs text-muted truncate">{event.location}</p>
                          )}
                        </div>
                        <span className="text-xs text-muted whitespace-nowrap flex-shrink-0 mr-1">
                          {getEventDayLabel(event)}
                        </span>
                        <ChevronRight className="h-4 w-4 text-muted flex-shrink-0" />
                      </Link>
                    </motion.div>
                  ))}
                </div>
              </motion.section>
            )}

            {/* Mais tarde */}
            {laterEvents.length > 0 && (
              <motion.section
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={
                  prefersReducedMotion ? { duration: 0.2 } : { delay: 0.18, duration: 0.3 }
                }
              >
                <p className="text-xs font-heading font-semibold uppercase tracking-widest text-muted mb-3">
                  Mais tarde
                </p>
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  {laterEvents.map((event, i) => (
                    <motion.div
                      key={event.id}
                      custom={i}
                      variants={!prefersReducedMotion ? itemVariants : undefined}
                      initial="hidden"
                      animate="visible"
                    >
                      <Link
                        to={`/eventos/${event.id}`}
                        className="flex items-center justify-between py-3 gap-3 hover:opacity-70 transition-opacity"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                            {event.title}
                          </p>
                          {event.location && (
                            <p className="text-xs text-muted truncate">{event.location}</p>
                          )}
                        </div>
                        <span className="text-xs text-muted whitespace-nowrap flex-shrink-0 mr-1">
                          {getEventDayLabel(event)}
                        </span>
                        <ChevronRight className="h-4 w-4 text-muted flex-shrink-0" />
                      </Link>
                    </motion.div>
                  ))}
                </div>
              </motion.section>
            )}

            {/* Calendário */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={prefersReducedMotion ? { duration: 0.2 } : { delay: 0.22, duration: 0.3 }}
            >
              <CompactCalendar events={calendarEvents} />
            </motion.div>

            {/* Empty state */}
            {upcomingEvents.length === 0 && !hasActions && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-16"
              >
                <p className="text-muted text-sm">Nenhum evento agendado.</p>
                <Link
                  to="/eventos/novo"
                  className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  Criar Evento
                </Link>
              </motion.div>
            )}
          </div>

          {/* ── Coluna direita — sidebar desktop ── */}
          <aside className="hidden lg:flex lg:flex-col lg:gap-4 lg:sticky lg:top-20">
            {/* Widget: Seus números */}
            {stats && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={
                  prefersReducedMotion ? { duration: 0.2 } : { delay: 0.08, duration: 0.3 }
                }
                className="rounded-2xl border border-gray-200/70 dark:border-white/10 bg-white/70 dark:bg-white/5 backdrop-blur p-4"
              >
                <p className="text-xs font-heading font-semibold uppercase tracking-widest text-muted mb-4">
                  Seus números
                </p>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div>
                    <p className="text-2xl font-bold font-heading text-gray-900 dark:text-white leading-none">
                      {stats.total_events}
                    </p>
                    <p className="text-xs text-muted mt-1">Total</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold font-heading text-gray-900 dark:text-white leading-none">
                      {stats.events_as_leader}
                    </p>
                    <p className="text-xs text-muted mt-1">Líder</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold font-heading text-gray-900 dark:text-white leading-none">
                      {stats.events_as_member}
                    </p>
                    <p className="text-xs text-muted mt-1">Membro</p>
                  </div>
                </div>
                {user?.average_rating != null && (
                  <div className="mt-4 pt-3 border-t border-gray-100 dark:border-white/10 flex items-center gap-1.5">
                    <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                      {Number(user.average_rating).toFixed(1)}
                    </span>
                    {user.total_ratings != null && (
                      <span className="text-xs text-muted">· {user.total_ratings} avaliações</span>
                    )}
                  </div>
                )}
              </motion.div>
            )}

            {/* Widget: Atalhos */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={prefersReducedMotion ? { duration: 0.2 } : { delay: 0.14, duration: 0.3 }}
              className="rounded-2xl border border-gray-200/70 dark:border-white/10 bg-white/70 dark:bg-white/5 backdrop-blur p-4"
            >
              <p className="text-xs font-heading font-semibold uppercase tracking-widest text-muted mb-3">
                Atalhos
              </p>
              <div className="grid grid-cols-2 gap-2">
                <Link
                  to={`/musicos/${musicianId}`}
                  className="flex items-center gap-2 rounded-xl border border-gray-200/60 dark:border-white/10 bg-white/60 dark:bg-white/5 px-3 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-white/90 dark:hover:bg-white/10 transition-colors"
                >
                  <User className="h-4 w-4 text-primary-500 flex-shrink-0" />
                  Perfil
                </Link>
                <Link
                  to="/disponibilidade"
                  className="flex items-center gap-2 rounded-xl border border-gray-200/60 dark:border-white/10 bg-white/60 dark:bg-white/5 px-3 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-white/90 dark:hover:bg-white/10 transition-colors"
                >
                  <CalendarCheck className="h-4 w-4 text-primary-500 flex-shrink-0" />
                  Disponível
                </Link>
                <Link
                  to="/vagas"
                  className="flex items-center gap-2 rounded-xl border border-gray-200/60 dark:border-white/10 bg-white/60 dark:bg-white/5 px-3 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-white/90 dark:hover:bg-white/10 transition-colors"
                >
                  <Briefcase className="h-4 w-4 text-primary-500 flex-shrink-0" />
                  Vagas
                </Link>
                <Link
                  to="/eventos/novo"
                  className="flex items-center gap-2 rounded-xl border border-gray-200/60 dark:border-white/10 bg-white/60 dark:bg-white/5 px-3 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-white/90 dark:hover:bg-white/10 transition-colors"
                >
                  <Plus className="h-4 w-4 text-primary-500 flex-shrink-0" />
                  Novo Evento
                </Link>
              </div>
            </motion.div>

            {/* Widget: Próximo evento */}
            {sorted[0] && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={
                  prefersReducedMotion ? { duration: 0.2 } : { delay: 0.2, duration: 0.3 }
                }
              >
                <Link
                  to={`/eventos/${sorted[0].id}`}
                  className="block rounded-2xl border border-gray-200/70 dark:border-white/10 bg-white/70 dark:bg-white/5 backdrop-blur p-4 hover:bg-white/90 dark:hover:bg-white/10 transition-colors"
                >
                  <p className="text-xs font-heading font-semibold uppercase tracking-widest text-muted mb-2">
                    Próximo evento
                  </p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                    {sorted[0].title}
                  </p>
                  <p className="text-xs text-muted mt-1 truncate">
                    {getEventDayLabel(sorted[0])}
                    {sorted[0].location ? ` · ${sorted[0].location}` : ''}
                  </p>
                </Link>
              </motion.div>
            )}
          </aside>
        </div>

        {/* FAB */}
        <div className="fixed bottom-20 right-4 sm:bottom-8 sm:right-6 z-30 pb-safe">
          <Link
            to="/eventos/novo"
            className="flex items-center justify-center w-12 h-12 rounded-full bg-primary-600 text-white shadow-lg hover:bg-primary-700 transition-colors"
            aria-label="Novo Evento"
          >
            <Plus className="h-5 w-5" />
          </Link>
        </div>
      </PullToRefresh>
    </Layout>
  );
});

Dashboard.displayName = 'Dashboard';

export default Dashboard;
