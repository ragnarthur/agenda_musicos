// pages/EventForm.tsx
import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  Users,
  UserPlus,
  Music,
} from 'lucide-react';
import Layout from '../components/Layout/Layout';
import ConflictPreview from '../components/event/ConflictPreview';
import ProposalSummary from '../components/event/ProposalSummary';
import { eventService, musicianService } from '../services/api';
import type { Event, EventCreate, AvailableMusician, Musician } from '../types';
import { format, parseISO } from 'date-fns';

interface ConflictInfo {
  loading: boolean;
  hasConflicts: boolean;
  conflicts: Event[];
  bufferMinutes: number;
}

const instrumentLabels: Record<string, string> = {
  vocal: 'Vocal',
  guitar: 'Guitarra/Violão',
  bass: 'Baixo',
  drums: 'Bateria',
  keyboard: 'Teclado',
  other: 'Outro',
};

const EventForm: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const prefilledData = location.state as { date?: string; start_time?: string; end_time?: string } | null;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [availableMusicians, setAvailableMusicians] = useState<AvailableMusician[]>([]);
  const [selectedMusicians, setSelectedMusicians] = useState<number[]>([]);
  const [loadingMusicians, setLoadingMusicians] = useState(false);
  const [instrumentFilter, setInstrumentFilter] = useState<string>('all');
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

  // Carrega todos os músicos cadastrados para seleção (exceto em show solo)
  useEffect(() => {
    if (formData.is_solo) {
      setAvailableMusicians([]);
      setSelectedMusicians([]);
      return;
    }

    let cancelled = false;
    const loadMusicians = async () => {
      setLoadingMusicians(true);
      try {
        const musicians: Musician[] = await musicianService.getAll();
        const mapped = musicians.map(musician => ({
          musician_id: musician.id,
          musician_name: musician.full_name,
          instrument: musician.instrument,
          instrument_display: instrumentLabels[musician.instrument] || musician.instrument,
          has_availability: false,
          availability_id: null,
          start_time: null,
          end_time: null,
          notes: null,
        }));

        if (!cancelled) {
          setAvailableMusicians(mapped);
          setSelectedMusicians([]);
        }
      } catch (err) {
        console.error('Erro ao carregar músicos:', err);
        if (!cancelled) {
          setAvailableMusicians([]);
        }
      } finally {
        if (!cancelled) {
          setLoadingMusicians(false);
        }
      }
    };

    loadMusicians();
    return () => { cancelled = true; };
  }, [formData.is_solo]);

  const instrumentOptions = useMemo(() => {
    const counts: Record<string, number> = {};
    availableMusicians.forEach((m) => {
      counts[m.instrument] = (counts[m.instrument] || 0) + 1;
    });
    return Object.keys(counts).map((instrument) => ({
      value: instrument,
      label: instrumentLabels[instrument] || instrument,
      count: counts[instrument],
    }));
  }, [availableMusicians]);

  const filteredMusicians = useMemo(() => {
    if (instrumentFilter === 'all') return availableMusicians;
    return availableMusicians.filter((m) => m.instrument === instrumentFilter);
  }, [availableMusicians, instrumentFilter]);

  const toggleMusicianSelection = (musicianId: number) => {
    setSelectedMusicians(prev =>
      prev.includes(musicianId)
        ? prev.filter(id => id !== musicianId)
        : [...prev, musicianId]
    );
  };

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

      // Inclui músicos selecionados se não for solo
      const eventData: EventCreate = {
        ...formData,
        invited_musicians: formData.is_solo ? [] : selectedMusicians,
      };

      const event = await eventService.create(eventData);
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
                Preencha os detalhes do evento e convide músicos disponíveis para participar.
              </p>
            </div>
            <div className="rounded-2xl border border-white/60 bg-white/80 px-6 py-4 text-sm font-semibold text-gray-800 shadow-lg backdrop-blur">
              <p className="text-xs uppercase tracking-wide text-gray-500">Formato</p>
              <p className="text-lg text-primary-700">
                {formData.is_solo ? 'Show Solo' : selectedMusicians.length > 0 ? `Banda (${selectedMusicians.length + 1} músicos)` : 'Selecione músicos'}
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
                  Marque se você for tocar sozinho. O evento é aprovado automaticamente sem precisar
                  de confirmação de outros músicos.
                </p>
              </div>
            </div>

            {/* Seleção de Músicos para Convite */}
            {!formData.is_solo && (
              <div className="rounded-2xl border border-purple-200 bg-gradient-to-r from-purple-50 via-white to-indigo-50 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Users className="h-5 w-5 text-purple-600" />
                  <h3 className="text-sm font-semibold text-gray-900">
                    Selecionar músicos por instrumento
                  </h3>
                </div>

                {instrumentOptions.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    <button
                      type="button"
                      onClick={() => setInstrumentFilter('all')}
                      className={`px-3 py-1.5 rounded-full text-sm border transition ${
                        instrumentFilter === 'all'
                          ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                          : 'bg-white text-gray-700 border-gray-200 hover:border-purple-300'
                      }`}
                    >
                      Todos
                    </button>
                    {instrumentOptions.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setInstrumentFilter(opt.value)}
                        className={`px-3 py-1.5 rounded-full text-sm border transition ${
                          instrumentFilter === opt.value
                            ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                            : 'bg-white text-gray-700 border-gray-200 hover:border-purple-300'
                        }`}
                      >
                        {opt.label} <span className="text-xs text-gray-500 ml-1">({opt.count})</span>
                      </button>
                    ))}
                  </div>
                )}

                {loadingMusicians ? (
                  <div className="flex items-center justify-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600" />
                    <span className="ml-2 text-sm text-gray-600">Carregando músicos...</span>
                  </div>
                ) : availableMusicians.length === 0 ? (
                  <div className="text-center py-4">
                    <Info className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">Nenhum músico cadastrado para convite.</p>
                  </div>
                ) : filteredMusicians.length === 0 ? (
                  <div className="text-center py-4">
                    <Info className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">
                      Nenhum músico com o instrumento selecionado.
                    </p>
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-gray-600 mb-3">
                      Escolha primeiro o instrumento e, em seguida, os músicos que tocarão no evento.
                      Eles receberão uma notificação e precisarão confirmar a participação.
                    </p>
                    <div className="space-y-2">
                      {filteredMusicians.map((musician) => (
                        <div
                          key={musician.musician_id}
                          onClick={() => toggleMusicianSelection(musician.musician_id)}
                          className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                            selectedMusicians.includes(musician.musician_id)
                              ? 'border-purple-500 bg-purple-50 shadow-sm'
                              : musician.has_availability
                                ? 'border-green-200 bg-green-50/30 hover:border-purple-300 hover:bg-purple-50/50'
                                : 'border-gray-200 bg-white hover:border-purple-300 hover:bg-purple-50/50'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${
                              selectedMusicians.includes(musician.musician_id)
                                ? 'bg-purple-500 text-white'
                                : musician.has_availability
                                  ? 'bg-green-100 text-green-600'
                                  : 'bg-gray-100 text-gray-600'
                            }`}>
                              <Music className="h-4 w-4" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">
                                {musician.musician_name}
                                {musician.has_availability && (
                                  <span className="ml-2 inline-flex items-center px-1.5 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded">
                                    <CheckCircle className="h-3 w-3 mr-0.5" />
                                    Disponível
                                  </span>
                                )}
                              </p>
                              <p className="text-xs text-gray-500">
                                {musician.instrument_display}
                                {musician.has_availability && musician.start_time && musician.end_time && (
                                  <span className="text-green-600"> • {musician.start_time} às {musician.end_time}</span>
                                )}
                              </p>
                              {musician.has_availability && musician.notes && (
                                <p className="text-xs text-gray-400 mt-0.5">{musician.notes}</p>
                              )}
                            </div>
                          </div>
                          <div className={`flex items-center justify-center w-6 h-6 rounded-full border-2 ${
                            selectedMusicians.includes(musician.musician_id)
                              ? 'border-purple-500 bg-purple-500'
                              : 'border-gray-300'
                          }`}>
                            {selectedMusicians.includes(musician.musician_id) && (
                              <CheckCircle className="h-4 w-4 text-white" />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    {selectedMusicians.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-purple-200">
                        <div className="flex items-center gap-2 text-sm text-purple-700">
                          <UserPlus className="h-4 w-4" />
                          <span>
                            {selectedMusicians.length} músico{selectedMusicians.length > 1 ? 's' : ''} selecionado{selectedMusicians.length > 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

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
            selectedMusicians={selectedMusicians}
            availableMusicians={availableMusicians}
          />
        </div>
      </section>
    </Layout>
  );
};

export default EventForm;
