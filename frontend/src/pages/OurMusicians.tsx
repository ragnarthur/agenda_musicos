// pages/OurMusicians.tsx
// Catálogo público global de músicos
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search,
  MapPin,
  Music,
  Star,
  Users,
  Filter,
  ChevronDown,
  Calendar,
  ArrowLeft,
  Home,
  X,
} from 'lucide-react';
import { allMusiciansService, type MusicianPublic } from '../services/publicApi';
import { BRAZILIAN_STATES } from '../config/cities';
import { formatInstrumentLabel, normalizeInstrumentKey } from '../utils/formatting';
import { usePageMeta } from '../hooks/usePageMeta';
import { showToast } from '../utils/toast';

// Hook de debounce para evitar requisições excessivas
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

type FilterKey = 'search' | 'city' | 'state' | 'instrument' | 'minRating';

export default function OurMusicians() {
  const navigate = useNavigate();
  const [musicians, setMusicians] = useState<MusicianPublic[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [search, setSearch] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [instrument, setInstrument] = useState('');
  const [minRating, setMinRating] = useState('');

  // Debounce nos filtros de texto (400ms)
  const debouncedSearch = useDebounce(search, 400);
  const debouncedCity = useDebounce(city, 400);
  const debouncedInstrument = useDebounce(instrument, 400);

  // UI
  const [showFilters, setShowFilters] = useState(false);

  usePageMeta({
    title: 'Catálogo de Músicos - GigFlow',
    description:
      'Encontre músicos profissionais para seu evento. Filtre por cidade, instrumento e avaliação no catálogo do GigFlow.',
  });

  const loadMusicians = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number | undefined> = {
        search: debouncedSearch || undefined,
        city: debouncedCity || undefined,
        state: state || undefined,
        instrument: debouncedInstrument || undefined,
        min_rating: minRating || undefined,
        limit: 100,
      };
      const data = await allMusiciansService.list(params);
      setMusicians(data);
    } catch (error) {
      console.error('Erro ao carregar músicos:', error);
      showToast.error('Erro ao carregar músicos');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, debouncedCity, state, debouncedInstrument, minRating]);

  useEffect(() => {
    loadMusicians();
  }, [loadMusicians]);

  const activeFilters = useMemo(
    () =>
      [
        search ? { key: 'search' as const, label: 'Busca', value: search } : null,
        city ? { key: 'city' as const, label: 'Cidade', value: city } : null,
        state ? { key: 'state' as const, label: 'Estado', value: state } : null,
        instrument
          ? { key: 'instrument' as const, label: 'Instrumento', value: instrument }
          : null,
        minRating
          ? {
              key: 'minRating' as const,
              label: 'Avaliação',
              value: `${minRating}+ estrelas`,
            }
          : null,
      ].filter(Boolean) as Array<{ key: FilterKey; label: string; value: string }>,
    [search, city, state, instrument, minRating]
  );

  const clearAllFilters = useCallback(() => {
    setSearch('');
    setCity('');
    setState('');
    setInstrument('');
    setMinRating('');
  }, []);

  const removeFilter = useCallback((key: FilterKey) => {
    switch (key) {
      case 'search':
        setSearch('');
        break;
      case 'city':
        setCity('');
        break;
      case 'state':
        setState('');
        break;
      case 'instrument':
        setInstrument('');
        break;
      case 'minRating':
        setMinRating('');
        break;
      default:
        break;
    }
  }, []);

  const handleRequestQuote = (musicianId: number) => {
    navigate(`/musico/${musicianId}`);
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => {
      const index = i + 1;
      return (
        <Star
          key={index}
          className={`w-4 h-4 ${
            index <= Math.round(rating) ? 'fill-amber-400 text-amber-400' : 'text-slate-400/50'
          }`}
        />
      );
    });
  };

  return (
    <div className="min-h-[100svh] bg-[radial-gradient(circle_at_20%_0%,rgba(59,130,246,0.2)_0,rgba(2,6,23,0)_35%),radial-gradient(circle_at_80%_0%,rgba(56,189,248,0.16)_0,rgba(2,6,23,0)_42%),linear-gradient(180deg,#020617_0%,#0b1328_55%,#111c35_100%)]">
      {/* Hero Section */}
      <div className="relative overflow-hidden border-b border-white/10">
        <div className="pointer-events-none absolute inset-0 opacity-20 [background:linear-gradient(90deg,transparent_0,transparent_49%,rgba(148,163,184,.2)_49%,rgba(148,163,184,.2)_51%,transparent_51%,transparent_100%),linear-gradient(transparent_0,transparent_49%,rgba(148,163,184,.2)_49%,rgba(148,163,184,.2)_51%,transparent_51%,transparent_100%)] [background-size:40px_40px]" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
          <div className="flex items-center justify-between gap-3 mb-10">
            <Link
              to="/"
              className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-100 hover:border-white/40 hover:bg-white/10 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar para página inicial
            </Link>

            <Link
              to="/contratante/login"
              className="hidden sm:inline-flex items-center gap-2 rounded-full border border-cyan-300/40 bg-cyan-400/10 px-4 py-2 text-sm font-semibold text-cyan-100 hover:bg-cyan-400/20 transition-colors"
            >
              <Calendar className="w-4 h-4" />
              Sou contratante
            </Link>
          </div>

          <div className="text-center max-w-3xl mx-auto">
            <p className="inline-flex items-center gap-2 rounded-full border border-cyan-300/30 bg-cyan-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.15em] text-cyan-100 mb-6">
              Catálogo público
            </p>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white mb-4 leading-tight">
              Nossos Músicos
            </h1>
            <p className="text-lg sm:text-xl text-slate-200/90 max-w-2xl mx-auto">
              Encontre músicos profissionais por cidade, instrumento e reputação para fechar seu
              evento com segurança.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-10 max-w-3xl mx-auto">
            <div className="rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-left">
              <p className="text-xs uppercase tracking-widest text-slate-300/80">Músicos</p>
              <p className="text-xl font-bold text-white">{musicians.length || '-'}</p>
            </div>
            <div className="rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-left">
              <p className="text-xs uppercase tracking-widest text-slate-300/80">Filtros ativos</p>
              <p className="text-xl font-bold text-white">{activeFilters.length}</p>
            </div>
            <div className="rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-left">
              <p className="text-xs uppercase tracking-widest text-slate-300/80">Resposta</p>
              <p className="text-xl font-bold text-white">{loading ? 'Buscando…' : 'Instantânea'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6 shadow-2xl shadow-black/30">
          <div className="flex items-center justify-between gap-3 mb-4">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 text-white font-semibold"
              aria-expanded={showFilters}
            >
              <Filter className="w-5 h-5" />
              Filtros avançados
              <ChevronDown
                className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`}
              />
            </button>

            {activeFilters.length > 0 && (
              <button
                onClick={clearAllFilters}
                className="inline-flex items-center gap-1 rounded-lg border border-white/20 bg-white/5 px-3 py-1.5 text-sm text-slate-100 hover:bg-white/10 transition-colors"
              >
                <X className="w-4 h-4" />
                Limpar tudo
              </button>
            )}
          </div>

          {/* Busca sempre visível */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por nome, instrumento ou vocalista..."
              className="w-full pl-10 pr-10 py-3 bg-slate-900/40 border border-white/15 rounded-xl text-white placeholder-slate-400 focus:ring-2 focus:ring-cyan-400/70 focus:border-transparent"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-white transition-colors"
                aria-label="Limpar busca"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Filtros avançados */}
          {showFilters && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-200 mb-1">
                  Estado
                </label>
                <select
                  value={state}
                  onChange={e => setState(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-900/40 border border-white/15 rounded-lg text-white focus:ring-2 focus:ring-cyan-400/70 focus:border-transparent"
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
                <label className="block text-sm font-medium text-slate-200 mb-1">
                  Cidade
                </label>
                <input
                  type="text"
                  value={city}
                  onChange={e => setCity(e.target.value)}
                  placeholder="Digite a cidade..."
                  className="w-full px-4 py-2 bg-slate-900/40 border border-white/15 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-cyan-400/70 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-200 mb-1">
                  Instrumento
                </label>
                <input
                  type="text"
                  value={instrument}
                  onChange={e => setInstrument(e.target.value)}
                  placeholder="Ex: Guitarra, Bateria..."
                  className="w-full px-4 py-2 bg-slate-900/40 border border-white/15 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-cyan-400/70 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-200 mb-1">
                  Avaliação Mínima
                </label>
                <select
                  value={minRating}
                  onChange={e => setMinRating(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-900/40 border border-white/15 rounded-lg text-white focus:ring-2 focus:ring-cyan-400/70 focus:border-transparent"
                >
                  <option value="">Todas</option>
                  <option value="3">3+ estrelas</option>
                  <option value="4">4+ estrelas</option>
                  <option value="4.5">4.5+ estrelas</option>
                  <option value="5">5 estrelas</option>
                </select>
              </div>
            </div>
          )}

          {activeFilters.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {activeFilters.map(filter => (
                <button
                  key={filter.key}
                  onClick={() => removeFilter(filter.key)}
                  className="inline-flex items-center gap-1 rounded-full border border-cyan-300/30 bg-cyan-400/10 px-3 py-1 text-xs font-medium text-cyan-100 hover:bg-cyan-400/20 transition-colors"
                >
                  <span>{filter.label}: {filter.value}</span>
                  <X className="w-3 h-3" />
                </button>
              ))}
            </div>
          )}

          {/* Indicador de busca automática */}
          {(search || city || instrument || state || minRating) && (
            <p className="mt-4 text-sm text-slate-300/90 text-center">
              Buscando automaticamente...
            </p>
          )}
        </div>
      </div>

      {/* Lista de músicos */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, index) => (
              <div
                key={index}
                className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden animate-pulse"
              >
                <div className="aspect-square bg-slate-700/30" />
                <div className="p-4 space-y-3">
                  <div className="h-5 w-3/4 bg-slate-700/40 rounded" />
                  <div className="h-4 w-1/2 bg-slate-700/40 rounded" />
                  <div className="h-4 w-2/3 bg-slate-700/40 rounded" />
                  <div className="h-9 w-full bg-slate-700/40 rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        ) : musicians.length === 0 ? (
          <div className="text-center py-14 rounded-2xl border border-white/10 bg-white/5">
            <Users className="w-16 h-16 mx-auto mb-4 text-slate-300/80" />
            <p className="text-xl text-white">Nenhum músico encontrado</p>
            <p className="text-sm text-slate-300/80 mt-2">
              Tente ajustar os filtros de busca
            </p>
            {activeFilters.length > 0 ? (
              <button
                onClick={clearAllFilters}
                className="mt-5 inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/20 transition-colors"
              >
                <X className="w-4 h-4" />
                Limpar filtros
              </button>
            ) : (
              <Link
                to="/"
                className="mt-5 inline-flex items-center gap-2 rounded-lg border border-cyan-300/30 bg-cyan-400/10 px-4 py-2 text-sm font-semibold text-cyan-100 hover:bg-cyan-400/20 transition-colors"
              >
                <Home className="w-4 h-4" />
                Voltar para o início
              </Link>
            )}
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
              <p className="text-slate-200">
                <span className="font-semibold text-white">{musicians.length}</span> músico
                {musicians.length !== 1 ? 's' : ''} encontrado{musicians.length !== 1 ? 's' : ''}
              </p>
              <Link
                to="/"
                className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/5 px-3 py-1.5 text-sm font-medium text-slate-100 hover:bg-white/10 transition-colors"
              >
                <Home className="w-4 h-4" />
                Início
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {musicians.map(musician => {
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
                const visibleSecondary = secondaryInstruments.slice(0, 2);
                const extraCount = secondaryInstruments.length - visibleSecondary.length;

                return (
                  <div
                    key={musician.id}
                    className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden hover:border-cyan-300/40 transition-all hover:-translate-y-1 shadow-2xl shadow-black/30"
                  >
                    {/* Foto/Avatar */}
                    <div className="aspect-square bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center">
                      {musician.avatar_url ? (
                        <img
                          src={musician.avatar_url}
                          alt={musician.full_name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Music className="w-16 h-16 text-white/50" />
                      )}
                    </div>

                    {/* Info */}
                    <div className="p-4">
                      <h3 className="text-lg font-semibold text-white mb-1 truncate">
                        {musician.full_name}
                      </h3>

                      {/* Instrumentos */}
                      <div className="flex items-center gap-1 text-slate-200 text-sm mb-2 flex-wrap">
                        <Music className="w-5 h-5" />
                        {primaryInstrument && (
                          <span>{formatInstrumentLabel(primaryInstrument)}</span>
                        )}
                        {secondaryInstruments.length > 0 && (
                          <>
                            {visibleSecondary.map((inst, idx) => (
                              <span key={idx} className="text-slate-300/85">
                                {idx === 0 ? ' • ' : ', '}
                                {formatInstrumentLabel(inst)}
                              </span>
                            ))}
                            {extraCount > 0 && (
                              <span className="text-slate-300/70">
                                +{extraCount}
                              </span>
                            )}
                          </>
                        )}
                      </div>

                      {/* Localização */}
                      {musician.city && musician.state && (
                        <div className="flex items-center gap-1 text-slate-300/80 text-sm mb-3">
                          <MapPin className="w-4 h-4" />
                          <span>
                            {musician.city} - {musician.state}
                          </span>
                        </div>
                      )}

                      {/* Avaliação */}
                      {musician.average_rating > 0 && (
                        <div className="flex items-center gap-1 mb-4">
                          {renderStars(musician.average_rating)}
                          <span className="text-sm text-slate-300/75 ml-1">
                            ({musician.total_ratings})
                          </span>
                        </div>
                      )}
                      {musician.average_rating <= 0 && (
                        <div className="mb-4 text-sm text-slate-300/75">Sem avaliações ainda</div>
                      )}

                      {/* Bio */}
                      {musician.bio && (
                        <p className="text-sm text-slate-200/90 line-clamp-2 mb-4">
                          {musician.bio}
                        </p>
                      )}

                      {/* Botão */}
                      <button
                        onClick={() => handleRequestQuote(musician.id)}
                        className="w-full px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                      >
                        <Calendar className="w-4 h-4" />
                        Ver perfil e solicitar orçamento
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="text-center mt-12">
              <Link
                to="/"
                className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/10 transition-colors"
              >
                <Home className="w-4 h-4" />
                Voltar para página inicial
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
