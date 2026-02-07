// services/eventService.ts
import { api } from './api';
import type { Event, EventCreate, RatingInput } from '../types';
import type { PaginatedResponse } from './types';

export interface EventListParams {
  status?: string;
  my_proposals?: boolean;
  pending_approval?: boolean;
  pending_responses?: boolean;
  search?: string;
  past?: boolean;
  upcoming?: boolean;
  days_back?: number;
  page?: number;
  page_size?: number;
}

export const eventService = {
  getAllPaginated: async (params?: EventListParams): Promise<PaginatedResponse<Event>> => {
    const response = await api.get('/events/', { params });
    return response.data;
  },

  getById: async (id: number): Promise<Event> => {
    const response = await api.get(`/events/${id}/`);
    return response.data;
  },

  create: async (payload: EventCreate): Promise<Event> => {
    const response = await api.post('/events/', payload);
    return response.data;
  },

  update: async (id: number, payload: EventCreate): Promise<Event> => {
    const response = await api.put(`/events/${id}/`, payload);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/events/${id}/`);
  },

  cancel: async (id: number): Promise<Event> => {
    const response = await api.post(`/events/${id}/cancel/`);
    return response.data;
  },

  previewConflicts: async (payload: {
    event_date: string;
    start_time: string;
    end_time: string;
  }): Promise<{
    has_conflicts: boolean;
    count: number;
    buffer_minutes: number;
    conflicts: Event[];
  }> => {
    const response = await api.post('/events/preview_conflicts/', payload);
    return response.data;
  },

  setAvailability: async (
    id: number,
    responseValue: 'pending' | 'available' | 'unavailable' | 'maybe',
    notes?: string
  ): Promise<Event> => {
    const response = await api.post(`/events/${id}/set_availability/`, {
      response: responseValue,
      notes,
    });
    return response.data;
  },

  getPendingMyResponse: async (): Promise<Event[]> => {
    const response = await api.get('/events/pending_my_response/');
    return response.data;
  },

  submitRatings: async (
    id: number,
    ratings: RatingInput[]
  ): Promise<{ detail?: string; can_rate?: boolean }> => {
    const response = await api.post(`/events/${id}/submit_ratings/`, { ratings });
    return response.data;
  },
};
