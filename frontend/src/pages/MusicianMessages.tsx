// pages/MusicianMessages.tsx
// Página de pedidos de orçamento recebidos
import { useState, useEffect, useCallback } from 'react';
import {
  Mail,
  MailOpen,
  MessageSquare,
  Send,
  Building2,
  Calendar,
  MapPin,
  Clock,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { quoteRequestService, type QuoteRequest } from '../services/publicApi';
import Layout from '../components/Layout/Layout';

const statusLabels: Record<string, string> = {
  all: 'Todos',
  pending: 'Pendentes',
  responded: 'Respondidos',
  reserved: 'Reservados',
  confirmed: 'Confirmados',
  completed: 'Concluídos',
  cancelled: 'Cancelados',
  declined: 'Recusados',
};

const statusFilters = Object.keys(statusLabels);

export default function MusicianMessages() {
  const [messages, setMessages] = useState<QuoteRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState<QuoteRequest | null>(null);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [filter, setFilter] = useState<string>('all');

  const loadMessages = useCallback(async () => {
    setLoading(true);
    try {
      const status = filter === 'all' ? undefined : filter;
      const data = await quoteRequestService.listReceived(status);
      setMessages(data);
    } catch {
      toast.error('Erro ao carregar mensagens');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  const handleSelectMessage = (message: QuoteRequest) => {
    setSelectedMessage(message);
    setReplyText('');
  };

  const handleReply = async () => {
    if (!selectedMessage || !replyText.trim()) return;

    setSending(true);
    try {
      await quoteRequestService.sendProposal(selectedMessage.id, { message: replyText });
      const refreshed = await quoteRequestService.get(selectedMessage.id);
      setMessages(prev => prev.map(m => (m.id === refreshed.id ? refreshed : m)));
      setSelectedMessage(refreshed);
      setReplyText('');
      toast.success('Proposta enviada!');
    } catch {
      toast.error('Erro ao enviar proposta');
    } finally {
      setSending(false);
    }
  };

  const unreadCount = messages.filter(m => m.status === 'pending').length;

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

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Layout>
      <div className="page-stack">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <MessageSquare className="w-6 h-6 sm:w-7 sm:h-7 text-indigo-600" />
              Pedidos de Orçamento
              {unreadCount > 0 && (
                <span className="ml-1 px-2.5 py-0.5 text-sm bg-red-500 text-white rounded-full">
                  {unreadCount} nova{unreadCount > 1 ? 's' : ''}
                </span>
              )}
            </h1>
            <p className="text-subtle mt-1">
              Solicitações de orçamento feitas por contratantes
            </p>
          </div>
        </div>

        {/* Filtros responsivos */}
        <div className="flex flex-wrap gap-1.5 sm:gap-2">
          {statusFilters.map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-xs sm:text-sm rounded-lg transition-colors min-h-[36px] sm:min-h-[44px] touch-manipulation ${
                filter === f
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 border border-gray-200 dark:border-slate-700'
              }`}
            >
              {statusLabels[f]}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Lista de Mensagens */}
          <div className="lg:col-span-1 card !p-0 overflow-hidden">
            {loading ? (
              <div className="p-8 text-center">
                <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
              </div>
            ) : messages.length === 0 ? (
              <div className="p-8 text-center text-muted">
                <Mail className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Nenhum pedido encontrado</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-slate-700 max-h-[600px] overflow-y-auto">
                {messages.map(message => (
                  <button
                    key={message.id}
                    onClick={() => handleSelectMessage(message)}
                    className={`w-full p-3 sm:p-4 text-left hover:bg-gray-50 dark:hover:bg-slate-800/60 transition-colors min-h-[44px] ${
                      selectedMessage?.id === message.id ? 'bg-indigo-50 dark:bg-indigo-900/20' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`p-2 rounded-lg flex-shrink-0 ${message.status === 'pending' ? 'bg-yellow-100 dark:bg-yellow-900' : 'bg-gray-100 dark:bg-slate-700'}`}
                      >
                        {message.status === 'pending' ? (
                          <Mail className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                        ) : (
                          <MailOpen className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="font-medium text-gray-900 dark:text-white truncate">
                            {message.contractor_name}
                          </span>
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${getStatusColor(message.status)}`}
                          >
                            {message.status_display}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
                          {message.event_type}
                        </p>
                        <p className="text-xs text-subtle mt-1 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDate(message.created_at)}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Detalhe da Mensagem */}
          <div className="lg:col-span-2 card !p-0">
            {selectedMessage ? (
              <div className="h-full flex flex-col">
                {/* Header */}
                <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-slate-700">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-indigo-100 dark:bg-indigo-900 rounded-full flex items-center justify-center flex-shrink-0">
                        <Building2 className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-600 dark:text-indigo-400" />
                      </div>
                      <div className="min-w-0">
                        <h2 className="font-semibold text-gray-900 dark:text-white truncate">
                          {selectedMessage.contractor_name}
                        </h2>
                        <p className="text-sm text-subtle">Contratante</p>
                      </div>
                    </div>
                  </div>

                  <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-2">
                    {selectedMessage.event_type}
                  </h3>

                  {/* Info do Evento */}
                  <div className="flex flex-wrap gap-3 sm:gap-4 text-sm text-muted">
                    {selectedMessage.event_date && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {new Date(selectedMessage.event_date).toLocaleDateString('pt-BR')}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      {selectedMessage.location_city} - {selectedMessage.location_state}
                    </span>
                    {selectedMessage.venue_name && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {selectedMessage.venue_name}
                      </span>
                    )}
                  </div>
                </div>

                {/* Mensagem */}
                <div className="flex-1 p-4 sm:p-6 overflow-y-auto">
                  <p className="whitespace-pre-wrap text-gray-700 dark:text-gray-300">
                    {selectedMessage.notes || 'Sem observações adicionais.'}
                  </p>
                </div>

                {/* Área de Resposta */}
                {selectedMessage.status === 'pending' && (
                  <div className="p-4 sm:p-6 border-t border-gray-200 dark:border-slate-700">
                    <textarea
                      value={replyText}
                      onChange={e => setReplyText(e.target.value)}
                      placeholder="Escreva sua proposta..."
                      rows={3}
                      className="input-field resize-none"
                    />
                    <div className="flex justify-end mt-3">
                      <button
                        onClick={handleReply}
                        disabled={!replyText.trim() || sending}
                        className="btn-primary flex items-center gap-2"
                      >
                        {sending ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                        Enviar Proposta
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full flex items-center justify-center p-8 text-muted min-h-[300px]">
                <div className="text-center">
                  <MessageSquare className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 opacity-50" />
                  <p>Selecione um pedido para visualizar</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
