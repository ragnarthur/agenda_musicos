// pages/ContractorQuoteDetail.tsx
// Detalhes do pedido de orçamento para contratante
import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Clock,
  MessageSquare,
  CheckCircle,
  XCircle,
  Trash2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  quoteRequestService,
  type QuoteRequest,
  type QuoteProposal,
} from '../services/publicApi';
import FullscreenBackground from '../components/Layout/FullscreenBackground';

export default function ContractorQuoteDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [quote, setQuote] = useState<QuoteRequest | null>(null);
  const [proposals, setProposals] = useState<QuoteProposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    loadQuoteAndProposals();
  }, [id]);

  const loadQuoteAndProposals = async () => {
    if (!id) return;
    
    setLoading(true);
    try {
      const [quoteData, proposalsData] = await Promise.all([
        quoteRequestService.get(Number(id)),
        quoteRequestService.listProposals(Number(id)),
      ]);
      setQuote(quoteData);
      setProposals(proposalsData);
    } catch (error) {
      toast.error('Erro ao carregar detalhes do pedido');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptProposal = async (proposalId: number) => {
    if (!quote) return;
    
    if (!confirm('Tem certeza que deseja aceitar esta proposta?')) return;
    
    try {
      await quoteRequestService.acceptProposal(Number(id), proposalId);
      
      // Recarregar propostas e status
      const newProposals = await quoteRequestService.listProposals(Number(id));
      setProposals(newProposals);
      
      const updatedQuote = await quoteRequestService.get(Number(id));
      setQuote(updatedQuote);
      
      toast.success('Proposta aceita com sucesso!');
    } catch (error) {
      toast.error('Erro ao aceitar proposta');
      console.error(error);
    }
  };

  const handleDeclineProposal = async (proposalId: number) => {
    if (!quote) return;
    
    if (!confirm('Tem certeza que deseja recusar esta proposta?')) return;
    
    try {
      await quoteRequestService.declineProposal(Number(id), proposalId);
      
      // Recarregar propostas
      const newProposals = await quoteRequestService.listProposals(Number(id));
      setProposals(newProposals);
      
      toast.success('Proposta recusada com sucesso!');
    } catch (error) {
      toast.error('Erro ao recusar proposta');
      console.error(error);
    }
  };

  const handleCancelRequest = async () => {
    if (!quote) return;
    
    const reason = prompt('Por favor, informe o motivo do cancelamento:');
    if (!reason) return;
    
    setCancelling(true);
    try {
      await quoteRequestService.cancelRequest(Number(id));
      
      // Recarregar status
      const updatedQuote = await quoteRequestService.get(Number(id));
      setQuote(updatedQuote);
      
      toast.success('Pedido cancelado com sucesso!');
    } catch (error) {
      toast.error('Erro ao cancelar pedido');
      console.error(error);
    } finally {
      setCancelling(false);
    }
  };

  const handleCancelBooking = async () => {
    if (!quote) return;
    
    const reason = prompt('Por favor, informe o motivo do cancelamento da reserva:');
    if (!reason) return;
    
    if (!confirm('Tem certeza que deseja cancelar esta reserva?')) return;
    
    setCancelling(true);
    try {
      await quoteRequestService.cancelBooking(Number(id), reason);
      
      // Recarregar status
      const updatedQuote = await quoteRequestService.get(Number(id));
      setQuote(updatedQuote);
      
      toast.success('Reserva cancelada com sucesso!');
    } catch (error) {
      toast.error('Erro ao cancelar reserva');
      console.error(error);
    } finally {
      setCancelling(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'responded':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'reserved':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'confirmed':
        return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300';
      case 'cancelled':
      case 'declined':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const getProposalStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
        return <Clock className="w-4 h-4 text-blue-600" />;
      case 'accepted':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'declined':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'expired':
        return <Clock className="w-4 h-4 text-gray-400" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCurrency = (value: string | null) => {
    if (!value) return '-';
    const num = parseFloat(value);
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(num);
  };

  if (loading) {
    return (
      <FullscreenBackground>
        <div className="min-h-[100svh]">
          <div className="page-shell max-w-5xl py-8">
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
            </div>
          </div>
        </div>
      </FullscreenBackground>
    );
  }

  if (!quote) {
    return (
      <FullscreenBackground>
        <div className="min-h-[100svh]">
          <div className="page-shell max-w-5xl py-8">
            <button
              onClick={() => navigate('/contratante/pedidos')}
              className="flex items-center gap-2 text-gray-300 hover:text-white mb-6"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar para pedidos
            </button>
            <div className="text-center py-12">
              <p className="text-gray-300">Pedido não encontrado</p>
            </div>
          </div>
        </div>
      </FullscreenBackground>
    );
  }

  return (
    <FullscreenBackground>
      <div className="min-h-[100svh]">
        <div className="page-shell max-w-5xl py-8">
          <button
            onClick={() => navigate('/contratante/pedidos')}
            className="flex items-center gap-2 text-gray-300 hover:text-white mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar para pedidos
          </button>

          <div className="space-y-6">
            {/* Header do pedido */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-2xl font-bold text-white">
                    {quote.event_type}
                  </h1>
                  <p className="text-sm text-gray-300 mt-1">
                    Para {quote.musician_name}
                  </p>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(quote.status)}`}>
                  {quote.status_display}
                </span>
              </div>

              <div className="flex flex-wrap gap-4 text-sm text-gray-300">
                {quote.event_date && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {formatDate(quote.event_date)}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {quote.location_city} - {quote.location_state}
                </span>
                {quote.venue_name && (
                  <span className="flex items-center gap-1">
                    <MessageSquare className="w-4 h-4" />
                    {quote.venue_name}
                  </span>
                )}
              </div>

              {quote.duration_hours && (
                <div className="mt-4 text-sm text-gray-300">
                  <strong>Duração:</strong> {quote.duration_hours} horas
                </div>
              )}
            </div>

            {/* Detalhes do evento */}
            {quote.notes && (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
                <h2 className="text-lg font-semibold text-white mb-3">
                  Sobre o evento
                </h2>
                <p className="text-gray-300 whitespace-pre-wrap">
                  {quote.notes}
                </p>
              </div>
            )}

            {/* Botão para confirmar reserva */}
            {quote.status === 'reserved' && (
              <div className="rounded-2xl border border-green-500/30 bg-green-500/10 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-green-100">
                      Proposta aceita!
                    </h3>
                    <p className="text-sm text-green-200 mt-1">
                      Aguardando confirmação do músico
                    </p>
                  </div>
                  <CheckCircle className="w-8 h-8 text-green-400" />
                </div>
              </div>
            )}

            {/* Botão para cancelar pedido/reserva */}
            {(quote.status === 'pending' || quote.status === 'responded') && (
              <button
                onClick={handleCancelRequest}
                disabled={cancelling}
                className="w-full rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-red-200 hover:bg-red-500/20 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {cancelling ? (
                  <div className="w-5 h-5 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Trash2 className="w-5 h-5" />
                    Cancelar Pedido
                  </>
                )}
              </button>
            )}

            {(quote.status === 'reserved' || quote.status === 'confirmed') && (
              <button
                onClick={handleCancelBooking}
                disabled={cancelling}
                className="w-full rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-red-200 hover:bg-red-500/20 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {cancelling ? (
                  <div className="w-5 h-5 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Trash2 className="w-5 h-5" />
                    Cancelar Reserva
                  </>
                )}
              </button>
            )}

            {/* Propostas recebidas */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <h2 className="text-lg font-semibold text-white mb-4">
                Propostas recebidas
              </h2>
              {proposals.length === 0 ? (
                <p className="text-sm text-gray-300 text-center py-4">
                  Nenhuma proposta recebida ainda
                </p>
              ) : (
                <div className="space-y-4">
                  {proposals.map(proposal => (
                    <div
                      key={proposal.id}
                      className="border border-white/20 rounded-xl p-4"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          {getProposalStatusIcon(proposal.status)}
                          <span className="text-sm font-medium text-white">
                            {proposal.status_display}
                          </span>
                        </div>
                        <span className="text-xs text-gray-400">
                          {formatDateTime(proposal.created_at)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-300 mb-3">
                        {proposal.message}
                      </p>
                      {proposal.proposed_value && (
                        <div className="text-sm text-gray-300 mb-3">
                          <strong>Valor:</strong> {formatCurrency(proposal.proposed_value)}
                        </div>
                      )}
                      {proposal.valid_until && (
                        <div className="text-sm text-gray-300 mb-3">
                          <strong>Válido até:</strong> {formatDate(proposal.valid_until)}
                        </div>
                      )}
                      {proposal.status === 'sent' && (quote.status === 'pending' || quote.status === 'responded') && (
                        <div className="flex gap-2 mt-3">
                          <button
                            onClick={() => handleAcceptProposal(proposal.id)}
                            className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-1"
                          >
                            <CheckCircle className="w-4 h-4" />
                            Aceitar
                          </button>
                          <button
                            onClick={() => handleDeclineProposal(proposal.id)}
                            className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-1"
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
            </div>
          </div>
        </div>
      </div>
    </FullscreenBackground>
  );
}
