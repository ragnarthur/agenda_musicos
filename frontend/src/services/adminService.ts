// services/adminService.ts - Serviços administrativos
import { api } from './api';
import type { PortalItem } from '../types';

export interface AdminMeResponse {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  is_staff: boolean;
  is_superuser: boolean;
  is_active: boolean;
  date_joined: string;
  has_musician_profile?: boolean;
  musician_is_premium?: boolean;
}

export type UsersListResponse = AdminMeResponse[];

export interface CulturalNoticeAdmin {
  id: number;
  title: string;
  summary: string | null;
  category: PortalItem['category'];
  state: string;
  city: string | null;
  source_name: string | null;
  source_url: string | null;
  deadline_at: string | null;
  event_date: string | null;
  published_at: string;
  is_active: boolean;
  created_by: number | null;
  created_at: string;
  updated_at: string;
}

export interface CulturalNoticeSuggestion extends PortalItem {
  already_published: boolean;
  matched_notice_id: number | null;
  source_label: string;
}

export interface CulturalNoticeSuggestionsResponse {
  state: string;
  city: string | null;
  category: PortalItem['category'] | null;
  total: number;
  items: CulturalNoticeSuggestion[];
}

export interface CulturalNoticeImportResponse {
  created: number;
  updated: number;
  skipped: number;
  items: CulturalNoticeAdmin[];
  skipped_items: Array<{ title?: string; reason: string }>;
}

export interface CulturalNoticePayload {
  title: string;
  summary?: string | null;
  category: PortalItem['category'];
  state: string;
  city?: string | null;
  source_name?: string | null;
  source_url?: string | null;
  deadline_at?: string | null;
  event_date?: string | null;
  published_at?: string;
  is_active?: boolean;
}

export const adminService = {
  getMe: async (): Promise<AdminMeResponse> => {
    const response = await api.get('/admin/me/');
    return response.data;
  },

  listUsers: async (): Promise<UsersListResponse> => {
    const response = await api.get('/admin/users/all/');
    return response.data;
  },

  deleteUser: async (id: number): Promise<void> => {
    await api.delete(`/users/${id}/delete/`);
  },

  setPremium: async (
    id: number,
    isPremium: boolean
  ): Promise<{ is_premium: boolean; musician_id: number }> => {
    const response = await api.patch(`/admin/users/${id}/set-premium/`, {
      is_premium: isPremium,
    });
    return response.data;
  },

  listCulturalNotices: async (params?: {
    state?: string;
    city?: string;
    category?: PortalItem['category'];
    is_active?: boolean;
    search?: string;
  }): Promise<CulturalNoticeAdmin[]> => {
    const response = await api.get<CulturalNoticeAdmin[]>('/admin/cultural-notices/', { params });
    return response.data;
  },

  createCulturalNotice: async (payload: CulturalNoticePayload): Promise<CulturalNoticeAdmin> => {
    const response = await api.post<CulturalNoticeAdmin>('/admin/cultural-notices/', payload);
    return response.data;
  },

  updateCulturalNotice: async (
    id: number,
    payload: Partial<CulturalNoticePayload>
  ): Promise<CulturalNoticeAdmin> => {
    const response = await api.patch<CulturalNoticeAdmin>(
      `/admin/cultural-notices/${id}/`,
      payload
    );
    return response.data;
  },

  deleteCulturalNotice: async (id: number): Promise<void> => {
    await api.delete(`/admin/cultural-notices/${id}/`);
  },

  listCulturalNoticeSuggestions: async (params: {
    state: string;
    city?: string;
    category?: PortalItem['category'];
    limit?: number;
  }): Promise<CulturalNoticeSuggestionsResponse> => {
    const response = await api.get<CulturalNoticeSuggestionsResponse>(
      '/admin/cultural-notices/suggestions/',
      { params }
    );
    return response.data;
  },

  importCulturalNoticeSuggestions: async (payload: {
    items: PortalItem[];
    state?: string;
    city?: string;
    activate?: boolean;
  }): Promise<CulturalNoticeImportResponse> => {
    const response = await api.post<CulturalNoticeImportResponse>(
      '/admin/cultural-notices/import-suggestions/',
      payload
    );
    return response.data;
  },
};
