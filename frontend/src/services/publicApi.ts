// services/publicApi.ts
// Serviços públicos e de contratantes
import { api } from './api';

// =============================================================================
// Types
// =============================================================================

export interface MusicianRequest {
  id: number;
  email: string;
  full_name: string;
  phone: string;
  instrument: string;
  instruments: string[];
  musical_genres: string[];
  bio: string | null;
  city: string;
  state: string;
  instagram: string | null;
  status: 'pending' | 'approved' | 'rejected';
  status_display: string;
  admin_notes: string | null;
  reviewed_by: number | null;
  reviewed_by_name: string | null;
  reviewed_at: string | null;
  invite_token?: string;
  invite_expires_at?: string;
  invite_used?: boolean;
  created_at: string;
  updated_at: string;
}

export interface MusicianRequestCreate {
  email: string;
  full_name: string;
  phone: string;
  instrument: string;
  instruments?: string[];
  musical_genres?: string[];
  bio?: string;
  city: string;
  state: string;
  instagram?: string;
}

export interface ContractorProfile {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  city: string | null;
  state: string | null;
  accepted_terms_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface QuoteRequest {
  id: number;
  contractor: number;
  contractor_name: string;
  musician: number;
  musician_name: string;
  event_date: string;
  event_type: string;
  location_city: string;
  location_state: string;
  venue_name: string | null;
  duration_hours: number | null;
  notes: string | null;
  status:
    | 'pending'
    | 'responded'
    | 'reservation_requested'
    | 'reserved'
    | 'confirmed'
    | 'completed'
    | 'cancelled'
    | 'declined';
  status_display: string;
  created_at: string;
  updated_at: string;
}

export interface QuoteRequestCreate {
  musician: number;
  event_date: string;
  event_type: string;
  location_city: string;
  location_state: string;
  venue_name?: string;
  duration_hours?: number;
  notes?: string;
}

export interface QuoteProposal {
  id: number;
  request: number;
  message: string;
  proposed_value: string | null;
  valid_until: string | null;
  status: 'sent' | 'accepted' | 'declined' | 'expired';
  status_display: string;
  created_at: string;
}

export interface Booking {
  id: number;
  request: number;
  status: 'reserved' | 'confirmed' | 'completed' | 'cancelled';
  status_display: string;
  reserved_at: string;
  confirmed_at: string | null;
  completed_at: string | null;
  cancel_reason: string | null;
}

export interface BookingEvent {
  id: number;
  request: number;
  actor_type: 'contractor' | 'musician' | 'system' | 'admin';
  actor_user: number | null;
  actor_name: string | null;
  action: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface BookingStatistics {
  global: {
    total_requests: number;
    pending_requests: number;
    total_bookings: number;
    confirmed_bookings: number;
    completed_bookings: number;
    cancelled_bookings: number;
    conversion_rate: number;
  };
  last_30_days: {
    requests: number;
    bookings: number;
  };
  top_musicians: Array<{
    request__musician: number;
    request__musician__user__first_name: string;
    request__musician__user__last_name: string;
    booking_count: number;
  }>;
  top_cities: Array<{
    location_city: string;
    location_state: string;
    request_count: number;
  }>;
}

export interface Organization {
  id: number;
  name: string;
  org_type: 'band' | 'company' | 'venue';
  description: string | null;
  logo: string | null;
  logo_url: string | null;
  website: string | null;
  phone: string | null;
  contact_email: string | null;
  contact_name: string | null;
  city: string | null;
  state: string | null;
  is_sponsor: boolean;
  sponsor_tier: 'bronze' | 'silver' | 'gold' | null;
  owner: number | null;
  owner_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface MusicianPublic {
  id: number;
  full_name: string;
  instrument: string;
  instruments: string[];
  musical_genres: string[];
  bio: string | null;
  city: string | null;
  state: string | null;
  avatar_url: string | null;
  cover_image_url: string | null;
  average_rating: number;
  total_ratings: number;
}

export interface MusicianContact {
  whatsapp: string | null;
  phone: string | null;
  instagram: string | null;
}

export interface ContractorRegisterData {
  name: string;
  email: string;
  password: string;
  phone?: string;
  city: string;
  state: string;
}

export interface InviteValidation {
  valid: boolean;
  email: string;
  full_name: string;
  phone: string;
  instrument: string;
  instruments: string[];
  bio: string | null;
  city: string;
  state: string;
  instagram: string | null;
}

export interface ContractorDashboard {
  contractor: ContractorProfile;
  stats: {
    total_sent: number;
    pending: number;
    responded: number;
    reserved: number;
  };
}

// =============================================================================
// Admin - City Management Types
// =============================================================================

export type CityStatus = 'partner' | 'expansion' | 'planning';

export interface City {
  id: number;
  name: string;
  state: string;
  slug?: string;
  status: CityStatus;
  status_display: string;
  description?: string | null;
  is_active?: boolean;
  priority: number;
  musicians_count: number;
  requests_count: number;
  pending_requests_count?: number;
  created_by?: number;
  created_by_name?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface CityCreate {
  name: string;
  state: string;
  status: CityStatus;
  description?: string | null;
  is_active?: boolean;
  priority?: number;
}

export interface CityStats {
  city: string;
  state: string;
  total_requests: number;
  pending_requests: number;
  approved_requests: number;
  rejected_requests: number;
  active_musicians: number;
  city_obj?: {
    id: number;
    status: CityStatus;
    status_display: string;
    is_active: boolean;
  } | null;
}

export interface DashboardStatsExtended {
  requests: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
  };
  musicians: {
    total: number;
  };
  cities: {
    partner: number;
    expansion: number;
    planning: number;
  };
  top_cities: Array<{
    city: string;
    state: string;
    total: number;
    pending: number;
  }>;
}

export interface CityRequestsDetail {
  city: string;
  state: string;
  city_info: City | null;
  requests: MusicianRequest[];
}

// =============================================================================
// Musician Request Service (Solicitação de Acesso)
// =============================================================================

export const musicianRequestService = {
  // Público - criar solicitação
  create: async (data: MusicianRequestCreate): Promise<{ message: string; id: number }> => {
    const response = await api.post('/musician-request/', data);
    return response.data;
  },

  // Público - validar token de convite
  validateInvite: async (token: string): Promise<InviteValidation> => {
    const response = await api.get('/validate-invite/', { params: { token } });
    return response.data;
  },

  // Admin - listar solicitações
  list: async (params?: {
    status?: string;
    city?: string;
    state?: string;
  }): Promise<MusicianRequest[]> => {
    const response = await api.get('/admin/musician-requests/', { params });
    return response.data;
  },

  // Admin - detalhe
  get: async (id: number): Promise<MusicianRequest> => {
    const response = await api.get(`/admin/musician-requests/${id}/`);
    return response.data;
  },

  // Admin - aprovar
  approve: async (
    id: number,
    adminNotes?: string
  ): Promise<{ message: string; invite_token: string; invite_expires_at: string }> => {
    const response = await api.post(`/admin/musician-requests/${id}/approve/`, {
      admin_notes: adminNotes,
    });
    return response.data;
  },

  // Admin - reenviar convite
  resendInvite: async (
    id: number
  ): Promise<{ message: string; invite_token: string; invite_expires_at: string | null }> => {
    const response = await api.post(`/admin/musician-requests/${id}/resend/`);
    return response.data;
  },

  // Admin - rejeitar
  reject: async (id: number, adminNotes?: string): Promise<{ message: string }> => {
    const response = await api.post(`/admin/musician-requests/${id}/reject/`, {
      admin_notes: adminNotes,
    });
    return response.data;
  },
};

// =============================================================================
// Quote Request Service (Contratantes)
// =============================================================================

export const quoteRequestService = {
  // Contratante - criar pedido
  create: async (data: QuoteRequestCreate): Promise<QuoteRequest> => {
    const response = await api.post('/quotes/', data);
    return response.data;
  },

  // Músico - listar recebidas
  listReceived: async (status?: string): Promise<QuoteRequest[]> => {
    const response = await api.get('/quotes/musician/', { params: { status } });
    return response.data;
  },

  // Contratante - listar enviadas
  listSent: async (status?: string): Promise<QuoteRequest[]> => {
    const response = await api.get('/quotes/contractor/', { params: { status } });
    return response.data;
  },

  // Detalhe
  get: async (id: number): Promise<QuoteRequest> => {
    const response = await api.get(`/quotes/${id}/`);
    return response.data;
  },

  // Músico - enviar proposta
  sendProposal: async (
    id: number,
    payload: { message: string; proposed_value?: string | number; valid_until?: string }
  ): Promise<QuoteProposal> => {
    const response = await api.post(`/quotes/${id}/proposal/`, payload);
    return response.data;
  },

  // Contratante - aceitar proposta (reserva)
  acceptProposal: async (id: number, proposalId: number): Promise<{
    request: QuoteRequest;
  }> => {
    const response = await api.post(`/quotes/${id}/accept/`, { proposal_id: proposalId });
    return response.data;
  },

  // Músico - confirmar reserva
  confirmBooking: async (id: number): Promise<{ status: string }> => {
    const response = await api.post(`/quotes/${id}/confirm/`);
    return response.data;
  },

  // Músico - contagem de não lidas
  getUnreadCount: async (): Promise<{ count: number }> => {
    const response = await api.get('/messages/unread-count/');
    return response.data;
  },

  // Listar propostas de um pedido
  listProposals: async (requestId: number): Promise<QuoteProposal[]> => {
    const response = await api.get(`/quotes/${requestId}/proposals/`);
    return response.data;
  },

  // Contratante - recusar proposta
  declineProposal: async (requestId: number, proposalId: number): Promise<{ message: string }> => {
    const response = await api.post(`/quotes/${requestId}/proposals/${proposalId}/decline/`);
    return response.data;
  },

  // Contratante - cancelar pedido
  cancelRequest: async (requestId: number): Promise<{ message: string }> => {
    const response = await api.post(`/quotes/${requestId}/cancel/`);
    return response.data;
  },

  // Cancelar reserva (contratante ou músico)
  cancelBooking: async (requestId: number, reason: string): Promise<{ message: string }> => {
    const response = await api.post(`/bookings/${requestId}/cancel/`, { reason });
    return response.data;
  },
};

// =============================================================================
// Public Music Service (Músicos por Cidade)
// =============================================================================

export const publicMusicianService = {
  // Listar músicos por cidade (público)
  listByCity: async (
    city: string,
    state: string,
    instrument?: string
  ): Promise<MusicianPublic[]> => {
    const response = await api.get('/musicians/public-by-city/', {
      params: { city, state, instrument },
    });
    const payload = response.data as
      | { results?: MusicianPublic[] }
      | MusicianPublic[];
    return Array.isArray(payload) ? payload : payload.results ?? [];
  },

  // Obter perfil público de um músico
  getPublicProfile: async (musicianId: number): Promise<MusicianPublic> => {
    const response = await api.get(`/musicians/public/${musicianId}/`);
    return response.data;
  },

  // Listar patrocinadores (público) - city e state são obrigatórios
  listSponsors: async (city: string, state: string): Promise<Organization[]> => {
    const response = await api.get('/organizations/sponsors/', {
      params: { city, state },
    });
    return response.data;
  },

  // Obter calendário público do músico (AllowAny)
  getPublicCalendar: async (
    musicianId: number,
    params?: { days_ahead?: number }
  ): Promise<import('../types').PublicCalendarResponse> => {
    const response = await api.get(`/musicians/${musicianId}/public_calendar/`, { params });
    return response.data;
  },

  // Obter contato do músico (requer login de contratante)
  getContact: async (musicianId: number): Promise<MusicianContact> => {
    const response = await api.get(`/musicians/${musicianId}/contact/`);
    return response.data;
  },
};

// =============================================================================
// All Musicians Service (Catálogo Global)
// =============================================================================

export const allMusiciansService = {
  list: async (params?: {
    city?: string;
    state?: string;
    instrument?: string;
    search?: string;
    min_rating?: string;
    limit?: number;
  }): Promise<MusicianPublic[]> => {
    const response = await api.get('/musicians/all/', { params });
    // Lidar com resposta paginada ou array direto
    const payload = response.data as
      | { results?: MusicianPublic[] }
      | MusicianPublic[];
    return Array.isArray(payload) ? payload : payload.results ?? [];
  },
};

// =============================================================================
// Contractor Service
// =============================================================================

export const contractorService = {
  // Registro de contratante
  register: async (
    data: ContractorRegisterData
  ): Promise<{ detail: string; username: string; email: string }> => {
    const response = await api.post('/register-contractor/', data);
    return response.data;
  },

  // Login de contratante
  login: async (
    email: string,
    password: string
  ): Promise<{
    detail: string;
    access: string;
    refresh: string;
    user_type: string;
    contractor: { id: number; name: string };
  }> => {
    const response = await api.post('/contractor/token/', { email, password });
    return response.data;
  },

  // Dashboard
  getDashboard: async (): Promise<ContractorDashboard> => {
    const response = await api.get('/contractor/dashboard/');
    return response.data;
  },

  // Atualizar perfil
  updateProfile: async (data: Partial<ContractorProfile>): Promise<ContractorProfile> => {
    const response = await api.patch('/contractor/profile/', data);
    return response.data;
  },

  // Refresh token
  refreshToken: async (refreshToken: string): Promise<{ access: string; refresh?: string }> => {
    const response = await api.post('/token/refresh/', { refresh: refreshToken });
    return response.data;
  },
};

// =============================================================================
// Register with Invite Service
// =============================================================================

export const inviteRegisterService = {
  // Registrar com convite
  register: async (data: {
    invite_token: string;
    password: string;
    first_name?: string;
    last_name?: string;
    username?: string;
  }): Promise<{ message: string; username: string; email: string }> => {
    const response = await api.post('/register-with-invite/', data);
    return response.data;
  },
};

// =============================================================================
// Google Auth Service
// =============================================================================

export const googleAuthService = {
  // Autenticar com Google
  authenticate: async (
    credential: string,
    userType: 'musician' | 'contractor' = 'musician'
  ): Promise<{
    new_user: boolean;
    email?: string;
    first_name?: string;
    last_name?: string;
    picture?: string;
    user_type?: string;
    access?: string;
    refresh?: string;
    contractor?: { id: number; name: string };
  }> => {
    const response = await api.post('/auth/google/', { credential, user_type: userType });
    return response.data;
  },

  // Registrar músico via Google
  registerMusician: async (
    credential: string,
    inviteToken: string
  ): Promise<{
    detail: string;
    access: string;
    refresh: string;
    user_type: string;
  }> => {
    const response = await api.post('/auth/google/register-musician/', {
      credential,
      invite_token: inviteToken,
    });
    return response.data;
  },

  // Registro de contratante via Google (a definir)
};

// =============================================================================
// Admin - City Management Service
// =============================================================================

export const cityAdminService = {
  getExtendedStats: async (signal?: AbortSignal): Promise<DashboardStatsExtended> => {
    const response = await api.get('/admin/dashboard-stats-extended/', { signal });
    return response.data;
  },

  getRequestsByCity: async (signal?: AbortSignal): Promise<CityStats[]> => {
    const response = await api.get('/admin/requests-by-city/', { signal });
    return response.data;
  },

  getRequestsByCityDetail: async (city: string, state: string, signal?: AbortSignal): Promise<CityRequestsDetail> => {
    const response = await api.get(
      `/admin/requests-by-city/${encodeURIComponent(city)}/${encodeURIComponent(state)}/`,
      { signal }
    );
    return response.data;
  },

  list: async (params?: { status?: CityStatus }, signal?: AbortSignal): Promise<City[]> => {
    const response = await api.get('/admin/cities/', { params, signal });
    return response.data;
  },

  create: async (payload: CityCreate): Promise<City> => {
    const response = await api.post('/admin/cities/', payload);
    return response.data;
  },

  update: async (id: number, payload: CityCreate): Promise<City> => {
    const response = await api.put(`/admin/cities/${id}/`, payload);
    return response.data;
  },

  delete: async (id: number): Promise<{ message: string }> => {
    const response = await api.delete(`/admin/cities/${id}/`);
    return response.data;
  },

  changeStatus: async (
    id: number,
    status: CityStatus
  ): Promise<{ message: string; city: City }> => {
    const response = await api.post(`/admin/cities/${id}/change-status/`, { status });
    return response.data;
  },
};

export interface OrganizationWithOwner extends Omit<Organization, 'owner'> {
  owner_data: {
    id: number;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
    is_staff: boolean;
    is_superuser: boolean;
  } | null;
}

export const adminContractorService = {
  list: async (): Promise<ContractorProfile[]> => {
    const response = await api.get('/admin/contractors/');
    return response.data;
  },

  delete: async (id: number): Promise<{
    message: string;
    deleted_contractor: {
      id: number;
      name: string;
      user_id: number;
    };
    deleted_by: string;
  }> => {
    const response = await api.delete(`/admin/contractors/${id}/delete/`);
    return response.data;
  },
};

// =============================================================================
// Admin Booking Service
// =============================================================================

export const adminBookingService = {
  listAllRequests: async (params?: {
    status?: string;
    city?: string;
    state?: string;
  }): Promise<QuoteRequest[]> => {
    const response = await api.get('/admin/quote-requests/', { params });
    return response.data;
  },

  getAuditDetails: async (requestId: number): Promise<{
    request: QuoteRequest;
    proposals: QuoteProposal[];
    booking: Booking | null;
    events: BookingEvent[];
  }> => {
    const response = await api.get(`/admin/quote-requests/${requestId}/audit/`);
    return response.data;
  },

  cancelBooking: async (requestId: number, adminReason: string): Promise<{ message: string }> => {
    const response = await api.post(`/admin/bookings/${requestId}/cancel/`, { admin_reason: adminReason });
    return response.data;
  },

  getStatistics: async (): Promise<BookingStatistics> => {
    const response = await api.get('/admin/booking-stats/');
    return response.data;
  },
};

export const adminOrganizationService = {
  list: async (): Promise<OrganizationWithOwner[]> => {
    const response = await api.get('/admin/organizations/');
    return response.data;
  },

  delete: async (id: number): Promise<{
    message: string;
    deleted_organization: {
      id: number;
      name: string;
      org_type: string;
      is_sponsor: boolean;
    };
    deleted_owner: unknown;
    deleted_by: string;
  }> => {
    const response = await api.delete(`/admin/organizations/${id}/`);
    return response.data;
  },
};
