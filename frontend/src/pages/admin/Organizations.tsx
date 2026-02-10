import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Mail, Phone, MapPin, Calendar, User } from 'lucide-react';
import { motion } from 'framer-motion';
import { adminContractorService, type ContractorProfile } from '../../services/publicApi';
import {
  AdminHero,
  AdminCard,
  AdminSearchBar,
  AdminButton,
  AdminPagination,
  AdminEmptyState,
  AdminLoading,
  AdminConfirmModal,
} from '../../components/admin';
import { showToast } from '../../utils/toast';

const ITEMS_PER_PAGE = 10;

const AdminOrganizations: React.FC = () => {
  const [contractors, setContractors] = useState<ContractorProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [contractorToDelete, setContractorToDelete] = useState<ContractorProfile | null>(null);

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

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const filteredContractors = useMemo(() => {
    return contractors.filter(contractor => {
      const searchLower = searchTerm.toLowerCase();
      return (
        contractor.name.toLowerCase().includes(searchLower) ||
        contractor.email.toLowerCase().includes(searchLower) ||
        contractor.city?.toLowerCase().includes(searchLower) ||
        contractor.state?.toLowerCase().includes(searchLower)
      );
    });
  }, [contractors, searchTerm]);

  const totalPages = Math.ceil(filteredContractors.length / ITEMS_PER_PAGE);
  const paginatedContractors = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredContractors.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredContractors, currentPage]);

  const confirmDelete = async () => {
    if (!contractorToDelete) return;
    try {
      setDeleting(contractorToDelete.id);
      await adminContractorService.delete(contractorToDelete.id);
      setContractors(prev => prev.filter(c => c.id !== contractorToDelete.id));
      showToast.success('Contratante deletado com sucesso');
      setContractorToDelete(null);
    } catch (error) {
      showToast.apiError(error);
    } finally {
      setDeleting(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <AdminHero
          title="Gerenciamento de Contratantes"
          description="Liste e gerencie todos os contratantes cadastrados"
        />
        <AdminLoading count={3} />
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

      {/* Search */}
      <AdminCard>
        <AdminSearchBar
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder="Buscar por nome, email, cidade..."
        />
      </AdminCard>

      {/* Contractors List */}
      {filteredContractors.length === 0 ? (
        <AdminEmptyState
          title={searchTerm ? 'Nenhum contratante encontrado' : 'Nenhum contratante cadastrado'}
        />
      ) : (
        <>
          <div className="space-y-4">
            {paginatedContractors.map(contractor => (
              <motion.div
                key={contractor.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <AdminCard>
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-semibold text-white">{contractor.name}</h3>
                      <div className="mt-2 flex flex-wrap gap-3 text-sm text-slate-400">
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
                    <AdminButton
                      variant="danger"
                      size="sm"
                      onClick={() => setContractorToDelete(contractor)}
                      disabled={deleting === contractor.id}
                      loading={deleting === contractor.id}
                    >
                      Remover
                    </AdminButton>
                  </div>
                </AdminCard>
              </motion.div>
            ))}
          </div>

          <AdminPagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredContractors.length}
            itemsPerPage={ITEMS_PER_PAGE}
            onPageChange={setCurrentPage}
          />
        </>
      )}

      {/* Delete Confirmation Modal */}
      <AdminConfirmModal
        isOpen={!!contractorToDelete}
        onClose={() => setContractorToDelete(null)}
        onConfirm={confirmDelete}
        title="Remover Contratante"
        message={`Tem certeza que deseja remover ${contractorToDelete?.name}? Esta ação não pode ser desfeita.`}
        confirmLabel="Remover"
        variant="danger"
        loading={deleting !== null}
      />
    </div>
  );
};

export default AdminOrganizations;
