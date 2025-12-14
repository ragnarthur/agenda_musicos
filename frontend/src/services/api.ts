// services/api.ts
import axios, { AxiosError } from 'axios';
import type {
  LoginCredentials,
  Musician,
  Event,
  EventCreate,
  Availability,
  AvailabilityResponse,
  LeaderAvailability,
  LeaderAvailabilityCreate,
  MarketplaceGig,
  MarketplaceApplication,
  GigStatus,
} from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

// Instância global com cookies seguros
export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

let refreshingPromise: Promise<void> | null = null;

const refreshAuthToken = async (): Promise<void> => {
  if (!refreshingPromise) {
    refreshingPromise = axios
      .post(`${API_URL}/token/refresh/`, {}, { withCredentials: true })
      .then(() => {
        refreshingPromise = null;
      })
      .catch((error) => {
        refreshingPromise = null;
        throw error;
      });
  }
  return refreshingPromise;
};

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as typeof error.config & { _retry?: boolean };

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        await refreshAuthToken();
        return api(originalRequest);
      } catch (refreshError) {
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// Auth Service
export const authService = {
  login: async (credentials: LoginCredentials): Promise<void> => {
    await api.post('/token/', credentials);
  },

  logout: async (): Promise<void> => {
    await api.post('/token/logout/');
  },
};

// Musician Service
export const musicianService = {
  getAll: async (): Promise<Musician[]> => {
    const response = await api.get('/musicians/');
    // Backend retorna objeto paginado: { count, next, previous, results }
    return response.data.results || response.data;
  },

  getMe: async (): Promise<Musician> => {
    const response = await api.get('/musicians/me/');
    return response.data;
  },

  getById: async (id: number): Promise<Musician> => {
    const response = await api.get(`/musicians/${id}/`);
    return response.data;
  },
};

// Event Service
export const eventService = {
  getAll: async (params?: {
    status?: string;
    my_proposals?: boolean;
    pending_approval?: boolean;
    search?: string;
    past?: boolean;
    upcoming?: boolean;
  }): Promise<Event[]> => {
    const response = await api.get('/events/', { params });
    // Backend retorna objeto paginado: { count, next, previous, results }
    return response.data.results || response.data;
  },

  getById: async (id: number): Promise<Event> => {
    const response = await api.get(`/events/${id}/`);
    return response.data;
  },

  create: async (event: EventCreate): Promise<Event> => {
    const response = await api.post('/events/', event);
    return response.data;
  },

  update: async (id: number, event: Partial<EventCreate>): Promise<Event> => {
    const response = await api.put(`/events/${id}/`, event);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/events/${id}/`);
  },

  approve: async (id: number): Promise<Event> => {
    const response = await api.post(`/events/${id}/approve/`);
    return response.data;
  },

  reject: async (id: number, reason: string): Promise<Event> => {
    const response = await api.post(`/events/${id}/reject/`, { reason });
    return response.data;
  },

  cancel: async (id: number): Promise<Event> => {
    const response = await api.post(`/events/${id}/cancel/`);
    return response.data;
  },

  setAvailability: async (
    id: number,
    response: AvailabilityResponse,
    notes?: string
  ): Promise<Availability> => {
    const payload = { response, notes };
    const result = await api.post(`/events/${id}/set_availability/`, payload);
    return result.data;
  },

  getMyEvents: async (): Promise<Event[]> => {
    const response = await api.get('/events/my_events/');
    return response.data;
  },

  getPendingMyResponse: async (): Promise<Event[]> => {
    const response = await api.get('/events/pending_my_response/');
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
};

// Availability Service
export const availabilityService = {
  getAll: async (params?: {
    response?: AvailabilityResponse;
    event_status?: string;
  }): Promise<Availability[]> => {
    const response = await api.get('/availabilities/', { params });
    return response.data;
  },

  getById: async (id: number): Promise<Availability> => {
    const response = await api.get(`/availabilities/${id}/`);
    return response.data;
  },

  update: async (id: number, data: {
    response: AvailabilityResponse;
    notes?: string;
  }): Promise<Availability> => {
    const response = await api.put(`/availabilities/${id}/`, data);
    return response.data;
  },
};

// Leader Availability Service
export const leaderAvailabilityService = {
  getAll: async (params?: {
    upcoming?: boolean;
    past?: boolean;
    date?: string;
    leader?: number;
  }): Promise<LeaderAvailability[]> => {
    const response = await api.get('/leader-availabilities/', { params });
    return response.data.results || response.data;
  },

  getById: async (id: number): Promise<LeaderAvailability> => {
    const response = await api.get(`/leader-availabilities/${id}/`);
    return response.data;
  },

  create: async (data: LeaderAvailabilityCreate): Promise<LeaderAvailability> => {
    const response = await api.post('/leader-availabilities/', data);
    return response.data;
  },

  update: async (id: number, data: Partial<LeaderAvailabilityCreate>): Promise<LeaderAvailability> => {
    const response = await api.put(`/leader-availabilities/${id}/`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/leader-availabilities/${id}/`);
  },

  getConflictingEvents: async (id: number): Promise<Event[]> => {
    const response = await api.get(`/leader-availabilities/${id}/conflicting_events/`);
    return response.data;
  },
};

// Marketplace Service
export const marketplaceService = {
  getGigs: async (params?: { status?: GigStatus; mine?: boolean }): Promise<MarketplaceGig[]> => {
    const response = await api.get('/marketplace/gigs/', { params });
    return response.data.results || response.data;
  },

  createGig: async (data: Partial<MarketplaceGig>): Promise<MarketplaceGig> => {
    const response = await api.post('/marketplace/gigs/', data);
    return response.data;
  },

  applyToGig: async (
    gigId: number,
    payload: { cover_letter?: string; expected_fee?: string | number }
  ): Promise<MarketplaceApplication> => {
    const response = await api.post(`/marketplace/gigs/${gigId}/apply/`, payload);
    return response.data;
  },

  getGigApplications: async (gigId: number): Promise<MarketplaceApplication[]> => {
    const response = await api.get(`/marketplace/gigs/${gigId}/applications/`);
    return response.data;
  },

  hireApplication: async (gigId: number, applicationId: number): Promise<MarketplaceGig> => {
    const response = await api.post(`/marketplace/gigs/${gigId}/hire/`, { application_id: applicationId });
    return response.data;
  },

  closeGig: async (gigId: number, status: 'closed' | 'cancelled' = 'closed'): Promise<MarketplaceGig> => {
    const response = await api.post(`/marketplace/gigs/${gigId}/close/`, { status });
    return response.data;
  },

  getMyApplications: async (): Promise<MarketplaceApplication[]> => {
    const response = await api.get('/marketplace/applications/');
    return response.data;
  },
};

export default api;
