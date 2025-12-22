// components/Layout/Navbar.tsx
import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Music,
  Calendar,
  Users,
  LogOut,
  Crown,
  Clock,
  Megaphone,
  HeartHandshake,
  Menu,
  X,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { eventService } from '../../services/api';

const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [pendingMyResponse, setPendingMyResponse] = useState(0);
  const [pendingApproval, setPendingApproval] = useState(0);
  const [openMore, setOpenMore] = useState(false);

  const formatInstrument = () => {
    if (!user) return '';
    const fullName = user.full_name.toLowerCase();

    // Regras customizadas
    if (fullName.includes('sara')) return 'Vocalista e violonista';
    if (fullName.includes('arthur')) return 'Vocalista, violonista e guitarrista';
    if (fullName.includes('roberto')) return 'Baterista';

    const displayMap: Record<string, string> = {
      vocal: 'Vocal',
      guitar: 'Guitarra',
      bass: 'Baixo',
      drums: 'Bateria',
      keyboard: 'Teclado',
      percussion: 'Percussão',
    };
    return displayMap[user.instrument] || user.instrument;
  };

  const displayName =
    user?.full_name || user?.user?.first_name || user?.user?.username || 'Conta';
  const instrumentLabel = formatInstrument();

  const loadNotifications = useCallback(async () => {
    try {
      // Eventos pendentes de minha resposta
      const myPending = await eventService.getPendingMyResponse();
      setPendingMyResponse(myPending.length);

      // Eventos pendentes de aprovação
      const approvals = await eventService.getAll({ pending_approval: true });
      setPendingApproval(approvals.length);
    } catch (error) {
      console.error('Erro ao carregar notificações:', error);
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
    <nav className="bg-gradient-to-r from-slate-950/90 via-slate-900/85 to-slate-950/90 backdrop-blur-xl shadow-lg shadow-black/30 sticky top-0 z-40 border-b border-white/10">
      <div className="container mx-auto px-3 sm:px-4">
        <div className="flex items-center justify-between min-h-[64px] py-2 gap-3">
          {/* Logo e Nome */}
          <Link
            to="/"
            className="flex items-center space-x-3 hover:scale-[1.01] transition-transform min-w-fit"
          >
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary-500 via-indigo-500 to-emerald-400 flex items-center justify-center shadow-lg logo-glow">
              <Music className="h-6 w-6 text-white" />
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-lg sm:text-xl font-bold logo-animated">
                GigFlow
              </span>
              <span className="text-[11px] text-slate-300/80 hidden sm:block">Agenda para músicos</span>
            </div>
          </Link>

          {/* Links de Navegação */}
          <div className="hidden md:flex items-center space-x-6">
            <NavLink to="/eventos" icon={<Calendar className="h-5 w-5" />} label="Eventos" badge={pendingMyResponse} />
            <NavLink to="/musicos" icon={<Users className="h-5 w-5" />} label="Músicos" />
            <NavLink to="/conexoes" icon={<HeartHandshake className="h-5 w-5" />} label="Rede & Badges" />
            <NavLink to="/disponibilidades" icon={<Clock className="h-5 w-5" />} label="Datas Disponíveis" />
            <NavLink to="/marketplace" icon={<Megaphone className="h-5 w-5" />} label="Marketplace" />
            <NavLink
              to="/aprovacoes"
              icon={<Crown className="h-5 w-5" />}
              label="Aprovações"
              badge={pendingApproval}
              accent
            />
          </div>

          {/* Usuário e Logout */}
          <div className="flex items-center space-x-4 min-w-fit">
            <div className="hidden md:block text-right">
              <p className="text-sm font-medium text-slate-100 truncate max-w-[200px]">{user?.full_name}</p>
              <p className="text-xs text-slate-300 truncate max-w-[220px]">
                {formatInstrument()}
              </p>
            </div>

            <div className="flex items-center gap-2">
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
      </div>

      {/* Barra de Navegação Mobile - Fixa na parte inferior */}
      <div
        className="md:hidden fixed bottom-0 left-0 right-0 border-t border-white/10 bg-slate-950/90 shadow-[0_-8px_20px_rgba(0,0,0,0.35)] z-40"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="grid grid-cols-4 w-full">
          <Link
            to="/"
            className="flex flex-col items-center justify-center text-slate-300 hover:text-white py-2 transition-colors"
          >
            <Music className="h-5 w-5" />
            <span className="text-[10px] mt-1">Início</span>
          </Link>

          <Link
            to="/eventos"
            className="flex flex-col items-center justify-center text-slate-300 hover:text-white py-2 relative transition-colors"
          >
            <Calendar className="h-5 w-5" />
            <span className="text-[10px] mt-1">Eventos</span>
            {pendingMyResponse > 0 && (
              <span className="absolute top-1 right-2 bg-red-500 text-white text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center">
                {pendingMyResponse}
              </span>
            )}
          </Link>

          <Link
            to="/disponibilidades"
            className="flex flex-col items-center justify-center text-slate-300 hover:text-white py-2 transition-colors"
          >
            <Clock className="h-5 w-5" />
            <span className="text-[10px] mt-1">Datas</span>
          </Link>

          <button
            onClick={() => setOpenMore((prev) => !prev)}
            className="flex flex-col items-center justify-center text-slate-300 hover:text-white py-2 relative transition-colors"
            aria-expanded={openMore}
            aria-controls="mobile-more-menu"
          >
            {openMore ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            <span className="text-[10px] mt-1">Mais</span>
            {pendingApproval > 0 && (
              <span className="absolute top-1 right-2 bg-yellow-500 text-white text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center">
                {pendingApproval}
              </span>
            )}
          </button>
        </div>

        {/* Menu Expandido "Mais" */}
        {openMore && (
          <div
            id="mobile-more-menu"
            className="absolute bottom-full left-0 right-0 bg-slate-950/95 border-t border-white/10 shadow-2xl shadow-black/40 p-3 space-y-2 max-h-[70vh] overflow-y-auto"
          >
            <div className="rounded-xl border border-white/10 bg-slate-900/70 px-3 py-2">
              <p className="text-sm font-semibold text-slate-100 truncate">{displayName}</p>
              {instrumentLabel && (
                <p className="text-xs text-slate-300 truncate">{instrumentLabel}</p>
              )}
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
              to="/disponibilidades"
              onClick={() => setOpenMore(false)}
              className="flex items-center gap-3 px-3 py-2 text-slate-200 hover:bg-white/5 rounded-lg transition-colors"
            >
              <Clock className="h-5 w-5" />
              <span className="text-sm">Datas Disponíveis</span>
            </Link>
            <Link
              to="/marketplace"
              onClick={() => setOpenMore(false)}
              className="flex items-center gap-3 px-3 py-2 text-slate-200 hover:bg-white/5 rounded-lg transition-colors"
            >
              <Megaphone className="h-5 w-5" />
              <span className="text-sm">Marketplace</span>
            </Link>
            <Link
              to="/aprovacoes"
              onClick={() => setOpenMore(false)}
              className="flex items-center justify-between px-3 py-2 text-amber-300 hover:bg-amber-500/10 rounded-lg transition-colors"
            >
              <span className="flex items-center gap-3">
                <Crown className="h-5 w-5" />
                <span className="text-sm font-medium">Aprovações</span>
              </span>
              {pendingApproval > 0 && (
                <span className="bg-yellow-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                  {pendingApproval}
                </span>
              )}
            </Link>
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
    </nav>
  );
};

const NavLink: React.FC<{ to: string; icon: React.ReactNode; label: string; badge?: number; accent?: boolean }> = ({ to, icon, label, badge, accent }) => (
  <Link
    to={to}
    className={`flex items-center space-x-1 transition-colors relative ${
      accent ? 'text-amber-300 hover:text-amber-200' : 'text-slate-200 hover:text-white'
    }`}
  >
    {icon}
    <span>{label}</span>
    {typeof badge === 'number' && badge > 0 && (
      <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full h-5 min-w-5 px-1 flex items-center justify-center">
        {badge}
      </span>
    )}
  </Link>
);

export default Navbar;
