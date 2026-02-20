import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Mail, MapPin, Music2, Phone } from 'lucide-react';
import { musicianRequestService, type MusicianRequest } from '../../services/publicApi';
import { showToast } from '../../utils/toast';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ADMIN_ROUTES } from '../../routes/adminRoutes';
import {
  AdminHero,
  AdminCard,
  AdminSearchBar,
  AdminStatusBadge,
  AdminModal,
  AdminPagination,
  AdminButton,
  AdminEmptyState,
  AdminLoading,
  AdminTabs,
} from '../../components/admin';

type FilterType = 'pending' | 'approved' | 'rejected' | 'all';
type SortField = 'name' | 'created_at' | 'status';
type SortOrder = 'asc' | 'desc';

const filterTabs = [
  { key: 'pending', label: 'Pendentes' },
  { key: 'approved', label: 'Aprovados' },
  { key: 'rejected', label: 'Rejeitados' },
  { key: 'all', label: 'Todos' },
];

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
    setAdminNotes('');
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

  if (loading) {
    return (
      <div className="space-y-6">
        <AdminHero
          title="Solicitações de Acesso"
          description="Gerencie as solicitações de novos músicos"
        />
        <AdminLoading count={3} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AdminHero
        title="Solicitações de Acesso"
        description="Gerencie as solicitações de novos músicos"
      />

      {/* Filters & Search */}
      <AdminCard>
        <div className="space-y-4">
          <AdminTabs
            tabs={filterTabs}
            active={filter}
            onChange={key => setFilter(key as FilterType)}
          />
          <AdminSearchBar
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Buscar por nome, email, cidade ou instrumento"
          />
          {/* Sort Controls */}
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-sm font-medium text-slate-400">Ordenar:</span>
            {[
              { field: 'name' as SortField, label: 'Nome' },
              { field: 'created_at' as SortField, label: 'Data' },
              { field: 'status' as SortField, label: 'Status' },
            ].map(({ field, label }) => (
              <button
                key={field}
                onClick={() => handleSort(field)}
                className={`min-h-[36px] px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  sortField === field
                    ? 'bg-indigo-500/20 text-indigo-400'
                    : 'bg-white/5 text-slate-400 hover:bg-white/10'
                }`}
              >
                {label} {sortField === field && (sortOrder === 'asc' ? '↑' : '↓')}
              </button>
            ))}
          </div>
        </div>
      </AdminCard>

      {/* Requests List */}
      {sortedAndFilteredRequests.length === 0 ? (
        <AdminEmptyState
          title="Nenhuma solicitação encontrada"
          description={
            searchTerm
              ? 'Tente ajustar os filtros ou buscar por outro termo.'
              : 'Nenhuma solicitação neste status.'
          }
        />
      ) : (
        <>
          <div className="grid gap-4">
            {paginatedRequests.map(request => (
              <AdminCard key={request.id}>
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <span className="text-lg font-semibold text-white">{request.full_name}</span>
                    <AdminStatusBadge status={request.status} />
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

                  <p className="text-xs text-slate-500">
                    Enviado em{' '}
                    {format(parseISO(request.created_at), "dd/MM/yyyy 'às' HH:mm", {
                      locale: ptBR,
                    })}
                  </p>

                  <div className="flex flex-col sm:flex-row gap-2 pt-2">
                    <AdminButton
                      variant="secondary"
                      size="sm"
                      onClick={() => handleViewDetails(request)}
                    >
                      Detalhes
                    </AdminButton>
                    {request.status === 'pending' && (
                      <>
                        <AdminButton
                          variant="success"
                          size="sm"
                          onClick={() => handleApprove(request.id)}
                          loading={actionLoading === request.id}
                        >
                          Aprovar
                        </AdminButton>
                        <AdminButton
                          variant="danger"
                          size="sm"
                          onClick={() => handleViewDetails(request)}
                        >
                          Rejeitar
                        </AdminButton>
                      </>
                    )}
                    {request.status === 'approved' && !request.invite_used && (
                      <AdminButton
                        variant="ghost"
                        size="sm"
                        onClick={() => handleResendInvite(request.id)}
                        loading={actionLoading === request.id}
                      >
                        Reenviar convite
                      </AdminButton>
                    )}
                  </div>
                </div>
              </AdminCard>
            ))}
          </div>

          <AdminPagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={sortedAndFilteredRequests.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
          />
        </>
      )}

      {/* Details Modal */}
      <AdminModal
        isOpen={!!selectedRequest}
        onClose={handleCloseDetails}
        title="Detalhes da Solicitação"
        footer={
          selectedRequest && (
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <AdminButton variant="secondary" onClick={handleCloseDetails}>
                Fechar
              </AdminButton>
              {selectedRequest.status === 'pending' && (
                <>
                  <AdminButton
                    variant="danger"
                    onClick={() => handleReject(selectedRequest.id, adminNotes)}
                    loading={actionLoading === selectedRequest.id}
                  >
                    Rejeitar
                  </AdminButton>
                  <AdminButton
                    variant="success"
                    onClick={() => handleApprove(selectedRequest.id)}
                    loading={actionLoading === selectedRequest.id}
                  >
                    Aprovar
                  </AdminButton>
                </>
              )}
              {selectedRequest.status === 'approved' && !selectedRequest.invite_used && (
                <AdminButton
                  variant="primary"
                  onClick={() => handleResendInvite(selectedRequest.id)}
                  loading={actionLoading === selectedRequest.id}
                >
                  Reenviar convite
                </AdminButton>
              )}
            </div>
          )
        }
      >
        {selectedRequest && (
          <div className="space-y-4">
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
                <strong className="text-white">Status:</strong>{' '}
                <AdminStatusBadge
                  status={selectedRequest.status}
                  label={selectedRequest.status_display}
                />
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
                <label className="admin-label">Notas do admin (opcional)</label>
                <textarea
                  value={adminNotes}
                  onChange={event => setAdminNotes(event.target.value)}
                  rows={3}
                  className="admin-textarea min-h-[96px]"
                  placeholder="Observações internas ou motivo da recusa"
                />
              </div>
            )}
          </div>
        )}
      </AdminModal>
    </div>
  );
};

export default Requests;
