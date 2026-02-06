import { useMemo, useCallback } from 'react';
import type { Event } from '../../types';
import { getEventComputedStatus } from '../../utils/events';

export interface EventsByDate {
  [dateString: string]: Event[];
}

export interface DayEventStatus {
  hasConfirmed: boolean;
  hasCompleted: boolean;
  hasProposed: boolean;
  hasAvailability: boolean;
  totalCount: number;
}

export function useCalendarEvents(events: Event[]) {
  const eventsByDate = useMemo<EventsByDate>(() => {
    return events.reduce((acc, event) => {
      const dateKey = event.event_date;
      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      acc[dateKey].push(event);
      return acc;
    }, {} as EventsByDate);
  }, [events]);

  const getDateStatus = useCallback(
    (dateString: string): DayEventStatus => {
      const dateEvents = eventsByDate[dateString] || [];

      // "Concluido" deve ter cor diferente do verde.
      // Regra: verde somente para eventos confirmados/aprovados que ainda NAO terminaram.
      // Se o dia so tem eventos concluidos, ele vira roxo.
      let hasCompleted = false;
      let hasConfirmed = false;
      let hasProposed = false;

      for (const raw of dateEvents as any[]) {
        if (raw?.isAvailability) continue;
        const event = raw as Event;
        const computed = getEventComputedStatus(event);

        if (computed.status === 'completed') {
          hasCompleted = true;
          continue;
        }

        if (event.status === 'confirmed' || event.status === 'approved') {
          hasConfirmed = true;
        } else if (event.status === 'proposed') {
          hasProposed = true;
        }
      }

      const hasAvailability = dateEvents.some(
        (e: any) => (e as any).isAvailability === true
      );

      return {
        hasConfirmed,
        hasCompleted,
        hasProposed,
        hasAvailability,
        totalCount: dateEvents.length,
      };
    },
    [eventsByDate]
  );

  return { eventsByDate, getDateStatus };
}
