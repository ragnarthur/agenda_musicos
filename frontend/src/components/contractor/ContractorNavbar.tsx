import React, { useCallback, useEffect, useRef, useState, memo } from 'react';
import { Link, NavLink as RouterNavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  Home,
  Search,
  MessageSquare,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { useCompanyAuth } from '../../contexts/CompanyAuthContext';
import { CONTRACTOR_ROUTES } from '../../routes/contractorRoutes';
import OwlMascot from '../ui/OwlMascot';
import ThemeToggle from '../Layout/ThemeToggle';

const ContractorNavbar: React.FC = memo(() => {
  const { organization, logout } = useCompanyAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [openMore, setOpenMore] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const lastScrollYRef = useRef(0);
  const isMobileRef = useRef(false);

  const handleLogout = useCallback(() => {
    logout();
    navigate(CONTRACTOR_ROUTES.login);
  }, [logout, navigate]);

  // Close menu on route change
  useEffect(() => {
    const rafId = window.requestAnimationFrame(() => {
      setOpenMore(false);
    });
    return () => window.cancelAnimationFrame(rafId);
  }, [location.pathname]);

  // Auto-hide navbar on scroll (mobile only)
  useEffect(() => {
    const updateIsMobile = () => {
      isMobileRef.current = window.innerWidth < 768;
      if (!isMobileRef.current) setIsVisible(true);
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

  // Hide navbar when input is focused (mobile)
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

  const desktopNavLinks = [
    { to: CONTRACTOR_ROUTES.dashboard, icon: Home, label: 'Dashboard' },
    { to: CONTRACTOR_ROUTES.browseMusicians, icon: Search, label: 'Músicos' },
    { to: CONTRACTOR_ROUTES.requests, icon: MessageSquare, label: 'Pedidos' },
  ];

  return (
    <nav
      className={`pt-safe-only sticky top-0 z-50 overflow-visible transition-transform duration-300 backdrop-blur-xl border-b shadow-lg ${
        isVisible ? 'translate-y-0' : '-translate-y-full'
      } md:translate-y-0 bg-gradient-to-r from-white/80 via-white/70 to-white/80 border-slate-200/70 shadow-slate-200/60 dark:from-slate-950/90 dark:via-slate-900/85 dark:to-slate-950/90 dark:border-white/10 dark:shadow-black/30`}
    >
      <div className="container mx-auto px-3 sm:px-4">
        <div className="flex items-center justify-between min-h-[64px] py-2 gap-x-3">
          {/* Logo */}
          <Link
            to={CONTRACTOR_ROUTES.dashboard}
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
                Plataforma para Contratantes
              </span>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center gap-2 flex-1 justify-center">
            {desktopNavLinks.map(({ to, icon: Icon, label }) => (
              <RouterNavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `group relative inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition-all hover:-translate-y-0.5 active:translate-y-0 active:scale-95 ${
                    isActive
                      ? 'bg-slate-900/5 text-slate-900 dark:bg-white/10 dark:text-white'
                      : 'text-slate-700 hover:text-slate-900 hover:bg-slate-900/5 dark:text-slate-100 dark:hover:text-white dark:hover:bg-white/10'
                  }`
                }
              >
                <Icon className="h-4 w-4" />
                <span>{label}</span>
              </RouterNavLink>
            ))}
          </div>

          {/* Right Side */}
          <div className="flex items-center gap-2 min-w-fit flex-shrink-0">
            <div className="hidden md:block text-right max-w-[140px]">
              <p
                className="text-sm font-medium text-slate-900 leading-snug truncate dark:text-slate-100"
                title={organization?.name}
              >
                {organization?.name}
              </p>
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

            {/* Mobile controls */}
            <div className="flex md:hidden items-center gap-1">
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
        </div>

        {/* Mobile Menu */}
        {openMore && (
          <div className="md:hidden absolute left-0 right-0 top-full bg-white/90 border-t border-slate-200/70 shadow-2xl shadow-slate-300/60 p-3 space-y-1 z-50 dark:bg-slate-950/95 dark:border-white/10 dark:shadow-black/40">
            <Link
              to={CONTRACTOR_ROUTES.profile}
              onClick={() => setOpenMore(false)}
              className="flex items-center gap-3 px-3 py-2.5 text-slate-700 hover:bg-slate-900/5 rounded-lg transition-colors dark:text-slate-200 dark:hover:bg-white/5"
            >
              <span className="text-sm font-medium">{organization?.name}</span>
            </Link>
            <div className="border-t border-slate-200/70 pt-2 mt-2 dark:border-white/10">
              <button
                onClick={() => {
                  setOpenMore(false);
                  handleLogout();
                }}
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
ContractorNavbar.displayName = 'ContractorNavbar';

export default ContractorNavbar;
