// pages/company/Contacts.tsx
// Página de gestão de contatos e mensagens para empresas
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  MessageSquare,
  Calendar,
  MapPin,
  DollarSign,
  Clock,
  Archive,
  CheckCheck,
  ChevronLeft,
  Inbox,
  Mail,
  MailCheck,
  ArchiveX,
} from 'lucide-react';
import { useCompanyAuth } from '../../contexts/CompanyAuthContext';
import CompanyNavbar from '../../components/navigation/CompanyNavbar';
import { contactRequestService, type ContactRequest } from '../../services/publicApi';
import Loading from '../../components/common/Loading';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type FilterType = 'all' | 'pending' | 'replied' | 'archived';

const STATUS_CONFIG = {
  pending: {
    label: 'Pendente',
    icon: Mail,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
  },
  read: {
    label: 'Lida',
    icon: MailCheck,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
  },
  replied: {
    label: 'Respondida',
    icon: CheckCheck,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
  },
  archived: {
    label: 'Arquivada',
    icon: ArchiveX,
    color: 'text-gray-600',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200',
  },
};

const Contacts: React.FC = () => {
  const { organization, loading: authLoading } = useCompanyAuth();

  // Estados
  const [contacts, setContacts] = useState<ContactRequest[]>([]);
  const [selectedContact, setSelectedContact] = useState<ContactRequest | null>(null);
  const [filter, setFilter] = useState<FilterType>('all');
  const [loading, setLoading] = useState(true);
  const [showMobileDetail, setShowMobileDetail] = useState(false);

  useEffect(() => {
    if (!authLoading && organization) {
      loadContacts();
    }
  }, [authLoading, organization]);

  const loadContacts = async () => {
    try {
      setLoading(true);
      const data = await contactRequestService.listSent();
      setContacts(data);
    } catch (error: unknown) {
      console.error('Erro ao carregar contatos:', error);
      toast.error('Erro ao carregar contatos');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectContact = async (contact: ContactRequest) => {
    setSelectedContact(contact);
    setShowMobileDetail(true);

    // Marcar como lida se estiver pendente
    if (contact.status === 'pending') {
      try {
        // Atualizar localmente
        setContacts(prev => prev.map(c => (c.id === contact.id ? { ...c, status: 'read' } : c)));
      } catch (error) {
        console.error('Erro ao marcar como lida:', error);
      }
    }
  };

  const handleBack = () => {
    setShowMobileDetail(false);
    setSelectedContact(null);
  };

  const filteredContacts = contacts.filter(contact => {
    if (filter === 'all') return true;
    return contact.status === filter;
  });

  const statusCounts = {
    all: contacts.length,
    pending: contacts.filter(c => c.status === 'pending').length,
    replied: contacts.filter(c => c.status === 'replied').length,
    archived: contacts.filter(c => c.status === 'archived').length,
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loading text="Carregando contatos..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <CompanyNavbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Mensagens</h1>
          <p className="text-gray-600">Gerencie suas conversas com músicos</p>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'all'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Inbox className="inline h-4 w-4 mr-2" />
              Todas ({statusCounts.all})
            </button>
            <button
              onClick={() => setFilter('pending')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'pending'
                  ? 'bg-yellow-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Mail className="inline h-4 w-4 mr-2" />
              Pendente ({statusCounts.pending})
            </button>
            <button
              onClick={() => setFilter('replied')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'replied'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <CheckCheck className="inline h-4 w-4 mr-2" />
              Respondidas ({statusCounts.replied})
            </button>
            <button
              onClick={() => setFilter('archived')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'archived'
                  ? 'bg-gray-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Archive className="inline h-4 w-4 mr-2" />
              Arquivadas ({statusCounts.archived})
            </button>
          </div>
        </div>

        {/* Layout Desktop: Split View | Mobile: Stack View */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Lista de Conversas */}
          <div className={`lg:col-span-1 ${showMobileDetail ? 'hidden lg:block' : 'block'}`}>
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="p-4 border-b border-gray-200">
                <h2 className="font-semibold text-gray-900">Conversas</h2>
              </div>

              {filteredContacts.length === 0 ? (
                <div className="p-8 text-center">
                  <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-600">
                    Nenhuma mensagem{' '}
                    {filter !== 'all' && `${STATUS_CONFIG[filter].label.toLowerCase()}`}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200 max-h-[calc(100vh-24rem)] overflow-y-auto">
                  {filteredContacts.map(contact => {
                    const StatusIcon =
                      STATUS_CONFIG[contact.status as keyof typeof STATUS_CONFIG]?.icon || Mail;
                    const isSelected = selectedContact?.id === contact.id;

                    return (
                      <button
                        key={contact.id}
                        onClick={() => handleSelectContact(contact)}
                        className={`w-full p-4 text-left hover:bg-gray-50 transition-colors ${
                          isSelected ? 'bg-indigo-50 border-l-4 border-indigo-600' : ''
                        } ${contact.status === 'pending' ? 'bg-yellow-50/30' : ''}`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="mt-1">
                            <StatusIcon
                              className={`h-5 w-5 ${STATUS_CONFIG[contact.status as keyof typeof STATUS_CONFIG]?.color || 'text-gray-400'}`}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <p className="font-semibold text-gray-900 truncate">
                                {contact.to_musician_name}
                              </p>
                              <span className="text-xs text-gray-500 whitespace-nowrap">
                                {format(new Date(contact.created_at), 'dd/MM', { locale: ptBR })}
                              </span>
                            </div>
                            <p className="text-sm font-medium text-indigo-600 truncate mb-1">
                              {contact.subject}
                            </p>
                            <p className="text-sm text-gray-600 line-clamp-2">{contact.message}</p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Detalhes da Conversa */}
          <div className={`lg:col-span-2 ${showMobileDetail ? 'block' : 'hidden lg:block'}`}>
            {selectedContact ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-lg shadow-sm overflow-hidden"
              >
                {/* Header do detalhe */}
                <div className="p-6 border-b border-gray-200">
                  <button
                    onClick={handleBack}
                    className="lg:hidden flex items-center gap-2 text-indigo-600 mb-4"
                  >
                    <ChevronLeft className="h-5 w-5" />
                    Voltar
                  </button>

                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 mb-2">
                        {selectedContact.to_musician_name}
                      </h2>
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${
                            STATUS_CONFIG[selectedContact.status as keyof typeof STATUS_CONFIG]
                              ?.bgColor || 'bg-gray-50'
                          } ${
                            STATUS_CONFIG[selectedContact.status as keyof typeof STATUS_CONFIG]
                              ?.color || 'text-gray-600'
                          }`}
                        >
                          {React.createElement(
                            STATUS_CONFIG[selectedContact.status as keyof typeof STATUS_CONFIG]
                              ?.icon || Mail,
                            { className: 'h-4 w-4' }
                          )}
                          {STATUS_CONFIG[selectedContact.status as keyof typeof STATUS_CONFIG]
                            ?.label || selectedContact.status}
                        </span>
                        <span className="text-sm text-gray-500">
                          Enviada em{' '}
                          {format(new Date(selectedContact.created_at), "dd 'de' MMMM 'às' HH:mm", {
                            locale: ptBR,
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Conteúdo */}
                <div className="p-6 space-y-6">
                  {/* Assunto */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {selectedContact.subject}
                    </h3>
                  </div>

                  {/* Detalhes do evento */}
                  {(selectedContact.event_date ||
                    selectedContact.event_location ||
                    selectedContact.budget_range) && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                      {selectedContact.event_date && (
                        <div className="flex items-start gap-2">
                          <Calendar className="h-5 w-5 text-gray-400 mt-0.5" />
                          <div>
                            <p className="text-xs text-gray-500">Data do Evento</p>
                            <p className="text-sm font-medium text-gray-900">
                              {format(new Date(selectedContact.event_date), "dd 'de' MMMM, yyyy", {
                                locale: ptBR,
                              })}
                            </p>
                          </div>
                        </div>
                      )}
                      {selectedContact.event_location && (
                        <div className="flex items-start gap-2">
                          <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
                          <div>
                            <p className="text-xs text-gray-500">Local</p>
                            <p className="text-sm font-medium text-gray-900">
                              {selectedContact.event_location}
                            </p>
                          </div>
                        </div>
                      )}
                      {selectedContact.budget_range && (
                        <div className="flex items-start gap-2">
                          <DollarSign className="h-5 w-5 text-gray-400 mt-0.5" />
                          <div>
                            <p className="text-xs text-gray-500">Orçamento</p>
                            <p className="text-sm font-medium text-gray-900">
                              {selectedContact.budget_range}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Mensagem enviada */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Sua mensagem:</h4>
                    <div className="bg-indigo-50 border-l-4 border-indigo-600 p-4 rounded">
                      <p className="text-gray-800 whitespace-pre-wrap">{selectedContact.message}</p>
                    </div>
                  </div>

                  {/* Resposta do músico */}
                  {selectedContact.reply_message && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 mb-2">
                        Resposta do músico:
                      </h4>
                      <div className="bg-green-50 border-l-4 border-green-600 p-4 rounded">
                        <p className="text-gray-800 whitespace-pre-wrap">
                          {selectedContact.reply_message}
                        </p>
                        {selectedContact.replied_at && (
                          <p className="text-xs text-gray-500 mt-2">
                            Respondida em{' '}
                            {format(
                              new Date(selectedContact.replied_at),
                              "dd 'de' MMMM 'às' HH:mm",
                              { locale: ptBR }
                            )}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {!selectedContact.reply_message && selectedContact.status !== 'archived' && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <div className="flex items-start gap-2">
                        <Clock className="h-5 w-5 text-yellow-600 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-yellow-800">Aguardando resposta</p>
                          <p className="text-sm text-yellow-700 mt-1">
                            O músico ainda não respondeu sua mensagem.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                <MessageSquare className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Selecione uma conversa</h3>
                <p className="text-gray-600">Escolha uma mensagem da lista para ver os detalhes</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Contacts;
