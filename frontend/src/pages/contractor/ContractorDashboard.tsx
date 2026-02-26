import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, PlusCircle, Clock, MessageSquare, ChevronRight } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import ContractorLayout from '../../components/contractor/ContractorLayout';
import PullToRefresh from '../../components/common/PullToRefresh';
import Skeleton from '../../components/common/Skeleton';
import EmptyState from '../../components/ui/EmptyState';
import { useCompanyAuth } from '../../contexts/CompanyAuthContext';
import { quoteRequestService, type QuoteRequest } from '../../services/publicApi';
import { CONTRACTOR_ROUTES } from '../../routes/contractorRoutes';
import { showToast } from '../../utils/toast';

const getStatusColor = (status: string) => {
  switch (status) {
    case 'pending':
      return 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300';
    case 'responded':
      return 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300';
    case 'reserved':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300';
    case 'confirmed':
      return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300';
    case 'cancelled':
    case 'declined':
      return 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300';
    case 'completed':
      return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
  }
};

export default function ContractorDashboard() {
  const { organization } = useCompanyAuth();
  const navigate = useNavigate();
  const prefersReducedMotion = useReducedMotion();

  const [requests, setRequests] = useState<QuoteRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const reqData = await quoteRequestService.listSent();
      setRequests(reqData);
    } catch (error) {
      showToast.apiError(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = useCallback(async () => {
    await fetchData();
  }, [fetchData]);

  const pendingRequests = useMemo(() => requests.filter(r => r.status === 'pending'), [requests]);
  const respondedRequests = useMemo(
    () => requests.filter(r => r.status !== 'pending').slice(0, 3),
    [requests]
  );

  const greetingDate = useMemo(() => {
    const str = new Intl.DateTimeFormat('pt-BR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    }).format(new Date());
    return str.charAt(0).toUpperCase() + str.slice(1);
  }, []);

  if (loading) {
    return (
      <ContractorLayout>
        <div className="page-stack py-6">
          <Skeleton className="h-5 w-44" />
          <Skeleton className="h-10 w-56" />
          <Skeleton className="h-28 w-full rounded-2xl" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      </ContractorLayout>
    );
  }

  return (
    <ContractorLayout>
      <PullToRefresh onRefresh={handleRefresh} disabled={loading}>
        <div className="page-stack pt-2">
          {/* Greeting */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={prefersReducedMotion ? { duration: 0.2 } : { duration: 0.3 }}
          >
            <p className="text-xs font-heading font-semibold uppercase tracking-[0.18em] text-muted mb-1">
              {greetingDate}
            </p>
            <h1 className="text-3xl sm:text-4xl font-heading font-bold text-gray-900 dark:text-white">
              Olá, {organization?.name || 'Contratante'}
            </h1>
          </motion.div>

          {/* Aguardando Resposta */}
          {pendingRequests.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={prefersReducedMotion ? { duration: 0.2 } : { delay: 0.06, duration: 0.3 }}
            >
              <div className="rounded-2xl bg-amber-50 dark:bg-amber-950/25 border border-amber-200 dark:border-amber-800/50 overflow-hidden">
                <div className="flex items-center gap-2 px-4 pt-4 pb-2.5">
                  <Clock className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                  <span className="text-xs font-heading font-semibold uppercase tracking-[0.15em] text-amber-700 dark:text-amber-400">
                    Aguardando resposta · {pendingRequests.length}
                  </span>
                </div>

                <div className="divide-y divide-amber-100 dark:divide-amber-900/40">
                  {pendingRequests.map(request => (
                    <Link
                      key={request.id}
                      to={CONTRACTOR_ROUTES.requestDetail(request.id)}
                      className="flex items-center justify-between px-4 py-3.5 hover:bg-amber-100/60 dark:hover:bg-amber-900/20 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-heading font-semibold text-gray-900 dark:text-white truncate">
                          {request.musician_name}
                        </p>
                        <p className="text-xs text-muted mt-0.5">
                          {request.event_type}
                          {request.event_date
                            ? ` · ${new Date(request.event_date).toLocaleDateString('pt-BR')}`
                            : ''}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-amber-500 dark:text-amber-400 flex-shrink-0 ml-2" />
                    </Link>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* Respondidos Recentemente */}
          {respondedRequests.length > 0 && (
            <motion.section
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={prefersReducedMotion ? { duration: 0.2 } : { delay: 0.1, duration: 0.3 }}
            >
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-heading font-semibold uppercase tracking-[0.15em] text-muted">
                  Respondidos recentemente
                </p>
                {requests.length > 3 && (
                  <Link
                    to={CONTRACTOR_ROUTES.requests}
                    className="text-xs font-heading font-semibold text-primary-600 dark:text-primary-400 hover:underline"
                  >
                    Ver todos
                  </Link>
                )}
              </div>
              <div className="divide-y divide-gray-100 dark:divide-slate-800">
                {respondedRequests.map((request, i) => (
                  <motion.div
                    key={request.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      delay: prefersReducedMotion ? 0 : i * 0.04,
                      duration: 0.22,
                    }}
                  >
                    <Link
                      to={CONTRACTOR_ROUTES.requestDetail(request.id)}
                      className="flex items-center justify-between py-3 gap-3 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800/50 px-2 -mx-2 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-heading font-semibold text-gray-900 dark:text-white truncate">
                          {request.musician_name}
                        </p>
                        <p className="text-xs text-muted truncate mt-0.5">
                          {request.event_type}
                          {request.location_city ? ` · ${request.location_city}` : ''}
                        </p>
                      </div>
                      <span
                        className={`text-xs px-2.5 py-1 rounded-full font-medium whitespace-nowrap flex-shrink-0 ${getStatusColor(request.status)}`}
                      >
                        {request.status_display}
                      </span>
                      <ChevronRight className="h-4 w-4 text-muted flex-shrink-0" />
                    </Link>
                  </motion.div>
                ))}
              </div>
            </motion.section>
          )}

          {/* Empty state */}
          {requests.length === 0 && (
            <EmptyState
              icon={MessageSquare}
              title="Nenhum pedido enviado"
              description="Busque músicos e envie seu primeiro orçamento"
              action={{
                label: 'Buscar Músicos',
                onClick: () => navigate(CONTRACTOR_ROUTES.browseMusicians),
              }}
            />
          )}

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={prefersReducedMotion ? { duration: 0.2 } : { delay: 0.18, duration: 0.3 }}
            className="flex flex-wrap gap-3"
          >
            <Link
              to={CONTRACTOR_ROUTES.browseMusicians}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-6 py-3 rounded-full font-heading font-semibold text-sm shadow-md shadow-indigo-500/20 hover:shadow-lg hover:shadow-indigo-500/25 transition-all min-h-[44px]"
            >
              <Search className="h-4 w-4" />
              Buscar Músicos
            </Link>
            <Link
              to={CONTRACTOR_ROUTES.newRequest}
              className="inline-flex items-center gap-2 rounded-full border border-gray-200 dark:border-gray-700 px-5 py-2.5 text-sm font-heading font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors min-h-[44px]"
            >
              <PlusCircle className="h-4 w-4" />
              Novo Pedido
            </Link>
          </motion.div>
        </div>
      </PullToRefresh>
    </ContractorLayout>
  );
}
