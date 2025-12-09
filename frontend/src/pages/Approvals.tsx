// pages/Approvals.tsx
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Crown, Calendar, MapPin, Clock } from 'lucide-react';
import Layout from '../components/Layout/Layout';
import Loading from '../components/common/Loading';
import { eventService } from '../services/api';
import type { Event } from '../types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const Approvals: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPendingEvents();
  }, []);

  const loadPendingEvents = async () => {
    try {
      setLoading(true);
      const data = await eventService.getAll({ pending_approval: true });
      setEvents(data);
    } catch (error) {
      console.error('Erro ao carregar eventos pendentes:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center space-x-3">
          <div className="bg-yellow-100 p-3 rounded-lg">
            <Crown className="h-8 w-8 text-yellow-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Aprovações Pendentes</h1>
            <p className="text-gray-600">Eventos aguardando sua aprovação como líder</p>
          </div>
        </div>

        {loading ? (
          <Loading text="Carregando eventos pendentes..." />
        ) : events.length === 0 ? (
          <div className="card text-center py-12">
            <Crown className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Nenhuma aprovação pendente
            </h3>
            <p className="text-gray-600">
              Não há eventos aguardando sua aprovação no momento.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {events.map((event) => (
              <div key={event.id} className="card hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-start space-x-3">
                      <Calendar className="h-6 w-6 text-primary-600 mt-1" />
                      <div>
                        <h3 className="text-xl font-semibold text-gray-900">{event.title}</h3>
                        <p className="text-gray-600 mt-1">{event.description}</p>
                      </div>
                    </div>
                  </div>
                  <span className="badge badge-proposed">{event.status_display}</span>
                </div>

                {/* Informações do Evento */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className="flex items-center space-x-2 text-gray-600">
                    <Calendar className="h-5 w-5" />
                    <span>
                      {format(new Date(event.event_date), "dd 'de' MMMM 'de' yyyy", {
                        locale: ptBR,
                      })}
                    </span>
                  </div>

                  <div className="flex items-center space-x-2 text-gray-600">
                    <Clock className="h-5 w-5" />
                    <span>
                      {event.start_time.slice(0, 5)} - {event.end_time.slice(0, 5)}
                    </span>
                  </div>

                  <div className="flex items-center space-x-2 text-gray-600">
                    <MapPin className="h-5 w-5" />
                    <span>{event.location}</span>
                  </div>

                  <div className="text-gray-600">
                    <span className="text-sm">Criado por: </span>
                    <span className="font-medium">{event.created_by_name}</span>
                  </div>
                </div>

                {/* Resumo de Disponibilidade */}
                {event.availability_summary && (
                  <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600 mb-2">Disponibilidade dos músicos:</p>
                    <div className="flex items-center space-x-4">
                      <span className="text-sm">
                        <span className="text-green-600 font-medium">
                          ✓ {event.availability_summary.available}
                        </span>
                        <span className="text-gray-500"> disponíveis</span>
                      </span>
                      <span className="text-sm">
                        <span className="text-red-600 font-medium">
                          ✗ {event.availability_summary.unavailable}
                        </span>
                        <span className="text-gray-500"> indisponíveis</span>
                      </span>
                      <span className="text-sm">
                        <span className="text-blue-600 font-medium">
                          ? {event.availability_summary.maybe}
                        </span>
                        <span className="text-gray-500"> talvez</span>
                      </span>
                      <span className="text-sm">
                        <span className="text-yellow-600 font-medium">
                          ⏱ {event.availability_summary.pending}
                        </span>
                        <span className="text-gray-500"> pendentes</span>
                      </span>
                    </div>
                  </div>
                )}

                {/* Ações */}
                <div className="flex items-center space-x-3">
                  <Link
                    to={`/eventos/${event.id}`}
                    className="flex-1 btn-secondary text-center"
                  >
                    Ver Detalhes
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Informação */}
        {!loading && events.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <Crown className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-yellow-800">Modo Líder Ativo</p>
                <p className="text-sm text-yellow-700 mt-1">
                  Você pode aprovar ou rejeitar esses eventos. Clique em "Ver Detalhes" para
                  analisar cada proposta e tomar uma decisão.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Approvals;
