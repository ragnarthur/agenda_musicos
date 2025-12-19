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
  const [openMenu, setOpenMenu] = useState(false);

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
    <nav className="bg-white/90 backdrop-blur-xl shadow-md sticky top-0 z-40 border-b border-white/60">
      <div className="container mx-auto px-3 sm:px-4">
        <div className="flex items-center justify-between min-h-[64px] py-2 gap-3">
          {/* Logo e Nome */}
          <Link
            to="/"
            className="flex items-center space-x-2 hover:scale-[1.01] transition-transform min-w-fit"
          >
            <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center shadow-inner">
              <Music className="h-6 w-6 text-primary-600" />
            </div>
            <span className="text-lg sm:text-xl font-bold text-gray-900">GigFlow</span>
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
              <p className="text-sm font-medium text-gray-900 truncate max-w-[200px]">{user?.full_name}</p>
              <p className="text-xs text-gray-500 truncate max-w-[220px]">
                {formatInstrument()}
              </p>
            </div>

            <div className="md:hidden flex items-center gap-2 text-sm text-gray-700">
              <span className="font-semibold truncate max-w-[120px]">
                {user?.user?.first_name || user?.full_name || user?.user?.username}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                className="md:hidden inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white p-2 text-gray-700 hover:border-primary-300 hover:text-primary-600"
                onClick={() => setOpenMenu((prev) => !prev)}
                aria-label="Abrir menu"
              >
                {openMenu ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center space-x-1 text-gray-700 hover:text-red-600 transition-colors md:px-0 px-2"
                title="Sair"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Menu Mobile */}
        {openMenu && (
          <div className="md:hidden border-t border-gray-100 py-3 space-y-2">
            <NavLinkMobile to="/eventos" icon={<Calendar className="h-4 w-4" />} label="Eventos" badge={pendingMyResponse} onClick={() => setOpenMenu(false)} />
            <NavLinkMobile to="/musicos" icon={<Users className="h-4 w-4" />} label="Músicos" onClick={() => setOpenMenu(false)} />
            <NavLinkMobile to="/conexoes" icon={<HeartHandshake className="h-4 w-4" />} label="Rede & Badges" onClick={() => setOpenMenu(false)} />
            <NavLinkMobile to="/disponibilidades" icon={<Clock className="h-4 w-4" />} label="Datas Disponíveis" onClick={() => setOpenMenu(false)} />
            <NavLinkMobile to="/marketplace" icon={<Megaphone className="h-4 w-4" />} label="Marketplace" onClick={() => setOpenMenu(false)} />
            <NavLinkMobile to="/aprovacoes" icon={<Crown className="h-4 w-4" />} label="Aprovações" badge={pendingApproval} accent onClick={() => setOpenMenu(false)} />
          </div>
        )}
      </div>

      {/* Barra de Navegação Mobile - Fixa na parte inferior */}
      <div
        className="md:hidden fixed bottom-0 left-0 right-0 border-t border-gray-200 bg-white shadow-[0_-4px_12px_rgba(0,0,0,0.1)] z-40"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="grid grid-cols-5 w-full">
          <Link
            to="/"
            className="flex flex-col items-center justify-center text-gray-600 hover:text-primary-600 py-2 transition-colors"
          >
            <Music className="h-5 w-5" />
            <span className="text-[10px] mt-1">Início</span>
          </Link>

          <Link
            to="/eventos"
            className="flex flex-col items-center justify-center text-gray-600 hover:text-primary-600 py-2 relative transition-colors"
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
            to="/musicos"
            className="flex flex-col items-center justify-center text-gray-600 hover:text-primary-600 py-2 transition-colors"
          >
            <Users className="h-5 w-5" />
            <span className="text-[10px] mt-1">Músicos</span>
          </Link>

          <Link
            to="/conexoes"
            className="flex flex-col items-center justify-center text-gray-600 hover:text-primary-600 py-2 transition-colors"
          >
            <HeartHandshake className="h-5 w-5" />
            <span className="text-[10px] mt-1">Rede</span>
          </Link>

          <button
            onClick={() => setOpenMenu((prev) => !prev)}
            className="flex flex-col items-center justify-center text-gray-600 hover:text-primary-600 py-2 relative transition-colors"
          >
            <Menu className="h-5 w-5" />
            <span className="text-[10px] mt-1">Mais</span>
            {pendingApproval > 0 && (
              <span className="absolute top-1 right-2 bg-yellow-500 text-white text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center">
                {pendingApproval}
              </span>
            )}
          </button>
        </div>

        {/* Menu Expandido "Mais" */}
        {openMenu && (
          <div className="absolute bottom-full left-0 right-0 bg-white border-t border-gray-200 shadow-lg p-3 space-y-2">
            <Link
              to="/eventos/agenda"
              onClick={() => setOpenMenu(false)}
              className="flex items-center gap-3 px-3 py-2 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
            >
              <Clock className="h-5 w-5 rotate-45" />
              <span className="text-sm">Grade de Eventos</span>
            </Link>
            <Link
              to="/disponibilidades"
              onClick={() => setOpenMenu(false)}
              className="flex items-center gap-3 px-3 py-2 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
            >
              <Clock className="h-5 w-5" />
              <span className="text-sm">Datas Disponíveis</span>
            </Link>
            <Link
              to="/marketplace"
              onClick={() => setOpenMenu(false)}
              className="flex items-center gap-3 px-3 py-2 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
            >
              <Megaphone className="h-5 w-5" />
              <span className="text-sm">Marketplace</span>
            </Link>
            <Link
              to="/aprovacoes"
              onClick={() => setOpenMenu(false)}
              className="flex items-center justify-between px-3 py-2 text-yellow-700 hover:bg-yellow-50 rounded-lg transition-colors"
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
            <div className="border-t border-gray-100 pt-2 mt-2">
              <button
                onClick={() => {
                  setOpenMenu(false);
                  handleLogout();
                }}
                className="flex items-center gap-3 w-full px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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
      accent ? 'text-yellow-600 hover:text-yellow-700' : 'text-gray-700 hover:text-primary-600'
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

const NavLinkMobile: React.FC<{
  to: string;
  icon: React.ReactNode;
  label: string;
  badge?: number;
  accent?: boolean;
  onClick?: () => void;
}> = ({ to, icon, label, badge, accent, onClick }) => (
  <Link
    to={to}
    onClick={onClick}
    className={`flex items-center justify-between rounded-xl border px-3 py-2 text-sm transition ${
      accent ? 'border-yellow-200 bg-yellow-50 text-yellow-700' : 'border-gray-200 bg-white text-gray-700'
    }`}
  >
    <span className="flex items-center gap-2">
      {icon}
      {label}
    </span>
    {typeof badge === 'number' && badge > 0 && (
      <span className="bg-red-500 text-white text-xs font-bold rounded-full h-5 min-w-5 px-1 flex items-center justify-center">
        {badge}
      </span>
    )}
  </Link>
);

export default Navbar;
