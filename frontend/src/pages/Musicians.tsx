// pages/Musicians.tsx
import React, { useEffect, useState } from 'react';
import { Users, Music, Phone, Mail, Instagram } from 'lucide-react';
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
      other: '🎵',
    };
    return emojis[instrument] || '🎵';
  };

  const getInstrumentLabel = (instrument: string) => {
    const displayMap: Record<string, string> = {
      vocal: 'Vocalista',
      guitar: 'Guitarrista/Violão',
      bass: 'Baixista',
      drums: 'Baterista',
      keyboard: 'Tecladista',
      other: 'Músico(a)',
    };
    return displayMap[instrument] || 'Músico(a)';
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="relative overflow-hidden rounded-2xl border border-white/60 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 text-white p-6 shadow-xl">
          <div className="pointer-events-none absolute inset-0 -z-10 opacity-40 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.2),_transparent_40%)]" />
          <div className="flex items-start justify-between gap-4 flex-col sm:flex-row sm:items-center">
            <div className="flex items-center space-x-3">
              <div className="bg-white/15 p-3 rounded-lg shadow-inner">
                <Users className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">Músicos freelancers</h1>
                <p className="text-white/80 text-sm sm:text-base">
                  Perfis com contatos, redes e agenda compartilhada para você montar o time ideal.
                </p>
              </div>
            </div>
            <div className="text-sm text-white/80 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Conecte, convide e feche gigs em minutos</span>
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {musicians.map((musician) => {
              const emoji = getInstrumentEmoji(musician.instrument, musician.bio);
              const username = musician.instagram || musician.user.username;
              const contactEmail = musician.public_email || musician.user.email;
              const instrumentLabel = getInstrumentLabel(musician.instrument);
              return (
                <div key={musician.id} className="card-contrast hover:shadow-2xl transition-all">
                  {/* Header do Card */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="bg-primary-100 p-3 rounded-full">
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
                        <Music className="h-4 w-4 text-primary-600" />
                        <span className="text-sm font-medium">{musician.bio}</span>
                      </div>
                    )}

                    {musician.phone && (
                      <div className="flex items-center space-x-2 text-gray-600">
                        <Phone className="h-4 w-4" />
                        <span className="text-sm">{musician.phone}</span>
                      </div>
                    )}

                    {contactEmail && (
                      <div className="flex items-center space-x-2 text-gray-600">
                        <Mail className="h-4 w-4" />
                        <span className="text-sm">{contactEmail}</span>
                      </div>
                    )}

                    {musician.instagram && (
                      <div className="flex items-center space-x-2 text-gray-600">
                        <Instagram className="h-4 w-4" />
                        <span className="text-sm">{musician.instagram}</span>
                      </div>
                    )}
                  </div>

                  {/* Badge de Papel */}
                  <div className="mt-4">
                    <span className="status-chip default">{instrumentLabel}</span>
                  </div>
                </div>
              );
            })}
          </div>
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
