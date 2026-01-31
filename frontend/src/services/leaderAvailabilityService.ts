// services/leaderAvailabilityService.ts
import { api } from './api';
import type { LeaderAvailability, LeaderAvailabilityCreate } from '../types';

export const leaderAvailabilityService = {
  getAll: async (
    params?: Record<string, string | number | boolean>
  ): Promise<LeaderAvailability[]> => {
    const response = await api.get('/leader-availabilities/', { params });
    return response.data;
  },

  create: async (payload: LeaderAvailabilityCreate): Promise<LeaderAvailability> => {
    const response = await api.post('/leader-availabilities/', payload);
    return response.data;
  },

  update: async (id: number, payload: LeaderAvailabilityCreate): Promise<LeaderAvailability> => {
    const response = await api.put(`/leader-availabilities/${id}/`, payload);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/leader-availabilities/${id}/`);
  },
};
