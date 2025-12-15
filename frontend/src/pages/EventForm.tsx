// pages/EventForm.tsx
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Calendar,
  MapPin,
  Clock,
  Phone,
  FileText,
  Save,
  X,
  CheckCircle,
  Info,
  Sparkles,
} from 'lucide-react';
import Layout from '../components/Layout/Layout';
import ConflictPreview from '../components/event/ConflictPreview';
import AvailabilityPicker from '../components/event/AvailabilityPicker';
import ProposalSummary from '../components/event/ProposalSummary';
import { eventService, leaderAvailabilityService } from '../services/api';
import type { Event, EventCreate, LeaderAvailability } from '../types';
import { format, parseISO } from 'date-fns';

interface ConflictInfo {
  loading: boolean;
  hasConflicts: boolean;
  conflicts: Event[];
  bufferMinutes: number;
}

const EventForm: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const prefilledData = location.state as { date?: string; start_time?: string; end_time?: string } | null;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [leaderAvailabilities, setLeaderAvailabilities] = useState<LeaderAvailability[]>([]);
  const [matchingAvailability, setMatchingAvailability] = useState<LeaderAvailability | null>(null);
  const dateInputRef = useRef<HTMLInputElement | null>(null);
  const [conflictInfo, setConflictInfo] = useState<ConflictInfo>({
    loading: false,
    hasConflicts: false,
    conflicts: [],
    bufferMinutes: 40,
  });

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

  const loadLeaderAvailabilities = useCallback(async () => {
    try {
      const data = await leaderAvailabilityService.getAll({ upcoming: true });
      setLeaderAvailabilities(data.slice(0, 10));
    } catch (error) {
      console.error('Erro ao carregar disponibilidades:', error);
    }
  }, []);

  useEffect(() => {
    loadLeaderAvailabilities();
  }, [loadLeaderAvailabilities]);

  const formattedEventDate = useMemo(() => {
    if (!formData.event_date) return 'Selecione uma data';
    try {
      return format(parseISO(formData.event_date), 'dd/MM/yyyy');
    } catch {
      return 'Data inválida';
    }
  }, [formData.event_date]);

  const durationPreview = useMemo(() => {
    if (!formData.start_time || !formData.end_time) return null;
    const [startH, startM] = formData.start_time.split(':').map(Number);
    const [endH, endM] = formData.end_time.split(':').map(Number);
    let minutes = (endH * 60 + endM) - (startH * 60 + startM);
    if (minutes <= 0) minutes += 24 * 60;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins.toString().padStart(2, '0')}min`;
  }, [formData.start_time, formData.end_time]);

  useEffect(() => {
    if (formData.event_date) {
      const matching = leaderAvailabilities.find(avail => avail.date === formData.event_date);
      setMatchingAvailability(matching || null);
    } else {
      setMatchingAvailability(null);
    }
  }, [formData.event_date, leaderAvailabilities]);

  useEffect(() => {
    const { event_date, start_time, end_time } = formData;
    if (!event_date || !start_time || !end_time) {
      setConflictInfo(prev => ({ ...prev, hasConflicts: false, conflicts: [] }));
      return;
    }

    let cancelled = false;
    const timeout = setTimeout(async () => {
      setConflictInfo(prev => ({ ...prev, loading: true }));
      try {
        const result = await eventService.previewConflicts({ event_date, start_time, end_time });
        if (!cancelled) {
          setConflictInfo({
            loading: false,
            hasConflicts: result.has_conflicts,
            conflicts: result.conflicts || [],
            bufferMinutes: result.buffer_minutes,
          });
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Erro ao checar conflitos:', err);
          setConflictInfo(prev => ({ ...prev, loading: false }));
        }
      }
    }, 400);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [formData.event_date, formData.start_time, formData.end_time]);

  const formatPhone = (value: string): string => {
    const numbers = value.replace(/\D/g, '');
    const limited = numbers.slice(0, 11);

    if (limited.length <= 2) return limited;
    if (limited.length <= 6) return `(${limited.slice(0, 2)}) ${limited.slice(2)}`;
    if (limited.length <= 10) return `(${limited.slice(0, 2)}) ${limited.slice(2, 6)}-${limited.slice(6)}`;
    return `(${limited.slice(0, 2)}) ${limited.slice(2, 7)}-${limited.slice(7)}`;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
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
      const toMinutes = (time: string) => {
        const [h, m] = time.split(':').map(Number);
        return h * 60 + m;
      };
      const startMinutes = toMinutes(formData.start_time);
      const endMinutes = toMinutes(formData.end_time);
      let duration = endMinutes - startMinutes;
      if (duration <= 0) duration += 24 * 60;
      if (duration <= 0) {
        setError('O horário de término deve ser posterior ao horário de início');
        setLoading(false);
        return;
      }

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
    } catch (err: unknown) {
      console.error('Erro ao criar evento:', err);
      const error = err as { response?: { data?: unknown } };
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

  const openDatePicker = () => {
    const input = dateInputRef.current;
    if (input && typeof input.showPicker === 'function') {
      input.showPicker();
    }
  };

  const showConflictPreview = formData.event_date && formData.start_time && formData.end_time;

  return (
    <Layout>
      <section className="mx-auto max-w-5xl space-y-8">
        {/* Header */}
        <div className="relative overflow-hidden rounded-3xl border border-white/40 bg-gradient-to-r from-indigo-500/15 via-white to-cyan-400/20 p-6 shadow-2xl">
          <div className="pointer-events-none absolute -right-10 top-0 h-40 w-40 rounded-full bg-primary-300/30 blur-3xl" />
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="flex items-center text-xs font-semibold uppercase tracking-wide text-primary-600">
                <Sparkles className="mr-2 h-4 w-4" /> Assistente de Eventos
              </p>
              <h1 className="mt-2 text-3xl font-bold text-gray-900">Novo Evento</h1>
              <p className="mt-1 text-sm text-gray-700">
                Informe cada detalhe com clareza para agilizar a liberação do Roberto e entregar uma proposta profissional para o cliente.
              </p>
            </div>
            <div className="rounded-2xl border border-white/60 bg-white/80 px-6 py-4 text-sm font-semibold text-gray-800 shadow-lg backdrop-blur">
              <p className="text-xs uppercase tracking-wide text-gray-500">Formato</p>
              <p className="text-lg text-primary-700">
                {formData.is_solo ? 'Show Solo (auto aprovado)' : 'Duo Violão + Bateria (passa por aprovação)'}
              </p>
              <p className="mt-2 text-xs uppercase tracking-wide text-gray-500">Duração estimada</p>
              <p className="text-lg text-gray-900">{durationPreview ?? 'Defina os horários'}</p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
          <form onSubmit={handleSubmit} className="card space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg" role="alert">
                {error}
              </div>
            )}

            {prefilledData && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center space-x-2">
                <Info className="h-5 w-5" />
                <span>Data e horários preenchidos automaticamente a partir de uma disponibilidade publicada.</span>
              </div>
            )}

            {showConflictPreview && <ConflictPreview conflictInfo={conflictInfo} />}

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
                    ref={dateInputRef}
                    onFocus={openDatePicker}
                    onClick={openDatePicker}
                    className="input-field pl-10"
                    required
                  />
                </div>

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
            {!formData.is_solo && (
              <AvailabilityPicker
                availabilities={leaderAvailabilities}
                selectedDate={formData.event_date}
                onDateSelect={(date) => setFormData(prev => ({ ...prev, event_date: date }))}
              />
            )}

            {/* Show Solo */}
            <div className="flex items-start space-x-3 rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-50 via-white to-indigo-50 p-4">
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
                  Use esta opção quando o Roberto não participar. O evento fica marcado como solo, sai do fluxo
                  de aprovação e é liberado automaticamente no calendário.
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
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
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

            <p className="text-center text-sm text-gray-500">* Campos obrigatórios</p>
          </form>

          <ProposalSummary
            formattedDate={formattedEventDate}
            startTime={formData.start_time}
            endTime={formData.end_time}
            duration={durationPreview}
            isSolo={formData.is_solo ?? false}
            matchingAvailability={matchingAvailability}
          />
        </div>
      </section>
    </Layout>
  );
};

export default EventForm;
