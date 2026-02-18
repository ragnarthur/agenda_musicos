import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, MapPin, MessageSquare, Search } from 'lucide-react';
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
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
            Meus Pedidos
          </h1>
          <p className="text-sm text-muted mt-1">Acompanhe os orçamentos enviados para músicos</p>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex gap-1.5 sm:gap-2 overflow-x-auto pb-2 -mx-1 px-1 no-scrollbar sm:flex-wrap sm:overflow-visible">
          {STATUS_FILTERS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3 sm:px-4 py-2 text-sm font-medium transition-all min-h-[44px] ${
                filter === key
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white border-transparent shadow-md'
                  : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-slate-700'
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
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  delay: prefersReducedMotion ? 0 : Math.min(index * 0.05, 0.4),
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
                    {request.venue_name && (
                      <span className="flex items-center gap-1">
                        <Search className="w-3.5 h-3.5" />
                        {request.venue_name}
                      </span>
                    )}
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
