// types/index.ts

export interface User {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  full_name: string;
}

export interface Musician {
  id: number;
  user: User;
  full_name: string;
  instrument: 'vocal' | 'guitar' | 'bass' | 'drums' | 'keyboard' | 'other';
  role: 'member' | 'leader';
  is_leader: boolean;
  bio?: string;
  phone?: string;
  is_active: boolean;
  created_at: string;
}

export interface Availability {
  id: number;
  musician: Musician;
  musician_id?: number;
  event: number;
  response: 'pending' | 'available' | 'unavailable' | 'maybe';
  notes?: string;
  responded_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Event {
  id: number;
  title: string;
  description?: string;
  location: string;
  venue_contact?: string;
  event_date: string;
  start_time: string;
  end_time: string;
  start_datetime: string;
  end_datetime: string;
  payment_amount?: string;
  status: 'proposed' | 'approved' | 'rejected' | 'confirmed' | 'cancelled';
  status_display: string;
  can_approve?: boolean;
  created_by: number;
  created_by_name: string;
  approved_by?: number;
  approved_by_name?: string;
  approved_at?: string;
  rejection_reason?: string;
  availabilities?: Availability[];
  availability_summary?: {
    pending: number;
    available: number;
    unavailable: number;
    maybe: number;
    total: number;
  };
  created_at: string;
  updated_at: string;
}

export interface EventCreate {
  title: string;
  description?: string;
  location: string;
  venue_contact?: string;
  event_date: string;
  start_time: string;
  end_time: string;
  payment_amount?: string;
}

export interface AuthTokens {
  access: string;
  refresh: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface AuthContextType {
  user: Musician | null;
  tokens: AuthTokens | null;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  isLeader: boolean;
  loading: boolean;
}

export type AvailabilityResponse = 'pending' | 'available' | 'unavailable' | 'maybe';
export type EventStatus = 'proposed' | 'approved' | 'rejected' | 'confirmed' | 'cancelled';
