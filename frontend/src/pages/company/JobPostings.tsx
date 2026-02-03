// pages/company/JobPostings.tsx
// Página de publicação e gestão de vagas/oportunidades para empresas
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Briefcase,
  Plus,
  Calendar,
  MapPin,
  DollarSign,
  Users,
  MessageSquare,
  X,
  Send,
} from 'lucide-react';
import { useCompanyAuth } from '../../contexts/CompanyAuthContext';
import CompanyNavbar from '../../components/navigation/CompanyNavbar';
import {
  contactRequestService,
  publicMusicianService,
  type ContactRequest,
  type MusicianPublic,
} from '../../services/publicApi';
import Loading from '../../components/common/Loading';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const COMMON_INSTRUMENTS = [
  'Violão',
  'Guitarra',
  'Baixo',
  'Bateria',
  'Teclado',
  'Piano',
  'Saxofone',
  'Trompete',
  'Violino',
  'Flauta',
  'Canto',
  'DJ',
];

const JobPostings: React.FC = () => {
  const { organization, loading: authLoading } = useCompanyAuth();

  // Estados
  const [jobPostings, setJobPostings] = useState<ContactRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Form state para nova oportunidade
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    eventDate: '',
    eventLocation: '',
    budgetRange: '',
    instruments: [] as string[],
  });
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!authLoading && organization) {
      loadJobPostings();
    }
  }, [authLoading, organization]);

  const loadJobPostings = async () => {
    try {
      setLoading(true);
      const contacts = await contactRequestService.listSent();
      setJobPostings(contacts);
    } catch (error: unknown) {
      console.error('Erro ao carregar vagas:', error);
      toast.error('Erro ao carregar vagas');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const toggleInstrument = (instrument: string) => {
    setFormData(prev => ({
      ...prev,
      instruments: prev.instruments.includes(instrument)
        ? prev.instruments.filter(i => i !== instrument)
        : [...prev.instruments, instrument],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.instruments.length === 0) {
      toast.error('Selecione pelo menos um instrumento');
      return;
    }

    try {
      setSending(true);

      // Buscar músicos que tocam os instrumentos selecionados
      const city = organization?.city || '';
      const state = organization?.state || '';

      if (!city || !state) {
        toast.error('Configure a cidade e estado da sua empresa nas configurações');
        return;
      }

      let allMusicians: MusicianPublic[] = [];

      // Buscar músicos para cada instrumento selecionado
      for (const instrument of formData.instruments) {
        try {
          const musicians = await publicMusicianService.listByCity(city, state, instrument);
          allMusicians = [...allMusicians, ...musicians];
        } catch (error) {
          console.error(`Erro ao buscar músicos de ${instrument}:`, error);
        }
      }

      // Remover duplicatas
      const uniqueMusicians = Array.from(new Map(allMusicians.map(m => [m.id, m])).values());

      if (uniqueMusicians.length === 0) {
        toast.error('Nenhum músico encontrado com os instrumentos selecionados');
        return;
      }

      // Enviar mensagem para cada músico
      let successCount = 0;
      let errorCount = 0;

      for (const musician of uniqueMusicians) {
        try {
          await contactRequestService.create({
            to_musician: musician.id,
            subject: formData.title,
            message: formData.description,
            event_date: formData.eventDate || undefined,
            event_location: formData.eventLocation || undefined,
            budget_range: formData.budgetRange || undefined,
          });
          successCount++;
        } catch (error) {
          console.error(`Erro ao enviar para ${musician.full_name}:`, error);
          errorCount++;
        }
      }

      if (successCount > 0) {
        toast.success(
          `Oportunidade enviada para ${successCount} músico${successCount !== 1 ? 's' : ''}!`
        );
        setShowCreateModal(false);
        setFormData({
          title: '',
          description: '',
          eventDate: '',
          eventLocation: '',
          budgetRange: '',
          instruments: [],
        });
        loadJobPostings(); // Recarregar lista
      }

      if (errorCount > 0) {
        toast.error(`Erro ao enviar para ${errorCount} músico${errorCount !== 1 ? 's' : ''}`);
      }
    } catch (error: unknown) {
      console.error('Erro ao publicar vaga:', error);
      toast.error('Erro ao publicar oportunidade');
    } finally {
      setSending(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-[100svh] bg-gray-50 flex items-center justify-center">
        <Loading text="Carregando..." />
      </div>
    );
  }

  return (
    <div className="min-h-[100svh] bg-gray-50">
      <CompanyNavbar />

      <div className="page-shell max-w-7xl py-6 sm:py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
              Oportunidades
            </h1>
            <p className="text-gray-600">Publique vagas e envie propostas para músicos</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-6 py-2.5 sm:py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors min-h-[44px]"
          >
            <Plus className="h-5 w-5" />
            Nova Oportunidade
          </button>
        </div>

        {/* Lista de Vagas Publicadas */}
        {jobPostings.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <Briefcase className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Nenhuma oportunidade publicada
            </h3>
            <p className="text-gray-600 mb-6">
              Comece a publicar vagas para encontrar músicos talentosos
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-2.5 sm:py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors min-h-[44px]"
            >
              Publicar Primeira Oportunidade
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {jobPostings.map(job => (
              <motion.div
                key={job.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow"
              >
                <div className="p-6">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 mb-1">{job.subject}</h3>
                      <p className="text-sm text-gray-500">
                        Enviada em{' '}
                        {format(new Date(job.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                      </p>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        job.status === 'replied'
                          ? 'bg-green-100 text-green-800'
                          : job.status === 'read'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {job.status_display}
                    </span>
                  </div>

                  {/* Detalhes do Evento */}
                  <div className="space-y-2 mb-4">
                    {job.event_date && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar className="h-4 w-4" />
                        {format(new Date(job.event_date), "dd 'de' MMMM, yyyy", { locale: ptBR })}
                      </div>
                    )}
                    {job.event_location && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <MapPin className="h-4 w-4" />
                        {job.event_location}
                      </div>
                    )}
                    {job.budget_range && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <DollarSign className="h-4 w-4" />
                        {job.budget_range}
                      </div>
                    )}
                  </div>

                  {/* Músico contactado */}
                  <div className="p-3 bg-gray-50 rounded-lg mb-4">
                    <div className="flex items-center gap-2 text-sm">
                      <Users className="h-4 w-4 text-gray-500" />
                      <span className="font-medium text-gray-700">Músico:</span>
                      <span className="text-gray-900">{job.to_musician_name}</span>
                    </div>
                  </div>

                  {/* Mensagem */}
                  <p className="text-sm text-gray-600 line-clamp-3 mb-4">{job.message}</p>

                  {/* Resposta */}
                  {job.reply_message && (
                    <div className="p-3 bg-green-50 border-l-4 border-green-500 rounded">
                      <div className="flex items-start gap-2">
                        <MessageSquare className="h-4 w-4 text-green-600 mt-0.5" />
                        <div>
                          <p className="text-xs font-medium text-green-800 mb-1">
                            Resposta recebida:
                          </p>
                          <p className="text-sm text-green-900 line-clamp-2">{job.reply_message}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de Criar Oportunidade */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
            onClick={() => !sending && setShowCreateModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90svh] overflow-y-auto"
            >
              <div className="p-4 sm:p-6 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">Nova Oportunidade</h2>
                <button
                  onClick={() => !sending && setShowCreateModal(false)}
                  disabled={sending}
                  className="min-h-[44px] min-w-[44px] text-gray-400 hover:text-gray-600 disabled:opacity-50"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-6">
                {/* Título */}
                <div>
                  <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                    Título da Oportunidade *
                  </label>
                  <input
                    type="text"
                    id="title"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    required
                    className="min-h-[44px] w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Ex: Guitarrista para show de rock"
                  />
                </div>

                {/* Descrição */}
                <div>
                  <label
                    htmlFor="description"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Descrição *
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    required
                    rows={5}
                    className="min-h-[120px] w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Descreva os detalhes da oportunidade, tipo de evento, requisitos, etc."
                  />
                </div>

                {/* Data e Local */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="eventDate"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      <Calendar className="inline h-4 w-4 mr-1" />
                      Data do Evento
                    </label>
                    <input
                      type="date"
                      id="eventDate"
                      name="eventDate"
                      value={formData.eventDate}
                      onChange={handleChange}
                      className="min-h-[44px] w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="eventLocation"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      <MapPin className="inline h-4 w-4 mr-1" />
                      Local
                    </label>
                    <input
                      type="text"
                      id="eventLocation"
                      name="eventLocation"
                      value={formData.eventLocation}
                      onChange={handleChange}
                      className="min-h-[44px] w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="Ex: Centro de Convenções"
                    />
                  </div>
                </div>

                {/* Orçamento */}
                <div>
                  <label
                    htmlFor="budgetRange"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    <DollarSign className="inline h-4 w-4 mr-1" />
                    Faixa de Orçamento
                  </label>
                  <input
                    type="text"
                    id="budgetRange"
                    name="budgetRange"
                    value={formData.budgetRange}
                    onChange={handleChange}
                    className="min-h-[44px] w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Ex: R$ 500 - R$ 1000"
                  />
                </div>

                {/* Instrumentos */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Instrumentos Necessários *
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {COMMON_INSTRUMENTS.map(instrument => (
                      <button
                        key={instrument}
                        type="button"
                        onClick={() => toggleInstrument(instrument)}
                        className={`min-h-[44px] px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          formData.instruments.includes(instrument)
                            ? 'bg-indigo-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {instrument}
                      </button>
                    ))}
                  </div>
                  {formData.instruments.length > 0 && (
                    <p className="mt-2 text-sm text-gray-600">
                      {formData.instruments.length} instrumento
                      {formData.instruments.length !== 1 ? 's' : ''} selecionado
                      {formData.instruments.length !== 1 ? 's' : ''}
                    </p>
                  )}
                </div>

                {/* Botões */}
                <div className="flex flex-col sm:flex-row gap-3 justify-end pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    disabled={sending}
                    className="min-h-[44px] px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={sending}
                    className="min-h-[44px] px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {sending ? (
                      <>
                        <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                        Enviando...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        Publicar Oportunidade
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default JobPostings;
