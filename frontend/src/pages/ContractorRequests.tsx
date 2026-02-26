import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, MapPin, MessageSquare } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { quoteRequestService, type QuoteRequest } from '../services/publicApi';
import ContractorLayout from '../components/contractor/ContractorLayout';
import { SkeletonCard } from '../components/common/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import { CONTRACTOR_ROUTES } from '../routes/contractorRoutes';
import { showToast } from '../utils/toast';

const STATUS_FILTERS = [
  { key: 'all', label: 'Todos' },
  { key: 'pending', label: 'Pendentes' },
  { key: 'responded', label: 'Respondidos' },
  { key: 'reserved', label: 'Reservados' },
  { key: 'confirmed', label: 'Confirmados' },
  { key: 'cancelled', label: 'Cancelados' },
] as const;

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
    case 'completed':
      return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300';
    case 'cancelled':
    case 'declined':
      return 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
  }
};

const getStatusBorderColor = (status: string) => {
  switch (status) {
    case 'pending':
      return 'border-l-amber-400';
    case 'responded':
      return 'border-l-green-400';
    case 'reserved':
      return 'border-l-blue-400';
    case 'confirmed':
      return 'border-l-indigo-500';
    case 'completed':
      return 'border-l-emerald-400';
    case 'cancelled':
    case 'declined':
      return 'border-l-red-400';
    default:
      return 'border-l-gray-300';
  }
};

export default function ContractorRequests() {
  const prefersReducedMotion = useReducedMotion();
  const [requests, setRequests] = useState<QuoteRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const statusParam = filter !== 'all' ? filter : undefined;
      const data = await quoteRequestService.listSent(statusParam);
      setRequests(data);
    } catch (error) {
      showToast.apiError(error);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  return (
    <ContractorLayout>
      <div className="page-stack">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={prefersReducedMotion ? { duration: 0.2 } : { duration: 0.3 }}
        >
          <h1 className="text-2xl sm:text-3xl font-heading font-bold text-gray-900 dark:text-white">
            Meus Pedidos
          </h1>
          <p className="text-sm text-muted mt-1">Acompanhe os orçamentos enviados para músicos</p>
        </motion.div>

        {/* Status Filter Tabs */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 no-scrollbar sm:flex-wrap sm:overflow-visible">
          {STATUS_FILTERS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`inline-flex items-center whitespace-nowrap rounded-full px-3.5 py-2 text-xs font-heading font-semibold uppercase tracking-wider transition-all min-h-[40px] ${
                filter === key
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-500/20'
                  : 'bg-white dark:bg-slate-800 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Request Cards */}
        {loading ? (
          <SkeletonCard count={4} />
        ) : requests.length === 0 ? (
          <EmptyState
            icon={MessageSquare}
            title={
              filter === 'all'
                ? 'Nenhum pedido enviado'
                : `Nenhum pedido ${STATUS_FILTERS.find(f => f.key === filter)?.label.toLowerCase()}`
            }
            description="Busque músicos e envie pedidos de orçamento"
            action={{
              label: 'Buscar Músicos',
              onClick: () => {
                window.location.href = CONTRACTOR_ROUTES.browseMusicians;
              },
            }}
          />
        ) : (
          <div className="space-y-3">
            {requests.map((request, index) => (
              <motion.div
                key={request.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  delay: prefersReducedMotion ? 0 : Math.min(index * 0.05, 0.4),
                  duration: 0.28,
                }}
              >
                <Link
                  to={CONTRACTOR_ROUTES.requestDetail(request.id)}
                  className={`block rounded-2xl border border-gray-100 dark:border-slate-800 border-l-4 ${getStatusBorderColor(request.status)} bg-white dark:bg-slate-900 shadow-sm hover:shadow-md p-4 transition-all duration-200`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-heading font-semibold text-gray-900 dark:text-white truncate">
                        {request.musician_name}
                      </h3>
                      <p className="text-sm text-muted mt-0.5">{request.event_type}</p>
                    </div>
                    <span
                      className={`text-xs px-2.5 py-1 rounded-full font-medium whitespace-nowrap flex-shrink-0 ${getStatusColor(request.status)}`}
                    >
                      {request.status_display}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-3 mt-3 text-xs text-muted">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(request.event_date).toLocaleDateString('pt-BR')}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" />
                      {request.location_city} — {request.location_state}
                    </span>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </ContractorLayout>
  );
}
