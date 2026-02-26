import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Calendar, MapPin, Clock, FileText, Music, X, Send } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import ContractorLayout from '../../components/contractor/ContractorLayout';
import FormField from '../../components/form/FormField';
import {
  quoteRequestService,
  allMusiciansService,
  publicMusicianService,
  publicMusicGenresService,
  type MusicianPublic,
} from '../../services/publicApi';
import { BRAZILIAN_STATES } from '../../config/cities';
import { MUSICAL_GENRES, getGenreLabel } from '../../config/genres';
import { CONTRACTOR_ROUTES } from '../../routes/contractorRoutes';
import { showToast } from '../../utils/toast';

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

function SectionHeader({ number, label }: { number: string; label: string }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <span className="text-xs font-heading font-semibold uppercase tracking-[0.15em] text-primary-600 dark:text-primary-400 tabular-nums">
        {number}
      </span>
      <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
      <span className="text-xs font-heading font-semibold uppercase tracking-[0.12em] text-gray-400 dark:text-gray-500">
        {label}
      </span>
    </div>
  );
}

export default function ContractorNewRequest() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const musicianIdParam = searchParams.get('musician');
  const prefersReducedMotion = useReducedMotion();

  // Form state
  const [selectedMusician, setSelectedMusician] = useState<MusicianPublic | null>(null);
  const [genre, setGenre] = useState('');
  const [availableGenres, setAvailableGenres] = useState<string[]>([]);
  const [genreMusicians, setGenreMusicians] = useState<MusicianPublic[]>([]);
  const [loadingGenreMusicians, setLoadingGenreMusicians] = useState(false);
  const [eventDate, setEventDate] = useState('');
  const [eventType, setEventType] = useState('');
  const [locationState, setLocationState] = useState('');
  const [locationCity, setLocationCity] = useState('');
  const [venueName, setVenueName] = useState('');
  const [durationHours, setDurationHours] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const debouncedLocationCity = useDebounce(locationCity, 400);

  // Pre-fill musician from URL param
  useEffect(() => {
    if (musicianIdParam) {
      publicMusicianService
        .getPublicProfile(Number(musicianIdParam))
        .then(musician => setSelectedMusician(musician))
        .catch(() => showToast.error('Músico não encontrado'));
    }
  }, [musicianIdParam]);

  useEffect(() => {
    let active = true;
    publicMusicGenresService
      .listAvailable()
      .then(genres => {
        if (!active) return;
        setAvailableGenres(genres);
      })
      .catch(() => {
        if (!active) return;
        setAvailableGenres([]);
      });
    return () => {
      active = false;
    };
  }, []);

  const genreOptions = useMemo(() => {
    const base = (
      availableGenres.length > 0 ? availableGenres : MUSICAL_GENRES.map(g => g.value)
    ).filter(Boolean);

    const unique = Array.from(new Set(base));
    unique.sort((a, b) => getGenreLabel(a).localeCompare(getGenreLabel(b), 'pt-BR'));
    return unique;
  }, [availableGenres]);

  useEffect(() => {
    if (!genre || selectedMusician) {
      setGenreMusicians([]);
      return;
    }

    let active = true;
    setLoadingGenreMusicians(true);
    allMusiciansService
      .list({
        genre,
        state: locationState || undefined,
        city: debouncedLocationCity || undefined,
        limit: 50,
      })
      .then(data => {
        if (!active) return;
        setGenreMusicians(data);
      })
      .catch(() => {
        if (!active) return;
        setGenreMusicians([]);
      })
      .finally(() => {
        if (!active) return;
        setLoadingGenreMusicians(false);
      });

    return () => {
      active = false;
    };
  }, [genre, locationState, debouncedLocationCity, selectedMusician]);

  const handleSelectMusician = (musician: MusicianPublic) => {
    setSelectedMusician(musician);
  };

  const handleClearMusician = () => {
    setSelectedMusician(null);
  };

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!selectedMusician) {
        showToast.error('Selecione um músico');
        return;
      }
      if (!eventDate || !eventType || !locationState || !locationCity) {
        showToast.error('Preencha todos os campos obrigatórios');
        return;
      }

      setSubmitting(true);
      try {
        await quoteRequestService.create({
          musician: selectedMusician.id,
          event_date: eventDate,
          event_type: eventType,
          location_state: locationState,
          location_city: locationCity,
          venue_name: venueName || undefined,
          duration_hours: durationHours ? Number(durationHours) : undefined,
          notes: notes || undefined,
        });
        showToast.success('Pedido enviado com sucesso!');
        navigate(CONTRACTOR_ROUTES.requests);
      } catch (error) {
        showToast.apiError(error);
      } finally {
        setSubmitting(false);
      }
    },
    [
      selectedMusician,
      eventDate,
      eventType,
      locationState,
      locationCity,
      venueName,
      durationHours,
      notes,
      navigate,
    ]
  );

  // Minimum date = today
  const today = new Date().toISOString().split('T')[0];

  return (
    <ContractorLayout>
      <div className="page-stack">
        {/* Page Header */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={prefersReducedMotion ? { duration: 0.2 } : { duration: 0.3 }}
        >
          <h1 className="text-2xl sm:text-3xl font-heading font-bold text-gray-900 dark:text-white">
            Novo Pedido de Orçamento
          </h1>
          <p className="text-sm text-muted mt-1">
            Preencha os dados do evento para solicitar um orçamento
          </p>
        </motion.div>

        {/* Form */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={prefersReducedMotion ? { duration: 0.2 } : { delay: 0.06, duration: 0.35 }}
          className="max-w-xl"
        >
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Section 01 — Músico */}
            <div>
              <SectionHeader number="01" label="Músico" />

              {selectedMusician ? (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-primary-50 dark:bg-primary-900/20 border-l-4 border-primary-500 border border-primary-100 dark:border-primary-800/40">
                  <div className="w-11 h-11 rounded-full overflow-hidden flex-shrink-0 ring-2 ring-primary-300 dark:ring-primary-700">
                    {selectedMusician.avatar_url ? (
                      <img
                        src={selectedMusician.avatar_url}
                        alt={selectedMusician.full_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                        <Music className="w-5 h-5 text-white" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-heading font-semibold text-gray-900 dark:text-white truncate">
                      {selectedMusician.full_name}
                    </p>
                    <p className="text-xs text-muted mt-0.5">
                      {selectedMusician.instrument}
                      {selectedMusician.city && ` · ${selectedMusician.city}`}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleClearMusician}
                    className="p-1.5 rounded-full hover:bg-red-100 dark:hover:bg-red-900/30 text-gray-400 hover:text-red-600 transition-colors flex-shrink-0"
                    aria-label="Remover músico"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <FormField
                    id="genre"
                    label="Estilo musical"
                    required
                    icon={<Music className="w-4 h-4" />}
                  >
                    <select
                      id="genre"
                      value={genre}
                      onChange={e => {
                        setGenre(e.target.value);
                        setSelectedMusician(null);
                      }}
                      className="input-field pl-10"
                      required
                    >
                      <option value="">Selecione...</option>
                      {genreOptions.map(value => (
                        <option key={value} value={value}>
                          {getGenreLabel(value)}
                        </option>
                      ))}
                    </select>
                  </FormField>

                  <FormField
                    id="musician_select"
                    label="Músico"
                    required
                    icon={<Music className="w-4 h-4" />}
                  >
                    <select
                      id="musician_select"
                      value=""
                      onChange={e => {
                        const id = Number(e.target.value);
                        const musician = genreMusicians.find(m => m.id === id);
                        if (musician) handleSelectMusician(musician);
                      }}
                      className="input-field pl-10"
                      disabled={!genre || loadingGenreMusicians || genreMusicians.length === 0}
                      required
                    >
                      <option value="">
                        {!genre
                          ? 'Selecione um estilo primeiro...'
                          : loadingGenreMusicians
                            ? 'Carregando músicos...'
                            : genreMusicians.length === 0
                              ? 'Nenhum músico encontrado para esse estilo'
                              : 'Selecione um músico...'}
                      </option>
                      {genreMusicians.map(musician => (
                        <option key={musician.id} value={musician.id}>
                          {musician.full_name}
                          {musician.instrument ? ` · ${musician.instrument}` : ''}
                          {musician.city && musician.state
                            ? ` · ${musician.city}-${musician.state}`
                            : ''}
                        </option>
                      ))}
                    </select>
                  </FormField>
                </div>
              )}
            </div>

            {/* Section 02 — Detalhes do Evento */}
            <div>
              <SectionHeader number="02" label="Detalhes do Evento" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  id="event_date"
                  label="Data do Evento"
                  required
                  icon={<Calendar className="w-4 h-4" />}
                >
                  <input
                    id="event_date"
                    type="date"
                    value={eventDate}
                    onChange={e => setEventDate(e.target.value)}
                    min={today}
                    className="input-field pl-10"
                    required
                  />
                </FormField>
                <FormField
                  id="event_type"
                  label="Tipo de Evento"
                  required
                  icon={<FileText className="w-4 h-4" />}
                >
                  <input
                    id="event_type"
                    type="text"
                    value={eventType}
                    onChange={e => setEventType(e.target.value)}
                    placeholder="Ex: Casamento, Aniversário..."
                    className="input-field pl-10"
                    required
                  />
                </FormField>
              </div>
            </div>

            {/* Section 03 — Local */}
            <div>
              <SectionHeader number="03" label="Local" />
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    id="location_state"
                    label="Estado"
                    required
                    icon={<MapPin className="w-4 h-4" />}
                  >
                    <select
                      id="location_state"
                      value={locationState}
                      onChange={e => setLocationState(e.target.value)}
                      className="input-field pl-10"
                      required
                    >
                      <option value="">Selecione...</option>
                      {BRAZILIAN_STATES.map(({ value, label }) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </FormField>
                  <FormField
                    id="location_city"
                    label="Cidade"
                    required
                    icon={<MapPin className="w-4 h-4" />}
                  >
                    <input
                      id="location_city"
                      type="text"
                      value={locationCity}
                      onChange={e => setLocationCity(e.target.value)}
                      placeholder="Nome da cidade"
                      className="input-field pl-10"
                      required
                    />
                  </FormField>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    id="venue_name"
                    label="Local/Venue"
                    icon={<MapPin className="w-4 h-4" />}
                  >
                    <input
                      id="venue_name"
                      type="text"
                      value={venueName}
                      onChange={e => setVenueName(e.target.value)}
                      placeholder="Ex: Salão de Festas..."
                      className="input-field pl-10"
                    />
                  </FormField>
                  <FormField
                    id="duration_hours"
                    label="Duração (horas)"
                    icon={<Clock className="w-4 h-4" />}
                  >
                    <input
                      id="duration_hours"
                      type="number"
                      value={durationHours}
                      onChange={e => setDurationHours(e.target.value)}
                      placeholder="Ex: 3"
                      min="1"
                      max="24"
                      className="input-field pl-10"
                    />
                  </FormField>
                </div>
              </div>
            </div>

            {/* Section 04 — Observações */}
            <div>
              <SectionHeader number="04" label="Observações" />
              <FormField id="notes" label="Detalhes adicionais">
                <textarea
                  id="notes"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Repertório desejado, estrutura do evento, preferências..."
                  className="input-field min-h-[110px] resize-y"
                  rows={4}
                />
              </FormField>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting || !selectedMusician}
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-heading font-semibold py-4 rounded-xl flex items-center justify-center gap-2.5 transition-all shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 min-h-[56px] text-base"
            >
              {submitting ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  Enviar Pedido
                </>
              )}
            </button>
          </form>
        </motion.div>
      </div>
    </ContractorLayout>
  );
}
