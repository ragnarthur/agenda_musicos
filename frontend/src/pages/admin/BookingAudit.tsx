import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Calendar,
  TrendingUp,
  CheckCircle,
  Clock,
  Users,
  ArrowLeft,
  ClipboardList,
  Download,
  RefreshCw,
  ShieldAlert,
} from 'lucide-react';
import {
  adminBookingService,
  type BookingStatistics,
  type QuoteRequest,
  type QuoteProposal,
  type Booking,
  type BookingEvent,
} from '../../services/publicApi';
import { showToast } from '../../utils/toast';
import {
  AdminHero,
  AdminCard,
  AdminStatCard,
  AdminSearchBar,
  AdminStatusBadge,
  AdminModal,
  AdminButton,
  AdminEmptyState,
  AdminLoading,
} from '../../components/admin';
import { AdminChartCard, BookingsPipeline, TopListBars } from '../../components/admin/charts';

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

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [stateFilter, setStateFilter] = useState('');

  // UI
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);

  const loadStats = useCallback(async () => {
    try {
      const data = await adminBookingService.getStatistics();
      setStats(data);
      setLastUpdatedAt(new Date());
    } catch (error) {
      showToast.apiError(error);
    }
  }, []);

  const loadRequests = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      if (cityFilter) params.city = cityFilter;
      if (stateFilter) params.state = stateFilter;

      const data = await adminBookingService.listAllRequests(params);
      setRequests(data);
      setLastUpdatedAt(new Date());
    } catch (error) {
      showToast.apiError(error);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, cityFilter, stateFilter]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    const id = window.setTimeout(() => {
      loadRequests();
    }, 350);
    return () => window.clearTimeout(id);
  }, [loadRequests]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([loadStats(), loadRequests()]);
    } finally {
      setRefreshing(false);
    }
  };

  const handleSelectRequest = async (requestId: number) => {
    try {
      const auditDetails = await adminBookingService.getAuditDetails(requestId);
      setSelectedRequest(auditDetails);
      setDetailsOpen(true);
    } catch (error) {
      showToast.apiError(error);
    }
  };

  const handleCancelBooking = async () => {
    if (!selectedRequest || !cancelReason.trim()) return;

    setCancelling(true);
    try {
      await adminBookingService.cancelBooking(selectedRequest.request.id, cancelReason);
      showToast.success('Reserva cancelada com sucesso!');
      setCancelModalOpen(false);
      setCancelReason('');

      loadRequests();
      loadStats();

      const updatedDetails = await adminBookingService.getAuditDetails(selectedRequest.request.id);
      setSelectedRequest(updatedDetails);
    } catch (error) {
      showToast.apiError(error);
    } finally {
      setCancelling(false);
    }
  };

  const getEventIcon = (actorType: string) => {
    switch (actorType) {
      case 'contractor':
        return <ClipboardList className="w-4 h-4 text-blue-400" />;
      case 'musician':
        return <Users className="w-4 h-4 text-purple-400" />;
      case 'admin':
        return <ArrowLeft className="w-4 h-4 text-red-400" />;
      default:
        return <Clock className="w-4 h-4 text-slate-500" />;
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

  type FindingSeverity = 'high' | 'medium' | 'low';
  type AuditFinding = {
    id: string;
    severity: FindingSeverity;
    title: string;
    details: string;
  };

  const findings = useMemo((): AuditFinding[] => {
    if (!selectedRequest) return [];

    const { request, booking, proposals } = selectedRequest;
    const out: AuditFinding[] = [];

    const reqStatus = request.status;
    const hasBooking = !!booking;

    if (['reserved', 'confirmed', 'completed'].includes(reqStatus) && !hasBooking) {
      out.push({
        id: 'missing_booking',
        severity: 'high',
        title: 'Pedido indica reserva, mas nao existe registro de reserva',
        details: `Status do pedido: ${request.status_display}.`,
      });
    }

    if (['pending', 'responded', 'reservation_requested'].includes(reqStatus) && hasBooking) {
      out.push({
        id: 'booking_unexpected',
        severity: 'medium',
        title: 'Existe reserva vinculada, mas o pedido ainda nao reflete isso',
        details: `Status do pedido: ${request.status_display}. Status da reserva: ${booking?.status_display}.`,
      });
    }

    if (booking?.status === 'cancelled' && !booking.cancel_reason) {
      out.push({
        id: 'cancel_reason_missing',
        severity: 'high',
        title: 'Reserva cancelada sem motivo registrado',
        details: 'Preencha um motivo para auditoria e rastreabilidade.',
      });
    }

    const acceptedProposal = proposals.find(p => p.status === 'accepted');
    if (acceptedProposal && !hasBooking) {
      out.push({
        id: 'accepted_without_booking',
        severity: 'high',
        title: 'Proposta aceita sem reserva criada',
        details: 'Ha uma proposta marcada como aceita, mas nao existe reserva vinculada.',
      });
    }

    if (request.event_date) {
      const eventDate = new Date(request.event_date);
      const now = new Date();
      if (eventDate.getTime() < now.getTime() && !['completed', 'cancelled'].includes(reqStatus)) {
        out.push({
          id: 'past_event_open',
          severity: 'medium',
          title: 'Evento no passado com status em aberto',
          details: `Data do evento: ${new Date(request.event_date).toLocaleDateString('pt-BR')}. Status atual: ${request.status_display}.`,
        });
      }
    }

    if (reqStatus === 'declined' && proposals.some(p => p.status === 'accepted')) {
      out.push({
        id: 'status_mismatch_declined',
        severity: 'high',
        title: 'Inconsistencia: pedido recusado com proposta aceita',
        details: 'Verifique o fluxo de atualizacao de status.',
      });
    }

    return out;
  }, [selectedRequest]);

  const auditScore = useMemo(() => {
    let score = 100;
    for (const f of findings) {
      if (f.severity === 'high') score -= 30;
      else if (f.severity === 'medium') score -= 15;
      else score -= 5;
    }
    return Math.max(0, score);
  }, [findings]);

  const exportAuditJson = () => {
    if (!selectedRequest) return;
    const report = {
      generated_at: new Date().toISOString(),
      score: auditScore,
      findings,
      request: selectedRequest.request,
      booking: selectedRequest.booking,
      proposals: selectedRequest.proposals,
      events: selectedRequest.events,
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-request-${selectedRequest.request.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading && !stats) {
    return (
      <div className="space-y-6">
        <AdminHero
          title="Auditoria de Reservas"
          description="Acompanhe pedidos de orçamento, propostas e reservas"
        />
        <AdminLoading count={3} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AdminHero
        title="Auditoria de Reservas"
        description="Acompanhe pedidos de orçamento, propostas e reservas"
      />

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <AdminStatCard
            label="Total de Pedidos"
            value={stats.global.total_requests}
            icon={Calendar}
            color="indigo"
          />
          <AdminStatCard
            label="Reservas"
            value={stats.global.total_bookings}
            icon={CheckCircle}
            color="green"
          />
          <AdminStatCard
            label="Taxa de Conversão"
            value={`${stats.global.conversion_rate}%`}
            icon={TrendingUp}
            color="purple"
          />
          <AdminStatCard
            label="Pendentes"
            value={stats.global.pending_requests}
            icon={Clock}
            color="amber"
          />
        </div>
      )}

      {/* Analytics */}
      {stats && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <AdminChartCard
            title="Pipeline de Auditoria"
            subtitle="Pedidos -> reservas -> confirmacoes -> conclusoes"
            className="lg:col-span-2"
            right={
              <div className="flex items-center gap-3">
                <div className="hidden md:block text-xs text-slate-400">
                  Atualizado:{' '}
                  <span className="text-slate-200 font-semibold tabular-nums">
                    {lastUpdatedAt
                      ? lastUpdatedAt.toLocaleTimeString('pt-BR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : '-'}
                  </span>
                </div>
                <AdminButton
                  variant="secondary"
                  size="sm"
                  icon={RefreshCw}
                  loading={refreshing}
                  onClick={handleRefresh}
                >
                  Atualizar
                </AdminButton>
              </div>
            }
          >
            <BookingsPipeline
              totalRequests={stats.global.total_requests}
              totalBookings={stats.global.total_bookings}
              confirmedBookings={stats.global.confirmed_bookings}
              completedBookings={stats.global.completed_bookings}
              cancelledBookings={stats.global.cancelled_bookings}
            />
          </AdminChartCard>

          <AdminChartCard title="Top Musicos" subtitle="Mais reservas no periodo">
            <TopListBars
              valueLabel="Reservas"
              data={stats.top_musicians.map(m => ({
                label:
                  `${m.request__musician__user__first_name} ${m.request__musician__user__last_name}`.trim(),
                value: m.booking_count,
              }))}
            />
          </AdminChartCard>

          <AdminChartCard
            title="Top Cidades"
            subtitle="Mais pedidos de orcamento"
            className="lg:col-span-2"
          >
            <TopListBars
              valueLabel="Pedidos"
              data={stats.top_cities.map(c => ({
                label: `${c.location_city}-${c.location_state}`,
                value: c.request_count,
              }))}
            />
          </AdminChartCard>

          <AdminChartCard title="Ultimos 30 dias" subtitle="Volume recente">
            <div className="grid grid-cols-1 gap-3">
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs font-semibold text-slate-300 uppercase tracking-wide">
                  Pedidos
                </p>
                <p className="mt-1 text-3xl font-bold text-white tabular-nums">
                  {stats.last_30_days.requests}
                </p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs font-semibold text-slate-300 uppercase tracking-wide">
                  Reservas
                </p>
                <p className="mt-1 text-3xl font-bold text-white tabular-nums">
                  {stats.last_30_days.bookings}
                </p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs font-semibold text-slate-300 uppercase tracking-wide">
                  Conversao
                </p>
                <p className="mt-1 text-3xl font-bold text-emerald-300 tabular-nums">
                  {stats.global.conversion_rate}%
                </p>
              </div>
            </div>
          </AdminChartCard>
        </div>
      )}

      {/* Filters */}
      <AdminCard>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="admin-label">Buscar</label>
            <AdminSearchBar
              value={search}
              onChange={setSearch}
              placeholder="Nome contratante ou músico..."
            />
          </div>
          <div>
            <label className="admin-label">Status</label>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="admin-select"
            >
              <option value="">Todos</option>
              <option value="pending">Pendentes</option>
              <option value="responded">Respondidos</option>
              <option value="reservation_requested">Solic. de reserva</option>
              <option value="reserved">Reservados</option>
              <option value="confirmed">Confirmados</option>
              <option value="completed">Concluídos</option>
              <option value="cancelled">Cancelados</option>
              <option value="declined">Recusados</option>
            </select>
          </div>
          <div>
            <label className="admin-label">Cidade</label>
            <input
              type="text"
              value={cityFilter}
              onChange={e => setCityFilter(e.target.value)}
              placeholder="Digite a cidade..."
              className="admin-input"
            />
          </div>
          <div>
            <label className="admin-label">Estado</label>
            <input
              type="text"
              value={stateFilter}
              onChange={e => setStateFilter(e.target.value)}
              placeholder="UF (ex: SP)"
              maxLength={2}
              className="admin-input"
            />
          </div>
        </div>
      </AdminCard>

      {/* Requests Table */}
      <AdminCard className="!p-0">
        <div className="p-4 border-b border-white/10">
          <h2 className="text-lg font-semibold text-white">Pedidos de Orçamento</h2>
          <p className="text-sm text-slate-400 mt-1">
            {requests.length} pedido{requests.length !== 1 ? 's' : ''} encontrado
            {requests.length !== 1 ? 's' : ''}
          </p>
        </div>

        {loading ? (
          <div className="p-8 flex justify-center">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : requests.length === 0 ? (
          <div className="p-8">
            <AdminEmptyState title="Nenhum pedido encontrado" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-white/5">
                <tr>
                  {['Data', 'Contratante', 'Músico', 'Evento', 'Local', 'Status', 'Ações'].map(
                    header => (
                      <th
                        key={header}
                        className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider"
                      >
                        {header}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {requests.map(request => (
                  <tr
                    key={request.id}
                    className="hover:bg-white/5 cursor-pointer transition-colors"
                    onClick={() => handleSelectRequest(request.id)}
                  >
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                      {formatDate(request.created_at)}
                    </td>
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-white">
                      {request.contractor_name}
                    </td>
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-white">
                      {request.musician_name}
                    </td>
                    <td className="px-4 sm:px-6 py-4 text-sm text-slate-300">
                      {request.event_type}
                    </td>
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-slate-400">
                      {request.location_city} - {request.location_state}
                    </td>
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                      <AdminStatusBadge status={request.status} label={request.status_display} />
                    </td>
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          handleSelectRequest(request.id);
                        }}
                        className="text-indigo-400 hover:text-indigo-300 transition-colors"
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
      </AdminCard>

      {/* Details Modal */}
      <AdminModal
        isOpen={detailsOpen && !!selectedRequest}
        onClose={() => {
          setDetailsOpen(false);
          setSelectedRequest(null);
        }}
        title={`Pedido #${selectedRequest?.request.id || ''}`}
        size="xl"
        footer={
          <>
            <AdminButton
              variant="secondary"
              icon={Download}
              onClick={exportAuditJson}
              disabled={!selectedRequest}
            >
              Exportar JSON
            </AdminButton>
            <AdminButton
              variant="secondary"
              onClick={() => {
                setDetailsOpen(false);
                setSelectedRequest(null);
              }}
            >
              Fechar
            </AdminButton>
          </>
        }
      >
        {selectedRequest && (
          <div className="space-y-6">
            {/* Audit Summary */}
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4 text-amber-300" />
                    <p className="text-sm font-semibold text-white">Resumo de Auditoria</p>
                  </div>
                  <p className="mt-1 text-sm text-slate-400">
                    Score: <span className="text-white font-bold tabular-nums">{auditScore}</span>
                    {findings.length > 0 ? (
                      <span className="ml-2 text-slate-400">
                        ({findings.length} achado{findings.length !== 1 ? 's' : ''})
                      </span>
                    ) : null}
                  </p>
                </div>
                {findings.length === 0 ? (
                  <span className="inline-flex items-center px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-300 text-xs font-semibold">
                    Sem achados criticos
                  </span>
                ) : (
                  <span className="inline-flex items-center px-3 py-1 rounded-full bg-amber-500/15 text-amber-300 text-xs font-semibold">
                    Revisao recomendada
                  </span>
                )}
              </div>

              {findings.length > 0 && (
                <div className="mt-3 grid grid-cols-1 gap-2">
                  {findings.map(f => (
                    <div
                      key={f.id}
                      className="rounded-lg border border-white/10 bg-slate-950/30 p-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-white">{f.title}</p>
                        <span
                          className={
                            f.severity === 'high'
                              ? 'px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 text-xs font-semibold'
                              : f.severity === 'medium'
                                ? 'px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-xs font-semibold'
                                : 'px-2 py-0.5 rounded-full bg-slate-500/20 text-slate-200 text-xs font-semibold'
                          }
                        >
                          {f.severity === 'high'
                            ? 'Alta'
                            : f.severity === 'medium'
                              ? 'Media'
                              : 'Baixa'}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-slate-400">{f.details}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Request Info */}
            <div>
              <h3 className="text-base font-semibold text-white mb-3">Informações do Pedido</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-slate-300">
                <p>
                  <strong className="text-white">Contratante:</strong>{' '}
                  {selectedRequest.request.contractor_name}
                </p>
                <p>
                  <strong className="text-white">Músico:</strong>{' '}
                  {selectedRequest.request.musician_name}
                </p>
                <p>
                  <strong className="text-white">Evento:</strong>{' '}
                  {selectedRequest.request.event_type}
                </p>
                <p>
                  <strong className="text-white">Data:</strong>{' '}
                  {selectedRequest.request.event_date
                    ? formatDate(selectedRequest.request.event_date)
                    : '-'}
                </p>
                <p>
                  <strong className="text-white">Local:</strong>{' '}
                  {selectedRequest.request.location_city} - {selectedRequest.request.location_state}
                </p>
                <p>
                  <strong className="text-white">Status:</strong>{' '}
                  <AdminStatusBadge
                    status={selectedRequest.request.status}
                    label={selectedRequest.request.status_display}
                  />
                </p>
              </div>
              {selectedRequest.request.notes && (
                <div className="mt-3">
                  <strong className="text-sm text-white">Observações:</strong>
                  <p className="mt-1 text-sm text-slate-400">{selectedRequest.request.notes}</p>
                </div>
              )}
            </div>

            {/* Booking */}
            {selectedRequest.booking && (
              <div className="border-t border-white/10 pt-4">
                <h3 className="text-base font-semibold text-white mb-3">Reserva</h3>
                <div className="space-y-2 text-sm text-slate-300">
                  <p>
                    <strong className="text-white">Status:</strong>{' '}
                    <AdminStatusBadge
                      status={selectedRequest.booking.status}
                      label={selectedRequest.booking.status_display}
                    />
                  </p>
                  <p>
                    <strong className="text-white">Reservado em:</strong>{' '}
                    {formatDateTime(selectedRequest.booking.reserved_at)}
                  </p>
                  {selectedRequest.booking.confirmed_at && (
                    <p>
                      <strong className="text-white">Confirmado em:</strong>{' '}
                      {formatDateTime(selectedRequest.booking.confirmed_at)}
                    </p>
                  )}
                  {selectedRequest.booking.completed_at && (
                    <p>
                      <strong className="text-white">Concluído em:</strong>{' '}
                      {formatDateTime(selectedRequest.booking.completed_at)}
                    </p>
                  )}
                  {selectedRequest.booking.cancel_reason && (
                    <p className="text-red-400">
                      <strong className="text-white">Motivo do cancelamento:</strong>{' '}
                      {selectedRequest.booking.cancel_reason}
                    </p>
                  )}
                </div>

                {(selectedRequest.booking.status === 'reserved' ||
                  selectedRequest.booking.status === 'confirmed') && (
                  <AdminButton
                    variant="danger"
                    size="sm"
                    onClick={() => setCancelModalOpen(true)}
                    className="mt-4"
                  >
                    Cancelar Reserva
                  </AdminButton>
                )}
              </div>
            )}

            {/* Proposals */}
            <div className="border-t border-white/10 pt-4">
              <h3 className="text-base font-semibold text-white mb-3">Propostas</h3>
              {selectedRequest.proposals.length === 0 ? (
                <p className="text-sm text-slate-500">Nenhuma proposta enviada</p>
              ) : (
                <div className="space-y-3">
                  {selectedRequest.proposals.map(proposal => (
                    <div key={proposal.id} className="border border-white/10 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <AdminStatusBadge
                          status={proposal.status}
                          label={proposal.status_display}
                        />
                        <span className="text-xs text-slate-500">
                          {formatDateTime(proposal.created_at)}
                        </span>
                      </div>
                      <p className="text-sm text-slate-300 mb-2">{proposal.message}</p>
                      {proposal.proposed_value && (
                        <p className="text-sm text-slate-400">
                          <strong className="text-white">Valor:</strong>{' '}
                          {formatCurrency(proposal.proposed_value)}
                        </p>
                      )}
                      {proposal.valid_until && (
                        <p className="text-sm text-slate-400">
                          <strong className="text-white">Válido até:</strong>{' '}
                          {formatDate(proposal.valid_until)}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Events Timeline */}
            <div className="border-t border-white/10 pt-4">
              <h3 className="text-base font-semibold text-white mb-3">Timeline de Eventos</h3>
              {selectedRequest.events.length === 0 ? (
                <p className="text-sm text-slate-500">Nenhum evento registrado</p>
              ) : (
                <div className="space-y-4">
                  {selectedRequest.events.map(event => (
                    <div key={event.id} className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-1">{getEventIcon(event.actor_type)}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm font-medium text-white">{event.action}</p>
                          <span className="text-xs text-slate-500">
                            {formatDateTime(event.created_at)}
                          </span>
                        </div>
                        {event.actor_name && (
                          <p className="text-xs text-slate-400">por {event.actor_name}</p>
                        )}
                        {event.metadata && Object.keys(event.metadata).length > 0 && (
                          <div className="mt-2 p-2 bg-white/5 rounded text-xs text-slate-400">
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
      </AdminModal>

      {/* Cancel Booking Modal */}
      <AdminModal
        isOpen={cancelModalOpen}
        onClose={() => {
          setCancelModalOpen(false);
          setCancelReason('');
        }}
        title="Cancelar Reserva"
        size="sm"
        footer={
          <>
            <AdminButton
              variant="secondary"
              onClick={() => {
                setCancelModalOpen(false);
                setCancelReason('');
              }}
            >
              Voltar
            </AdminButton>
            <AdminButton
              variant="danger"
              onClick={handleCancelBooking}
              loading={cancelling}
              disabled={!cancelReason.trim()}
            >
              Confirmar Cancelamento
            </AdminButton>
          </>
        }
      >
        <div className="space-y-4">
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
            <p className="text-sm text-red-400">
              Esta ação cancelará a reserva e notificará as partes envolvidas.
            </p>
          </div>
          <div>
            <label className="admin-label">Motivo do cancelamento</label>
            <textarea
              value={cancelReason}
              onChange={e => setCancelReason(e.target.value)}
              rows={3}
              className="admin-textarea min-h-[96px]"
              placeholder="Informe o motivo do cancelamento..."
            />
          </div>
        </div>
      </AdminModal>
    </div>
  );
}
