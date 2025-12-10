// components/Layout/Navbar.tsx
import React, { useEffect, useState } from 'react';
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
    if (user.bio) return user.bio; // exibe bio quando existir (vocal/violão/guitarra)
    const displayMap: Record<string, string> = {
      vocal: 'Vocal',
      guitar: 'Guitarra',
      bass: 'Baixo',
      drums: 'Bateria',
      keyboard: 'Teclado',
      other: 'Outro',
    };
    return displayMap[user.instrument] || user.instrument;
  };

  useEffect(() => {
    loadNotifications();
    // Recarregar a cada 30 segundos
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, [user]);

  const loadNotifications = async () => {
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
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="bg-white shadow-md">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo e Nome */}
          <Link to="/" className="flex items-center space-x-2">
            <Music className="h-8 w-8 text-primary-600" />
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
                {isLeader && <span className="ml-1 text-yellow-600">👑 Líder</span>}
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
      <div className="md:hidden border-t border-gray-200">
        <div className="flex justify-around p-2">
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
