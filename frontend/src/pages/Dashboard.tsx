// pages/Dashboard.tsx
import React, { useMemo, memo, useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ChevronRight,
  Plus,
  Zap,
  User,
  CalendarCheck,
  Briefcase,
  Star,
  Users,
  MapPin,
  Clock,
} from 'lucide-react';
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

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

// Status dot color by event status field
function statusDotColor(status?: string): string {
  if (status === 'confirmed') return 'bg-emerald-500';
  if (status === 'pending') return 'bg-amber-400';
  return 'bg-slate-400 dark:bg-slate-600';
}

const itemVariants = {
  hidden: { opacity: 0, y: 6 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.04, duration: 0.22 },
  }),
};

const CountUp: React.FC<{ value: number; duration?: number }> = ({ value, duration = 700 }) => {
  const [display, setDisplay] = useState(0);
  const previousValueRef = useRef(0);

  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const from = previousValueRef.current;
    const to = value;

    const step = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(from + (to - from) * eased));
      if (progress < 1) {
        raf = requestAnimationFrame(step);
      } else {
        previousValueRef.current = to;
      }
    };

    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  return <>{display}</>;
};

const StatCard: React.FC<{
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  accent?: 'indigo' | 'amber' | 'emerald';
}> = ({ label, value, icon: Icon, accent = 'indigo' }) => {
  const accentStyles: Record<string, string> = {
    indigo: 'text-indigo-300 bg-indigo-500/20 border-indigo-400/20',
    amber: 'text-amber-300 bg-amber-500/20 border-amber-400/20',
    emerald: 'text-emerald-300 bg-emerald-500/20 border-emerald-400/20',
  };

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] uppercase tracking-widest text-slate-400">{label}</p>
        <span
          className={`inline-flex h-7 w-7 items-center justify-center rounded-lg border ${accentStyles[accent]}`}
        >
          <Icon className="h-3.5 w-3.5" />
        </span>
      </div>
      <p className="mt-2 text-2xl font-heading font-bold text-white leading-none">
        <CountUp value={value} />
      </p>
    </div>
  );
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

  const firstName = user?.user?.first_name || user?.user?.username || 'Músico';
  const nextEvent = sorted[0];

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
            {/* ── Hero strip ── */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={prefersReducedMotion ? { duration: 0.2 } : { duration: 0.3 }}
              className="rounded-2xl overflow-hidden border border-indigo-300/20 bg-slate-900/60 relative"
            >
              {nextEvent ? (
                /* Next event highlight */
                <Link
                  to={`/eventos/${nextEvent.id}`}
                  className="block p-4 sm:p-5 transition-colors relative overflow-hidden"
                >
                  <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(129,140,248,0.35),transparent_44%),radial-gradient(circle_at_80%_10%,rgba(34,211,238,0.25),transparent_42%),linear-gradient(120deg,rgba(15,23,42,0.96),rgba(30,41,59,0.9))]" />
                  <span className="pointer-events-none absolute inset-0 opacity-[0.08] [background-image:repeating-linear-gradient(0deg,rgba(255,255,255,0.5)_0px,rgba(255,255,255,0.5)_1px,transparent_1px,transparent_3px)]" />
                  <div className="relative z-10">
                    <p className="text-indigo-200 text-xs font-heading font-semibold uppercase tracking-widest mb-2">
                      {getGreeting()}, {firstName} · próximo evento
                    </p>
                    <h2 className="text-white font-heading font-bold text-xl sm:text-2xl leading-tight truncate">
                      {nextEvent.title}
                    </h2>
                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                      <span className="flex items-center gap-1 text-indigo-200 text-sm font-medium">
                        <Clock className="h-3.5 w-3.5" />
                        {getEventDayLabel(nextEvent)}
                        {nextEvent.start_time ? ` · ${nextEvent.start_time.slice(0, 5)}h` : ''}
                      </span>
                      {nextEvent.location && (
                        <span className="flex items-center gap-1 text-indigo-200 text-sm truncate">
                          <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                          {nextEvent.location}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              ) : (
                /* No events CTA */
                <div className="p-4 sm:p-5 relative overflow-hidden">
                  <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_22%_25%,rgba(129,140,248,0.34),transparent_42%),linear-gradient(130deg,rgba(30,41,59,0.94),rgba(15,23,42,0.92))]" />
                  <span className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:repeating-linear-gradient(0deg,rgba(255,255,255,0.5)_0px,rgba(255,255,255,0.5)_1px,transparent_1px,transparent_3px)]" />
                  <div className="relative z-10">
                    <p className="text-indigo-200 text-xs font-heading font-semibold uppercase tracking-widest mb-1">
                      {getGreeting()}, {firstName}
                    </p>
                    <p className="text-white font-heading font-bold text-lg sm:text-xl">
                      Nenhum evento hoje
                    </p>
                    <Link
                      to="/eventos/novo"
                      className="inline-flex items-center gap-1.5 mt-3 bg-white/20 hover:bg-white/30 text-white rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Criar evento
                    </Link>
                  </div>
                </div>
              )}

              {/* Date strip */}
              <div className="bg-indigo-950/30 border-t border-indigo-300/20 rounded-b-2xl px-4 py-2">
                <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">
                  {greetingDate}
                </p>
              </div>
            </motion.div>

            {/* Stats strip — mobile apenas */}
            {stats && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={
                  prefersReducedMotion ? { duration: 0.2 } : { delay: 0.04, duration: 0.25 }
                }
                className="flex flex-wrap gap-2 lg:hidden"
              >
                <span className="text-xs bg-white/70 dark:bg-white/8 border border-gray-200/60 dark:border-white/10 rounded-full px-2.5 py-1 font-medium text-gray-600 dark:text-gray-400">
                  {stats.total_events} eventos
                </span>
                {user?.average_rating != null && (
                  <span className="flex items-center gap-1 text-xs bg-white/70 dark:bg-white/8 border border-gray-200/60 dark:border-white/10 rounded-full px-2.5 py-1 font-medium text-gray-600 dark:text-gray-400">
                    <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                    {Number(user.average_rating).toFixed(1)}
                  </span>
                )}
              </motion.div>
            )}

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

            {/* Hoje — timeline */}
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
                <div className="relative pl-4 border-l-2 border-indigo-500/40 space-y-0">
                  {todayEvents.map((event, i) => (
                    <motion.div
                      key={event.id}
                      custom={i}
                      variants={!prefersReducedMotion ? itemVariants : undefined}
                      initial="hidden"
                      animate="visible"
                      whileHover={prefersReducedMotion ? undefined : { x: 2 }}
                      className="relative"
                    >
                      {/* Timeline dot */}
                      <span
                        className={`absolute -left-[1.375rem] top-4 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-gray-900 ${statusDotColor((event as Event & { status?: string }).status)}`}
                      />
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

            {/* Próximos 7 dias — timeline */}
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
                <div className="relative pl-4 border-l-2 border-indigo-200/60 dark:border-indigo-800/40 space-y-0">
                  {next7DaysEvents.map((event, i) => (
                    <motion.div
                      key={event.id}
                      custom={i}
                      variants={!prefersReducedMotion ? itemVariants : undefined}
                      initial="hidden"
                      animate="visible"
                      whileHover={prefersReducedMotion ? undefined : { x: 2 }}
                      className="relative"
                    >
                      <span
                        className={`absolute -left-[1.375rem] top-4 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-gray-900 ${statusDotColor((event as Event & { status?: string }).status)}`}
                      />
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
                <div className="relative pl-4 border-l-2 border-slate-200 dark:border-slate-800 space-y-0">
                  {laterEvents.map((event, i) => (
                    <motion.div
                      key={event.id}
                      custom={i}
                      variants={!prefersReducedMotion ? itemVariants : undefined}
                      initial="hidden"
                      animate="visible"
                      whileHover={prefersReducedMotion ? undefined : { x: 2 }}
                      className="relative"
                    >
                      <span className="absolute -left-[1.375rem] top-4 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-gray-900 bg-slate-300 dark:bg-slate-700" />
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
                className="text-center py-12"
              >
                <p className="text-muted text-sm">Nenhum evento agendado.</p>
              </motion.div>
            )}

            {/* Quick actions strip — only xs mobile, above FAB area */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={prefersReducedMotion ? { duration: 0.2 } : { delay: 0.26, duration: 0.3 }}
              className="sm:hidden pb-2"
            >
              <div className="flex gap-2">
                <Link
                  to="/eventos/novo"
                  className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 text-white px-3 py-3.5 text-sm font-semibold min-h-[52px] hover:bg-indigo-700 transition-colors active:scale-98"
                >
                  <Plus className="h-4 w-4" />
                  Criar Evento
                </Link>
                <Link
                  to="/eventos"
                  className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-white dark:bg-white/8 border border-gray-200/70 dark:border-white/10 text-gray-700 dark:text-gray-300 px-3 py-3.5 text-sm font-semibold min-h-[52px] hover:bg-gray-50 dark:hover:bg-white/12 transition-colors active:scale-98"
                >
                  <CalendarCheck className="h-4 w-4" />
                  Agenda
                </Link>
                <Link
                  to="/musicos"
                  className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-white dark:bg-white/8 border border-gray-200/70 dark:border-white/10 text-gray-700 dark:text-gray-300 px-3 py-3.5 text-sm font-semibold min-h-[52px] hover:bg-gray-50 dark:hover:bg-white/12 transition-colors active:scale-98"
                >
                  <Users className="h-4 w-4" />
                  Músicos
                </Link>
              </div>
            </motion.div>
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
                className="rounded-2xl border border-white/10 bg-slate-900/55 backdrop-blur p-4"
              >
                <p className="text-xs font-heading font-semibold uppercase tracking-widest text-muted mb-4">
                  Seus números
                </p>
                <div className="grid grid-cols-1 gap-2.5">
                  <StatCard label="Eventos" value={stats.total_events ?? 0} icon={CalendarCheck} />
                  <StatCard
                    label="Avaliações"
                    value={user?.total_ratings ?? 0}
                    icon={Star}
                    accent="amber"
                  />
                  <StatCard label="Pendências" value={totalActions} icon={Zap} accent="emerald" />
                </div>
                {user?.average_rating != null && (
                  <div className="mt-4 pt-3 border-t border-white/10 flex items-center gap-1.5">
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
                  to="/disponibilidades"
                  className="flex items-center gap-2 rounded-xl border border-gray-200/60 dark:border-white/10 bg-white/60 dark:bg-white/5 px-3 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-white/90 dark:hover:bg-white/10 transition-colors"
                >
                  <CalendarCheck className="h-4 w-4 text-primary-500 flex-shrink-0" />
                  Disponível
                </Link>
                <Link
                  to="/marketplace"
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

        {/* FAB — desktop only (mobile uses quick actions strip) */}
        <div className="hidden sm:block fixed bottom-8 right-6 z-30 pb-safe">
          <Link
            to="/eventos/novo"
            className="flex items-center justify-center w-12 h-12 rounded-full bg-primary-600 text-white shadow-lg shadow-primary-600/30 ring-4 ring-white/20 hover:bg-primary-700 transition-colors"
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
