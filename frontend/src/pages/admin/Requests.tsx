import React, { useMemo, useState, useCallback, useEffect } from 'react';
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

type FilterType = 'all' | 'pending' | 'approved' | 'rejected';
type SortField = 'name' | 'created_at' | 'status';
type SortOrder = 'asc' | 'desc';

const Requests: React.FC = () => {
  const [requests, setRequests] = useState<MusicianRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<MusicianRequest | null>(null);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await musicianRequestService.list({ status: filter === 'all' ? undefined : filter });
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
    setCurrentPage(1);
  }, [filter, searchTerm]);

  const handleApprove = async (requestId: number) => {
    setActionLoading(requestId);
    try {
      const response = await musicianRequestService.approve(requestId, adminNotes || undefined);
      const origin = window.location.origin;
      const inviteLink = `${origin}/cadastro/invite?token=${response.invite_token}`;
      await navigator.clipboard.writeText(inviteLink);
      showToast.success('Solicitação aprovada! Link de convite copiado.');
      await fetchDashboardData();
      setSelectedRequest(null);
      setAdminNotes('');
    } catch (error) {
      showToast.apiError(error);
    } finally {
      setActionLoading(null);
    }
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
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const sortedAndFilteredRequests = useMemo(() => {
    const filtered = requests.filter((request) => {
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
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-xl shadow p-5 animate-pulse">
            <div className="space-y-2 flex-1">
              <div className="h-5 bg-gray-200 rounded w-1/3"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white shadow rounded-lg p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Solicitações de Acesso</h1>
        <p className="text-gray-600">Gerencie as solicitações de novos músicos</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow p-4">
        <div className="overflow-x-auto pb-2 mb-4">
          <div className="flex items-center gap-2 min-w-max">
            <button
              type="button"
              onClick={() => setFilter('pending')}
              className={`px-3 py-1.5 rounded-full text-sm font-semibold ${filter === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'}`}
            >
              Pendentes
            </button>
            <button
              type="button"
              onClick={() => setFilter('approved')}
              className={`px-3 py-1.5 rounded-full text-sm font-semibold ${filter === 'approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}
            >
              Aprovados
            </button>
            <button
              type="button"
              onClick={() => setFilter('rejected')}
              className={`px-3 py-1.5 rounded-full text-sm font-semibold ${filter === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}
            >
              Rejeitados
            </button>
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 rounded-full text-sm font-semibold ${filter === 'all' ? 'bg-slate-200 text-slate-700' : 'bg-gray-100 text-gray-600'}`}
            >
              Todos
            </button>
          </div>
        </div>

        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Buscar por nome, email, cidade ou instrumento"
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-amber-400/40"
          />
        </div>
      </div>

      {/* Sort Controls */}
      <div className="bg-white rounded-xl shadow p-4 flex flex-wrap gap-3 items-center">
        <span className="text-sm font-medium text-gray-700">Ordenar por:</span>
        <button
          onClick={() => handleSort('name')}
          className={`px-3 py-1.5 rounded text-sm ${sortField === 'name' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100'}`}
        >
          Nome {sortField === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
        </button>
        <button
          onClick={() => handleSort('created_at')}
          className={`px-3 py-1.5 rounded text-sm ${sortField === 'created_at' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100'}`}
        >
          Data {sortField === 'created_at' && (sortOrder === 'asc' ? '↑' : '↓')}
        </button>
        <button
          onClick={() => handleSort('status')}
          className={`px-3 py-1.5 rounded text-sm ${sortField === 'status' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100'}`}
        >
          Status {sortField === 'status' && (sortOrder === 'asc' ? '↑' : '↓')}
        </button>
      </div>

      {/* Requests List */}
      {sortedAndFilteredRequests.length === 0 ? (
        <div className="bg-white rounded-xl shadow p-10 text-center">
          <AlertCircle className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Nenhuma solicitação encontrada
          </h3>
          <p className="text-gray-600">
            {searchTerm
              ? 'Tente ajustar os filtros ou buscar por outro termo.'
              : 'Nenhuma solicitação neste status.'}
          </p>
        </div>
      ) : (
        <>
          <div className="grid gap-4">
            {paginatedRequests.map((request) => (
              <div key={request.id} className="bg-white rounded-xl shadow p-4 sm:p-5">
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <span className="text-lg font-semibold text-gray-900">
                      {request.full_name}
                    </span>
                    {getStatusBadge(request.status)}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-600">
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

                  <p className="text-xs text-gray-500">
                    Enviado em{' '}
                    {format(parseISO(request.created_at), "dd/MM/yyyy 'às' HH:mm", {
                      locale: ptBR,
                    })}
                  </p>

                  <div className="flex flex-col sm:flex-row gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setSelectedRequest(request)}
                      className="w-full sm:w-auto px-4 py-2 text-sm font-semibold rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50"
                    >
                      Detalhes
                    </button>
                    {request.status === 'pending' && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleApprove(request.id)}
                          disabled={actionLoading === request.id}
                          className="w-full sm:w-auto px-4 py-2 text-sm font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed"
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
                          className="w-full sm:w-auto px-4 py-2 text-sm font-semibold rounded-lg border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          Rejeitar
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between mt-6 gap-4">
              <p className="text-sm text-gray-600">
                Mostrando{' '}
                {Math.min(
                  (currentPage - 1) * itemsPerPage + 1,
                  sortedAndFilteredRequests.length
                )}{' '}
                - {Math.min(currentPage * itemsPerPage, sortedAndFilteredRequests.length)} de{' '}
                {sortedAndFilteredRequests.length} resultados
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 rounded border disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Anterior
                </button>
                <span className="px-3 py-1">
                  Página {currentPage} de {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 rounded border disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
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
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Detalhes da Solicitação</h2>

            <div className="space-y-3 text-sm">
              <div>
                <strong>Nome:</strong> {selectedRequest.full_name}
              </div>
              <div>
                <strong>Email:</strong> {selectedRequest.email}
              </div>
              <div>
                <strong>Telefone:</strong> {selectedRequest.phone}
              </div>
              <div>
                <strong>Instrumento:</strong> {selectedRequest.instrument}
              </div>
              <div>
                <strong>Cidade:</strong> {selectedRequest.city}, {selectedRequest.state}
              </div>
              <div>
                <strong>Status:</strong> {selectedRequest.status_display}
              </div>
              {selectedRequest.instagram && (
                <div>
                  <strong>Instagram:</strong> {selectedRequest.instagram}
                </div>
              )}
            </div>

            {selectedRequest.bio && (
              <div className="text-sm text-gray-600">
                <strong>Bio:</strong> {selectedRequest.bio}
              </div>
            )}

            {selectedRequest.status === 'pending' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notas do admin (opcional)
                </label>
                <textarea
                  value={adminNotes}
                  onChange={event => setAdminNotes(event.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-amber-400/40"
                  placeholder="Observações internas ou motivo da recusa"
                />
              </div>
            )}

            <div className="flex flex-col sm:flex-row justify-end gap-2">
              <button
                type="button"
                onClick={() => setSelectedRequest(null)}
                className="px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50"
              >
                Fechar
              </button>
              {selectedRequest.status === 'pending' && (
                <>
                  <button
                    type="button"
                    onClick={() => handleReject(selectedRequest.id, adminNotes)}
                    disabled={actionLoading === selectedRequest.id}
                    className="px-4 py-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-60 disabled:cursor-not-allowed"
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
                    className="px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed"
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
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Requests;
