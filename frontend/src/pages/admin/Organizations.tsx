import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Trash2, Building2, User, Mail, Phone, Calendar, Shield, Search, Globe, Tag } from 'lucide-react';
import { motion } from 'framer-motion';
import { adminOrganizationService, type OrganizationWithOwner } from '../../services/publicApi';
import { AdminHero, AdminCard } from '../../components/admin';
import { showToast } from '../../utils/toast';
import { ADMIN_ROUTES } from '../../routes/adminRoutes';

const AdminOrganizations: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { id: organizationIdParam } = useParams();
  const [organizations, setOrganizations] = useState<OrganizationWithOwner[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(searchParams.get('q') || '');
  const [deleting, setDeleting] = useState<number | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [orgToDelete, setOrgToDelete] = useState<OrganizationWithOwner | null>(null);
  const [selectedOrg, setSelectedOrg] = useState<OrganizationWithOwner | null>(null);

  const fetchOrganizations = useCallback(async () => {
    try {
      setLoading(true);
      const data = await adminOrganizationService.list();
      setOrganizations(data || []);
    } catch (error) {
      console.error('Error fetching organizations:', error);
      showToast.apiError(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrganizations();
  }, [fetchOrganizations]);

  useEffect(() => {
    if (!organizationIdParam) {
      setSelectedOrg(null);
      return;
    }

    const parsedId = Number(organizationIdParam);
    if (Number.isNaN(parsedId)) {
      setSelectedOrg(null);
      return;
    }

    const found = organizations.find(org => org.id === parsedId);
    if (found) {
      setSelectedOrg(found);
    } else if (!loading && organizations.length > 0) {
      setSelectedOrg(null);
      const query = searchParams.toString();
      navigate(
        {
          pathname: ADMIN_ROUTES.organizations,
          search: query ? `?${query}` : '',
        },
        { replace: true }
      );
    }
  }, [organizationIdParam, organizations, loading, navigate, searchParams]);

  useEffect(() => {
    const params: Record<string, string> = {};
    if (searchTerm) params.q = searchTerm;
    setSearchParams(params, { replace: true });
  }, [searchTerm, setSearchParams]);

  const filteredOrgs = organizations.filter(org => {
    const searchLower = searchTerm.toLowerCase();
    return (
      org.name.toLowerCase().includes(searchLower) ||
      org.org_type.toLowerCase().includes(searchLower) ||
      org.owner_data?.email.toLowerCase().includes(searchLower) ||
      org.owner_data?.username.toLowerCase().includes(searchLower)
    );
  });

  const handleDeleteClick = (org: OrganizationWithOwner) => {
    if (!org.owner_data) {
      showToast.error('Esta organização não possui um dono definido');
      return;
    }
    setOrgToDelete(org);
    setShowConfirmModal(true);
  };

  const handleViewDetails = (org: OrganizationWithOwner) => {
    setSelectedOrg(org);
    const query = searchParams.toString();
    navigate({
      pathname: ADMIN_ROUTES.organizationsDetail(org.id),
      search: query ? `?${query}` : '',
    });
  };

  const handleCloseDetails = () => {
    setSelectedOrg(null);
    const query = searchParams.toString();
    navigate({
      pathname: ADMIN_ROUTES.organizations,
      search: query ? `?${query}` : '',
    });
  };

  const confirmDelete = async () => {
    if (!orgToDelete) return;
    
    try {
      setDeleting(orgToDelete.id);
      await adminOrganizationService.delete(orgToDelete.id);
      showToast.success('Organização deletada com sucesso');
      setOrganizations(prev => prev.filter(o => o.id !== orgToDelete.id));
      setShowConfirmModal(false);
      setOrgToDelete(null);
    } catch (error) {
      console.error('Error deleting organization:', error);
      showToast.apiError(error);
    } finally {
      setDeleting(null);
    }
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };



  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <AdminHero
          title="Gerenciamento de Empresas"
          description="Liste e gerencie todas as empresas/organizações da plataforma"
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

  const totalSponsors = organizations.filter(o => o.is_sponsor).length;
  const totalCompanies = organizations.filter(o => o.org_type === 'company').length;
  const totalVenues = organizations.filter(o => o.org_type === 'venue').length;

  return (
    <div className="space-y-6">
      <AdminHero
        title="Gerenciamento de Empresas"
        description="Liste e gerencie todas as empresas/organizações da plataforma"
        stats={[
          { label: 'Total', value: organizations.length, icon: Globe },
          { label: 'Patrocinadores', value: totalSponsors, icon: Shield },
          { label: 'Empresas', value: totalCompanies, icon: Building2 },
          { label: 'Locais', value: totalVenues, icon: Tag },
        ]}
      />

      <AdminCard>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Buscar por nome, email, tipo..."
            value={searchTerm}
            onChange={handleSearch}
            className="min-h-[44px] w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>
      </AdminCard>

      <AdminCard>
        <div className="space-y-4">
          {filteredOrgs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {searchTerm ? 'Nenhuma organização encontrada' : 'Nenhuma organização cadastrada'}
            </div>
          ) : (
            filteredOrgs.map((org) => (
              <motion.div
                key={org.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 bg-white rounded-lg border border-gray-200 hover:border-indigo-300 transition-colors"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      {org.logo_url ? (
                        <img
                          src={org.logo_url}
                          alt={org.name}
                          className="w-12 h-12 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="flex items-center justify-center w-12 h-12 bg-indigo-100 rounded-lg">
                          <Building2 className="text-indigo-600 w-5 h-5" />
                        </div>
                      )}
                      <div>
                        <h3 className="font-semibold text-gray-900">{org.name}</h3>
                        <span className="text-sm text-gray-600 capitalize">{org.org_type}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3 text-sm text-gray-600">
                      {org.owner_data && (
                        <div className="flex items-center space-x-2">
                          <User className="w-4 h-4 text-gray-400" />
                          <span>{org.owner_data.first_name} {org.owner_data.last_name}</span>
                          {org.owner_data.is_superuser && (
                            <Shield className="w-3 h-3 text-purple-600" />
                          )}
                        </div>
                      )}
                      {org.owner_data && (
                        <div className="flex items-center space-x-2">
                          <Mail className="w-4 h-4 text-gray-400" />
                          <span>{org.owner_data.email}</span>
                        </div>
                      )}
                      {org.phone && (
                        <div className="flex items-center space-x-2">
                          <Phone className="w-4 h-4 text-gray-400" />
                          <span>{org.phone}</span>
                        </div>
                      )}
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span>Criado em {formatDate(org.created_at)}</span>
                      </div>
                    </div>

                    {org.description && (
                      <p className="mt-3 text-sm text-gray-600 line-clamp-2">{org.description}</p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => handleViewDetails(org)}
                      className="min-h-[44px] px-3 py-1.5 text-sm font-semibold text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                    >
                      Detalhes
                    </button>
                    {org.is_sponsor && (
                      <span className="inline-flex items-center px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                        Patrocinador
                      </span>
                    )}
                    {org.owner_data && (
                      <button
                        onClick={() => handleDeleteClick(org)}
                        disabled={deleting === org.owner_data.id}
                        className="min-h-[44px] min-w-[44px] p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Deletar organização (via usuário dono)"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </AdminCard>

      {showConfirmModal && orgToDelete && orgToDelete.owner_data && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl"
          >
            <div className="flex items-center space-x-3 mb-4">
              <div className="flex items-center justify-center w-12 h-12 bg-red-100 rounded-full">
                <Trash2 className="text-red-600 w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Deletar Organização</h2>
                <p className="text-sm text-gray-600">{orgToDelete.name}</p>
              </div>
            
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-red-800">
                <strong>Atenção:</strong> Esta ação não pode ser desfeita. A organização será permanentemente removida do sistema.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row justify-end gap-2">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="min-h-[44px] px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleting !== null}
                className="min-h-[44px] px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleting === orgToDelete.id ? 'Deletando...' : 'Confirmar'}
              </button>
            </div>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-red-800">
                <strong>Atenção:</strong> Esta ação não pode ser desfeita. A organização e o usuário dono (
                {orgToDelete.owner_data.first_name} {orgToDelete.owner_data.last_name}) serão permanentemente removidos do sistema.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row justify-end gap-2">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="min-h-[44px] px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleting !== null}
                className="min-h-[44px] px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleting === orgToDelete.owner_data.id ? 'Deletando...' : 'Confirmar'}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {selectedOrg && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl"
          >
            <div className="flex items-center space-x-3 mb-4">
              <div className="flex items-center justify-center w-12 h-12 bg-indigo-100 rounded-full">
                <Building2 className="text-indigo-600 w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Detalhes da Organização</h2>
                <p className="text-sm text-gray-600">{selectedOrg.name}</p>
              </div>
            </div>

            <div className="space-y-2 text-sm text-gray-700">
              <p>
                <strong>Tipo:</strong> {selectedOrg.org_type}
              </p>
              <p>
                <strong>Contato:</strong> {selectedOrg.contact_name || '—'}
              </p>
              <p>
                <strong>Email:</strong> {selectedOrg.contact_email || '—'}
              </p>
              <p>
                <strong>Telefone:</strong> {selectedOrg.phone || '—'}
              </p>
              {selectedOrg.owner_data && (
                <p>
                  <strong>Dono:</strong> {selectedOrg.owner_data.username} (
                  {selectedOrg.owner_data.email})
                </p>
              )}
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={handleCloseDetails}
                className="min-h-[44px] px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Fechar
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default AdminOrganizations;
