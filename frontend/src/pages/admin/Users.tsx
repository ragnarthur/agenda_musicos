import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Trash2, Shield, Users, UserCheck, User as UserIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import {
  AdminHero,
  AdminCard,
  AdminSearchBar,
  AdminModal,
  AdminButton,
  AdminPagination,
  AdminEmptyState,
  AdminLoading,
  AdminBadge,
  AdminConfirmModal,
} from '../../components/admin';
import { showToast } from '../../utils/toast';
import { ADMIN_ROUTES } from '../../routes/adminRoutes';
import { adminService, type UsersListResponse } from '../../services/adminService';

const ITEMS_PER_PAGE = 10;

const AdminUsers: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { id: userIdParam } = useParams();
  const [users, setUsers] = useState<UsersListResponse>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(searchParams.get('q') || '');
  const [currentPage, setCurrentPage] = useState(1);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UsersListResponse[0] | null>(null);
  const [selectedUser, setSelectedUser] = useState<UsersListResponse[0] | null>(null);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const data = await adminService.listUsers();
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      showToast.apiError(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    if (!userIdParam) {
      setSelectedUser(null);
      return;
    }

    const parsedId = Number(userIdParam);
    if (Number.isNaN(parsedId)) {
      setSelectedUser(null);
      return;
    }

    const found = users.find(user => user.id === parsedId);
    if (found) {
      setSelectedUser(found);
    } else if (!loading && users.length > 0) {
      setSelectedUser(null);
      const query = searchParams.toString();
      navigate(
        {
          pathname: ADMIN_ROUTES.users,
          search: query ? `?${query}` : '',
        },
        { replace: true }
      );
    }
  }, [userIdParam, users, loading, navigate, searchParams]);

  useEffect(() => {
    const params: Record<string, string> = {};
    if (searchTerm) params.q = searchTerm;
    setSearchParams(params, { replace: true });
  }, [searchTerm, setSearchParams]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const searchLower = searchTerm.toLowerCase();
      const username = user.username || '';
      const email = user.email || '';
      const firstName = user.first_name || '';
      const lastName = user.last_name || '';
      const fullName = `${firstName} ${lastName}`.trim();

      return (
        username.toLowerCase().includes(searchLower) ||
        email.toLowerCase().includes(searchLower) ||
        fullName.toLowerCase().includes(searchLower)
      );
    });
  }, [users, searchTerm]);

  const totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE);
  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredUsers.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredUsers, currentPage]);

  const handleDeleteClick = (user: UsersListResponse[0]) => {
    setUserToDelete(user);
    setShowConfirmModal(true);
  };

  const handleViewDetails = (user: UsersListResponse[0]) => {
    setSelectedUser(user);
    const query = searchParams.toString();
    navigate({
      pathname: ADMIN_ROUTES.usersDetail(user.id),
      search: query ? `?${query}` : '',
    });
  };

  const handleCloseDetails = () => {
    setSelectedUser(null);
    const query = searchParams.toString();
    navigate({
      pathname: ADMIN_ROUTES.users,
      search: query ? `?${query}` : '',
    });
  };

  const confirmDelete = async () => {
    if (!userToDelete) return;

    try {
      setDeleting(userToDelete.id);
      await adminService.deleteUser(userToDelete.id);
      showToast.success('Usuário deletado com sucesso');
      setUsers(prev => prev.filter(u => u.id !== userToDelete.id));
      setShowConfirmModal(false);
      setUserToDelete(null);
    } catch (error) {
      console.error('Error deleting user:', error);
      showToast.apiError(error);
    } finally {
      setDeleting(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <AdminHero
          title="Gerenciamento de Usuários"
          description="Liste e gerencie todos os usuários da plataforma"
        />
        <AdminLoading count={3} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AdminHero
        title="Gerenciamento de Usuários"
        description="Liste e gerencie todos os usuários da plataforma"
        stats={[
          { label: 'Total Usuários', value: users.length, icon: Users },
          { label: 'Staff', value: users.filter(u => u.is_staff).length, icon: Shield },
          {
            label: 'Superadmins',
            value: users.filter(u => u.is_superuser).length,
            icon: UserCheck,
          },
        ]}
      />

      {/* Search */}
      <AdminCard>
        <AdminSearchBar
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder="Buscar por nome, email ou usuário..."
        />
      </AdminCard>

      {/* Users List */}
      {filteredUsers.length === 0 ? (
        <AdminEmptyState
          icon={UserIcon}
          title={searchTerm ? 'Nenhum usuário encontrado' : 'Nenhum usuário cadastrado'}
        />
      ) : (
        <>
          <div className="space-y-4">
            {paginatedUsers.map(user => (
              <motion.div
                key={user.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <AdminCard>
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center justify-center w-12 h-12 bg-indigo-500/20 rounded-full flex-shrink-0">
                        <UserIcon className="text-indigo-400 w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-white">
                          {user.first_name} {user.last_name}
                        </h3>
                        <p className="text-sm text-slate-400">
                          @{user.username} &middot; {user.email}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <AdminButton
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewDetails(user)}
                      >
                        Detalhes
                      </AdminButton>
                      {user.is_superuser && <AdminBadge status="planned" size="sm" />}
                      {user.is_staff && !user.is_superuser && (
                        <AdminBadge status="active" size="sm" />
                      )}
                      {!user.username.startsWith('admin_') && (
                        <AdminButton
                          variant="danger"
                          size="sm"
                          icon={Trash2}
                          onClick={() => handleDeleteClick(user)}
                          disabled={deleting === user.id}
                        >
                          Remover
                        </AdminButton>
                      )}
                    </div>
                  </div>
                </AdminCard>
              </motion.div>
            ))}
          </div>

          <AdminPagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredUsers.length}
            itemsPerPage={ITEMS_PER_PAGE}
            onPageChange={setCurrentPage}
          />
        </>
      )}

      {/* Delete Confirmation Modal */}
      <AdminConfirmModal
        isOpen={showConfirmModal && !!userToDelete}
        onClose={() => {
          setShowConfirmModal(false);
          setUserToDelete(null);
        }}
        onConfirm={confirmDelete}
        title="Deletar Usuário"
        message={`Tem certeza que deseja deletar ${userToDelete?.first_name} ${userToDelete?.last_name}? Esta ação não pode ser desfeita. Todos os dados do usuário serão permanentemente removidos.`}
        confirmLabel="Deletar"
        variant="danger"
        loading={deleting !== null}
      />

      {/* Details Modal */}
      <AdminModal
        isOpen={!!selectedUser}
        onClose={handleCloseDetails}
        title="Detalhes do Usuário"
        size="sm"
        footer={
          <AdminButton variant="secondary" onClick={handleCloseDetails}>
            Fechar
          </AdminButton>
        }
      >
        {selectedUser && (
          <div className="space-y-4">
            <div className="flex items-center gap-4 mb-4">
              <div className="flex items-center justify-center w-14 h-14 bg-indigo-500/20 rounded-full">
                <UserIcon className="text-indigo-400 w-7 h-7" />
              </div>
              <div>
                <h3 className="font-semibold text-white text-lg">
                  {selectedUser.first_name} {selectedUser.last_name}
                </h3>
                <p className="text-sm text-slate-400">@{selectedUser.username}</p>
              </div>
            </div>

            <div className="space-y-2 text-sm text-slate-300">
              <p>
                <strong className="text-white">Email:</strong> {selectedUser.email}
              </p>
              <p>
                <strong className="text-white">Staff:</strong>{' '}
                {selectedUser.is_staff ? (
                  <span className="text-emerald-400">Sim</span>
                ) : (
                  <span className="text-slate-500">Não</span>
                )}
              </p>
              <p>
                <strong className="text-white">Superadmin:</strong>{' '}
                {selectedUser.is_superuser ? (
                  <span className="text-indigo-400">Sim</span>
                ) : (
                  <span className="text-slate-500">Não</span>
                )}
              </p>
            </div>
          </div>
        )}
      </AdminModal>
    </div>
  );
};

export default AdminUsers;
