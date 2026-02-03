import React, { useState } from 'react';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { LogOut, Shield, Menu, X } from 'lucide-react';
import { useAdminAuth } from '../../contexts/AdminAuthContext';
import { showToast } from '../../utils/toast';
import AnimatedBackground from '../../components/Layout/AnimatedBackground';
import { ADMIN_ROUTES, adminNavItems } from '../../routes/adminRoutes';
import AdminBreadcrumbs from '../../components/admin/AdminBreadcrumbs';
import AdminErrorBoundary from '../../components/admin/AdminErrorBoundary';

interface AdminLayoutProps {
  children?: React.ReactNode;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, loading, logout } = useAdminAuth();

  const handleLogout = async () => {
    try {
      await logout();
      showToast.success('Logout realizado com sucesso.');
      navigate(ADMIN_ROUTES.login);
    } catch (error) {
      showToast.apiError(error);
    }
  };

  const navItems = adminNavItems;

  if (loading || !user) {
    return null;
  }

  return (
    <div className="min-h-screen relative">
      <AnimatedBackground enableBlueWaves={true} enableParticles={false} />

      {/* Mobile Header */}
      <div className="lg:hidden bg-slate-900/90 backdrop-blur border-b border-white/10 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-6 w-6 text-indigo-600" />
          <span className="font-semibold text-white">GigFlow Admin</span>
        </div>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 rounded-lg hover:bg-white/10 text-white"
        >
          {sidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/60 z-40 relative"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-50 relative
          w-64 bg-slate-900/90 backdrop-blur border-r border-white/10
          transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0
          transition-transform duration-200 ease-in-out
          pt-16 lg:pt-0
        `}
      >
        {/* Logo & Brand */}
        <div className="hidden lg:flex items-center gap-2 px-6 py-4 border-b border-white/10">
          <Shield className="h-8 w-8 text-indigo-600" />
          <div>
            <h1 className="font-bold text-white text-lg">GigFlow</h1>
            <p className="text-xs text-slate-400">Painel Administrativo</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map(item => {
            const isActive =
              location.pathname === item.path ||
              (item.path !== ADMIN_ROUTES.dashboard &&
                location.pathname.startsWith(item.path));
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
                      ? 'bg-white/10 text-white'
                      : 'text-slate-300 hover:bg-white/10 hover:text-white'
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
        <div className="p-3 border-t border-white/10">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-sm font-medium text-red-400 hover:bg-red-500/20 transition-colors"
          >
            <LogOut className="h-5 w-5" />
            Sair
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:ml-64 min-h-screen relative z-10">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">
          <AdminBreadcrumbs />
          <AdminErrorBoundary>{children ?? <Outlet />}</AdminErrorBoundary>
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
