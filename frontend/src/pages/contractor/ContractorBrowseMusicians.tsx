import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  MapPin,
  Music,
  Star,
  Users,
  Filter,
  ChevronDown,
  Calendar,
  Eye,
} from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import ContractorLayout from '../../components/contractor/ContractorLayout';
import Skeleton from '../../components/common/Skeleton';
import {
  allMusiciansService,
  publicMusicGenresService,
  type MusicianPublic,
} from '../../services/publicApi';
import { BRAZILIAN_STATES } from '../../config/cities';
import { MUSICAL_GENRES, getGenreLabel } from '../../config/genres';
import { formatInstrumentLabel, normalizeInstrumentKey } from '../../utils/formatting';
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

export default function ContractorBrowseMusicians() {
  const prefersReducedMotion = useReducedMotion();
  const [musicians, setMusicians] = useState<MusicianPublic[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [instrument, setInstrument] = useState('');
  const [genre, setGenre] = useState('');
  const [availableGenres, setAvailableGenres] = useState<string[]>([]);
  const [minRating, setMinRating] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const debouncedSearch = useDebounce(search, 400);
  const debouncedCity = useDebounce(city, 400);
  const debouncedInstrument = useDebounce(instrument, 400);

  useEffect(() => {
    let active = true;
    publicMusicGenresService
      .listAvailable()
      .then(genres => {
        if (!active) return;
        setAvailableGenres(genres);
      })
      .catch(() => {
        // Fallback: mostra a lista fixa caso a API ainda não esteja disponível
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

  const loadMusicians = useCallback(async () => {
    setLoading(true);
    try {
      const data = await allMusiciansService.list({
        search: debouncedSearch || undefined,
        city: debouncedCity || undefined,
        state: state || undefined,
        instrument: debouncedInstrument || undefined,
        genre: genre || undefined,
        min_rating: minRating || undefined,
        limit: 100,
      });
      setMusicians(data);
    } catch (error) {
      showToast.apiError(error);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, debouncedCity, state, debouncedInstrument, genre, minRating]);

  useEffect(() => {
    loadMusicians();
  }, [loadMusicians]);

  const renderStars = (rating: number) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Star
          key={i}
          className={`w-3.5 h-3.5 ${i <= Math.round(rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300 dark:text-gray-600'}`}
        />
      );
    }
    return stars;
  };

  return (
    <ContractorLayout>
      <div className="page-stack">
        {/* Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
            Buscar Músicos
          </h1>
          <p className="text-sm text-muted mt-1">Encontre músicos profissionais para seu evento</p>
        </div>

        {/* Filters */}
        <div className="card-contrast">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar por nome, instrumento..."
                className="input-field pl-10"
              />
            </div>

            <div className="relative">
              <Music className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <select
                value={genre}
                onChange={e => setGenre(e.target.value)}
                className="input-field pl-10"
              >
                <option value="">Todos os estilos</option>
                {genreOptions.map(value => (
                  <option key={value} value={value}>
                    {getGenreLabel(value)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 min-h-[44px]"
          >
            <Filter className="w-4 h-4" />
            Filtros avançados
            <ChevronDown
              className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`}
            />
          </button>

          {showFilters && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Estado
                </label>
                <select
                  value={state}
                  onChange={e => setState(e.target.value)}
                  className="input-field"
                >
                  <option value="">Todos</option>
                  {BRAZILIAN_STATES.map(({ value, label }) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Cidade
                </label>
                <input
                  type="text"
                  value={city}
                  onChange={e => setCity(e.target.value)}
                  placeholder="Digite a cidade..."
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Instrumento
                </label>
                <input
                  type="text"
                  value={instrument}
                  onChange={e => setInstrument(e.target.value)}
                  placeholder="Ex: Guitarra, Bateria..."
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Avaliação Mínima
                </label>
                <select
                  value={minRating}
                  onChange={e => setMinRating(e.target.value)}
                  className="input-field"
                >
                  <option value="">Todas</option>
                  <option value="3">3+ estrelas</option>
                  <option value="4">4+ estrelas</option>
                  <option value="4.5">4.5+ estrelas</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Results */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-80 w-full rounded-2xl" />
            ))}
          </div>
        ) : musicians.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Users className="w-16 h-16 text-gray-400 dark:text-gray-600 mb-4" />
            <p className="text-lg font-semibold text-gray-900 dark:text-white">
              Nenhum músico encontrado
            </p>
            <p className="text-sm text-muted mt-1">Tente ajustar os filtros de busca</p>
          </div>
        ) : (
          <>
            <p className="text-sm text-muted">
              {musicians.length} músico{musicians.length !== 1 ? 's' : ''} encontrado
              {musicians.length !== 1 ? 's' : ''}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {musicians.map((musician, index) => {
                const normalizedInstruments = Array.from(
                  new Set(
                    (musician.instruments || [])
                      .map(inst => normalizeInstrumentKey(inst))
                      .filter(Boolean)
                  )
                );
                const primaryInstrument =
                  normalizeInstrumentKey(musician.instrument) || normalizedInstruments[0] || '';
                const secondaryInstruments = normalizedInstruments.filter(
                  inst => inst && inst !== primaryInstrument
                );

                return (
                  <motion.div
                    key={musician.id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      delay: prefersReducedMotion ? 0 : Math.min(index * 0.04, 0.4),
                      duration: 0.3,
                    }}
                    className="card-contrast overflow-hidden hover:shadow-xl transition-all"
                  >
                    {/* Avatar */}
                    <div className="aspect-[4/3] bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center -mx-4 sm:-mx-6 -mt-4 sm:-mt-6">
                      {musician.avatar_url ? (
                        <img
                          src={musician.avatar_url}
                          alt={musician.full_name}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <Music className="w-14 h-14 text-white/50" />
                      )}
                    </div>

                    {/* Info */}
                    <div className="pt-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                        {musician.full_name}
                      </h3>

                      <div className="flex items-center gap-1 text-sm text-muted mt-1 flex-wrap">
                        <Music className="w-4 h-4" />
                        {primaryInstrument && (
                          <span>{formatInstrumentLabel(primaryInstrument)}</span>
                        )}
                        {secondaryInstruments.slice(0, 2).map((inst, idx) => (
                          <span key={idx} className="text-gray-400">
                            {idx === 0 ? ' · ' : ', '}
                            {formatInstrumentLabel(inst)}
                          </span>
                        ))}
                        {secondaryInstruments.length > 2 && (
                          <span className="text-gray-400">+{secondaryInstruments.length - 2}</span>
                        )}
                      </div>

                      {musician.city && musician.state && (
                        <div className="flex items-center gap-1 text-sm text-muted mt-1">
                          <MapPin className="w-3.5 h-3.5" />
                          {musician.city} - {musician.state}
                        </div>
                      )}

                      {musician.average_rating > 0 && (
                        <div className="flex items-center gap-1 mt-2">
                          {renderStars(musician.average_rating)}
                          <span className="text-xs text-muted ml-1">
                            ({musician.total_ratings})
                          </span>
                        </div>
                      )}

                      {musician.bio && (
                        <p className="text-sm text-muted line-clamp-2 mt-2">{musician.bio}</p>
                      )}

                      {/* Actions */}
                      <div className="flex gap-2 mt-4">
                        <Link
                          to={`${CONTRACTOR_ROUTES.newRequest}?musician=${musician.id}`}
                          className="flex-1 btn-primary text-sm flex items-center justify-center gap-1.5 min-h-[44px]"
                        >
                          <Calendar className="w-4 h-4" />
                          Solicitar
                        </Link>
                        <Link
                          to={`/musico/${musician.id}`}
                          className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors min-h-[44px]"
                        >
                          <Eye className="w-4 h-4" />
                          Perfil
                        </Link>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </ContractorLayout>
  );
}
