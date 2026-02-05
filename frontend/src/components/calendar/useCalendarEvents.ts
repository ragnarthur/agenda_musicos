import { useMemo, useCallback } from 'react';
import type { Event } from '../../types';

export interface EventsByDate {
  [dateString: string]: Event[];
}

export interface DayEventStatus {
  hasConfirmed: boolean;
  hasProposed: boolean;
  totalCount: number;
}

export function useCalendarEvents(events: Event[]) {
  // Group events by date string (yyyy-MM-dd)
  const eventsByDate = useMemo<EventsByDate>(() => {
    return events.reduce((acc, event) => {
      const dateKey = event.event_date; // Already in yyyy-MM-dd format
      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      acc[dateKey].push(event);
      return acc;
    }, {} as EventsByDate);
  }, [events]);

  // Helper to get event status for a specific date
  const getDateStatus = useCallback(
    (dateString: string): DayEventStatus => {
      const dateEvents = eventsByDate[dateString] || [];
      return {
        hasConfirmed: dateEvents.some(
          e => e.status === 'confirmed' || e.status === 'approved'
        ),
        hasProposed: dateEvents.some(e => e.status === 'proposed'),
        totalCount: dateEvents.length,
      };
    },
    [eventsByDate]
  );

  return { eventsByDate, getDateStatus };
}
