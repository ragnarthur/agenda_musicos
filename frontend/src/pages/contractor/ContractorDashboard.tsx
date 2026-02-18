import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search,
  PlusCircle,
  Send,
  Clock,
  MessageSquare,
  CheckCircle,
  Calendar,
  MapPin,
  ChevronRight,
} from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import ContractorLayout from '../../components/contractor/ContractorLayout';
import PullToRefresh from '../../components/common/PullToRefresh';
import Skeleton from '../../components/common/Skeleton';
import { SkeletonCard } from '../../components/common/Skeleton';
import { StatCard } from '../../components/ui/StatCard';
import EmptyState from '../../components/ui/EmptyState';
import { useCompanyAuth } from '../../contexts/CompanyAuthContext';
import {
  contractorService,
  quoteRequestService,
  type ContractorDashboard as DashboardData,
  type QuoteRequest,
} from '../../services/publicApi';
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

  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [requests, setRequests] = useState<QuoteRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [dashData, reqData] = await Promise.all([
        contractorService.getDashboard(),
        quoteRequestService.listSent(),
      ]);
      setDashboard(dashData);
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

  if (loading) {
    return (
      <ContractorLayout>
        <div className="page-stack py-6 sm:py-8">
          <Skeleton className="h-36 w-full rounded-2xl" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
          </div>
          <SkeletonCard count={3} />
        </div>
      </ContractorLayout>
    );
  }

  const stats = dashboard?.stats;
  const recentRequests = requests.slice(0, 5);

  return (
    <ContractorLayout>
      <PullToRefresh onRefresh={handleRefresh} disabled={loading}>
        <div className="page-stack">
          {/* Hero Panel */}
          <motion.div
            className="hero-panel"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={
              prefersReducedMotion
                ? { duration: 0.3 }
                : { type: 'spring', stiffness: 120, damping: 18 }
            }
          >
            <div className="hero-animated" />
            <div className="spotlight pointer-events-none absolute inset-0 -z-10" />
            <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-primary-700 dark:text-primary-400">
                  Painel do Contratante
                </p>
                <h1 className="mt-1 text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                  Olá, {organization?.name || 'Contratante'}!
                </h1>
                <p className="mt-2 text-sm text-muted">
                  Gerencie suas solicitações de músicos para eventos.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link
                  to={CONTRACTOR_ROUTES.browseMusicians}
                  className="inline-flex items-center gap-2 rounded-full bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-md hover:bg-primary-700 transition-transform hover:-translate-y-0.5 min-h-[44px]"
                >
                  <Search className="h-4 w-4" />
                  Buscar Músicos
                </Link>
                <Link
                  to={CONTRACTOR_ROUTES.newRequest}
                  className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white dark:border-gray-700 dark:bg-slate-800 px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-transform hover:-translate-y-0.5 min-h-[44px]"
                >
                  <PlusCircle className="h-4 w-4" />
                  Novo Pedido
                </Link>
              </div>
            </div>
          </motion.div>

          {/* Stats Grid */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={
              prefersReducedMotion
                ? { duration: 0.3 }
                : { type: 'spring', stiffness: 120, damping: 18, delay: 0.05 }
            }
          >
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              <StatCard
                label="Total Enviados"
                value={stats?.total_sent ?? 0}
                icon={Send}
                iconColor="text-slate-500"
              />
              <StatCard
                label="Pendentes"
                value={stats?.pending ?? 0}
                icon={Clock}
                iconColor="text-amber-500"
              />
              <StatCard
                label="Respondidos"
                value={stats?.responded ?? 0}
                icon={MessageSquare}
                iconColor="text-green-500"
              />
              <StatCard
                label="Reservados"
                value={stats?.reserved ?? 0}
                icon={CheckCircle}
                iconColor="text-blue-500"
              />
            </div>
          </motion.div>

          {/* Recent Requests */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={
              prefersReducedMotion
                ? { duration: 0.3 }
                : { type: 'spring', stiffness: 120, damping: 18, delay: 0.1 }
            }
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Pedidos Recentes
                  </h2>
                  <p className="text-sm text-muted">Últimas solicitações enviadas</p>
                </div>
                {requests.length > 0 && (
                  <Link
                    to={CONTRACTOR_ROUTES.requests}
                    className="text-sm font-semibold text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 flex items-center gap-1"
                  >
                    Ver todos
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                )}
              </div>

              {recentRequests.length === 0 ? (
                <EmptyState
                  icon={MessageSquare}
                  title="Nenhum pedido enviado"
                  description="Busque músicos e envie seu primeiro orçamento"
                  action={{
                    label: 'Buscar Músicos',
                    onClick: () => navigate(CONTRACTOR_ROUTES.browseMusicians),
                  }}
                />
              ) : (
                <div className="space-y-3">
                  {recentRequests.map((request, index) => (
                    <motion.div
                      key={request.id}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        delay: prefersReducedMotion ? 0 : index * 0.05,
                        duration: 0.3,
                      }}
                    >
                      <Link
                        to={CONTRACTOR_ROUTES.requestDetail(request.id)}
                        className="block card hover:shadow-lg transition-all"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                              {request.musician_name}
                            </h3>
                            <p className="text-sm text-muted">{request.event_type}</p>
                          </div>
                          <span
                            className={`text-xs px-2.5 py-1 rounded-full font-medium whitespace-nowrap ${getStatusColor(request.status)}`}
                          >
                            {request.status_display}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-3 mt-3 text-sm text-muted">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            {new Date(request.event_date).toLocaleDateString('pt-BR')}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5" />
                            {request.location_city} - {request.location_state}
                          </span>
                        </div>
                      </Link>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </PullToRefresh>
    </ContractorLayout>
  );
}
