import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Mail, Phone, MapPin, Calendar, User, Building2 } from 'lucide-react';
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
  AdminModal,
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
  const [selectedContractor, setSelectedContractor] = useState<ContractorProfile | null>(null);

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
      showToast.success('Contratante removido com sucesso');
      setContractorToDelete(null);
      if (selectedContractor?.id === contractorToDelete.id) setSelectedContractor(null);
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
          { label: 'Total', value: contractors.length, icon: Building2 },
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
                    <div className="flex items-start gap-3">
                      <div className="flex items-center justify-center w-10 h-10 bg-indigo-500/20 rounded-full flex-shrink-0 mt-0.5">
                        <Building2 className="text-indigo-400 w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-base font-semibold text-white">{contractor.name}</h3>
                        <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-sm text-slate-400">
                          <span className="flex items-center gap-1">
                            <Mail className="w-3.5 h-3.5" />
                            {contractor.email}
                          </span>
                          {contractor.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="w-3.5 h-3.5" />
                              {contractor.phone}
                            </span>
                          )}
                          {contractor.city && contractor.state && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5" />
                              {contractor.city} - {contractor.state}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            {formatDate(contractor.created_at)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <AdminButton
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedContractor(contractor)}
                      >
                        Detalhes
                      </AdminButton>
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

      {/* Details Modal */}
      <AdminModal
        isOpen={!!selectedContractor}
        onClose={() => setSelectedContractor(null)}
        title="Detalhes do Contratante"
        size="sm"
        footer={
          <div className="flex gap-2">
            <AdminButton variant="secondary" onClick={() => setSelectedContractor(null)}>
              Fechar
            </AdminButton>
            {selectedContractor && (
              <AdminButton
                variant="danger"
                onClick={() => {
                  setContractorToDelete(selectedContractor);
                  setSelectedContractor(null);
                }}
              >
                Remover
              </AdminButton>
            )}
          </div>
        }
      >
        {selectedContractor && (
          <div className="space-y-4">
            <div className="flex items-center gap-4 pb-4 border-b border-white/10">
              <div className="flex items-center justify-center w-14 h-14 bg-indigo-500/20 rounded-full flex-shrink-0">
                <Building2 className="text-indigo-400 w-7 h-7" />
              </div>
              <div>
                <h3 className="font-semibold text-white text-lg leading-tight">
                  {selectedContractor.name}
                </h3>
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    selectedContractor.is_active
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-slate-600/40 text-slate-400'
                  }`}
                >
                  {selectedContractor.is_active ? 'Ativo' : 'Inativo'}
                </span>
              </div>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-3">
                <Mail className="w-4 h-4 text-slate-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-slate-400 text-xs">Email</p>
                  <p className="text-white">{selectedContractor.email}</p>
                </div>
              </div>
              {selectedContractor.phone && (
                <div className="flex items-start gap-3">
                  <Phone className="w-4 h-4 text-slate-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-slate-400 text-xs">Telefone</p>
                    <p className="text-white">{selectedContractor.phone}</p>
                  </div>
                </div>
              )}
              {selectedContractor.city && selectedContractor.state && (
                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-slate-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-slate-400 text-xs">Localização</p>
                    <p className="text-white">
                      {selectedContractor.city} — {selectedContractor.state}
                    </p>
                  </div>
                </div>
              )}
              <div className="flex items-start gap-3">
                <Calendar className="w-4 h-4 text-slate-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-slate-400 text-xs">Cadastrado em</p>
                  <p className="text-white">{formatDate(selectedContractor.created_at)}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </AdminModal>

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
