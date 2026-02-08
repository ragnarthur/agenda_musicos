// pages/Dashboard.tsx
import React, { useMemo, memo } from 'react';
import { Link } from 'react-router-dom';
import { Clock, Plus, Users, ListChecks, Zap, Briefcase } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import Layout from '../components/Layout/Layout';
import Skeleton, { SkeletonCard } from '../components/common/Skeleton';
import { CompactCalendar } from '../components/calendar';
import { useAuth } from '../contexts/AuthContext';
import { usePastEvents, useUpcomingEvents } from '../hooks/useEvents';
import { useDashboardNotifications } from '../hooks/useNotifications';
import type { Event } from '../types';
import { isToday, parseISO } from 'date-fns';
import { getEventComputedStatus } from '../utils/events';

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

const Dashboard: React.FC = memo(() => {
  const { user } = useAuth();
  const prefersReducedMotion = useReducedMotion();

  const { events: upcomingEvents, isLoading: loadingEvents } = useUpcomingEvents();
  const { events: pastEvents, isLoading: loadingPastEvents } = usePastEvents({
    daysBack: 30,
  });
  const {
    pendingApprovalsCount,
    pendingResponsesCount,
    isLoading: loadingNotifications,
  } = useDashboardNotifications();

  const loading = loadingEvents || loadingNotifications || loadingPastEvents;

  const { events, todayEvents, nextEvent, nextComputedStatus } = useMemo(() => {
    const sorted = [...upcomingEvents].sort((a, b) => getStartDateTime(a) - getStartDateTime(b));
    const today = upcomingEvents.filter(isEventToday);
    const next = sorted[0];
    const nextStatus = next ? getEventComputedStatus(next) : null;
    return {
      events: sorted.slice(0, 5),
      todayEvents: today,
      nextEvent: next,
      nextComputedStatus: nextStatus,
    };
  }, [upcomingEvents]);

  const agendaCount = events.length;

  const calendarEvents = useMemo(() => {
    const merged = new Map<number, Event>();
    [...upcomingEvents, ...pastEvents].forEach(event => {
      merged.set(event.id, event);
    });
    return Array.from(merged.values());
  }, [upcomingEvents, pastEvents]);

  const recentCompletedEvents = useMemo(() => {
    return [...pastEvents]
      .filter(event => getEventComputedStatus(event).status === 'completed')
      .sort((a, b) => getStartDateTime(b) - getStartDateTime(a))
      .slice(0, 5);
  }, [pastEvents]);

  if (loading) {
    return (
      <Layout>
        <div className="page-stack py-6 sm:py-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full hidden md:block" />
          </div>
          <SkeletonCard count={3} />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="page-stack">
        {/* Hero */}
        <motion.div
          className="hero-panel"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={
            prefersReducedMotion
              ? { duration: 0.3 }
              : { type: 'spring', stiffness: 120, damping: 18 }
          }
        >
          <div className="hero-animated" />

          <div className="spotlight pointer-events-none absolute inset-0 -z-10" />
          <div className="relative flex flex-col md:flex-row md:items-stretch md:justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-primary-700">Agenda Profissional</p>
              <h1 className="mt-1 text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
                Olá, {user?.user?.first_name || user?.user?.username || 'Músico'}!
              </h1>
              <p className="mt-2 text-sm text-muted">
                Centralize todos os seus shows, compromissos e disponibilidades em um só lugar.
              </p>
            </div>
            <div>
              <Link
                to="/eventos/novo"
                className="inline-flex items-center gap-2 rounded-full bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-md hover:bg-primary-700 transition-transform hover:-translate-y-0.5"
                title="Criar novo evento"
              >
                <Plus className="h-4 w-4" />
                Novo Evento
              </Link>
              <Link
                to="/marketplace"
                className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white dark:border-gray-700 px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 hover:text-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800"
                title="Ver oportunidades no marketplace"
              >
                <Briefcase className="h-4 w-4 text-gray-700 dark:text-gray-300" />
                Vagas
              </Link>
            </div>
          </div>
        </motion.div>

        {/* Compact Calendar - First content after hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={
            prefersReducedMotion
              ? { duration: 0.3 }
              : { type: 'spring', stiffness: 120, damping: 18, delay: 0.05 }
          }
        >
          <CompactCalendar events={calendarEvents} />
        </motion.div>

        {/* Past Events */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={
            prefersReducedMotion
              ? { duration: 0.3 }
              : { type: 'spring', stiffness: 120, damping: 18, delay: 0.08 }
          }
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Eventos Concluídos (últimos 30 dias)
                </h2>
                <p className="text-sm text-muted">
                  Relembre os shows recentes já realizados.
                </p>
              </div>
              <Link
                to="/eventos?past=true"
                className="text-sm font-semibold text-purple-700 hover:text-purple-800 dark:text-purple-300 dark:hover:text-purple-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/50 rounded"
              >
                Ver histórico completo
              </Link>
            </div>

            {recentCompletedEvents.length === 0 ? (
              <div className="surface-card-soft border-dashed border-purple-200/70 dark:border-purple-300/25 p-6 text-center text-sm text-muted">
                Nenhum evento concluído nos últimos 30 dias.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {recentCompletedEvents.map(event => (
                  <Link
                    key={event.id}
                    to={`/eventos/${event.id}`}
                    className="surface-card border-purple-200/70 dark:border-purple-300/25 p-4 hover:shadow-xl hover:-translate-y-0.5 transition-all"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold uppercase text-purple-700 dark:text-purple-300">
                        Concluído
                      </span>
                      <span className="text-xs text-subtle">{event.event_date}</span>
                    </div>
                    <p className="text-base font-semibold text-gray-900 dark:text-white">
                      {event.title}
                    </p>
                    <p className="text-sm text-muted">
                      {event.location || 'Local não definido'}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </motion.div>

        {/* Stats Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={
            prefersReducedMotion
              ? { duration: 0.3 }
              : { type: 'spring', stiffness: 120, damping: 18, delay: 0.1 }
          }
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={
                prefersReducedMotion
                  ? { duration: 0.3 }
                  : { type: 'spring', stiffness: 120, damping: 18, delay: 0.1 }
              }
            >
              <Link
                to="/eventos"
                className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 sm:p-6 hover:shadow-xl hover:-translate-y-0.5 transition-all block"
              >
                <Briefcase className="h-8 w-8 text-purple-600 dark:text-purple-400" />
                <p className="text-sm font-semibold text-gray-900 dark:text-white">{agendaCount}</p>
                <p className="text-sm text-muted">Eventos Agendados</p>
              </Link>
            </motion.div>

            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={
                prefersReducedMotion
                  ? { duration: 0.3 }
                  : { type: 'spring', stiffness: 120, damping: 18, delay: 0.15 }
              }
            >
              <Link
                to="/eventos"
                className="bg-white dark:bg-gray-800 rounded-2xl border border-green-200 dark:border-green-800 p-4 sm:p-6 hover:shadow-xl hover:-translate-y-0.5 transition-all block"
              >
                <ListChecks className="h-8 w-8 text-green-600 dark:text-green-400" />
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  {pendingApprovalsCount}
                </p>
                <p className="text-sm text-muted">Solicitações Pendentes</p>
              </Link>
            </motion.div>

            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={
                prefersReducedMotion
                  ? { duration: 0.3 }
                  : { type: 'spring', stiffness: 120, damping: 18, delay: 0.2 }
              }
            >
              <Link
                to="/eventos"
                className="bg-white dark:bg-gray-800 rounded-2xl border border-amber-200 dark:border-amber-800 p-4 sm:p-6 hover:shadow-xl hover:-translate-y-0.5 transition-all block"
              >
                <Zap className="h-8 w-8 text-amber-600 dark:text-amber-400" />
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  {pendingResponsesCount}
                </p>
                <p className="text-sm text-muted">Respostas Pendentes</p>
              </Link>
            </motion.div>

            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={
                prefersReducedMotion
                  ? { duration: 0.3 }
                  : { type: 'spring', stiffness: 120, damping: 18, delay: 0.25 }
              }
            >
              <Link
                to="/disponibilidades"
                className="bg-white dark:bg-gray-800 rounded-2xl border border-indigo-200 dark:border-indigo-800 p-4 sm:p-6 hover:shadow-xl hover:-translate-y-0.5 transition-all block"
              >
                <Clock className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  {todayEvents.length}
                </p>
                <p className="text-sm text-muted">Compromissos de Hoje</p>
              </Link>
            </motion.div>
          </div>
        </motion.div>

        {/* Next Event */}
        {nextEvent && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={
              prefersReducedMotion
                ? { duration: 0.3 }
                : { type: 'spring', stiffness: 140, damping: 20, delay: 0.3 }
            }
          >
            <Link
              to={`/eventos/${nextEvent.id}`}
              className="bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 bg-white dark:from-gray-800 to-gray-900 rounded-2xl border border-indigo-200 dark:border-indigo-900 p-4 sm:p-6 hover:shadow-xl hover:-translate-y-0.5 transition-all block"
            >
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                    Próximo Evento
                  </p>
                  {nextComputedStatus?.label && (
                    <span className={`status-chip ${nextComputedStatus.status || 'default'}`}>
                      {nextComputedStatus.label}
                    </span>
                  )}
                </div>
                <Briefcase className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
              </div>
            </Link>
          </motion.div>
        )}

        {/* No Events */}
        {events.length === 0 && !loading && (
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            transition={
              prefersReducedMotion
                ? { duration: 0.3 }
                : { type: 'spring', stiffness: 120, damping: 18 }
            }
          >
            <div className="flex flex-col items-center justify-center py-20">
              <div className="text-center">
                <Users className="h-12 w-12 text-gray-400" />
                <p className="mt-4 text-muted">
                  Você ainda não tem eventos agendados.
                </p>
                <p className="text-sm text-muted">
                  {user?.user?.first_name || user?.user?.username || 'Músico'}! Vamos criar o
                  primeiro.
                </p>
                <Link
                  to="/eventos/novo"
                  className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary-600 px-6 py-3 text-sm font-semibold text-white shadow-md hover:bg-primary-700 transition-transform hover:-translate-y-0.5"
                >
                  <Plus className="h-5 w-5" />
                  Criar Evento
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </Layout>
  );
});

Dashboard.displayName = 'Dashboard';

export default Dashboard;
