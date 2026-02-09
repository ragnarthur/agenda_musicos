import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Calendar,
  MapPin,
  Clock,
  FileText,
  Music,
  X,
  Search,
  Send,
} from 'lucide-react';
import ContractorLayout from '../../components/contractor/ContractorLayout';
import FormField from '../../components/form/FormField';
import {
  quoteRequestService,
  allMusiciansService,
  publicMusicianService,
  type MusicianPublic,
} from '../../services/publicApi';
import { BRAZILIAN_STATES } from '../../config/cities';
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

export default function ContractorNewRequest() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const musicianIdParam = searchParams.get('musician');

  // Form state
  const [selectedMusician, setSelectedMusician] = useState<MusicianPublic | null>(null);
  const [eventDate, setEventDate] = useState('');
  const [eventType, setEventType] = useState('');
  const [locationState, setLocationState] = useState('');
  const [locationCity, setLocationCity] = useState('');
  const [venueName, setVenueName] = useState('');
  const [durationHours, setDurationHours] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Musician search
  const [musicianSearch, setMusicianSearch] = useState('');
  const [searchResults, setSearchResults] = useState<MusicianPublic[]>([]);
  const [searchingMusicians, setSearchingMusicians] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debouncedMusicianSearch = useDebounce(musicianSearch, 400);

  // Pre-fill musician from URL param
  useEffect(() => {
    if (musicianIdParam) {
      publicMusicianService.getPublicProfile(Number(musicianIdParam))
        .then(musician => setSelectedMusician(musician))
        .catch(() => showToast.error('Músico não encontrado'));
    }
  }, [musicianIdParam]);

  // Search musicians as user types
  useEffect(() => {
    if (!debouncedMusicianSearch || selectedMusician) {
      setSearchResults([]);
      return;
    }

    const fetchMusicians = async () => {
      setSearchingMusicians(true);
      try {
        const data = await allMusiciansService.list({
          search: debouncedMusicianSearch,
          limit: 8,
        });
        setSearchResults(data);
        setShowDropdown(true);
      } catch {
        setSearchResults([]);
      } finally {
        setSearchingMusicians(false);
      }
    };

    fetchMusicians();
  }, [debouncedMusicianSearch, selectedMusician]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleSelectMusician = (musician: MusicianPublic) => {
    setSelectedMusician(musician);
    setMusicianSearch('');
    setSearchResults([]);
    setShowDropdown(false);
  };

  const handleClearMusician = () => {
    setSelectedMusician(null);
    setMusicianSearch('');
  };

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
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
  }, [selectedMusician, eventDate, eventType, locationState, locationCity, venueName, durationHours, notes, navigate]);

  // Minimum date = today
  const today = new Date().toISOString().split('T')[0];

  return (
    <ContractorLayout>
      <div className="page-stack">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
            Novo Pedido de Orçamento
          </h1>
          <p className="text-sm text-muted mt-1">
            Preencha os dados do evento para solicitar um orçamento
          </p>
        </div>

        <div className="card-contrast max-w-2xl">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Musician Selection */}
            <FormField id="musician" label="Músico" required>
              {selectedMusician ? (
                <div className="flex items-center gap-3 p-3 rounded-xl bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                    {selectedMusician.avatar_url ? (
                      <img
                        src={selectedMusician.avatar_url}
                        alt={selectedMusician.full_name}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <Music className="w-5 h-5 text-white" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-900 dark:text-white truncate">
                      {selectedMusician.full_name}
                    </p>
                    <p className="text-xs text-muted">
                      {selectedMusician.instrument}
                      {selectedMusician.city && ` · ${selectedMusician.city}`}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleClearMusician}
                    className="p-1.5 rounded-full hover:bg-red-100 dark:hover:bg-red-900/30 text-gray-400 hover:text-red-600 transition-colors"
                    aria-label="Remover músico"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div ref={dropdownRef} className="relative">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      value={musicianSearch}
                      onChange={e => {
                        setMusicianSearch(e.target.value);
                        if (e.target.value) setShowDropdown(true);
                      }}
                      onFocus={() => {
                        if (searchResults.length > 0) setShowDropdown(true);
                      }}
                      placeholder="Buscar músico por nome..."
                      className="input-field pl-10"
                      autoComplete="off"
                    />
                    {searchingMusicians && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <div className="w-4 h-4 border-2 border-gray-300 border-t-primary-600 rounded-full animate-spin" />
                      </div>
                    )}
                  </div>
                  {showDropdown && searchResults.length > 0 && (
                    <div className="absolute z-20 w-full mt-1 bg-white dark:bg-slate-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl max-h-60 overflow-y-auto">
                      {searchResults.map(musician => (
                        <button
                          key={musician.id}
                          type="button"
                          onClick={() => handleSelectMusician(musician)}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors text-left min-h-[44px]"
                        >
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                            {musician.avatar_url ? (
                              <img
                                src={musician.avatar_url}
                                alt=""
                                className="w-8 h-8 rounded-full object-cover"
                              />
                            ) : (
                              <Music className="w-4 h-4 text-white" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                              {musician.full_name}
                            </p>
                            <p className="text-xs text-muted">
                              {musician.instrument}
                              {musician.city && ` · ${musician.city}-${musician.state}`}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </FormField>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField id="event_date" label="Data do Evento" required icon={<Calendar className="w-4 h-4" />}>
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
              <FormField id="event_type" label="Tipo de Evento" required icon={<FileText className="w-4 h-4" />}>
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField id="location_state" label="Estado" required icon={<MapPin className="w-4 h-4" />}>
                <select
                  id="location_state"
                  value={locationState}
                  onChange={e => setLocationState(e.target.value)}
                  className="input-field pl-10"
                  required
                >
                  <option value="">Selecione...</option>
                  {BRAZILIAN_STATES.map(({ value, label }) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </FormField>
              <FormField id="location_city" label="Cidade" required icon={<MapPin className="w-4 h-4" />}>
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
              <FormField id="venue_name" label="Local/Venue" icon={<MapPin className="w-4 h-4" />}>
                <input
                  id="venue_name"
                  type="text"
                  value={venueName}
                  onChange={e => setVenueName(e.target.value)}
                  placeholder="Ex: Salão de Festas..."
                  className="input-field pl-10"
                />
              </FormField>
              <FormField id="duration_hours" label="Duração (horas)" icon={<Clock className="w-4 h-4" />}>
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

            <FormField id="notes" label="Observações">
              <textarea
                id="notes"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Detalhes adicionais sobre o evento, repertório desejado, etc."
                className="input-field min-h-[100px] resize-y"
                rows={4}
              />
            </FormField>

            <button
              type="submit"
              disabled={submitting || !selectedMusician}
              className="btn-primary w-full flex items-center justify-center gap-2 min-h-[48px] text-base"
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
        </div>
      </div>
    </ContractorLayout>
  );
}
