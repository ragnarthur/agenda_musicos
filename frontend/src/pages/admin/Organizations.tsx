import React, { useCallback, useEffect, useState } from 'react';
import { Trash2, User, Mail, Phone, MapPin, Calendar, Search } from 'lucide-react';
import { motion } from 'framer-motion';
import { adminContractorService, type ContractorProfile } from '../../services/publicApi';
import { AdminHero, AdminCard } from '../../components/admin';
import { showToast } from '../../utils/toast';

const AdminOrganizations: React.FC = () => {
  const [contractors, setContractors] = useState<ContractorProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleting, setDeleting] = useState<number | null>(null);

  const fetchContractors = useCallback(async () => {
    try {
      setLoading(true);
      const data = await adminContractorService.list();
      setContractors(data || []);
    } catch (error) {
      showToast.apiError(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchContractors();
  }, [fetchContractors]);

  const filteredContractors = contractors.filter(contractor => {
    const searchLower = searchTerm.toLowerCase();
    return (
      contractor.name.toLowerCase().includes(searchLower) ||
      contractor.email.toLowerCase().includes(searchLower) ||
      contractor.city?.toLowerCase().includes(searchLower) ||
      contractor.state?.toLowerCase().includes(searchLower)
    );
  });

  const confirmDelete = async (contractorId: number) => {
    try {
      setDeleting(contractorId);
      await adminContractorService.delete(contractorId);
      setContractors(prev => prev.filter(c => c.id !== contractorId));
      showToast.success('Contratante deletado com sucesso');
    } catch (error) {
      showToast.apiError(error);
    } finally {
      setDeleting(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <AdminHero
          title="Gerenciamento de Contratantes"
          description="Liste e gerencie todos os contratantes cadastrados"
        />
        <AdminCard>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="animate-pulse">
                <div className="h-20 bg-gray-200 rounded-lg"></div>
              </div>
            ))}
          </div>
        </AdminCard>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AdminHero
        title="Gerenciamento de Contratantes"
        description="Liste e gerencie todos os contratantes cadastrados"
        stats={[
          { label: 'Total', value: contractors.length, icon: User },
          {
            label: 'Ativos',
            value: contractors.filter(c => c.is_active).length,
            icon: User,
          },
        ]}
      />

      <AdminCard>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Buscar por nome, email, cidade..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="min-h-[44px] w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>
      </AdminCard>

      <AdminCard>
        <div className="space-y-4">
          {filteredContractors.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {searchTerm ? 'Nenhum contratante encontrado' : 'Nenhum contratante cadastrado'}
            </div>
          ) : (
            filteredContractors.map(contractor => (
              <motion.div
                key={contractor.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border border-gray-200 p-4 hover:shadow-sm transition"
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{contractor.name}</h3>
                    <div className="mt-2 flex flex-wrap gap-3 text-sm text-gray-600">
                      <span className="flex items-center gap-1">
                        <Mail className="w-4 h-4" />
                        {contractor.email}
                      </span>
                      {contractor.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-4 h-4" />
                          {contractor.phone}
                        </span>
                      )}
                      {contractor.city && contractor.state && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          {contractor.city} - {contractor.state}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {formatDate(contractor.created_at)}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => confirmDelete(contractor.id)}
                    disabled={deleting === contractor.id}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-red-600 border border-red-200 hover:bg-red-50 disabled:opacity-60"
                  >
                    <Trash2 className="w-4 h-4" />
                    {deleting === contractor.id ? 'Removendo...' : 'Remover'}
                  </button>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </AdminCard>
    </div>
  );
};

export default AdminOrganizations;
