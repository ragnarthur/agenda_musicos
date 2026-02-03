// components/navigation/CompanyNavbar.tsx
// Barra de navegação específica para empresas
import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  MessageSquare,
  Briefcase,
  Settings,
  LogOut,
  Menu,
  X,
  Bell,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCompanyAuth } from '../../contexts/CompanyAuthContext';
import OwlMascot from '../ui/OwlMascot';
import CityBadge from '../CityBadge';

const CompanyNavbar: React.FC = () => {
  const { organization, logout } = useCompanyAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    {
      path: '/empresa/dashboard',
      label: 'Dashboard',
      icon: <LayoutDashboard className="w-4 h-4" />,
      description: 'Visão geral',
    },
    {
      path: '/empresa/musicians',
      label: 'Encontrar Músicos',
      icon: <Users className="w-4 h-4" />,
      description: 'Buscar talentos',
    },
    {
      path: '/empresa/contatos',
      label: 'Conversas',
      icon: <MessageSquare className="w-4 h-4" />,
      description: 'Mensagens e contatos',
    },
    {
      path: '/empresa/vagas',
      label: 'Minhas Vagas',
      icon: <Briefcase className="w-4 h-4" />,
      description: 'Gerenciar vagas',
    },
    {
      path: '/empresa/configuracoes',
      label: 'Configurações',
      icon: <Settings className="w-4 h-4" />,
      description: 'Perfil e configurações',
    },
  ];

  const isActivePath = (path: string) => {
    if (path === '/empresa/dashboard') {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  const handleLogout = () => {
    logout();
    navigate('/login-empresa');
    setMobileMenuOpen(false);
  };

  return (
    <>
      {/* Desktop Navbar */}
      <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link
              to="/empresa/dashboard"
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            >
              <OwlMascot className="h-8 w-8" autoplay={false} />
              <span className="font-bold text-xl hidden sm:block">
                GigFlow <span className="text-indigo-600">Empresas</span>
              </span>
              <span className="font-bold text-xl sm:hidden">GigFlow</span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center space-x-1">
              {navItems.map(item => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`group min-h-[44px] flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 ${
                    isActivePath(item.path)
                      ? 'bg-indigo-50 text-indigo-600 border border-indigo-200'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <div
                    className={`transition-transform group-hover:scale-110 ${
                      isActivePath(item.path) ? 'text-indigo-600' : ''
                    }`}
                  >
                    {item.icon}
                  </div>
                  <div className="text-left">
                    <span className="font-medium text-sm">{item.label}</span>
                  </div>
                </Link>
              ))}
            </div>

            {/* User Actions */}
            <div className="flex items-center gap-4">
              <CityBadge variant="light" className="hidden lg:inline-flex" />
              {/* Notifications */}
              <button className="relative min-h-[44px] min-w-[44px] p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>

              {/* User Menu */}
              <div className="hidden sm:flex items-center gap-3">
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{organization?.name}</p>
                  <p className="text-xs text-gray-500">
                    {organization?.city && `${organization.city} - ${organization?.state}`}
                  </p>
                </div>

                <div className="h-8 w-px bg-gray-300"></div>

                <button
                  onClick={handleLogout}
                  className="min-h-[44px] min-w-[44px] p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                  title="Sair"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>

              {/* Mobile Menu Toggle */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden min-h-[44px] min-w-[44px] p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="lg:hidden border-t border-gray-200 bg-white"
            >
              <div className="container mx-auto px-4 py-4">
                {/* Mobile Navigation */}
                <div className="space-y-2 mb-6">
                  {navItems.map(item => (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`min-h-[44px] flex items-center gap-3 px-3 py-3 rounded-lg transition-all ${
                        isActivePath(item.path)
                          ? 'bg-indigo-50 text-indigo-600 border border-indigo-200'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                      }`}
                    >
                      <div className={isActivePath(item.path) ? 'text-indigo-600' : ''}>
                        {item.icon}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{item.label}</p>
                        <p className="text-xs text-gray-500">{item.description}</p>
                      </div>
                    </Link>
                  ))}
                </div>

                {/* Mobile User Info */}
                <div className="border-t border-gray-200 pt-4">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="font-medium text-gray-900">{organization?.name}</p>
                      {organization?.city && (
                        <p className="text-sm text-gray-500">
                          {organization.city} - {organization.state}
                        </p>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={handleLogout}
                    className="min-h-[44px] w-full flex items-center justify-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium"
                  >
                    <LogOut className="w-4 h-4" />
                    Sair da Conta
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Mobile Navigation Bottom Bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40">
        <div className="grid grid-cols-5 gap-1">
          {navItems.slice(0, 5).map(item => (
            <Link
              key={item.path}
              to={item.path}
              className={`min-h-[56px] flex flex-col items-center justify-center gap-1 py-2 transition-colors ${
                isActivePath(item.path)
                  ? 'text-indigo-600 bg-indigo-50'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <div
                className={`transition-transform hover:scale-110 ${
                  isActivePath(item.path) ? 'text-indigo-600' : ''
                }`}
              >
                {item.icon}
              </div>
              <span className="text-xs font-medium">{item.label.split(' ')[0]}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Add padding for mobile bottom bar */}
      <div className="lg:hidden h-16"></div>
    </>
  );
};

export default CompanyNavbar;
