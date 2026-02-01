// services/authService.ts - Serviço de autenticação
import { api } from './api';
import type { LoginCredentials } from '../types';

export const authService = {
  login: async (
    credentials: LoginCredentials
  ): Promise<{ detail?: string; access?: string; refresh?: string }> => {
    const response = await api.post('/token/', credentials);
    return response.data;
  },

  logout: async (): Promise<void> => {
    await api.post('/token/logout/');
  },

  requestPasswordReset: async (email: string): Promise<{ message: string }> => {
    const response = await api.post('/password-reset/', { email });
    return response.data;
  },

  confirmPasswordReset: async (payload: {
    uid: string;
    token: string;
    new_password: string;
  }): Promise<{ message: string }> => {
    const response = await api.post('/password-reset-confirm/', payload);
    return response.data;
  },
};
