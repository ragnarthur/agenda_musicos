// services/registrationService.ts
import { api } from './api';

export const registrationService = {
  checkEmail: async (
    email: string
  ): Promise<{ available: boolean; reason?: string } > => {
    const response = await api.get('/check-email/', { params: { email } });
    return response.data;
  },
};
