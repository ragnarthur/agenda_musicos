// components/Layout/Navbar.tsx
import React, { useCallback, useEffect, useRef, useState, memo } from 'react';
import { Link, NavLink as RouterNavLink, useLocation, useNavigate } from 'react-router-dom';
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
  UserCog,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../hooks/useNotifications';
import OwlMascot from '../ui/OwlMascot';
import ThemeToggle from './ThemeToggle';
import CityBadge from '../CityBadge';
import { ADMIN_ROUTES } from '../../routes/adminRoutes';
import { useTheme } from '../../contexts/useTheme';

const Navbar: React.FC = memo(() => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { theme } = useTheme();
  const [openDesktopMore, setOpenDesktopMore] = useState(false);
  const [openMore, setOpenMore] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const lastScrollYRef = useRef(0);
  const isMobileRef = useRef(false);

  // Use SWR hook for notifications - shared across Navbar and Dashboard
  const { pendingMyResponse, pendingApproval } = useNotifications();

  const isStaff = Boolean(user?.user?.is_staff);

  const handleLogout = useCallback(async () => {
    await logout();
    navigate('/login');
  }, [logout, navigate]);

  useEffect(() => {
    if (!openDesktopMore) return;
    const onClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest('[data-more-menu="desktop"]')) {
        return;
      }
      setOpenDesktopMore(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpenDesktopMore(false);
      }
    };
    document.addEventListener('click', onClickOutside);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('click', onClickOutside);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [openDesktopMore]);

  useEffect(() => {
    // Avoid synchronous setState in effect body (lint rule), and close menus after route change.
    const rafId = window.requestAnimationFrame(() => {
      setOpenDesktopMore(false);
      setOpenMore(false);
    });
    return () => window.cancelAnimationFrame(rafId);
  }, [location.pathname]);

  // Auto-hide navbar on scroll (mobile only)
  useEffect(() => {
    const updateIsMobile = () => {
      isMobileRef.current = window.innerWidth < 768;
      if (!isMobileRef.current) {
        setIsVisible(true);
      }
    };

    updateIsMobile();
    window.addEventListener('resize', updateIsMobile);

    const handleScroll = () => {
      if (!isMobileRef.current) return;
      const currentScrollY = window.scrollY;
      if (currentScrollY > lastScrollYRef.current && currentScrollY > 100) {
        setIsVisible(false);
      } else {
        setIsVisible(true);
      }
      lastScrollYRef.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', updateIsMobile);
    };
  }, []);

  // Hide navbar when input is focused (better mobile UX)
  useEffect(() => {
    const handleFocusIn = (event: FocusEvent) => {
      if (!isMobileRef.current) return;
      const target = event.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) {
        setIsVisible(false);
      }
    };
    const handleFocusOut = (event: FocusEvent) => {
      if (!isMobileRef.current) return;
      const target = event.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) {
        setIsVisible(true);
      }
    };

    document.addEventListener('focusin', handleFocusIn);
    document.addEventListener('focusout', handleFocusOut);
    return () => {
      document.removeEventListener('focusin', handleFocusIn);
      document.removeEventListener('focusout', handleFocusOut);
    };
  }, []);

  return (
    <nav
      className={`pt-safe-only sticky top-0 z-50 overflow-visible transition-transform duration-300 backdrop-blur-xl border-b shadow-lg ${
        isVisible ? 'translate-y-0' : '-translate-y-full'
      } md:translate-y-0 bg-gradient-to-r from-white/80 via-white/70 to-white/80 border-slate-200/70 shadow-slate-200/60 dark:from-slate-950/90 dark:via-slate-900/85 dark:to-slate-950/90 dark:border-white/10 dark:shadow-black/30`}
    >
      <div className="container mx-auto px-3 sm:px-4">
        <div className="flex flex-wrap md:flex-nowrap items-center justify-between min-h-[64px] py-2 gap-x-3 gap-y-2">
          {/* Logo e Nome */}
          <Link
            to="/dashboard"
            className="flex items-center space-x-3 hover:scale-[1.01] transition-transform min-w-fit"
          >
            <div className="h-12 w-12 flex items-center justify-center">
              <OwlMascot className="h-12 w-12" autoplay={false} />
            </div>
            <div className="flex flex-col leading-tight">
              <div className="flex items-center gap-2">
                <span className="text-lg sm:text-xl font-bold logo-animated">GigFlow</span>
                <span className="text-xs px-2 py-0.5 bg-gradient-to-r from-amber-500/10 via-amber-400/15 to-amber-500/10 text-amber-700 rounded-full border border-amber-500/25 font-light italic tracking-wider dark:text-amber-100/80 dark:border-amber-400/20">
                  Beta
                </span>
              </div>
              <span className="text-xs text-slate-600 hidden sm:block dark:text-slate-300">
                Agenda para músicos
              </span>
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
            <div className="relative z-[60]" data-more-menu="desktop">
              <button
                type="button"
                onClick={() => setOpenDesktopMore(prev => !prev)}
                className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-slate-700 hover:text-slate-900 hover:bg-slate-900/5 transition-colors border border-slate-200/70 dark:text-slate-200 dark:hover:text-white dark:hover:bg-white/10 dark:border-white/5"
                aria-expanded={openDesktopMore}
                aria-haspopup="true"
              >
                <Menu className="h-4 w-4" />
                <span>Mais</span>
              </button>
              {openDesktopMore && (
                <div className="absolute right-0 mt-2 w-60 rounded-xl bg-white/90 border border-slate-200/70 shadow-2xl shadow-slate-300/60 p-2 z-[70] dark:bg-slate-950/95 dark:border-white/10 dark:shadow-black/40">
                  <RouterNavLink
                    to="/configuracoes/notificacoes"
                    className={({ isActive }) =>
                      `flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                        isActive
                          ? 'bg-slate-900/5 text-slate-900 dark:bg-white/10 dark:text-white'
                          : 'text-slate-700 hover:bg-slate-900/5 dark:text-slate-200 dark:hover:bg-white/5'
                      }`
                    }
                  >
                    <Bell className="h-4 w-4" />
                    Notificações
                  </RouterNavLink>
                  <RouterNavLink
                    to="/aprovacoes"
                    className={({ isActive }) =>
                      `flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                        isActive
                          ? 'bg-amber-500/10 text-amber-900 dark:text-amber-100'
                          : 'text-slate-700 hover:bg-slate-900/5 dark:text-slate-200 dark:hover:bg-white/5'
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
                    className={({ isActive }) =>
                      `flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                        isActive
                          ? 'bg-emerald-500/10 text-emerald-900 dark:text-emerald-100'
                          : 'text-slate-700 hover:bg-slate-900/5 dark:text-slate-200 dark:hover:bg-white/5'
                      }`
                    }
                  >
                    <Wallet className="h-4 w-4" />
                    Valores e equipamentos
                  </RouterNavLink>
                  {isStaff && (
                    <RouterNavLink
                      to={ADMIN_ROUTES.dashboard}
                      className={({ isActive }) =>
                        `flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                          isActive
                            ? 'bg-blue-500/10 text-blue-900 dark:text-blue-100'
                            : 'text-slate-700 hover:bg-slate-900/5 dark:text-slate-200 dark:hover:bg-white/5'
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
            <div className="relative z-[60]" data-more-menu="desktop">
              <button
                type="button"
                onClick={() => setOpenDesktopMore(prev => !prev)}
                className="inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-sm text-slate-700 hover:text-slate-900 hover:bg-slate-900/5 transition-colors border border-slate-200/70 dark:text-slate-200 dark:hover:text-white dark:hover:bg-white/10 dark:border-white/5"
                aria-expanded={openDesktopMore}
                aria-haspopup="true"
                title="Mais"
              >
                <Menu className="h-4 w-4" />
                <span className="hidden lg:inline">Mais</span>
              </button>
              {openDesktopMore && (
                <div className="absolute right-0 mt-2 w-60 rounded-xl bg-white/90 border border-slate-200/70 shadow-2xl shadow-slate-300/60 p-2 z-[70] dark:bg-slate-950/95 dark:border-white/10 dark:shadow-black/40">
                  <RouterNavLink
                    to="/conexoes"
                    className={({ isActive }) =>
                      `flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                        isActive
                          ? 'bg-slate-900/5 text-slate-900 dark:bg-white/10 dark:text-white'
                          : 'text-slate-700 hover:bg-slate-900/5 dark:text-slate-200 dark:hover:bg-white/5'
                      }`
                    }
                  >
                    <HeartHandshake className="h-4 w-4" />
                    Rede & Badges
                  </RouterNavLink>
                  <RouterNavLink
                    to="/disponibilidades"
                    className={({ isActive }) =>
                      `flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                        isActive
                          ? 'bg-slate-900/5 text-slate-900 dark:bg-white/10 dark:text-white'
                          : 'text-slate-700 hover:bg-slate-900/5 dark:text-slate-200 dark:hover:bg-white/5'
                      }`
                    }
                  >
                    <Clock className="h-4 w-4" />
                    Datas Disponíveis
                  </RouterNavLink>
                  <RouterNavLink
                    to="/configuracoes/notificacoes"
                    className={({ isActive }) =>
                      `flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                        isActive
                          ? 'bg-slate-900/5 text-slate-900 dark:bg-white/10 dark:text-white'
                          : 'text-slate-700 hover:bg-slate-900/5 dark:text-slate-200 dark:hover:bg-white/5'
                      }`
                    }
                  >
                    <Bell className="h-4 w-4" />
                    Notificações
                  </RouterNavLink>
                  <RouterNavLink
                    to="/aprovacoes"
                    className={({ isActive }) =>
                      `flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                        isActive
                          ? 'bg-amber-500/10 text-amber-900 dark:text-amber-100'
                          : 'text-slate-700 hover:bg-slate-900/5 dark:text-slate-200 dark:hover:bg-white/5'
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
                    className={({ isActive }) =>
                      `flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                        isActive
                          ? 'bg-emerald-500/10 text-emerald-900 dark:text-emerald-100'
                          : 'text-slate-700 hover:bg-slate-900/5 dark:text-slate-200 dark:hover:bg-white/5'
                      }`
                    }
                  >
                    <Wallet className="h-4 w-4" />
                    Valores e equipamentos
                  </RouterNavLink>
                  {isStaff && (
                    <RouterNavLink
                      to={ADMIN_ROUTES.dashboard}
                      className={({ isActive }) =>
                        `flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                          isActive
                            ? 'bg-blue-500/10 text-blue-900 dark:text-blue-100'
                            : 'text-slate-700 hover:bg-slate-900/5 dark:text-slate-200 dark:hover:bg-white/5'
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
            <div className="hidden md:block text-right min-w-0 flex-1 max-w-[120px] lg:max-w-[140px]">
              <p
                className="text-sm font-medium text-slate-900 leading-snug truncate dark:text-slate-100"
                title={user?.full_name}
              >
                {user?.full_name}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="hidden md:block min-w-0 max-w-[180px] lg:max-w-[220px] mr-4">
                <CityBadge className="w-full" variant={theme === 'dark' ? 'dark' : 'light'} />
              </div>
              <div className="hidden md:block">
                <ThemeToggle />
              </div>
              <button
                onClick={handleLogout}
                className="hidden md:flex items-center space-x-1 text-slate-700 hover:text-red-600 transition-colors dark:text-slate-100 dark:hover:text-red-400"
                title="Sair"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Navbar Mobile */}
        <div className="md:hidden flex items-center justify-between py-2">
          <CityBadge variant={theme === 'dark' ? 'dark' : 'light'} />
          <div className="flex items-center gap-1">
            <Link
              to="/configuracoes/notificacoes"
              className="relative p-2 text-slate-600 hover:text-slate-900 transition-colors dark:text-slate-200 dark:hover:text-white"
            >
              <Bell className="h-5 w-5" />
              {pendingMyResponse > 0 && (
                <span className="absolute top-0.5 right-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full h-4 min-w-4 px-1 flex items-center justify-center">
                  {pendingMyResponse}
                </span>
              )}
            </Link>
            <ThemeToggle />
            <button
              onClick={() => setOpenMore(prev => !prev)}
              className="p-2 text-slate-600 hover:text-slate-900 transition-colors dark:text-slate-200 dark:hover:text-white"
              aria-expanded={openMore}
            >
              {openMore ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Menu Mobile "Mais" */}
        {openMore && (
          <div className="md:hidden absolute left-0 right-0 top-full bg-white/90 border-t border-slate-200/70 shadow-2xl shadow-slate-300/60 p-3 space-y-1 z-50 dark:bg-slate-950/95 dark:border-white/10 dark:shadow-black/40">
            <Link
              to="/marketplace"
              onClick={() => setOpenMore(false)}
              className="flex items-center gap-3 px-3 py-2.5 text-slate-700 hover:bg-slate-900/5 rounded-lg transition-colors dark:text-slate-200 dark:hover:bg-white/5"
            >
              <Megaphone className="h-5 w-5" />
              <span className="text-sm">Vagas</span>
            </Link>
            <Link
              to="/configuracoes/financeiro"
              onClick={() => setOpenMore(false)}
              className="flex items-center gap-3 px-3 py-2.5 text-slate-700 hover:bg-slate-900/5 rounded-lg transition-colors dark:text-slate-200 dark:hover:bg-white/5"
            >
              <UserCog className="h-5 w-5" />
              <span className="text-sm">Editar Perfil</span>
            </Link>
            <div className="border-t border-slate-200/70 pt-2 mt-2 dark:border-white/10">
              <button
                onClick={() => { setOpenMore(false); handleLogout(); }}
                className="flex items-center gap-3 w-full px-3 py-2.5 text-red-600 hover:bg-red-500/10 rounded-lg transition-colors dark:text-red-300"
              >
                <LogOut className="h-5 w-5" />
                <span className="text-sm">Sair</span>
              </button>
            </div>
          </div>
        )}
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
      const hoverTone = accent ? 'hover:bg-amber-500/10' : 'hover:bg-slate-900/5 dark:hover:bg-white/10';
      const activeTone = isActive
        ? accent
          ? 'bg-amber-500/10 text-amber-900 dark:text-amber-100'
          : 'bg-slate-900/5 text-slate-900 dark:bg-white/10 dark:text-white'
        : '';
      return `group flex items-center space-x-1 transition-all relative rounded-full px-2 py-1 ${hoverTone} ${activeTone} hover:-translate-y-0.5 active:translate-y-0 active:scale-95 ${
        accent
          ? 'text-amber-700 hover:text-amber-900 dark:text-amber-200 dark:hover:text-amber-100'
          : 'text-slate-700 hover:text-slate-900 dark:text-slate-100 dark:hover:text-white'
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
      const hoverTone = accent ? 'hover:bg-amber-500/10' : 'hover:bg-slate-900/5 dark:hover:bg-white/10';
      const activeTone = isActive
        ? accent
          ? 'bg-amber-500/10 text-amber-900 dark:text-amber-100'
          : 'bg-slate-900/5 text-slate-900 dark:bg-white/10 dark:text-white'
        : '';
      return `group relative inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-sm transition-all ${hoverTone} ${activeTone} hover:-translate-y-0.5 active:translate-y-0 active:scale-95 ${
        accent
          ? 'text-amber-700 hover:text-amber-900 dark:text-amber-200 dark:hover:text-amber-100'
          : 'text-slate-700 hover:text-slate-900 dark:text-slate-100 dark:hover:text-white'
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
