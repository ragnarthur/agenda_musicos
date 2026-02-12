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

  getApplicationChat: async (
    gigId: number,
    applicationId: number
  ): Promise<MarketplaceGigChatMessage[]> => {
    const response = await api.get(
      `/marketplace/gigs/${gigId}/applications/${applicationId}/chat/`
    );
    return response.data;
  },

  sendApplicationChatMessage: async (
    gigId: number,
    applicationId: number,
    message: string
  ): Promise<MarketplaceGigChatMessage> => {
    const response = await api.post(
      `/marketplace/gigs/${gigId}/applications/${applicationId}/chat/`,
      { message }
    );
    return response.data;
  },

  clearApplicationChat: async (
    gigId: number,
    applicationId: number
  ): Promise<void> => {
    await api.delete(
      `/marketplace/gigs/${gigId}/applications/${applicationId}/chat/`
    );
  },

  getUnreadChatCount: async (): Promise<{ count: number }> => {
    const response = await api.get('/marketplace/chat/unread-count/');
    return response.data;
  },
};
