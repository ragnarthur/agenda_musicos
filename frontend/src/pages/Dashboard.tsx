// pages/Dashboard.tsx
import React, { useMemo, memo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { CalendarClock, Clock, Plus, Users, ListChecks, Zap, Briefcase } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import Layout from '../components/Layout/Layout';
import Loading from '../components/common/Loading';
import { useAuth } from '../contexts/AuthContext';
import { useUpcomingEvents } from '../hooks/useEvents';
import { useDashboardNotifications } from '../hooks/useNotifications';
import type { Event } from '../types';
import { isToday, parseISO, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
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
  const { pendingApprovalsCount, pendingResponsesCount, isLoading: loadingNotifications } = useDashboardNotifications();

  const loading = loadingEvents || loadingNotifications;

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
  const formatTime = useCallback((time?: string) => (time ? time.slice(0, 5) : '--:--'), []);
  const handleScrollToEvents = useCallback(() => {
    document.getElementById('events-section')?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  if (loading) {
    return (
      <Layout>
        <Loading text="Carregando..." />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-8">
        {/* Hero */}
        <motion.div
          className="hero-panel"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={prefersReducedMotion ? { duration: 0.3 } : { type: 'spring', stiffness: 120, damping: 18 }}
        >
          <div className="hero-animated" />

          <div className="spotlight pointer-events-none absolute inset-0 -z-10" />
          <div className="relative flex flex-col md:flex-row md:items-stretch md:justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-primary-700">Agenda Profissional</p>
              <h1 className="mt-1 text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
                Olá, {user?.user?.first_name || user?.user?.username || 'Músico'}!
              </h1>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
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

        {/* Stats Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={prefersReducedMotion ? { duration: 0.3 } : { type: 'spring', stiffness: 120, damping: 18, delay: 0.05 }}
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={prefersReducedMotion ? { duration: 0.3 } : { type: 'spring', stiffness: 120, damping: 18, delay: 0.05 }}
            >
              <Link
                to="/eventos"
                className="bg-white dark:bg-gray-800 rounded-2xl border-2xl border-gray-200 dark:border-gray-700 p-6 hover:shadow-xl hover:-translate-y-0.5] transition-all block"
              >
                <Briefcase className="h-8 w-8 text-purple-600 dark:text-purple-400" />
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  {agendaCount}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Eventos Agendados</p>
              </Link>
            </motion.div>

            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={prefersReducedMotion ? { duration: 0.3 } : { type: 'spring', stiffness: 120, damping: 18, delay: 0.1 }}
            >
              <Link
                to="/eventos"
                className="bg-white dark:bg-gray-800 rounded-2xl border-2xl border-green-200 dark:border-green-800 p-6 hover:shadow-xl hover:-translate-y-0.5] transition-all block"
              >
                <ListChecks className="h-8 w-8 text-green-600 dark:text-green-400" />
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  {pendingApprovalsCount}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Solicitações Pendentes</p>
              </Link>
            </motion.div>

            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={prefersReducedMotion ? { duration: 0.3 } : { type: 'spring', stiffness: 120, damping: 18, delay: 0.15 }}
            >
              <Link
                to="/eventos"
                className="bg-white dark:bg-gray-800 rounded-2xl border-2xl border-amber-200 dark:border-amber-800 p-6 hover:shadow-xl hover:-translate-y-0.5] transition-all block"
              >
                <Zap className="h-8 w-8 text-amber-600 dark:text-amber-400" />
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  {pendingResponsesCount}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Respostas Pendentes</p>
              </Link>
            </motion.div>

            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={prefersReducedMotion ? { duration: 0.3 } : { type: 'spring', stiffness: 120, damping: 18, delay: 0.2 }}
            >
              <Link
                to="/disponibilidades"
                className="bg-white dark:bg-gray-800 rounded-2xl border-2xl border-indigo-200 dark:border-indigo-800 p-6 hover:shadow-xl hover:-translate-y-0.5] transition-all block"
              >
                <Clock className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  {todayEvents.length}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Compromissos de Hoje</p>
              </Link>
            </motion.div>
          </div>
        </motion.div>

        {/* Next Event */}
        {nextEvent && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={prefersReducedMotion ? { duration: 0.3 } : { type: 'spring', stiffness: 140, damping: 20, delay: 0.1 }}
          >
            <Link
              to={`/eventos/${nextEvent.id}`}
              className="bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 bg-white dark:from-gray-800 to-gray-900 rounded-2xl border-2xl border-indigo-200 dark:border-indigo-900 p-6 hover:shadow-xl hover:-translate-y-0.5] transition-all block"
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

        {/* Events List - Próximos 5 Eventos */}
        {events.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            transition={prefersReducedMotion ? { duration: 0.3 } : { type: 'spring', stiffness: 140, damping: 20, delay: 0.15 }}
          >
            <Link
              to="/eventos"
              className="block"
            >
              <p className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <ListChecks className="h-5 w-5 text-gray-700 dark:text-gray-300" />
                Próximos {Math.min(events.length, 5)} Eventos
              </p>
            </Link>
          </motion.div>
        )}

        {/* Events List - Hoje */}
        {todayEvents.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 80 }}
            animate={{ opacity: 1, y: 0 }}
            transition={prefersReducedMotion ? { duration: 0.3 } : { type: 'spring', stiffness: 140, damping: 20, delay: 0.2 }}
          >
            <Link
              to="/eventos"
              className="block"
            >
              <p className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <CalendarClock className="h-5 w-5 text-red-600 dark:text-red-400" />
                Hoje ({todayEvents.length})
              </p>
            </Link>
          </motion.div>
        )}

        {/* No Events */}
        {events.length === 0 && !loading && (
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            transition={prefersReducedMotion ? { duration: 0.3 } : { type: 'spring', stiffness: 120, damping: 18 }}
          >
            <div className="flex flex-col items-center justify-center py-20">
              <div className="text-center">
                <Users className="h-12 w-12 text-gray-400" />
                <p className="mt-4 text-gray-500 dark:text-gray-400">
                  Você ainda não tem eventos agendados.
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {user?.user?.first_name || user?.user?.username || 'Músico'}! Vamos criar o primeiro.
                </p>
                <Link
                  to="/eventos/novo"
                  className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary-600 px-6 py-3 text-sm font-semibold text-white shadow-md hover:bg-primary-700 transition-transform hover:-translate-y-0.5]"
                >
                  <Plus className="h-5 w-5" />
                  Criar Evento
                </Link>
              </div>
            </div>
          </motion.div>
        )}

        {/* Mobile Bottom Sheet para Eventos Recentes */}
        {events.length > 5 && (
          <motion.div
            initial={{ opacity: 0, y: 120 }}
            animate={{ opacity: 1, y: 0 }}
            transition={prefersReducedMotion ? { duration: 0.3 } : { type: 'spring', stiffness: 120, damping: 18 }}
            className="bg-white dark:bg-gray-800 rounded-t-3xl rounded-b-none sm:rounded-xl shadow-xl max-w-md mx-auto pb-safe pt-safe"
          >
            <div className="sticky top-0 z-10 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 pb-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  Eventos Recentes
                </p>
                <Link
                  to="/eventos"
                  className="text-sm text-primary-600 dark:text-primary-400 font-semibold hover:underline"
                >
                  Ver todos
                </Link>
              </div>
            </div>
              <div className="pb-4 overflow-y-auto max-h-[50vh]">
                {(events || []).slice(5).map((event) => (
                <Link
                  key={event.id}
                  to={`/eventos/${event.id}`}
                  className="flex items-start gap-4 p-3 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <div className="flex-1">
                    <div className="w-full text-xs text-gray-500 dark:text-gray-400 mb-1">
                      {format(parseISO(event.event_date), "dd 'de' MMM", { locale: ptBR })}
                    </div>
                    <h4 className="text-base font-semibold text-gray-900 dark:text-white">
                      {event.title}
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                      {event.location || 'Local não definido'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <p className="text-xs font-semibold text-gray-900 dark:text-white mb-1">
                      {formatTime(event.start_time)}
                    </p>
                    <Users className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                  </div>
                </Link>
              ))}
            </div>
        </motion.div>
        )}

        <div className="mt-8 flex items-center gap-2">
          <button
            type="button"
            onClick={handleScrollToEvents}
            className="inline-flex items-center gap-2 rounded-full border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <span className="text-base">↓</span>
            Ver Eventos Recentes
          </button>
        </div>
      </div>

      <div id="events-section">
        {/* Todos os Eventos */}
        <div className="flex flex-col gap-6">
          {events.map((event) => (
            <Link
              key={event.id}
              to={`/eventos/${event.id}`}
              className="flex items-start gap-4 p-3 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex-1"
            >
              <div className="flex-1 min-w-0">
                <div className="w-full text-xs text-gray-500 dark:text-gray-400 mb-1">
                  {format(parseISO(event.event_date), "dd 'de' MMM", { locale: ptBR })}
                </div>
                <h4 className="text-base font-semibold text-gray-900 dark:text-white mb-2">
                  {event.title}
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                  {event.location || 'Local não definido'}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0 min-w-[90px] sm:min-w-[100px]">
                <p className="text-xs font-semibold text-gray-900 dark:text-white mb-1">
                  {formatTime(event.start_time)}
                </p>
                <Users className="h-4 w-4 text-gray-500 dark:text-gray-400" />
              </div>
            </Link>
          ))}
        </div>
      </div>

      <div id="today-section">
        {/* Eventos de Hoje */}
        {todayEvents.length > 0 && (
          <div className="flex flex-col gap-6">
            {todayEvents.map((event) => (
              <Link
                key={event.id}
                to={`/eventos/${event.id}`}
                className="flex items-start gap-4 p-3 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex-1"
              >
                <div className="flex-1 min-w-0">
                  <div className="w-full text-xs text-gray-500 dark:text-gray-400 mb-1">
                    {format(parseISO(event.event_date), "dd 'de' MMM", { locale: ptBR })}
                  </div>
                  <h4 className="text-base font-semibold text-gray-900 dark:text-white mb-2">
                    {event.title}
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                    {event.location || 'Local não definido'}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0 min-w-[90px] sm:min-w-[100px]">
                  <p className="text-xs font-semibold text-gray-900 dark:text-white mb-1">
                    {formatTime(event.start_time)}
                  </p>
                  <Users className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* No Events */}
      {events.length === 0 && !loading && (
        <div className="flex flex-col items-center justify-center py-20">
          <Users className="h-16 w-16 text-gray-400 dark:text-gray-300" />
          <div className="mt-4 text-center">
            <p className="text-gray-500 dark:text-gray-400">
              Você ainda não tem eventos agendados.
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {user?.user?.first_name || user?.user?.username || 'Músico'}! Vamos criar o primeiro evento.
            </p>
          </div>
          <div className="flex items-center gap-2 mt-6">
            <Link
              to="/eventos/novo"
              className="inline-flex items-center gap-2 rounded-full bg-primary-600 px-6 py-3 text-sm font-semibold text-white shadow-md hover:bg-primary-700 transition-transform hover:-translate-y-0.5"
            >
              <Plus className="h-5 w-5" />
              Criar Evento
            </Link>
          </div>
        </div>
      )}
    </Layout>
  );
});

Dashboard.displayName = 'Dashboard';

export default Dashboard;
