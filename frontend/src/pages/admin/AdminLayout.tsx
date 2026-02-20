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

  const userInitials = user.first_name
    ? `${user.first_name[0]}${user.last_name?.[0] ?? ''}`.toUpperCase()
    : (user.username?.[0] ?? 'A').toUpperCase();

  const displayName = user.first_name
    ? `${user.first_name} ${user.last_name ?? ''}`.trim()
    : user.username;

  return (
    <div className="min-h-[100svh] relative">
      <AnimatedBackground enableBlueWaves={true} enableParticles={false} />

      {/* Mobile Header */}
      <div className="lg:hidden bg-slate-900/90 backdrop-blur border-b border-white/10 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-6 w-6 text-indigo-400" />
          <span className="font-semibold text-white">GigFlow Admin</span>
        </div>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 rounded-lg hover:bg-white/10 text-white min-h-[44px] min-w-[44px] flex items-center justify-center"
        >
          {sidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/60 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50
          w-64 h-[100svh] bg-slate-900/95 backdrop-blur border-r border-white/10
          flex flex-col
          transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0
          transition-transform duration-200 ease-in-out
          pt-16 lg:pt-0
        `}
      >
        {/* Logo & Brand */}
        <div className="hidden lg:flex items-center gap-3 px-5 py-4 border-b border-white/10">
          <div className="flex items-center justify-center w-9 h-9 bg-indigo-500/20 rounded-lg">
            <Shield className="h-5 w-5 text-indigo-400" />
          </div>
          <div>
            <h1 className="font-bold text-white text-base leading-tight">GigFlow</h1>
            <p className="text-xs text-slate-500">Painel Admin</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {navItems.map(item => {
            const isActive =
              location.pathname === item.path ||
              (item.path !== ADMIN_ROUTES.dashboard && location.pathname.startsWith(item.path));
            const Icon = item.icon;

            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`
                  min-h-[44px] flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150
                  ${isActive ? 'admin-nav-active' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'}
                `}
              >
                <Icon className={`h-4 w-4 flex-shrink-0 ${isActive ? 'text-indigo-400' : ''}`} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User Info + Logout */}
        <div className="px-3 py-3 border-t border-white/10 space-y-1">
          <div className="flex items-center gap-3 px-2 py-2 rounded-lg">
            <div className="flex items-center justify-center w-8 h-8 bg-indigo-500/20 rounded-full flex-shrink-0 text-xs font-bold text-indigo-300 ring-1 ring-indigo-500/30">
              {userInitials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-white truncate leading-tight">{displayName}</p>
              <p className="text-xs text-slate-500 truncate">{user.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="min-h-[40px] flex items-center gap-3 px-3 py-2 w-full rounded-lg text-sm font-medium text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Sair
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:ml-64 min-h-[100svh] relative z-10">
        <div className="page-shell py-5 sm:py-6 space-y-4">
          <AdminBreadcrumbs />
          <AdminErrorBoundary>{children ?? <Outlet />}</AdminErrorBoundary>
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
