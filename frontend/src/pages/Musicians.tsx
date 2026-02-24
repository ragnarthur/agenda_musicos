// pages/Musicians.tsx
import React, { useEffect, useState, useCallback } from 'react';
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
  Star,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Layout from '../components/Layout/Layout';
import PullToRefresh from '../components/common/PullToRefresh';
import InstrumentIcon from '../components/common/InstrumentIcon';
import MiniDatePicker from '../components/musicians/MiniDatePicker';
import EmptyState from '../components/ui/EmptyState';
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
  const initialDate =
    initialDateParam && DATE_QUERY_REGEX.test(initialDateParam) ? initialDateParam : null;
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

  const activeInstrument = selectedInstrument !== 'all' ? selectedInstrument : undefined;
  const isDateFiltered = Boolean(selectedDate);

  // Debounce search input to avoid request spam.
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

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

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
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
                    onChange={event => handleSearchChange(event.target.value)}
                    placeholder="Buscar por nome, usuario ou instrumento"
                    className="w-full rounded-full border border-gray-200 bg-white/80 py-2 pl-9 pr-3 text-sm text-gray-700 shadow-sm focus:border-primary-300 focus:ring-2 focus:ring-primary-200"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Filter bar */}
          <div
            className="card-contrast space-y-3 sticky top-[calc(env(safe-area-inset-top)+56px)] z-20 backdrop-blur-xl"
            data-cascade-ignore
          >
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

            <div className="space-y-1.5">
              <p className="text-xs font-medium text-gray-600">Instrumentos</p>
              <div className="overflow-x-auto pb-1 -mx-1 px-1">
                <div className="flex items-center gap-2 min-w-max">
                  {INSTRUMENT_PILLS.map(option => {
                    const active = option.key === selectedInstrument;
                    return (
                      <button
                        key={option.key}
                        type="button"
                        onClick={() => handleInstrumentSelect(option.key)}
                        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all whitespace-nowrap ${
                          active
                            ? 'border-indigo-300 bg-indigo-500/20 text-indigo-100 shadow-[0_0_22px_rgba(99,102,241,0.3)]'
                            : 'border-white/15 bg-white/5 text-slate-300 hover:border-indigo-300/50 hover:text-indigo-100'
                        }`}
                      >
                        {option.key === 'all' ? (
                          <Users className="h-3.5 w-3.5" />
                        ) : (
                          <InstrumentIcon instrument={option.key} size={14} />
                        )}
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </div>
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
            <div
              className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 px-1"
              data-cascade-ignore
            >
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
                <div
                  key={`skeleton-${idx}`}
                  className="rounded-3xl overflow-hidden border border-white/10 bg-slate-900/55"
                >
                  <div className="aspect-square bg-slate-800/80 animate-pulse" />
                  <div className="p-4 space-y-3">
                    <div className="h-4 w-3/4 rounded-full bg-slate-700/70 animate-pulse" />
                    <div className="h-3 w-1/2 rounded-full bg-slate-700/60 animate-pulse" />
                    <div className="flex gap-2">
                      <div className="h-6 w-20 rounded-full bg-slate-700/60 animate-pulse" />
                      <div className="h-6 w-24 rounded-full bg-slate-700/60 animate-pulse" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : hasError ? (
            <div className="card-contrast bg-red-50/70 border-red-200 text-center dark:bg-red-900/20 dark:border-red-800">
              <p className="text-red-800 dark:text-red-300 mb-4">
                Não foi possível carregar os músicos. Tente novamente.
              </p>
              <button
                onClick={() => (isDateFiltered ? availMutate() : mutate())}
                className="btn-primary"
              >
                Tentar Novamente
              </button>
            </div>
          ) : isDateFiltered ? (
            /* ── Availability mode ── */
            availabilities.length === 0 ? (
              <div className="card-contrast">
                <EmptyState
                  icon={Calendar}
                  title="Nenhum músico disponível nesta data"
                  description={
                    debouncedSearch
                      ? 'Tente ajustar a busca ou remover o filtro de instrumento.'
                      : 'Selecione outra data ou limpe os filtros para ampliar o resultado.'
                  }
                />
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
            <div className="card-contrast">
              <EmptyState
                icon={Users}
                title="Nenhum músico encontrado"
                description="Refine a busca ou troque os filtros de instrumento para expandir os resultados."
              />
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
                const primaryInstrument = instrumentEntries[0]?.[1] ?? musician.instrument;
                const primaryInstrumentLabel = getInstrumentLabel(primaryInstrument, musician);
                const locationLabel =
                  [musician.city, musician.state].filter(Boolean).join(' · ') ||
                  'Localização não informada';
                const rating =
                  musician.average_rating != null
                    ? Number(musician.average_rating).toFixed(1)
                    : null;

                return (
                  <motion.div
                    key={musician.id}
                    variants={cardItem}
                    whileHover={{ y: -6, scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    className="group relative"
                  >
                    <span className="pointer-events-none absolute -inset-px rounded-3xl bg-gradient-to-r from-indigo-500/20 via-cyan-400/10 to-emerald-400/20 opacity-0 blur-xl transition-opacity duration-500 group-hover:opacity-100" />
                    <Link
                      to={`/musicos/${musician.id}`}
                      className="relative block cursor-pointer overflow-hidden rounded-3xl border border-white/10 bg-slate-900/70 hover:border-indigo-300/40 hover:shadow-2xl hover:shadow-indigo-950/30 transition-all"
                    >
                      <div className="relative aspect-square overflow-hidden bg-gradient-to-br from-indigo-950 via-slate-900 to-cyan-950">
                        {avatarUrl ? (
                          <img
                            src={avatarUrl}
                            alt={musician.full_name}
                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center text-6xl">
                            {emoji}
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                        <div className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-black/45 border border-white/20 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur">
                          <InstrumentIcon instrument={primaryInstrument} size={14} />
                          {primaryInstrumentLabel}
                        </div>
                        {rating && (
                          <div className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-amber-400/90 text-amber-950 px-2.5 py-1 text-[11px] font-bold">
                            <Star className="h-3.5 w-3.5 fill-amber-700 text-amber-700" />
                            {rating}
                          </div>
                        )}
                      </div>

                      <div className="p-4">
                        <h3 className="font-semibold text-white leading-snug">
                          {musician.full_name}
                        </h3>
                        <p className="text-sm text-slate-300 mt-1">
                          {primaryInstrumentLabel} · {locationLabel}
                        </p>

                        {musician.bio && (
                          <p className="text-sm text-slate-400 mt-2 line-clamp-2">{musician.bio}</p>
                        )}

                        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-400">
                          {username && (
                            <span className="inline-flex items-center gap-1">
                              <Instagram className="h-3.5 w-3.5" />@{username.replace('@', '')}
                            </span>
                          )}
                          {musician.phone && (
                            <span className="inline-flex items-center gap-1">
                              <Phone className="h-3.5 w-3.5" />
                              {musician.phone}
                            </span>
                          )}
                          {contactEmail && (
                            <span className="inline-flex items-center gap-1">
                              <Mail className="h-3.5 w-3.5" />
                              {contactEmail}
                            </span>
                          )}
                          {!username && !musician.phone && !contactEmail && (
                            <span className="text-slate-500">Perfil com contato via app</span>
                          )}
                        </div>

                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {instrumentEntries.slice(0, 4).map(([normalizedKey, rawInstrument]) => (
                            <span
                              key={normalizedKey}
                              className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-slate-300"
                            >
                              <InstrumentIcon instrument={rawInstrument} size={12} />
                              {getInstrumentLabel(rawInstrument, musician)}
                            </span>
                          ))}
                        </div>

                        <div className="mt-3 pt-2 border-t border-white/10">
                          <span className="text-xs text-indigo-300 font-medium group-hover:text-indigo-200">
                            Ver perfil completo →
                          </span>
                        </div>
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
