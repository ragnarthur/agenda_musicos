// services/musicianService.ts
import { api, uploadApi } from './api';
import type {
  Musician,
  MusicianUpdatePayload,
  MusicianRating,
  MusicianBadge,
  PublicCalendarResponse,
} from '../types';
import type { ConnectionsResponse, PaginatedResponse } from './types';

export type InstrumentOption = {
  value: string;
  label: string;
  count?: number;
};

export interface ConnectionStatusResponse {
  is_connected: boolean;
  connection_id: number | null;
  connection_type: string | null;
}

export const musicianService = {
  getAll: async (params?: {
    search?: string;
    instrument?: string;
    page_size?: number;
    fetchAll?: boolean;
  }): Promise<Musician[]> => {
    const pageSize = params?.page_size ?? 50;
    const baseParams = { ...params, page_size: pageSize };

    if (!params?.fetchAll) {
      const response = await api.get('/musicians/', { params: { ...baseParams, page: 1 } });
      const data = response.data as PaginatedResponse<Musician> | Musician[];
      if (Array.isArray(data)) return data;
      return data.results ?? [];
    }

    const results: Musician[] = [];
    let page = 1;
    const MAX_PAGES = 100; // Limite de segurança para evitar loop infinito

    while (page <= MAX_PAGES) {
      const response = await api.get('/musicians/', {
        params: { ...baseParams, page },
      });
      const data = response.data as PaginatedResponse<Musician> | Musician[];
      if (Array.isArray(data)) return data;
      results.push(...(data.results ?? []));
      if (!data.next) break;
      page += 1;
    }

    return results;
  },

  getAllPaginated: async (params?: {
    search?: string;
    instrument?: string;
    page?: number;
    page_size?: number;
  }): Promise<PaginatedResponse<Musician>> => {
    const response = await api.get('/musicians/', { params });
    return response.data;
  },

  getById: async (id: number): Promise<Musician> => {
    const response = await api.get(`/musicians/${id}/`);
    return response.data;
  },

  getMe: async (): Promise<Musician> => {
    const response = await api.get('/musicians/me/');
    return response.data;
  },

  updateMe: async (payload: MusicianUpdatePayload): Promise<Musician> => {
    const response = await api.patch('/musicians/me/', payload);
    return response.data;
  },

  getConnections: async (
    musicianId: number,
    params?: { type?: string; limit?: number }
  ): Promise<ConnectionsResponse> => {
    const response = await api.get(`/musicians/${musicianId}/connections/`, { params });
    return response.data;
  },

  getReviews: async (musicianId: number): Promise<MusicianRating[]> => {
    const response = await api.get(`/musicians/${musicianId}/reviews/`);
    return response.data;
  },

  getBadges: async (musicianId: number): Promise<MusicianBadge[]> => {
    const response = await api.get(`/musicians/${musicianId}/badges/`);
    return response.data;
  },

  getStats: async (musicianId: number): Promise<{ total_events: number }> => {
    const response = await api.get(`/musicians/${musicianId}/stats/`);
    return response.data;
  },

  checkConnection: async (musicianId: number): Promise<ConnectionStatusResponse> => {
    const response = await api.get(`/musicians/${musicianId}/connection-status/`);
    return response.data;
  },

  getInstruments: async (): Promise<InstrumentOption[]> => {
    const response = await api.get('/musicians/instruments/');
    return response.data;
  },

  uploadAvatar: async (file: File): Promise<{ avatar: string }> => {
    const formData = new FormData();
    formData.append('avatar', file);
    const response = await uploadApi.post('/musicians/upload-avatar/', formData);
    return response.data;
  },

  uploadCover: async (file: File): Promise<{ cover_image: string }> => {
    const formData = new FormData();
    formData.append('cover_image', file);
    const response = await uploadApi.post('/musicians/upload-cover/', formData);
    return response.data;
  },

  updateAvatar: async (avatarUrl: string): Promise<{ detail: string; avatar_url: string }> => {
    const response = await api.patch('/musicians/avatar/', { avatar_url: avatarUrl });
    return response.data;
  },

  getPublicCalendar: async (
    musicianId: number,
    params?: {
      days_ahead?: number;
      include_private?: boolean;
    }
  ): Promise<PublicCalendarResponse> => {
    const response = await api.get(`/musicians/${musicianId}/public_calendar/`, { params });
    return response.data;
  },
};
