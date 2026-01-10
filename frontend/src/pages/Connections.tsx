// pages/Connections.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { Users, Star, Filter } from 'lucide-react';
import { motion } from 'framer-motion';
import Layout from '../components/Layout/Layout';
import Loading from '../components/common/Loading';
import { StatCard } from '../components/ui/StatCard';
import { badgeService, connectionService, musicianService } from '../services/api';
import type { Connection, ConnectionType, Musician, MusicianBadge } from '../types';
import { INSTRUMENT_LABELS } from '../utils/formatting';

const connectionLabels: Record<ConnectionType, string> = {
  follow: 'Seguir',
  call_later: 'Ligar',
  recommend: 'Indicar',
  played_with: 'Já toquei',
};

const Connections: React.FC = () => {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [badges, setBadges] = useState<MusicianBadge[]>([]);
  const [musicians, setMusicians] = useState<Musician[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingAction, setLoadingAction] = useState(false);
  const [search, setSearch] = useState('');
  const [instrumentFilter, setInstrumentFilter] = useState<string>('all');

  useEffect(() => {
    const loadAll = async () => {
      try {
        setLoading(true);
        const [conn, bgs, mus] = await Promise.all([
          connectionService.getAll(),
          badgeService.getMine(),
          musicianService.getAll(),
        ]);
        setConnections(Array.isArray(conn) ? conn : []);
        setBadges(Array.isArray(bgs) ? bgs : []);
        setMusicians(Array.isArray(mus) ? mus : []);
      } catch (error) {
        console.error('Erro ao carregar conexões/badges:', error);
      } finally {
        setLoading(false);
      }
    };
    loadAll();
  }, []);

  const filteredMusicians = useMemo(() => {
    return musicians
      .filter((m) => (instrumentFilter === 'all' ? true : m.instrument === instrumentFilter))
      .filter((m) => {
        const term = search.toLowerCase();
        if (!term) return true;
        return (
          m.full_name.toLowerCase().includes(term) ||
          m.user.username.toLowerCase().includes(term) ||
          (m.instrument && INSTRUMENT_LABELS[m.instrument]?.toLowerCase().includes(term))
        );
      });
  }, [musicians, search, instrumentFilter]);

  const stats = useMemo(() => {
    const totals: Record<ConnectionType, number> = { follow: 0, call_later: 0, recommend: 0, played_with: 0 };
    (connections || []).forEach((c) => {
      totals[c.connection_type] = (totals[c.connection_type] || 0) + 1;
    });
    return totals;
  }, [connections]);

  const connectionMap = useMemo(() => {
    const map: Record<number, Partial<Record<ConnectionType, Connection>>> = {};
    (connections || []).forEach((c) => {
      if (!map[c.target.id]) map[c.target.id] = {};
      map[c.target.id][c.connection_type] = c;
    });
    return map;
  }, [connections]);

  const grouped = useMemo(() => {
    const groups: Record<ConnectionType, Connection[]> = { follow: [], call_later: [], recommend: [], played_with: [] };
    (connections || []).forEach((c) => groups[c.connection_type].push(c));
    return groups;
  }, [connections]);

  const handleToggle = async (targetId: number, type: ConnectionType) => {
    const existing = connectionMap[targetId]?.[type];
    setLoadingAction(true);
    try {
      if (existing) {
        await connectionService.delete(existing.id);
        setConnections((prev) => prev.filter((c) => c.id !== existing.id));
      } else {
        await connectionService.create({ target_id: targetId, connection_type: type });
        const refreshed = await connectionService.getAll();
        setConnections(Array.isArray(refreshed) ? refreshed : []);
      }
    } catch (error) {
      console.error('Erro ao alternar conexão:', error);
    } finally {
      setLoadingAction(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await connectionService.delete(id);
      setConnections((prev) => prev.filter((c) => c.id !== id));
    } catch (error) {
      console.error('Erro ao remover conexão:', error);
    }
  };

  if (loading) {
    return (
      <Layout>
        <Loading text="Carregando rede e badges..." />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-8">
        <div className="hero-section fade-in-up">
          <div className="flex items-center gap-4 mb-6">
            {/* ÚNICO ícone grande e destacado */}
            <div className="h-16 w-16 rounded-2xl bg-primary-600/10 flex items-center justify-center border border-primary-500/20">
              <Users className="h-8 w-8 text-primary-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Conexões profissionais</h1>
              <p className="text-gray-600">Construa sua rede e gerencie relacionamentos</p>
            </div>
          </div>

          {/* Stats: SEM ícones - apenas números grandes com micro-interações */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {(Object.keys(stats) as ConnectionType[]).map((key) => (
              <StatCard
                key={key}
                label={connectionLabels[key]}
                value={stats[key] || 0}
              />
            ))}
            <StatCard
              label="Badges"
              value={badges.length}
              accent
            />
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.6fr,1fr]">
          {/* Conexões */}
          <div className="card space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Gerenciar conexões</h2>
                <p className="text-sm text-gray-600">
                  Acompanhe favoritos e registre colaborações
                </p>
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex flex-col md:flex-row gap-3">
                <div className="flex-1">
                  <label className="text-xs font-semibold text-gray-700 mb-1 block">
                    Buscar
                  </label>
                  <div className="relative">
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="input-field pl-10"
                      placeholder="Nome ou @username"
                    />
                    <Filter className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  </div>
                </div>
                <div className="w-full md:w-48">
                  <label className="text-xs font-semibold text-gray-700 mb-1 block">
                    Instrumento
                  </label>
                  <select
                    value={instrumentFilter}
                    onChange={(e) => setInstrumentFilter(e.target.value)}
                    className="input-field"
                  >
                    <option value="all">Todos</option>
                    {Object.entries(INSTRUMENT_LABELS).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 mt-4">
                {filteredMusicians.map((m, index) => {
                  const active = connectionMap[m.id] || {};
                  return (
                    <motion.div
                      key={m.id}
                      className="bg-white border border-gray-200 rounded-xl p-4"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                      whileHover={{
                        y: -2,
                        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                        transition: { duration: 0.2 }
                      }}
                    >
                      <div className="flex items-center gap-3 mb-4">
                        {/* Emoji do instrumento (sem ícone lucide) */}
                        <motion.div
                          className="h-12 w-12 rounded-full bg-primary-100 flex items-center justify-center text-xl flex-shrink-0"
                          whileHover={{ scale: 1.1, rotate: 5 }}
                          transition={{ type: 'spring', stiffness: 300 }}
                        >
                          {getInstrumentEmoji(m.instrument)}
                        </motion.div>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-gray-900 truncate">{m.full_name}</p>
                          <p className="text-sm text-gray-600 truncate">
                            {INSTRUMENT_LABELS[m.instrument] || m.instrument}
                          </p>
                        </div>
                      </div>

                      {/* Botões SEM ícones - hierarquia por cor */}
                      <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
                        {(Object.keys(connectionLabels) as ConnectionType[]).map((type) => {
                          const isOn = Boolean(active[type]);
                          const isAccent = type === 'played_with';
                          return (
                            <motion.button
                              key={type}
                              onClick={() => handleToggle(m.id, type)}
                              className={`connection-pill ${isOn ? 'active' : ''} ${isAccent && !isOn ? 'accent' : ''}`}
                              disabled={loadingAction}
                              whileTap={{ scale: 0.95 }}
                              whileHover={{ scale: 1.02 }}
                            >
                              {connectionLabels[type]}
                            </motion.button>
                          );
                        })}
                      </div>
                    </motion.div>
                  );
                })}
                {filteredMusicians.length === 0 && (
                  <p className="text-sm text-gray-500 col-span-full">Nenhum músico encontrado.</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mt-4">
              {(Object.keys(grouped) as ConnectionType[]).map((type) => (
                <div key={type} className="rounded-xl border border-gray-200 bg-white/95 p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-gray-800">
                      {connectionLabels[type]}
                    </h3>
                    <span className="text-xs text-gray-500">{grouped[type].length} conexão(ões)</span>
                  </div>
                  {grouped[type].length === 0 ? (
                    <p className="text-sm text-gray-500">Nenhuma conexão neste grupo.</p>
                  ) : (
                    <div className="space-y-2">
                      {grouped[type].map((c) => (
                        <div key={c.id} className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 px-3 py-2">
                          <div>
                            <p className="font-semibold text-gray-900">{c.target.full_name}</p>
                            <p className="text-xs text-gray-500">
                              {INSTRUMENT_LABELS[c.target.instrument] || c.target.instrument}
                              {c.verified && c.connection_type === 'played_with' && (
                                <span className="ml-1 text-emerald-600 font-semibold">(Verificado)</span>
                              )}
                            </p>
                          </div>
                          <button
                            onClick={() => handleDelete(c.id)}
                            className="text-xs text-red-600 hover:text-red-700"
                            disabled={loadingAction}
                          >
                            Remover
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Badges */}
          <div className="card">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center">
                <Star className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Badges conquistadas</h2>
                <p className="text-sm text-gray-600">Conquistas automáticas</p>
              </div>
            </div>
            {badges.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-8"
              >
                <p className="text-4xl mb-3">🎯</p>
                <p className="text-sm text-gray-500">Nenhum badge ainda. Toque eventos e interaja para desbloquear!</p>
              </motion.div>
            ) : (
              <div className="space-y-3">
                {badges.map((badge, index) => (
                  <motion.div
                    key={badge.id}
                    className="rounded-xl border border-amber-100 bg-amber-50 p-4"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                    whileHover={{
                      scale: 1.02,
                      boxShadow: '0 4px 12px rgba(251, 191, 36, 0.2)',
                      transition: { duration: 0.2 }
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <motion.span
                        className="text-3xl"
                        whileHover={{ scale: 1.2, rotate: 10 }}
                        transition={{ type: 'spring', stiffness: 300 }}
                      >
                        {badge.icon || '🏅'}
                      </motion.span>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-amber-900 mb-1">{badge.name}</p>
                        {badge.description && (
                          <p className="text-sm text-amber-800 leading-relaxed">{badge.description}</p>
                        )}
                        <p className="text-xs text-amber-600 mt-2">
                          {new Date(badge.awarded_at).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

// Helper function para emojis de instrumentos
function getInstrumentEmoji(instrument: string): string {
  const emojis: Record<string, string> = {
    vocal: '🎤',
    guitar: '🎸',
    bass: '🎸',
    drums: '🥁',
    keyboard: '🎹',
    percussion: '🥁',
  };
  return emojis[instrument] || '🎵';
}

export default Connections;
