// pages/Dashboard.tsx
import React, { useMemo, memo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Plus, Zap } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import Layout from '../components/Layout/Layout';
import PullToRefresh from '../components/common/PullToRefresh';
import Skeleton from '../components/common/Skeleton';
import { CompactCalendar } from '../components/calendar';
import { useAuth } from '../contexts/AuthContext';
import { usePastEvents, useUpcomingEvents } from '../hooks/useEvents';
import { useMusicianEvents } from '../hooks/useMusicianEvents';
import { useDashboardNotifications } from '../hooks/useNotifications';
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
        <div className="page-stack pt-2">
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
          </motion.div>

          {/* Agir Agora */}
          {hasActions && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={prefersReducedMotion ? { duration: 0.2 } : { delay: 0.06, duration: 0.3 }}
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
              transition={prefersReducedMotion ? { duration: 0.2 } : { delay: 0.1, duration: 0.3 }}
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
              transition={prefersReducedMotion ? { duration: 0.2 } : { delay: 0.14, duration: 0.3 }}
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
              transition={prefersReducedMotion ? { duration: 0.2 } : { delay: 0.18, duration: 0.3 }}
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
        </div>
      </PullToRefresh>
    </Layout>
  );
});

Dashboard.displayName = 'Dashboard';

export default Dashboard;
