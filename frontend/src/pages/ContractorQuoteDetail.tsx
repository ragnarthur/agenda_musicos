import { useParams, Link } from 'react-router-dom';
import { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Clock,
  CheckCircle,
  XCircle,
  Trash2,
  DollarSign,
  Building2,
} from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { quoteRequestService, type QuoteRequest, type QuoteProposal } from '../services/publicApi';
import ContractorLayout from '../components/contractor/ContractorLayout';
import ConfirmModal from '../components/modals/ConfirmModal';
import Skeleton from '../components/common/Skeleton';
import { CONTRACTOR_ROUTES } from '../routes/contractorRoutes';
import { showToast } from '../utils/toast';

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

const getProposalStatusIcon = (status: string) => {
  switch (status) {
    case 'sent':
      return <Clock className="w-4 h-4 text-blue-500 dark:text-blue-400" />;
    case 'accepted':
      return <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />;
    case 'declined':
      return <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />;
    case 'expired':
      return <Clock className="w-4 h-4 text-gray-400" />;
    default:
      return <Clock className="w-4 h-4" />;
  }
};

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

const formatDateTime = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

const formatCurrency = (value: string | null) => {
  if (!value) return '-';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(parseFloat(value));
};

export default function ContractorQuoteDetail() {
  const { id } = useParams<{ id: string }>();
  const prefersReducedMotion = useReducedMotion();

  const [quote, setQuote] = useState<QuoteRequest | null>(null);
  const [proposals, setProposals] = useState<QuoteProposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Modal state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText: string;
    variant: 'danger' | 'primary';
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    confirmText: '',
    variant: 'primary',
    onConfirm: () => {},
  });

  const loadData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [quoteData, proposalsData] = await Promise.all([
        quoteRequestService.get(Number(id)),
        quoteRequestService.listProposals(Number(id)),
      ]);
      setQuote(quoteData);
      setProposals(proposalsData);
    } catch {
      showToast.error('Erro ao carregar detalhes do pedido');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAcceptProposal = (proposalId: number) => {
    setConfirmModal({
      isOpen: true,
      title: 'Aceitar Proposta',
      message: 'Tem certeza que deseja aceitar esta proposta? O músico será notificado.',
      confirmText: 'Aceitar',
      variant: 'primary',
      onConfirm: async () => {
        setActionLoading(true);
        try {
          await quoteRequestService.acceptProposal(Number(id), proposalId);
          showToast.success('Proposta aceita com sucesso!');
          await loadData();
        } catch {
          showToast.error('Erro ao aceitar proposta');
        } finally {
          setActionLoading(false);
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  const handleDeclineProposal = (proposalId: number) => {
    setConfirmModal({
      isOpen: true,
      title: 'Recusar Proposta',
      message: 'Tem certeza que deseja recusar esta proposta?',
      confirmText: 'Recusar',
      variant: 'danger',
      onConfirm: async () => {
        setActionLoading(true);
        try {
          await quoteRequestService.declineProposal(Number(id), proposalId);
          showToast.success('Proposta recusada');
          await loadData();
        } catch {
          showToast.error('Erro ao recusar proposta');
        } finally {
          setActionLoading(false);
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  const handleCancelRequest = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Cancelar Pedido',
      message:
        'Tem certeza que deseja cancelar este pedido de orçamento? Esta ação não pode ser desfeita.',
      confirmText: 'Cancelar Pedido',
      variant: 'danger',
      onConfirm: async () => {
        setActionLoading(true);
        try {
          await quoteRequestService.cancelRequest(Number(id));
          showToast.success('Pedido cancelado');
          await loadData();
        } catch {
          showToast.error('Erro ao cancelar pedido');
        } finally {
          setActionLoading(false);
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  const handleCancelBooking = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Cancelar Reserva',
      message: 'Tem certeza que deseja cancelar esta reserva? O músico será notificado.',
      confirmText: 'Cancelar Reserva',
      variant: 'danger',
      onConfirm: async () => {
        setActionLoading(true);
        try {
          await quoteRequestService.cancelBooking(Number(id), 'Cancelado pelo contratante');
          showToast.success('Reserva cancelada');
          await loadData();
        } catch {
          showToast.error('Erro ao cancelar reserva');
        } finally {
          setActionLoading(false);
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  if (loading) {
    return (
      <ContractorLayout>
        <div className="page-stack">
          <Skeleton className="h-5 w-36 rounded-lg" />
          <Skeleton className="h-52 w-full rounded-2xl" />
          <Skeleton className="h-36 w-full rounded-2xl" />
        </div>
      </ContractorLayout>
    );
  }

  if (!quote) {
    return (
      <ContractorLayout>
        <div className="page-stack">
          <Link
            to={CONTRACTOR_ROUTES.requests}
            className="inline-flex items-center gap-1.5 text-xs font-heading font-semibold uppercase tracking-widest text-muted hover:text-gray-900 dark:hover:text-white transition-colors min-h-[44px]"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Pedidos
          </Link>
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">Pedido não encontrado</p>
          </div>
        </div>
      </ContractorLayout>
    );
  }

  return (
    <ContractorLayout>
      <div className="page-stack">
        {/* Back */}
        <Link
          to={CONTRACTOR_ROUTES.requests}
          className="inline-flex items-center gap-1.5 text-xs font-heading font-semibold uppercase tracking-widest text-muted hover:text-gray-900 dark:hover:text-white transition-colors min-h-[44px]"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Pedidos
        </Link>

        {/* Quote Header */}
        <motion.div
          className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl p-5 shadow-sm"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={
            prefersReducedMotion
              ? { duration: 0.3 }
              : { type: 'spring', stiffness: 120, damping: 18 }
          }
        >
          <div className="flex items-start justify-between gap-3 mb-5">
            <div>
              <h1 className="text-xl sm:text-2xl font-heading font-bold text-gray-900 dark:text-white">
                {quote.event_type}
              </h1>
              <p className="text-sm text-muted mt-1">
                Para{' '}
                <Link
                  to={`/musico/${quote.musician}`}
                  className="text-primary-600 dark:text-primary-400 hover:underline font-medium"
                >
                  {quote.musician_name}
                </Link>
              </p>
            </div>
            <span
              className={`text-xs px-3 py-1.5 rounded-full font-medium whitespace-nowrap flex-shrink-0 ${getStatusColor(quote.status)}`}
            >
              {quote.status_display}
            </span>
          </div>

          {/* Event details grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {quote.event_date && (
              <div>
                <p className="text-xs font-heading font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-1">
                  Data
                </p>
                <div className="flex items-center gap-1.5 text-sm text-gray-700 dark:text-gray-300">
                  <Calendar className="w-3.5 h-3.5 text-muted flex-shrink-0" />
                  {formatDate(quote.event_date)}
                </div>
              </div>
            )}
            <div>
              <p className="text-xs font-heading font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-1">
                Local
              </p>
              <div className="flex items-center gap-1.5 text-sm text-gray-700 dark:text-gray-300">
                <MapPin className="w-3.5 h-3.5 text-muted flex-shrink-0" />
                {quote.location_city} — {quote.location_state}
              </div>
            </div>
            {quote.venue_name && (
              <div>
                <p className="text-xs font-heading font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-1">
                  Venue
                </p>
                <div className="flex items-center gap-1.5 text-sm text-gray-700 dark:text-gray-300">
                  <Building2 className="w-3.5 h-3.5 text-muted flex-shrink-0" />
                  {quote.venue_name}
                </div>
              </div>
            )}
            {quote.duration_hours && (
              <div>
                <p className="text-xs font-heading font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-1">
                  Duração
                </p>
                <div className="flex items-center gap-1.5 text-sm text-gray-700 dark:text-gray-300">
                  <Clock className="w-3.5 h-3.5 text-muted flex-shrink-0" />
                  {quote.duration_hours}h
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {/* Notes */}
        {quote.notes && (
          <motion.div
            className="bg-gray-50 dark:bg-slate-900/60 border border-gray-100 dark:border-slate-800 rounded-xl p-4"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={prefersReducedMotion ? { duration: 0.3 } : { delay: 0.05, duration: 0.35 }}
          >
            <p className="text-xs font-heading font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-2">
              Sobre o evento
            </p>
            <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
              {quote.notes}
            </p>
          </motion.div>
        )}

        {/* Reserved Status Banner */}
        {quote.status === 'reserved' && (
          <motion.div
            className="rounded-2xl border border-green-200 dark:border-green-800/50 bg-green-50 dark:bg-green-900/20 p-5"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-heading font-semibold text-green-800 dark:text-green-300">
                  Proposta aceita!
                </h3>
                <p className="text-sm text-green-700 dark:text-green-400 mt-0.5">
                  Aguardando confirmação do músico
                </p>
              </div>
              <CheckCircle className="w-9 h-9 text-green-500 flex-shrink-0" />
            </div>
          </motion.div>
        )}

        {/* Confirmed Status Banner */}
        {quote.status === 'confirmed' && (
          <motion.div
            className="rounded-2xl border border-indigo-200 dark:border-indigo-800/50 bg-indigo-50 dark:bg-indigo-900/20 p-5"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-heading font-semibold text-indigo-800 dark:text-indigo-300">
                  Evento confirmado!
                </h3>
                <p className="text-sm text-indigo-700 dark:text-indigo-400 mt-0.5">
                  O músico confirmou presença no evento
                </p>
              </div>
              <CheckCircle className="w-9 h-9 text-indigo-500 flex-shrink-0" />
            </div>
          </motion.div>
        )}

        {/* Proposals */}
        <motion.div
          className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl p-5 shadow-sm"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={prefersReducedMotion ? { duration: 0.3 } : { delay: 0.1, duration: 0.35 }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-heading font-bold text-gray-900 dark:text-white">
              Propostas recebidas
            </h2>
            {proposals.length > 0 && (
              <span className="text-xs font-heading font-semibold uppercase tracking-widest text-muted">
                {proposals.length}
              </span>
            )}
          </div>

          {proposals.length === 0 ? (
            <p className="text-sm text-muted text-center py-8">Nenhuma proposta recebida ainda</p>
          ) : (
            <div className="space-y-4">
              {proposals.map(proposal => (
                <div
                  key={proposal.id}
                  className="border border-gray-100 dark:border-slate-800 rounded-xl p-4 bg-gray-50 dark:bg-slate-900/50"
                >
                  {/* Proposal Header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {getProposalStatusIcon(proposal.status)}
                      <span className="text-sm font-heading font-semibold text-gray-900 dark:text-white">
                        {proposal.status_display}
                      </span>
                    </div>
                    <span className="text-xs text-muted">{formatDateTime(proposal.created_at)}</span>
                  </div>

                  {/* Value highlight */}
                  {proposal.proposed_value && (
                    <div className="flex items-baseline gap-1.5 mb-3">
                      <DollarSign className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0 mb-0.5" />
                      <span className="text-2xl font-heading font-bold text-green-700 dark:text-green-400">
                        {formatCurrency(proposal.proposed_value)}
                      </span>
                    </div>
                  )}

                  {/* Message */}
                  <p className="text-sm text-muted leading-relaxed mb-3">{proposal.message}</p>

                  {/* Valid until */}
                  {proposal.valid_until && (
                    <div className="flex items-center gap-1.5 text-xs text-muted mb-3">
                      <Clock className="w-3.5 h-3.5" />
                      Válido até {formatDate(proposal.valid_until)}
                    </div>
                  )}

                  {/* Actions */}
                  {proposal.status === 'sent' &&
                    (quote.status === 'pending' || quote.status === 'responded') && (
                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={() => handleAcceptProposal(proposal.id)}
                          className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-sm font-semibold flex items-center justify-center gap-1.5 py-2.5 rounded-xl transition-all min-h-[44px]"
                        >
                          <CheckCircle className="w-4 h-4" />
                          Aceitar
                        </button>
                        <button
                          onClick={() => handleDeclineProposal(proposal.id)}
                          className="flex-1 px-4 py-2 border border-red-200 dark:border-red-800/50 text-red-700 dark:text-red-300 text-sm font-medium rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center justify-center gap-1.5 min-h-[44px]"
                        >
                          <XCircle className="w-4 h-4" />
                          Recusar
                        </button>
                      </div>
                    )}
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Cancel Buttons */}
        {(quote.status === 'pending' || quote.status === 'responded') && (
          <button
            onClick={handleCancelRequest}
            className="w-full rounded-xl border border-red-200 dark:border-red-800/50 bg-red-50 dark:bg-red-900/20 p-4 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors flex items-center justify-center gap-2 min-h-[48px] text-sm font-medium"
          >
            <Trash2 className="w-4 h-4" />
            Cancelar Pedido
          </button>
        )}

        {(quote.status === 'reserved' || quote.status === 'confirmed') && (
          <button
            onClick={handleCancelBooking}
            className="w-full rounded-xl border border-red-200 dark:border-red-800/50 bg-red-50 dark:bg-red-900/20 p-4 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors flex items-center justify-center gap-2 min-h-[48px] text-sm font-medium"
          >
            <Trash2 className="w-4 h-4" />
            Cancelar Reserva
          </button>
        )}
      </div>

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        confirmVariant={confirmModal.variant}
        loading={actionLoading}
      />
    </ContractorLayout>
  );
}
