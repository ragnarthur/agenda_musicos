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
}

export const adminService = {
  getMe: async (): Promise<AdminMeResponse> => {
    const response = await api.get('/admin/me/');
    return response.data;
  },
};
