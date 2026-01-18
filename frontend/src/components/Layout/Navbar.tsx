// components/Layout/Navbar.tsx
import React, { useCallback, useEffect, useRef, useState, useTransition, memo } from 'react';
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
  Settings,
  Wallet,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { eventService } from '../../services/api';
import OwlMascot from '../ui/OwlMascot';
import { showToast } from '../../utils/toast';
import { logError } from '../../utils/logger';
import ThemeToggle from './ThemeToggle';

const Navbar: React.FC = memo(() => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [pendingMyResponse, setPendingMyResponse] = useState(0);
  const [pendingApproval, setPendingApproval] = useState(0);
  const [openMore, setOpenMore] = useState(false);
  const [openDesktopMore, setOpenDesktopMore] = useState(false);
  const desktopMoreRef = useRef<HTMLDivElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [, startTransition] = useTransition();
  const subscriptionInfo = user?.subscription_info;
  const showPlanShortcut = Boolean(
    subscriptionInfo &&
    (subscriptionInfo.is_trial || subscriptionInfo.status === 'expired')
  );
  const planStatusLabel = subscriptionInfo?.is_trial
    ? 'Gratuito'
    : subscriptionInfo?.status === 'active'
      ? 'Premium'
      : 'Expirado';
  const planStatusDetail = subscriptionInfo?.is_trial
    ? `Acesso gratuito · ${subscriptionInfo.trial_days_remaining} dias restantes`
    : subscriptionInfo?.status === 'active'
      ? 'Plano ativo'
      : 'Plano expirado';
  const planHighlightClass = subscriptionInfo?.is_trial
    ? 'bg-amber-500/15 border-amber-400/30 text-amber-100'
    : subscriptionInfo?.status === 'active'
      ? 'bg-emerald-500/15 border-emerald-400/30 text-emerald-100'
      : 'bg-slate-800/70 border-white/10 text-slate-200';

  const displayName =
    user?.full_name || user?.user?.first_name || user?.user?.username || 'Conta';

  const loadNotifications = useCallback(async () => {
    // Cancelar requisição anterior se existir
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    try {
      const [pendingResult, approvalResult] = await Promise.allSettled([
        eventService.getPendingMyResponse(),
        eventService.getAll({ pending_approval: true }),
      ]);

      // Usar startTransition para updates não-bloqueantes
      startTransition(() => {
        if (pendingResult.status === 'fulfilled') {
          setPendingMyResponse(pendingResult.value.length);
        } else {
          setPendingMyResponse(0);
          logError('Erro ao carregar notificações (pendências):', pendingResult.reason);
          showToast.apiError(pendingResult.reason);
        }

        if (approvalResult.status === 'fulfilled') {
          setPendingApproval(approvalResult.value.length);
        } else {
          setPendingApproval(0);
          logError('Erro ao carregar notificações (convites):', approvalResult.reason);
          showToast.apiError(approvalResult.reason);
        }
      });
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        logError('Erro ao carregar notificações:', error);
        showToast.apiError(error);
      }
    }
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => void loadNotifications(), 0);
    const interval = setInterval(loadNotifications, 30000);
    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
      // Cancelar requisição pendente ao desmontar
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [loadNotifications]);

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
                <span className="text-lg sm:text-xl font-bold logo-animated">
                  GigFlow
                </span>
                <span className="text-[9px] px-2 py-0.5 bg-gradient-to-r from-amber-500/10 via-amber-400/15 to-amber-500/10 text-amber-100/80 rounded-full border border-amber-400/20 font-light italic tracking-wider">
                  Beta
                </span>
              </div>
              <span className="text-[11px] text-slate-300 hidden sm:block">Agenda para músicos</span>
            </div>
          </Link>

          {/* Links de Navegação */}
          <div className="hidden md:flex md:flex-wrap lg:flex-nowrap items-center gap-3 md:-ml-1 min-w-0 flex-1">
            <AppNavLink to="/eventos" icon={<Calendar className="h-5 w-5" />} label="Eventos" badge={pendingMyResponse} />
            <AppNavLink to="/musicos" icon={<Users className="h-5 w-5" />} label="Músicos" />
            <AppNavLink to="/conexoes" icon={<HeartHandshake className="h-5 w-5" />} label="Rede & Badges" />
            <AppNavLink to="/disponibilidades" icon={<Clock className="h-5 w-5" />} label="Datas Disponíveis" />
            <AppNavLink to="/marketplace" icon={<Megaphone className="h-5 w-5" />} label="Vagas" />
            <div className="relative">
              <button
                type="button"
                onClick={() => setOpenDesktopMore((prev) => !prev)}
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
                  <div className={`px-3 py-2 rounded-lg mb-2 border ${planHighlightClass}`}>
                    <p className="text-[11px] uppercase tracking-wide opacity-80">Plano</p>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold">{planStatusLabel}</p>
                      {subscriptionInfo?.is_trial && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 border border-white/20">
                          {subscriptionInfo.trial_days_remaining}d
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] opacity-80">
                      {planStatusDetail}
                    </p>
                  </div>
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
                        isActive ? 'bg-amber-500/10 text-amber-100' : 'text-slate-200 hover:bg-white/5'
                      }`
                    }
                  >
                    <div className="relative">
                      <UserCheck className="h-4 w-4" />
                      {pendingApproval > 0 && (
                        <span className="absolute -top-2 -right-2 bg-yellow-500 text-white text-[10px] font-bold rounded-full h-4 min-w-4 px-1 flex items-center justify-center">
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
                        isActive ? 'bg-emerald-500/10 text-emerald-100' : 'text-slate-200 hover:bg-white/5'
                      }`
                    }
                  >
                    <Wallet className="h-4 w-4" />
                    Valores e equipamentos
                  </RouterNavLink>
                  {showPlanShortcut && (
                    <RouterNavLink
                      to="/planos"
                      onClick={() => setOpenDesktopMore(false)}
                      className={({ isActive }) =>
                        `flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                          isActive ? 'bg-amber-500/10 text-amber-100' : 'text-slate-100 hover:bg-white/10'
                        }`
                      }
                    >
                      <Settings className="h-4 w-4" />
                      Escolher plano
                    </RouterNavLink>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Usuário e Logout */}
          <div className="flex items-center space-x-3 min-w-fit md:min-w-0 flex-shrink-0">
            <div className="hidden md:block text-right">
              <p className="text-sm font-medium text-slate-100 leading-snug max-w-[240px] truncate whitespace-nowrap">
                {user?.full_name}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <ThemeToggle />
              {showPlanShortcut && (
                <Link
                  to="/planos"
                  className="hidden md:flex items-center gap-1 text-slate-100 hover:text-white transition-colors"
                  title={`Assinar plano (${planStatusDetail})`}
                >
                  <Settings className="h-5 w-5" />
                  <span className="text-[10px] font-bold uppercase tracking-wide bg-amber-500/20 text-amber-200 px-1.5 py-0.5 rounded-full border border-amber-300/40">
                    {planStatusLabel}
                  </span>
                </Link>
              )}
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
          <div className="flex flex-wrap items-center gap-1.5 -ml-1">
            <Link
              to="/eventos"
              className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-2 text-[11px] font-semibold text-slate-100 hover:bg-white/10 transition-colors transition-transform hover:-translate-y-0.5 active:translate-y-0 active:scale-95 whitespace-nowrap sm:gap-2 sm:px-3 sm:text-xs"
            >
              <Calendar className="h-4 w-4" />
              Eventos
              {pendingMyResponse > 0 && (
                <span className="ml-1 rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white">
                  {pendingMyResponse}
                </span>
              )}
            </Link>
            <Link
              to="/disponibilidades"
              className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-2 text-[11px] font-semibold text-slate-100 hover:bg-white/10 transition-colors transition-transform hover:-translate-y-0.5 active:translate-y-0 active:scale-95 whitespace-nowrap sm:gap-2 sm:px-3 sm:text-xs"
            >
              <Clock className="h-4 w-4" />
              Datas
            </Link>
            <Link
              to="/configuracoes/notificacoes"
              className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-2 text-[11px] font-semibold text-slate-100 hover:bg-white/10 transition-colors transition-transform hover:-translate-y-0.5 active:translate-y-0 active:scale-95 whitespace-nowrap sm:gap-2 sm:px-3 sm:text-xs"
            >
              <Bell className="h-4 w-4" />
              Notificações
            </Link>
            <button
              onClick={() => setOpenMore((prev) => !prev)}
              className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-2 text-[11px] font-semibold text-slate-100 hover:bg-white/10 transition-colors transition-transform hover:-translate-y-0.5 active:translate-y-0 active:scale-95 whitespace-nowrap sm:gap-2 sm:px-3 sm:text-xs"
              aria-expanded={openMore}
              aria-controls="mobile-more-menu"
            >
              {openMore ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
              Mais
              {pendingApproval > 0 && (
                <span className="ml-1 rounded-full bg-yellow-500 px-2 py-0.5 text-[10px] font-bold text-white">
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
              <div className={`rounded-xl px-3 py-2 border ${planHighlightClass}`}>
                <p className="text-xs uppercase tracking-wide mb-1 opacity-80">Plano</p>
                <p className="text-sm font-semibold flex items-center gap-2">
                  {planStatusLabel}
                  {subscriptionInfo?.is_trial && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 border border-white/20">
                      {subscriptionInfo.trial_days_remaining}d
                    </span>
                  )}
                </p>
                <p className="text-[11px] opacity-80">{planStatusDetail}</p>
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
              {showPlanShortcut && (
                <Link
                  to="/planos"
                  onClick={() => setOpenMore(false)}
                  className="flex items-center gap-3 px-3 py-2 text-slate-200 hover:bg-white/5 rounded-lg transition-colors"
                >
                  <Settings className="h-5 w-5" />
                  <span className="text-sm">Planos</span>
                </Link>
              )}
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
              {showPlanShortcut && (
                <Link
                  to="/planos"
                  onClick={() => setOpenMore(false)}
                  className="flex items-center justify-between gap-3 px-3 py-2 text-slate-200 hover:bg-white/5 rounded-lg transition-colors"
                >
                  <span className="flex items-center gap-3">
                    <Settings className="h-5 w-5" />
                    <span className="text-sm">Assinar plano</span>
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wide bg-amber-500/20 text-amber-200 px-2 py-0.5 rounded-full border border-amber-300/40">
                    {planStatusLabel}
                  </span>
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

const AppNavLink: React.FC<{ to: string; icon: React.ReactNode; label: string; badge?: number; accent?: boolean }> = memo(({ to, icon, label, badge, accent }) => (
  <RouterNavLink
    to={to}
    className={({ isActive }) => {
      const hoverTone = accent ? 'hover:bg-amber-500/10' : 'hover:bg-white/10';
      const activeTone = isActive ? (accent ? 'bg-amber-500/10 text-amber-100' : 'bg-white/10 text-white') : '';
      return `group flex items-center space-x-1 transition-all relative rounded-full px-2 py-1 ${hoverTone} ${activeTone} hover:-translate-y-0.5 active:translate-y-0 active:scale-95 ${
        accent
          ? 'text-amber-200 hover:text-amber-100'
          : 'text-slate-100 hover:text-white'
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

export default Navbar;
