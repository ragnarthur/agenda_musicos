/* eslint-disable react-refresh/only-export-components */
// contexts/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import type { AuthContextType, LoginCredentials, Musician } from '../types';
import { authService, musicianService } from '../services/api';
import {
  clearStoredAccessToken,
  clearStoredRefreshToken,
  setStoredAccessToken,
  setStoredRefreshToken,
} from '../utils/tokenStorage';
import { logError } from '../utils/logger';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Chave para marcar sessão ativa no sessionStorage
// sessionStorage é limpo ao fechar o navegador, garantindo novo login
const SESSION_KEY = 'gigflow_session_active';
// Chave para "Permanecer conectado" no localStorage (persiste ao fechar navegador)
const REMEMBER_KEY = 'gigflow_remember_me';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<Musician | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const bootstrap = async () => {
      // Verifica se há uma sessão ativa nesta janela do navegador
      const hasActiveSession = sessionStorage.getItem(SESSION_KEY);
      // Verifica se usuário optou por "Permanecer conectado"
      const rememberMe = localStorage.getItem(REMEMBER_KEY) === 'true';

      if (!hasActiveSession && !rememberMe) {
        // Navegador foi fechado e reaberto sem "Permanecer conectado" - força novo login
        try {
          await authService.logout();
        } catch {
          // Ignora erro de logout (pode não haver sessão)
        }
        if (!isMounted) return;
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

      try {
        const currentUser = await musicianService.getMe();
        if (!isMounted) return;
        setUser(currentUser);
      } catch (error) {
        const status = (error as { response?: { status?: number } })?.response?.status;
        if (status !== 401) {
          logError('Erro ao carregar sessão do usuário:', error);
        }
        if (!isMounted) return;
        setUser(null);
        // Remove marcador se sessão expirou
        sessionStorage.removeItem(SESSION_KEY);
        clearStoredAccessToken();
        clearStoredRefreshToken();
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    bootstrap();

    return () => {
      isMounted = false;
    };
  }, []);

  const login = useCallback(async (credentials: LoginCredentials, rememberMe?: boolean) => {
    try {
      const data = await authService.login(credentials);
      setStoredAccessToken(data.access);
      setStoredRefreshToken(data.refresh);
      sessionStorage.setItem(SESSION_KEY, 'true');
      // Armazena preferência de "Permanecer conectado"
      if (rememberMe) {
        localStorage.setItem(REMEMBER_KEY, 'true');
      } else {
        localStorage.removeItem(REMEMBER_KEY);
      }
      const musician = await musicianService.getMe();
      setUser(musician);
    } catch (error) {
      logError('Erro no login:', error);
      throw error;
    }
  }, []);

  const setSession = useCallback(async (rememberMe?: boolean) => {
    try {
      sessionStorage.setItem(SESSION_KEY, 'true');
      // Armazena preferência de "Permanecer conectado"
      if (rememberMe) {
        localStorage.setItem(REMEMBER_KEY, 'true');
      } else {
        localStorage.removeItem(REMEMBER_KEY);
      }
      const musician = await musicianService.getMe();
      setUser(musician);
    } catch (error) {
      logError('Erro ao iniciar sessão:', error);
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
      setUser(null);
      sessionStorage.removeItem(SESSION_KEY);
      clearStoredAccessToken();
      clearStoredRefreshToken();
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      // Revogar token do Google se existir
      const userEmail = user?.user?.email;
      if (userEmail && window.google?.accounts?.id) {
        window.google.accounts.id.revoke(userEmail, done => {
          if (done.error) {
            console.warn('Erro ao revogar Google token:', done.error);
          }
        });
      }

      await authService.logout();
    } catch (error) {
      logError('Erro ao finalizar sessão:', error);
    } finally {
      // Remove marcador de sessão e preferência de "Permanecer conectado"
      sessionStorage.removeItem(SESSION_KEY);
      localStorage.removeItem(REMEMBER_KEY);
      clearStoredAccessToken();
      clearStoredRefreshToken();
      setUser(null);
    }
  }, [user]);

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      login,
      setSession,
      logout,
      refreshUser,
      isAuthenticated: !!user,
      loading,
    }),
    [user, login, setSession, logout, refreshUser, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
};
