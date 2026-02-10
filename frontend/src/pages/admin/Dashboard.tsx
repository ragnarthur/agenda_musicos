import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { TrendingUp, Users, Building2, Clock, ArrowRight } from 'lucide-react';
import { cityAdminService, type DashboardStatsExtended } from '../../services/publicApi';
import { AdminStatCard, AdminHero, AdminCard, AdminLoading } from '../../components/admin';
import { showToast } from '../../utils/toast';
import { ADMIN_ROUTES } from '../../routes/adminRoutes';

const AdminDashboard: React.FC = () => {
  const [extendedStats, setExtendedStats] = useState<DashboardStatsExtended | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchExtendedStats = useCallback(async () => {
    try {
      const data = await cityAdminService.getExtendedStats();
      setExtendedStats(data);
    } catch (error) {
      console.error('Error fetching extended stats:', error);
      showToast.apiError(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchExtendedStats();
  }, [fetchExtendedStats]);

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

      {/* Quick Actions */}
      {extendedStats && (extendedStats.requests.pending > 0) && (
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

      {/* Top Cities */}
      {extendedStats?.top_cities && extendedStats.top_cities.length > 0 && (
        <AdminCard>
          <h2 className="text-lg font-semibold text-white mb-4">Top Cidades</h2>
          <div className="space-y-3">
            {extendedStats.top_cities.map((city, index) => (
              <motion.div
                key={`${city.city}-${city.state}-${index}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center justify-between p-3 md:p-4 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
              >
                <div>
                  <span className="font-medium text-white">
                    {city.city}, {city.state}
                  </span>
                  <span className="ml-3 text-sm text-slate-400">{city.total} solicitações</span>
                </div>
                <span className="text-sm font-medium text-amber-400">{city.pending} pendentes</span>
              </motion.div>
            ))}
          </div>
        </AdminCard>
      )}
    </div>
  );
};

export default AdminDashboard;
