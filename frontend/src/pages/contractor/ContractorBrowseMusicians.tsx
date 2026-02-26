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
          className={`w-3 h-3 ${i <= Math.round(rating) ? 'fill-amber-400 text-amber-400' : 'text-gray-200 dark:text-gray-700'}`}
        />
      );
    }
    return stars;
  };

  return (
    <ContractorLayout>
      <div className="page-stack">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={prefersReducedMotion ? { duration: 0.2 } : { duration: 0.3 }}
        >
          <h1 className="text-2xl sm:text-3xl font-heading font-bold text-gray-900 dark:text-white">
            Buscar Músicos
          </h1>
          <p className="text-sm text-muted mt-1">Encontre músicos profissionais para seu evento</p>
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={prefersReducedMotion ? { duration: 0.2 } : { delay: 0.05, duration: 0.3 }}
          className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl p-4 shadow-sm"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar por nome, instrumento..."
                className="input-field pl-10"
              />
            </div>

            <div className="relative">
              <Music className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
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
            className="flex items-center gap-1.5 text-xs font-heading font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors min-h-[44px]"
          >
            <Filter className="w-3.5 h-3.5" />
            Filtros avançados
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform duration-200 ${showFilters ? 'rotate-180' : ''}`}
            />
          </button>

          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              transition={{ duration: 0.2 }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4 pt-4 border-t border-gray-100 dark:border-slate-800"
            >
              <div>
                <label className="block text-xs font-heading font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-1.5">
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
                <label className="block text-xs font-heading font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-1.5">
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
                <label className="block text-xs font-heading font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-1.5">
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
                <label className="block text-xs font-heading font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-1.5">
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
            </motion.div>
          )}
        </motion.div>

        {/* Results */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-72 w-full rounded-2xl" />
            ))}
          </div>
        ) : musicians.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-16 text-center"
          >
            <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-slate-800 flex items-center justify-center mb-4">
              <Users className="w-8 h-8 text-gray-400 dark:text-gray-600" />
            </div>
            <p className="text-base font-heading font-semibold text-gray-900 dark:text-white">
              Nenhum músico encontrado
            </p>
            <p className="text-sm text-muted mt-1">Tente ajustar os filtros de busca</p>
          </motion.div>
        ) : (
          <>
            <p className="text-xs font-heading font-semibold uppercase tracking-widest text-muted">
              {musicians.length} músico{musicians.length !== 1 ? 's' : ''} encontrado
              {musicians.length !== 1 ? 's' : ''}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
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
                    className="rounded-2xl overflow-hidden border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300"
                  >
                    {/* Avatar */}
                    <div className="aspect-[4/3] bg-gradient-to-br from-indigo-500 to-purple-600 overflow-hidden">
                      {musician.avatar_url ? (
                        <img
                          src={musician.avatar_url}
                          alt={musician.full_name}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Music className="w-12 h-12 text-white/40" />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="p-4">
                      <h3 className="text-base font-heading font-bold text-gray-900 dark:text-white truncate">
                        {musician.full_name}
                      </h3>

                      {/* Instruments */}
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {primaryInstrument && (
                          <span className="text-xs bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 px-2 py-0.5 rounded-full font-medium">
                            {formatInstrumentLabel(primaryInstrument)}
                          </span>
                        )}
                        {secondaryInstruments.slice(0, 2).map((inst, idx) => (
                          <span
                            key={idx}
                            className="text-xs bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded-full"
                          >
                            {formatInstrumentLabel(inst)}
                          </span>
                        ))}
                        {secondaryInstruments.length > 2 && (
                          <span className="text-xs text-muted">
                            +{secondaryInstruments.length - 2}
                          </span>
                        )}
                      </div>

                      {/* Location */}
                      {musician.city && musician.state && (
                        <div className="flex items-center gap-1 text-xs text-muted mt-2">
                          <MapPin className="w-3 h-3 flex-shrink-0" />
                          {musician.city} — {musician.state}
                        </div>
                      )}

                      {/* Rating */}
                      {musician.average_rating > 0 && (
                        <div className="flex items-center gap-1.5 mt-2">
                          <div className="flex items-center gap-0.5">
                            {renderStars(musician.average_rating)}
                          </div>
                          <span className="text-xs text-muted">
                            {musician.average_rating.toFixed(1)} ({musician.total_ratings})
                          </span>
                        </div>
                      )}

                      {/* Bio */}
                      {musician.bio && (
                        <p className="text-xs text-muted line-clamp-2 mt-2 leading-relaxed">
                          {musician.bio}
                        </p>
                      )}

                      {/* Actions */}
                      <div className="flex gap-2 mt-4">
                        <Link
                          to={`${CONTRACTOR_ROUTES.newRequest}?musician=${musician.id}`}
                          className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-sm font-semibold flex items-center justify-center gap-1.5 py-2.5 rounded-xl transition-all min-h-[44px]"
                        >
                          <Calendar className="w-3.5 h-3.5" />
                          Solicitar
                        </Link>
                        <Link
                          to={`/musico/${musician.id}`}
                          className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-700 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors min-h-[44px]"
                          aria-label="Ver perfil"
                        >
                          <Eye className="w-4 h-4" />
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
