import { useMemo, useCallback } from 'react';
import { getEventComputedStatus } from '../../utils/events';
import { isAvailabilityEvent, isRealEvent, type CalendarEvent } from './types';

export interface EventsByDate {
  [dateString: string]: CalendarEvent[];
}

export interface DayEventStatus {
  hasConfirmed: boolean;
  hasCompleted: boolean;
  hasProposed: boolean;
  hasAvailability: boolean;
  totalCount: number;
}

export function useCalendarEvents(events: CalendarEvent[]) {
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

      for (const event of dateEvents) {
        if (isAvailabilityEvent(event) || !isRealEvent(event)) continue;
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

      const hasAvailability = dateEvents.some(e => isAvailabilityEvent(e));

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
