import React, { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Users, Building2 } from 'lucide-react';
import { cityAdminService, type DashboardStatsExtended } from '../../services/publicApi';
import { AdminStatCard, AdminHero, AdminCard } from '../../components/admin';
import { showToast } from '../../utils/toast';

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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <AdminStatCard
              key={i}
              label="Carregando..."
              value="..."
              icon={TrendingUp}
              color="indigo"
              className="animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  const heroStats = extendedStats
    ? [
        { label: 'Total Solicitações', value: extendedStats.requests.total, icon: TrendingUp },
        { label: 'Pendentes', value: extendedStats.requests.pending, icon: TrendingUp },
        { label: 'Músicos Ativos', value: extendedStats.musicians.total, icon: Users },
        { label: 'Cidades Parceiras', value: extendedStats.cities.partner, icon: Building2 },
      ]
    : [];

  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <AdminHero
        title="Painel Administrativo"
        description="Gerencie solicitações, cidades e métricas da plataforma"
        stats={heroStats}
      />

      {/* Extended Stats Grid */}
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
          icon={TrendingUp}
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

      {/* Top Cities */}
      {extendedStats?.top_cities && extendedStats.top_cities.length > 0 && (
        <AdminCard>
          <motion.h2
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-2xl font-bold text-white mb-4"
          >
            Top Cidades
          </motion.h2>
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
                  <span className="ml-3 text-sm text-slate-300">{city.total} solicitações</span>
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
