// pages/Dashboard.tsx
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Clock, Crown, Plus, Users, ChevronRight, Star, ListChecks } from 'lucide-react';
import Layout from '../components/Layout/Layout';
import Loading from '../components/common/Loading';
import { useAuth } from '../contexts/AuthContext';
import { eventService } from '../services/api';
import type { Availability, Event } from '../types';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const instrumentLabels: Record<string, string> = {
  vocal: 'Voz',
  guitar: 'Violão/Guitarra',
  bass: 'Baixo',
  drums: 'Bateria',
  keyboard: 'Teclado',
  other: 'Músico',
};

const formatMusicianLabel = (availability: Availability) => {
  const musician = availability.musician;
  const name =
    musician.full_name ||
    musician.user?.full_name ||
    `${musician.user?.first_name || ''} ${musician.user?.last_name || ''}`.trim() ||
    musician.user?.username;
  const instrument = musician.instrument ? instrumentLabels[musician.instrument] || musician.instrument : '';
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
  const { user, isLeader } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [pendingEvents, setPendingEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  const getStartDateTime = (event: Event): number => {
    try {
      if (event.start_datetime) return parseISO(event.start_datetime).getTime();
      if (event.event_date && event.start_time) {
        return parseISO(`${event.event_date}T${event.start_time}`).getTime();
      }
    } catch (e) {
      return 0;
    }
    return 0;
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [allEvents, pending] = await Promise.all([
        eventService.getAll({ status: 'proposed,approved,confirmed', upcoming: true }),
        eventService.getPendingMyResponse(),
      ]);

      const sorted = [...allEvents].sort((a, b) => getStartDateTime(a) - getStartDateTime(b));
      setEvents(sorted.slice(0, 5)); // Próximos 5 eventos
      setPendingEvents(pending);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const agendaCount = events.length;

  if (loading) {
    return (
      <Layout>
        <Loading text="Carregando..." />
      </Layout>
    );
  }

  const getStatusLabel = (event: Event) => {
    switch (event.status) {
      case 'approved':
        return 'Aprovado pelo Batera!';
      case 'confirmed':
        return 'Confirmado';
      case 'proposed':
        return 'Proposta enviada';
      case 'rejected':
        return 'Rejeitado';
      case 'cancelled':
        return 'Cancelado';
      default:
        return event.status_display;
    }
  };

  return (
    <Layout>
      <div className="space-y-8">
        {/* Hero */}
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-gradient-to-r from-indigo-50 via-white to-blue-50 p-6 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-primary-700">Agenda de Shows</p>
              <h1 className="mt-1 text-3xl font-bold text-gray-900">
                Olá, {user?.user.first_name}! Pronto para o próximo palco?
              </h1>
              <p className="mt-2 text-gray-700">
                Acompanhe os eventos, aprovações e disponibilidade do baterista em um só lugar.
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
                  to="/eventos/agenda"
                  className="inline-flex items-center gap-2 rounded-full border border-primary-200 bg-white px-4 py-2 text-sm font-semibold text-primary-700 hover:bg-primary-50 transition-transform hover:-translate-y-0.5"
                  title="Visão em colunas por músico"
                >
                  <Calendar className="h-4 w-4" />
                  Grade por músico
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
                  title="Agenda do baterista"
                >
                  <Clock className="h-4 w-4" />
                  Agenda do baterista
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Cards de Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="rounded-xl border border-primary-100 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Eventos pendentes</p>
                <p className="text-3xl font-bold text-primary-600">{pendingEvents.length}</p>
              </div>
              <div className="bg-primary-100 p-3 rounded-lg">
                <Clock className="h-8 w-8 text-primary-600" />
              </div>
            </div>
            <Link to="/aprovacoes" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-primary-700">
              Ver aprovações <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="rounded-xl border border-green-100 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Próximos eventos</p>
                <p className="text-3xl font-bold text-green-600">{agendaCount}</p>
              </div>
              <div className="bg-green-100 p-3 rounded-lg">
                <Calendar className="h-8 w-8 text-green-600" />
              </div>
            </div>
            <Link to="/eventos" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-green-700">
              Ver agenda <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          {isLeader ? (
            <div className="rounded-xl border border-amber-100 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Agenda do baterista</p>
                  <p className="text-lg font-semibold text-amber-700">Modo ativo</p>
                </div>
                <div className="bg-amber-100 p-3 rounded-lg">
                  <Crown className="h-8 w-8 text-amber-700" />
                </div>
              </div>
              <Link
                to="/disponibilidades"
                className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-amber-700"
              >
                Gerenciar agenda <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          ) : (
            <div className="rounded-xl border border-blue-100 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Equipe</p>
                  <p className="text-lg font-semibold text-blue-700">Acesso rápido</p>
                </div>
                <div className="bg-blue-100 p-3 rounded-lg">
                  <Star className="h-8 w-8 text-blue-700" />
                </div>
              </div>
              <Link
                to="/eventos/agenda"
                className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-blue-700"
              >
                Ver grade por músico <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          )}
        </div>

        {/* Linha do tempo rápida */}
        <div className="card">
          <div className="flex items-center justify-between mb-3">
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {events.map((event) => (
                <Link
                  key={event.id}
                  to={`/eventos/${event.id}`}
                  className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-primary-600 uppercase">{getStatusLabel(event)}</p>
                      <h3 className="mt-1 text-base font-semibold text-gray-900">{event.title}</h3>
                      <p className="text-sm text-gray-600">{event.location}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {format(parseISO(event.event_date), "dd 'de' MMMM", { locale: ptBR })} •{' '}
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
              ))}
            </div>
          )}
        </div>

        {/* Eventos Aguardando Resposta */}
        {pendingEvents.length > 0 && (
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">
                Aguardando sua Resposta
              </h2>
              <span className="badge badge-pending">{pendingEvents.length}</span>
            </div>
            <div className="space-y-3">
              {pendingEvents.map((event) => (
                <Link
                  key={event.id}
                  to={`/eventos/${event.id}`}
                  className="block p-4 bg-yellow-50 rounded-lg hover:bg-yellow-100 transition-colors"
                >
                  <div className="flex items-start justify-between">
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

        {/* Próximos Eventos */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Próximos Eventos</h2>
            <Link to="/eventos" className="text-primary-600 hover:text-primary-700 text-sm font-medium">
              Ver todos →
            </Link>
          </div>

          {events.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">Nenhum evento próximo</p>
              <Link
                to="/eventos/novo"
                className="mt-4 inline-flex items-center space-x-2 btn-primary"
              >
                <Plus className="h-5 w-5" />
                <span>Criar Evento</span>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {events.map((event) => (
                <Link
                  key={event.id}
                  to={`/eventos/${event.id}`}
                  className="block p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{event.title}</h3>
                      <p className="text-sm text-gray-600 mt-1">{event.location}</p>
                      <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                        <span>
                          {format(parseISO(event.event_date), "dd/MM/yyyy")}
                        </span>
                        <span>
                          {event.start_time.slice(0, 5)} - {event.end_time.slice(0, 5)}
                        </span>
                      </div>
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
                    </div>
                    <span className={`badge badge-${event.status}`}>
                      {event.status_display}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Botão Flutuante para Criar Evento */}
        <Link
          to="/eventos/novo"
          className="fixed bottom-8 right-8 bg-primary-600 hover:bg-primary-700 text-white rounded-full p-4 shadow-lg transition-all hover:scale-110"
          title="Criar novo evento"
        >
          <Plus className="h-6 w-6" />
        </Link>
      </div>
    </Layout>
  );
};

export default Dashboard;
