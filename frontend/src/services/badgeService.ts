// services/badgeService.ts
import { api } from './api';

export interface BadgeProgressEarned {
  id: number;
  slug: string;
  name: string;
  description?: string | null;
  icon?: string | null;
  awarded_at?: string | null;
}

export interface BadgeProgressAvailable {
  slug: string;
  name: string;
  description?: string | null;
  icon?: string | null;
  current: number;
  required: number;
  percentage: number;
  extra_condition?: string | null;
}

export interface BadgeProgressResponse {
  earned: BadgeProgressEarned[];
  available: BadgeProgressAvailable[];
}

export const badgeService = {
  getProgress: async (): Promise<BadgeProgressResponse> => {
    const response = await api.get('/badges/');
    return response.data;
  },
};
