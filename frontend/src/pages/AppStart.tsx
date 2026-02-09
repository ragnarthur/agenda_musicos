import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Music, Building2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useCompanyAuth } from '../contexts/CompanyAuthContext';
import { useAdminAuth } from '../contexts/AdminAuthContext';
import FullscreenBackground from '../components/Layout/FullscreenBackground';
import Loading from '../components/common/Loading';
import { ADMIN_ROUTES } from '../routes/adminRoutes';

const AppStart: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated: musicianAuth, loading: musicianLoading } = useAuth();
  const { isAuthenticated: companyAuth, loading: companyLoading } = useCompanyAuth();
  const { isAuthenticated: adminAuth, loading: adminLoading } = useAdminAuth();

  const loading = musicianLoading || companyLoading || adminLoading;

  // Redireciona automaticamente se já estiver logado
  useEffect(() => {
    if (loading) return;

    if (adminAuth) {
      navigate(ADMIN_ROUTES.dashboard, { replace: true });
      return;
    }

    if (musicianAuth) {
      navigate('/dashboard', { replace: true });
      return;
    }

    if (companyAuth) {
      navigate('/contratante/dashboard', { replace: true });
      return;
    }
  }, [loading, adminAuth, musicianAuth, companyAuth, navigate]);

  // Mostra loading enquanto verifica autenticação
  if (loading) {
    return (
      <FullscreenBackground>
        <div className="min-h-[100svh] flex items-center justify-center">
          <Loading text="Carregando..." />
        </div>
      </FullscreenBackground>
    );
  }

  // Se já autenticado, não renderiza nada (useEffect vai redirecionar)
  if (adminAuth || musicianAuth || companyAuth) {
    return (
      <FullscreenBackground>
        <div className="min-h-[100svh] flex items-center justify-center">
          <Loading text="Redirecionando..." />
        </div>
      </FullscreenBackground>
    );
  }

  return (
    <FullscreenBackground>
      <div className="min-h-[100svh] flex flex-col items-center justify-center px-6 py-12">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <img
            src="/icon-512.png"
            alt="GigFlow"
            className="w-24 h-24 rounded-2xl shadow-2xl shadow-primary-500/30"
          />
        </motion.div>

        {/* Título */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-center mb-12"
        >
          <h1 className="text-3xl font-bold text-white mb-2">GigFlow</h1>
          <p className="text-gray-400">Agenda para Músicos</p>
        </motion.div>

        {/* Pergunta */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-lg text-gray-300 mb-8 text-center"
        >
          Como deseja entrar?
        </motion.p>

        {/* Botões de Seleção */}
        <div className="w-full max-w-sm space-y-4">
          {/* Botão Músico */}
          <motion.button
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate('/login')}
            className="w-full flex items-center gap-4 p-5 bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 rounded-2xl shadow-lg shadow-primary-500/25 transition-all duration-300"
          >
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <Music className="w-6 h-6 text-white" />
            </div>
            <div className="text-left">
              <span className="block text-lg font-semibold text-white">Sou Músico</span>
              <span className="block text-sm text-primary-100">Gerencie sua agenda de shows</span>
            </div>
          </motion.button>

          {/* Botão Contratante */}
          <motion.button
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate('/contratante/login')}
            className="w-full flex items-center gap-4 p-5 bg-white/10 hover:bg-white/15 border border-white/20 hover:border-white/30 rounded-2xl transition-all duration-300"
          >
            <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div className="text-left">
              <span className="block text-lg font-semibold text-white">Sou Contratante</span>
              <span className="block text-sm text-gray-400">Encontre músicos profissionais</span>
            </div>
          </motion.button>
        </div>

        {/* Link para Landing */}
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          onClick={() => navigate('/')}
          className="mt-12 text-sm text-gray-500 hover:text-gray-300 transition-colors"
        >
          Saiba mais sobre o GigFlow
        </motion.button>
      </div>
    </FullscreenBackground>
  );
};

export default AppStart;
