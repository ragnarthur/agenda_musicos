// pages/EventForm.tsx
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Save, X, CheckCircle, Info, Sparkles, Users, UserPlus, Clock, AlertCircle } from 'lucide-react';
import Layout from '../components/Layout/Layout';
import ConflictPreview from '../components/event/ConflictPreview';
import ProposalSummary from '../components/event/ProposalSummary';
import { TimePickerBottomSheet } from '../components/time-picker';
import { eventService } from '../services/eventService';
import { musicianService } from '../services/api';
import { getErrorMessage, showToast } from '../utils/toast';
import { logError } from '../utils/logger';
import type { Event, EventCreate, AvailableMusician, Musician } from '../types';
import { format, parseISO, isBefore } from 'date-fns';
import InstrumentIcon from '../components/common/InstrumentIcon';
import { INSTRUMENT_LABELS as BASE_INSTRUMENT_LABELS } from '../utils/formatting';
import { sanitizeOptionalText, sanitizeText } from '../utils/sanitize';
import { getMobileInputProps, getTimeProps } from '../utils/mobileInputs';
import { maskCurrencyInput, unmaskCurrency } from '../utils/formatting';

interface ConflictInfo {
  loading: boolean;
  hasConflicts: boolean;
  conflicts: Event[];
  bufferMinutes: number;
}

const instrumentLabels: Record<string, string> = {
  ...BASE_INSTRUMENT_LABELS,
};

const resolveInstrumentLabel = (instrument: string): string => {
  if (!instrument) return 'Instrumento';
  const label = instrumentLabels[instrument];
  if (label) return label;
  const pretty = instrument.replace(/_/g, ' ');
  return pretty.charAt(0).toUpperCase() + pretty.slice(1);
};

// Presets de duração para atalhos comuns
const DURATION_PRESETS = [
  { label: '1h', minutes: 60 },
  { label: '2h', minutes: 120 },
  { label: '3h', minutes: 180 },
  { label: '4h', minutes: 240 },
];

const EventForm: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const prefilledData = location.state as {
    date?: string;
    start_time?: string;
    end_time?: string;
  } | null;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [availableMusicians, setAvailableMusicians] = useState<AvailableMusician[]>([]);
  const [selectedMusicians, setSelectedMusicians] = useState<number[]>([]);
  const [loadingMusicians, setLoadingMusicians] = useState(false);
  const [instrumentFilter, setInstrumentFilter] = useState<string>('all');
  const [instrumentQuery, setInstrumentQuery] = useState<string>('');
  const dateInputRef = useRef<HTMLInputElement | null>(null);
  const [conflictInfo, setConflictInfo] = useState<ConflictInfo>({
    loading: false,
    hasConflicts: false,
    conflicts: [],
    bufferMinutes: 40,
  });
  const [showTimePicker, setShowTimePicker] = useState<'start' | 'end' | null>(null);

  const [formData, setFormData] = useState<EventCreate>({
    title: '',
    description: '',
    location: '',
    venue_contact: '',
    payment_amount: '',
    event_date: prefilledData?.date || '',
    start_time: prefilledData?.start_time || '',
    end_time: prefilledData?.end_time || '',
    is_solo: false,
    is_private: false,
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
    const parseTime = (time: string) => {
      const parts = time.split(':');
      if (parts.length !== 2) return null;
      const [h, m] = parts.map(Number);
      if (isNaN(h) || isNaN(m)) return null;
      return h * 60 + m;
    };
    const startMinutes = parseTime(formData.start_time);
    const endMinutes = parseTime(formData.end_time);
    if (startMinutes === null || endMinutes === null) return null;
    let minutes = endMinutes - startMinutes;
    const crossesMidnight = minutes <= 0;
    if (crossesMidnight) minutes += 24 * 60;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return {
      label: `${hours}h ${mins.toString().padStart(2, '0')}min`,
      crossesMidnight,
      totalMinutes: minutes,
    };
  }, [formData.start_time, formData.end_time]);

  // Duração em formato string para o ProposalSummary
  const durationLabel = durationPreview?.label ?? null;

  const handleDurationPreset = (durationMinutes: number) => {
    if (!formData.start_time) {
      setError('Selecione o horário de início primeiro');
      return;
    }

    const startParts = formData.start_time.split(':').map(Number);
    const startMinutes = startParts[0] * 60 + startParts[1];
    const endMinutes = (startMinutes + durationMinutes) % (24 * 60);
    const endHours = Math.floor(endMinutes / 60);
    const endMins = endMinutes % 60;
    const end_time = `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;

    setFormData(prev => ({ ...prev, end_time }));
    setError('');
  };

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
        const aggregated: Musician[] = [];
        let page = 1;
        let hasNext = true;
        while (hasNext && !cancelled) {
          const pageData = await musicianService.getAllPaginated({ page, page_size: 50 });
          const results = Array.isArray(pageData?.results) ? pageData.results : [];
          aggregated.push(...results);
          hasNext = Boolean(pageData?.next);
          page += 1;
        }
        const musicians = aggregated;
        const mapped = musicians.map(musician => {
          const instruments =
            musician.instruments && musician.instruments.length > 0
              ? musician.instruments
              : musician.instrument
                ? [musician.instrument]
                : [];
          const primary = instruments[0] || musician.instrument;
          return {
            musician_id: musician.id,
            musician_name: musician.full_name,
            instrument: primary,
            instrument_display: resolveInstrumentLabel(primary),
            instruments,
            has_availability: false,
            availability_id: null,
            start_time: null,
            end_time: null,
            notes: null,
          };
        });

        if (!cancelled) {
          setAvailableMusicians(mapped);
          setSelectedMusicians([]);
        }
      } catch (err) {
        logError('Erro ao carregar músicos:', err);
        showToast.apiError(err);
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
    return () => {
      cancelled = true;
    };
  }, [formData.is_solo]);

  const instrumentOptions = useMemo(() => {
    const counts: Record<string, number> = {};
    availableMusicians.forEach(m => {
      const list = m.instruments && m.instruments.length > 0 ? m.instruments : [m.instrument];
      list.forEach((inst: string) => {
        counts[inst] = (counts[inst] || 0) + 1;
      });
    });
    const options = Object.keys(counts).map(instrument => ({
      value: instrument,
      label: resolveInstrumentLabel(instrument),
      count: counts[instrument],
    }));
    if (!instrumentQuery.trim()) return options;
    const query = instrumentQuery.toLowerCase();
    return options.filter(opt => opt.label.toLowerCase().includes(query));
  }, [availableMusicians, instrumentQuery]);

  const filteredMusicians = useMemo(() => {
    return availableMusicians.filter(m => {
      const list = m.instruments && m.instruments.length > 0 ? m.instruments : [m.instrument];
      const byFilter = instrumentFilter === 'all' ? true : list.includes(instrumentFilter);
      const labelsConcat = list.map(resolveInstrumentLabel).join(' ').toLowerCase();
      const byQuery = instrumentQuery.trim()
        ? `${labelsConcat} ${list.join(' ')}`.includes(instrumentQuery.toLowerCase())
        : true;
      return byFilter && byQuery;
    });
  }, [availableMusicians, instrumentFilter, instrumentQuery]);

  const getInstrumentDisplay = (musician: AvailableMusician): string => {
    const list =
      musician.instruments && musician.instruments.length > 0
        ? musician.instruments
        : [musician.instrument];
    return list.map(resolveInstrumentLabel).join(' · ');
  };

  const toggleMusicianSelection = (musicianId: number) => {
    setSelectedMusicians(prev =>
      prev.includes(musicianId) ? prev.filter(id => id !== musicianId) : [...prev, musicianId]
    );
  };

  const { event_date, start_time, end_time } = formData;

  useEffect(() => {
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
          setConflictInfo(prev => ({
            loading: false,
            hasConflicts: result.has_conflicts,
            conflicts: result.conflicts || [],
            bufferMinutes: result.buffer_minutes ?? prev.bufferMinutes,
          }));
        }
      } catch (err) {
        if (!cancelled) {
          logError('Erro ao checar conflitos:', err);
          showToast.apiError(err);
          setConflictInfo(prev => ({ ...prev, loading: false }));
        }
      }
    }, 400);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [event_date, start_time, end_time]);

  const formatPhone = (value: string): string => {
    const numbers = value.replace(/\D/g, '');
    const limited = numbers.slice(0, 11);

    if (limited.length <= 2) return limited;
    if (limited.length <= 6) return `(${limited.slice(0, 2)}) ${limited.slice(2)}`;
    if (limited.length <= 10)
      return `(${limited.slice(0, 2)}) ${limited.slice(2, 6)}-${limited.slice(6)}`;
    return `(${limited.slice(0, 2)}) ${limited.slice(2, 7)}-${limited.slice(7)}`;
  };

  const handlePaymentAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const masked = maskCurrencyInput(e.target.value);
    setFormData(prev => ({ ...prev, payment_amount: masked }));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name === 'venue_contact') {
      setFormData(prev => ({ ...prev, [name]: formatPhone(value) }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const parsePaymentAmount = (value: string | number | null | undefined): number | null => {
    if (value === null || value === undefined) return null;
    const raw = String(value).trim();
    if (!raw) return null;
    const unmasked = unmaskCurrency(raw);
    const num = Number.parseFloat(unmasked);
    return Number.isFinite(num) ? Number(num.toFixed(2)) : null;
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
      const eventDate = parseISO(formData.event_date || '');

      if (formData.event_date && eventDate && isBefore(eventDate, today)) {
        setError('A data do evento não pode ser no passado');
        setLoading(false);
        return;
      }

      // Inclui músicos selecionados se não for solo
      const eventData: EventCreate = {
        ...formData,
        title: sanitizeText(formData.title, 200),
        location: sanitizeText(formData.location, 300),
        description: sanitizeOptionalText(formData.description, 5000),
        venue_contact: sanitizeOptionalText(formData.venue_contact, 200),
        payment_amount: parsePaymentAmount(formData.payment_amount),
        invited_musicians: formData.is_solo ? [] : selectedMusicians,
      };

      const event = await eventService.create(eventData);
      showToast.eventCreated();
      navigate(`/eventos/${event.id}`);
    } catch (err: unknown) {
      setError(getErrorMessage(err));
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

  const handleTimePickerConfirm = (value: string) => {
    if (showTimePicker === 'start') {
      setFormData(prev => ({ ...prev, start_time: value }));
    } else if (showTimePicker === 'end') {
      setFormData(prev => ({ ...prev, end_time: value }));
    }
    setShowTimePicker(null);
  };

  const handleTimePickerClose = () => {
    setShowTimePicker(null);
  };

  return (
    <Layout>
      <section className="mx-auto max-w-5xl page-stack">
        {/* Header */}
        <div className="hero-panel">
          <div className="pointer-events-none absolute -right-10 top-0 h-40 w-40 rounded-full bg-primary-300/30 blur-3xl" />
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="flex items-center text-xs font-semibold uppercase tracking-wide text-primary-600">
                <Sparkles className="mr-2 h-4 w-4" /> Gestão de Eventos
              </p>
              <h1 className="mt-2 text-2xl sm:text-3xl font-bold text-gray-900">Novo Evento</h1>
              <p className="mt-1 text-sm text-gray-700">
                Preencha os detalhes do evento e convide músicos disponíveis para participar.
              </p>
            </div>
            <div className="rounded-2xl border border-white/60 bg-white/80 px-6 py-4 text-sm font-semibold text-gray-800 shadow-lg backdrop-blur">
              <p className="text-xs uppercase tracking-wide text-gray-500">Formato</p>
              <p className="text-lg text-primary-700">
                {formData.is_solo
                  ? 'Show Solo'
                  : selectedMusicians.length > 0
                    ? `Banda (${selectedMusicians.length + 1} músicos)`
                    : 'Selecione músicos'}
              </p>
              <p className="mt-2 text-xs uppercase tracking-wide text-gray-500">Duração estimada</p>
              <p className="text-lg text-gray-900">{durationLabel ?? 'Defina os horários'}</p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
          <form onSubmit={handleSubmit} className="card space-y-6">
            {error && (
              <div
                className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg"
                role="alert"
              >
                {error}
              </div>
            )}

            {prefilledData && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center space-x-2">
                <Info className="h-5 w-5" />
                <span>
                  Data e horários preenchidos automaticamente a partir de uma disponibilidade
                  publicada.
                </span>
              </div>
            )}

            {showConflictPreview && <ConflictPreview conflictInfo={conflictInfo} />}

            {/* Título */}
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                Título do Evento *
              </label>
              <div className="relative">
                <input
                  id="title"
                  name="title"
                  type="text"
                  value={formData.title}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="Ex: Show no Bar do João"
                  required
                  {...getMobileInputProps('username')}
                />
              </div>
            </div>

            {/* Localização */}
            <div>
              <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-2">
                Local *
              </label>
              <div className="relative">
                <input
                  id="location"
                  name="location"
                  type="text"
                  value={formData.location}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="Ex: Rua ABC, 123 - Centro"
                  required
                  {...getMobileInputProps('street-address')}
                />
              </div>
            </div>

            {/* Contato do Local */}
            <div>
              <label
                htmlFor="venue_contact"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Contato do Local
              </label>
              <div className="relative">
                <input
                  id="venue_contact"
                  name="venue_contact"
                  type="text"
                  value={formData.venue_contact}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="Telefone ou contato do local"
                  {...getMobileInputProps('tel')}
                />
              </div>
            </div>

            {/* Cachê */}
            <div>
              <label
                htmlFor="payment_amount"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Cachê (opcional)
              </label>
              <div className="relative">
                <input
                  id="payment_amount"
                  name="payment_amount"
                  type="text"
                  inputMode="decimal"
                  value={formData.payment_amount ?? ''}
                  onChange={handlePaymentAmountChange}
                  className="input-field"
                  placeholder="R$ 0,00"
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Informe o valor do cachê se já estiver definido.
              </p>
            </div>

            {/* Data e Horários */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label
                  htmlFor="event_date"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Data *
                </label>
                <div className="relative">
                  <input
                    id="event_date"
                    name="event_date"
                    type="date"
                    value={formData.event_date}
                    onChange={handleChange}
                    ref={dateInputRef}
                    onFocus={openDatePicker}
                    onClick={openDatePicker}
                    className="input-field"
                    required
                    {...getMobileInputProps('date')}
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="start_time"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Início *
                </label>
                <div
                  className="relative"
                  onClick={() => setShowTimePicker('start')}
                >
                  <input
                    id="start_time"
                    name="start_time"
                    type="time"
                    value={formData.start_time}
                    onChange={handleChange}
                    className="input-field cursor-pointer"
                    required
                    {...getTimeProps()}
                  />
                </div>

                {/* Presets de duração */}
                {formData.start_time && (
                  <div className="mt-3">
                    <p className="text-xs text-gray-600 mb-2">Duração rápida:</p>
                    <div className="flex gap-2">
                      {DURATION_PRESETS.map(preset => (
                        <button
                          key={preset.minutes}
                          type="button"
                          onClick={() => handleDurationPreset(preset.minutes)}
                          className="px-3 py-1.5 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 transition hover:border-primary-400 hover:bg-primary-50 active:border-primary-500 active:bg-primary-100 min-h-[44px] touch-manipulation"
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label htmlFor="end_time" className="block text-sm font-medium text-gray-700 mb-2">
                  Término *
                </label>
                <div
                  className="relative"
                  onClick={() => setShowTimePicker('end')}
                >
                  <input
                    id="end_time"
                    name="end_time"
                    type="time"
                    value={formData.end_time}
                    onChange={handleChange}
                    className="input-field cursor-pointer"
                    required
                    {...getTimeProps()}
                  />
                </div>

                {/* Duração em tempo real com indicador de cruzamento de meia-noite */}
                {durationPreview && (
                  <div className="mt-3">
                    <div
                      className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${
                        durationPreview.crossesMidnight
                          ? 'bg-purple-100 text-purple-800 border border-purple-200'
                          : 'bg-gray-100 text-gray-700 border border-gray-200'
                      }`}
                    >
                      <Clock className="h-4 w-4" />
                      <span>{durationPreview.label}</span>
                      {durationPreview.crossesMidnight && (
                        <span className="text-xs ml-1">(cruza meia-noite)</span>
                      )}
                    </div>

                    {/* Validação em tempo real */}
                    {durationPreview.totalMinutes <= 0 && (
                      <div className="mt-2 flex items-start gap-2 text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2 border border-red-200">
                        <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                        <span>O horário de término deve ser posterior ao horário de início</span>
                      </div>
                    )}
                  </div>
                )}
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
            <div className="flex items-start space-x-3 rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-50 via-white to-indigo-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 p-4">
              <div className="relative flex items-start">
                <input
                  type="checkbox"
                  id="is_solo"
                  name="is_solo"
                  checked={formData.is_solo}
                  onChange={e => setFormData(prev => ({ ...prev, is_solo: e.target.checked }))}
                  className="sr-only"
                />
                <div
                  role="checkbox"
                  tabIndex={0}
                  aria-checked={formData.is_solo}
                  onClick={() => setFormData(prev => ({ ...prev, is_solo: !prev.is_solo }))}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setFormData(prev => ({ ...prev, is_solo: !prev.is_solo }));
                    }
                  }}
                  className="mt-1 h-11 w-11 rounded-md border-2 flex items-center justify-center cursor-pointer transition-all touch-manipulation bg-primary-600 border-primary-600 text-white"
                  style={{ touchAction: 'manipulation' }}
                >
                  {formData.is_solo && (
                    <svg
                      className="h-6 w-6 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={3}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  )}
                </div>
              </div>
              <div className="flex-1">
                <label
                  htmlFor="is_solo"
                  className="block text-sm font-medium text-gray-900 cursor-pointer"
                >
                  Show Solo
                </label>
                <p className="text-sm text-gray-600 mt-1">
                  Marque se você for tocar sozinho. O evento é confirmado automaticamente sem
                  precisar de confirmação de outros músicos.
                </p>
              </div>
            </div>

            {/* Evento Privado */}
            <div className="flex items-start space-x-3 rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 via-white to-orange-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 p-4">
              <div className="relative flex items-start">
                <input
                  type="checkbox"
                  id="is_private"
                  name="is_private"
                  checked={formData.is_private}
                  onChange={e => setFormData(prev => ({ ...prev, is_private: e.target.checked }))}
                  className="sr-only"
                />
                <div
                  role="checkbox"
                  tabIndex={0}
                  aria-checked={formData.is_private}
                  onClick={() => setFormData(prev => ({ ...prev, is_private: !prev.is_private }))}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setFormData(prev => ({ ...prev, is_private: !prev.is_private }));
                    }
                  }}
                  className="mt-1 h-11 w-11 rounded-md border-2 flex items-center justify-center cursor-pointer transition-all touch-manipulation bg-amber-500 border-amber-500 text-white"
                  style={{ touchAction: 'manipulation' }}
                >
                  {formData.is_private && (
                    <svg
                      className="h-6 w-6 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={3}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  )}
                </div>
              </div>
              <div className="flex-1">
                <label
                  htmlFor="is_private"
                  className="block text-sm font-medium text-gray-900 cursor-pointer"
                >
                  Evento privado
                </label>
                <p className="text-sm text-gray-600 mt-1">
                  Visitantes verão apenas a data ocupada, sem detalhes.
                </p>
              </div>
            </div>

            {/* Seleção de Músicos para Convite */}
            {!formData.is_solo && (
              <div className="rounded-2xl border border-purple-200 bg-gradient-to-r from-purple-50 via-white to-indigo-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Users className="h-5 w-5 text-purple-600" />
                  <h3 className="text-sm font-semibold text-gray-900">
                    Selecionar músicos por instrumento
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-[1fr,240px] gap-2 md:items-end mb-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-700 mb-1 block">
                      Buscar instrumento
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={instrumentQuery}
                        onChange={e => setInstrumentQuery(e.target.value)}
                        placeholder="Digite violão, teclado, bateria..."
                        className="input-field"
                      />
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 md:justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setInstrumentFilter('all');
                        setInstrumentQuery('');
                      }}
                      className={`px-3 py-1.5 rounded-full text-sm border transition ${
                        instrumentFilter === 'all' && !instrumentQuery
                          ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                          : 'bg-white text-gray-700 border-gray-200 hover:border-purple-300'
                      }`}
                    >
                      Limpar filtros
                    </button>
                  </div>
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
                    {instrumentOptions.map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setInstrumentFilter(opt.value)}
                        className={`px-3 py-1.5 rounded-full text-sm border transition inline-flex items-center gap-2 ${
                          instrumentFilter === opt.value
                            ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                            : 'bg-white text-gray-700 border-gray-200 hover:border-purple-300'
                        }`}
                      >
                        <span className="flex items-center gap-1">
                          <InstrumentIcon instrument={opt.value} size={16} />
                          {opt.label}
                        </span>
                        <span className="text-xs text-gray-500 ml-1">({opt.count})</span>
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
                      Escolha primeiro o instrumento e, em seguida, os músicos que tocarão no
                      evento. Eles receberão uma notificação e precisarão confirmar a participação.
                    </p>
                    <div className="space-y-2">
                      {filteredMusicians.map(musician => (
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
                            <div
                              className={`p-2 rounded-lg ${
                                selectedMusicians.includes(musician.musician_id)
                                  ? 'bg-purple-500 text-white'
                                  : musician.has_availability
                                    ? 'bg-green-100 text-green-600'
                                    : 'bg-gray-100 text-gray-600'
                              }`}
                            >
                              <InstrumentIcon instrument={musician.instrument} size={18} />
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
                                {getInstrumentDisplay(musician)}
                                {musician.has_availability &&
                                  musician.start_time &&
                                  musician.end_time && (
                                    <span className="text-green-600">
                                      {' '}
                                      • {musician.start_time} às {musician.end_time}
                                    </span>
                                  )}
                              </p>
                              {musician.has_availability && musician.notes && (
                                <p className="text-xs text-subtle mt-0.5">{musician.notes}</p>
                              )}
                            </div>
                          </div>
                          <div
                            className={`flex items-center justify-center w-6 h-6 rounded-full border-2 ${
                              selectedMusicians.includes(musician.musician_id)
                                ? 'border-purple-500 bg-purple-500'
                                : 'border-gray-300'
                            }`}
                          >
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
                            {selectedMusicians.length} músico
                            {selectedMusicians.length > 1 ? 's' : ''} selecionado
                            {selectedMusicians.length > 1 ? 's' : ''}
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
            duration={durationLabel}
            isSolo={formData.is_solo ?? false}
            selectedMusicians={selectedMusicians}
            availableMusicians={availableMusicians}
          />
        </div>
      </section>

      <TimePickerBottomSheet
        isOpen={showTimePicker === 'start'}
        value={formData.start_time || '--:--'}
        onChange={handleTimePickerConfirm}
        onClose={handleTimePickerClose}
        durationPresets={DURATION_PRESETS}
        onDurationPreset={handleDurationPreset}
        showDurationPresets={false}
        enableQuickSelect={true}
      />

      <TimePickerBottomSheet
        isOpen={showTimePicker === 'end'}
        value={formData.end_time || '--:--'}
        onChange={handleTimePickerConfirm}
        onClose={handleTimePickerClose}
        showDurationPresets={false}
        enableQuickSelect={true}
      />
    </Layout>
  );
};

export default EventForm;
