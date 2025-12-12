/* eslint-disable react-refresh/only-export-components */
// contexts/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import type { AuthContextType, AuthTokens, LoginCredentials, Musician } from '../types';
import { authService, musicianService } from '../services/api';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<Musician | null>(null);
  const [tokens, setTokens] = useState<AuthTokens | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Carregar dados do localStorage ao iniciar
    const loadStoredAuth = async () => {
      try {
        const storedTokens = localStorage.getItem('tokens');
        const storedUser = localStorage.getItem('user');

        if (storedTokens && storedUser) {
          const parsedTokens: AuthTokens = JSON.parse(storedTokens);
          const parsedUser: Musician = JSON.parse(storedUser);

          setTokens(parsedTokens);
          setUser(parsedUser);

          // Tentar buscar dados atualizados do usuário
          try {
            const currentUser = await musicianService.getMe();
            setUser(currentUser);
            localStorage.setItem('user', JSON.stringify(currentUser));
          } catch (error) {
            console.error('Erro ao buscar dados do usuário:', error);
            // Se falhar, manter os dados do localStorage
          }
        }
      } catch (error) {
        console.error('Erro ao carregar autenticação:', error);
        localStorage.removeItem('tokens');
        localStorage.removeItem('user');
      } finally {
        setLoading(false);
      }
    };

    loadStoredAuth();
  }, []);

  const login = async (credentials: LoginCredentials) => {
    try {
      // Obter tokens
      const authTokens = await authService.login(credentials);
      setTokens(authTokens);
      localStorage.setItem('tokens', JSON.stringify(authTokens));

      // Obter dados do músico
      const musician = await musicianService.getMe();
      setUser(musician);
      localStorage.setItem('user', JSON.stringify(musician));
    } catch (error) {
      console.error('Erro no login:', error);
      throw error;
    }
  };

  const logout = () => {
    setUser(null);
    setTokens(null);
    localStorage.removeItem('tokens');
    localStorage.removeItem('user');
  };

  const value: AuthContextType = {
    user,
    tokens,
    login,
    logout,
    isAuthenticated: !!user && !!tokens,
    isLeader: user?.is_leader || false,
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
