/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { adminService, api } from '../services/api';
import { clearStoredAccessToken, clearStoredRefreshToken } from '../utils/tokenStorage';

const SESSION_KEY = 'gigflow_admin_session';
const REMEMBER_KEY = 'gigflow_admin_remember';

interface AdminUser {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  is_staff: boolean;
  is_superuser: boolean;
}

interface AdminAuthContextType {
  user: AdminUser | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (username: string, password: string, rememberMe?: boolean) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

export const useAdminAuth = () => {
  const context = useContext(AdminAuthContext);
  if (context === undefined) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return context;
};

export const AdminAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    try {
      const admin = await adminService.getMe();
      setUser(admin);
    } catch (error) {
      const status = (error as { response?: { status?: number } })?.response?.status;
      if (status !== 401) {
        console.error('Erro ao verificar autenticação do admin:', error);
      }
      setUser(null);
      sessionStorage.removeItem(SESSION_KEY);
      clearStoredAccessToken();
      clearStoredRefreshToken();
    } finally {
      setLoading(false);
    }
  }, []);

  const login = useCallback(
    async (username: string, password: string, rememberMe?: boolean) => {
      const response = await api.post('/admin/token/', { username, password });

      const data = response.data;

      if (data.user_type !== 'admin') {
        throw new Error('Acesso negado. Esta área é restrita a administradores.');
      }

      sessionStorage.setItem(SESSION_KEY, 'true');

      // Armazena preferência de "Permanecer conectado"
      if (rememberMe) {
        localStorage.setItem(REMEMBER_KEY, 'true');
      } else {
        localStorage.removeItem(REMEMBER_KEY);
      }

      await checkAuth();
    },
    [checkAuth]
  );

  const logout = useCallback(async () => {
    try {
      await api.post('/token/logout/');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      sessionStorage.removeItem(SESSION_KEY);
      localStorage.removeItem(REMEMBER_KEY);
      clearStoredAccessToken();
      clearStoredRefreshToken();
      setUser(null);
    }
  }, []);

  useEffect(() => {
    const bootstrap = async () => {
      const hasActiveSession = sessionStorage.getItem(SESSION_KEY);
      const rememberMe = localStorage.getItem(REMEMBER_KEY) === 'true';

      if (!hasActiveSession && !rememberMe) {
        setUser(null);
        clearStoredAccessToken();
        clearStoredRefreshToken();
        setLoading(false);
        return;
      }

      // Restaura marcador de sessão se estava em "Permanecer conectado"
      if (rememberMe && !hasActiveSession) {
        sessionStorage.setItem(SESSION_KEY, 'true');
      }

      await checkAuth();
    };

    bootstrap();
  }, [checkAuth]);

  const value: AdminAuthContextType = {
    user,
    isAuthenticated: !!user,
    loading,
    login,
    logout,
    checkAuth,
  };

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
};
