// services/marketplaceService.ts
import { api } from './api';
import type {
  MarketplaceGig,
  MarketplaceApplication,
  MarketplaceGigChatMessage,
} from '../types';

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

  getGigApplications: async (gigId: number): Promise<MarketplaceApplication[]> => {
    const response = await api.get(`/marketplace/gigs/${gigId}/applications/`);
    return response.data;
  },

  hireApplication: async (gigId: number, applicationId: number): Promise<MarketplaceGig> => {
    const response = await api.post(`/marketplace/gigs/${gigId}/hire/`, {
      application_id: applicationId,
    });
    return response.data;
  },

  closeGig: async (
    gigId: number,
    status: 'closed' | 'cancelled' = 'closed'
  ): Promise<MarketplaceGig> => {
    const response = await api.post(`/marketplace/gigs/${gigId}/close/`, { status });
    return response.data;
  },

  getGigChat: async (gigId: number): Promise<MarketplaceGigChatMessage[]> => {
    const response = await api.get(`/marketplace/gigs/${gigId}/chat/`);
    return response.data;
  },

  sendGigChatMessage: async (
    gigId: number,
    message: string
  ): Promise<MarketplaceGigChatMessage> => {
    const response = await api.post(`/marketplace/gigs/${gigId}/chat/`, { message });
    return response.data;
  },

  clearGigChat: async (gigId: number): Promise<void> => {
    await api.delete(`/marketplace/gigs/${gigId}/chat/`);
  },
};
