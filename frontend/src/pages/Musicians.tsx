// pages/Musicians.tsx
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, Music, Phone, Mail, Instagram } from 'lucide-react';
import { motion } from 'framer-motion';
import Layout from '../components/Layout/Layout';
import Loading from '../components/common/Loading';
import { musicianService } from '../services/api';
import type { Musician } from '../types';

const Musicians: React.FC = () => {
  const [musicians, setMusicians] = useState<Musician[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log('🎵 Componente Musicians montado');
    loadMusicians();
  }, []);

  const loadMusicians = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await musicianService.getAll();
      console.log('Músicos carregados:', data);
      setMusicians(data);
    } catch (error) {
      console.error('Erro ao carregar músicos:', error);
      setError('Não foi possível carregar os músicos. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

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
    };
    // Se não encontrar no mapa, capitaliza o próprio valor (para instrumentos customizados)
    return displayMap[instrument] || instrument.charAt(0).toUpperCase() + instrument.slice(1);
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
      <div className="space-y-6">
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
            <div className="text-sm text-gray-600 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Conecte, convide e organize equipes com agilidade</span>
            </div>
          </div>
        </div>

        {loading ? (
          <Loading text="Carregando músicos..." />
        ) : error ? (
          <div className="card-contrast bg-red-50/70 border-red-200 text-center">
            <p className="text-red-800 mb-4">{error}</p>
            <button onClick={loadMusicians} className="btn-primary">
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
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            variants={cardGrid}
            initial="hidden"
            animate="show"
          >
            {musicians.map((musician) => {
              const emoji = getInstrumentEmoji(musician.instrument, musician.bio);
              const username = musician.instagram || musician.user.username;
              const contactEmail = musician.public_email || musician.user.email;
              const instrumentLabel = getInstrumentLabel(musician.instrument);
              return (
                <motion.div
                  key={musician.id}
                  variants={cardItem}
                  whileHover={{ y: -6, scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  className="group relative"
                >
                  <span className="pointer-events-none absolute -inset-px rounded-3xl bg-gradient-to-r from-primary-500/20 via-emerald-400/10 to-sky-400/20 opacity-0 blur-xl transition-opacity duration-300 group-hover:opacity-100" />
                  <Link
                    to={`/musicos/${musician.id}`}
                    className="relative card-contrast hover:shadow-2xl transition-all block cursor-pointer overflow-hidden"
                  >
                    <span className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                      <span className="absolute -left-1/2 top-0 h-full w-1/2 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-60 transition-transform duration-700 group-hover:translate-x-[180%]" />
                    </span>
                    {/* Header do Card */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3">
                      <div className="bg-primary-100 p-3 rounded-full transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:scale-105">
                        <span className="text-2xl">{emoji}</span>
                      </div>
                        <div>
                          <h3 className="font-semibold text-gray-900 flex items-center space-x-2">
                            <span>{musician.full_name}</span>
                          </h3>
                          {username && <p className="text-sm text-gray-600">@{username.replace('@', '')}</p>}
                        </div>
                      </div>
                    </div>

                    {/* Informações */}
                    <div className="space-y-3">
                      {musician.bio && (
                        <div className="flex items-center space-x-2 text-gray-700">
                          <Music className="h-4 w-4 text-primary-600 transition-transform duration-300 group-hover:scale-110" />
                          <span className="text-sm font-medium">{musician.bio}</span>
                        </div>
                      )}

                      {musician.phone && (
                        <div className="flex items-center space-x-2 text-gray-600">
                        <Phone className="h-4 w-4 transition-transform duration-300 group-hover:scale-110" />
                          <span className="text-sm">{musician.phone}</span>
                        </div>
                      )}

                      {contactEmail && (
                        <div className="flex items-center space-x-2 text-gray-600">
                        <Mail className="h-4 w-4 transition-transform duration-300 group-hover:scale-110" />
                          <span className="text-sm">{contactEmail}</span>
                        </div>
                      )}

                      {musician.instagram && (
                        <div className="flex items-center space-x-2 text-gray-600">
                        <Instagram className="h-4 w-4 transition-transform duration-300 group-hover:scale-110" />
                          <span className="text-sm">{musician.instagram}</span>
                        </div>
                      )}
                    </div>

                    {/* Badges de Instrumentos */}
                    <div className="mt-4 flex flex-wrap gap-2">
                      {musician.instruments && musician.instruments.length > 0 ? (
                        musician.instruments.map((inst) => (
                          <span key={inst} className="status-chip default transition-transform duration-300 group-hover:-translate-y-0.5">
                            {getInstrumentLabel(inst)}
                          </span>
                        ))
                      ) : (
                        <span className="status-chip default transition-transform duration-300 group-hover:-translate-y-0.5">
                          {instrumentLabel}
                        </span>
                      )}
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </motion.div>
        )}

        {/* Informação */}
        {!loading && musicians.length > 0 && (
          <div className="card-contrast">
            <div className="flex items-start space-x-3">
              <Users className="h-5 w-5 text-primary-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-primary-800">
                  Total: {musicians.length} músico{musicians.length !== 1 ? 's' : ''}
                </p>
                <p className="text-sm text-primary-700 mt-1">
                  Todos os músicos podem se conectar para formar duos e trios, com contatos disponíveis para combinar diretamente.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Musicians;
