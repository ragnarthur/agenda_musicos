// services/publicApi.ts
// Serviços públicos e de empresas
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
  bio?: string;
  city: string;
  state: string;
  instagram?: string;
}

export interface ContactRequest {
  id: number;
  from_organization: number;
  from_organization_name: string;
  from_user: number;
  from_user_name: string;
  to_musician: number;
  to_musician_name: string;
  subject: string;
  message: string;
  event_date: string | null;
  event_location: string | null;
  budget_range: string | null;
  status: 'pending' | 'read' | 'replied' | 'archived';
  status_display: string;
  reply_message: string | null;
  replied_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContactRequestCreate {
  to_musician: number;
  subject: string;
  message: string;
  event_date?: string;
  event_location?: string;
  budget_range?: string;
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
  bio: string | null;
  city: string | null;
  state: string | null;
  instagram: string | null;
  avatar_url: string | null;
  cover_image_url: string | null;
  average_rating: number;
  total_ratings: number;
}

export interface CompanyRegisterData {
  email: string;
  password: string;
  company_name: string;
  contact_name: string;
  phone?: string;
  city: string;
  state: string;
  org_type?: 'company' | 'venue';
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

export interface CompanyDashboard {
  organization: Organization;
  stats: {
    total_sent: number;
    pending_replies: number;
    replied: number;
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
// Contact Request Service (Mensagens de Empresas)
// =============================================================================

export const contactRequestService = {
  // Empresa - criar mensagem
  create: async (data: ContactRequestCreate): Promise<ContactRequest> => {
    const response = await api.post('/contact-requests/', data);
    return response.data;
  },

  // Músico - listar recebidas
  listReceived: async (status?: string): Promise<ContactRequest[]> => {
    const response = await api.get('/contact-requests/received/', { params: { status } });
    return response.data;
  },

  // Empresa - listar enviadas
  listSent: async (): Promise<ContactRequest[]> => {
    const response = await api.get('/contact-requests/sent/');
    return response.data;
  },

  // Detalhe
  get: async (id: number): Promise<ContactRequest> => {
    const response = await api.get(`/contact-requests/${id}/`);
    return response.data;
  },

  // Músico - responder
  reply: async (id: number, replyMessage: string): Promise<ContactRequest> => {
    const response = await api.post(`/contact-requests/${id}/reply/`, {
      reply_message: replyMessage,
    });
    return response.data;
  },

  // Músico - arquivar
  archive: async (id: number): Promise<{ message: string }> => {
    const response = await api.post(`/contact-requests/${id}/archive/`);
    return response.data;
  },

  // Músico - contagem de não lidas
  getUnreadCount: async (): Promise<{ count: number }> => {
    const response = await api.get('/messages/unread-count/');
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
    return response.data;
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
};

// =============================================================================
// Company Service
// =============================================================================

export const companyService = {
  // Registro de empresa
  register: async (
    data: CompanyRegisterData
  ): Promise<{ message: string; username: string; email: string; company_name: string }> => {
    const response = await api.post('/register-company/', data);
    return response.data;
  },

  // Login de empresa
  login: async (
    email: string,
    password: string
  ): Promise<{
    detail: string;
    access: string;
    refresh: string;
    user_type: string;
    organization: { id: number; name: string; org_type: string };
  }> => {
    const response = await api.post('/company/token/', { email, password });
    return response.data;
  },

  // Dashboard
  getDashboard: async (): Promise<CompanyDashboard> => {
    const response = await api.get('/company/dashboard/');
    return response.data;
  },

  // Atualizar perfil
  updateProfile: async (data: Partial<Organization>): Promise<Organization> => {
    const response = await api.patch('/company/profile/', data);
    return response.data;
  },

  // Ver músico (como empresa)
  getMusician: async (id: number): Promise<MusicianPublic> => {
    const response = await api.get(`/company/musicians/${id}/`);
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
    userType: 'musician' | 'company' = 'musician'
  ): Promise<{
    new_user: boolean;
    email?: string;
    first_name?: string;
    last_name?: string;
    picture?: string;
    user_type?: string;
    access?: string;
    refresh?: string;
    organization?: { id: number; name: string; org_type: string };
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

  // Registrar empresa via Google
  registerCompany: async (
    credential: string,
    data: {
      company_name: string;
      phone?: string;
      city: string;
      state: string;
      org_type?: 'company' | 'venue';
    }
  ): Promise<{
    detail: string;
    access: string;
    refresh: string;
    user_type: string;
    organization: { id: number; name: string; org_type: string };
  }> => {
    const response = await api.post('/auth/google/register-company/', {
      credential,
      ...data,
    });
    return response.data;
  },
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
    deleted_owner: any;
    deleted_by: string;
  }> => {
    const response = await api.delete(`/admin/organizations/${id}/`);
    return response.data;
  },
};
