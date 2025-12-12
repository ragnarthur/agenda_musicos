// components/Layout/Navbar.tsx
import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Music, Calendar, Users, LogOut, Crown, Clock } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { eventService } from '../../services/api';

const Navbar: React.FC = () => {
  const { user, logout, isLeader } = useAuth();
  const navigate = useNavigate();
  const [pendingMyResponse, setPendingMyResponse] = useState(0);
  const [pendingApproval, setPendingApproval] = useState(0);

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
      other: 'Músico',
    };
    return displayMap[user.instrument] || user.instrument;
  };

  const loadNotifications = useCallback(async () => {
    try {
      // Eventos pendentes de minha resposta
      const myPending = await eventService.getPendingMyResponse();
      setPendingMyResponse(myPending.length);

      // Eventos pendentes de aprovação (apenas para líderes)
      if (isLeader) {
        const approvals = await eventService.getAll({ pending_approval: true });
        setPendingApproval(approvals.length);
      }
    } catch (error) {
      console.error('Erro ao carregar notificações:', error);
    }
  }, [isLeader]);

  useEffect(() => {
    const timeout = setTimeout(() => void loadNotifications(), 0);
    const interval = setInterval(loadNotifications, 30000);
    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, [loadNotifications]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="bg-white/80 backdrop-blur-xl shadow-md sticky top-0 z-40 border-b border-white/60">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16 gap-3 flex-wrap">
          {/* Logo e Nome */}
          <Link to="/" className="flex items-center space-x-2 hover:scale-[1.01] transition-transform">
            <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center shadow-inner">
              <Music className="h-6 w-6 text-primary-600" />
            </div>
            <span className="text-xl font-bold text-gray-900">Agenda Músicos</span>
          </Link>

          {/* Links de Navegação */}
          <div className="hidden md:flex items-center space-x-6">
            <Link
              to="/eventos"
              className="flex items-center space-x-1 text-gray-700 hover:text-primary-600 transition-colors relative"
            >
              <Calendar className="h-5 w-5" />
              <span>Eventos</span>
              {pendingMyResponse > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                  {pendingMyResponse}
                </span>
              )}
            </Link>

            <Link
              to="/musicos"
              className="flex items-center space-x-1 text-gray-700 hover:text-primary-600 transition-colors"
            >
              <Users className="h-5 w-5" />
              <span>Músicos</span>
            </Link>

            <Link
              to="/disponibilidades"
              className="flex items-center space-x-1 text-gray-700 hover:text-primary-600 transition-colors"
            >
              <Clock className="h-5 w-5" />
              <span>{isLeader ? 'Minhas Disponibilidades' : 'Datas Disponíveis'}</span>
            </Link>

            {isLeader && (
              <Link
                to="/aprovacoes"
                className="flex items-center space-x-1 text-yellow-600 hover:text-yellow-700 transition-colors relative"
              >
                <Crown className="h-5 w-5" />
                <span>Aprovações</span>
                {pendingApproval > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                    {pendingApproval}
                  </span>
                )}
              </Link>
            )}
          </div>

          {/* Usuário e Logout */}
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">{user?.full_name}</p>
              <p className="text-xs text-gray-500">
                {formatInstrument()}
                {isLeader && <span className="ml-1 text-yellow-600">🥁 Agenda do Baterista</span>}
              </p>
            </div>

            <button
              onClick={handleLogout}
              className="flex items-center space-x-1 text-gray-700 hover:text-red-600 transition-colors"
              title="Sair"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Menu Mobile */}
      <div
        className="md:hidden fixed bottom-0 left-0 right-0 border-t border-gray-200 bg-white/85 backdrop-blur-lg shadow-[0_-6px_20px_rgba(0,0,0,0.08)] z-40"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 8px)' }}
      >
        <div className="flex justify-around p-2 pt-3">
          <Link
            to="/eventos"
            className="flex flex-col items-center text-gray-700 hover:text-primary-600 p-2 relative"
          >
            <Calendar className="h-6 w-6" />
            <span className="text-xs mt-1">Eventos</span>
            {pendingMyResponse > 0 && (
              <span className="absolute top-0 right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                {pendingMyResponse}
              </span>
            )}
          </Link>

          <Link
            to="/eventos/agenda"
            className="flex flex-col items-center text-gray-700 hover:text-primary-600 p-2"
          >
            <Clock className="h-6 w-6 rotate-45" />
            <span className="text-xs mt-1">Grade</span>
          </Link>

          <Link
            to="/musicos"
            className="flex flex-col items-center text-gray-700 hover:text-primary-600 p-2"
          >
            <Users className="h-6 w-6" />
            <span className="text-xs mt-1">Músicos</span>
          </Link>

          <Link
            to="/disponibilidades"
            className="flex flex-col items-center text-gray-700 hover:text-primary-600 p-2"
          >
            <Clock className="h-6 w-6" />
            <span className="text-xs mt-1">{isLeader ? 'Horários' : 'Datas'}</span>
          </Link>

          {isLeader && (
            <Link
              to="/aprovacoes"
              className="flex flex-col items-center text-yellow-600 hover:text-yellow-700 p-2 relative"
            >
              <Crown className="h-6 w-6" />
              <span className="text-xs mt-1">Aprovações</span>
              {pendingApproval > 0 && (
                <span className="absolute top-0 right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                  {pendingApproval}
                </span>
              )}
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
