// pages/EventBoard.tsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, ArrowLeft, Users, Clock } from 'lucide-react';
import Layout from '../components/Layout/Layout';
import Loading from '../components/common/Loading';
import { eventService } from '../services/api';
import { showToast } from '../utils/toast';
import { logError } from '../utils/logger';
import { useAuth } from '../contexts/AuthContext';
import type { Availability, Event } from '../types';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getEventComputedStatus } from '../utils/events';
import { formatInstrumentLabel, getMusicianDisplayName } from '../utils/formatting';

type TimeFilter = 'upcoming' | 'past' | 'all';

const toName = (availability: Availability): string => {
  const musician = availability.musician;
  const name = getMusicianDisplayName(musician);
  const instrument = formatInstrumentLabel(musician?.instrument);
  return instrument ? `${name} (${instrument})` : name;
};

const extractNames = (event: Event): string[] => {
  const names = new Set<string>();
  if (event.availabilities?.length) {
    event.availabilities.forEach((a) => {
      const label = toName(a);
      if (label) names.add(label);
    });
  }
  if (event.created_by_name) {
    names.add(event.is_solo ? `${event.created_by_name} (Solo)` : event.created_by_name);
  }
  return Array.from(names);
};

const safeParse = (value?: string | null): Date | null => {
  if (!value) return null;
  try {
    return parseISO(value);
  } catch {
    return null;
  }
};

const formatTimeRange = (event: Event) => {
  const startLabel = event.start_time ? event.start_time.slice(0, 5) : '--:--';
  const endLabel = event.end_time ? event.end_time.slice(0, 5) : '--:--';

  try {
    const startDt = safeParse(event.start_datetime);
    const endDt = safeParse(event.end_datetime);
    if (startDt && endDt) {
      const crossesDay = endDt.getDate() !== startDt.getDate();
      return crossesDay ? `${startLabel} - ${endLabel} (+1d)` : `${startLabel} - ${endLabel}`;
    }
  } catch {
    // ignore parse errors
  }

  return `${startLabel} - ${endLabel}`;
};

const getStartTimestamp = (event: Event): number => {
  const dt = safeParse(event.start_datetime);
  if (dt) return dt.getTime();
  if (event.event_date && event.start_time) {
    const fallback = safeParse(`${event.event_date}T${event.start_time}`);
    if (fallback) return fallback.getTime();
  }
  return 0;
};

const EventBoard: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('upcoming');
  const { user } = useAuth();

  const loadEvents = useCallback(async () => {
    try {
      setLoading(true);
      const params: Record<string, string | boolean> = {
        status: 'proposed,confirmed,approved',
      };
      if (timeFilter === 'upcoming') params.upcoming = true;
      if (timeFilter === 'past') params.past = true;
      const aggregated: Event[] = [];
      let page = 1;
      let hasNext = true;
      while (hasNext) {
        const pageData = await eventService.getAllPaginated({ ...params, page, page_size: 50 });
        aggregated.push(...pageData.results);
        hasNext = Boolean(pageData.next);
        page += 1;
      }
      setEvents(aggregated);
    } catch (error) {
      logError('Erro ao carregar grade de eventos:', error);
      showToast.apiError(error);
    } finally {
      setLoading(false);
    }
  }, [timeFilter]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const isMyEvent = useCallback(
    (event: Event) => {
      if (!user) return false;
      // event.created_by é User.id, user.user.id é User.id
      if (event.created_by === user.user.id) return true;
      // a.musician.id é Musician.id, user.id é Musician.id
      return (event.availabilities || []).some((a) => a.musician?.id === user.id);
    },
    [user],
  );

  const groupedByDate = useMemo(() => {
    const mine = events.filter(isMyEvent);
    const groups = new Map<string, Event[]>();
    mine.forEach((event) => {
      if (!event.event_date) return;
      const key = event.event_date;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(event);
    });

    // Ordena por data ascendente
    return Array.from(groups.entries())
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([dateKey, list]) => ({
        dateKey,
        label: safeParse(dateKey)
          ? format(parseISO(dateKey), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })
          : dateKey,
        events: list.sort((a, b) => getStartTimestamp(a) - getStartTimestamp(b)),
      }));
  }, [events, isMyEvent]);

  const renderEventCard = (event: Event) => {
    const lineup = extractNames(event);
    const computedStatus = getEventComputedStatus(event);
    const statusClass = `status-chip ${computedStatus.status || 'default'}`;
    return (
      <Link
        key={event.id}
        to={`/eventos/${event.id}`}
        className="block rounded-xl border border-white/70 bg-white/90 backdrop-blur p-4 shadow-lg hover:shadow-xl transition-all"
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={statusClass}>{computedStatus.label}</span>
              {event.is_solo && (
                <span className="status-chip default">Solo</span>
              )}
            </div>
            <h3 className="mt-1 text-lg font-semibold text-gray-900">{event.title}</h3>
            <p className="text-sm text-gray-600">{event.location}</p>
            <div className="mt-2 flex items-center gap-3 text-sm text-gray-700">
              <Clock className="h-4 w-4 text-gray-500" />
              <span>{formatTimeRange(event)}</span>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-gray-700">
              <Users className="h-4 w-4 text-gray-500" />
              {lineup.map((name) => (
                <span
                  key={name}
                  className="inline-flex items-center gap-1 rounded-full bg-gray-50 border border-gray-200 px-3 py-1 font-medium text-gray-700"
                >
                  {name}
                </span>
              ))}
            </div>
          </div>
          <Calendar className="h-6 w-6 text-gray-400" />
        </div>
      </Link>
    );
  };

  if (loading) {
    return (
      <Layout>
        <Loading text="Carregando grade de eventos..." />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="hero-panel">
          <div className="spotlight pointer-events-none absolute inset-0 -z-10" />
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="text-sm font-semibold text-primary-700">Grade de eventos</p>
              <h1 className="text-3xl font-bold text-gray-900">Meus eventos</h1>
              <p className="text-gray-600">Eventos organizados por data sob sua gestão ou participação.</p>
            </div>
            <div className="flex gap-3">
              <Link
                to="/eventos"
                className="inline-flex items-center gap-2 rounded-full border border-primary-100 bg-white px-4 py-2 text-sm font-semibold text-primary-700 hover:bg-primary-50"
              >
                <ArrowLeft className="h-4 w-4" />
                Lista de eventos
              </Link>
              <Link
                to="/eventos/novo"
                className="btn-primary inline-flex items-center gap-2 rounded-full shadow"
              >
                Criar evento
              </Link>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {(['upcoming', 'all', 'past'] as TimeFilter[]).map((value) => (
            <button
              key={value}
              onClick={() => setTimeFilter(value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                timeFilter === value
                  ? 'bg-primary-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {value === 'upcoming' ? 'Próximos' : value === 'past' ? 'Histórico' : 'Todos'}
            </button>
          ))}
        </div>

        {groupedByDate.length === 0 ? (
          <div className="card text-center py-12">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">Nenhum evento encontrado para este filtro.</p>
          </div>
        ) : (
          groupedByDate.map((group) => (
            <div key={group.dateKey} className="card-contrast">
              <div className="mb-4 flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <div className="pill-date">
                    <Calendar className="h-4 w-4 text-primary-600" />
                    {group.label}
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                {group.events.map(renderEventCard)}
              </div>
            </div>
          ))
        )}
      </div>
    </Layout>
  );
};

export default EventBoard;
