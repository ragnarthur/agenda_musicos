import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Trash2, Shield, Search, Users, UserCheck, User as UserIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { AdminHero, AdminCard } from '../../components/admin';
import { showToast } from '../../utils/toast';
import { ADMIN_ROUTES } from '../../routes/adminRoutes';
import { adminService, type UsersListResponse } from '../../services/adminService';

const AdminUsers: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { id: userIdParam } = useParams();
  const [users, setUsers] = useState<UsersListResponse>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(searchParams.get('q') || '');
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

  const filteredUsers = users.filter(user => {
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

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <AdminHero
          title="Gerenciamento de Usuários"
          description="Liste e gerencie todos os usuários da plataforma"
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
      {/* Hero Section */}
      <AdminHero
        title="Gerenciamento de Usuários"
        description="Liste e gerencie todos os usuários da plataforma"
        stats={[
          { label: 'Total Usuários', value: users.length, icon: Users },
          { label: 'Staff', value: users.filter(u => u.is_staff).length, icon: Shield },
          { label: 'Superadmins', value: users.filter(u => u.is_superuser).length, icon: UserCheck },
        ]}
      />

      {/* Search Bar */}
      <AdminCard>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Buscar por nome, email ou usuário..."
            value={searchTerm}
            onChange={handleSearch}
            className="min-h-[44px] w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>
      </AdminCard>

      {/* Users List */}
      <AdminCard>
        <div className="space-y-4">
          {filteredUsers.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {searchTerm ? 'Nenhum usuário encontrado' : 'Nenhum usuário cadastrado'}
            </div>
          ) : (
            filteredUsers.map((user) => (
              <motion.div
                key={user.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between p-4 bg-white rounded-lg border border-gray-200 hover:border-indigo-300 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="flex items-center justify-center w-12 h-12 bg-indigo-100 rounded-full">
                    <UserIcon className="text-indigo-600 w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {user.first_name} {user.last_name}
                    </h3>
                    <p className="text-sm text-gray-600">
                      @{user.username} &middot; {user.email}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => handleViewDetails(user)}
                    className="min-h-[44px] px-3 py-1.5 text-sm font-semibold text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                  >
                    Detalhes
                  </button>
                  {/* Badges */}
                  {user.is_superuser && (
                    <span className="inline-flex items-center px-2 py-1 bg-purple-100 text-purple-800 text-xs font-medium rounded-full">
                      <Shield className="w-3 h-3 mr-1" />
                      Superadmin
                    </span>
                  )}
                  {user.is_staff && !user.is_superuser && (
                    <span className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                      Staff
                    </span>
                  )}

                  {/* Delete Button */}
                  {!user.username.startsWith('admin_') && (
                    <button
                      onClick={() => handleDeleteClick(user)}
                      disabled={deleting === user.id}
                      className="min-h-[44px] min-w-[44px] p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Deletar usuário"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </motion.div>
            ))
          )}
        </div>
      </AdminCard>

      {/* Delete Confirmation Modal */}
      {showConfirmModal && userToDelete && (
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
                <h2 className="text-xl font-bold text-gray-900">
                  Deletar Usuário
                </h2>
                <p className="text-sm text-gray-600">
                  {userToDelete.first_name} {userToDelete.last_name}
                </p>
              </div>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-red-800">
                <strong>Atenção:</strong> Esta ação não pode ser desfeita. Todos os dados do usuário (perfil, eventos, conexões, etc.) serão permanentemente removidos do sistema.
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
                {deleting === userToDelete.id ? 'Deletando...' : 'Confirmar'}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Details Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl"
          >
            <div className="flex items-center space-x-3 mb-4">
              <div className="flex items-center justify-center w-12 h-12 bg-indigo-100 rounded-full">
                <UserIcon className="text-indigo-600 w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Detalhes do Usuário</h2>
                <p className="text-sm text-gray-600">
                  {selectedUser.first_name} {selectedUser.last_name}
                </p>
              </div>
            </div>

            <div className="space-y-2 text-sm text-gray-700">
              <p>
                <strong>Username:</strong> @{selectedUser.username}
              </p>
              <p>
                <strong>Email:</strong> {selectedUser.email}
              </p>
              <p>
                <strong>Staff:</strong> {selectedUser.is_staff ? 'Sim' : 'Não'}
              </p>
              <p>
                <strong>Superadmin:</strong> {selectedUser.is_superuser ? 'Sim' : 'Não'}
              </p>
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

export default AdminUsers;
