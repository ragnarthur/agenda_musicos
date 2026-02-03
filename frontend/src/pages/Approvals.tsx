// pages/Approvals.tsx
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, MapPin, Clock, UserCheck } from 'lucide-react';
import Layout from '../components/Layout/Layout';
import Loading from '../components/common/Loading';
import { eventService } from '../services/eventService';
import type { Event } from '../types';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { showToast } from '../utils/toast';
import { logError } from '../utils/logger';

const Approvals: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPendingEvents();
  }, []);

  const loadPendingEvents = async () => {
    try {
      setLoading(true);
      const data = await eventService.getPendingMyResponse();
      setEvents(data);
    } catch (error) {
      logError('Erro ao carregar eventos pendentes:', error);
      showToast.apiError(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="page-stack">
        {/* Header */}
        <div className="hero-panel flex items-start gap-3">
          <div className="bg-emerald-100 p-2.5 sm:p-3 rounded-lg flex-shrink-0">
            <UserCheck className="h-6 w-6 sm:h-8 sm:w-8 text-emerald-600" />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Convites Pendentes</h1>
            <p className="text-gray-600 text-sm sm:text-base">Eventos aguardando sua resposta</p>
          </div>
        </div>

        {loading ? (
          <Loading text="Carregando eventos pendentes..." />
        ) : events.length === 0 ? (
          <div className="card text-center py-12">
            <UserCheck className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhum convite pendente</h3>
            <p className="text-gray-600">Não há eventos aguardando sua resposta no momento.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {events.map(event => (
              <div key={event.id} className="card hover:shadow-lg transition-shadow">
                {/* Header do card - responsivo */}
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-4 mb-4">
                  <div className="flex items-start gap-2 sm:gap-3 min-w-0 flex-1">
                    <Calendar className="h-5 w-5 sm:h-6 sm:w-6 text-primary-600 mt-0.5 flex-shrink-0" />
                    <div className="min-w-0">
                      <h3 className="text-lg sm:text-xl font-semibold text-gray-900 break-words">
                        {event.title}
                      </h3>
                      <p className="text-gray-600 mt-1 text-sm sm:text-base line-clamp-2">
                        {event.description}
                      </p>
                    </div>
                  </div>
                  <span className="badge badge-proposed self-start flex-shrink-0">
                    Convite pendente
                  </span>
                </div>

                {/* Informações do Evento */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4 mb-4 text-sm sm:text-base">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Calendar className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                    <span className="truncate">
                      {format(parseISO(event.event_date), "dd 'de' MMMM 'de' yyyy", {
                        locale: ptBR,
                      })}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-gray-600">
                    <Clock className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                    <span>
                      {event.start_time.slice(0, 5)} - {event.end_time.slice(0, 5)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-gray-600">
                    <MapPin className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                    <span className="truncate">{event.location}</span>
                  </div>

                  <div className="text-gray-600">
                    <span className="text-xs sm:text-sm">Criado por: </span>
                    <span className="font-medium">{event.created_by_name}</span>
                  </div>
                </div>

                {/* Resumo de Disponibilidade */}
                {event.availability_summary && (
                  <div className="mb-4 p-2 sm:p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs sm:text-sm text-gray-600 mb-2">Respostas dos músicos:</p>
                    <div className="grid grid-cols-2 gap-1.5 sm:flex sm:items-center sm:gap-4">
                      <span className="text-xs sm:text-sm">
                        <span className="text-green-600 font-medium">
                          ✓ {event.availability_summary.available}
                        </span>
                        <span className="text-gray-500"> disponíveis</span>
                      </span>
                      <span className="text-xs sm:text-sm">
                        <span className="text-red-600 font-medium">
                          ✗ {event.availability_summary.unavailable}
                        </span>
                        <span className="text-gray-500"> indisponíveis</span>
                      </span>
                      <span className="text-xs sm:text-sm">
                        <span className="text-blue-600 font-medium">
                          ? {event.availability_summary.maybe}
                        </span>
                        <span className="text-gray-500"> talvez</span>
                      </span>
                      <span className="text-xs sm:text-sm">
                        <span className="text-yellow-600 font-medium">
                          ⏱ {event.availability_summary.pending}
                        </span>
                        <span className="text-gray-500"> pendentes</span>
                      </span>
                    </div>
                  </div>
                )}

                {/* Ações */}
                <Link
                  to={`/eventos/${event.id}`}
                  className="block w-full btn-secondary text-center py-2.5 sm:py-2"
                >
                  Ver Detalhes
                </Link>
              </div>
            ))}
          </div>
        )}

        {/* Informação */}
        {!loading && events.length > 0 && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 sm:p-4">
            <div className="flex items-start gap-2 sm:gap-3">
              <UserCheck className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs sm:text-sm font-medium text-emerald-800">Convites abertos</p>
                <p className="text-xs sm:text-sm text-emerald-700 mt-1">
                  Confirme sua participação informando a disponibilidade no detalhe do evento.
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
