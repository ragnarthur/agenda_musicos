// pages/MusicianQuoteDetail.tsx
// Detalhes do pedido de orçamento para músico
import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Clock,
  MessageSquare,
  Send,
  DollarSign,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { quoteRequestService, type QuoteRequest, type QuoteProposal } from '../services/publicApi';
import Layout from '../components/Layout/Layout';

export default function MusicianQuoteDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [quote, setQuote] = useState<QuoteRequest | null>(null);
  const [proposals, setProposals] = useState<QuoteProposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  // Formulário de proposta
  const [proposalMessage, setProposalMessage] = useState('');
  const [proposalValue, setProposalValue] = useState('');
  const [proposalValidUntil, setProposalValidUntil] = useState('');

  const loadQuoteAndProposals = useCallback(async () => {
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
  }, [id]);

  useEffect(() => {
    loadQuoteAndProposals();
  }, [loadQuoteAndProposals]);

  const handleSendProposal = async () => {
    if (!quote || !proposalMessage.trim()) return;

    setSending(true);
    try {
      const payload: {
        message: string;
        proposed_value?: string;
        valid_until?: string;
      } = { message: proposalMessage };
      if (proposalValue) payload.proposed_value = proposalValue;
      if (proposalValidUntil) payload.valid_until = proposalValidUntil;

      await quoteRequestService.sendProposal(Number(id), payload);

      // Recarregar propostas
      const newProposals = await quoteRequestService.listProposals(Number(id));
      setProposals(newProposals);

      // Recarregar status do pedido
      const updatedQuote = await quoteRequestService.get(Number(id));
      setQuote(updatedQuote);

      // Limpar formulário
      setProposalMessage('');
      setProposalValue('');
      setProposalValidUntil('');

      toast.success('Proposta enviada com sucesso!');
    } catch (error) {
      toast.error('Erro ao enviar proposta');
      console.error(error);
    } finally {
      setSending(false);
    }
  };

  const handleConfirmBooking = async () => {
    if (!quote) return;

    if (!confirm('Tem certeza que deseja confirmar esta reserva?')) return;

    try {
      await quoteRequestService.confirmBooking(Number(id));

      // Recarregar status
      const updatedQuote = await quoteRequestService.get(Number(id));
      setQuote(updatedQuote);

      toast.success('Reserva confirmada com sucesso!');
    } catch (error) {
      toast.error('Erro ao confirmar reserva');
      console.error(error);
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
      <Layout>
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </Layout>
    );
  }

  if (!quote) {
    return (
      <Layout>
        <div className="page-stack">
          <button
            onClick={() => navigate('/musicos/pedidos')}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white min-h-[44px]"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar para pedidos
          </button>
          <div className="text-center py-12">
            <p className="text-muted">Pedido não encontrado</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="page-stack">
        <button
          onClick={() => navigate('/musicos/pedidos')}
          className="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white min-h-[44px]"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar para pedidos
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Coluna da esquerda - Detalhes do pedido */}
          <div className="lg:col-span-2 space-y-6">
            {/* Header do pedido */}
            <div className="card">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {quote.event_type}
                  </h1>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Solicitação de {quote.contractor_name}
                  </p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(quote.status)}`}
                >
                  {quote.status_display}
                </span>
              </div>

              <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
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
                <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
                  <strong>Duração:</strong> {quote.duration_hours} horas
                </div>
              )}
            </div>

            {/* Detalhes do evento */}
            {quote.notes && (
              <div className="card">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                  Sobre o evento
                </h2>
                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {quote.notes}
                </p>
              </div>
            )}

            {/* Botão para confirmar reserva */}
            {quote.status === 'reserved' && (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-base sm:text-lg font-semibold text-green-900 dark:text-green-100">
                      Proposta aceita! Confirme sua reserva
                    </h3>
                    <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                      Clique abaixo para confirmar que vai realizar este evento.
                    </p>
                  </div>
                  <button
                    onClick={handleConfirmBooking}
                    className="btn-primary !bg-green-600 hover:!bg-green-700 flex items-center justify-center gap-2 w-full sm:w-auto"
                  >
                    <CheckCircle className="w-5 h-5" />
                    Confirmar Reserva
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Coluna da direita - Enviar proposta e histórico */}
          <div className="space-y-6">
            {/* Formulário para enviar proposta */}
            {(quote.status === 'pending' || quote.status === 'responded') && (
              <div className="card">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Enviar proposta
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Mensagem *
                    </label>
                    <textarea
                      value={proposalMessage}
                      onChange={e => setProposalMessage(e.target.value)}
                      placeholder="Descreva sua proposta para este evento..."
                      rows={3}
                      className="input-field resize-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Valor proposto (opcional)
                    </label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="number"
                        value={proposalValue}
                        onChange={e => setProposalValue(e.target.value)}
                        placeholder="0,00"
                        className="input-field pl-10"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Validade (opcional)
                    </label>
                    <input
                      type="date"
                      value={proposalValidUntil}
                      onChange={e => setProposalValidUntil(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      className="input-field"
                    />
                  </div>
                  <button
                    onClick={handleSendProposal}
                    disabled={!proposalMessage.trim() || sending}
                    className="btn-primary w-full flex items-center justify-center gap-2"
                  >
                    {sending ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Enviar Proposta
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Histórico de propostas */}
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Histórico de propostas
              </h2>
              {proposals.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                  Nenhuma proposta enviada ainda
                </p>
              ) : (
                <div className="space-y-4">
                  {proposals.map(proposal => (
                    <div
                      key={proposal.id}
                      className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {getProposalStatusIcon(proposal.status)}
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {proposal.status_display}
                          </span>
                        </div>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {formatDateTime(proposal.created_at)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                        {proposal.message}
                      </p>
                      {proposal.proposed_value && (
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          <strong>Valor:</strong> {formatCurrency(proposal.proposed_value)}
                        </div>
                      )}
                      {proposal.valid_until && (
                        <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          <strong>Válido até:</strong> {formatDate(proposal.valid_until)}
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
    </Layout>
  );
}
