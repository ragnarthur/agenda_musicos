/* eslint-disable react-refresh/only-export-components */
// contexts/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import type { AuthContextType, LoginCredentials, Musician } from '../types';
import { authService, musicianService } from '../services/api';
import { logError } from '../utils/logger';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Chave para marcar sessão ativa no sessionStorage
// sessionStorage é limpo ao fechar o navegador, garantindo novo login
const SESSION_KEY = 'gigflow_session_active';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<Musician | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const bootstrap = async () => {
      // Verifica se há uma sessão ativa nesta janela do navegador
      const hasActiveSession = sessionStorage.getItem(SESSION_KEY);

      if (!hasActiveSession) {
        // Navegador foi fechado e reaberto - limpa cookies e força novo login
        try {
          await authService.logout();
        } catch {
          // Ignora erro de logout (pode não haver sessão)
        }
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        const currentUser = await musicianService.getMe();
        setUser(currentUser);
      } catch (error) {
        const status = (error as { response?: { status?: number } })?.response?.status;
        if (status !== 401) {
          logError('Erro ao carregar sessão do usuário:', error);
        }
        setUser(null);
        // Remove marcador se sessão expirou
        sessionStorage.removeItem(SESSION_KEY);
      } finally {
        setLoading(false);
      }
    };
    bootstrap();
  }, []);

  const login = useCallback(async (credentials: LoginCredentials) => {
    try {
      await authService.login(credentials);
      // Marca sessão ativa no sessionStorage
      sessionStorage.setItem(SESSION_KEY, 'true');
      const musician = await musicianService.getMe();
      setUser(musician);
    } catch (error) {
      logError('Erro no login:', error);
      throw error;
    }
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const currentUser = await musicianService.getMe();
      setUser(currentUser);
    } catch (error) {
      const status = (error as { response?: { status?: number } })?.response?.status;
      if (status !== 401) {
        logError('Erro ao atualizar sessão do usuário:', error);
      }
      if (status === 401) {
        setUser(null);
      }
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } catch (error) {
      logError('Erro ao finalizar sessão:', error);
    } finally {
      // Remove marcador de sessão
      sessionStorage.removeItem(SESSION_KEY);
      setUser(null);
    }
  }, []);

  const value = useMemo<AuthContextType>(() => ({
    user,
    login,
    logout,
    refreshUser,
    isAuthenticated: !!user,
    loading,
  }), [user, login, logout, refreshUser, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
};
