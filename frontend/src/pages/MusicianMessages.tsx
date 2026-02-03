// pages/MusicianMessages.tsx
// Página de mensagens recebidas de empresas
import { useState, useEffect, useCallback } from 'react';
import {
  Mail,
  MailOpen,
  MessageSquare,
  Archive,
  Send,
  Building2,
  Calendar,
  MapPin,
  DollarSign,
  Clock,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { contactRequestService, type ContactRequest } from '../services/publicApi';
import Navbar from '../components/Layout/Navbar';

export default function MusicianMessages() {
  const [messages, setMessages] = useState<ContactRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState<ContactRequest | null>(null);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [filter, setFilter] = useState<string>('all');

  const loadMessages = useCallback(async () => {
    setLoading(true);
    try {
      const status = filter === 'all' ? undefined : filter;
      const data = await contactRequestService.listReceived(status);
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

  const handleSelectMessage = async (message: ContactRequest) => {
    setSelectedMessage(message);
    setReplyText('');

    // Marca como lido ao abrir
    if (message.status === 'pending') {
      try {
        const updated = await contactRequestService.get(message.id);
        setMessages(prev => prev.map(m => (m.id === updated.id ? updated : m)));
        setSelectedMessage(updated);
      } catch {
        // Ignora erro silenciosamente
      }
    }
  };

  const handleReply = async () => {
    if (!selectedMessage || !replyText.trim()) return;

    setSending(true);
    try {
      const updated = await contactRequestService.reply(selectedMessage.id, replyText);
      setMessages(prev => prev.map(m => (m.id === updated.id ? updated : m)));
      setSelectedMessage(updated);
      setReplyText('');
      toast.success('Resposta enviada!');
    } catch {
      toast.error('Erro ao enviar resposta');
    } finally {
      setSending(false);
    }
  };

  const handleArchive = async (message: ContactRequest) => {
    try {
      await contactRequestService.archive(message.id);
      setMessages(prev => prev.filter(m => m.id !== message.id));
      if (selectedMessage?.id === message.id) {
        setSelectedMessage(null);
      }
      toast.success('Mensagem arquivada');
    } catch {
      toast.error('Erro ao arquivar');
    }
  };

  const unreadCount = messages.filter(m => m.status === 'pending').length;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'read':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'replied':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
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
    <div className="min-h-[100svh] bg-gray-50 dark:bg-gray-900">
      <Navbar />

      <div className="page-shell max-w-7xl py-6 sm:py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <MessageSquare className="w-7 h-7 text-indigo-600" />
              Mensagens de Empresas
              {unreadCount > 0 && (
                <span className="ml-2 px-2.5 py-0.5 text-sm bg-red-500 text-white rounded-full">
                  {unreadCount} nova{unreadCount > 1 ? 's' : ''}
                </span>
              )}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Solicitações de contato e orçamentos de empresas
            </p>
          </div>

          <div className="flex gap-2">
            {['all', 'pending', 'read', 'replied'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                  filter === f
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                {f === 'all'
                  ? 'Todas'
                  : f === 'pending'
                    ? 'Pendentes'
                    : f === 'read'
                      ? 'Lidas'
                      : 'Respondidas'}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Lista de Mensagens */}
          <div className="lg:col-span-1 bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
            {loading ? (
              <div className="p-8 text-center">
                <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
              </div>
            ) : messages.length === 0 ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                <Mail className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Nenhuma mensagem encontrada</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-gray-700 max-h-[600px] overflow-y-auto">
                {messages.map(message => (
                  <button
                    key={message.id}
                    onClick={() => handleSelectMessage(message)}
                    className={`w-full p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                      selectedMessage?.id === message.id ? 'bg-indigo-50 dark:bg-indigo-900/20' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`p-2 rounded-lg ${message.status === 'pending' ? 'bg-yellow-100 dark:bg-yellow-900' : 'bg-gray-100 dark:bg-gray-700'}`}
                      >
                        {message.status === 'pending' ? (
                          <Mail className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                        ) : (
                          <MailOpen className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-gray-900 dark:text-white truncate">
                            {message.from_organization_name}
                          </span>
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(message.status)}`}
                          >
                            {message.status_display}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
                          {message.subject}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1">
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
          <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl shadow-sm">
            {selectedMessage ? (
              <div className="h-full flex flex-col">
                {/* Header */}
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900 rounded-full flex items-center justify-center">
                        <Building2 className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                      </div>
                      <div>
                        <h2 className="font-semibold text-gray-900 dark:text-white">
                          {selectedMessage.from_organization_name}
                        </h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {selectedMessage.from_user_name}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleArchive(selectedMessage)}
                      className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                      title="Arquivar"
                    >
                      <Archive className="w-5 h-5" />
                    </button>
                  </div>

                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                    {selectedMessage.subject}
                  </h3>

                  {/* Info do Evento */}
                  <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
                    {selectedMessage.event_date && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {new Date(selectedMessage.event_date).toLocaleDateString('pt-BR')}
                      </span>
                    )}
                    {selectedMessage.event_location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {selectedMessage.event_location}
                      </span>
                    )}
                    {selectedMessage.budget_range && (
                      <span className="flex items-center gap-1">
                        <DollarSign className="w-4 h-4" />
                        {selectedMessage.budget_range}
                      </span>
                    )}
                  </div>
                </div>

                {/* Mensagem */}
                <div className="flex-1 p-6 overflow-y-auto">
                  <div className="prose dark:prose-invert max-w-none">
                    <p className="whitespace-pre-wrap text-gray-700 dark:text-gray-300">
                      {selectedMessage.message}
                    </p>
                  </div>

                  {/* Resposta */}
                  {selectedMessage.reply_message && (
                    <div className="mt-6 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                      <div className="flex items-center gap-2 mb-2 text-sm text-green-700 dark:text-green-400">
                        <Send className="w-4 h-4" />
                        <span className="font-medium">Sua resposta</span>
                        <span className="text-green-600 dark:text-green-500">
                          - {selectedMessage.replied_at && formatDate(selectedMessage.replied_at)}
                        </span>
                      </div>
                      <p className="whitespace-pre-wrap text-gray-700 dark:text-gray-300">
                        {selectedMessage.reply_message}
                      </p>
                    </div>
                  )}
                </div>

                {/* Área de Resposta */}
                {selectedMessage.status !== 'replied' && selectedMessage.status !== 'archived' && (
                  <div className="p-6 border-t border-gray-200 dark:border-gray-700">
                    <textarea
                      value={replyText}
                      onChange={e => setReplyText(e.target.value)}
                      placeholder="Escreva sua resposta..."
                      rows={3}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white resize-none"
                    />
                    <div className="flex justify-end mt-3">
                      <button
                        onClick={handleReply}
                        disabled={!replyText.trim() || sending}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
                      >
                        {sending ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                        Enviar Resposta
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full flex items-center justify-center p-8 text-gray-500 dark:text-gray-400">
                <div className="text-center">
                  <MessageSquare className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p>Selecione uma mensagem para visualizar</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
