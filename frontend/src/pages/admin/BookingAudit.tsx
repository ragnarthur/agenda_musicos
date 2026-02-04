// pages/admin/BookingAudit.tsx
// Auditoria completa de reservas e pedidos de orçamento
import { useState, useEffect } from 'react';
import {
  Search,
  Calendar,
  TrendingUp,
  CheckCircle,
  Clock,
  ArrowLeft,
  Trash2,
  ClipboardList,
} from 'lucide-react';
import {
  adminBookingService,
  quoteRequestService,
  type BookingStatistics,
  type QuoteRequest,
  type QuoteProposal,
  type Booking,
  type BookingEvent,
} from '../../services/publicApi';
import { showToast } from '../../utils/toast';

export default function BookingAudit() {
  const [stats, setStats] = useState<BookingStatistics | null>(null);
  const [requests, setRequests] = useState<QuoteRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<{
    request: QuoteRequest;
    proposals: QuoteProposal[];
    booking: Booking | null;
    events: BookingEvent[];
  } | null>(null);

  // Filtros
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [stateFilter, setStateFilter] = useState('');

  // UI
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    loadStats();
    loadRequests();
  }, [search, statusFilter, cityFilter, stateFilter]);

  const loadStats = async () => {
    try {
      const data = await adminBookingService.getStatistics();
      setStats(data);
    } catch (error) {
      showToast.apiError(error);
    }
  };

  const loadRequests = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (statusFilter) params.status = statusFilter;
      if (cityFilter) params.city = cityFilter;
      if (stateFilter) params.state = stateFilter;

      const data = await adminBookingService.listAllRequests(params);
      setRequests(data);
    } catch (error) {
      showToast.apiError(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectRequest = async (requestId: number) => {
    try {
      const auditDetails = await adminBookingService.getAuditDetails(requestId);
      setSelectedRequest(auditDetails);
      setShowDetails(true);
    } catch (error) {
      showToast.apiError(error);
    }
  };

  const handleCancelBooking = async (requestId: number) => {
    const reason = prompt('Por favor, informe o motivo do cancelamento pelo admin:');
    if (!reason) return;

    if (!confirm('Tem certeza que deseja cancelar esta reserva?')) return;

    try {
      await adminBookingService.cancelBooking(requestId, reason);
      showToast.success('Reserva cancelada com sucesso!');
      
      // Recarregar
      loadRequests();
      loadStats();
      
      if (selectedRequest) {
        const updatedDetails = await adminBookingService.getAuditDetails(requestId);
        setSelectedRequest(updatedDetails);
      }
    } catch (error) {
      showToast.apiError(error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'responded':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'reserved':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'confirmed':
        return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300';
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'cancelled':
      case 'declined':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const getEventIcon = (actorType: string) => {
    switch (actorType) {
      case 'contractor':
        return <ClipboardList className="w-4 h-4 text-blue-600" />;
      case 'musician':
        return <Users className="w-4 h-4 text-purple-600" />;
      case 'admin':
        return <ArrowLeft className="w-4 h-4 text-red-600" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCurrency = (value: string | null) => {
    if (!value) return '-';
    const num = parseFloat(value);
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(num);
  };

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      {!showDetails ? (
        <>
          <div className="flex items-center gap-2 mb-6">
            <ClipboardList className="w-6 h-6 text-indigo-600" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Auditoria de Reservas
            </h1>
          </div>

          {/* Estatísticas Globais */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Total de Pedidos
                  </h3>
                  <Calendar className="w-5 h-5 text-indigo-600" />
                </div>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {stats.global.total_requests}
                </p>
                <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                  {stats.last_30_days.requests} últimos 30 dias
                </p>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Reservas
                  </h3>
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {stats.global.total_bookings}
                </p>
                <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                  {stats.global.confirmed_bookings} confirmadas
                </p>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Taxa de Conversão
                  </h3>
                  <TrendingUp className="w-5 h-5 text-purple-600" />
                </div>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {stats.global.conversion_rate}%
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  pedidos → reservas
                </p>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Pendentes
                  </h3>
                  <Clock className="w-5 h-5 text-yellow-600" />
                </div>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {stats.global.pending_requests}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  aguardando resposta
                </p>
              </div>
            </div>
          )}

          {/* Filtros */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Buscar
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Nome contratante ou músico..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Status
                </label>
                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">Todos</option>
                  <option value="pending">Pendentes</option>
                  <option value="responded">Respondidos</option>
                  <option value="reserved">Reservados</option>
                  <option value="confirmed">Confirmados</option>
                  <option value="completed">Concluídos</option>
                  <option value="cancelled">Cancelados</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Cidade
                </label>
                <input
                  type="text"
                  value={cityFilter}
                  onChange={e => setCityFilter(e.target.value)}
                  placeholder="Digite a cidade..."
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Estado
                </label>
                <input
                  type="text"
                  value={stateFilter}
                  onChange={e => setStateFilter(e.target.value)}
                  placeholder="UF (ex: SP)"
                  maxLength={2}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* Lista de Pedidos */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Pedidos de Orçamento
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {requests.length} pedido{requests.length !== 1 ? 's' : ''} encontrado{requests.length !== 1 ? 's' : ''}
              </p>
            </div>

            {loading ? (
              <div className="p-8 text-center">
                <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
              </div>
            ) : requests.length === 0 ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                <p>Nenhum pedido encontrado</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-900">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Data
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Contratante
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Músico
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Evento
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Local
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {requests.map(request => (
                      <tr
                        key={request.id}
                        className="hover:bg-gray-50 dark:hover:bg-gray-900 cursor-pointer"
                        onClick={() => handleSelectRequest(request.id)}
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {formatDate(request.created_at)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {request.contractor_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {request.musician_name}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                          {request.event_type}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                          {request.location_city} - {request.location_state}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                            {request.status_display}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              handleSelectRequest(request.id);
                            }}
                            className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
                          >
                            Ver Detalhes
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          {/* Detalhes do Pedido */}
          <button
            onClick={() => {
              setShowDetails(false);
              setSelectedRequest(null);
            }}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar para lista
          </button>

          {selectedRequest && (
            <div className="space-y-6">
              {/* Informações do Pedido */}
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Pedido #{selectedRequest.request.id}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                      <strong>Contratante:</strong> {selectedRequest.request.contractor_name}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                      <strong>Músico:</strong> {selectedRequest.request.musician_name}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                      <strong>Evento:</strong> {selectedRequest.request.event_type}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                      <strong>Data:</strong> {selectedRequest.request.event_date ? formatDate(selectedRequest.request.event_date) : '-'}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                      <strong>Local:</strong> {selectedRequest.request.location_city} - {selectedRequest.request.location_state}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                      <strong>Status:</strong>{' '}
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedRequest.request.status)}`}>
                        {selectedRequest.request.status_display}
                      </span>
                    </p>
                  </div>
                </div>
                {selectedRequest.request.notes && (
                  <div className="mt-4">
                    <strong className="text-sm text-gray-700 dark:text-gray-300">Observações:</strong>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                      {selectedRequest.request.notes}
                    </p>
                  </div>
                )}
              </div>

              {/* Booking */}
              {selectedRequest.booking && (
                <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Reserva
                  </h3>
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      <strong>Status:</strong>{' '}
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedRequest.booking.status)}`}>
                        {selectedRequest.booking.status_display}
                      </span>
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      <strong>Reservado em:</strong>{' '}
                      {formatDateTime(selectedRequest.booking.reserved_at)}
                    </p>
                    {selectedRequest.booking.confirmed_at && (
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        <strong>Confirmado em:</strong>{' '}
                        {formatDateTime(selectedRequest.booking.confirmed_at)}
                      </p>
                    )}
                    {selectedRequest.booking.completed_at && (
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        <strong>Concluído em:</strong>{' '}
                        {formatDateTime(selectedRequest.booking.completed_at)}
                      </p>
                    )}
                    {selectedRequest.booking.cancel_reason && (
                      <p className="text-sm text-red-600 dark:text-red-400">
                        <strong>Motivo do cancelamento:</strong>{' '}
                        {selectedRequest.booking.cancel_reason}
                      </p>
                    )}
                  </div>

                  {(selectedRequest.booking.status === 'reserved' || selectedRequest.booking.status === 'confirmed') && (
                    <button
                      onClick={() => handleCancelBooking(selectedRequest.request.id)}
                      className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      Cancelar Reserva
                    </button>
                  )}
                </div>
              )}

              {/* Propostas */}
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Propostas
                </h3>
                {selectedRequest.proposals.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Nenhuma proposta enviada
                  </p>
                ) : (
                  <div className="space-y-4">
                    {selectedRequest.proposals.map(proposal => (
                      <div
                        key={proposal.id}
                        className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(proposal.status)}`}>
                              {proposal.status_display}
                            </span>
                          </div>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {formatDateTime(proposal.created_at)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                          {proposal.message}
                        </p>
                        {proposal.proposed_value && (
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            <strong>Valor:</strong> {formatCurrency(proposal.proposed_value)}
                          </div>
                        )}
                        {proposal.valid_until && (
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            <strong>Válido até:</strong> {formatDate(proposal.valid_until)}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Timeline de Eventos */}
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Timeline de Eventos
                </h3>
                {selectedRequest.events.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Nenhum evento registrado
                  </p>
                ) : (
                  <div className="space-y-4">
                    {selectedRequest.events.map(event => (
                      <div
                        key={event.id}
                        className="flex items-start gap-3"
                      >
                        <div className="flex-shrink-0 mt-1">
                          {getEventIcon(event.actor_type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {event.action}
                            </p>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {formatDateTime(event.created_at)}
                            </span>
                          </div>
                          {event.actor_name && (
                            <p className="text-xs text-gray-600 dark:text-gray-400">
                              por {event.actor_name}
                            </p>
                          )}
                          {event.metadata && Object.keys(event.metadata).length > 0 && (
                            <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-900 rounded text-xs text-gray-600 dark:text-gray-400">
                              <pre>{JSON.stringify(event.metadata, null, 2)}</pre>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
