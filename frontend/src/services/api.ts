// services/api.ts
import axios, { AxiosError } from 'axios';
import toast from 'react-hot-toast';
import type {
  LoginCredentials,
  Musician,
  Event,
  EventCreate,
  Availability,
  AvailabilityResponse,
  LeaderAvailability,
  LeaderAvailabilityCreate,
  AvailableMusician,
  MarketplaceGig,
  MarketplaceApplication,
  GigStatus,
  MusicianRating,
  RatingInput,
  Connection,
  MusicianBadge,
  MusicianUpdatePayload,
} from '../types';

export type PaginatedResponse<T> = {
  results: T[];
  count: number;
  next: string | null;
  previous: string | null;
};

export type ProfileConnection = {
  id: number;
  full_name: string;
  instrument?: string | null;
  avatar?: string | null;
};

export type ConnectionsResponse = {
  total: number;
  connections: ProfileConnection[];
  limit?: number;
  type?: string | null;
};

const dedupeById = <T extends { id: number }>(items: T[]): T[] => {
  const seen = new Set<number>();
  const out: T[] = [];
  for (const item of items) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    out.push(item);
  }
  return out;
};

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

// Instância dedicada para uploads (sem Content-Type fixo)
export const uploadApi = axios.create({
  baseURL: API_URL,
  withCredentials: true,
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

    // Endpoints públicos (não autenticados) não devem redirecionar para login
    const publicAuthPaths = [
      '/register/',
      '/check-email/',
      '/verify-email/',
      '/registration-status/',
      '/process-payment/',
      '/resend-verification/',
      '/start-trial/',
      '/password-reset/',
      '/password-reset-confirm/',
    ];

    const isPublicAuthPath = originalRequest?.url
      ? publicAuthPaths.some((path) => originalRequest.url?.includes(path))
      : false;

    const publicRoutes = [
      '/login',
      '/cadastro',
      '/verificar-email',
      '/esqueci-senha',
      '/redefinir-senha',
      '/pagamento',
      '/planos',
      '/planos/sucesso',
    ];
    const isOnPublicRoute = publicRoutes.some((route) => window.location.pathname.startsWith(route));

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      if (isPublicAuthPath) {
        return Promise.reject(error);
      }

      originalRequest._retry = true;
      try {
        await refreshAuthToken();
        return api(originalRequest);
      } catch (refreshError) {
        const isUserProfileCall = originalRequest.url?.includes('/musicians/me/');

        // Em rotas públicas, não redirecionamos para login (ex: verificação de email)
        if (!isPublicAuthPath && !isOnPublicRoute && !isUserProfileCall && window.location.pathname !== '/login') {
          toast.error('Sessão expirada. Faça login novamente.');
          setTimeout(() => {
            window.location.href = '/login';
          }, 1500);
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

  requestPasswordReset: async (email: string): Promise<{ message: string }> => {
    const response = await api.post('/password-reset/', { email });
    return response.data;
  },

  confirmPasswordReset: async (payload: {
    uid: string;
    token: string;
    new_password: string;
  }): Promise<{ message: string }> => {
    const response = await api.post('/password-reset-confirm/', payload);
    return response.data;
  },
};

// Tipos para instrumentos
export interface InstrumentOption {
  value: string;
  label: string;
  count: number;
}

// Musician Service
export const musicianService = {
  getAll: async (): Promise<Musician[]> => {
    const response = await api.get('/musicians/');
    // Backend retorna objeto paginado: { count, next, previous, results }
    return response.data.results || response.data;
  },

  getAllPaginated: async (params?: { search?: string; instrument?: string; page?: number; page_size?: number }): Promise<PaginatedResponse<Musician>> => {
    const response = await api.get('/musicians/', { params });
    const data = response.data;
    if (Array.isArray(data)) {
      return {
        results: data,
        count: data.length,
        next: null,
        previous: null,
      };
    }
    return {
      results: data.results || [],
      count: data.count ?? (data.results ? data.results.length : 0),
      next: data.next ?? null,
      previous: data.previous ?? null,
    };
  },

  getMe: async (): Promise<Musician> => {
    const response = await api.get('/musicians/me/');
    return response.data;
  },

  updateMe: async (payload: Partial<MusicianUpdatePayload>): Promise<Musician> => {
    const response = await api.patch('/musicians/me/', payload);
    return response.data;
  },

  uploadAvatar: async (file: File): Promise<{ avatar: string }> => {
    const formData = new FormData();
    formData.append('avatar', file);
    const response = await uploadApi.post('/musicians/upload-avatar/', formData);
    return response.data;
  },

  uploadCover: async (file: File): Promise<{ cover_image: string }> => {
    const formData = new FormData();
    formData.append('cover_image', file);
    const response = await uploadApi.post('/musicians/upload-cover/', formData);
    return response.data;
  },

  getById: async (id: number): Promise<Musician> => {
    const response = await api.get(`/musicians/${id}/`);
    return response.data;
  },

  getInstruments: async (): Promise<InstrumentOption[]> => {
    const response = await api.get('/musicians/instruments/');
    return response.data;
  },

  getWithAvailability: async (params?: { instrument?: string }): Promise<Musician[]> => {
    const response = await api.get('/musicians/with_availability/', { params });
    return response.data;
  },

  getConnections: async (
    musicianId: number,
    opts?: { type?: string; limit?: number }
  ): Promise<ConnectionsResponse> => {
    const type = opts?.type ?? 'follow';
    const limit = opts?.limit ?? 6;
    const response = await api.get<ConnectionsResponse>(`/musicians/${musicianId}/connections/`, {
      params: { type, limit },
    });
    const unique = dedupeById(response.data.connections || []);
    return {
      ...response.data,
      connections: unique,
      limit: response.data.limit ?? limit,
      type: response.data.type ?? type,
    };
  },

  getReviews: async (musicianId: number): Promise<Array<{ id: number; rated_by_name: string; rated_by_avatar: string | null; rating: number; comment: string; time_ago: string }>> => {
    const response = await api.get(`/musicians/${musicianId}/reviews/`);
    return response.data;
  },

  getBadges: async (musicianId: number): Promise<MusicianBadge[]> => {
    const response = await api.get(`/musicians/${musicianId}/badges/`);
    return response.data;
  },

  getStats: async (musicianId: number): Promise<{ total_events: number; events_as_leader: number; events_as_member: number }> => {
    const response = await api.get(`/musicians/${musicianId}/stats/`);
    return response.data;
  },

  checkConnection: async (musicianId: number): Promise<{ is_connected: boolean; connection_id: number | null; connection_type: string | null }> => {
    const response = await api.get(`/musicians/${musicianId}/connection-status/`);
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

  getAllPaginated: async (params?: {
    status?: string;
    my_proposals?: boolean;
    pending_approval?: boolean;
    search?: string;
    past?: boolean;
    upcoming?: boolean;
    page?: number;
    page_size?: number;
  }): Promise<PaginatedResponse<Event>> => {
    const response = await api.get('/events/', { params });
    const data = response.data;
    if (Array.isArray(data)) {
      return {
        results: data,
        count: data.length,
        next: null,
        previous: null,
      };
    }
    return {
      results: data.results || [],
      count: data.count ?? (data.results ? data.results.length : 0),
      next: data.next ?? null,
      previous: data.previous ?? null,
    };
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

  canRate: async (id: number): Promise<{ can_rate: boolean; reason: string }> => {
    const response = await api.get(`/events/${id}/can_rate/`);
    return response.data;
  },

  submitRatings: async (id: number, ratings: RatingInput[]): Promise<MusicianRating[]> => {
    const response = await api.post(`/events/${id}/submit_ratings/`, { ratings });
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

// Availability Service
export const leaderAvailabilityService = {
  getAll: async (params?: {
    upcoming?: boolean;
    past?: boolean;
    date?: string;
    leader?: number;
    search?: string;
    public?: boolean;
    mine?: boolean;
    instrument?: string;
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

  getAvailableMusicians: async (params: { date: string; instrument?: string }): Promise<AvailableMusician[]> => {
    const response = await api.get('/leader-availabilities/available_musicians/', { params });
    return response.data;
  },
};

// Connections Service
export const connectionService = {
  getAll: async (params?: { type?: string; all?: boolean; page?: number; page_size?: number }): Promise<Connection[]> => {
    const response = await api.get('/connections/', { params });
    return response.data.results || response.data;
  },

  getAllPaginated: async (params?: { type?: string; page?: number; page_size?: number }): Promise<PaginatedResponse<Connection>> => {
    const response = await api.get('/connections/', { params });
    const data = response.data;
    if (Array.isArray(data)) {
      return {
        results: data,
        count: data.length,
        next: null,
        previous: null,
      };
    }
    return {
      results: data.results || [],
      count: data.count ?? (data.results ? data.results.length : 0),
      next: data.next ?? null,
      previous: data.previous ?? null,
    };
  },

  create: async (payload: { target_id: number; connection_type: string; notes?: string }): Promise<Connection> => {
    const response = await api.post('/connections/', payload);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/connections/${id}/`);
  },
};

// Badges Service
export interface BadgeProgress {
  slug: string;
  name: string;
  description: string;
  icon: string;
  current: number;
  required: number;
  percentage: number;
  extra_condition?: string;
}

export interface BadgeProgressResponse {
  earned: Array<{
    id: number;
    slug: string;
    name: string;
    description: string;
    icon: string;
    awarded_at: string;
  }>;
  available: BadgeProgress[];
}

export const badgeService = {
  getMine: async (): Promise<MusicianBadge[]> => {
    const response = await api.get('/badges/');
    // Compatibilidade: se retornar nova estrutura, extrai apenas earned
    if (response.data.earned) {
      return response.data.earned;
    }
    return response.data;
  },
  getProgress: async (): Promise<BadgeProgressResponse> => {
    const response = await api.get('/badges/');
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

  updateGig: async (gigId: number, data: Partial<MarketplaceGig>): Promise<MarketplaceGig> => {
    const response = await api.patch(`/marketplace/gigs/${gigId}/`, data);
    return response.data;
  },

  deleteGig: async (gigId: number): Promise<void> => {
    await api.delete(`/marketplace/gigs/${gigId}/`);
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
    return response.data.results || response.data;
  },
};

// Registration Types
export interface RegisterData {
  email: string;
  username: string;
  password: string;
  first_name: string;
  last_name?: string;
  phone?: string;
  instagram?: string;
  whatsapp?: string;
  instrument?: string;
  instruments?: string[];
  bio?: string;
  city?: string;
  state?: string;
}

export interface RegistrationStatus {
  status: string;
  status_display: string;
  email: string;
  first_name: string;
  email_verified: boolean;
  payment_completed: boolean;
  is_expired: boolean;
  payment_token?: string;
}

export interface CheckEmailResponse {
  available: boolean;
  reason?: 'already_registered' | 'pending_verification';
}

export interface PaymentData {
  payment_token: string;
  card_number: string;
  card_holder: string;
  card_expiry: string;
  card_cvv: string;
}

// Registration Service (público - não requer autenticação)
export const registrationService = {
  register: async (data: RegisterData): Promise<{ message: string; email: string }> => {
    const response = await api.post('/register/', data);
    return response.data;
  },

  checkEmail: async (email: string): Promise<CheckEmailResponse> => {
    const response = await api.get('/check-email/', { params: { email } });
    return response.data;
  },

  verifyEmail: async (token: string): Promise<{
    message: string;
    status: string;
    payment_token?: string;
    email?: string;
    first_name?: string;
  }> => {
    const response = await api.post('/verify-email/', { token });
    return response.data;
  },

  getStatus: async (token: string): Promise<RegistrationStatus> => {
    const response = await api.get('/registration-status/', { params: { token } });
    return response.data;
  },

  processPayment: async (data: PaymentData): Promise<{
    message: string;
    username: string;
    email: string;
  }> => {
    const response = await api.post('/process-payment/', data);
    return response.data;
  },

  resendVerification: async (email: string): Promise<{ message: string }> => {
    const response = await api.post('/resend-verification/', { email });
    return response.data;
  },

  startTrial: async (paymentToken: string): Promise<{
    message: string;
    username: string;
    email: string;
    trial_days: number;
  }> => {
    const response = await api.post('/start-trial/', { payment_token: paymentToken });
    return response.data;
  },
};

// Payment Service Types (microserviço de pagamento)
const PAYMENT_SERVICE_URL = import.meta.env.VITE_PAYMENT_SERVICE_URL || 'http://localhost:3001/api';

export interface CheckoutSessionRequest {
  payment_token: string;
  plan: 'monthly' | 'annual';
  success_url: string;
  cancel_url: string;
  payment_method?: 'card' | 'pix';
}

export interface CheckoutSessionResponse {
  session_id: string;
  checkout_url: string;
}

export interface SessionStatusResponse {
  status: string;
  payment_status: string;
  customer_email: string;
  subscription_id: string | null;
}

export interface UpgradeCheckoutRequest {
  plan: 'monthly' | 'annual';
  success_url: string;
  cancel_url: string;
  payment_method?: 'card' | 'pix';
}

export interface UpgradeCheckoutResponse {
  session_id: string;
  checkout_url: string;
}

// Payment Service (comunicação com microserviço Node.js)
export const paymentService = {
  createCheckoutSession: async (data: CheckoutSessionRequest): Promise<CheckoutSessionResponse> => {
    const response = await fetch(`${PAYMENT_SERVICE_URL}/checkout/create-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw { response: { data: error } };
    }

    return response.json();
  },

  getSessionStatus: async (sessionId: string): Promise<SessionStatusResponse> => {
    const response = await fetch(`${PAYMENT_SERVICE_URL}/checkout/session/${sessionId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw { response: { data: error } };
    }

    return response.json();
  },
};

// Billing (backend autenticado)
export const billingService = {
  createUpgradeSession: async (data: UpgradeCheckoutRequest): Promise<UpgradeCheckoutResponse> => {
    const response = await api.post('/subscription-checkout/', data);
    return response.data;
  },
  activateFakeSubscription: async (data: { plan: 'monthly' | 'annual' }): Promise<{ success: boolean }> => {
    const response = await api.post('/subscription-activate-fake/', data);
    return response.data;
  },
};

// Notification Types
export interface NotificationChannel {
  id: string;
  name: string;
  available: boolean;
  connected: boolean;
  configured: boolean;
}

export interface NotificationPreference {
  preferred_channel: string;
  fallback_to_email: boolean;
  telegram_chat_id: string | null;
  telegram_verified: boolean;
  telegram_connected: boolean;
  whatsapp_number: string | null;
  whatsapp_verified: boolean;
  whatsapp_connected: boolean;
  notify_event_invites: boolean;
  notify_event_reminders: boolean;
  notify_event_confirmations: boolean;
  notify_availability_responses: boolean;
  available_channels: NotificationChannel[];
  updated_at: string;
}

export interface TelegramConnectResponse {
  code: string;
  bot_username: string;
  expires_in_minutes: number;
  instructions: string;
}

export interface TelegramStatus {
  connected: boolean;
}

// Notification Service
export const notificationService = {
  getPreferences: async (): Promise<NotificationPreference> => {
    const response = await api.get('/notifications/preferences/');
    return response.data;
  },

  updatePreferences: async (data: Partial<NotificationPreference>): Promise<NotificationPreference> => {
    const response = await api.put('/notifications/preferences/', data);
    return response.data;
  },

  telegramConnect: async (): Promise<TelegramConnectResponse> => {
    const response = await api.post('/notifications/telegram/connect/');
    return response.data;
  },

  telegramDisconnect: async (): Promise<{ success: boolean; message: string }> => {
    const response = await api.post('/notifications/telegram/disconnect/');
    return response.data;
  },

  telegramStatus: async (): Promise<TelegramStatus> => {
    const response = await api.get('/notifications/telegram/status/');
    return response.data;
  },

  testNotification: async (channel?: string): Promise<{ success: boolean; error?: string }> => {
    const response = await api.post('/notifications/test/', { channel });
    return response.data;
  },
};

export default api;
