// services/connectionService.ts
import { api } from './api';
import type { Connection } from '../types';
import type { PaginatedResponse } from './types';

export const connectionService = {
  getAll: async (params?: { all?: boolean; type?: string }): Promise<Connection[]> => {
    const response = await api.get('/connections/', { params });
    return response.data;
  },

  getAllPaginated: async (params?: {
    page?: number;
    page_size?: number;
    type?: string;
  }): Promise<PaginatedResponse<Connection>> => {
    const response = await api.get('/connections/', { params });
    return response.data;
  },

  create: async (payload: {
    target_id: number;
    connection_type: string;
    notes?: string | null;
  }): Promise<Connection> => {
    const response = await api.post('/connections/', payload);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/connections/${id}/`);
  },
};
