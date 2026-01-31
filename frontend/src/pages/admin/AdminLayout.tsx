import React, { useState, useEffect } from 'react';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, MapPin, LogOut, Shield, Menu, X } from 'lucide-react';
import { adminService, authService } from '../../services/api';
import { showToast } from '../../utils/toast';

interface AdminLayoutProps {
  children?: React.ReactNode;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAdminAccess = async () => {
      try {
        const admin = await adminService.getMe();
        if (!admin.is_staff && !admin.is_superuser) {
          showToast.error('Acesso negado. Esta área é restrita a administradores.');
          navigate('/admin/login');
        }
      } catch (error) {
        console.error('Error checking admin access:', error);
        navigate('/admin/login');
      } finally {
        setLoading(false);
      }
    };

    checkAdminAccess();
  }, [navigate]);

  const handleLogout = async () => {
    try {
      await authService.logout();
      showToast.success('Logout realizado com sucesso.');
      navigate('/admin/login');
    } catch (error) {
      showToast.apiError(error);
    }
  };

  const navItems = [
    {
      icon: LayoutDashboard,
      label: 'Dashboard',
      path: '/admin/dashboard',
    },
    {
      icon: Users,
      label: 'Solicitações',
      path: '/admin/solicitacoes',
    },
    {
      icon: MapPin,
      label: 'Cidades',
      path: '/admin/cidades',
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-amber-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <div className="lg:hidden bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-6 w-6 text-amber-600" />
          <span className="font-semibold text-gray-900">GigFlow Admin</span>
        </div>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 rounded-lg hover:bg-gray-100"
        >
          {sidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-50
          w-64 bg-white border-r border-gray-200
          transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0
          transition-transform duration-200 ease-in-out
          pt-16 lg:pt-0
        `}
      >
        {/* Logo & Brand */}
        <div className="hidden lg:flex items-center gap-2 px-6 py-4 border-b border-gray-200">
          <Shield className="h-8 w-8 text-amber-600" />
          <div>
            <h1 className="font-bold text-gray-900 text-lg">GigFlow</h1>
            <p className="text-xs text-gray-500">Painel Administrativo</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map(item => {
            const isActive =
              location.pathname === item.path ||
              (item.path !== '/admin/dashboard' && location.pathname.startsWith(item.path));
            const Icon = item.icon;

            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                  ${
                    isActive
                      ? 'bg-amber-50 text-amber-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }
                `}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Logout Button */}
        <div className="p-3 border-t border-gray-200">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut className="h-5 w-5" />
            Sair
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:ml-64 min-h-screen">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">{children ?? <Outlet />}</div>
      </main>
    </div>
  );
};

export default AdminLayout;
