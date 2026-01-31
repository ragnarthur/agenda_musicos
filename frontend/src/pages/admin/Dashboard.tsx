import React, { useCallback, useEffect, useState } from 'react';
import { TrendingUp, Users, Building2 } from 'lucide-react';
import { cityAdminService, type DashboardStatsExtended } from '../../services/publicApi';
import { showToast } from '../../utils/toast';

const AdminDashboard: React.FC = () => {
  const [extendedStats, setExtendedStats] = useState<DashboardStatsExtended | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch extended stats
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-white rounded-lg shadow p-4 animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-12 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-20"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white shadow rounded-lg p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Dashboard</h1>
        <p className="text-gray-600">Visão geral da plataforma</p>
      </div>

      {/* Extended Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <TrendingUp className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {extendedStats?.requests.total || 0}
              </p>
              <p className="text-xs text-gray-500">Total Solicitações</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <TrendingUp className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {extendedStats?.requests.pending || 0}
              </p>
              <p className="text-xs text-gray-500">Pendentes</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Users className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {extendedStats?.musicians.total || 0}
              </p>
              <p className="text-xs text-gray-500">Músicos Ativos</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Building2 className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {extendedStats?.cities.partner || 0}
              </p>
              <p className="text-xs text-gray-500">Cidades Parceiras</p>
            </div>
          </div>
        </div>
      </div>

      {/* Top Cities */}
      {extendedStats?.top_cities && extendedStats.top_cities.length > 0 && (
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Top Cidades</h2>
          <div className="space-y-3">
            {extendedStats.top_cities.map((city, index) => (
              <div
                key={`${city.city}-${city.state}-${index}`}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div>
                  <span className="font-medium text-gray-900">
                    {city.city}, {city.state}
                  </span>
                  <span className="ml-3 text-sm text-gray-600">{city.total} solicitações</span>
                </div>
                <span className="text-sm text-yellow-600 font-medium">
                  {city.pending} pendentes
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
