// pages/Musicians.tsx
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, Music, Phone, Mail, Instagram, Search } from 'lucide-react';
import { motion } from 'framer-motion';
import Layout from '../components/Layout/Layout';
import { useMusiciansPaginated } from '../hooks/useMusicians';
import type { Musician } from '../types';
import { formatInstrumentLabel, getMusicianInstruments } from '../utils/formatting';

const Musicians: React.FC = () => {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);

  // Debounce search and reset page
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      setDebouncedSearch(search.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { musicians, count, hasNext, hasPrevious, isLoading, error, mutate } =
    useMusiciansPaginated({
      page,
      search: debouncedSearch || undefined,
    });

  const getInstrumentEmoji = (instrument: string, bio?: string) => {
    // Se é vocalista e a bio menciona violão/violonista, mostra emoji combinado
    if (instrument === 'vocal' && bio?.toLowerCase().includes('violon')) {
      return '🎤🎸';
    }

    const emojis: Record<string, string> = {
      vocal: '🎤',
      guitar: '🎸',
      bass: '🎸',
      drums: '🥁',
      keyboard: '🎹',
      percussion: '🥁',
    };
    return emojis[instrument] || '🎵';
  };

  const getInstrumentLabel = (instrument: string) => {
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
      producer: 'Produtor(a)',
      other: 'Outro',
    };
    return displayMap[instrument] || formatInstrumentLabel(instrument);
  };

  const cardGrid = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.12, delayChildren: 0.08 } },
  };

  const cardItem = {
    hidden: { opacity: 0, y: 16 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  };

  return (
    <Layout>
      <div className="page-stack">
        {/* Header */}
        <div className="hero-panel">
          <div className="pointer-events-none absolute inset-0 -z-10 opacity-40 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.2),_transparent_40%)]" />
          <div className="flex items-start justify-between gap-4 flex-col sm:flex-row sm:items-center">
            <div className="flex items-center space-x-3">
              <div className="bg-primary-100/70 p-3 rounded-lg shadow-inner">
                <Users className="h-8 w-8 text-primary-700" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Músicos profissionais</h1>
                <p className="text-gray-600 text-sm sm:text-base">
                  Perfis completos com contatos, redes e disponibilidade para formar a equipe ideal.
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

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4 sm:gap-6">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div key={`musician-skeleton-${idx}`} className="card-contrast space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-gray-200 animate-pulse" />
                  <div className="space-y-2 flex-1">
                    <div className="h-4 w-32 rounded-full bg-gray-200 animate-pulse" />
                    <div className="h-3 w-24 rounded-full bg-gray-200 animate-pulse" />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="h-3 w-full rounded-full bg-gray-200 animate-pulse" />
                  <div className="h-3 w-5/6 rounded-full bg-gray-200 animate-pulse" />
                </div>
                <div className="flex gap-2">
                  <div className="h-6 w-20 rounded-full bg-gray-200 animate-pulse" />
                  <div className="h-6 w-24 rounded-full bg-gray-200 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="card-contrast bg-red-50/70 border-red-200 text-center">
            <p className="text-red-800 mb-4">
              Não foi possível carregar os músicos. Tente novamente.
            </p>
            <button onClick={() => mutate()} className="btn-primary">
              Tentar Novamente
            </button>
          </div>
        ) : musicians.length === 0 ? (
          <div className="card-contrast text-center">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">Nenhum músico cadastrado</p>
          </div>
        ) : (
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4 sm:gap-6"
            variants={cardGrid}
            initial="hidden"
            animate="show"
          >
            {musicians.map((musician: Musician) => {
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
                      {getMusicianInstruments(musician).map(inst => (
                        <span
                          key={inst}
                          className="status-chip default transition-transform duration-400 group-hover:-translate-y-0.5"
                        >
                          {getInstrumentLabel(inst)}
                        </span>
                      ))}
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </motion.div>
        )}

        {/* Informação */}
        {!isLoading && musicians.length > 0 && (
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
    </Layout>
  );
};

export default Musicians;
