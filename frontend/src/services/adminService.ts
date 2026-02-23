// services/adminService.ts - Serviços administrativos
import { api } from './api';

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
  musician_is_premium?: boolean;
}

export type UsersListResponse = AdminMeResponse[];

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

  togglePremium: async (id: number): Promise<{ is_premium: boolean; musician_id: number }> => {
    const response = await api.patch(`/admin/users/${id}/toggle-premium/`);
    return response.data;
  },
};
