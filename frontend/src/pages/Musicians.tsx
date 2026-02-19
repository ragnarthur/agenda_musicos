// pages/Musicians.tsx
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Users,
  Music,
  Phone,
  Mail,
  Instagram,
  Search,
  Calendar,
  Clock,
  ExternalLink,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Layout from '../components/Layout/Layout';
import PullToRefresh from '../components/common/PullToRefresh';
import MiniDatePicker from '../components/musicians/MiniDatePicker';
import { useMusiciansPaginated, useAvailabilitiesForDate } from '../hooks/useMusicians';
import type { Musician, LeaderAvailability } from '../types';
import {
  formatInstrumentLabel,
  getMusicianInstruments,
  normalizeInstrumentKey,
} from '../utils/formatting';

const INSTRUMENT_PILLS: { key: string; label: string }[] = [
  { key: 'all', label: 'Todos' },
  { key: 'vocal', label: 'Vocalista' },
  { key: 'guitar', label: 'Guitarrista' },
  { key: 'acoustic_guitar', label: 'Violonista' },
  { key: 'bass', label: 'Baixista' },
  { key: 'drums', label: 'Baterista' },
  { key: 'keyboard', label: 'Tecladista' },
  { key: 'cajon', label: 'Cajón' },
  { key: 'saxophone', label: 'Saxofonista' },
  { key: 'violin', label: 'Violinista' },
  { key: 'percussion', label: 'Percussionista' },
];

const INSTRUMENT_KEYS = new Set(INSTRUMENT_PILLS.map(pill => pill.key));
const DATE_QUERY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const parsePositiveInt = (value: string | null, fallback = 1): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.floor(parsed);
};

const Musicians: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialSearch = searchParams.get('q')?.trim() ?? '';
  const initialDateParam = searchParams.get('date');
  const initialDate = initialDateParam && DATE_QUERY_REGEX.test(initialDateParam) ? initialDateParam : null;
  const initialInstrumentParam = searchParams.get('instrument');
  const initialInstrument =
    initialInstrumentParam && INSTRUMENT_KEYS.has(initialInstrumentParam)
      ? initialInstrumentParam
      : 'all';
  const initialPage = parsePositiveInt(searchParams.get('page'), 1);

  const [search, setSearch] = useState(initialSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch);
  const [page, setPage] = useState(initialDate ? 1 : initialPage);
  const [selectedDate, setSelectedDate] = useState<string | null>(initialDate);
  const [selectedInstrument, setSelectedInstrument] = useState(initialInstrument);
  const isFirstDebounce = useRef(true);

  const activeInstrument = selectedInstrument !== 'all' ? selectedInstrument : undefined;
  const isDateFiltered = Boolean(selectedDate);

  // Debounce search input to avoid request spam.
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (isFirstDebounce.current) {
      isFirstDebounce.current = false;
      return;
    }
    setPage(1);
  }, [debouncedSearch]);

  const { musicians, count, hasNext, hasPrevious, isLoading, error, mutate } =
    useMusiciansPaginated({
      page,
      search: debouncedSearch || undefined,
      instrument: !selectedDate ? activeInstrument : undefined,
    });

  const {
    availabilities,
    isLoading: availLoading,
    error: availError,
    mutate: availMutate,
  } = useAvailabilitiesForDate(selectedDate, activeInstrument, debouncedSearch || undefined);

  const handleRefresh = useCallback(async () => {
    if (isDateFiltered) {
      await availMutate();
      return;
    }
    await mutate();
  }, [isDateFiltered, availMutate, mutate]);

  const handleDateSelect = useCallback((date: string) => {
    setSelectedDate(date);
  }, []);

  const handleClearDate = useCallback(() => {
    setSelectedDate(null);
  }, []);

  const handleInstrumentSelect = useCallback((key: string) => {
    setSelectedInstrument(key);
    setPage(1);
  }, []);

  useEffect(() => {
    const nextParams = new URLSearchParams();
    const trimmedSearch = search.trim();

    if (trimmedSearch) nextParams.set('q', trimmedSearch);
    if (selectedInstrument !== 'all') nextParams.set('instrument', selectedInstrument);
    if (selectedDate) nextParams.set('date', selectedDate);
    if (!selectedDate && page > 1) nextParams.set('page', String(page));

    if (nextParams.toString() !== searchParams.toString()) {
      setSearchParams(nextParams, { replace: true });
    }
  }, [search, selectedInstrument, selectedDate, page, searchParams, setSearchParams]);

  const getInstrumentEmoji = (instrument?: string, bio?: string) => {
    const key = normalizeInstrumentKey(instrument);
    if (key === 'vocal' && bio?.toLowerCase().includes('violon')) {
      return '🎤🎸';
    }
    const emojis: Record<string, string> = {
      vocal: '🎤',
      guitar: '🎸',
      acoustic_guitar: '🎸',
      bass: '🎸',
      drums: '🥁',
      keyboard: '🎹',
      percussion: '🥁',
    };
    return emojis[key] || '🎵';
  };

  const getMusicianGender = (musician: Musician): string | null => {
    const musicianWithGender = musician as Musician & {
      gender?: string | null;
      sex?: string | null;
      user?: Musician['user'] & { gender?: string | null; sex?: string | null };
    };
    return (
      musicianWithGender.gender ||
      musicianWithGender.sex ||
      musicianWithGender.user?.gender ||
      musicianWithGender.user?.sex ||
      null
    );
  };

  const getInstrumentLabel = (instrument: string, musician: Musician) => {
    const key = normalizeInstrumentKey(instrument);
    if (key === 'producer') {
      return formatInstrumentLabel(instrument, { gender: getMusicianGender(musician) });
    }
    const displayMap: Record<string, string> = {
      vocal: 'Vocalista',
      guitar: 'Guitarrista',
      acoustic_guitar: 'Violonista',
      bass: 'Baixista',
      drums: 'Baterista',
      keyboard: 'Tecladista',
      piano: 'Pianista',
      synth: 'Sintetizador',
      percussion: 'Percussionista',
      cajon: 'Cajón',
      violin: 'Violinista',
      viola: 'Viola',
      cello: 'Violoncelista',
      double_bass: 'Contrabaixista',
      saxophone: 'Saxofonista',
      trumpet: 'Trompetista',
      trombone: 'Trombonista',
      flute: 'Flautista',
      clarinet: 'Clarinetista',
      harmonica: 'Gaitista',
      ukulele: 'Ukulele',
      banjo: 'Banjo',
      mandolin: 'Bandolinista',
      dj: 'DJ',
      other: 'Outro',
    };
    return displayMap[key] || formatInstrumentLabel(instrument);
  };

  const formatDateLabel = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), "EEE',' d 'de' MMM", { locale: ptBR });
    } catch {
      return dateStr;
    }
  };

  const cardGrid = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.04, delayChildren: 0 } },
  };

  const cardItem = {
    hidden: { opacity: 0, y: 16 },
    show: { opacity: 1, y: 0, transition: { duration: 0.25 } },
  };

  const isLoaderActive = isDateFiltered ? availLoading : isLoading;
  const hasError = isDateFiltered ? availError : error;

  return (
    <Layout>
      <PullToRefresh onRefresh={handleRefresh} disabled={isLoaderActive}>
        <div className="page-stack">
          {/* Header */}
          <div className="hero-panel" data-cascade-ignore>
            <div className="pointer-events-none absolute inset-0 -z-10 opacity-40 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.2),_transparent_40%)]" />
            <div className="flex items-start justify-between gap-4 flex-col sm:flex-row sm:items-center">
              <div className="flex items-center space-x-3">
                <div className="bg-primary-100/70 p-3 rounded-lg shadow-inner">
                  <Users className="h-8 w-8 text-primary-700" />
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                    Músicos profissionais
                  </h1>
                  <p className="text-gray-600 text-sm sm:text-base">
                    Perfis completos com contatos, redes e disponibilidade para formar a equipe
                    ideal.
                  </p>
                </div>
              </div>
              <div className="flex flex-col gap-3 w-full sm:w-auto">
                <div className="text-sm text-gray-600 flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Conecte, convide e organize equipes com agilidade</span>
                </div>
                <div className="relative w-full sm:w-72">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    value={search}
                    onChange={event => setSearch(event.target.value)}
                    placeholder="Buscar por nome, usuario ou instrumento"
                    className="w-full rounded-full border border-gray-200 bg-white/80 py-2 pl-9 pr-3 text-sm text-gray-700 shadow-sm focus:border-primary-300 focus:ring-2 focus:ring-primary-200"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Filter bar */}
          <div className="card-contrast space-y-3" data-cascade-ignore>
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
              Use o mini-calendário para filtrar músicos disponíveis por data. Toque ou clique no
              mesmo dia novamente para limpar.
            </p>

            {/* Mini calendar — sempre visível */}
            <MiniDatePicker
              selectedDate={selectedDate}
              onDateSelect={handleDateSelect}
              onClear={handleClearDate}
            />

            {/* Instrument select (alternativa aos chips para reduzir poluicao visual e custo de render) */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="instrument-filter" className="text-xs font-medium text-gray-600">
                Instrumento
              </label>
              <select
                id="instrument-filter"
                value={selectedInstrument}
                onChange={event => handleInstrumentSelect(event.target.value)}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-primary-300 focus:ring-2 focus:ring-primary-200 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
              >
                {INSTRUMENT_PILLS.map(option => (
                  <option key={option.key} value={option.key}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            {(selectedDate || selectedInstrument !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  handleClearDate();
                  setSelectedInstrument('all');
                }}
                className="text-xs text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400 transition-colors"
              >
                Limpar filtros
              </button>
            )}
          </div>

          {/* Date filter result header */}
          {isDateFiltered && !availLoading && !availError && (
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 px-1" data-cascade-ignore>
              <Calendar className="h-4 w-4 text-primary-500" />
              <span>
                <span className="font-semibold text-gray-800 dark:text-gray-200">
                  {availabilities.length}
                </span>{' '}
                músico{availabilities.length !== 1 ? 's' : ''} disponíve
                {availabilities.length !== 1 ? 'is' : 'l'} em{' '}
                <span className="font-medium capitalize">{formatDateLabel(selectedDate!)}</span>
              </span>
            </div>
          )}

          {/* Content */}
          {isLoaderActive ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4 sm:gap-6">
              {Array.from({ length: 6 }).map((_, idx) => (
                <div key={`skeleton-${idx}`} className="card-contrast space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-gray-200 animate-pulse dark:bg-gray-700" />
                    <div className="space-y-2 flex-1">
                      <div className="h-4 w-32 rounded-full bg-gray-200 animate-pulse dark:bg-gray-700" />
                      <div className="h-3 w-24 rounded-full bg-gray-200 animate-pulse dark:bg-gray-700" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="h-3 w-full rounded-full bg-gray-200 animate-pulse dark:bg-gray-700" />
                    <div className="h-3 w-5/6 rounded-full bg-gray-200 animate-pulse dark:bg-gray-700" />
                  </div>
                  <div className="flex gap-2">
                    <div className="h-6 w-20 rounded-full bg-gray-200 animate-pulse dark:bg-gray-700" />
                    <div className="h-6 w-24 rounded-full bg-gray-200 animate-pulse dark:bg-gray-700" />
                  </div>
                </div>
              ))}
            </div>
          ) : hasError ? (
            <div className="card-contrast bg-red-50/70 border-red-200 text-center dark:bg-red-900/20 dark:border-red-800">
              <p className="text-red-800 dark:text-red-300 mb-4">
                Não foi possível carregar os músicos. Tente novamente.
              </p>
              <button onClick={() => (isDateFiltered ? availMutate() : mutate())} className="btn-primary">
                Tentar Novamente
              </button>
            </div>
          ) : isDateFiltered ? (
            /* ── Availability mode ── */
            availabilities.length === 0 ? (
              <div className="card-contrast text-center space-y-2">
                <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-700 dark:text-gray-300 font-medium">
                  Nenhum músico registrou disponibilidade para essa data
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {debouncedSearch
                    ? 'Tente ajustar a busca ou remover o filtro de instrumento.'
                    : 'Tente selecionar outra data ou remover o filtro de instrumento.'}
                </p>
              </div>
            ) : (
              <motion.div
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4 sm:gap-6"
                variants={cardGrid}
                initial="hidden"
                animate="show"
              >
                {availabilities.map((avail: LeaderAvailability) => (
                  <motion.div key={avail.id} variants={cardItem} whileHover={{ y: -4 }}>
                    <Link
                      to={`/musicos/${avail.leader}`}
                      className="card-contrast hover:shadow-xl transition-all block group"
                    >
                      {/* Header */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="h-11 w-11 rounded-full overflow-hidden bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center text-xl flex-shrink-0">
                            {avail.leader_avatar_url ? (
                              <img
                                src={avail.leader_avatar_url}
                                alt={avail.leader_name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <span>🎵</span>
                            )}
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900 dark:text-white leading-snug">
                              {avail.leader_name}
                            </h3>
                            {avail.leader_instrument_display && (
                              <p className="text-sm text-primary-600 dark:text-primary-400 font-medium">
                                {avail.leader_instrument_display}
                              </p>
                            )}
                          </div>
                        </div>
                        <ExternalLink className="h-4 w-4 text-gray-400 group-hover:text-primary-500 transition-colors mt-0.5 flex-shrink-0" />
                      </div>

                      {/* Time slot */}
                      <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg px-3 py-2 mb-3">
                        <Clock className="h-4 w-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                        <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                          {avail.start_time?.slice(0, 5)} – {avail.end_time?.slice(0, 5)}
                        </span>
                      </div>

                      {/* Notes */}
                      {avail.notes && (
                        <div className="flex items-start gap-2 text-gray-600 dark:text-gray-400">
                          <Music className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                          <span className="text-sm line-clamp-2">{avail.notes}</span>
                        </div>
                      )}

                      {/* Footer */}
                      <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                        <span className="text-xs text-primary-600 dark:text-primary-400 font-medium group-hover:underline">
                          Ver perfil completo →
                        </span>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </motion.div>
            )
          ) : musicians.length === 0 ? (
            <div className="card-contrast text-center">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 dark:text-gray-400">Nenhum músico cadastrado</p>
            </div>
          ) : (
            /* ── Normal paginated mode ── */
            <motion.div
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4 sm:gap-6"
              variants={cardGrid}
              initial="hidden"
              animate="show"
            >
              {musicians.map((musician: Musician) => {
                const instrumentEntries = Array.from(
                  getMusicianInstruments(musician).reduce((map, inst) => {
                    const rawInstrument = inst?.trim();
                    if (!rawInstrument) return map;
                    const normalized = normalizeInstrumentKey(rawInstrument);
                    if (!normalized) return map;
                    if (!map.has(normalized)) {
                      map.set(normalized, rawInstrument);
                    }
                    return map;
                  }, new Map<string, string>())
                );
                const emoji = getInstrumentEmoji(musician.instrument, musician.bio);
                const username = musician.instagram || musician.user?.username || '';
                const contactEmail = musician.public_email || musician.user?.email || '';
                const avatarUrl = musician.avatar_url;
                return (
                  <motion.div
                    key={musician.id}
                    variants={cardItem}
                    whileHover={{ y: -6, scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    className="group relative"
                  >
                    <span className="pointer-events-none absolute -inset-px rounded-3xl bg-gradient-to-r from-primary-500/10 via-emerald-400/5 to-sky-400/10 opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100" />
                    <Link
                      to={`/musicos/${musician.id}`}
                      className="relative card-contrast hover:shadow-2xl transition-all block cursor-pointer overflow-hidden"
                    >
                      <span className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100">
                        <span className="absolute -left-1/2 top-0 h-full w-1/2 bg-gradient-to-r from-transparent via-white/15 to-transparent opacity-40 transition-transform duration-900 group-hover:translate-x-[180%]" />
                      </span>
                      {/* Header do Card */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className="h-12 w-12 rounded-full overflow-hidden bg-primary-100 transition-transform duration-400 group-hover:-translate-y-0.5 group-hover:scale-105 flex items-center justify-center">
                            {avatarUrl ? (
                              <img
                                src={avatarUrl}
                                alt={musician.full_name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <span className="text-2xl">{emoji}</span>
                            )}
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900 flex items-center space-x-2">
                              <span>{musician.full_name}</span>
                            </h3>
                            {username && (
                              <p className="text-sm text-gray-600">@{username.replace('@', '')}</p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Informações */}
                      <div className="space-y-3">
                        {musician.bio && (
                          <div className="flex items-center space-x-2 text-gray-700">
                            <Music className="h-4 w-4 text-primary-600 transition-transform duration-400 group-hover:scale-105" />
                            <span className="text-sm font-medium">{musician.bio}</span>
                          </div>
                        )}

                        {musician.phone && (
                          <div className="flex items-center space-x-2 text-gray-600">
                            <Phone className="h-4 w-4 transition-transform duration-400 group-hover:scale-105" />
                            <span className="text-sm">{musician.phone}</span>
                          </div>
                        )}

                        {contactEmail && (
                          <div className="flex items-center space-x-2 text-gray-600">
                            <Mail className="h-4 w-4 transition-transform duration-400 group-hover:scale-105" />
                            <span className="text-sm">{contactEmail}</span>
                          </div>
                        )}

                        {musician.instagram && (
                          <div className="flex items-center space-x-2 text-gray-600">
                            <Instagram className="h-4 w-4 transition-transform duration-400 group-hover:scale-105" />
                            <span className="text-sm">{musician.instagram}</span>
                          </div>
                        )}
                      </div>

                      {/* Badges de Instrumentos */}
                      <div className="mt-4 flex flex-wrap gap-2">
                        {instrumentEntries.map(([normalizedKey, rawInstrument]) => (
                          <span
                            key={normalizedKey}
                            className="status-chip default transition-transform duration-400 group-hover:-translate-y-0.5"
                          >
                            {getInstrumentLabel(rawInstrument, musician)}
                          </span>
                        ))}
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </motion.div>
          )}

          {/* Pagination footer — only in normal mode */}
          {!isDateFiltered && !isLoading && musicians.length > 0 && (
            <div className="card-contrast space-y-3">
              <div className="flex items-start space-x-3">
                <Users className="h-5 w-5 text-primary-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-primary-800">
                    Total: {count || musicians.length} músico
                    {(count || musicians.length) !== 1 ? 's' : ''}
                  </p>
                  <p className="text-sm text-primary-700 mt-1">
                    Todos os músicos podem se conectar para formar duos e trios, com contatos
                    disponíveis para combinar diretamente.
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <p className="text-sm text-gray-600">Página {page}</p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setPage(prev => Math.max(1, prev - 1))}
                    disabled={!hasPrevious || page === 1}
                  >
                    Anterior
                  </button>
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={() => setPage(prev => prev + 1)}
                    disabled={!hasNext}
                  >
                    Proxima
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </PullToRefresh>
    </Layout>
  );
};

export default Musicians;
