import type { MarketplaceGig } from '../../types';

export const GIG_HISTORY_WINDOW_DAYS = 14;
export const GIG_HISTORY_WINDOW_MS = GIG_HISTORY_WINDOW_DAYS * 24 * 60 * 60 * 1000;
export const GIG_HISTORY_STATUSES = new Set(['closed', 'cancelled']);

export const extractCityName = (raw: string | null | undefined): string => {
  const value = (raw || '').trim();
  if (!value) return '';
  const slash = value.split('/')[0]?.trim() || value;
  const comma = slash.split(',')[0]?.trim() || slash;
  const dash = comma.split(' - ')[0]?.trim() || comma;
  return dash;
};

export const normalizeCityKey = (raw: string | null | undefined): string => {
  const value = extractCityName(raw).toLowerCase().trim();
  if (!value) return '';
  const noAccents = value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return noAccents.replace(/\s+/g, ' ').trim();
};

export const getGigHistoryAnchorDate = (gig: MarketplaceGig): Date | null => {
  const updatedAt = new Date(gig.updated_at);
  if (!Number.isNaN(updatedAt.getTime())) return updatedAt;

  if (gig.event_date) {
    const [year, month, day] = gig.event_date.split('T')[0].split('-').map(Number);
    if (year && month && day) {
      const [hours, minutes] = (gig.end_time || '23:59').slice(0, 5).split(':').map(Number);
      const safeHours = Number.isFinite(hours) ? hours : 23;
      const safeMinutes = Number.isFinite(minutes) ? minutes : 59;
      return new Date(year, month - 1, day, safeHours, safeMinutes, 0, 0);
    }
  }

  const createdAt = new Date(gig.created_at);
  if (!Number.isNaN(createdAt.getTime())) return createdAt;

  return null;
};

export const isGigInHistoryWindow = (gig: MarketplaceGig, now: Date): boolean => {
  if (!GIG_HISTORY_STATUSES.has(gig.status)) return false;
  const anchorDate = getGigHistoryAnchorDate(gig);
  if (!anchorDate) return false;
  const ageMs = now.getTime() - anchorDate.getTime();
  return ageMs >= 0 && ageMs <= GIG_HISTORY_WINDOW_MS;
};

export const formatDate = (value?: string | null): string => {
  if (!value) return 'Data a combinar';
  const [year, month, day] = value.split('T')[0].split('-').map(Number);
  if (!year || !month || !day) return 'Data a combinar';
  const localDate = new Date(year, month - 1, day);
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium' }).format(localDate);
};

export const formatDateTime = (value?: string | null): string => {
  if (!value) return 'Agora';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Agora';
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date);
};

export const formatCurrency = (value?: string | number | null): string => {
  if (!value) return 'A combinar';
  const num = typeof value === 'string' ? Number(value) : value;
  if (Number.isNaN(num)) return 'A combinar';
  return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

export const parseCurrencyValue = (value?: string | number | null): number => {
  if (value === null || value === undefined || value === '') return 0;
  const parsed = typeof value === 'string' ? Number(value) : value;
  return Number.isFinite(parsed) ? parsed : 0;
};

export const formatTime = (value?: string | null): string | null => {
  if (!value) return null;
  return value.slice(0, 5);
};

export const formatCurrencyInput = (value: string): string => {
  const digits = value.replace(/\D/g, '');
  if (!digits) return '';
  const amount = Number(digits) / 100;
  return `R$ ${amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export const normalizeCurrency = (value: string): string | undefined => {
  const digits = value.replace(/\D/g, '');
  if (!digits) return undefined;
  return (Number(digits) / 100).toFixed(2);
};

export const formatPhone = (value: string): string => {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits;
  const area = digits.slice(0, 2);
  const mid = digits.slice(2, 7);
  const end = digits.slice(7);
  return end ? `(${area}) ${mid}-${end}` : `(${area}) ${digits.slice(2)}`;
};
