// utils/events.ts
// Regras compartilhadas para datas e status de eventos.

import { addDays, parseISO } from 'date-fns';
import type { Event, EventStatus } from '../types';
import { STATUS_LABELS } from './formatting';

export type ComputedEventStatus = EventStatus | 'completed';

const safeParse = (value?: string | null): Date | null => {
  if (!value) return null;
  try {
    return parseISO(value);
  } catch {
    return null;
  }
};

export const getEventStartDate = (event: Event): Date | null => {
  const fromStartDt = safeParse(event.start_datetime);
  if (fromStartDt) return fromStartDt;
  if (event.event_date && event.start_time) {
    return safeParse(`${event.event_date}T${event.start_time}`);
  }
  return null;
};

export const getEventEndDate = (event: Event): Date | null => {
  const fromEndDt = safeParse(event.end_datetime);
  if (fromEndDt) return fromEndDt;

  if (event.event_date && event.end_time) {
    const end = safeParse(`${event.event_date}T${event.end_time}`);
    if (!end) return null;

    const start = getEventStartDate(event);
    if (start && end < start) {
      return addDays(end, 1); // eventos que cruzam meia-noite
    }
    return end;
  }

  return null;
};

export const hasEventEnded = (event: Event, reference: Date = new Date()): boolean => {
  const end = getEventEndDate(event);
  if (!end) return false;
  return end.getTime() < reference.getTime();
};

export const getEventComputedStatus = (
  event: Event
): { status: ComputedEventStatus; label: string } => {
  const ended = hasEventEnded(event);
  const isRealized = ended && (event.status === 'confirmed' || event.status === 'approved');

  if (isRealized) {
    return { status: 'completed', label: 'Concluído' };
  }

  // Usa approval_label do backend para 'approved' e 'confirmed'
  if (event.status === 'approved' || event.status === 'confirmed') {
    const label =
      event.approval_label ||
      (event.status === 'approved' && event.approved_by_name
        ? `Confirmado por ${event.approved_by_name}`
        : event.status_display);
    return {
      status: event.status,
      label: label || STATUS_LABELS[event.status] || 'Indefinido',
    };
  }

  return {
    status: event.status,
    label: event.status_display || STATUS_LABELS[event.status] || 'Indefinido',
  };
};
