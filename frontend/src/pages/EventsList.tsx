// pages/EventsList.tsx
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Calendar as CalendarIcon, Search, X } from 'lucide-react';
import Layout from '../components/Layout/Layout';
import Loading from '../components/common/Loading';
import { eventService } from '../services/api';
import type { Event } from '../types';
import { format, parseISO } from 'date-fns';

const EventsList: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [timeFilter, setTimeFilter] = useState<'upcoming' | 'past' | 'all'>('upcoming');

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
          {[
            { value: 'upcoming', label: 'Próximos' },
            { value: 'all', label: 'Todos' },
            { value: 'past', label: 'Histórico' },
          ].map((item) => (
            <button
              key={item.value}
              onClick={() => setTimeFilter(item.value as 'upcoming' | 'past' | 'all')}
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
          <div className="grid grid-cols-1 gap-4">
            {events.map((event) => (
              <Link
                key={event.id}
                to={`/eventos/${event.id}`}
                className="card hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">{event.title}</h3>
                    <p className="text-gray-600 mt-1">{event.location}</p>
                    <div className="flex items-center space-x-4 mt-3 text-sm text-gray-500">
                        <span>{format(parseISO(event.event_date), 'dd/MM/yyyy')}</span>
                      <span>
                        {event.start_time.slice(0, 5)} - {event.end_time.slice(0, 5)}
                      </span>
                      {event.payment_amount && <span>R$ {event.payment_amount}</span>}
                    </div>
                    {event.availability_summary && (
                      <div className="flex items-center space-x-3 mt-3">
                        <span className="text-xs text-gray-500">Disponibilidade:</span>
                        <span className="text-xs text-green-600 font-medium">
                          ✓ {event.availability_summary.available}
                        </span>
                        <span className="text-xs text-red-600 font-medium">
                          ✗ {event.availability_summary.unavailable}
                        </span>
                        <span className="text-xs text-blue-600 font-medium">
                          ? {event.availability_summary.maybe}
                        </span>
                        <span className="text-xs text-yellow-600 font-medium">
                          ⏱ {event.availability_summary.pending}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="ml-4 flex flex-col items-end space-y-2">
                    <span className={`badge badge-${event.status}`}>{event.status_display}</span>
                    <span className="text-xs text-gray-500">Por {event.created_by_name}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default EventsList;
