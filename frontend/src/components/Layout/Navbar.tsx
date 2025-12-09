// components/Layout/Navbar.tsx
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Music, Calendar, Users, LogOut, Crown } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const Navbar: React.FC = () => {
  const { user, logout, isLeader } = useAuth();
  const navigate = useNavigate();

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
              className="flex items-center space-x-1 text-gray-700 hover:text-primary-600 transition-colors"
            >
              <Calendar className="h-5 w-5" />
              <span>Eventos</span>
            </Link>

            <Link
              to="/musicos"
              className="flex items-center space-x-1 text-gray-700 hover:text-primary-600 transition-colors"
            >
              <Users className="h-5 w-5" />
              <span>Músicos</span>
            </Link>

            {isLeader && (
              <Link
                to="/aprovacoes"
                className="flex items-center space-x-1 text-yellow-600 hover:text-yellow-700 transition-colors"
              >
                <Crown className="h-5 w-5" />
                <span>Aprovações</span>
              </Link>
            )}
          </div>

          {/* Usuário e Logout */}
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">{user?.full_name}</p>
              <p className="text-xs text-gray-500">
                {user?.instrument && `${user.instrument.charAt(0).toUpperCase()}${user.instrument.slice(1)}`}
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
            className="flex flex-col items-center text-gray-700 hover:text-primary-600 p-2"
          >
            <Calendar className="h-6 w-6" />
            <span className="text-xs mt-1">Eventos</span>
          </Link>

          <Link
            to="/musicos"
            className="flex flex-col items-center text-gray-700 hover:text-primary-600 p-2"
          >
            <Users className="h-6 w-6" />
            <span className="text-xs mt-1">Músicos</span>
          </Link>

          {isLeader && (
            <Link
              to="/aprovacoes"
              className="flex flex-col items-center text-yellow-600 hover:text-yellow-700 p-2"
            >
              <Crown className="h-6 w-6" />
              <span className="text-xs mt-1">Aprovações</span>
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
