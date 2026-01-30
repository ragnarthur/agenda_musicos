import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  TrendingUp,
  Search,
  Copy,
  Mail,
  MapPin,
  Phone,
  Music2,
} from 'lucide-react';
import { api, musicianService } from '../services/api';
import { musicianRequestService, type MusicianRequest } from '../services/publicApi';
import { showToast } from '../utils/toast';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface DashboardStats {
  total_requests: number;
  pending_requests: number;
  approved_requests: number;
  rejected_requests: number;
}

type SortField = 'name' | 'created_at' | 'status';
type SortOrder = 'asc' | 'desc';

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [requests, setRequests] = useState<MusicianRequest[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    total_requests: 0,
    pending_requests: 0,
    approved_requests: 0,
    rejected_requests: 0,
  });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<MusicianRequest | null>(null);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [inviteExpiresAt, setInviteExpiresAt] = useState<string | null>(null);
  const [isForbidden, setIsForbidden] = useState(false);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // Sorting states
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Check admin access
  const checkAdminAccess = useCallback(async () => {
    try {
      const musician = await musicianService.getMe();
      if (!musician.user?.is_staff && !musician.user?.is_superuser) {
        showToast.error('Acesso negado. Esta área é restrita a administradores.');
        navigate('/admin/login');
      }
    } catch {
      navigate('/admin/login');
    }
  }, [navigate]);

  useEffect(() => {
    checkAdminAccess();
  }, [checkAdminAccess]);

  // Fetch dashboard data
  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setIsForbidden(false);
      const [statsResponse, requestsResponse] = await Promise.all([
        api.get('/admin/dashboard-stats/'),
        musicianRequestService.list({ status: filter }),
      ]);
      setStats(statsResponse.data);
      setRequests(requestsResponse);
    } catch (error: unknown) {
      const status = (error as { response?: { status?: number } })?.response?.status;
      if (status === 401 || status === 403) {
        setIsForbidden(true);
      } else {
        showToast.apiError(error);
      }
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Reset page when filters or search term change
  useEffect(() => {
    setCurrentPage(1);
  }, [filter, searchTerm]);

  const handleApprove = async (requestId: number) => {
    setActionLoading(requestId);
    try {
      const response = await musicianRequestService.approve(requestId, adminNotes || undefined);
      const origin = window.location.origin;
      setInviteLink(`${origin}/cadastro/invite?token=${response.invite_token}`);
      setInviteExpiresAt(response.invite_expires_at);
      showToast.success('Solicitação aprovada!');
      await fetchDashboardData();
      setSelectedRequest(null);
      setAdminNotes('');
    } catch (error: unknown) {
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
    } catch (error: unknown) {
      showToast.apiError(error);
    } finally {
      setActionLoading(null);
    }
  };

  // Sort and filter handler
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // Sort and filter requests
  const sortedAndFilteredRequests = useMemo(() => {
    // First filter
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

    // Then sort
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

  // Paginate results
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
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="py-6">
              <h1 className="text-3xl font-bold text-gray-900">Admin · Solicitações de acesso</h1>
              <p className="mt-2 text-gray-600">Aprove ou rejeite solicitações de músicos</p>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-xl shadow p-5 animate-pulse">
                <div className="flex items-center justify-between">
                  <div className="space-y-2 flex-1">
                    <div className="h-5 bg-gray-200 rounded w-1/3"></div>
                    <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                  <div className="flex gap-2">
                    <div className="h-8 w-20 bg-gray-200 rounded"></div>
                    <div className="h-8 w-20 bg-gray-200 rounded"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (isForbidden) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md text-center">
          <h1 className="text-xl font-bold text-gray-900 mb-2">Acesso restrito</h1>
          <p className="text-gray-600 mb-6">Esta área é exclusiva para administradores.</p>
          <Link to="/" className="btn-primary inline-block">
            Voltar para o início
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <h1 className="text-3xl font-bold text-gray-900">Admin · Solicitações de acesso</h1>
            <p className="mt-2 text-gray-600">Aprove ou rejeite solicitações de músicos</p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {inviteLink && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-emerald-800">Convite gerado</p>
              <p className="text-xs text-emerald-700 break-all">{inviteLink}</p>
              {inviteExpiresAt && (
                <p className="text-xs text-emerald-600 mt-1">
                  Expira em{' '}
                  {format(parseISO(inviteExpiresAt), "dd 'de' MMMM 'de' yyyy, HH:mm", {
                    locale: ptBR,
                  })}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={async () => {
                await navigator.clipboard.writeText(inviteLink);
                showToast.success('Link copiado!');
              }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg"
            >
              <Copy className="h-4 w-4" />
              Copiar link
            </button>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <TrendingUp className="h-8 w-8 text-blue-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Requests</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.total_requests}</dd>
                </dl>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Clock className="h-8 w-8 text-yellow-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Pending</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.pending_requests}</dd>
                </dl>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Approved</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.approved_requests}</dd>
                </dl>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <XCircle className="h-8 w-8 text-red-500" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Rejected</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.rejected_requests}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow p-4 mb-6">
          {/* Status filters with horizontal scroll */}
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

          {/* Search bar separated */}
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={event => setSearchTerm(event.target.value)}
              placeholder="Buscar por nome, email, cidade ou instrumento"
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-amber-400/40"
            />
          </div>
        </div>

        {/* Sort Controls */}
        <div className="bg-white rounded-xl shadow p-4 mb-4 flex flex-wrap gap-3 items-center">
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

        {/* Requests */}
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
            <div className="grid gap-4 transition-opacity duration-200">
              {paginatedRequests.map(request => (
                <div key={request.id} className="bg-white rounded-xl shadow p-4 sm:p-5">
                  <div className="space-y-3">
                    {/* Header with name and status */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <span className="text-lg font-semibold text-gray-900">
                        {request.full_name}
                      </span>
                      {getStatusBadge(request.status)}
                    </div>

                    {/* Info with improved wrapping */}
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

                    {/* Date */}
                    <p className="text-xs text-gray-500">
                      Enviado em{' '}
                      {format(parseISO(request.created_at), "dd/MM/yyyy 'às' HH:mm", {
                        locale: ptBR,
                      })}
                    </p>

                    {/* Actions - Full width on mobile */}
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
                  {Math.min((currentPage - 1) * itemsPerPage + 1, sortedAndFilteredRequests.length)}{' '}
                  - {Math.min(currentPage * itemsPerPage, sortedAndFilteredRequests.length)} de{' '}
                  {sortedAndFilteredRequests.length} resultados
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 rounded border disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    Anterior
                  </button>
                  <span className="px-3 py-1">
                    Página {currentPage} de {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
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

        {selectedRequest && (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-4 sm:p-6 space-y-4 my-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{selectedRequest.full_name}</h2>
                  <p className="text-sm text-gray-500">{selectedRequest.email}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedRequest(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <div className="grid gap-3 md:grid-cols-2 text-sm text-gray-600">
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
    </div>
  );
};

export default AdminDashboard;
