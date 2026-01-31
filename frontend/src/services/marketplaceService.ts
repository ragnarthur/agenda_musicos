// services/marketplaceService.ts
import { api } from './api';
import type { MarketplaceGig, MarketplaceApplication } from '../types';

export const marketplaceService = {
  getGigs: async (params?: { status?: string; mine?: boolean }): Promise<MarketplaceGig[]> => {
    const response = await api.get('/marketplace/gigs/', { params });
    return response.data;
  },

  getMyApplications: async (): Promise<MarketplaceApplication[]> => {
    const response = await api.get('/marketplace/applications/');
    return response.data;
  },

  createGig: async (payload: Partial<MarketplaceGig>): Promise<MarketplaceGig> => {
    const response = await api.post('/marketplace/gigs/', payload);
    return response.data;
  },

  updateGig: async (id: number, payload: Partial<MarketplaceGig>): Promise<MarketplaceGig> => {
    const response = await api.put(`/marketplace/gigs/${id}/`, payload);
    return response.data;
  },

  deleteGig: async (id: number): Promise<void> => {
    await api.delete(`/marketplace/gigs/${id}/`);
  },

  applyToGig: async (
    gigId: number,
    payload: { cover_letter?: string; expected_fee?: string | number | null }
  ): Promise<MarketplaceApplication> => {
    const response = await api.post(`/marketplace/gigs/${gigId}/apply/`, payload);
    return response.data;
  },
};
