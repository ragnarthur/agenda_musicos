import React, { useMemo, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Clock, CheckCircle, XCircle, AlertCircle, TrendingUp, Search, Copy, Mail, MapPin, Phone, Music2 } from 'lucide-react';
import { api } from '../services/api';
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

const AdminDashboard: React.FC = () => {
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

  useEffect(() => {
    fetchDashboardData();
  }, [filter]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setIsForbidden(false);
      const [statsResponse, requestsResponse] = await Promise.all([
        api.get('/admin/dashboard-stats/'),
        musicianRequestService.list({ status: filter }),
      ]);
      setStats(statsResponse.data);
      setRequests(requestsResponse);
    } catch (error: any) {
      const status = error?.response?.status;
      if (status === 401 || status === 403) {
        setIsForbidden(true);
      } else {
        showToast.apiError(error);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (requestId: number) => {
    setActionLoading(requestId);
    try {
      const response = await musicianRequestService.approve(requestId, adminNotes || undefined);
      const origin = window.location.origin;
      setInviteLink(`${origin}/cadastro?token=${response.invite_token}`);
      setInviteExpiresAt(response.invite_expires_at);
      showToast.success('Solicitação aprovada!');
      await fetchDashboardData();
      setSelectedRequest(null);
      setAdminNotes('');
    } catch (error: any) {
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
    } catch (error: any) {
      showToast.apiError(error);
    } finally {
      setActionLoading(null);
    }
  };

  const filteredRequests = useMemo(() => requests.filter(request => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return true;
    return (
      request.full_name.toLowerCase().includes(term) ||
      request.email.toLowerCase().includes(term) ||
      request.city.toLowerCase().includes(term) ||
      request.instrument.toLowerCase().includes(term)
    );
  }), [requests, searchTerm]);

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
      cancelled: 'bg-gray-100 text-gray-800'
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variants[status as keyof typeof variants] || 'bg-gray-100 text-gray-800'}`}>
        {getStatusIcon(status)}
        <span className="ml-1">{status.charAt(0).toUpperCase() + status.slice(1)}</span>
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
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
                  Expira em {format(parseISO(inviteExpiresAt), "dd 'de' MMMM 'de' yyyy, HH:mm", { locale: ptBR })}
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
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
        <div className="bg-white rounded-xl shadow p-4 mb-6 flex flex-col lg:flex-row gap-4 lg:items-center lg:justify-between">
          <div className="flex items-center gap-2">
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
          <div className="relative w-full lg:w-80">
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

        {/* Requests */}
        {filteredRequests.length === 0 ? (
          <div className="bg-white rounded-xl shadow p-10 text-center text-gray-600">
            Nenhuma solicitação encontrada.
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredRequests.map((request) => (
              <div key={request.id} className="bg-white rounded-xl shadow p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-semibold text-gray-900">{request.full_name}</span>
                    {getStatusBadge(request.status)}
                  </div>
                  <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                    <span className="flex items-center gap-2"><Mail className="h-4 w-4" />{request.email}</span>
                    <span className="flex items-center gap-2"><Phone className="h-4 w-4" />{request.phone}</span>
                    <span className="flex items-center gap-2"><Music2 className="h-4 w-4" />{request.instrument}</span>
                    <span className="flex items-center gap-2"><MapPin className="h-4 w-4" />{request.city}, {request.state}</span>
                  </div>
                  <p className="text-xs text-gray-500">
                    Enviado em {format(parseISO(request.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedRequest(request)}
                    className="px-4 py-2 text-sm font-semibold rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50"
                  >
                    Detalhes
                  </button>
                  {request.status === 'pending' && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleApprove(request.id)}
                        disabled={actionLoading === request.id}
                        className="px-4 py-2 text-sm font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60"
                      >
                        Aprovar
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedRequest(request);
                          setAdminNotes('');
                        }}
                        disabled={actionLoading === request.id}
                        className="px-4 py-2 text-sm font-semibold rounded-lg border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-60"
                      >
                        Rejeitar
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {selectedRequest && (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 space-y-4">
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
                <div><strong>Telefone:</strong> {selectedRequest.phone}</div>
                <div><strong>Instrumento:</strong> {selectedRequest.instrument}</div>
                <div><strong>Cidade:</strong> {selectedRequest.city}, {selectedRequest.state}</div>
                <div><strong>Status:</strong> {selectedRequest.status_display}</div>
                {selectedRequest.instagram && (
                  <div><strong>Instagram:</strong> {selectedRequest.instagram}</div>
                )}
              </div>

              {selectedRequest.bio && (
                <div className="text-sm text-gray-600">
                  <strong>Bio:</strong> {selectedRequest.bio}
                </div>
              )}

              {selectedRequest.status === 'pending' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notas do admin (opcional)</label>
                  <textarea
                    value={adminNotes}
                    onChange={(event) => setAdminNotes(event.target.value)}
                    rows={3}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-amber-400/40"
                    placeholder="Observações internas ou motivo da recusa"
                  />
                </div>
              )}

              <div className="flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedRequest(null)}
                  className="px-4 py-2 rounded-lg border border-gray-200 text-gray-700"
                >
                  Fechar
                </button>
                {selectedRequest.status === 'pending' && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleReject(selectedRequest.id, adminNotes)}
                      disabled={actionLoading === selectedRequest.id}
                      className="px-4 py-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50"
                    >
                      Rejeitar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApprove(selectedRequest.id)}
                      disabled={actionLoading === selectedRequest.id}
                      className="px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
                    >
                      Aprovar
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
