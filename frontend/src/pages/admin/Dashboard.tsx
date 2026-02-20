import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  TrendingUp,
  Users,
  Building2,
  Clock,
  ArrowRight,
  RefreshCw,
  ShieldAlert,
} from 'lucide-react';
import { cityAdminService, type DashboardStatsExtended } from '../../services/publicApi';
import {
  AdminStatCard,
  AdminHero,
  AdminCard,
  AdminLoading,
  AdminButton,
} from '../../components/admin';
import { showToast } from '../../utils/toast';
import { ADMIN_ROUTES } from '../../routes/adminRoutes';
import {
  AdminChartCard,
  CitiesPipelineBar,
  RequestsStatusDonut,
  TopCitiesStackedBars,
} from '../../components/admin/charts';

const AdminDashboard: React.FC = () => {
  const [extendedStats, setExtendedStats] = useState<DashboardStatsExtended | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchExtendedStats = useCallback(async () => {
    setRefreshing(true);
    try {
      const data = await cityAdminService.getExtendedStats();
      setExtendedStats(data);
      setLastUpdatedAt(new Date());
    } catch (error) {
      console.error('Error fetching extended stats:', error);
      showToast.apiError(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchExtendedStats();
  }, [fetchExtendedStats]);

  useEffect(() => {
    if (!autoRefresh) return;
    const id = window.setInterval(() => {
      fetchExtendedStats();
    }, 60_000);
    return () => window.clearInterval(id);
  }, [autoRefresh, fetchExtendedStats]);

  const insights = useMemo(() => {
    const total = extendedStats?.requests.total ?? 0;
    const pending = extendedStats?.requests.pending ?? 0;
    const approved = extendedStats?.requests.approved ?? 0;
    const rejected = extendedStats?.requests.rejected ?? 0;

    const pct = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0);
    return {
      total,
      pending,
      approved,
      rejected,
      approvalRate: pct(approved),
      rejectionRate: pct(rejected),
      pendingRate: pct(pending),
    };
  }, [extendedStats]);

  if (loading) {
    return (
      <div className="space-y-6">
        <AdminHero
          title="Painel Administrativo"
          description="Gerencie solicitações, cidades e métricas da plataforma"
        />
        <AdminLoading count={2} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AdminHero
        title="Painel Administrativo"
        description="Gerencie solicitações, cidades e métricas da plataforma"
      />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <AdminStatCard
          label="Total Solicitações"
          value={extendedStats?.requests.total || 0}
          icon={TrendingUp}
          color="blue"
        />
        <AdminStatCard
          label="Pendentes"
          value={extendedStats?.requests.pending || 0}
          icon={Clock}
          color="amber"
        />
        <AdminStatCard
          label="Músicos Ativos"
          value={extendedStats?.musicians.total || 0}
          icon={Users}
          color="green"
        />
        <AdminStatCard
          label="Cidades Parceiras"
          value={extendedStats?.cities.partner || 0}
          icon={Building2}
          color="indigo"
        />
      </div>

      {/* Controls */}
      <AdminCard className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-slate-300">
            <span className="text-slate-400">Atualizado:</span>{' '}
            <span className="font-semibold text-white tabular-nums">
              {lastUpdatedAt
                ? lastUpdatedAt.toLocaleString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                : '-'}
            </span>
          </div>
          <label className="flex items-center gap-2 text-slate-300 select-none">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={e => setAutoRefresh(e.target.checked)}
              className="h-4 w-4 accent-indigo-400"
            />
            Auto-refresh (1 min)
          </label>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to={ADMIN_ROUTES.alertsTest}
            className="btn-admin-ghost px-4 py-2 min-h-[44px] inline-flex items-center gap-2 font-medium"
          >
            <ShieldAlert className="h-4 w-4" />
            Testar alertas
          </Link>
          <AdminButton
            variant="secondary"
            icon={RefreshCw}
            onClick={fetchExtendedStats}
            loading={refreshing}
          >
            Atualizar
          </AdminButton>
        </div>
      </AdminCard>

      {/* Quick Actions */}
      {extendedStats && extendedStats.requests.pending > 0 && (
        <AdminCard>
          <h2 className="text-lg font-semibold text-white mb-3">Ações Rápidas</h2>
          <div className="flex flex-wrap gap-3">
            {extendedStats.requests.pending > 0 && (
              <Link
                to={ADMIN_ROUTES.requests}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 transition-colors text-sm font-medium"
              >
                <Clock className="h-4 w-4" />
                {extendedStats.requests.pending} solicitações pendentes
                <ArrowRight className="h-4 w-4" />
              </Link>
            )}
          </div>
        </AdminCard>
      )}

      {/* Analytics */}
      {extendedStats && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <AdminChartCard
            title="Solicitações por Status"
            subtitle="Distribuição atual (pendentes, aprovadas e rejeitadas)"
            className="lg:col-span-2"
            right={
              <Link
                to={ADMIN_ROUTES.requests}
                className="text-sm text-amber-400 hover:text-amber-300 transition-colors"
              >
                Ver solicitações
              </Link>
            }
          >
            <RequestsStatusDonut
              pending={extendedStats.requests.pending}
              approved={extendedStats.requests.approved}
              rejected={extendedStats.requests.rejected}
            />
          </AdminChartCard>

          <AdminChartCard title="Insights" subtitle="Leituras rápidas para priorização">
            <div className="space-y-3">
              {[
                {
                  label: 'Taxa de aprovação',
                  value: `${insights.approvalRate}%`,
                  color: 'text-emerald-400',
                },
                {
                  label: 'Taxa de rejeição',
                  value: `${insights.rejectionRate}%`,
                  color: 'text-red-400',
                },
                {
                  label: 'Fila pendente',
                  value: `${insights.pendingRate}%`,
                  color: 'text-amber-400',
                },
              ].map(row => (
                <div
                  key={row.label}
                  className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-4"
                >
                  <span className="text-sm text-slate-300">{row.label}</span>
                  <span className={`text-lg font-bold tabular-nums ${row.color}`}>{row.value}</span>
                </div>
              ))}

              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs font-semibold text-slate-300 uppercase tracking-wide">
                  Total no ciclo
                </p>
                <p className="mt-1 text-2xl font-bold text-white tabular-nums">{insights.total}</p>
                <p className="mt-2 text-sm text-slate-400">
                  Pendentes:{' '}
                  <span className="text-amber-300 font-semibold tabular-nums">
                    {insights.pending}
                  </span>{' '}
                  | Aprovadas:{' '}
                  <span className="text-emerald-300 font-semibold tabular-nums">
                    {insights.approved}
                  </span>{' '}
                  | Rejeitadas:{' '}
                  <span className="text-red-300 font-semibold tabular-nums">
                    {insights.rejected}
                  </span>
                </p>
              </div>
            </div>
          </AdminChartCard>

          <AdminChartCard
            title="Pipeline de Cidades"
            subtitle="Parceiras, expansão e planejamento"
            right={
              <Link
                to={ADMIN_ROUTES.cities}
                className="text-sm text-amber-400 hover:text-amber-300 transition-colors"
              >
                Gerenciar cidades
              </Link>
            }
            className="lg:col-span-1"
          >
            <CitiesPipelineBar
              partner={extendedStats.cities.partner}
              expansion={extendedStats.cities.expansion}
              planning={extendedStats.cities.planning}
            />
          </AdminChartCard>

          {extendedStats.top_cities && extendedStats.top_cities.length > 0 && (
            <AdminChartCard
              title="Top Cidades"
              subtitle="Pendentes vs outras solicitações"
              className="lg:col-span-2"
            >
              <TopCitiesStackedBars items={extendedStats.top_cities} />
            </AdminChartCard>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
