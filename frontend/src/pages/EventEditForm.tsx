// pages/EventEditForm.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Calendar, MapPin, Clock, Phone, FileText, Save, X } from 'lucide-react';
import Layout from '../components/Layout/Layout';
import Loading from '../components/common/Loading';
import { eventService } from '../services/api';
import type { EventCreate } from '../types';
import { logError } from '../utils/logger';
import { sanitizeOptionalText, sanitizeText } from '../utils/sanitize';
import { getErrorMessage } from '../utils/toast';

const EventEditForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [loadingEvent, setLoadingEvent] = useState(true);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState<EventCreate>({
    title: '',
    description: '',
    location: '',
    venue_contact: '',
    event_date: '',
    start_time: '',
    end_time: '',
    is_solo: false,
  });

  const loadEvent = useCallback(async () => {
    if (!id) return;

    try {
      setLoadingEvent(true);
      const event = await eventService.getById(parseInt(id));

      // Preencher formulário com dados do evento
      setFormData({
        title: event.title,
        description: event.description || '',
        location: event.location,
        venue_contact: event.venue_contact || '',
        event_date: event.event_date,
        start_time: event.start_time,
        end_time: event.end_time,
        payment_amount: event.payment_amount,
        is_solo: event.is_solo ?? false,
      });
    } catch (err) {
      logError('Erro ao carregar evento:', err);
      setError('Erro ao carregar evento. Redirecionando...');
      setTimeout(() => navigate('/eventos'), 2000);
    } finally {
      setLoadingEvent(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    loadEvent();
  }, [loadEvent]);

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
    if (!id) return;

    setError('');
    setLoading(true);

    try {
      // Validar horários (permite cruzar meia-noite, mas não duração zero)
      const toMinutes = (time: string) => {
        const [h, m] = time.split(':').map(Number);
        return h * 60 + m;
      };
      const startMinutes = toMinutes(formData.start_time);
      const endMinutes = toMinutes(formData.end_time);
      let duration = endMinutes - startMinutes;
      if (duration <= 0) {
        duration += 24 * 60;
      }
      if (duration <= 0) {
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

      const sanitizedPayload: EventCreate = {
        ...formData,
        title: sanitizeText(formData.title, 200),
        location: sanitizeText(formData.location, 300),
        description: sanitizeOptionalText(formData.description, 5000),
        venue_contact: sanitizeOptionalText(formData.venue_contact, 200),
      };
      await eventService.update(parseInt(id), sanitizedPayload);
      navigate(`/eventos/${id}`);
    } catch (err: unknown) {
      logError('Erro ao atualizar evento:', err);
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  if (loadingEvent) {
    return (
      <Layout>
        <Loading text="Carregando evento..." />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-3xl mx-auto">
        <div className="hero-panel mb-6 space-y-2">
          <h1 className="text-3xl font-bold text-gray-900">Editar Evento</h1>
          <p className="text-gray-600">Atualize as informações do evento</p>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
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
            <div>
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
                Marque esta opção se for um show solo. Shows solo são automaticamente confirmados.
              </p>
            </div>
          </div>

          {/* Botões */}
          <div className="flex items-center justify-end space-x-4 pt-4 border-t">
            <button
              type="button"
              onClick={() => navigate(`/eventos/${id}`)}
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
                  <span>Salvar Alterações</span>
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

export default EventEditForm;
