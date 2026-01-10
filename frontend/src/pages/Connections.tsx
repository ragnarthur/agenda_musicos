// pages/Connections.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { Users, Star, Filter } from 'lucide-react';
import { motion } from 'framer-motion';
import Layout from '../components/Layout/Layout';
import Loading from '../components/common/Loading';
import { StatCard } from '../components/ui/StatCard';
import { badgeService, connectionService, musicianService, type BadgeProgressResponse } from '../services/api';
import type { Connection, ConnectionType, Musician } from '../types';
import { INSTRUMENT_LABELS } from '../utils/formatting';
import InstrumentIcon from '../components/common/InstrumentIcon';

const connectionLabels: Record<string, string> = {
  follow: 'Seguir',
  recommend: 'Indicar',
  played_with: 'Já toquei',
};

// Tipos de conexão ativos (sem call_later)
const activeConnectionTypes = ['follow', 'recommend', 'played_with'] as const;

const getMusicianInstruments = (musician: Musician): string[] => {
  if (musician.instruments && musician.instruments.length > 0) {
    return musician.instruments;
  }
  return musician.instrument ? [musician.instrument] : [];
};

const getInstrumentLabel = (instrument: string): string => {
  if (INSTRUMENT_LABELS[instrument]) return INSTRUMENT_LABELS[instrument];
  return instrument
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
};

const Connections: React.FC = () => {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [badgeData, setBadgeData] = useState<BadgeProgressResponse>({ earned: [], available: [] });
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
          badgeService.getProgress(),
          musicianService.getAll(),
        ]);
        setConnections(Array.isArray(conn) ? conn : []);
        setBadgeData(bgs || { earned: [], available: [] });
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
      .filter((m) => {
        const instruments = getMusicianInstruments(m);
        if (instrumentFilter === 'all') return true;
        return instruments.includes(instrumentFilter);
      })
      .filter((m) => {
        const term = search.toLowerCase();
        if (!term) return true;
        const instruments = getMusicianInstruments(m);
        return (
          m.full_name.toLowerCase().includes(term) ||
          m.user.username.toLowerCase().includes(term) ||
          instruments.some((inst) => getInstrumentLabel(inst).toLowerCase().includes(term))
        );
      });
  }, [musicians, search, instrumentFilter]);

  const stats = useMemo(() => {
    const totals: Record<string, number> = { follow: 0, recommend: 0, played_with: 0 };
    (connections || []).forEach((c) => {
      if (c.connection_type in totals) {
        totals[c.connection_type] = (totals[c.connection_type] || 0) + 1;
      }
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
    const groups: Record<string, Connection[]> = { follow: [], recommend: [], played_with: [] };
    (connections || []).forEach((c) => {
      if (c.connection_type in groups) {
        groups[c.connection_type].push(c);
      }
    });
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
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {activeConnectionTypes.map((key) => (
              <StatCard
                key={key}
                label={connectionLabels[key]}
                value={stats[key] || 0}
              />
            ))}
            <StatCard
              label="Badges"
              value={badgeData.earned.length}
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
                  const instruments = getMusicianInstruments(m);
                  const primaryInstrument = instruments[0] || m.instrument;
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
                        <motion.div
                          className="h-12 w-12 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0"
                          whileHover={{ scale: 1.1, rotate: 5 }}
                          transition={{ type: 'spring', stiffness: 300 }}
                        >
                          <InstrumentIcon instrument={primaryInstrument} />
                        </motion.div>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-gray-900 truncate">{m.full_name}</p>
                          <p className="text-sm text-gray-600 truncate">
                            {instruments.map(getInstrumentLabel).join(' · ')}
                          </p>
                          {instruments.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-2">
                              {instruments.map((inst) => (
                                <span
                                  key={inst}
                                  className="inline-flex items-center gap-1 rounded-full border border-primary-100 bg-primary-50 px-2.5 py-1 text-xs font-semibold text-primary-700"
                                >
                                  <InstrumentIcon instrument={inst} size={16} />
                                  <span>{getInstrumentLabel(inst)}</span>
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Botões SEM ícones - hierarquia por cor */}
                      <div className="grid grid-cols-3 gap-2">
                        {activeConnectionTypes.map((type) => {
                          const isOn = Boolean(active[type]);
                          const isAccent = type === 'played_with';
                          return (
                            <motion.button
                              key={type}
                              onClick={() => handleToggle(m.id, type as ConnectionType)}
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

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mt-4">
              {activeConnectionTypes.map((type) => (
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
          <div className="space-y-4">
            {/* Badges Conquistadas */}
            <div className="card">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center">
                  <Star className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    Badges conquistadas ({badgeData.earned.length})
                  </h2>
                  <p className="text-sm text-gray-600">Suas conquistas</p>
                </div>
              </div>
              {badgeData.earned.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-6"
                >
                  <p className="text-3xl mb-2">🎯</p>
                  <p className="text-sm text-gray-500">Nenhum badge ainda</p>
                </motion.div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {badgeData.earned.map((badge, index) => (
                    <motion.div
                      key={badge.id}
                      className="rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 to-yellow-50 p-3"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                      whileHover={{
                        scale: 1.05,
                        boxShadow: '0 4px 12px rgba(251, 191, 36, 0.3)',
                      }}
                    >
                      <div className="text-center">
                        <motion.span
                          className="text-3xl block mb-1"
                          whileHover={{ scale: 1.2, rotate: 10 }}
                        >
                          {badge.icon || '🏅'}
                        </motion.span>
                        <p className="font-semibold text-amber-900 text-sm truncate">{badge.name}</p>
                        <p className="text-xs text-amber-600 mt-1">
                          {new Date(badge.awarded_at).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {/* Badges Disponíveis (com progresso) */}
            <div className="card">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-lg bg-gray-100 flex items-center justify-center">
                  <span className="text-xl">🔒</span>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Próximas conquistas</h2>
                  <p className="text-sm text-gray-600">Continue progredindo!</p>
                </div>
              </div>
              <div className="space-y-3">
                {badgeData.available.map((badge, index) => (
                  <motion.div
                    key={badge.slug}
                    className="rounded-xl border border-gray-200 bg-gray-50 p-4"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-2xl grayscale opacity-60">{badge.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-semibold text-gray-700">{badge.name}</p>
                          <span className="text-sm font-bold text-primary-600">{badge.percentage}%</span>
                        </div>
                        <p className="text-xs text-gray-500 mb-2">{badge.description}</p>

                        {/* Barra de progresso */}
                        <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
                          <motion.div
                            className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary-500 to-primary-400 rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${badge.percentage}%` }}
                            transition={{ duration: 0.8, delay: index * 0.1 }}
                          />
                        </div>

                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-gray-500">
                            {badge.current}/{badge.required}
                          </span>
                          {badge.extra_condition && (
                            <span className="text-xs text-gray-400">{badge.extra_condition}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
                {badgeData.available.length === 0 && (
                  <div className="text-center py-6">
                    <p className="text-3xl mb-2">🏆</p>
                    <p className="text-sm text-gray-500">Todas as badges conquistadas!</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Connections;
