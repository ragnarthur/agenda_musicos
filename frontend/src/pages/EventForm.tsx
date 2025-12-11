// pages/EventForm.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Calendar, MapPin, Clock, Phone, FileText, Save, X, CheckCircle, Info } from 'lucide-react';
import Layout from '../components/Layout/Layout';
import { eventService, leaderAvailabilityService } from '../services/api';
import type { EventCreate, LeaderAvailability } from '../types';
import { format, parseISO } from 'date-fns';

const EventForm: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const prefilledData = location.state as { date?: string; start_time?: string; end_time?: string } | null;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [leaderAvailabilities, setLeaderAvailabilities] = useState<LeaderAvailability[]>([]);
  const [matchingAvailability, setMatchingAvailability] = useState<LeaderAvailability | null>(null);

  const [formData, setFormData] = useState<EventCreate>({
    title: '',
    description: '',
    location: '',
    venue_contact: '',
    event_date: prefilledData?.date || '',
    start_time: prefilledData?.start_time || '',
    end_time: prefilledData?.end_time || '',
    is_solo: false,
  });

  // Carregar disponibilidades do líder ao montar o componente
  useEffect(() => {
    loadLeaderAvailabilities();
  }, []);

  // Verificar se a data escolhida coincide com uma disponibilidade do líder
  useEffect(() => {
    if (formData.event_date) {
      const matching = leaderAvailabilities.find(
        avail => avail.date === formData.event_date
      );
      setMatchingAvailability(matching || null);
    } else {
      setMatchingAvailability(null);
    }
  }, [formData.event_date, leaderAvailabilities]);

  const loadLeaderAvailabilities = async () => {
    try {
      const data = await leaderAvailabilityService.getAll({ upcoming: true });
      setLeaderAvailabilities(data.slice(0, 10)); // Mostrar apenas as próximas 10
    } catch (error) {
      console.error('Erro ao carregar disponibilidades:', error);
    }
  };

  // Função para formatar telefone brasileiro
  const formatPhone = (value: string): string => {
    // Remove tudo que não é número
    const numbers = value.replace(/\D/g, '');

    // Limita a 11 dígitos
    const limited = numbers.slice(0, 11);

    // Aplica máscara
    if (limited.length <= 2) {
      return limited;
    } else if (limited.length <= 6) {
      return `(${limited.slice(0, 2)}) ${limited.slice(2)}`;
    } else if (limited.length <= 10) {
      return `(${limited.slice(0, 2)}) ${limited.slice(2, 6)}-${limited.slice(6)}`;
    } else {
      return `(${limited.slice(0, 2)}) ${limited.slice(2, 7)}-${limited.slice(7)}`;
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;

    // Aplica máscara de telefone no campo venue_contact
    if (name === 'venue_contact') {
      setFormData(prev => ({ ...prev, [name]: formatPhone(value) }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Validar horários
      if (formData.end_time <= formData.start_time) {
        setError('O horário de término deve ser posterior ao horário de início');
        setLoading(false);
        return;
      }

      // Validar data (não pode ser no passado)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const eventDate = new Date(formData.event_date);

      if (eventDate < today) {
        setError('A data do evento não pode ser no passado');
        setLoading(false);
        return;
      }

      const event = await eventService.create(formData);
      navigate(`/eventos/${event.id}`);
    } catch (err) {
      console.error('Erro ao criar evento:', err);
      const error = err as { response?: { data?: any } };
      if (error.response?.data) {
        const data = error.response.data;
        let errorMessage = 'Erro ao criar evento. Tente novamente.';

        if (typeof data === 'string') {
          errorMessage = data;
        } else if (typeof data === 'object' && data !== null) {
          const messages: string[] = [];
          for (const [key, value] of Object.entries(data)) {
            if (Array.isArray(value)) {
              messages.push(`${key}: ${value.join(', ')}`);
            } else {
              messages.push(`${key}: ${value}`);
            }
          }
          if (messages.length > 0) {
            errorMessage = messages.join('; ');
          }
        }

        setError(errorMessage);
      } else {
        setError('Erro ao criar evento. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Novo Evento</h1>
          <p className="mt-2 text-gray-600">Crie uma proposta de evento para a banda</p>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {prefilledData && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center space-x-2">
              <Info className="h-5 w-5" />
              <span>Data e horários preenchidos automaticamente a partir da disponibilidade do líder.</span>
            </div>
          )}

          {/* Título */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
              Título do Evento *
            </label>
            <div className="relative">
              <FileText className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
              <input
                id="title"
                name="title"
                type="text"
                value={formData.title}
                onChange={handleChange}
                className="input-field pl-10"
                placeholder="Ex: Show no Bar do João"
                required
              />
            </div>
          </div>

          {/* Localização */}
          <div>
            <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-2">
              Local *
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
              <input
                id="location"
                name="location"
                type="text"
                value={formData.location}
                onChange={handleChange}
                className="input-field pl-10"
                placeholder="Ex: Rua ABC, 123 - Centro"
                required
              />
            </div>
          </div>

          {/* Contato do Local */}
          <div>
            <label htmlFor="venue_contact" className="block text-sm font-medium text-gray-700 mb-2">
              Contato do Local
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
              <input
                id="venue_contact"
                name="venue_contact"
                type="text"
                value={formData.venue_contact}
                onChange={handleChange}
                className="input-field pl-10"
                placeholder="(11) 98888-8888"
                maxLength={15}
              />
            </div>
          </div>

          {/* Data e Horários */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-3">
              <label htmlFor="event_date" className="block text-sm font-medium text-gray-700 mb-2">
                Data *
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <input
                  id="event_date"
                  name="event_date"
                  type="date"
                  value={formData.event_date}
                  onChange={handleChange}
                  className="input-field pl-10"
                  required
                />
              </div>

              {/* Aviso se data coincide com disponibilidade do líder */}
              {matchingAvailability && !formData.is_solo && (
                <div className="flex items-start space-x-2 mt-2 p-3 bg-green-50 rounded-lg border border-green-200">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 text-sm text-green-800">
                    <p className="font-medium">Baterista disponível nesta data!</p>
                    <p className="mt-1">
                      Horário disponível: {matchingAvailability.start_time.slice(0, 5)} -{' '}
                      {matchingAvailability.end_time.slice(0, 5)}
                    </p>
                    {matchingAvailability.notes && (
                      <p className="mt-1 text-green-700">{matchingAvailability.notes}</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div>
              <label htmlFor="start_time" className="block text-sm font-medium text-gray-700 mb-2">
                Início *
              </label>
              <div className="relative">
                <Clock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <input
                  id="start_time"
                  name="start_time"
                  type="time"
                  value={formData.start_time}
                  onChange={handleChange}
                  className="input-field pl-10"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="end_time" className="block text-sm font-medium text-gray-700 mb-2">
                Término *
              </label>
              <div className="relative">
                <Clock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <input
                  id="end_time"
                  name="end_time"
                  type="time"
                  value={formData.end_time}
                  onChange={handleChange}
                  className="input-field pl-10"
                  required
                />
              </div>
            </div>
          </div>

          {/* Descrição */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
              Descrição
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={4}
              className="input-field"
              placeholder="Adicione detalhes sobre o evento, repertório, etc..."
            />
          </div>

          {/* Agenda do Baterista */}
          {!formData.is_solo && leaderAvailabilities.length > 0 && (
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-center space-x-2 mb-3">
                <Info className="h-5 w-5 text-gray-600" />
                <h3 className="font-medium text-gray-900">Próximas disponibilidades do baterista</h3>
              </div>
              <p className="text-sm text-gray-600 mb-3">
                Escolha uma destas datas para facilitar a aprovação do evento:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {leaderAvailabilities.slice(0, 6).map((availability) => (
                  <button
                    key={availability.id}
                    type="button"
                    onClick={() => {
                      setFormData(prev => ({ ...prev, event_date: availability.date }));
                    }}
                    className={`text-left p-3 rounded-lg border transition-colors ${
                      formData.event_date === availability.date
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 bg-white hover:border-primary-300 hover:bg-primary-50'
                    }`}
                  >
                    <div className="flex items-center space-x-2 mb-1">
                      <Calendar className="h-4 w-4 text-gray-500" />
                      <span className="font-medium text-gray-900">
                        {format(parseISO(availability.date), 'dd/MM/yyyy')}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4 text-gray-500" />
                      <span className="text-sm text-gray-600">
                        {availability.start_time.slice(0, 5)} - {availability.end_time.slice(0, 5)}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Show Solo */}
          <div className="flex items-start space-x-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <input
              type="checkbox"
              id="is_solo"
              name="is_solo"
              checked={formData.is_solo}
              onChange={(e) => setFormData(prev => ({ ...prev, is_solo: e.target.checked }))}
              className="mt-1 h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            />
            <div className="flex-1">
              <label htmlFor="is_solo" className="block text-sm font-medium text-gray-900 cursor-pointer">
                Show Solo
              </label>
              <p className="text-sm text-gray-600 mt-1">
                Marque esta opção se for um show solo. Shows solo não requerem aprovação do líder e são automaticamente aprovados.
              </p>
            </div>
          </div>

          {/* Botões */}
          <div className="flex items-center justify-end space-x-4 pt-4 border-t">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="btn-secondary flex items-center space-x-2"
            >
              <X className="h-5 w-5" />
              <span>Cancelar</span>
            </button>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Salvando...</span>
                </>
              ) : (
                <>
                  <Save className="h-5 w-5" />
                  <span>Criar Evento</span>
                </>
              )}
            </button>
          </div>

          <p className="text-sm text-gray-500 text-center">
            * Campos obrigatórios
          </p>
        </form>
      </div>
    </Layout>
  );
};

export default EventForm;
