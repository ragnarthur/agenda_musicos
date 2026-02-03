// components/Layout/Navbar.tsx
import React, { useCallback, useEffect, useRef, useState, memo } from 'react';
import { Link, NavLink as RouterNavLink, useNavigate } from 'react-router-dom';
import {
  Calendar,
  Users,
  LogOut,
  Clock,
  Megaphone,
  HeartHandshake,
  Menu,
  X,
  Bell,
  UserCheck,
  Wallet,
  Shield,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../hooks/useNotifications';
import OwlMascot from '../ui/OwlMascot';
import ThemeToggle from './ThemeToggle';
import CityBadge from '../CityBadge';
import { ADMIN_ROUTES } from '../../routes/adminRoutes';

const Navbar: React.FC = memo(() => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [openMore, setOpenMore] = useState(false);
  const [openDesktopMore, setOpenDesktopMore] = useState(false);
  const desktopMoreRef = useRef<HTMLDivElement | null>(null);

  // Use SWR hook for notifications - shared across Navbar and Dashboard
  const { pendingMyResponse, pendingApproval } = useNotifications();

  const displayName = user?.full_name || user?.user?.first_name || user?.user?.username || 'Conta';
  const isStaff = Boolean(user?.user?.is_staff);

  const handleLogout = useCallback(async () => {
    await logout();
    navigate('/login');
  }, [logout, navigate]);

  useEffect(() => {
    const onClickOutside = (event: MouseEvent) => {
      if (desktopMoreRef.current && !desktopMoreRef.current.contains(event.target as Node)) {
        setOpenDesktopMore(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  return (
    <nav className="bg-gradient-to-r from-slate-950/90 via-slate-900/85 to-slate-950/90 backdrop-blur-xl shadow-lg shadow-black/30 sticky top-0 z-50 border-b border-white/10 overflow-visible">
      <div className="container mx-auto px-3 sm:px-4">
        <div className="flex flex-wrap md:flex-nowrap items-center justify-between min-h-[64px] py-2 gap-x-3 gap-y-2">
          {/* Logo e Nome */}
          <Link
            to="/dashboard"
            className="flex items-center space-x-3 hover:scale-[1.01] transition-transform min-w-fit"
          >
            <div className="h-12 w-12 flex items-center justify-center">
              <OwlMascot className="h-12 w-12" />
            </div>
            <div className="flex flex-col leading-tight">
              <div className="flex items-center gap-2">
                <span className="text-lg sm:text-xl font-bold logo-animated">GigFlow</span>
                <span className="text-xs px-2 py-0.5 bg-gradient-to-r from-amber-500/10 via-amber-400/15 to-amber-500/10 text-amber-100/80 rounded-full border border-amber-400/20 font-light italic tracking-wider">
                  Beta
                </span>
              </div>
              <span className="text-xs text-slate-300 hidden sm:block">Agenda para músicos</span>
            </div>
          </Link>

          {/* Links de Navegação */}
          <div className="hidden 2xl:flex items-center gap-3 md:-ml-1 min-w-0 flex-1">
            <AppNavLink
              to="/eventos"
              icon={<Calendar className="h-5 w-5" />}
              label="Eventos"
              badge={pendingMyResponse}
            />
            <AppNavLink to="/musicos" icon={<Users className="h-5 w-5" />} label="Músicos" />
            <AppNavLink
              to="/conexoes"
              icon={<HeartHandshake className="h-5 w-5" />}
              label="Rede & Badges"
            />
            <AppNavLink
              to="/disponibilidades"
              icon={<Clock className="h-5 w-5" />}
              label="Datas Disponíveis"
            />
            <AppNavLink to="/marketplace" icon={<Megaphone className="h-5 w-5" />} label="Vagas" />
            <div className="relative">
              <button
                type="button"
                onClick={() => setOpenDesktopMore(prev => !prev)}
                className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-slate-200 hover:text-white hover:bg-white/10 transition-colors border border-white/5"
                aria-expanded={openDesktopMore}
                aria-haspopup="true"
              >
                <Menu className="h-4 w-4" />
                <span>Mais</span>
              </button>
              {openDesktopMore && (
                <div
                  ref={desktopMoreRef}
                  className="absolute right-0 mt-2 w-60 rounded-xl bg-slate-950/95 border border-white/10 shadow-2xl shadow-black/40 p-2 z-50"
                >
                  <RouterNavLink
                    to="/configuracoes/notificacoes"
                    onClick={() => setOpenDesktopMore(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                        isActive ? 'bg-white/10 text-white' : 'text-slate-200 hover:bg-white/5'
                      }`
                    }
                  >
                    <Bell className="h-4 w-4" />
                    Notificações
                  </RouterNavLink>
                  <RouterNavLink
                    to="/aprovacoes"
                    onClick={() => setOpenDesktopMore(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                        isActive
                          ? 'bg-amber-500/10 text-amber-100'
                          : 'text-slate-200 hover:bg-white/5'
                      }`
                    }
                  >
                    <div className="relative">
                      <UserCheck className="h-4 w-4" />
                      {pendingApproval > 0 && (
                        <span className="absolute -top-2 -right-2 bg-yellow-500 text-white text-xs font-bold rounded-full h-4 min-w-4 px-1 flex items-center justify-center">
                          {pendingApproval}
                        </span>
                      )}
                    </div>
                    <span>Convites</span>
                  </RouterNavLink>
                  <RouterNavLink
                    to="/configuracoes/financeiro"
                    onClick={() => setOpenDesktopMore(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                        isActive
                          ? 'bg-emerald-500/10 text-emerald-100'
                          : 'text-slate-200 hover:bg-white/5'
                      }`
                    }
                  >
                    <Wallet className="h-4 w-4" />
                    Valores e equipamentos
                  </RouterNavLink>
                  {isStaff && (
                    <RouterNavLink
                      to={ADMIN_ROUTES.dashboard}
                      onClick={() => setOpenDesktopMore(false)}
                      className={({ isActive }) =>
                        `flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                          isActive
                            ? 'bg-blue-500/10 text-blue-100'
                            : 'text-slate-200 hover:bg-white/5'
                        }`
                      }
                    >
                      <Shield className="h-4 w-4" />
                      Administração
                    </RouterNavLink>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="hidden md:flex 2xl:hidden items-center gap-2 min-w-0 flex-1">
            <AppNavLinkCompact
              to="/eventos"
              icon={<Calendar className="h-5 w-5" />}
              label="Eventos"
              badge={pendingMyResponse}
            />
            <AppNavLinkCompact to="/musicos" icon={<Users className="h-5 w-5" />} label="Músicos" />
            <AppNavLinkCompact to="/marketplace" icon={<Megaphone className="h-5 w-5" />} label="Vagas" />
            <div className="relative">
              <button
                type="button"
                onClick={() => setOpenDesktopMore(prev => !prev)}
                className="inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-sm text-slate-200 hover:text-white hover:bg-white/10 transition-colors border border-white/5"
                aria-expanded={openDesktopMore}
                aria-haspopup="true"
                title="Mais"
              >
                <Menu className="h-4 w-4" />
                <span className="hidden lg:inline">Mais</span>
              </button>
              {openDesktopMore && (
                <div
                  ref={desktopMoreRef}
                  className="absolute right-0 mt-2 w-60 rounded-xl bg-slate-950/95 border border-white/10 shadow-2xl shadow-black/40 p-2 z-50"
                >
                  <RouterNavLink
                    to="/conexoes"
                    onClick={() => setOpenDesktopMore(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                        isActive ? 'bg-white/10 text-white' : 'text-slate-200 hover:bg-white/5'
                      }`
                    }
                  >
                    <HeartHandshake className="h-4 w-4" />
                    Rede & Badges
                  </RouterNavLink>
                  <RouterNavLink
                    to="/disponibilidades"
                    onClick={() => setOpenDesktopMore(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                        isActive ? 'bg-white/10 text-white' : 'text-slate-200 hover:bg-white/5'
                      }`
                    }
                  >
                    <Clock className="h-4 w-4" />
                    Datas Disponíveis
                  </RouterNavLink>
                  <RouterNavLink
                    to="/configuracoes/notificacoes"
                    onClick={() => setOpenDesktopMore(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                        isActive ? 'bg-white/10 text-white' : 'text-slate-200 hover:bg-white/5'
                      }`
                    }
                  >
                    <Bell className="h-4 w-4" />
                    Notificações
                  </RouterNavLink>
                  <RouterNavLink
                    to="/aprovacoes"
                    onClick={() => setOpenDesktopMore(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                        isActive
                          ? 'bg-amber-500/10 text-amber-100'
                          : 'text-slate-200 hover:bg-white/5'
                      }`
                    }
                  >
                    <div className="relative">
                      <UserCheck className="h-4 w-4" />
                      {pendingApproval > 0 && (
                        <span className="absolute -top-2 -right-2 bg-yellow-500 text-white text-xs font-bold rounded-full h-4 min-w-4 px-1 flex items-center justify-center">
                          {pendingApproval}
                        </span>
                      )}
                    </div>
                    <span>Convites</span>
                  </RouterNavLink>
                  <RouterNavLink
                    to="/configuracoes/financeiro"
                    onClick={() => setOpenDesktopMore(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                        isActive
                          ? 'bg-emerald-500/10 text-emerald-100'
                          : 'text-slate-200 hover:bg-white/5'
                      }`
                    }
                  >
                    <Wallet className="h-4 w-4" />
                    Valores e equipamentos
                  </RouterNavLink>
                  {isStaff && (
                    <RouterNavLink
                      to={ADMIN_ROUTES.dashboard}
                      onClick={() => setOpenDesktopMore(false)}
                      className={({ isActive }) =>
                        `flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                          isActive
                            ? 'bg-blue-500/10 text-blue-100'
                            : 'text-slate-200 hover:bg-white/5'
                        }`
                      }
                    >
                      <Shield className="h-4 w-4" />
                      Administração
                    </RouterNavLink>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Usuário e Logout */}
          <div className="flex items-center space-x-3 min-w-fit md:min-w-0 flex-shrink-0">
            <div className="hidden md:block text-right min-w-0 flex-1 max-w-[140px]">
              <p
                className="text-sm font-medium text-slate-100 leading-snug truncate"
                title={user?.full_name}
              >
                {user?.full_name}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <CityBadge className="hidden md:inline-flex min-w-0 max-w-[220px] overflow-hidden" />
              <ThemeToggle />
              <button
                onClick={handleLogout}
                className="hidden md:flex items-center space-x-1 text-slate-100 hover:text-red-400 transition-colors"
                title="Sair"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Navbar Mobile */}
        <div className="md:hidden relative pb-3">
          <div className="mb-2">
            <CityBadge />
          </div>
          <div className="flex flex-wrap items-center gap-1.5 -ml-1">
            <Link
              to="/eventos"
              className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-2.5 text-xs font-semibold text-slate-100 hover:bg-white/10 transition-colors transition-transform hover:-translate-y-0.5 active:translate-y-0 active:scale-95 whitespace-nowrap sm:gap-2 sm:px-4 sm:py-3 sm:text-xs"
            >
              <Calendar className="h-4 w-4" />
              Eventos
              {pendingMyResponse > 0 && (
                <span className="ml-1 rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold text-white">
                  {pendingMyResponse}
                </span>
              )}
            </Link>
            <Link
              to="/disponibilidades"
              className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-2.5 text-xs font-semibold text-slate-100 hover:bg-white/10 transition-colors transition-transform hover:-translate-y-0.5 active:translate-y-0 active:scale-95 whitespace-nowrap sm:gap-2 sm:px-4 sm:py-3 sm:text-xs"
            >
              <Clock className="h-4 w-4" />
              Datas
            </Link>
            <Link
              to="/configuracoes/notificacoes"
              className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-2.5 text-xs font-semibold text-slate-100 hover:bg-white/10 transition-colors transition-transform hover:-translate-y-0.5 active:translate-y-0 active:scale-95 whitespace-nowrap sm:gap-2 sm:px-4 sm:py-3 sm:text-xs"
            >
              <Bell className="h-4 w-4" />
              Notificações
            </Link>
            <button
              onClick={() => setOpenMore(prev => !prev)}
              className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-2.5 text-xs font-semibold text-slate-100 hover:bg-white/10 transition-colors transition-transform hover:-translate-y-0.5 active:translate-y-0 active:scale-95 whitespace-nowrap sm:gap-2 sm:px-4 sm:py-3 sm:text-xs"
              aria-expanded={openMore}
              aria-controls="mobile-more-menu"
            >
              {openMore ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
              Mais
              {pendingApproval > 0 && (
                <span className="ml-1 rounded-full bg-yellow-500 px-2 py-0.5 text-xs font-bold text-white">
                  {pendingApproval}
                </span>
              )}
            </button>
          </div>

          {/* Menu Expandido "Mais" */}
          {openMore && (
            <div
              id="mobile-more-menu"
              className="absolute left-0 right-0 top-full mt-2 bg-slate-950/95 border border-white/10 shadow-2xl shadow-black/40 p-3 space-y-2 max-h-[70vh] overflow-y-auto z-50"
            >
              <div className="rounded-xl border border-white/10 bg-slate-900/70 px-3 py-2">
                <p className="text-sm font-semibold text-slate-100 truncate">{displayName}</p>
              </div>
              <Link
                to="/musicos"
                onClick={() => setOpenMore(false)}
                className="flex items-center gap-3 px-3 py-2 text-slate-200 hover:bg-white/5 rounded-lg transition-colors"
              >
                <Users className="h-5 w-5" />
                <span className="text-sm">Músicos</span>
              </Link>
              <Link
                to="/conexoes"
                onClick={() => setOpenMore(false)}
                className="flex items-center gap-3 px-3 py-2 text-slate-200 hover:bg-white/5 rounded-lg transition-colors"
              >
                <HeartHandshake className="h-5 w-5" />
                <span className="text-sm">Rede & Badges</span>
              </Link>
              <Link
                to="/eventos/agenda"
                onClick={() => setOpenMore(false)}
                className="flex items-center gap-3 px-3 py-2 text-slate-200 hover:bg-white/5 rounded-lg transition-colors"
              >
                <Clock className="h-5 w-5 rotate-45" />
                <span className="text-sm">Grade de Eventos</span>
              </Link>
              <Link
                to="/marketplace"
                onClick={() => setOpenMore(false)}
                className="flex items-center gap-3 px-3 py-2 text-slate-200 hover:bg-white/5 rounded-lg transition-colors"
              >
                <Megaphone className="h-5 w-5" />
                <span className="text-sm">Vagas</span>
              </Link>
              <Link
                to="/configuracoes/notificacoes"
                onClick={() => setOpenMore(false)}
                className="flex items-center gap-3 px-3 py-2 text-slate-200 hover:bg-white/5 rounded-lg transition-colors"
              >
                <Bell className="h-5 w-5" />
                <span className="text-sm">Notificacoes</span>
              </Link>
              <Link
                to="/configuracoes/financeiro"
                onClick={() => setOpenMore(false)}
                className="flex items-center gap-3 px-3 py-2 text-slate-200 hover:bg-white/5 rounded-lg transition-colors"
              >
                <Wallet className="h-5 w-5" />
                <span className="text-sm">Valores e equipamentos</span>
              </Link>
              <Link
                to="/aprovacoes"
                onClick={() => setOpenMore(false)}
                className="flex items-center justify-between px-3 py-2 text-amber-300 hover:bg-amber-500/10 rounded-lg transition-colors"
              >
                <span className="flex items-center gap-3">
                  <UserCheck className="h-5 w-5" />
                  <span className="text-sm font-medium">Convites</span>
                </span>
                {pendingApproval > 0 && (
                  <span className="bg-yellow-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                    {pendingApproval}
                  </span>
                )}
              </Link>
              {isStaff && (
                <Link
                  to={ADMIN_ROUTES.dashboard}
                  onClick={() => setOpenMore(false)}
                  className="flex items-center gap-3 px-3 py-2 text-blue-200 hover:bg-blue-500/10 rounded-lg transition-colors"
                >
                  <Shield className="h-5 w-5" />
                  <span className="text-sm font-medium">Administração</span>
                </Link>
              )}
              <div className="border-t border-white/10 pt-2 mt-2">
                <div className="flex items-center justify-between px-3 py-2 mb-2">
                  <span className="text-sm text-slate-300">Tema</span>
                  <ThemeToggle />
                </div>
                <button
                  onClick={() => {
                    setOpenMore(false);
                    handleLogout();
                  }}
                  className="flex items-center gap-3 w-full px-3 py-2 text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                >
                  <LogOut className="h-5 w-5" />
                  <span className="text-sm font-medium">Sair</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
});
Navbar.displayName = 'Navbar';

const AppNavLink: React.FC<{
  to: string;
  icon: React.ReactNode;
  label: string;
  badge?: number;
  accent?: boolean;
}> = memo(({ to, icon, label, badge, accent }) => (
  <RouterNavLink
    to={to}
    className={({ isActive }) => {
      const hoverTone = accent ? 'hover:bg-amber-500/10' : 'hover:bg-white/10';
      const activeTone = isActive
        ? accent
          ? 'bg-amber-500/10 text-amber-100'
          : 'bg-white/10 text-white'
        : '';
      return `group flex items-center space-x-1 transition-all relative rounded-full px-2 py-1 ${hoverTone} ${activeTone} hover:-translate-y-0.5 active:translate-y-0 active:scale-95 ${
        accent ? 'text-amber-200 hover:text-amber-100' : 'text-slate-100 hover:text-white'
      } after:absolute after:left-0 after:-bottom-0.5 after:h-0.5 after:w-full after:rounded-full after:bg-gradient-to-r after:from-primary-400 after:via-indigo-300 after:to-emerald-300 after:transition-transform after:duration-300 after:origin-left after:scale-x-0 group-hover:after:scale-x-100 group-focus-visible:after:scale-x-100 ${isActive ? 'after:scale-x-100' : ''}`;
    }}
  >
    {icon}
    <span>{label}</span>
    {typeof badge === 'number' && badge > 0 && (
      <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full h-5 min-w-5 px-1 flex items-center justify-center">
        {badge}
      </span>
    )}
  </RouterNavLink>
));
AppNavLink.displayName = 'AppNavLink';

const AppNavLinkCompact: React.FC<{
  to: string;
  icon: React.ReactNode;
  label: string;
  badge?: number;
  accent?: boolean;
}> = memo(({ to, icon, label, badge, accent }) => (
  <RouterNavLink
    to={to}
    className={({ isActive }) => {
      const hoverTone = accent ? 'hover:bg-amber-500/10' : 'hover:bg-white/10';
      const activeTone = isActive
        ? accent
          ? 'bg-amber-500/10 text-amber-100'
          : 'bg-white/10 text-white'
        : '';
      return `group relative inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-sm transition-all ${hoverTone} ${activeTone} hover:-translate-y-0.5 active:translate-y-0 active:scale-95 ${
        accent ? 'text-amber-200 hover:text-amber-100' : 'text-slate-100 hover:text-white'
      }`;
    }}
  >
    {icon}
    <span>{label}</span>
    {typeof badge === 'number' && badge > 0 && (
      <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full h-5 min-w-5 px-1 flex items-center justify-center">
        {badge}
      </span>
    )}
  </RouterNavLink>
));
AppNavLinkCompact.displayName = 'AppNavLinkCompact';

export default Navbar;
