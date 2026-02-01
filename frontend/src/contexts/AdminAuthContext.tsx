/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { adminService, api } from '../services/api';
import { clearStoredRefreshToken, setStoredRefreshToken } from '../utils/tokenStorage';

const SESSION_KEY = 'gigflow_admin_session';

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
  login: (username: string, password: string) => Promise<void>;
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
      clearStoredRefreshToken();
    } finally {
      setLoading(false);
    }
  }, []);

  const login = useCallback(
    async (username: string, password: string) => {
      const response = await api.post('/admin/token/', { username, password });

      const data = response.data;

      if (data.user_type !== 'admin') {
        throw new Error('Acesso negado. Esta área é restrita a administradores.');
      }

      setStoredRefreshToken(data.refresh);
      sessionStorage.setItem(SESSION_KEY, 'true');
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
      clearStoredRefreshToken();
      setUser(null);
    }
  }, []);

  useEffect(() => {
    const bootstrap = async () => {
      const hasActiveSession = sessionStorage.getItem(SESSION_KEY);

      if (!hasActiveSession) {
        setUser(null);
        setLoading(false);
        return;
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
