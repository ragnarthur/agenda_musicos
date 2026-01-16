/* eslint-disable react-refresh/only-export-components */
// contexts/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import type { AuthContextType, LoginCredentials, Musician } from '../types';
import { authService, musicianService } from '../services/api';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<Musician | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const currentUser = await musicianService.getMe();
        setUser(currentUser);
      } catch (error) {
        const status = (error as { response?: { status?: number } })?.response?.status;
        if (status !== 401) {
          console.error('Erro ao carregar sessão do usuário:', error);
        }
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    bootstrap();
  }, []);

  const login = useCallback(async (credentials: LoginCredentials) => {
    try {
      await authService.login(credentials);
      const musician = await musicianService.getMe();
      setUser(musician);
    } catch (error) {
      console.error('Erro no login:', error);
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
        console.error('Erro ao atualizar sessão do usuário:', error);
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
      console.error('Erro ao finalizar sessão:', error);
    } finally {
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
