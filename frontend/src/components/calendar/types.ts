import type { Event } from '../../types';

// Events displayed in the calendar can include "availability" pseudo-events.
export type CalendarEvent = Omit<Event, 'status'> & {
  status: Event['status'] | 'available';
  isAvailability?: boolean;
  availabilityNotes?: string;
};

export function isAvailabilityEvent(event: CalendarEvent): boolean {
  return event.isAvailability === true || event.status === 'available';
}

// Type guard to safely use calendar events where an actual backend Event is required.
export function isRealEvent(event: CalendarEvent): event is Event {
  return event.status !== 'available';
}
