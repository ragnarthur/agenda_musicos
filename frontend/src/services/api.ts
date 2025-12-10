// services/api.ts
import axios from 'axios';
import type { AuthTokens, LoginCredentials, Musician, Event, EventCreate, Availability, AvailabilityResponse, LeaderAvailability, LeaderAvailabilityCreate } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

// Criar instância do axios
export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para adicionar token nas requisições
api.interceptors.request.use(
  (config) => {
    const tokensStr = localStorage.getItem('tokens');
    if (tokensStr) {
      const tokens: AuthTokens = JSON.parse(tokensStr);
      config.headers.Authorization = `Bearer ${tokens.access}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor para refresh token
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const tokensStr = localStorage.getItem('tokens');
        if (tokensStr) {
          const tokens: AuthTokens = JSON.parse(tokensStr);
          const response = await axios.post(`${API_URL}/token/refresh/`, {
            refresh: tokens.refresh,
          });

          const newTokens: AuthTokens = response.data;
          localStorage.setItem('tokens', JSON.stringify(newTokens));

          originalRequest.headers.Authorization = `Bearer ${newTokens.access}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        localStorage.removeItem('tokens');
        localStorage.removeItem('user');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// Auth Service
export const authService = {
  login: async (credentials: LoginCredentials): Promise<AuthTokens> => {
    const response = await axios.post(`${API_URL}/token/`, credentials);
    return response.data;
  },

  refreshToken: async (refreshToken: string): Promise<AuthTokens> => {
    const response = await axios.post(`${API_URL}/token/refresh/`, {
      refresh: refreshToken,
    });
    return response.data;
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

export default api;
