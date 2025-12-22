// pages/Connections.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, Star, Sparkles, HeartHandshake, Filter, UserCheck, Bookmark, PhoneCall } from 'lucide-react';
import Layout from '../components/Layout/Layout';
import Loading from '../components/common/Loading';
import { badgeService, connectionService, musicianService } from '../services/api';
import type { Connection, ConnectionType, Musician, MusicianBadge } from '../types';
import { INSTRUMENT_LABELS } from '../utils/formatting';

const connectionLabels: Record<ConnectionType, string> = {
  follow: 'Seguir',
  call_later: 'Ligar depois',
  recommend: 'Indicar',
  played_with: 'Já toquei',
};

const connectionIcons: Record<ConnectionType, React.ReactNode> = {
  follow: <Sparkles className="h-4 w-4" />,
  call_later: <PhoneCall className="h-4 w-4" />,
  recommend: <Bookmark className="h-4 w-4" />,
  played_with: <HeartHandshake className="h-4 w-4" />,
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
        <div className="hero-panel">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,_rgba(99,102,241,0.12),_transparent_35%)]" />
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1 text-xs font-semibold text-indigo-700 shadow-sm">
                <HeartHandshake className="h-4 w-4" /> Rede Profissional
              </p>
              <h1 className="mt-2 text-3xl font-bold text-gray-900">Conexões profissionais</h1>
              <p className="mt-1 text-gray-700">
                Construa sua rede, indique músicos para oportunidades e acompanhe conquistas em tempo real.
              </p>
            </div>
            <Link to="/musicos" className="btn-primary inline-flex items-center gap-2">
              <Users className="h-5 w-5" />
              <span>Explorar músicos</span>
            </Link>
          </div>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {(Object.keys(stats) as ConnectionType[]).map((key) => (
              <div key={key} className="rounded-2xl border border-white/60 bg-white/80 p-4 shadow-lg">
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                  {connectionIcons[key]}
                  {connectionLabels[key]}
                </div>
                <p className="mt-1 text-2xl font-bold text-indigo-700">{stats[key] || 0}</p>
              </div>
            ))}
            <div className="rounded-2xl border border-white/60 bg-white/80 p-4 shadow-lg">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                <Star className="h-4 w-4 text-amber-500" />
                Badges
              </div>
              <p className="mt-1 text-2xl font-bold text-amber-600">{badges.length}</p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.6fr,1fr]">
          {/* Conexões */}
          <div className="card space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Users className="h-4 w-4 text-indigo-600" /> Minhas conexões
                </p>
                <p className="text-xs text-gray-500">
                  Acompanhe favoritos, indique profissionais e registre colaborações anteriores.
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-gray-50/70 p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
                <div className="flex-1">
                  <label className="text-xs font-semibold text-gray-600">Buscar músico</label>
                  <div className="relative">
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="input-field mt-1 pl-10"
                      placeholder="Nome, @username ou instrumento"
                    />
                    <Filter className="absolute left-3 top-3.5 h-4 w-4 text-gray-400" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600">Instrumento</label>
                  <select
                    value={instrumentFilter}
                    onChange={(e) => setInstrumentFilter(e.target.value)}
                    className="mt-1 input-field"
                  >
                    <option value="all">Todos</option>
                    {Object.entries(INSTRUMENT_LABELS).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-1 gap-3 max-h-[500px] overflow-auto pr-1">
                {filteredMusicians.map((m) => {
                  const active = connectionMap[m.id] || {};
                  return (
                    <div key={m.id} className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-gray-900">{m.full_name}</p>
                          <p className="text-xs text-gray-500">{INSTRUMENT_LABELS[m.instrument] || m.instrument}</p>
                        </div>
                        <UserCheck className="h-5 w-5 text-indigo-600" />
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {(Object.keys(connectionLabels) as ConnectionType[]).map((type) => {
                          const isOn = Boolean(active[type]);
                          return (
                            <button
                              key={type}
                              onClick={() => handleToggle(m.id, type)}
                              className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                                isOn
                                  ? 'border-indigo-500 bg-indigo-600 text-white shadow'
                                  : 'border-gray-200 bg-gray-50 text-gray-700 hover:border-indigo-300'
                              }`}
                              disabled={loadingAction}
                            >
                              {connectionIcons[type]}
                              {connectionLabels[type]}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
                {filteredMusicians.length === 0 && (
                  <p className="text-sm text-gray-500 col-span-full">Nenhum músico encontrado.</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {(Object.keys(grouped) as ConnectionType[]).map((type) => (
                <div key={type} className="rounded-2xl border border-white/70 bg-white/90 p-4 shadow-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                      {connectionIcons[type]}
                      {connectionLabels[type]}
                    </div>
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
          <div className="card space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Star className="h-4 w-4 text-amber-500" /> Badges conquistadas
                </p>
                <p className="text-xs text-gray-500">Conquistas automáticas baseadas em shows, notas e networking.</p>
              </div>
            </div>
            {badges.length === 0 ? (
              <p className="text-sm text-gray-500">Nenhum badge ainda. Toque eventos e interaja para desbloquear!</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {badges.map((badge) => (
                  <div key={badge.id} className="rounded-2xl border border-amber-100 bg-amber-50/70 p-3 shadow-inner">
                    <p className="text-lg font-semibold text-amber-700 flex items-center gap-2">
                      {badge.icon || '🏅'} {badge.name}
                    </p>
                    {badge.description && <p className="text-sm text-amber-800 mt-1">{badge.description}</p>}
                    <p className="text-[11px] text-amber-600 mt-1">
                      Conquistado em {new Date(badge.awarded_at).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Connections;
