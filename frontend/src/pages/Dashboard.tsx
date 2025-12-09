// pages/Dashboard.tsx
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Clock, Crown, Plus } from 'lucide-react';
import Layout from '../components/Layout/Layout';
import Loading from '../components/common/Loading';
import { useAuth } from '../contexts/AuthContext';
import { eventService } from '../services/api';
import type { Event } from '../types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const Dashboard: React.FC = () => {
  const { user, isLeader } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [pendingEvents, setPendingEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [allEvents, pending] = await Promise.all([
        eventService.getAll({ status: 'proposed,approved,confirmed' }),
        eventService.getPendingMyResponse(),
      ]);

      setEvents(allEvents.slice(0, 5)); // Últimos 5 eventos
      setPendingEvents(pending);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

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
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Bem-vindo, {user?.user.first_name}! 👋
          </h1>
          <p className="mt-2 text-gray-600">
            Aqui está um resumo da sua agenda musical
          </p>
        </div>

        {/* Cards de Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Eventos Pendentes</p>
                <p className="text-3xl font-bold text-primary-600">{pendingEvents.length}</p>
              </div>
              <div className="bg-primary-100 p-3 rounded-lg">
                <Clock className="h-8 w-8 text-primary-600" />
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Próximos Eventos</p>
                <p className="text-3xl font-bold text-green-600">{events.length}</p>
              </div>
              <div className="bg-green-100 p-3 rounded-lg">
                <Calendar className="h-8 w-8 text-green-600" />
              </div>
            </div>
          </div>

          {isLeader && (
            <div className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Modo Líder</p>
                  <p className="text-lg font-semibold text-yellow-600">Ativo</p>
                </div>
                <div className="bg-yellow-100 p-3 rounded-lg">
                  <Crown className="h-8 w-8 text-yellow-600" />
                </div>
              </div>
              <Link
                to="/aprovacoes"
                className="mt-4 text-sm text-yellow-700 hover:text-yellow-800 font-medium"
              >
                Ver pendências →
              </Link>
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
                      <p className="text-sm text-gray-500 mt-1">
                        {format(new Date(event.event_date), "dd 'de' MMMM 'de' yyyy", {
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
                          {format(new Date(event.event_date), "dd/MM/yyyy")}
                        </span>
                        <span>
                          {event.start_time.slice(0, 5)} - {event.end_time.slice(0, 5)}
                        </span>
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
