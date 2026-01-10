// components/Layout/Navbar.tsx
import React, { useCallback, useEffect, useState } from 'react';
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

const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [pendingMyResponse, setPendingMyResponse] = useState(0);
  const [pendingApproval, setPendingApproval] = useState(0);
  const [openMore, setOpenMore] = useState(false);
  const subscriptionInfo = user?.subscription_info;
  const showPlanShortcut = Boolean(
    subscriptionInfo &&
    (subscriptionInfo.is_trial || subscriptionInfo.status === 'expired')
  );
  const planStatusLabel = subscriptionInfo?.is_trial ? 'Trial' : 'Expirado';
  const planStatusDetail = subscriptionInfo?.is_trial
    ? `Trial · ${subscriptionInfo.trial_days_remaining} dias restantes`
    : 'Plano expirado';

  const displayName =
    user?.full_name || user?.user?.first_name || user?.user?.username || 'Conta';

  const loadNotifications = useCallback(async () => {
    const [pendingResult, approvalResult] = await Promise.allSettled([
      eventService.getPendingMyResponse(),
      eventService.getAll({ pending_approval: true }),
    ]);

    if (pendingResult.status === 'fulfilled') {
      setPendingMyResponse(pendingResult.value.length);
    } else {
      setPendingMyResponse(0);
      console.error('Erro ao carregar notificações (pendências):', pendingResult.reason);
    }

    if (approvalResult.status === 'fulfilled') {
      setPendingApproval(approvalResult.value.length);
    } else {
      setPendingApproval(0);
      console.error('Erro ao carregar notificações (convites):', approvalResult.reason);
    }
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => void loadNotifications(), 0);
    const interval = setInterval(loadNotifications, 30000);
    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, [loadNotifications]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <nav className="bg-gradient-to-r from-slate-950/90 via-slate-900/85 to-slate-950/90 backdrop-blur-xl shadow-lg shadow-black/30 sticky top-0 z-50 border-b border-white/10 overflow-visible md:overflow-hidden">
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
              <span className="text-lg sm:text-xl font-bold logo-animated">
                GigFlow
              </span>
              <span className="text-[11px] text-slate-300/80 hidden sm:block">Agenda para músicos</span>
            </div>
          </Link>

          {/* Links de Navegação */}
          <div className="hidden md:flex md:flex-wrap lg:flex-nowrap items-center gap-3 md:-ml-1 min-w-0 flex-1">
            <AppNavLink to="/eventos" icon={<Calendar className="h-5 w-5" />} label="Eventos" badge={pendingMyResponse} />
            <AppNavLink to="/musicos" icon={<Users className="h-5 w-5" />} label="Músicos" />
            <AppNavLink to="/conexoes" icon={<HeartHandshake className="h-5 w-5" />} label="Rede & Badges" />
            <AppNavLink to="/disponibilidades" icon={<Clock className="h-5 w-5" />} label="Datas Disponíveis" />
            <AppNavLink to="/marketplace" icon={<Megaphone className="h-5 w-5" />} label="Vagas" />
            <AppNavLink to="/configuracoes/notificacoes" icon={<Bell className="h-5 w-5" />} label="Notificações" />
            <AppNavLink
              to="/aprovacoes"
              icon={<UserCheck className="h-5 w-5" />}
              label="Convites"
              badge={pendingApproval}
              accent
            />
          </div>

          {/* Usuário e Logout */}
          <div className="flex items-center space-x-3 min-w-fit md:min-w-0 flex-shrink-0">
            <div className="hidden md:block text-right">
              <p className="text-sm font-medium text-slate-100 leading-snug max-w-[240px] truncate whitespace-nowrap">
                {user?.full_name}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Link
                to="/configuracoes/financeiro"
                className="hidden md:inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-slate-200 hover:text-white bg-white/5 border border-white/10 rounded-lg px-2.5 py-1 transition-colors"
              >
                <Wallet className="h-4 w-4" />
                Valores
              </Link>
              {showPlanShortcut && (
                <Link
                  to="/planos"
                  className="hidden md:flex items-center gap-1 text-slate-300 hover:text-white transition-colors"
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
                className="hidden md:flex items-center space-x-1 text-slate-300 hover:text-red-400 transition-colors"
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
};

const AppNavLink: React.FC<{ to: string; icon: React.ReactNode; label: string; badge?: number; accent?: boolean }> = ({ to, icon, label, badge, accent }) => (
  <RouterNavLink
    to={to}
    className={({ isActive }) => {
      const hoverTone = accent ? 'hover:bg-amber-500/10' : 'hover:bg-white/10';
      const activeTone = isActive ? (accent ? 'bg-amber-500/10 text-amber-100' : 'bg-white/10 text-white') : '';
      return `group flex items-center space-x-1 transition-all relative rounded-full px-2 py-1 ${hoverTone} ${activeTone} hover:-translate-y-0.5 active:translate-y-0 active:scale-95 ${
        accent
          ? 'text-amber-300 hover:text-amber-200'
          : 'text-slate-200 hover:text-white'
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
);

export default Navbar;
