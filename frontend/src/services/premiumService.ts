// services/premiumService.ts
import { api } from './api';
import type { PortalItem } from '../types';

export const premiumService = {
  getPortal: (params?: { category?: string }): Promise<PortalItem[]> =>
    api.get<PortalItem[]>('/premium/portal/', { params }).then(r => r.data),
};
