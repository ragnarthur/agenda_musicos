import type { MarketplaceGig, MarketplaceApplication } from '../../types';

export type ApplyForm = { cover_letter: string; expected_fee: string };
export type CityOption = { id: number; name: string; state: string };
export type CloseStatus = 'closed' | 'cancelled';
export type CloseTarget = { gig: MarketplaceGig; status: CloseStatus } | null;
export type HireTarget = { gig: MarketplaceGig; applications: MarketplaceApplication[] } | null;
export type ClearChatTarget = {
  gigId: number;
  applicationId: number;
  counterpartName: string;
} | null;
export type GigListViewMode = 'active' | 'history' | 'all';

export const DURATION_PRESETS = ['1', '2', '3', '4'];

export const STATUS_STYLES: Record<string, string> = {
  open: 'bg-emerald-100 text-emerald-800',
  in_review: 'bg-amber-100 text-amber-800',
  hired: 'bg-blue-100 text-blue-800',
  closed: 'bg-gray-200 text-gray-700',
  cancelled: 'bg-rose-100 text-rose-700',
  pending: 'bg-amber-100 text-amber-800',
  rejected: 'bg-rose-100 text-rose-700',
};

export const STATUS_LABEL: Record<string, string> = {
  open: 'Aberta',
  in_review: 'Em avaliação',
  hired: 'Contratada',
  closed: 'Encerrada',
  cancelled: 'Cancelada',
  pending: 'Pendente',
  rejected: 'Recusada',
};
