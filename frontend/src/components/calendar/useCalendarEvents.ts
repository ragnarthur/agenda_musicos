import { useMemo, useCallback } from 'react';
import type { Event } from '../../types';

export interface EventsByDate {
  [dateString: string]: Event[];
}

export interface DayEventStatus {
  hasConfirmed: boolean;
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
      const hasConfirmed = dateEvents.some(
        (e: any) => (e.status === 'confirmed' || e.status === 'approved') && !e.isAvailability
      );
      const hasProposed = dateEvents.some(
        (e: any) => e.status === 'proposed' && !e.isAvailability
      );
      const hasAvailability = dateEvents.some(
        (e: any) => (e as any).isAvailability === true
      );

      return {
        hasConfirmed,
        hasProposed,
        hasAvailability,
        totalCount: dateEvents.length,
      };
    },
    [eventsByDate]
  );

  return { eventsByDate, getDateStatus };
}
