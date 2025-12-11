// pages/EventsList.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Calendar as CalendarIcon, Search, X, Users, Clock } from 'lucide-react';
import Layout from '../components/Layout/Layout';
import Loading from '../components/common/Loading';
import { eventService } from '../services/api';
import type { Availability, Event } from '../types';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type TimeFilter = 'upcoming' | 'past' | 'all';

const instrumentLabels: Record<string, string> = {
  vocal: 'Voz',
  guitar: 'Violão/Guitarra',
  bass: 'Baixo',
  drums: 'Bateria',
  keyboard: 'Teclado',
  other: 'Músico',
};

const toName = (availability: Availability): string => {
  const musician = availability.musician;
  const name =
    musician.full_name ||
    musician.user?.full_name ||
    `${musician.user?.first_name || ''} ${musician.user?.last_name || ''}`.trim() ||
    musician.user?.username ||
    '';
  const instrument = musician.instrument ? instrumentLabels[musician.instrument] || musician.instrument : '';
  return instrument ? `${name} (${instrument})` : name;
};

const extractLineup = (event: Event): string[] => {
  const names = new Set<string>();
  const availList = event.availabilities || [];
  if (availList.length) {
    availList.forEach((a) => {
      const label = toName(a);
      if (label) names.add(label);
    });
  }
  if (event.created_by_name) {
    names.add(event.is_solo ? `${event.created_by_name} (Solo)` : event.created_by_name);
  }
  return Array.from(names);
};

const normalize = (value?: string | null) => (value || '').toLowerCase();

const belongsTo = (event: Event, target: 'sara' | 'arthur'): boolean => {
  const targets =
    target === 'sara'
      ? ['sara', 'carmo']
      : ['arthur', 'araujo', 'araújo'];

  const checkString = (text?: string | null) => targets.some((t) => normalize(text).includes(t));

  const availList = event.availabilities || [];
  if (availList.length) {
    for (const avail of availList) {
      const fullName =
        avail.musician?.full_name ||
        avail.musician?.user?.full_name ||
        `${avail.musician?.user?.first_name || ''} ${avail.musician?.user?.last_name || ''}`.trim();
      if (checkString(fullName)) return true;
    }
  }

  if (checkString(event.created_by_name) || checkString(event.approved_by_name)) {
    return true;
  }

  return false;
};

const EventsList: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('upcoming');

  useEffect(() => {
    loadEvents();
  }, [filter, timeFilter]);

  // Debounce para busca
  useEffect(() => {
    const timer = setTimeout(() => {
      loadEvents();
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const loadEvents = async () => {
    try {
      setLoading(true);
      const params: Record<string, string | boolean> = {};

      if (filter !== 'all') {
        params.status = filter;
      }

      if (searchTerm.trim()) {
        params.search = searchTerm.trim();
      }

      if (timeFilter === 'upcoming') {
        params.upcoming = true;
      } else if (timeFilter === 'past') {
        params.past = true;
      }

      const data = await eventService.getAll(params);
      setEvents(data);
    } catch (error) {
      console.error('Erro ao carregar eventos:', error);
    } finally {
      setLoading(false);
    }
  };

  const groups = useMemo(() => {
    const byDate = new Map<string, Event[]>();
    events.forEach((event) => {
      const key = format(parseISO(event.event_date), 'yyyy-MM-dd');
      if (!byDate.has(key)) byDate.set(key, []);
      byDate.get(key)!.push(event);
    });

    return Array.from(byDate.entries())
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([dateKey, list]) => {
        const dateObj = parseISO(dateKey);
        const today = new Date();
        const diffDays = Math.floor((dateObj.getTime() - today.setHours(0, 0, 0, 0)) / (1000 * 60 * 60 * 24));

        const tone =
          diffDays < 0
            ? 'bg-gray-50 border-gray-200'
            : diffDays <= 7
              ? 'bg-emerald-50 border-emerald-200'
              : diffDays <= 30
                ? 'bg-blue-50 border-blue-200'
                : 'bg-indigo-50 border-indigo-200';

        return {
          dateKey,
          label: format(dateObj, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR }),
          tone,
          sara: list
            .filter((ev) => belongsTo(ev, 'sara'))
            .sort((a, b) => getStartDateTime(a) - getStartDateTime(b)),
          arthur: list
            .filter((ev) => belongsTo(ev, 'arthur'))
            .sort((a, b) => getStartDateTime(a) - getStartDateTime(b)),
        };
      });
  }, [events]);

  const renderEventCard = (event: Event) => {
    const lineup = extractLineup(event);
    const startLabel = event.start_time ? event.start_time.slice(0, 5) : '--:--';
    const endLabel = event.end_time ? event.end_time.slice(0, 5) : '--:--';
    return (
      <Link
        key={event.id}
        to={`/eventos/${event.id}`}
        className="block rounded-xl border border-gray-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow"
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wide">
              <span className="font-semibold text-primary-600">{event.status_display}</span>
              {event.is_solo && (
                <span className="rounded-full bg-indigo-50 px-2 py-0.5 font-semibold text-indigo-700">Solo</span>
              )}
            </div>
            <h3 className="mt-1 text-lg font-semibold text-gray-900">{event.title}</h3>
            <p className="text-sm text-gray-600">{event.location}</p>
            <div className="mt-2 flex items-center gap-3 text-sm text-gray-700">
              <Clock className="h-4 w-4 text-gray-500" />
              <span>
                {startLabel} - {endLabel}
              </span>
              {event.payment_amount && <span>R$ {event.payment_amount}</span>}
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
          <span className={`badge badge-${event.status}`}>{event.status_display}</span>
        </div>
      </Link>
    );
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Eventos</h1>
          <Link to="/eventos/novo" className="btn-primary flex items-center space-x-2">
            <Plus className="h-5 w-5" />
            <span>Novo Evento</span>
          </Link>
        </div>

        {/* Busca */}
        <div className="card">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field pl-10 pr-10"
              placeholder="Buscar eventos por título ou local..."
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>

        {/* Filtro de Tempo */}
        <div className="flex space-x-2 overflow-x-auto pb-2">
          {([
            { value: 'upcoming', label: 'Próximos' },
            { value: 'all', label: 'Todos' },
            { value: 'past', label: 'Histórico' },
          ] as { value: TimeFilter; label: string }[]).map((item) => (
            <button
              key={item.value}
              onClick={() => setTimeFilter(item.value)}
              className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                timeFilter === item.value
                  ? 'bg-primary-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Filtros de Status */}
        <div className="flex space-x-2 overflow-x-auto pb-2">
          {[
            { value: 'all', label: 'Todos' },
            { value: 'proposed', label: 'Propostas' },
            { value: 'approved', label: 'Aprovados' },
            { value: 'confirmed', label: 'Confirmados' },
          ].map((item) => (
            <button
              key={item.value}
              onClick={() => setFilter(item.value)}
              className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                filter === item.value
                  ? 'bg-primary-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {loading ? (
          <Loading text="Carregando eventos..." />
        ) : events.length === 0 ? (
          <div className="card text-center py-12">
            <CalendarIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">Nenhum evento encontrado</p>
            <Link to="/eventos/novo" className="btn-primary inline-flex items-center space-x-2">
              <Plus className="h-5 w-5" />
              <span>Criar Primeiro Evento</span>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {groups.map((group) => {
              if (group.sara.length === 0 && group.arthur.length === 0) return null;
              return (
                <div
                  key={group.dateKey}
                  className={`rounded-xl border p-4 shadow-sm ${group.tone}`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-primary-600">Data</p>
                      <h2 className="text-lg font-bold text-gray-900">
                        {group.label}
                      </h2>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-base font-semibold text-gray-900">Sara (Voz/Violão)</h3>
                        <span className="text-xs text-gray-600">{group.sara.length} evento(s)</span>
                      </div>
                      {group.sara.length === 0 ? (
                        <p className="text-sm text-gray-500 italic">Sem eventos nesta data.</p>
                      ) : (
                        <div className="space-y-3">{group.sara.map(renderEventCard)}</div>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-base font-semibold text-gray-900">Arthur (Voz/Violão/Guitarra)</h3>
                        <span className="text-xs text-gray-600">{group.arthur.length} evento(s)</span>
                      </div>
                      {group.arthur.length === 0 ? (
                        <p className="text-sm text-gray-500 italic">Sem eventos nesta data.</p>
                      ) : (
                        <div className="space-y-3">{group.arthur.map(renderEventCard)}</div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default EventsList;
const getStartDateTime = (event: Event): number => {
  try {
    if (event.start_datetime) {
      return parseISO(event.start_datetime).getTime();
    }
    if (event.event_date && event.start_time) {
      return parseISO(`${event.event_date}T${event.start_time}`).getTime();
    }
  } catch (e) {
    // ignore parse errors
  }
  return 0;
};
