// pages/Dashboard.tsx
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, CalendarClock, Clock, Plus, Users, ChevronRight, ListChecks, Zap, Briefcase } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import Layout from '../components/Layout/Layout';
import Loading from '../components/common/Loading';
import { useAuth } from '../contexts/AuthContext';
import { eventService } from '../services/api';
import type { Availability, Event } from '../types';
import { format, isToday, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import TiltCard from '../components/common/TiltCard';
import { getEventComputedStatus } from '../utils/events';
import { formatInstrumentLabel, getMusicianDisplayName } from '../utils/formatting';
import { showToast } from '../utils/toast';
import { logError } from '../utils/logger';

const formatMusicianLabel = (availability: Availability) => {
  const musician = availability.musician;
  const name = getMusicianDisplayName(musician);
  const instrument = formatInstrumentLabel(musician?.instrument);
  return instrument ? `${name} (${instrument})` : name;
};

const buildLineup = (event: Event): string[] => {
  const availabilities = event.availabilities || [];

  if (event.is_solo || availabilities.length === 0) {
    return [event.is_solo ? `${event.created_by_name} (Solo)` : event.created_by_name];
  }

  const uniqueByMusician = new Map<number, string>();
  availabilities.forEach((availability) => {
    if (availability.musician?.id && !uniqueByMusician.has(availability.musician.id)) {
      uniqueByMusician.set(availability.musician.id, formatMusicianLabel(availability));
    }
  });

  const lineup = Array.from(uniqueByMusician.values());
  return lineup.length ? lineup : [event.created_by_name];
};

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<Event[]>([]);
  const [pendingResponses, setPendingResponses] = useState<Event[]>([]);
  const [todayEvents, setTodayEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const nextEvent = events[0];
  const nextComputedStatus = nextEvent ? getEventComputedStatus(nextEvent) : null;
  const prefersReducedMotion = useReducedMotion();

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
        // continua tentando com start_datetime
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

  const formatTime = (time?: string) => (time ? time.slice(0, 5) : '--:--');

  useEffect(() => {
    let ignore = false;

    const fetchData = async () => {
      setLoading(true);
      const [eventsResult, approvalsResult, responsesResult] = await Promise.allSettled([
        eventService.getAll({ status: 'proposed,confirmed,approved', upcoming: true }),
        eventService.getAll({ pending_approval: true }),
        eventService.getPendingMyResponse(),
      ]);

      if (ignore) return;

      if (eventsResult.status === 'fulfilled') {
        const sorted = [...eventsResult.value].sort((a, b) => getStartDateTime(a) - getStartDateTime(b));
        setTodayEvents(eventsResult.value.filter(isEventToday));
        setEvents(sorted.slice(0, 5));
      } else {
        logError('Erro ao carregar eventos:', eventsResult.reason);
        showToast.apiError(eventsResult.reason);
        setTodayEvents([]);
        setEvents([]);
      }

      if (approvalsResult.status === 'fulfilled') {
        setPendingApprovals(approvalsResult.value);
      } else {
        logError('Erro ao carregar pendências:', approvalsResult.reason);
        showToast.apiError(approvalsResult.reason);
        setPendingApprovals([]);
      }

      if (responsesResult.status === 'fulfilled') {
        setPendingResponses(responsesResult.value);
      } else {
        logError('Erro ao carregar respostas pendentes:', responsesResult.reason);
        showToast.apiError(responsesResult.reason);
        setPendingResponses([]);
      }

      setLoading(false);
    };

    fetchData();

    return () => {
      ignore = true;
    };
  }, []);

  const agendaCount = events.length;

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
          transition={{ type: 'spring', stiffness: 120, damping: 18 }}
        >
          <div className="hero-animated" />
          <div className="spotlight pointer-events-none absolute inset-0 -z-10" />
          <div className="relative flex flex-col md:flex-row md:items-stretch md:justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-primary-700">Agenda Profissional</p>
              <h1 className="mt-1 text-3xl font-bold text-gray-900">
                Olá, {user?.user.first_name}. Gerencie seus shows e compromissos com precisão.
              </h1>
              <p className="mt-2 text-gray-700">
                Centralize eventos, convites e disponibilidades da equipe em um só lugar.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  to="/eventos/novo"
                  className="inline-flex items-center gap-2 rounded-full bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow hover:shadow-md hover:bg-primary-700 transition-transform hover:-translate-y-0.5"
                  title="Criar novo evento"
                >
                  <Plus className="h-4 w-4" />
                  Novo evento
                </Link>
                <Link
                  to="/marketplace"
                  className="inline-flex items-center gap-2 rounded-full border border-primary-200 bg-white px-4 py-2 text-sm font-semibold text-primary-700 hover:bg-primary-50 transition-transform hover:-translate-y-0.5"
                  title="Ver oportunidades no marketplace"
                >
                  <Briefcase className="h-4 w-4" />
                  Vagas
                </Link>
                <Link
                  to="/eventos"
                  className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50 transition-transform hover:-translate-y-0.5"
                  title="Ver todas as datas"
                >
                  <ListChecks className="h-4 w-4" />
                  Todas as datas
                </Link>
                <Link
                  to="/disponibilidades"
                  className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50 transition-transform hover:-translate-y-0.5"
                  title="Disponibilidades"
                >
                  <Clock className="h-4 w-4" />
                  Disponibilidades
                </Link>
              </div>
            </div>

            {nextEvent && (
              <div className="w-full md:w-80 rounded-2xl p-[1px] bg-gradient-to-br from-indigo-200 via-white to-cyan-200 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 shadow-xl">
                <TiltCard className="rounded-[18px] border border-white/60 bg-white/85 backdrop-blur px-4 py-3 shadow-inner flex flex-col justify-between h-full">
                  <div className="flex items-center gap-2 text-xs font-semibold text-primary-700 uppercase">
                    <Zap className="h-4 w-4" />
                    Evento mais próximo
                  </div>
                  <div className="mt-2 space-y-2">
                    <div className="pill-date">
                      <Calendar className="h-4 w-4 text-primary-600" />
                      {format(parseISO(nextEvent.event_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 line-clamp-1">{nextEvent.title}</h3>
                    <p className="text-sm text-gray-600 line-clamp-1">{nextEvent.location || 'Local a definir'}</p>
                    <p className="text-xs text-gray-500">
                      {nextEvent.start_time.slice(0, 5)} - {nextEvent.end_time.slice(0, 5)}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-gray-700">
                      <Users className="h-4 w-4 text-gray-500" />
                      {buildLineup(nextEvent).map((name) => (
                        <span
                          key={name}
                          className="inline-flex items-center gap-1 rounded-full bg-gray-50 border border-gray-200 px-3 py-1 font-medium text-gray-700"
                        >
                          {name}
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`status-chip ${nextComputedStatus?.status || nextEvent.status || 'default'}`}>
                        {nextComputedStatus?.label}
                      </span>
                    </div>
                  </div>
                  <Link
                    to={`/eventos/${nextEvent.id}`}
                    className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary-700 hover:text-primary-800"
                  >
                    Ver detalhes <ChevronRight className="h-4 w-4" />
                  </Link>
                </TiltCard>
              </div>
            )}
          </div>
        </motion.div>

        {/* Alertas do dia */}
        {todayEvents.length > 0 && (
          <motion.div
            className="relative overflow-hidden rounded-2xl border border-amber-200 bg-amber-50/90 backdrop-blur p-4 shadow-lg"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 140, damping: 18, delay: 0.05 }}
          >
            <div className="hero-animated opacity-40" />
            <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-start gap-3">
                <div className="h-12 w-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shadow-inner">
                  <CalendarClock className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-amber-700 font-semibold">Eventos de hoje</p>
                  <h3 className="text-lg sm:text-xl font-bold text-amber-900">
                    {todayEvents.length === 1
                      ? 'Você tem 1 evento hoje'
                      : `Você tem ${todayEvents.length} eventos hoje`}
                  </h3>
                  <p className="text-sm text-amber-800">
                    Revise horário, local e equipe antes de sair para o show.
                  </p>
                </div>
              </div>

              <div className="grid w-full md:w-auto grid-cols-1 sm:grid-cols-2 gap-2">
                {todayEvents.slice(0, 3).map((event) => {
                  const computedStatus = getEventComputedStatus(event);
                  const dateLabel = (() => {
                    try {
                      return event.event_date
                        ? format(parseISO(event.event_date), "dd 'de' MMMM", { locale: ptBR })
                        : 'Data a definir';
                    } catch {
                      return 'Data a definir';
                    }
                  })();

                  return (
                    <Link
                      key={event.id}
                      to={`/eventos/${event.id}`}
                      className="relative overflow-hidden rounded-xl border border-amber-200 bg-white/90 backdrop-blur px-3 py-2 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5"
                    >
                      <div className="hero-animated opacity-30" />
                      <div className="relative flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <p className="text-sm font-semibold text-gray-900 line-clamp-1">{event.title}</p>
                          <p className="text-xs text-gray-600 line-clamp-1">{event.location || 'Local a definir'}</p>
                          <p className="text-[11px] text-gray-500">
                            Hoje · {formatTime(event.start_time)} - {formatTime(event.end_time)}
                          </p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-amber-600 flex-shrink-0" />
                      </div>
                      <div className="relative mt-2 flex items-center gap-2 flex-wrap">
                        <span className={`status-chip ${computedStatus.status || 'default'}`}>
                          {computedStatus.label}
                        </span>
                        <span className="pill-date">
                          <Clock className="h-4 w-4 text-primary-600" />
                          {dateLabel}
                        </span>
                      </div>
                    </Link>
                  );
                })}
                {todayEvents.length > 3 && (
                  <Link
                    to="/eventos"
                    className="inline-flex items-center justify-center rounded-xl border border-amber-200 bg-amber-100 text-amber-800 px-3 py-2 text-sm font-semibold hover:bg-amber-200 transition-colors"
                  >
                    Ver todos (+{todayEvents.length - 3})
                  </Link>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* Cards de Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <motion.div
            className="relative overflow-hidden card-contrast"
            whileHover={prefersReducedMotion ? undefined : { y: -4, scale: 1.01 }}
            transition={{ type: 'spring', stiffness: 200, damping: 16 }}
          >
            <div className="hero-animated opacity-60" />
            <div className="relative flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Convites pendentes</p>
                <p className="text-3xl font-bold text-primary-600">{pendingApprovals.length}</p>
              </div>
              <div className="bg-primary-100 p-3 rounded-lg">
                <Clock className="h-8 w-8 text-primary-600" />
              </div>
            </div>
            <Link to="/aprovacoes" className="relative mt-3 inline-flex items-center gap-1 text-sm font-semibold text-primary-700">
              Ver convites <ChevronRight className="h-4 w-4" />
            </Link>
          </motion.div>

          <motion.div
            className="relative overflow-hidden card-contrast"
            whileHover={prefersReducedMotion ? undefined : { y: -4, scale: 1.01 }}
            transition={{ type: 'spring', stiffness: 200, damping: 16 }}
          >
            <div className="hero-animated opacity-60" />
            <div className="relative flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Próximos eventos</p>
                <p className="text-3xl font-bold text-green-600">{agendaCount}</p>
              </div>
              <div className="bg-green-100 p-3 rounded-lg">
                <Calendar className="h-8 w-8 text-green-600" />
              </div>
            </div>
            <Link to="/eventos" className="relative mt-3 inline-flex items-center gap-1 text-sm font-semibold text-green-700">
              Ver agenda <ChevronRight className="h-4 w-4" />
            </Link>
          </motion.div>

          <motion.div
            className="relative overflow-hidden card-contrast"
            whileHover={prefersReducedMotion ? undefined : { y: -4, scale: 1.01 }}
            transition={{ type: 'spring', stiffness: 200, damping: 16 }}
          >
            <div className="hero-animated opacity-60" />
            <div className="relative flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Disponibilidades</p>
                <p className="text-lg font-semibold text-amber-700">Compartilhe sua agenda</p>
              </div>
              <div className="bg-amber-100 p-3 rounded-lg">
                <CalendarClock className="h-8 w-8 text-amber-700" />
              </div>
            </div>
            <Link
              to="/disponibilidades"
              className="relative mt-3 inline-flex items-center gap-1 text-sm font-semibold text-amber-700"
            >
              Ver disponibilidades <ChevronRight className="h-4 w-4" />
            </Link>
          </motion.div>
        </div>

        {/* Linha do tempo rápida */}
        <div className="card relative overflow-hidden">
          <div className="hero-animated opacity-60" />
          <div className="relative flex items-center justify-between mb-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-primary-600">Próximos eventos</p>
              <h2 className="text-lg font-bold text-gray-900">Agenda em ordem cronológica</h2>
            </div>
            <Link to="/eventos" className="text-sm font-semibold text-primary-700 inline-flex items-center gap-1">
              Ver tudo <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
          {events.length === 0 ? (
            <p className="text-sm text-gray-500">Nenhum evento futuro.</p>
          ) : (
            <div className="relative grid grid-cols-1 md:grid-cols-2 gap-3">
              {events.map((event) => {
                const computedStatus = getEventComputedStatus(event);
                return (
                  <Link
                    key={event.id}
                    to={`/eventos/${event.id}`}
                    className="relative overflow-hidden rounded-xl border border-white/70 bg-white/90 backdrop-blur p-4 shadow-lg hover:shadow-xl transition-all"
                  >
                    <div className="hero-animated opacity-50" />
                    <div className="relative flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`status-chip ${computedStatus.status || 'default'}`}>
                            {computedStatus.label}
                          </span>
                          <span className="pill-date">
                            <Clock className="h-4 w-4 text-primary-600" />
                            {format(parseISO(event.event_date), "dd 'de' MMMM", { locale: ptBR })}
                          </span>
                        </div>
                        <h3 className="mt-1 text-base font-semibold text-gray-900">{event.title}</h3>
                        <p className="text-sm text-gray-600">{event.location}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {event.start_time.slice(0, 5)} - {event.end_time.slice(0, 5)}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-gray-700">
                          <Users className="h-4 w-4 text-gray-500" />
                          {buildLineup(event).map((name) => (
                            <span
                              key={name}
                              className="inline-flex items-center gap-1 rounded-full bg-gray-50 border border-gray-200 px-3 py-1 font-medium text-gray-700"
                            >
                              {name}
                            </span>
                          ))}
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-gray-400" />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Eventos Aguardando Resposta */}
        {pendingResponses.length > 0 && (
          <div className="card relative overflow-hidden">
            <div className="hero-animated opacity-50" />
            <div className="relative flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">
                Aguardando sua Resposta
              </h2>
              <span className="badge badge-pending">{pendingResponses.length}</span>
            </div>
            <div className="space-y-3">
              {pendingResponses.map((event) => (
                <Link
                  key={event.id}
                  to={`/eventos/${event.id}`}
                  className="relative block p-4 bg-yellow-50/80 rounded-lg hover:bg-yellow-100 transition-colors overflow-hidden"
                >
                  <div className="hero-animated opacity-40" />
                  <div className="relative flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{event.title}</h3>
                      <p className="text-sm text-gray-600 mt-1">{event.location}</p>
                      <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-gray-700">
                        <Users className="h-4 w-4 text-gray-500" />
                        {buildLineup(event).map((name) => (
                          <span
                            key={name}
                            className="inline-flex items-center gap-1 rounded-full bg-white border border-gray-200 px-3 py-1 font-medium text-gray-700"
                          >
                            {name}
                          </span>
                        ))}
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        {format(parseISO(event.event_date), "dd 'de' MMMM 'de' yyyy", {
                          locale: ptBR,
                        })}
                      </p>
                    </div>
                    <span className={`badge badge-${event.status}`}>
                      {event.status_display}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Botão Flutuante para Criar Evento - posicionado acima da navbar mobile */}
        <Link
          to="/eventos/novo"
          className="fixed bottom-24 md:bottom-8 right-4 md:right-8 bg-primary-600 hover:bg-primary-700 text-white rounded-full p-4 shadow-lg transition-all hover:scale-110 z-30"
          title="Criar novo evento"
        >
          <Plus className="h-6 w-6" />
        </Link>
      </div>
    </Layout>
  );
};

export default Dashboard;
