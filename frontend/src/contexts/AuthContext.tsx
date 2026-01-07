/* eslint-disable react-refresh/only-export-components */
// contexts/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
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

  const login = async (credentials: LoginCredentials) => {
    try {
      await authService.login(credentials);
      const musician = await musicianService.getMe();
      setUser(musician);
    } catch (error) {
      console.error('Erro no login:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error('Erro ao finalizar sessão:', error);
    } finally {
      setUser(null);
    }
  };

  const value: AuthContextType = {
    user,
    login,
    logout,
    isAuthenticated: !!user,
    loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
};
