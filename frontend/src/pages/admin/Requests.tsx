import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Search,
  Mail,
  MapPin,
  Music2,
  Phone,
} from 'lucide-react';
import { musicianRequestService, type MusicianRequest } from '../../services/publicApi';
import { showToast } from '../../utils/toast';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ADMIN_ROUTES } from '../../routes/adminRoutes';

type FilterType = 'all' | 'pending' | 'approved' | 'rejected';
type SortField = 'name' | 'created_at' | 'status';
type SortOrder = 'asc' | 'desc';

const Requests: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { id: requestIdParam } = useParams();
  const [requests, setRequests] = useState<MusicianRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>(
    (searchParams.get('status') as FilterType) || 'pending'
  );
  const [searchTerm, setSearchTerm] = useState(searchParams.get('q') || '');
  const [selectedRequest, setSelectedRequest] = useState<MusicianRequest | null>(null);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [currentPage, setCurrentPage] = useState(() => {
    const page = Number(searchParams.get('page') || 1);
    return Number.isNaN(page) || page < 1 ? 1 : page;
  });
  const [itemsPerPage] = useState(10);
  const [sortField, setSortField] = useState<SortField>(
    (searchParams.get('sort') as SortField) || 'created_at'
  );
  const [sortOrder, setSortOrder] = useState<SortOrder>(
    (searchParams.get('order') as SortOrder) || 'desc'
  );

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await musicianRequestService.list({
        status: filter === 'all' ? undefined : filter,
      });
      setRequests(response);
    } catch (error) {
      console.error('Error fetching requests:', error);
      showToast.apiError(error);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  useEffect(() => {
    const params: Record<string, string> = {};
    if (filter && filter !== 'pending') params.status = filter;
    if (searchTerm) params.q = searchTerm;
    if (sortField && sortField !== 'created_at') params.sort = sortField;
    if (sortOrder && sortOrder !== 'desc') params.order = sortOrder;
    if (currentPage !== 1) params.page = String(currentPage);
    setSearchParams(params, { replace: true });
  }, [filter, searchTerm, sortField, sortOrder, currentPage, setSearchParams]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filter, searchTerm]);

  useEffect(() => {
    const loadDetail = async () => {
      if (!requestIdParam) {
        setSelectedRequest(null);
        return;
      }

      const parsedId = Number(requestIdParam);
      if (Number.isNaN(parsedId)) {
        setSelectedRequest(null);
        return;
      }

      const found = requests.find(request => request.id === parsedId);
      if (found) {
        setSelectedRequest(found);
        return;
      }

      try {
        const data = await musicianRequestService.get(parsedId);
        setSelectedRequest(data);
      } catch (error) {
        showToast.apiError(error);
        const query = searchParams.toString();
        navigate(
          {
            pathname: ADMIN_ROUTES.requests,
            search: query ? `?${query}` : '',
          },
          { replace: true }
        );
      }
    };

    loadDetail();
  }, [requestIdParam, requests, navigate, searchParams]);

  const handleApprove = async (requestId: number) => {
    setActionLoading(requestId);
    try {
      const response = await musicianRequestService.approve(requestId, adminNotes || undefined);
      const origin = window.location.origin;
      const inviteLink = `${origin}/cadastro/invite?token=${response.invite_token}`;

      try {
        await navigator.clipboard.writeText(inviteLink);
        showToast.success('Solicitação aprovada! Link de convite copiado.');
      } catch {
        showToast.success('Solicitação aprovada! Link: ' + inviteLink);
      }

      await fetchDashboardData();
      setSelectedRequest(null);
      setAdminNotes('');
    } catch (error) {
      showToast.apiError(error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleResendInvite = async (requestId: number) => {
    setActionLoading(requestId);
    try {
      const response = await musicianRequestService.resendInvite(requestId);
      const origin = window.location.origin;
      const inviteLink = `${origin}/cadastro/invite?token=${response.invite_token}`;

      try {
        await navigator.clipboard.writeText(inviteLink);
        showToast.success('Email reenviado! Link de convite copiado.');
      } catch {
        showToast.success('Email reenviado! Link: ' + inviteLink);
      }

      await fetchDashboardData();
      setSelectedRequest(null);
      setAdminNotes('');
    } catch (error) {
      showToast.apiError(error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleViewDetails = (request: MusicianRequest) => {
    setSelectedRequest(request);
    const query = searchParams.toString();
    navigate({
      pathname: ADMIN_ROUTES.requestsDetail(request.id),
      search: query ? `?${query}` : '',
    });
  };

  const handleCloseDetails = () => {
    setSelectedRequest(null);
    const query = searchParams.toString();
    navigate({
      pathname: ADMIN_ROUTES.requests,
      search: query ? `?${query}` : '',
    });
  };

  const handleReject = async (requestId: number, reason: string) => {
    setActionLoading(requestId);
    try {
      await musicianRequestService.reject(requestId, reason || undefined);
      showToast.success('Solicitação rejeitada.');
      await fetchDashboardData();
      setSelectedRequest(null);
      setAdminNotes('');
    } catch (error) {
      showToast.apiError(error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const sortedAndFilteredRequests = useMemo(() => {
    const filtered = requests.filter(request => {
      const term = searchTerm.trim().toLowerCase();
      if (!term) return true;
      return (
        request.full_name.toLowerCase().includes(term) ||
        request.email.toLowerCase().includes(term) ||
        request.city.toLowerCase().includes(term) ||
        request.instrument.toLowerCase().includes(term)
      );
    });

    return filtered.sort((a, b) => {
      let comparison = 0;

      if (sortField === 'name') {
        comparison = a.full_name.localeCompare(b.full_name);
      } else if (sortField === 'created_at') {
        comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      } else if (sortField === 'status') {
        const statusOrder = { pending: 1, approved: 2, rejected: 3 };
        comparison =
          (statusOrder[a.status as keyof typeof statusOrder] || 99) -
          (statusOrder[b.status as keyof typeof statusOrder] || 99);
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [requests, searchTerm, sortField, sortOrder]);

  const paginatedRequests = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return sortedAndFilteredRequests.slice(startIndex, endIndex);
  }, [sortedAndFilteredRequests, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(sortedAndFilteredRequests.length / itemsPerPage);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'approved':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'rejected':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      cancelled: 'bg-gray-100 text-gray-800',
    };

    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variants[status as keyof typeof variants] || 'bg-gray-100 text-gray-800'}`}
      >
        {getStatusIcon(status)}
        <span className="ml-1">{status.charAt(0).toUpperCase() + status.slice(1)}</span>
      </span>
    );
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div
            key={i}
            className="bg-slate-900/90 backdrop-blur rounded-xl shadow p-5 animate-pulse"
          >
            <div className="space-y-2 flex-1">
              <div className="h-5 bg-slate-700 rounded w-1/3"></div>
              <div className="h-4 bg-slate-700 rounded w-2/3"></div>
              <div className="h-3 bg-slate-700 rounded w-1/2"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-slate-900/90 backdrop-blur shadow rounded-lg p-6">
        <h1 className="text-2xl font-bold text-white mb-2">Solicitações de Acesso</h1>
        <p className="text-slate-300">Gerencie as solicitações de novos músicos</p>
      </div>

      {/* Filters */}
      <div className="bg-slate-900/90 backdrop-blur rounded-xl shadow p-4">
        <div className="overflow-x-auto pb-2 mb-4">
          <div className="flex items-center gap-2 min-w-max">
            <button
              type="button"
              onClick={() => setFilter('pending')}
              className={`min-h-[44px] px-3 py-1.5 rounded-full text-sm font-semibold ${filter === 'pending' ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-800 text-slate-400'}`}
            >
              Pendentes
            </button>
            <button
              type="button"
              onClick={() => setFilter('approved')}
              className={`min-h-[44px] px-3 py-1.5 rounded-full text-sm font-semibold ${filter === 'approved' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400'}`}
            >
              Aprovados
            </button>
            <button
              type="button"
              onClick={() => setFilter('rejected')}
              className={`min-h-[44px] px-3 py-1.5 rounded-full text-sm font-semibold ${filter === 'rejected' ? 'bg-red-500/20 text-red-400' : 'bg-slate-800 text-slate-400'}`}
            >
              Rejeitados
            </button>
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`min-h-[44px] px-3 py-1.5 rounded-full text-sm font-semibold ${filter === 'all' ? 'bg-slate-800 text-slate-300' : 'bg-slate-800 text-slate-400'}`}
            >
              Todos
            </button>
          </div>
        </div>

        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={event => setSearchTerm(event.target.value)}
            placeholder="Buscar por nome, email, cidade ou instrumento"
            className="min-h-[44px] w-full pl-9 pr-3 py-2.5 border border-slate-600 bg-slate-800 text-white placeholder:text-slate-400 rounded-lg text-sm focus:ring-2 focus:ring-amber-400/40"
          />
        </div>
      </div>

      {/* Sort Controls */}
      <div className="bg-slate-900/90 backdrop-blur rounded-xl shadow p-4 flex flex-wrap gap-3 items-center">
        <span className="text-sm font-medium text-slate-300">Ordenar por:</span>
        <button
          onClick={() => handleSort('name')}
          className={`min-h-[44px] px-3 py-1.5 rounded text-sm ${sortField === 'name' ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-800 text-slate-300'}`}
        >
          Nome {sortField === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
        </button>
        <button
          onClick={() => handleSort('created_at')}
          className={`min-h-[44px] px-3 py-1.5 rounded text-sm ${sortField === 'created_at' ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-800 text-slate-300'}`}
        >
          Data {sortField === 'created_at' && (sortOrder === 'asc' ? '↑' : '↓')}
        </button>
        <button
          onClick={() => handleSort('status')}
          className={`min-h-[44px] px-3 py-1.5 rounded text-sm ${sortField === 'status' ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-800 text-slate-300'}`}
        >
          Status {sortField === 'status' && (sortOrder === 'asc' ? '↑' : '↓')}
        </button>
      </div>

      {/* Requests List */}
      {sortedAndFilteredRequests.length === 0 ? (
        <div className="bg-slate-900/90 backdrop-blur rounded-xl shadow p-10 text-center">
          <AlertCircle className="h-12 w-12 text-slate-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">Nenhuma solicitação encontrada</h3>
          <p className="text-slate-300">
            {searchTerm
              ? 'Tente ajustar os filtros ou buscar por outro termo.'
              : 'Nenhuma solicitação neste status.'}
          </p>
        </div>
      ) : (
        <>
          <div className="grid gap-4">
            {paginatedRequests.map(request => (
              <div
                key={request.id}
                className="bg-slate-900/90 backdrop-blur rounded-xl shadow p-4 sm:p-5"
              >
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <span className="text-lg font-semibold text-white">{request.full_name}</span>
                    {getStatusBadge(request.status)}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-slate-300">
                    <span className="flex items-center gap-2">
                      <Mail className="h-4 w-4 flex-shrink-0" />
                      {request.email}
                    </span>
                    <span className="flex items-center gap-2">
                      <Phone className="h-4 w-4 flex-shrink-0" />
                      {request.phone}
                    </span>
                    <span className="flex items-center gap-2">
                      <Music2 className="h-4 w-4 flex-shrink-0" />
                      {request.instrument}
                    </span>
                    <span className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 flex-shrink-0" />
                      {request.city}, {request.state}
                    </span>
                  </div>

                  <p className="text-xs text-slate-400">
                    Enviado em{' '}
                    {format(parseISO(request.created_at), "dd/MM/yyyy 'às' HH:mm", {
                      locale: ptBR,
                    })}
                  </p>

                  <div className="flex flex-col sm:flex-row gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => handleViewDetails(request)}
                      className="min-h-[44px] w-full sm:w-auto px-4 py-2 text-sm font-semibold rounded-lg border border-white/10 text-slate-200 hover:bg-white/10"
                    >
                      Detalhes
                    </button>
                    {request.status === 'pending' && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleApprove(request.id)}
                          disabled={actionLoading === request.id}
                          className="min-h-[44px] w-full sm:w-auto px-4 py-2 text-sm font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          {actionLoading === request.id ? (
                            <span className="flex items-center justify-center gap-2">
                              <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                              Aprovando...
                            </span>
                          ) : (
                            'Aprovar'
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedRequest(request);
                            setAdminNotes('');
                          }}
                          disabled={actionLoading === request.id}
                          className="min-h-[44px] w-full sm:w-auto px-4 py-2 text-sm font-semibold rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/20 disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          Rejeitar
                        </button>
                      </>
                    )}
                    {request.status === 'approved' && !request.invite_used && (
                      <button
                        type="button"
                        onClick={() => handleResendInvite(request.id)}
                        disabled={actionLoading === request.id}
                        className="min-h-[44px] w-full sm:w-auto px-4 py-2 text-sm font-semibold rounded-lg border border-amber-500/40 text-amber-300 hover:bg-amber-500/10 disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {actionLoading === request.id ? (
                          <span className="flex items-center justify-center gap-2">
                            <div className="animate-spin h-4 w-4 border-2 border-amber-300 border-t-transparent rounded-full"></div>
                            Reenviando...
                          </span>
                        ) : (
                          'Reenviar convite'
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between mt-6 gap-4">
              <p className="text-sm text-slate-300">
                Mostrando{' '}
                {Math.min((currentPage - 1) * itemsPerPage + 1, sortedAndFilteredRequests.length)} -{' '}
                {Math.min(currentPage * itemsPerPage, sortedAndFilteredRequests.length)} de{' '}
                {sortedAndFilteredRequests.length} resultados
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="min-h-[44px] px-3 py-1 rounded border border-white/10 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/10 text-slate-300"
                >
                  Anterior
                </button>
                <span className="px-3 py-1 text-slate-300">
                  Página {currentPage} de {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="min-h-[44px] px-3 py-1 rounded border border-white/10 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/10 text-slate-300"
                >
                  Próxima
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Details Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-slate-900/90 backdrop-blur rounded-2xl shadow-2xl w-full max-w-lg p-6">
            <h2 className="text-xl font-bold text-white mb-4">Detalhes da Solicitação</h2>

            <div className="space-y-3 text-sm text-slate-300">
              <div>
                <strong className="text-white">Nome:</strong> {selectedRequest.full_name}
              </div>
              <div>
                <strong className="text-white">Email:</strong> {selectedRequest.email}
              </div>
              <div>
                <strong className="text-white">Telefone:</strong> {selectedRequest.phone}
              </div>
              <div>
                <strong className="text-white">Instrumento:</strong> {selectedRequest.instrument}
              </div>
              <div>
                <strong className="text-white">Cidade:</strong> {selectedRequest.city},{' '}
                {selectedRequest.state}
              </div>
              <div>
                <strong className="text-white">Status:</strong> {selectedRequest.status_display}
              </div>
              {selectedRequest.instagram && (
                <div>
                  <strong className="text-white">Instagram:</strong> {selectedRequest.instagram}
                </div>
              )}
            </div>

            {selectedRequest.bio && (
              <div className="text-sm text-slate-300">
                <strong className="text-white">Bio:</strong> {selectedRequest.bio}
              </div>
            )}

            {selectedRequest.status === 'pending' && (
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Notas do admin (opcional)
                </label>
                <textarea
                  value={adminNotes}
                  onChange={event => setAdminNotes(event.target.value)}
                  rows={3}
                  className="min-h-[96px] w-full rounded-lg border border-slate-600 bg-slate-800 text-white placeholder:text-slate-400 px-3 py-2 text-sm focus:ring-2 focus:ring-amber-400/40"
                  placeholder="Observações internas ou motivo da recusa"
                />
              </div>
            )}

            <div className="flex flex-col sm:flex-row justify-end gap-2">
              <button
                type="button"
                onClick={handleCloseDetails}
                className="min-h-[44px] px-4 py-2 rounded-lg border border-white/10 text-slate-200 hover:bg-white/10"
              >
                Fechar
              </button>
              {selectedRequest.status === 'pending' && (
                <>
                  <button
                    type="button"
                    onClick={() => handleReject(selectedRequest.id, adminNotes)}
                    disabled={actionLoading === selectedRequest.id}
                    className="min-h-[44px] px-4 py-2 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/20 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {actionLoading === selectedRequest.id ? (
                      <span className="flex items-center justify-center gap-2">
                        <div className="animate-spin h-4 w-4 border-2 border-red-600 border-t-transparent rounded-full"></div>
                        Rejeitando...
                      </span>
                    ) : (
                      'Rejeitar'
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApprove(selectedRequest.id)}
                    disabled={actionLoading === selectedRequest.id}
                    className="min-h-[44px] px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {actionLoading === selectedRequest.id ? (
                      <span className="flex items-center justify-center gap-2">
                        <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                        Aprovando...
                      </span>
                    ) : (
                      'Aprovar'
                    )}
                  </button>
                </>
              )}
              {selectedRequest.status === 'approved' && !selectedRequest.invite_used && (
                <button
                  type="button"
                  onClick={() => handleResendInvite(selectedRequest.id)}
                  disabled={actionLoading === selectedRequest.id}
                  className="min-h-[44px] px-4 py-2 rounded-lg border border-amber-500/40 text-amber-300 hover:bg-amber-500/10 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {actionLoading === selectedRequest.id ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="animate-spin h-4 w-4 border-2 border-amber-300 border-t-transparent rounded-full"></div>
                      Reenviando...
                    </span>
                  ) : (
                    'Reenviar convite'
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Requests;
