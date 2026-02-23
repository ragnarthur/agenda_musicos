// types/index.ts

export interface User {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  full_name: string;
  is_staff?: boolean;
  is_superuser?: boolean;
}

export interface EquipmentItem {
  name: string;
  price: number | string | null;
}

export interface Musician {
  id: number;
  user: User;
  full_name: string;
  instrument: 'vocal' | 'guitar' | 'bass' | 'drums' | 'keyboard' | 'percussion' | string;
  instruments?: string[];
  bio?: string;
  phone?: string;
  instagram?: string;
  whatsapp?: string;
  avatar_url?: string | null;
  cover_image_url?: string | null;
  city?: string;
  state?: string;
  public_email?: string | null;
  base_fee?: number | string | null;
  travel_fee_per_km?: number | string | null;
  equipment_items?: EquipmentItem[];
  musical_genres?: string[];
  is_active: boolean;
  is_premium?: boolean;
  average_rating?: number;
  total_ratings?: number;
  created_at: string;
}

export interface PortalItem {
  source: 'salic' | 'mapas_culturais';
  external_id: string;
  title: string;
  description: string;
  category: 'rouanet' | 'aldir_blanc' | 'festival' | 'edital' | 'premio' | 'other';
  scope: 'nacional' | 'estadual' | 'municipal';
  state?: string;
  city?: string;
  external_url?: string;
  deadline?: string;
  event_date?: string;
  published_at: string;
}

export interface MusicianUpdatePayload {
  first_name?: string;
  last_name?: string;
  instrument?: string;
  instruments?: string[];
  bio?: string;
  phone?: string;
  instagram?: string;
  whatsapp?: string;
  city?: string;
  state?: string;
  base_fee?: number | string | null;
  travel_fee_per_km?: number | string | null;
  equipment_items?: EquipmentItem[];
  musical_genres?: string[];
}

export interface Availability {
  id: number;
  musician: Musician;
  musician_id?: number;
  event: number;
  response: 'pending' | 'available' | 'unavailable';
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
  payment_amount?: number | string | null;
  event_date: string;
  start_time: string;
  end_time: string;
  start_datetime: string;
  end_datetime: string;
  is_solo: boolean;
  is_private?: boolean;
  status: 'proposed' | 'approved' | 'rejected' | 'confirmed' | 'cancelled';
  status_display: string;
  can_approve?: boolean;
  can_rate?: boolean;
  created_by: number;
  created_by_name: string;
  approved_by?: number;
  approved_by_name?: string;
  approved_at?: string;
  rejection_reason?: string;
  availabilities?: Availability[];
  approval_label?: string;
  logs?: EventLog[];
  availability_summary?: {
    pending: number;
    available: number;
    unavailable: number;
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
  payment_amount?: number | string | null;
  event_date: string;
  start_time: string;
  end_time: string;
  is_solo?: boolean;
  is_private?: boolean;
  invited_musicians?: number[];
}

export interface AvailableMusician {
  musician_id: number;
  musician_name: string;
  instrument: string;
  instrument_display: string;
  instruments?: string[];
  musical_genres?: string[];
  has_availability: boolean;
  availability_id: number | null;
  start_time: string | null;
  end_time: string | null;
  notes?: string | null;
}

export interface LeaderAvailability {
  id: number;
  leader: number;
  leader_name: string;
  leader_instrument?: string;
  leader_instrument_display?: string;
  leader_avatar_url?: string | null;
  date: string;
  start_time: string;
  end_time: string;
  start_datetime: string;
  end_datetime: string;
  notes?: string;
  is_public: boolean;
  is_active: boolean;
  has_conflicts: boolean;
  conflicting_events_count: number;
  created_at: string;
  updated_at: string;
}

export interface PublicCalendarResponse {
  events: Event[];
  availabilities: LeaderAvailability[];
  is_owner: boolean;
  days_ahead: number;
}

export interface LeaderAvailabilityCreate {
  date: string;
  start_time: string;
  end_time: string;
  notes?: string;
  is_public?: boolean;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface AuthContextType {
  user: Musician | null;
  login: (credentials: LoginCredentials, rememberMe?: boolean) => Promise<void>;
  setSession: (rememberMe?: boolean) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  isAuthenticated: boolean;
  loading: boolean;
}

export type AvailabilityResponse = 'pending' | 'available' | 'unavailable';
export type EventStatus = 'proposed' | 'approved' | 'rejected' | 'confirmed' | 'cancelled';

export interface EventLog {
  id: number;
  action: 'created' | 'approved' | 'rejected' | 'cancelled' | 'availability';
  description: string;
  performed_by: number | null;
  performed_by_name: string;
  created_at: string;
}

export type ConnectionType = 'follow' | 'call_later' | 'recommend' | 'played_with';

export interface Connection {
  id: number;
  follower: Musician;
  target: Musician;
  connection_type: ConnectionType;
  verified: boolean;
  notes?: string | null;
  created_at: string;
}

export interface MusicianBadge {
  id: number;
  musician: Musician;
  slug: string;
  name: string;
  description?: string | null;
  icon?: string | null;
  awarded_at: string;
}

export interface RatingInput {
  musician_id: number;
  rating: number;
  comment?: string;
}

// Marketplace - vagas e candidaturas de músicos freelancers
export type GigStatus = 'open' | 'in_review' | 'hired' | 'closed' | 'cancelled';

export interface MarketplaceApplication {
  id: number;
  gig: number;
  musician: number;
  musician_name: string;
  cover_letter?: string;
  expected_fee?: string;
  status: 'pending' | 'hired' | 'rejected';
  created_at: string;
  chat_message_count: number;
}

export interface MarketplaceGig {
  id: number;
  title: string;
  description?: string;
  city?: string;
  location?: string;
  event_date?: string;
  start_time?: string;
  end_time?: string;
  budget?: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  genres?: string;
  status: GigStatus;
  created_by?: number;
  created_by_name: string;
  applications_count: number;
  applications?: MarketplaceApplication[];
  my_application?: MarketplaceApplication | null;
  created_at: string;
  updated_at: string;
}

export interface MarketplaceGigChatMessage {
  id: number;
  gig: number;
  application: number;
  sender: number;
  sender_name: string;
  message: string;
  created_at: string;
}

// Avaliações de músicos
export interface MusicianRating {
  id: number;
  event: number;
  event_title?: string;
  musician: number;
  musician_name: string;
  rated_by: number;
  rated_by_name: string;
  rated_by_avatar: string | null;
  rating: 1 | 2 | 3 | 4 | 5;
  comment?: string;
  time_ago: string;
  created_at: string;
}
