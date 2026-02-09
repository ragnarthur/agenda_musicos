import React, { useState } from 'react';
import {
  Search,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Mail,
  Calendar,
  Music,
} from 'lucide-react';
import { api } from '../services/api';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatCurrency } from '../utils/formatting';
import { usePageMeta } from '../hooks/usePageMeta';

interface RequestStatus {
  id: number;
  artist_name: string;
  artist_email: string;
  artist_phone: string;
  event_type: string;
  event_date: string;
  event_time: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  created_at: string;
  updated_at: string;
  notes?: string;
  rejection_reason?: string;
  estimated_budget?: number;
}

const STATUS_CONFIG: Record<string, { label: string; message: string; classes: string }> = {
  pending: {
    label: 'Pendente',
    message: 'Sua solicitação está sendo analisada pela nossa equipe. Retornaremos em breve!',
    classes: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  },
  approved: {
    label: 'Aprovada',
    message: 'Parabéns! Sua solicitação foi aprovada. Verifique seu e-mail para os próximos passos.',
    classes: 'bg-green-100 text-green-800 border-green-200',
  },
  rejected: {
    label: 'Recusada',
    message: 'Infelizmente, sua solicitação não pôde ser aprovada neste momento.',
    classes: 'bg-red-100 text-red-800 border-red-200',
  },
  cancelled: {
    label: 'Cancelada',
    message: 'Esta solicitação foi cancelada.',
    classes: 'bg-gray-100 text-gray-800 border-gray-200',
  },
};

const StatusPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [requestId, setRequestId] = useState('');
  const [searchType, setSearchType] = useState<'email' | 'id'>('email');
  const [loading, setLoading] = useState(false);
  const [requestStatus, setRequestStatus] = useState<RequestStatus | null>(null);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);

  usePageMeta({
    title: 'Acompanhar Solicitação - GigFlow',
    description: 'Consulte o status da sua solicitação de cadastro no GigFlow.',
  });

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setRequestStatus(null);

    try {
      const params: Record<string, string> = {};
      if (searchType === 'email') {
        params.email = email;
      } else {
        params.request_id = requestId;
      }

      const { data } = await api.get('/public/request-status/', { params });

      if (Array.isArray(data) && data.length > 0) {
        setRequestStatus(data[0]);
      } else if (!Array.isArray(data) && data.id) {
        setRequestStatus(data);
      } else {
        setError('Nenhuma solicitação encontrada');
      }
    } catch {
      setError('Erro de conexão. Tente novamente.');
    } finally {
      setLoading(false);
      setSearched(true);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-8 h-8 text-yellow-500" />;
      case 'approved':
        return <CheckCircle className="w-8 h-8 text-green-500" />;
      case 'rejected':
        return <XCircle className="w-8 h-8 text-red-500" />;
      default:
        return <AlertCircle className="w-8 h-8 text-gray-500" />;
    }
  };

  const config = (status: string) => STATUS_CONFIG[status] || STATUS_CONFIG.cancelled;

  const formatDate = (dateString: string) => {
    try {
      return format(parseISO(dateString), "dd 'de' MMMM 'de' yyyy, HH:mm", { locale: ptBR });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="min-h-[100svh] bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800">
      {/* Header */}
      <div className="bg-white/95 dark:bg-slate-900/95 shadow border-b border-gray-200 dark:border-white/10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Acompanhar Solicitação</h1>
            <p className="mt-2 text-gray-600 dark:text-slate-400">Consulte o status da sua solicitação de cadastro</p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Search Form */}
        <div className="card mb-8">
          <form onSubmit={handleSearch} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                Como deseja buscar?
              </label>
              <div className="flex flex-col gap-2 sm:flex-row sm:gap-4">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="searchType"
                    value="email"
                    checked={searchType === 'email'}
                    onChange={e => setSearchType(e.target.value as 'email' | 'id')}
                    className="mr-2 accent-primary-600"
                  />
                  <span className="text-gray-700 dark:text-slate-300">Buscar por e-mail</span>
                </label>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="searchType"
                    value="id"
                    checked={searchType === 'id'}
                    onChange={e => setSearchType(e.target.value as 'email' | 'id')}
                    className="mr-2 accent-primary-600"
                  />
                  <span className="text-gray-700 dark:text-slate-300">Buscar por ID da solicitação</span>
                </label>
              </div>
            </div>

            {searchType === 'email' ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  Endereço de e-mail
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="Digite seu e-mail"
                    className="input-field pl-10"
                    required
                  />
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  ID da Solicitação
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    value={requestId}
                    onChange={e => setRequestId(e.target.value)}
                    placeholder="Digite o ID da solicitação"
                    className="input-field pl-10"
                    required
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full"
            >
              {loading ? 'Buscando...' : 'Consultar Status'}
            </button>
          </form>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-8">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-red-500 mr-2 flex-shrink-0" />
              <p className="text-red-800 dark:text-red-300">{error}</p>
            </div>
          </div>
        )}

        {/* Request Status Result */}
        {requestStatus && (
          <div className="card overflow-hidden p-0">
            {/* Status Header */}
            <div className="bg-gradient-to-r from-primary-500 to-primary-700 px-6 py-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h2 className="text-xl font-bold text-white">Detalhes da Solicitação</h2>
                <span
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border ${config(requestStatus.status).classes}`}
                >
                  {getStatusIcon(requestStatus.status)}
                  {config(requestStatus.status).label}
                </span>
              </div>
            </div>

            {/* Status Message */}
            <div className="px-6 py-4 bg-gray-50 dark:bg-slate-800/50 border-b border-gray-200 dark:border-white/10">
              <p className="text-gray-700 dark:text-slate-300">{config(requestStatus.status).message}</p>
            </div>

            {/* Request Information */}
            <div className="px-6 py-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                    <Music className="h-5 w-5 mr-2 text-primary-600" />
                    Informações do Artista
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-500 dark:text-slate-400">Nome</label>
                      <p className="text-gray-900 dark:text-white">{requestStatus.artist_name}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500 dark:text-slate-400">E-mail</label>
                      <p className="text-gray-900 dark:text-white">{requestStatus.artist_email}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500 dark:text-slate-400">Telefone</label>
                      <p className="text-gray-900 dark:text-white">{requestStatus.artist_phone}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                    <Calendar className="h-5 w-5 mr-2 text-primary-600" />
                    Informações do Evento
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-500 dark:text-slate-400">Tipo de Evento</label>
                      <p className="text-gray-900 dark:text-white">{requestStatus.event_type}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500 dark:text-slate-400">Data</label>
                      <p className="text-gray-900 dark:text-white">{requestStatus.event_date}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500 dark:text-slate-400">Horário</label>
                      <p className="text-gray-900 dark:text-white">{requestStatus.event_time}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Additional Info */}
              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-white/10 space-y-4">
                {requestStatus.notes && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500 dark:text-slate-400">Observações</label>
                    <p className="text-gray-900 dark:text-white bg-gray-50 dark:bg-slate-800 p-3 rounded-lg mt-1">
                      {requestStatus.notes}
                    </p>
                  </div>
                )}

                {requestStatus.rejection_reason && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500 dark:text-slate-400">
                      Motivo da Recusa
                    </label>
                    <p className="text-red-800 dark:text-red-300 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-200 dark:border-red-800 mt-1">
                      {requestStatus.rejection_reason}
                    </p>
                  </div>
                )}

                {requestStatus.estimated_budget && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500 dark:text-slate-400">
                      Orçamento Estimado
                    </label>
                    <p className="text-gray-900 dark:text-white">{formatCurrency(requestStatus.estimated_budget)}</p>
                  </div>
                )}
              </div>

              {/* Timestamps */}
              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-white/10 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-500 dark:text-slate-400">
                <div>
                  <label className="block font-medium">Enviado em</label>
                  <p>{formatDate(requestStatus.created_at)}</p>
                </div>
                <div>
                  <label className="block font-medium">Última atualização</label>
                  <p>{formatDate(requestStatus.updated_at)}</p>
                </div>
              </div>
            </div>

            {/* Request ID Footer */}
            <div className="px-6 py-4 bg-gray-50 dark:bg-slate-800/50 border-t border-gray-200 dark:border-white/10">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500 dark:text-slate-400">ID da Solicitação</span>
                <span className="font-mono text-sm bg-gray-200 dark:bg-slate-700 text-gray-800 dark:text-slate-200 px-2 py-1 rounded">
                  #{requestStatus.id}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* No Results */}
        {searched && !error && !requestStatus && (
          <div className="card text-center py-8">
            <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Nenhuma solicitação encontrada</h3>
            <p className="text-gray-600 dark:text-slate-400">
              Não encontramos solicitações com os dados informados. Verifique as informações e tente novamente.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default StatusPage;
